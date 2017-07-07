import {Readable, Transform} from "stream";
export function docker_exec(dockerApi, container, Cmd, input?): Promise<[number, string, string]> {
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
				}).then((code: number) => {
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
		
		this.color = isError? '\x1B[0;38;5;5m' : '\x1B[0;38;5;6m';
		this.reset = '\x1B[0m';
	}
	
	_transform(chunk: Buffer, enc, next) {
		let str = chunk
			.toString('utf8');
		this.result += str;
		const pushNewline = str.endsWith('\n');
		str = str.trim().replace(/^/mg, this.color + '>> ' + this.reset);
		this.push(str, 'utf8');
		if (pushNewline) {
			this.push('\n')
		}
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
