import {resolve} from "path";
import {CONFIGFILE_PATH, SERVICE_SAVE_FOLDER} from "../../init/folders";
import {deepFreeze} from "../../lib/deep-freeze";
import {FileTracker} from "../../lib/file-change-tracker";
import {directionName, PassingData, RouteDirection} from "../config.define";
import {ConfigSection, ConfigValue, ConfigValuesBundle, Merge} from "./nginx-config-structure";
import extend = require('extend');

export interface Stringify {
	toString(): string;
}

export class FileWrite {
	protected fileName: string;
	protected content: string;
	
	constructor(fileName: string, content: string|Stringify) {
		this.fileName = resolve(CONFIGFILE_PATH, fileName);
		if (typeof content === 'string') {
			content = content.trim();
		} else {
			content = content.toString().trim();
		}
		this.content = '### GENERATED FILE, DO NOT MODIFY\n' + content;
	}
	
	doneWith(fileTracker: FileTracker) {
		fileTracker.writeFile(this.getPath(), this.content);
	}
	
	getPath() {
		return resolve(CONFIGFILE_PATH, this.fileName);
	}
}

export enum KnownStore{
	SERVICE,
	LOADER,
	STREAM_SERVER,
	HTTP,
}

export type ConfigFileCreator<T> = new(options: T) => ConfigFile<T>;

export abstract class ConfigFile<OptionType> {
	protected serviceName: string;
	protected direction: RouteDirection;
	protected option: OptionType;
	private _content: {_: Merge&Stringify};
	
	private inited: boolean = false;
	
	constructor(options: OptionType) {
		this.option = extend(true, {}, options);
		this._content = <any>{};
	}
	
	doInit(base: PassingData) {
		if (this.inited) {
			return;
		}
		this.inited = true;
		this.serviceName = base.serviceName;
		this.direction = base.direction;
		
		this.includeRegistry = {};
		this.init(this.option);
		
		Object.freeze(this);
		deepFreeze(this.option);
	}
	
	protected get directionName() {
		return directionName(this.direction);
	}
	
	protected init(option: OptionType) {
	}
	
	protected abstract debugInspect(): string;
	
	public inspect(...args): string {
		return `${this.constructor.name} [${this.debugInspect()}] -> "${this.fileName}"`;
	}
	
	get includeLocation(): string {
		return this.resolveRelative(this.fileName);
	}
	
	resolveRelative(...paths: string[]): string {
		return resolve(this.filePath, ...paths).replace(CONFIGFILE_PATH, '').replace(/^\//, '');
	}
	
	private get fileAbsolutePath() {
		return resolve(this.filePath, this.fileName)
	}
	
	private get filePath() {
		switch (this.fileStore) {
		case KnownStore.SERVICE:
			return resolve(SERVICE_SAVE_FOLDER, 'services', this.serviceName);
		case KnownStore.LOADER:
			return SERVICE_SAVE_FOLDER;
		case KnownStore.HTTP:
			return resolve(CONFIGFILE_PATH, 'conf.d');
		case KnownStore.STREAM_SERVER:
			return resolve(SERVICE_SAVE_FOLDER, 'streams', this.serviceName);
		}
	}
	
	public abstract get fileStore(): KnownStore;
	
	public abstract get fileName(): string;
	
	protected abstract buildContent(): ConfigValue|ConfigSection|ConfigValuesBundle;
	
	protected get content() {
		if (!this._content._) {
			const content = this.buildContent();
			if (content.constructor === ConfigValue) {
				this._content._ = new ConfigValuesBundle('');
				this._content._.push(content);
			} else {
				this._content._ = <any>content;
			}
		}
		return this._content._;
	}
	
	private includeRegistry: {[id: string]: boolean};
	
	include(other: ConfigFile<any>, before = false): this {
		const file = other.includeLocation;
		if (this.includeRegistry[file]) {
			return this;
		}
		this.includeRegistry[file] = true;
		
		const value = new ConfigValue('include', file);
		if (before) {
			this.content.unshift(value);
		} else {
			this.content.push(value);
		}
		return this;
	}
	
	writeFile(fileTracker: FileTracker) {
		try {
			const content = this.content;
			const write = new FileWrite(this.fileAbsolutePath, content);
			write.doneWith(fileTracker);
		} catch (e) {
			e.message += ` in ${this.constructor.name}(${this.serviceName})`;
			throw e;
		}
	}
}

export abstract class GlobalConfig<OptionType> extends ConfigFile<OptionType> {
}
export abstract class HttpConfig<OptionType> extends ConfigFile<OptionType> {
}
