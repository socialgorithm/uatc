import * as fs from "fs";
import * as path from "path";

export interface PlayersConfig {
	command: string;
	number: number;
	name: string;
}

export interface ServerConfig {
	location: string;
	startupCommand: string;
	expectedPort: number;
}

export interface ServersConfig {
	[key: string]: ServerConfig;
	tournament: ServerConfig;
	game: ServerConfig;
	userInterface: ServerConfig;
}

export interface UATCConfig {
	playTournament: {
		players: PlayersConfig[];
		tournamentServerAddress: string;
		autoplay: boolean;
		tournamentSettings: object;
	},
	servers: ServersConfig;
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
	},
	servers: {
		tournament: {
			location: '../tournament-server',
			startupCommand: 'node ./dist/index.js',
			expectedPort: 3141
		},
		game: {
			location: '../tic-tac-toe-game-server',
			startupCommand: 'node ./dist/index.js',
			expectedPort: 5433
		},
		// userInterface: {
		// 	location: '../ui',
		// 	startupCommand: 'node ./node_modules/serve/bin/serve.js -s -l 3000 build',
		// 	expectedPort: 3000
		// }
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