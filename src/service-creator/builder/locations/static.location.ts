import {ILocationConfig, RouteDirection} from "../../config.define";
import {AccessLog} from "../../global.http";
import {CacheConfigFile} from "../../template/cache-configfile";
import {LocationConfigFile} from "../../template/location-configfile";
import {ProxyConfigFile} from "../../template/proxy-configfile";
import {LocationBuilder} from "../location-builder";

export interface IStaticLocationConfig extends ILocationConfig {
}

export class StaticLocation extends LocationBuilder<IStaticLocationConfig> {
	init() {
		this.createUpstream();
		this.include(LocationConfigFile, ProxyConfigFile)
	}
	
	protected *buildLocationFile(status, location): any {
		if (status.direction !== RouteDirection.IN) {
			return;
		}
		
		const cache = new CacheConfigFile({
			name: 'static-cache',
		});
		yield cache;
		
		yield new ProxyConfigFile({
			id: this.id,
			cache: {
				zone: cache.zone,
				key: "$request_method$request_uri",
				cacheDays: 1,
			},
		});
		
		yield new LocationConfigFile({
			location: location.location,
			id: this.id,
			log: {
				access: AccessLog.tiny,
				condition: '$log_abnormal',
				error: 'info',
			},
		});
	}
}
