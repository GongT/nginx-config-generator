import {resolve} from "path";
import {CONFIGFILE_PATH} from "../init/folders";
import {ConfigFile, KnownStore} from "./template/base.configfile";
import {ConfigValue, ConfigValuesBundle} from "./template/nginx-config-structure";

export class MainLoaderBuilder {
	private services: string[];
	
	constructor() {
		this.services = [];
	}
	
	registerService(...services: string[]) {
		this.services.push(...services);
	}
	
	configFile(): ConfigFile<any> {
		return new MainInit({
			services: this.services,
		});
	}
}

export class MainInit extends ConfigFile<{services: string[]}> {
	protected debugInspect(): string {
		return this.serviceName;
	}
	
	get fileStore(): KnownStore {
		return KnownStore.LOADER;
	}
	
	get fileName(): string {
		return 'services.conf';
	}
	
	buildContent(): ConfigValuesBundle {
		const config = new ConfigValuesBundle('loader');
		
		for (let service of this.option.services) {
			config.push(new ConfigValue('include',
				resolve(this.filePath, '../services', service, 'service.conf')
					.replace(CONFIGFILE_PATH + '/', ''),
			));
		}
		
		return config;
	}
}
