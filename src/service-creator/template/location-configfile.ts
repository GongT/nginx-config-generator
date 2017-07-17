import {AccessLog, accessLogName} from "../global.http";
import {ConfigFile, KnownStore} from "./base.configfile";
import {ConfigSection, ConfigValue, ConfigValuesBundle} from "./nginx-config-structure";

// proxy_buffer_size 8k
// proxy_buffers 32 8k

export interface LocationOption {
	id: string;
	location: string;
	log?: {
		access?: AccessLog;
		condition?: string,
		error?: 'debug'|'info'|'notice'|'warn'|'error'|'crit'|'alert'|'emerg';
	};
	index?: boolean;
	root?: string;
	alias?: string;
	content?: string|ConfigValuesBundle;
}

export class LocationConfigFile extends ConfigFile<LocationOption> {
	get fileName() {
		return `locations/${this.option.id}.${this.directionName}.location.conf`;
	}
	
	get fileStore(): KnownStore {
		return KnownStore.SERVICE;
	}
	
	protected debugInspect() {
		return this.option.location;
	}
	
	buildContent() {
		const config = new ConfigSection('location ' + this.option.location);
		
		if (this.option.content) {
			config.push(this.option.content);
		}
		if (this.option.alias) {
			config.push(new ConfigValue('alias', this.option.alias));
		}
		if (this.option.root) {
			config.push(new ConfigValue('root', this.option.root));
		}
		if (this.option.index) {
			config.push(new ConfigValue('autoindex', 'on'));
		}
		
		const accessLog = [
			'/dev/stdout',
		];
		let accessExists = false, error_level = 'warn';
		if (this.option.log) {
			const {access, condition, error} = this.option.log;
			
			if (error) {
				error_level = error;
			}
			
			if (access === AccessLog.none) {
				accessExists = true;
				accessLog[0] = 'off';
			} else if (access) {
				accessExists = true;
				accessLog.push(accessLogName(access));
				if (condition) {
					accessLog.push(`if=${condition}`);
				}
			}
		}
		if (!accessExists) {
			accessLog.push(accessLogName(AccessLog.tiny));
			accessLog.push(`if=$log_abnormal`);
		}
		config.push(new ConfigValue('access_log', accessLog));
		config.push(new ConfigValue('error_log', ['stderr', error_level]));
		
		return config;
	}
}
