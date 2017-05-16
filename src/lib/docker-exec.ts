import {Readable, Transform} from "stream";
export function docker_exec(dockerApi, container, Cmd, input?) {
	return new Promise((resolve, reject) => {
		dockerApi.getContainer(container).exec({
			Cmd: Cmd,
			AttachStdin: true,
			AttachStdout: true,
			AttachStderr: true,
		}, (err, exec) => {
			if (err) {
				return reject(err);
			}
			exec.start({hijack: true, stdin: true}, (err, stream) => {
				if (err) {
					return reject(err);
				}
				
				const stdin = new InputStream(input || '');
				const stdout = new StringStream(false);
				const stderr = new StringStream(true);
				
				stdin.pipe(stream);
				
				dockerApi.modem.demuxStream(stream, stdout, stderr);
				
				stdout.pipe(process.stdout);
				stderr.pipe(process.stderr);
				
				wait(stream).then(() => {
					return reInspectExit(exec);
				}).then((code) => {
					resolve([code, stdout.result, stderr.result]);
				}, reject);
			});
		});
	});
}

class InputStream extends Readable {
	constructor(string: string) {
		super();
		this.push(new Buffer(string, 'utf-8'));
		this.push(null);
	}
}

class StringStream extends Transform {
	public result = '';
	private color;
	private reset;
	
	constructor(isError?) {
		super();
		
		this.color = new Buffer(isError? '\x1B[38;5;1;2m' : '\x1B[2m');
		this.reset = new Buffer('\x1B[0m');
	}
	
	_transform(chunk, enc, next) {
		this.push(this.color);
		this.push(chunk, enc);
		this.push(this.reset);
		this.result += chunk.toString('utf-8');
		next();
	}
}

function wait(stream) {
	return new Promise((resolve, reject) => {
		stream.on('end', e => resolve(stream));
		stream.on('error', e => reject(stream));
	})
}

function reInspectExit(exec) {
	return new Promise((resolve, reject) => {
		exec.inspect((err, result) => {
			if (err) {
				return reject(err);
			}
			resolve(result.ExitCode);
		});
	})
}
