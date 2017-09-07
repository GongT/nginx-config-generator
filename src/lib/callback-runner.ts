import {createLogger} from "@gongt/ts-stl-library/log/debug";
import {LOG_LEVEL} from "@gongt/ts-stl-library/log/levels";
import {EventEmitter} from "events";

const debug = createLogger(LOG_LEVEL.SILLY, 'timer');

export class CallbackRunner extends EventEmitter {
	protected running: boolean = false;
	protected scheduled: number = 0;
	protected queued: boolean = false;
	protected lock: Promise<void>;
	protected delayTime: number = 0;
	
	public readonly EVENTS = {
		SCHEDULE: Symbol('schedule'),
		QUEUE: Symbol('queue'),
		START: Symbol('start'),
		END: Symbol('end'),
		IDLE: Symbol('idle'),
		ERROR: Symbol('error'),
	};
	
	constructor(protected callback: (...args: any[]) => Promise<void>) {
		super();
		this.on(this.EVENTS.SCHEDULE, (next) => {
			debug('schedule now: %s', next);
			this.queued = false;
			this.scheduled = next;
		});
		this.on(this.EVENTS.QUEUE, () => {
			debug('queued schedule');
			this.queued = true;
		});
		this.on(this.EVENTS.START, () => {
			debug('start callback');
			this.scheduled = 0;
			this.running = true;
		});
		this.on(this.EVENTS.END, () => {
			debug('callback finished');
			this.running = false;
		});
		this.on(this.EVENTS.ERROR, (e) => {
			debug('callback error: %s', e.stack);
		});
	}
	
	private schedule(delay: number, args: any[]) {
		if (this.running) {
			if (this.queued) {
				debug('queued already schedule');
				return;
			}
			this.emit(this.EVENTS.QUEUE);
			this.once(this.EVENTS.END, () => {
				debug('queued schedule starting');
				return this.schedule(delay, args);
			});
		} else {
			const next = Date.now() + delay;
			this.emit(this.EVENTS.SCHEDULE, next);
			return timeout(delay).then(() => {
				if (this.scheduled !== next) {
					debug('  canceled schedule');
					return;
				}
				
				return this.start(args);
			});
		}
	}
	
	private start(args: any[]) {
		if (this.lock) {
			return this.lock.then(() => {
				return this.start(args);
			});
		}
		this.emit(this.EVENTS.START);
		return this.callback(...args).catch((e) => {
			this.emit(this.EVENTS.ERROR, e);
		}).then(() => {
			this.emit(this.EVENTS.END);
			if (!this.queued) {
				this.emit(this.EVENTS.IDLE);
			}
		});
	}
	
	manual(...args: any[]) {
		return this.lock = new Promise((resolve, reject) => {
			const p = this.callback(...args);
			p.catch().then(() => {
				this.lock = null;
			});
			p.then(resolve, reject);
		});
	}
	
	run(...args: any[]) {
		this.schedule(this.delayTime, args);
		this.delayTime = 0;
	}
	
	delay(ms: number) {
		this.delayTime = ms;
		return this;
	}
}

function timeout(ms: number): Promise<void> {
	if (ms) {
		return <any>new Promise((resolve) => {
			setTimeout(() => {
				resolve();
			}, ms);
		});
	} else {
		return <any>new Promise((resolve) => {
			setImmediate(() => {
				resolve();
			});
		});
	}
}
