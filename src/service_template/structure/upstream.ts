import {IServiceConfig} from "../../handler";
import {serverMap, whoAmI} from "../../config";
import {debugFn, isGateway} from "../template-render";

const isMe = serverName => serverName === whoAmI.id;
const isNotMe = serverName => serverName !== whoAmI.id;
const getServer = serverName => {
	const server = serverMap[serverName];
	if (!server) {
		throw new Error(`failed: ${serverName}, no this server: ${serverName}`);
	}
	return server;
};
const sameNetwork = serverName => {
	const server = getServer(serverName);
	return server.network === whoAmI.network;
};

class upstreamCreator {
	private readonly upName: string;
	private ret: string[];
	private readonly isGateway: boolean;
	private readonly connectPort: number;
	private readonly appPort: number;
	private readonly wantServiceToRun: boolean;
	private readonly serviceDockerRunning: boolean;
	
	constructor(private service: IServiceConfig,
		private direction: 'up'|'down',
		private overwritePort: number = 80) {
		this.serviceDockerRunning = !!service.existsCurrentServer;
		this.wantServiceToRun = service.machines.some(isMe);
		this.isGateway = isGateway(this.service);
		this.connectPort = this.appPort = parseInt('' + overwritePort);
		if (direction === 'down') {
			this.upName = getUpstreamNameDown(this.service, this.overwritePort)
		} else {
			this.connectPort++;
			this.upName = getUpstreamNameUp(this.service, this.overwritePort)
		}
	}
	
	create() {
		this.ret = [
			`### createUpstream: `,
			`#       serviceDockerRunning=${this.serviceDockerRunning}`,
			`#       wantServiceToRun=${this.wantServiceToRun}`,
			`#       direction=${this.direction}`,
			`upstream ${this.upName} {`
		];
		debugFn(`create upstream:${this.direction} for ${this.service.serverName}:${this.appPort} `);
		
		if (this.serviceDockerRunning) {
			this.pushSelf();
			const length = this.pushAllLocal(!this.isGateway);
			if (0 === length) {
				this.pushFail(true);
			}
		} else if (this.wantServiceToRun) {
			if (this.direction === 'down') {
				this.pushFail(false);
			} else {
				const length = this.pushGateway();
				if (0 === length) {
					this.pushFail(false); // myself is both: gateway & only upstream
				} else {
					this.pushFail(true);
				}
			}
		} else {
			if (this.direction === 'down') {
				const length = this.pushAllLocal(false);
				this.pushFail(length !== 0);
			} else {
				this.pushAllLocal(false);
				this.pushFail(true);
			}
		}
		
		this.ret.push('}');
		
		return this.ret.join('\n');
	}
	
	private pushSelf() {
		debugFn(`  self: docker - ${this.service.existsCurrentServer}`);
		this.ret.push(`\t# self: docker - ${this.service.existsCurrentServer}`);
		this.ret.push(`\tserver ${this.service.existsCurrentServer}:${this.appPort} weight=200 fail_timeout=5s; # server in docker`);
	}
	
	private pushAllLocal(backup: boolean) {
		this.ret.push(`\t# pushAllLocal();`);
		const d = this.service.machines.filter(isNotMe);
		d.forEach((serverName) => this.pushLocal(serverName, backup));
		return d.length;
	}
	
	private pushLocal(serverName, backup: boolean) {
		const server = getServer(serverName);
		debugFn(`  local network: ${server.internal}`);
		this.ret.push(`\t# local network: ${server.internal}`);
		this.ret.push(`\tserver ${server.internal}:${this.appPort} weight=100 ${backup? 'backup' : ''} fail_timeout=${backup? 30 : 10}s; # local network`)
	};
	
	private pushFail(backup: boolean = true) {
		debugFn(`  add failed upstream`);
		this.ret.push(`\t# failed upstream`);
		this.ret.push(`\tserver 127.0.0.1:18281 ${backup? 'backup' : ''} fail_timeout=1s; # TRIGGER ERROR`);
	}
	
	private pushGateway(backup: boolean = false) {
		this.ret.push(`\t# pushGateway();`);
		const d = this.service.interfaceMachine.filter(isNotMe).filter(sameNetwork);
		d.forEach((serverName) => {
			const server = getServer(serverName);
			debugFn(`  gateway upstream: ${server.internal}`);
			this.ret.push(`\t# gateway upstream: ${server.internal}`);
			this.ret.push(`\tserver ${server.internal}:${this.appPort} weight=100 ${backup? 'backup' : ''} fail_timeout=${backup? 30 : 10}s; # local network`)
		});
		return d.length;
	};
}
export function createUpstreamAll(service: IServiceConfig) {
	return (
		createUpstreamUp(service) +
		'\n\n' +
		createUpstreamDown(service)
	).trim();
}

export function createUpstreamUp(service: IServiceConfig, overwritePort?: number) {
	const builder = new upstreamCreator(service, 'up', overwritePort);
	return builder.create();
}

export function createUpstreamDown(service: IServiceConfig, overwritePort?: number) {
	const builder = new upstreamCreator(service, 'down', overwritePort);
	return builder.create();
}

export function getUpstreamNameDown(service: IServiceConfig, overwritePort: number = 80) {
	return `${service.serverName}_service_upstream_down${overwritePort? '_' + overwritePort : ''}`;
}
export function getUpstreamNameUp(service: IServiceConfig, overwritePort: number = 80) {
	return `${service.serverName}_service_upstream_up${overwritePort? '_' + overwritePort : ''}`;
}
