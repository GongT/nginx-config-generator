import {inSameNetworkWithMe, isGatewayServer, isNotMe} from "../../lib/server-detect";
import {directionName, RouteDirection} from "../config.define";
import {UpstreamConfig, UpstreamServers} from "../template/upstream-configfile";
import {Builder} from "./base.builder";

export interface IUpstreamConfig {
	interfaceMachine: string[];
	machines: string[];
	keepalive?: number;
	port?: number;
	protocol?: string;
}

export class UpstreamBuilder extends Builder<IUpstreamConfig> {
	protected gateways: string[];
	protected upstreams: string[];
	protected port: number;
	protected keepalive: number;
	protected isStream: boolean;
	
	init(config: IUpstreamConfig) {
		this.gateways = config.interfaceMachine.filter(isNotMe);
		this.upstreams = config.machines.filter(isNotMe).filter(inSameNetworkWithMe);
		if (!config.protocol) {
			config.protocol = 'http';
		}
		this.isStream = config.protocol === 'tcp' || config.protocol === 'udp';
		if (this.isStream) {
			if (config.hasOwnProperty('keepalive')) {
				throw new Error(`"${config.protocol}" upstream cannot have keep-alive`);
			}
		} else {
			this.keepalive = config.keepalive || 16;
		}
		this.port = config.port || 80;
	}
	
	private buildRouteIn(servers: UpstreamServers) { // route from outside to xxx
		if (isGatewayServer()) {
			for (let server of this.upstreams) {
				servers[server] = {port: this.port, weight: 50};
			}
		}
	}
	
	private buildRouteOut(servers: UpstreamServers) { // route from outside to xxx
		if (isGatewayServer()) {
			for (let server of this.upstreams) {
				servers[server] = {port: this.port, weight: 50};
			}
		} else {
			for (let server of this.gateways) {
				servers[server] = {port: this.port, weight: 10};
			}
		}
	}
	
	private buildNotExists(servers: UpstreamServers) {
		servers['127.0.0.1'] = {port: 18281, weight: 1};
	}
	
	protected *buildConfigFile(status) {
		const direction = status.direction;
		const route: UpstreamServers = {}; // route from inside to outside
		if (status.localRunning) {
			route[status.dockerHost] = {port: this.port, weight: 100};
		}
		
		if (direction === RouteDirection.IN) {
			this.buildRouteIn(route);
		} else {
			this.buildRouteOut(route);
		}
		
		if (Object.keys(route).length === 0) {
			this.buildNotExists(route);
		}
		
		// const n = this.isStream? `${this.service.serviceName}-` : '';
		const p = this.port === 80? '' : `-${this.port}`;
		const name: string = this.getName(direction);
		
		yield new UpstreamConfig({
			name: name,
			servers: route,
			id: directionName(direction) + p,
			protocol: this.config.protocol,
			keepalive: this.keepalive,
			hashKey: '',
		});
	}
	
	getName(direction: RouteDirection) {
		const dirName = directionName(direction);
		return `upstream_${this.service.serviceName}_${dirName}_${this.port}`;
	}
}

