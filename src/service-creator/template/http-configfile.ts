import {directionName, RouteDirection} from "../config.define";
import {ConfigFile, KnownStore} from "./base.configfile";
import {ConfigSection, ConfigValue, ConfigValuesBundle} from "./nginx-config-structure";

export interface HttpTemplateOption {
	server_name: string[];
	Host: string;
	direction: string;
}

export class HttpConfigFile extends ConfigFile<HttpTemplateOption> {
	protected debugInspect(): string {
		return this.option.server_name[0];
	}
	
	get fileName(): string {
		return 'routes/' + this.option.direction + '.conf';
	}
	
	get fileStore(): KnownStore {
		return KnownStore.SERVICE;
	}
	
	buildContent() {
		const port = this.option.direction === directionName(RouteDirection.IN)
			? 81 : 80;
		
		const config = new ConfigSection('server');
		
		config.set(ConfigValuesBundle.fromArray('listen', [`${port}`, `[::]:${port}`,]));
		config.set(new ConfigValue('server_name', this.option.server_name));
		
		return config;
	}
}
