import {ConfigFile, KnownStore} from "./template/base.configfile";
import {ConfigValue, ConfigValuesBundle} from "./template/nginx-config-structure";

export class StreamLoaderBuilder {
	private services: string[];
	
	constructor() {
		this.services = [];
	}
	
	registerService(...services: string[]) {
		this.services.push(...services);
	}
	
	configFile(): ConfigFile<any> {
		return new StreamInit({
			services: this.services,
		});
	}
}

export class StreamInit extends ConfigFile<{services: string[]}> {
	protected debugInspect(): string {
		return this.serviceName;
	}
	
	get fileStore(): KnownStore {
		return KnownStore.LOADER;
	}
	
	get fileName(): string {
		return 'streams/load-all.conf';
	}
	
	buildContent(): ConfigValuesBundle {
		const config = new ConfigValuesBundle('stream loader');
		
		for (let service of this.option.services) {
			config.push(new ConfigValue('include', this.resolveRelative('streams', service, 'upstreams/*.conf')));
			config.push(new ConfigValue('include', this.resolveRelative('streams', service, '*.conf')));
		}
		
		return config;
	}
}
