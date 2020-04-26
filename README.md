# UATC - Ultimate Algorithm Test Client
_*note*: This is a work in progress_

This is a small test package for testing the [socialgorithm](https://github.com/socialgorithm) platform.

## Getting started

To install and run this util clone this repo and:

```bash
npm i
npm build
node ./dist/uabc.js help
```

This expects that [@socialgorithm/uabc](https://github.com/socialgorithm/uabc) is installed globally. 

### Commands

`uatc init` - Spits out a scaffolding config file.

`uatc play` - Play a tournament.

### Config

This package is configured via a `uatc.js` file in the directory your running the command.

The best way to create this is to run `uatc init` which will give you the basic scaffolding. 

Config:

```js
{
	playTournament: {       // The config for the play mode. 
		players: [      // A collection of players to run against the game
			{
				command: 'node example.js',     // The command to run to start this player. See uabc file arg
				number: 5,      // The number of players of this type to connect
				name: 'example'     // The name to use when connecting to the game
			}
		],
		tournamentServerAddress: 'http://localhost:3141',
		autoplay: true,
		tournamentSettings: {       // Settings to use when playing the tournament
			timeout: 100,
			numberOfGames: 50,
			type: "DoubleElimination",
			autoPlay: false
		}
	}
}
```