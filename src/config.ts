import * as fs from "fs";
import * as path from "path";

export interface PlayersConfig {
	command: string;
	number: number;
	name: string;
}

export interface UATCConfig {
	playTournament: {
		players: PlayersConfig[];
		tournamentServerAddress: string;
		autoplay: boolean;
		tournamentSettings: object;
	}
}

const DEFAULT_CONFIG: UATCConfig = {
	playTournament: {
		players: [
			{
				command: 'node example.js',
				number: 5,
				name: 'example'
			}
		],
		tournamentServerAddress: 'http://localhost:3141',
		autoplay: true,
		tournamentSettings: {
			timeout: 100,
			numberOfGames: 50,
			type: "DoubleElimination",
			autoPlay: false
		}
	}
};

export interface initConfig {}

export const initConfig = (cmdObj: initConfig) => {
	let options = DEFAULT_CONFIG;

	const template = `module.exports = ${JSON.stringify(options, undefined, 2)};\n`;

	fs.writeFileSync(path.resolve(process.cwd(), './uatc.js'), template);
	console.log('Written config file to "./uatc.js"');
};

export interface ConfigLoadOptions {
	filePath: string;
}

export const loadConfig: (options: ConfigLoadOptions) => UATCConfig = ({ filePath }) => {
	const configPath = path.resolve(process.cwd(), filePath);
	if (!fs.existsSync(configPath) || !fs.statSync(configPath).isFile()) {
		console.error(`Given config file location of '${filePath} does not exist. Run "uatc init" to create a default one.`);
		process.exit(1);
	}

	return require(configPath);
};