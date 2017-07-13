import {ILocationConfig} from "../../config.define";
import {AccessLog} from "../../global.http";
import {LocationConfigFile} from "../../template/location-configfile";
import {ProxyConfigFile} from "../../template/proxy-configfile";
import {LocationBuilder} from "../location-builder";

export interface IRootLocationConfig extends ILocationConfig {
}

export class RootLocation extends LocationBuilder<IRootLocationConfig> {
	init() {
		this.createUpstream();
		this.include(LocationConfigFile, ProxyConfigFile)
	}
	
	protected *buildLocationFile(status, location): any {
		yield new ProxyConfigFile({
			id: 'root',
			upstream: {
				url: `http://${this.upstream.getName(status.direction)}`,
				stream: false,
				Host: this.service.outerDomainName,
			},
		});
		
		yield new LocationConfigFile({
			id: 'root',
			location: location.location,
			log: {
				access: AccessLog.tiny,
				error: 'info',
			},
		})
	}
}
