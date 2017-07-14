import {ILocationConfig} from "../../config.define";
import {AccessLog} from "../../global.http";
import {LocationConfigFile} from "../../template/location-configfile";
import {ProxyConfigFile} from "../../template/proxy-configfile";
import {LocationBuilder} from "../location-builder";

export interface ISocketLocationConfig extends ILocationConfig {
}

export class WebsocketLocation extends LocationBuilder<ISocketLocationConfig> {
	init() {
		this.createUpstream();
		this.include(LocationConfigFile, ProxyConfigFile)
	}
	
	protected *buildLocationFile(status, location): any {
		yield new ProxyConfigFile({
			id: this.id,
			upstream: {
				url: `http://${this.upstream.getName(status.direction)}`,
				stream: true,
			},
		});
		
		yield new LocationConfigFile({
			location: location.location,
			id: this.id,
			log: {
				access: AccessLog.none,
				error: 'warn',
			},
		});
	}
}
