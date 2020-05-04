import * as cp from "child_process";
import {ChildProcess, SpawnOptionsWithoutStdio} from "child_process";

export const spawn = (cmd: string, options: string[], config: SpawnOptionsWithoutStdio = {}): ChildProcess => {
	return cp.spawn(cmd, options, {shell: true, ...config});
};

export const spawnAndMonitor = (cmd: string, options: string[], config: SpawnOptionsWithoutStdio = {}): ChildProcess => {
	const childProcess = cp.spawn(cmd, options, {shell: true, ...config});
	childProcess.stdout.setEncoding("utf8");

	childProcess.stderr.on("data", (data: string) => {
		console.log(`Error: ${data}`);
	});

	return childProcess;
};

export const exec = (cmd: string): Promise<any> => {
	return new Promise((resolve, reject) => {
		cp.exec(cmd, undefined, (error, stdout, stderr) => {
			if (error) {
				reject(error);
				return;
			}
			resolve(stdout);

		});
	});
};