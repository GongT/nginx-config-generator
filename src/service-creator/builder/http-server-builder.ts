import {unique} from "../../init/docker-names";
import {directionName, RouteDirection} from "../config.define";
import {ConfigFile} from "../template/base.configfile";
import {GlobalBodyConfigFile} from "../template/header-passing-configfile";
import {
	FakeHttpsConfigFile,
	HttpConfigFile,
	HttpsConfigFile,
	HttpWithJumpConfigFile,
} from "../template/http-configfile";
import {LocationConfigFile} from "../template/location-configfile";
import {ProxyConfigFile} from "../template/proxy-configfile";
import {Builder} from "./base.builder";
import {LocationBuilder} from "./location-builder";
import {createLocationRender} from "./location.factory";

export interface IHttpServerConfig {
}

export class HttpServerBuilder extends Builder<IHttpServerConfig> {
	init(config: IHttpServerConfig) {
		const {locations: locationConfig} = this.service;
		const locations: LocationBuilder<any>[] = [];
		
		if (this.service.SSL) {
			createLocationRender(locations, {
				location: '/.well-known',
				type: 'well-known',
			}, this.service);
		}
		
		Object.keys(locationConfig).forEach((location, index) => {
			createLocationRender(locations, locationConfig[location], this.service);
		});
		this.auto(...locations);
		
		this.include(ProxyConfigFile, GlobalBodyConfigFile);
		
		this.include(HttpConfigFile, LocationConfigFile);
		this.include(HttpWithJumpConfigFile, LocationConfigFile);
		this.include(HttpsConfigFile, LocationConfigFile);
	}
	
	protected * buildConfigFile(status): IterableIterator<ConfigFile<any>> {
		yield new GlobalBodyConfigFile({Host: this.service.outerDomainName});
		
		const server_name = [...this.service.alias, ...status.nameAlias].filter(unique);
		const direction = directionName(status.direction);
		const baseOpt = {
			direction: direction,
			server_name: server_name,
			Host: this.service.outerDomainName,
		};
		
		const normal = () => {
			return new HttpConfigFile(baseOpt);
		};
		
		if (this.service.SSL && status.direction === RouteDirection.IN) {
			if (!status.SSLExists || this.service.SSL === 'self') {
				yield new FakeHttpsConfigFile(baseOpt);
				yield normal();
			} else {
				const force = this.service.SSL === 'force';
				if (force) {
					yield new HttpWithJumpConfigFile(baseOpt);
				}
				
				yield new HttpsConfigFile({
					...baseOpt,
					certPath: this.service.SSLPath,
					withHttp: !force,
				});
			}
		} else {
			yield normal(); // normal http
		}
	}
}
