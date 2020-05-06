import {initConfig} from "./config";
import {playTournament} from "./playTournament";
import {startServers, stopServers, validateServers} from "./servers";

const { program } = require('commander');

const p = program
	.version('0.0.1');

p
	.command('init')
	.description('Initialises uatc with a config file at the current directory.')
	.action(initConfig);

p
	.command('play')
	.description('Starts a tournament. Config is driven by the config file the defualt location or as specified by --config')
	.option('-c, --config <config file>', 'Use the given config file when running the tournament', './uatc.js')
	.action(playTournament);

p
	.command('start-servers')
	.description('Starts the servers')
	.option('-c, --config <config file>', 'Use the given config file when starting the servers', './uatc.js')
	.action(startServers);

p
	.command('stop-servers')
	.description('Stops the servers')
	.action(stopServers);

p
	.command('validate-servers')
	.description('Checks the current status of the servers')
	.option('-c, --config <config file>', 'Use the given config file when validating the servers', './uatc.js')
	.action(validateServers);

p
	.command('test')
	.description('Runs a set of tests against the platform. Note: Not actually implemented')
	.action(() => {
		console.log('Not implemented yet. Go Away.');
	});

program.parse(process.argv);