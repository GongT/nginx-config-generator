import {CACHE_FOLDER} from "../../init/folders";
import {ConfigFile, KnownStore} from "./base.configfile";
import {ConfigValue, stringifyValue} from "./nginx-config-structure";

// proxy_cache_path path [levels=levels] [use_temp_path=on|off] keys_zone=name:size [inactive=time] [max_size=size] [manager_files=number] [manager_sleep=time] [manager_threshold=time] [loader_files=number] [loader_sleep=time] [loader_threshold=time] [purger=on|off] [purger_files=number] [purger_sleep=time] [purger_threshold=time];

export interface CacheOption {
	name: string;
	levels?: number;
	path?: string;
	hashCount?: number;
	maxMegaBytes?: number;
	use_temp_path?: boolean;
	timeMinutes?: number;
}

export class CacheConfigFile extends ConfigFile<CacheOption> {
	init() {
		if (!/^[\-a-zA-Z0-9_]+$/.test(this.option.name)) {
			throw new Error('invalid cache name: ' + this.option.name);
		}
	}
	
	protected debugInspect(): string {
		return this.option.name;
	}
	
	get fileName() {
		return `caches/${this.option.name}.conf`;
	}
	
	get fileStore(): KnownStore {
		return KnownStore.SERVICE;
	}
	
	get zone(): string {
		return this.serviceName + '_' + this.option.name;
	}
	
	buildContent() {
		const {path, levels, hashCount, timeMinutes, maxMegaBytes, use_temp_path} = this.option;
		const options = {
			use_temp_path: use_temp_path || false,
			keys_zone: `${this.zone}:${hashCount || 2}m`,
			inactive: `${timeMinutes || 10}m`,
			max_size: `${maxMegaBytes | 64}M`,
			levels: levels || 2,
		};
		
		return new ConfigValue('proxy_cache_path', [
			path || `${CACHE_FOLDER}/${this.zone}`,
			...stringifyValue(options, true)
		]);
	}
}
