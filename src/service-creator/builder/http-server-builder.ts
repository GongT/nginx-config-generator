import {unique} from "../../init/docker-names";
import {directionName} from "../config.define";
import {ConfigFile} from "../template/base.configfile";
import {GlobalBodyConfigFile} from "../template/header-passing-configfile";
import {FakeHttpsConfigFile, HttpConfigFile, HttpJumpConfigFile, HttpsConfigFile} from "../template/http-configfile";
import {LocationConfigFile} from "../template/location-configfile";
import {Builder} from "./base.builder";
import {LocationBuilder} from "./location-builder";
import {createLocationRender} from "./location.factory";
import {WellknownLocationConfigFile} from "./locations/wellknown.location";

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
		this.include(HttpsConfigFile, GlobalBodyConfigFile);
		
		this.include(HttpConfigFile, LocationConfigFile);
		this.include(HttpsConfigFile, LocationConfigFile);
		
		this.include(HttpJumpConfigFile, WellknownLocationConfigFile);
	}
	
	protected *buildConfigFile(status): IterableIterator<ConfigFile<any>> {
		yield new GlobalBodyConfigFile({});
		
		const server_name = [...this.service.alias, ...status.nameAlias].filter(unique);
		const direction = directionName(status.direction);
		
		const normal = () => {
			return new HttpConfigFile({
				direction: direction,
				server_name: server_name,
				Host: this.service.outerDomainName,
			});
		};
		
		if (this.service.SSL) {
			if (status.SSLExists) {
				yield new HttpsConfigFile({
					direction: direction,
					server_name: server_name,
					Host: this.service.outerDomainName,
					certPath: this.service.SSLPath,
					allowInsecure: !this.service.SSLJump,
				});
				if (this.service.SSLJump) {
					yield new HttpJumpConfigFile({
						direction: direction,
						server_name: server_name,
						Host: this.service.outerDomainName,
					});
				} else {
					// normal http included in https
				}
			} else {
				yield new FakeHttpsConfigFile({
					direction: direction,
					server_name: server_name,
					Host: this.service.outerDomainName,
				});
				yield normal(); // normal http
			}
		} else {
			yield normal(); // nrmal http
		}
	}
}
