import {inSameNetworkWithMe, isGatewayServer, isNotMe} from "../../lib/server-detect";
import {Builder, IServiceStatus, RouteDirection} from "../config.define";
import {Template} from "../template/base";
import {UpstreamTemplate} from "../template/upstream-template";

export interface IUpstreamConfig {
	serviceName: string;
	interfaceMachine: string[];
	machines: string[];
	direction: RouteDirection;
	port: number;
}

export class UpstreamBuilder implements Builder {
	protected serviceName: string;
	protected gateways: string[];
	protected upstreams: string[];
	protected direction: RouteDirection;
	protected port: number;
	
	constructor(config: IUpstreamConfig) {
		this.serviceName = config.serviceName;
		this.gateways = config.interfaceMachine.filter(isNotMe);
		this.upstreams = config.machines.filter(isNotMe).filter(inSameNetworkWithMe);
		this.direction = config.direction;
		this.port = config.port;
	}
	
	private buildRouteIn(route: string[]) { // route from outside to xxx
		if (isGatewayServer()) {
			route.push(...this.upstreams);
		}
	}
	
	private buildRouteOut(route: string[]) { // route from outside to xxx
		if (isGatewayServer()) {
			route.push(...this.upstreams);
		} else {
			route.push(...this.gateways);
		}
	}
	
	buildTemplate(status: IServiceStatus): Template {
		const route = []; // route from inside to outside
		if (status.localRunning) {
			route.push(status.dockerHost);
		}
		
		if (this.direction === RouteDirection.IN) {
			this.buildRouteIn(route);
		} else {
			this.buildRouteOut(route);
		}
		
		let name: string;
		if (route.length === 0) {
			name = 'no-upstream-exists';
		} else {
			name = this.createName(this.serviceName, this.direction);
		}
		
		return new UpstreamTemplate(name, route);
	}
	
	private createName(serviceName: string, direction: RouteDirection) {
		return `upstream_${serviceName}_${RouteDirection[direction]}_${this.port}`;
	}
}

