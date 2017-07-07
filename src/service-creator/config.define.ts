import {Template} from "./template/base";

export enum RouteDirection {
	IN,
	OUT,
}

export interface IServiceConfig {
	outerDomainName: string;
	SSLPath: string;
	SSLJump: boolean;
	wantServiceToRun: boolean;
	isGateway: boolean;
	serviceName: string;
	outerSubDomainName: string;
	SSL: boolean|'force';
	machines: string[];
	interfaceMachine: string[];
	alias: string[],
	extraBodyString: string;
	locations: {[path: string]: ILocationConfigBase};
	servers: {[port: string]: IStreamServerConfig};
}
export interface ILocationConfigBase {
	location: string;
	type: string;
}
export interface IStreamServerConfig {
	port: number;
	outPort: number;
}

export interface IServiceStatus {
	route: {
		up: string[];
		down: string[];
		upName: string;
		downName: string;
	};
	SSLExists: boolean;
	nameAlias: string[];
	dockerHost: string;
	localRunning: boolean;
}

export interface Builder {
	buildTemplate(status: IServiceStatus): Template;
}
