export enum RouteDirection {
	NULL = -1,
	IN = 0,
	OUT = 1,
}

export function directionName(d: RouteDirection) {
	return RouteDirection[d].toLowerCase();
}

export interface IServiceConfig {
	outerDomainName: string;
	SSLPath: string;
	SSLJump: boolean;
	wantServiceToRun: boolean;
	isGateway: boolean;
	serviceName: string;
	outerSubDomainName: string;
	SSL: boolean|'force'|'self';
	machines: string[];
	interfaceMachine: string[];
	alias: string[],
	extraBodyString: string;
	locations: {[path: string]: ILocationConfig};
	servers: {[port: string]: IStreamServerConfig};
}
export interface ILocationConfig {
	location: string;
	type: string;
	name?: string;
}
export interface IStreamServerConfig {
	protocol?: string;
	port: number;
	name: string;
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
export interface IExtraStatus {
	direction: RouteDirection
}
export interface PassingData {
	readonly direction: RouteDirection;
	readonly serviceName: string;
}
