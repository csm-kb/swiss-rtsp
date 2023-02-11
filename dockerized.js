#!/usr/bin/env node

/**
 * This is a special command which is used when launching in docker
 * It first runs the relevant database migrations, and then launches the server
 */
import { join } from 'path';
import { fork } from 'child_process';
import { cyan, greenBright, redBright } from 'cli-color';

const run = async () => {
	// Check that we have all required variables
	console.log(cyan('Checking requirements'));
	const required = [
		'GA_OAUTH_CID',
		'GA_OAUTH_CS',
		'GA_SDM_PID',
		'GA_OAUTH_RDR'
	];
	for (let i = 0; i < required.length; i++) {
		const property = required[i];
		if ('string' !== typeof process.env[property] || 0 === process.env[property].trim().length) {
			throw new Error(`Missing required ENV "${property}"`);
		}
	}
	// Launch Server
	console.log(cyan('Launching Server'));
	const server = fork('./server.js', [], {
		cwd: join(__dirname),
		env: { ...process.env, containerized: true }
	});
	server.on('exit', code => {
		process.exit(code);
	});
	if (server.stdout) {
		server.stdout.pipe(process.stdout);
	}
	if (server.stderr) {
		server.stderr.pipe(process.stderr);
	}
};

run().then(() => {
	console.log(greenBright('swiss-rtsp is running'));
}).catch(error => {
	console.error(redBright(error.message));
	const lines = error.stack.split('\n').map(l => l.trim());
	let i = 1;
	let lined = false;
	while (i < lines.length && !lined) {
		if (!lined) {
			lined = lines[i].includes(':');
		}
		console.error(redBright(lines[i]));
		i ++;
	}
	process.exit(1);

});