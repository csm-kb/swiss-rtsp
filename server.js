import express from 'express';
import socketio from 'socket.io';
import { spawn } from 'child_process';
import cic from 'cli-color';
import http from 'http';

const app = express();
const server = http.createServer(app);

var io = socketio(server);

spawn('ffmpeg', [ '-h' ]).on('error', () => {
	console.error(cic.redBright('ffmpeg not found in environment. please install ffmpeg!'));
	process.exit(-1);
});

io.on('connection', socket => {
	socket.emit('message', 'Please set rtsp dest before stream');

	var ffmpeg_process, feedStream = false;
	var ops = [];
	socket.on('config_rtspDestination', m => {
		if ('string' !== typeof m){
			socket.emit('fatal', 'rtsp destination must be a string');
			return;
		}
		var regexValidator = /^rtsp:\/\/[^\s]*$/;
		if(!regexValidator.test(m)){
			socket.emit('fatal', 'rtsp address is invalid');
			return;
		}
		socket._rtspDestination = m;
		socket.emit('message', `rtsp destination set to '${m}'`);
	});
	
	socket.on('config_vcodec', m => {
		if('string' !== typeof m){
			socket.emit('fatal','input codec must be a string');
			return;
		}
		if(!/^[0-9a-z]{2,}$/.test(m)){
			socket.emit('fatal','input codec contains illegal character');
			return;
		}//for safety
		socket._vcodec = m;
	});

	socket.on('start', () => {
		if(ffmpeg_process || feedStream){
			socket.emit('fatal','stream already started');
			return;
		}
		if(!socket._rtspDestination){
			socket.emit('fatal','no destination given');
			return;
		}
		
		var framerate = socket.handshake.query.framespersecond;
		console.log('framerate on node side', framerate);
		//var ops = [];
		if (1 == framerate){
			ops = [
				'-i','-',
				'-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', 
				//'-max_muxing_queue_size', '1000', 
				//'-bufsize', '5000',
				'-r', '1', '-g', '2', '-keyint_min','2', 
				'-x264opts', 'keyint=2', '-crf', '25', '-pix_fmt', 'yuv420p',
				'-profile:v', 'baseline', '-level', '3', 
				//'-c:a', 'aac', '-b:a', audioEncoding, '-ar', audioBitrate, 
				'-f', 'flv', socket._rtspDestination		
			];
			
		} else if (15 == framerate) {
			ops = [
				'-i','-',
				'-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency', 
				'-max_muxing_queue_size', '1000', 
				'-bufsize', '5000',
				'-r', '15', '-g', '30', '-keyint_min','30', 
				'-x264opts', 'keyint=30', '-crf', '25', '-pix_fmt', 'yuv420p',
				'-profile:v', 'baseline', '-level', '3', 
				//'-c:a', 'aac', '-b:a',audioEncoding, '-ar', audioBitrate, 
				'-f', 'flv', socket._rtspDestination		
			];
			
		} else { 
			ops=[
				'-i','-',
				//'-c', 'copy', 
				'-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency',  // video codec config: low latency, adaptive bitrate
				//'-c:a', 'aac', '-ar', audioBitrate, '-b:a', audioEncoding, // audio codec config: sampling frequency (11025, 22050, 44100), bitrate 64 kbits
				//'-max_muxing_queue_size', '4000', 
				//'-y', //force to overwrite
				//'-use_wallclock_as_timestamps', '1', // used for audio sync
				//'-async', '1', // used for audio sync
				//'-filter_complex', 'aresample=44100', // resample audio to 44100Hz, needed if input is not 44100
				//'-strict', 'experimental', 
				'-bufsize', '5000',
				'-r', '30',
				'-f', 'rtsp', '-rtsp_transport', 'tcp', socket._rtspDestination
				/*. original params
				'-i','-',
				'-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency',  // video codec config: low latency, adaptive bitrate
				'-c:a', 'aac', '-ar', '44100', '-b:a', '64k', // audio codec config: sampling frequency (11025, 22050, 44100), bitrate 64 kbits
				'-y', //force to overwrite
				'-use_wallclock_as_timestamps', '1', // used for audio sync
				'-async', '1', // used for audio sync
				//'-filter_complex', 'aresample=44100', // resample audio to 44100Hz, needed if input is not 44100
				//'-strict', 'experimental', 
				'-bufsize', '1000',
				'-f', 'flv', socket._rtspDestination
				*/
			];
		}

		console.log('ops', ops);
		console.log(socket._rtspDestination);
		
		ffmpeg_process = spawn('ffmpeg', ops);
		
		console.log('ffmpeg spawned');
	
		feedStream = data => {
			ffmpeg_process.stdin.write(data);
		};
	
		ffmpeg_process.stderr.on('data', d => socket.emit('ffmpeg_stderr',`${d}`));
	
		ffmpeg_process.on('error', e => {
			console.log(cic.redBright(`child process error: ${e}`));
			socket.emit('fatal', `ffmpeg error: ${e}`);
			feedStream = false;
			socket.disconnect();
		});
	
		ffmpeg_process.on('exit', e => {
			console.log(cic.redBright(`child process exit: ${e}`));
			socket.emit('fatal', `ffmpeg exit: ${e}`);
			socket.disconnect();
		});
	});

	socket.on('binarystream', m => {
		if (!feedStream) {
			socket.emit('fatal', 'rtsp not set yet');
			ffmpeg_process.stdin.end();
			ffmpeg_process.kill('SIGINT');
			return;
		}
		feedStream(m);
	});

	socket.on('disconnect', () => {
		console.log('socket disconnected');
		feedStream = false;
		if (ffmpeg_process) {
			try {
				ffmpeg_process.stdin.end();
				ffmpeg_process.kill('SIGINT');
				console.log('ffmpeg_process ended');
			} catch (e) {
				console.warn(cic.yellowBright('killing ffmpeg process attempt failed'));
			}
		}
	});

	socket.on('error', e => {
		console.log(cic.redBright(`socket.io error: ${e}`));
	});
});

io.on('error', e => {
	console.log(cic.redBright(`socket.io error: ${e}`));
});

server.listen(process.env.PORT || 1437, () => {
	console.log(cic.greenBright('https/websocket listening on *:1437'));
});

process.on('uncaughtException', err => {
	console.log(cic.redBright(err));
});