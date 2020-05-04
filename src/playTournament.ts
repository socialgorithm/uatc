import * as path from "path";
import fs from "fs";

import uuid = require("uuid");
const io = require('socket.io-client');
const debug = require("debug")("sg:uatc:playTournament");

import {loadConfig, PlayersConfig} from "./config";
import {spawnAndMonitor} from "./lib/exec";
import {isWindows} from "./lib/isWindows";

interface PlayConfig {
	config: string;
}

let gameList: any[] = [];

export const playTournament = (cmdObj: PlayConfig) => {
	const config = loadConfig({filePath: cmdObj.config}).playTournament;

	console.log(`Testing the service running at "${config.tournamentServerAddress}"`);
	const unique = config.players.length;
	const total = config.players.reduce((total, currentPlayer) => total + currentPlayer.number, 0);
	console.log(`Players (${unique} unique and ${total} total):`);
	config.players.forEach(player => {
		console.log(`\t${player.name}: ${player.number} "${player.command}"`);
	});
	console.log('\n');

	const server = io(config.tournamentServerAddress, {
		reconnection: true,
		timeout: 2000,
		query: {
			client: true,
			token: `test-${uuid.v4()}`,
		}
	});

	server.on('connect', () => {
		console.log('Connected to the tournament server');
	});
	server.on('lobby created', (data: any) => {
		console.log(`lobby created: ${data.lobby.token}`);
		joinLobby(data.lobby.token, server);
	});
	server.on('disconnect', () => {
		console.log('Disconnected from the tournament server');
	});

	server.on('lobby join', (data: any) => {
		console.log('lobby join');
	});

	server.on('connected', (data: any) => {
		if (data.lobby.players.length === 0) {
			connectPlayers(config.players, data.lobby.token, config.tournamentServerAddress);
		} else {
			debug(`The connected players are: ${data.lobby.players}`)
		}

		if (data.lobby.players.length === total) {
			console.log(`All (${total}) players connected`);
			startTournament(data.lobby.token, server, config.tournamentSettings);
		}
	});

	server.on('GameList', (data: any) => {
		debug('GameList', data);
		gameList = data;
	});

	server.on('lobby tournament started', (data: any) => {
		debug('lobby tournament started');
		if (config.autoplay) {
			console.log('Autoplaying the matches');
			playGame(data.tournament.lobby, server);
		} else {
			console.log('Ready to play!');
		}
	});

	server.on('lobby tournament continued', (data: any) => {
		debug('lobby tournament continued');
	});

	let finishedGamesSeen = 0;
	server.on('tournament stats', (data: any) => {
		if (data.finished) {
			console.log('\n');
			console.log('Tournament finished');
			console.log('Final player ranking is: ', data.ranking);
			process.exit();
		} else {
			const finished = data.matches.filter((match: any) => match.state === 'finished');
			if (finished.length != finishedGamesSeen) {
				finishedGamesSeen = finished.length;
				if (config.autoplay) {
					playGame(data.lobby, server);
				}
			}
		}
	});

	server.connect();
	server.emit('lobby create');
};

const joinLobby = (token: string, server: any) => {
	server.emit('lobby join', {token, spectating: true});
};

const connectPlayers = async (players: PlayersConfig[], token: string, tournamentAddress: string) => {
	console.log('Will log players under "./logs/{player name}-{player number}.log"');
	fs.rmdirSync(path.resolve(process.cwd(), './logs/'), {recursive: true});
	fs.mkdirSync(path.resolve(process.cwd(), './logs/'));

	players.forEach(player => {
		for (let i = 0; i < player.number; i++) {
			setTimeout(() => {
				connectPlayer(player.command, `${player.name}-${i}`, token, tournamentAddress);
			}, 250 * (i + 1));
		}
	});
};

const connectPlayer = (file: string, name: string, token: string, tournamentAddress: string) => {
	const command = isWindows() ? 'uabc.cmd' : 'uabc';
	const playerProcess = spawnAndMonitor(command, [`--token "${name}"`, `--lobby "${token}"`, `--file "${file}"`, `--host "${tournamentAddress}"`, `--verbose`]);
	playerProcess.stdout.setEncoding("utf8");
	const logFile = path.resolve(process.cwd(), `./logs/${name}.log`);
	const logStream = fs.createWriteStream(logFile, {flags:'a'});

	playerProcess.on("close", (code: string) => {
		debug(`client> child process exited with code ${code}`);
		logStream.write(new Date().toISOString() + ": " + `client> child process exited with code ${code}`);
	});

	playerProcess.stdout.on("data", (data: string) => {
		debug("----------- PLAYER DATA ----------");
		debug(data);
		debug("----------------------------------");
		data.split('\n')
			.filter(s => s.trim().length > 0)
			.forEach(value => {
				logStream.write(new Date().toISOString() + ": " + value + "\n");
			});
	});

	playerProcess.stderr.on("data", (message: string) => {
		debug("----------- PLAYER ERROR ---------");
		debug(message);
		debug("----------------------------------");
	});
};

const startTournament = (token: string, server: any, tournamentSettings: object) => {
	console.log('Starting tournament');
	server.emit('lobby tournament start',
		{
			token,
			options: {
				...tournamentSettings,
				gameAddress: gameList[0].address
			},
			players: []
		}
	);
};

const playGame = (token: string, server: any) => {
	console.log(`Playing the next match in lobby '${token}'`);
	server.emit('lobby tournament continue', {token});
};