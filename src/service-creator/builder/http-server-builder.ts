import {unique} from "../../init/docker-names";
import {directionName} from "../config.define";
import {ConfigFile} from "../template/base.configfile";
import {GlobalBodyConfigFile} from "../template/header-passing-configfile";
import {HttpConfigFile} from "../template/http-configfile";
import {LocationConfigFile} from "../template/location-configfile";
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
		this.include(HttpConfigFile, GlobalBodyConfigFile);
		this.include(HttpConfigFile, LocationConfigFile);
	}
	
	protected *buildConfigFile(status): IterableIterator<ConfigFile<any>> {
		yield new GlobalBodyConfigFile({});
		yield new HttpConfigFile({
			direction: directionName(status.direction),
			server_name: [...this.service.alias, ...status.nameAlias].filter(unique),
			Host: this.service.outerDomainName,
		});
	}
}
