import {ConfigFile, KnownStore} from "./base.configfile";
import {ConfigSection, ConfigValue, stringifyValue} from "./nginx-config-structure";

export interface UpstreamDefine {
	weight: string|number;
	port: number;
	max_conns?: string|number;
	max_fails?: string|number;
	fail_timeout?: string|number;
	backup?: boolean;
	down?: boolean
}

export type UpstreamServers = {[id: string]: UpstreamDefine};

export interface IUpstreamTemplateVar {
	name: string;
	servers: UpstreamServers;
	id: string;
	hashKey: string;
	keepalive?: number;
	protocol: string;
}

export class UpstreamConfig extends ConfigFile<IUpstreamTemplateVar> {
	private isStream;
	
	protected debugInspect(): string {
		return `<${this.option.protocol}>${Object.keys(this.option.servers).join(', ')}`;
	}
	
	init(options: IUpstreamTemplateVar) {
		this.isStream = options.protocol === 'tcp' || options.protocol === 'udp';
		
		const apply = Object.assign({
			max_conns: 80,
			max_fails: 4,
			fail_timeout: 1,
			backup: false,
			down: false,
		}, options);
		Object.assign(options, apply);
	}
	
	get fileStore(): KnownStore {
		return this.isStream? KnownStore.STREAM_SERVER : KnownStore.SERVICE;
	}
	
	get fileName() {
		return `upstreams/${this.option.id}.conf`;
	}
	
	buildContent() {
		const config = new ConfigSection('upstream ' + this.option.name);
		
		if (this.option.hashKey) {
			config.set(new ConfigValue('hash', this.option.hashKey));
		}
		if (this.option.keepalive) {
			config.set(new ConfigValue('keepalive', this.option.keepalive.toString()));
		}
		
		Object.keys(this.option.servers).forEach((serverName) => {
			const {port, ...upstreamOpts} = this.option.servers[serverName];
			config.push(new ConfigValue('server', [
				serverName + ':' + port,
				...stringifyValue(upstreamOpts, false),
			]));
		});
		
		return config;
	}
}
