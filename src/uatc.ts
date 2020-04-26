import {initConfig} from "./config";
import {playTournament} from "./playTournament";

const { program } = require('commander');

const p = program
	.version('0.0.1');

p
	.command('init')
	.description('Initialises the test framework with a config file at the current directory.')
	.action(initConfig);

p
	.command('play')
	.description('Starts a tournament and connects the number of specified players to the server.')
	.option('-c, --config <config file>', 'Use the given config file when running the tournament', './uatc.js')
	.action(playTournament);

p
	.command('test')
	.description('Runs a set of tests against the platform. Note: Not actually implemented')
	.action(() => {
		console.log('Not implemented yet. Go Away.');
	});

program.parse(process.argv);