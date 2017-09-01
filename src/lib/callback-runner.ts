import {createLogger} from "@gongt/ts-stl-library/log/debug";
import {LOG_LEVEL} from "@gongt/ts-stl-library/log/levels";
import {EventEmitter} from "events";

const debug = createLogger(LOG_LEVEL.SILLY, 'timer');

export class CallbackRunner extends EventEmitter {
	protected running: boolean = false;
	protected promise: Promise<void> = null;
	protected queuePromise: Promise<void> = null;
	protected lastArgs: any[];
	
	public readonly EVENTS = {
		START: Symbol('start'),
		END: Symbol('end'),
		ERROR: Symbol('error'),
	};
	
	constructor(protected callback: (...args: any[]) => Promise<void>) {
		super();
	}
	
	private start(args: any[]) {
		debug('start');
		this.running = true;
		this.emit(this.EVENTS.START);
		const promise = this.callback(...args);
		this.promise = promise.catch((e) => {
			debug('callback end with error: ', e.stack);
			this.emit(this.EVENTS.ERROR, e);
		}).then(() => {
			this.promise = this.queuePromise = null;
			debug('callback finished');
			this.running = false;
			try {
				this.emit(this.EVENTS.END);
			} catch (e) {
				console.error(e);
			}
		});
		return promise;
	}
	
	run(...args: any[]): Promise<void> {
		this.lastArgs = args;
		if (this.queuePromise) {
			return this.queuePromise;
		}
		if (this.running) {
			debug('callback queued');
			this.queuePromise = this.promise.then(() => {
				return this.start(this.lastArgs);
			});
			return this.queuePromise;
		}
		
		debug('run now');
		return this.start(args);
	}
	
	delay(ms: number, ...args: any[]) {
		this.lastArgs = args;
		if (this.queuePromise) {
			return this.queuePromise;
		}
		let p: Promise<void>;
		if (this.running) {
			debug('callback queued');
			p = this.promise.then(() => {
				return timeout(ms);
			});
		} else {
			p = timeout(ms);
		}
		
		this.queuePromise = p.then(() => {
			return this.start(this.lastArgs);
		});
		
		debug('run delay (%s)', ms);
		return this.queuePromise;
	}
}

function timeout(ms: number): Promise<void> {
	return <any>new Promise((resolve) => {
		setTimeout(() => {
			resolve();
		}, ms);
	});
}
