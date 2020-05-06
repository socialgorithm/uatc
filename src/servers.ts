import * as path from "path";
const tcpPortUsed = require('tcp-port-used');
const fs = require('fs').promises;
const si = require('systeminformation');


import {loadConfig, ServerConfig, ServersConfig} from "./config";
import {exec, spawn} from "./lib/exec";
import {isWindows} from "./lib/isWindows";
import {Systeminformation} from "systeminformation";
import ProcessesData = Systeminformation.ProcessesData;
import NetworkConnectionsData = Systeminformation.NetworkConnectionsData;
const debug = require("debug")("sg:uatc:servers");

/*
 * TODO - pluginise this so that any location can be used to run the servers. e.g. local, AWS, DO, random linux box
 * TODO - ability to wait for everything to be up and running
 * TODO - install servers? git clone, npm i, npm build
 * TODO - cleanup
 */

interface RunningServer {
	name: string;
	pid: number;
}

interface StartServersArgs {
	config: string;
}

export const startServers = async (cmdObj: StartServersArgs) => {
	const config = loadConfig({filePath: cmdObj.config}).servers;

	await performSetup();
	await performStartUp(config);
};

export const stopServers = async () => {
	await performShutdown();
};

export const validateServers = async (cmdObj: StartServersArgs) => {
	const config = loadConfig({filePath: cmdObj.config}).servers;
	const runningServers: RunningServer[] = await loadRunningServersFromDisk({ignoreFails: true});

	const servers = new Set<string>();
	Object.keys(config).forEach(s => servers.add(s));
	runningServers.map(s => s.name).forEach(s => servers.add(s));

	const pids = runningServers.map(s => s.pid);
	const data: ProcessesData = await si.processes();
	const processesForRunningServers = data.list.filter(p => pids.includes(p.pid));
	const networkConnections: NetworkConnectionsData[] = await si.networkConnections();
	const expectedPorts = Object.values(config).map(o => o.expectedPort);
	const processesForExpectedPorts = networkConnections.filter(value => expectedPorts.includes(parseInt(value.localport)));
	const portToPid: {[key: string]: Set<number>} = {};
	processesForExpectedPorts.forEach(value => {
		if (!portToPid[value.localport]) portToPid[value.localport] = new Set();
		portToPid[value.localport].add(parseInt(value.pid as unknown as string));
	});

	const resultObject: {[key: string]: {}} = {};
	await Promise.all(Array.from(servers).map(async s => {
		const server: RunningServer | any = runningServers.find(server => server.name === s) || {};
		const process = processesForRunningServers.find(process => process.pid === server.pid);
		const serverConfig = config[s];
		let portInUse = false;
		try {
			portInUse = await tcpPortUsed.check(serverConfig.expectedPort, '127.0.0.1');
		} catch (_) {}
		const knownProcess = process  ? 'up' : 'down';
		const expectedPort = portInUse ? 'in use' : 'not in use';
		const knownProcessBoundToExpectedPort = Array.from(portToPid[serverConfig.expectedPort] || []).includes(server.pid);
		const status = (knownProcess === 'up' && expectedPort === 'in use' && knownProcessBoundToExpectedPort) ? 'GREEN' : (knownProcess === 'up' || expectedPort === 'in use' || knownProcessBoundToExpectedPort) ? 'AMBER' : 'RED';
		resultObject[s] = {knownProcess, expectedPort, knownProcessBoundToExpectedPort, status, command: process ? process.command : 'N/A'};
	}));
	console.table(resultObject);

	return resultObject;
};

const performSetup = async () => {
	try {
		await exec('npm --version');
	} catch (e) {
		console.error('Unable to run npm commands. How did you manage to run this?');
		process.exit(1);
	}
};

const performStartUp = async (config: ServersConfig) => {

	await Promise.all(Object.keys(config).map(async (server) => {
		const serverPath = computePath(config[server].location);
		try {
			await fs.stat(serverPath);
		} catch (e) {
			console.error(`Could not find ${server} server location on disk`);
			process.exit(1);
		}

		try {
			await fs.stat(serverPath + '/package.json');
		} catch (e) {
			console.error(`Could not find ${server} server package.json on disk`);
			process.exit(1);
		}

		try {
			await fs.stat(serverPath + '/node_modules');
		} catch (e) {
			console.error(`${server} server does not seem to have its dependencies installed`);
			process.exit(1);
		}

		try {
			const inUse = await tcpPortUsed.check(config[server].expectedPort, '127.0.0.1');
			if (inUse) {
				console.log(`Will not be able to start ${server} server as the port it is expected on is already in use`);
				process.exit(1);
			}
		} catch (e) {
			console.log(e);
			process.exit(1);
		}
	}));

	const running = await Promise.all(Object.keys(config).map(async (server) => {
		return await performServerStartUp(config[server], server);
	}));

	await fs.writeFile(computePath('./.uatc__running_servers.json'), JSON.stringify(running));
	console.log("Servers started");
};

const performServerStartUp = async (config: ServerConfig, name: string) => {
	console.log(`Starting ${name} server`);

	const serverPath = computePath(config.location);
	const commandBlocks = config.startupCommand.split(' ');
	const command = isWindows() && commandBlocks[0] === 'npm' ? `${commandBlocks[0]}.cmd` : commandBlocks[0];
	const out = await fs.open('./out.log', 'a');
	const err = await fs.open('./out.log', 'a');
	const server = spawn(command, commandBlocks.slice(1), {
		detached: true,
		cwd: serverPath,
		shell: false,
		stdio: [ 'ignore', out, err ]
	}); // TODO - catch spawn errors

	try {
		server.unref();
	} catch (e) {
		console.log(e);
	}

	return {
		name,
		pid: server.pid
	};
};

const performShutdown = async () => {
	const runningServers = await loadRunningServersFromDisk();

	runningServers.map(async runningServer => {
		await performServerShutdown(runningServer);
	});
	await fs.unlink(computePath('./.uatc__running_servers.json'));
};

const performServerShutdown = async (runningServer: any) => {
	console.log(`Stopping ${runningServer.name} server`);
	try {
		process.kill(runningServer.pid, 'SIGINT');
	} catch (e) {
		if (e.code === 'ESRCH') {
			console.warn(`Failed to stop ${runningServer.name} server. Doesn't seem to be running`);
		} else {
			console.error(`Failed to stop ${runningServer.name} server. This might mean the process is still running`);
		}
		return;
	}

	console.log(`Stopped ${runningServer.name} server`);
}

const computePath = (location: string) => {
	return path.resolve(process.cwd(), location);
};

const loadRunningServersFromDisk: (opts?: {ignoreFails?: boolean}) => Promise<Array<RunningServer>> = async ({ignoreFails} = {}) => {
	let runningServers: RunningServer[];
	try {
		const fileContent = (await fs.readFile(computePath('./.uatc__running_servers.json'))).toString();
		runningServers = JSON.parse(fileContent);
	} catch (e) {
		if (ignoreFails) return [];

		if (e.code === 'ENOENT') {
			console.warn('uatc is not aware of any running processes.');
		}
		console.error('Failed to determine if there are running processes.');
		process.exit(1);
	}
	return runningServers;
};