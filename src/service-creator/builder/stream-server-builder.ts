import {IStreamServerConfig, RouteDirection} from "../config.define";
import {StreamServerConfig} from "../template/stream-server-configfile";
import {Builder} from "./base.builder";
import {UpstreamBuilder} from "./upstream-builder";

export interface IStreamServerOpt {
	servers: IStreamServerConfig[];
}

export class StreamServerBuilder extends Builder<IStreamServerOpt> {
	private servers: {
		upstream: UpstreamBuilder;
		server: IStreamServerConfig;
	}[];
	
	protected init(config: IStreamServerOpt): void {
		this.servers = config.servers.map((server) => {
			const upstream = this.createSubBuilder(UpstreamBuilder, {
				interfaceMachine: this.service.interfaceMachine,
				machines: this.service.machines,
				port: server.port,
				protocol: server.protocol || 'tcp',
			});
			return {upstream, server};
		});
	}
	
	protected * buildConfigFile(status): any {
		for (let {upstream, server} of this.servers) {
			yield new StreamServerConfig({
				upstream: upstream.getName(status.direction),
				name: server.name,
				protocol: server.protocol,
				port: status.direction === RouteDirection.IN? server.port + 1 : server.port,
			});
			yield* upstream.configFiles(status);
		}
	}
}
