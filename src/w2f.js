import { Buffer } from 'buffer';
import { Readable } from 'stream';

import { StreamInput, StreamOutput } from 'fluent-ffmpeg-multistream';
import chunker from 'stream-chunker';
import { nonstandard } from 'wrtc';

const {
	RTCAudioSink, RTCAudioSource, RTCVideoSink, RTCVideoSource
} = nonstandard;

function getOptions (kind, width, height, fps=30) {
	if ('video' === kind) {
		return [
			'-f rawvideo',
			'-c:v rawvideo',
			'-s ' + width + 'x' + height, // TODO
			'-pix_fmt yuv420p',
			`-r ${fps}`
		];
	} else if ('audio' === kind) {
		return [
			'-f s16le',
			'-ar 48k',
			'-ac 1'
		];
	}
}

export function input (track, fps) {
	const rs = new Readable({
		read(){}
	});

	const input = StreamInput(rs);
	input.kind = track.kind;

	if ('video' === track.kind) {
		const sink = new RTCVideoSink(track);

		sink.onframe = ({ frame: { data, height, width } }) => {
			rs.push(Buffer.from(data));

			input.options = getOptions(track.kind, width, height, fps);
			input.height  = height;
			input.width   = width;

			rs.emit('options');
		};
	} else if ('audio' === track.kind) {
		const sink = new RTCAudioSink(track);

		sink.ondata = event => rs.push(Buffer.from(event.samples.buffer));

		input.options = getOptions(track.kind);
	}

	if (input.options) return Promise.resolve(input);

	return new Promise(resolve => rs.once('options', () => resolve(input)));
}

export function output ({ kind, width, height, sampleRate }, fps) {
	var ws = null;
	var source = null;

	if ('video' === kind) {
		ws = chunker(width * height * 1.5);
		source = new RTCVideoSource();

		ws.on('data', chunk => {
			source.onFrame({
				width,
				height,
				data: new Uint8ClampedArray(chunk)
			});
		});
	} else if ('audio' === kind) {
		ws = chunker(2 * sampleRate / 100);
		source = new RTCAudioSource();

		ws.on('data', chunk => {
			chunk = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.length);

			source.onData({
				samples: new Int16Array(chunk),
				sampleRate
			});
		});
	}

	const output = StreamOutput(ws);
	output.track = source.createTrack();
	output.options = getOptions(kind, width, height, fps);
	output.kind = kind;
	output.width = width;
	output.height = height;

	return Promise.resolve(output);
}