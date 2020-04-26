import * as cp from "child_process";
import {ChildProcess} from "child_process";

/**
 * Execute a file with a given executable
 * @param cmd string to execute
 * @returns {*}
 */
export const exec = (cmd: string, options: string[]): ChildProcess => {
	const childProcess = cp.spawn(cmd, options, {shell: true});
	childProcess.stdout.setEncoding("utf8");

	childProcess.stderr.on("data", (data: string) => {
		console.log(`Error: ${data}`);
	});

	return childProcess;
};