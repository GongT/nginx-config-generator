import {Builder, IServiceConfig, IServiceStatus, RouteDirection} from "../config.define";
import {HttpTemplate} from "../template/http-template";
import {LocationBuilder} from "./location-builder";
import {createLocationRender} from "./location.factory";
import {UpstreamBuilder} from "./upstream-builder";

export interface IHttpServerConfig {
	direction: RouteDirection;
	config: IServiceConfig;
}

export class HttpServerBuilder implements Builder {
	protected locations: LocationBuilder[];
	protected direction: RouteDirection;
	protected config: IServiceConfig;
	
	protected upstream: UpstreamBuilder;
	
	constructor({direction, config}: IHttpServerConfig) {
		this.direction = direction;
		this.config = config;
		this.locations = this.createLocations();
		this.upstream = this.createUpstream();
	}
	
	private createLocations() {
		const {locations} = this.config;
		return Object.keys(locations).map((location) => {
			return createLocationRender(locations[location], this.config);
		});
	}
	
	private createUpstream() {
		return new UpstreamBuilder({
			serviceName: this.config.serviceName,
			interfaceMachine: this.config.interfaceMachine,
			machines: this.config.machines,
			direction: this.direction,
			port: 80,
		});
	}
	
	buildTemplate(status: IServiceStatus): HttpTemplate {
		return undefined; // TODO
	}
}
