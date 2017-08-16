import {ConfigFile, KnownStore} from "./base.configfile";
import {ConfigSection, ConfigValue} from "./nginx-config-structure";

export interface StreamServerTemplateOption {
	protocol: string;
	upstream: string;
	port: number;
	name: string;
}

export class StreamServerConfig extends ConfigFile<StreamServerTemplateOption> {
	protected debugInspect(): string {
		return `${this.serviceName}:${this.option.port}`;
	}
	
	get fileName() {
		return `${this.serviceName}.${this.directionName}.${this.option.port}.conf`;
	}
	
	get fileStore(): KnownStore {
		return KnownStore.STREAM_SERVER;
	}
	
	buildContent() {
		const conf = new ConfigSection('server');
		conf.push(new ConfigValue('#', this.option.name));
		conf.push(new ConfigValue('listen', [
			this.option.port.toString(),
			this.option.protocol,
		]));
		conf.push(new ConfigValue('proxy_pass', this.option.upstream));
		return conf;
	}
}
