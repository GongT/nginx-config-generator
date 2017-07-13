import {resolve} from "path";
import {CONFIGFILE_PATH} from "../init/folders";
import {Builder} from "./builder/base.builder";
import {IExtraStatus, IServiceStatus, RouteDirection} from "./config.define";
import {ConfigFile, KnownStore} from "./template/base.configfile";
import {ConfigValue, ConfigValuesBundle} from "./template/nginx-config-structure";

export class ServiceLoaderBuilder extends Builder<{}> {
	protected init(config: {}): void {
	}
	
	*buildConfigFile(status: IServiceStatus&IExtraStatus): IterableIterator<ConfigFile<any>> {
		status.direction = RouteDirection.NULL;
		yield new ServerInit({});
	}
}

export class ServerInit extends ConfigFile<{}> {
	protected debugInspect(): string {
		return this.serviceName;
	}
	
	get fileStore(): KnownStore {
		return KnownStore.SERVICE;
	}
	
	get fileName(): string {
		return 'service.conf';
	}
	
	buildContent(): ConfigValuesBundle {
		const config = new ConfigValuesBundle(this.serviceName);
		
		config.push(new ConfigValue('include',
			resolve(this.filePath, '../caches/*.conf').replace(CONFIGFILE_PATH, ''),
		));
		config.push(new ConfigValue('include',
			resolve(this.filePath, '../upstreams/*.conf').replace(CONFIGFILE_PATH, ''),
		));
		config.push(new ConfigValue('include',
			resolve(this.filePath, '../routes/*.conf').replace(CONFIGFILE_PATH, ''),
		));
		
		return config;
	}
}
