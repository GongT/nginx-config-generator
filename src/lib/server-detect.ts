import {serverMap, whoAmI} from "../config";
import {IServiceConfig} from "../service-creator/config.define";

export function isMe(serverName: string) {
	return serverName === whoAmI.id;
}
export function isNotMe(serverName: string) {
	return serverName !== whoAmI.id;
}

export function getServerConfig(serverName: string) {
	const server = serverMap[serverName];
	if (!server) {
		throw new Error(`failed: ${serverName}, no this server: ${serverName}`);
	}
	return server;
}

export function inSameNetworkWithMe(serverName: string) {
	const server = getServerConfig(serverName);
	return server.network === whoAmI.network;
}

export function isGatewayServer() {
	return whoAmI['front'];
}

export function isGatewayOfService(service: IServiceConfig) {
	return service.interfaceMachine.indexOf(whoAmI.id) !== -1;
}

export function wantToRun(service: IServiceConfig) {
	return service.machines.some(isMe)
}

export function sameArray(a, b) {
	return a.length === b.length && a.every((item) => {
			return b.indexOf(item) !== -1
		});
}
