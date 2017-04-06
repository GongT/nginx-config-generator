import {IServiceConfig} from "../../handler";
import {whoAmI, serverMap} from "../../config";
import {debugFn} from "../template-render";
export function createUpstream(service: IServiceConfig) {
	debugFn(`create upstream for ${service.serverName}: `);
	let ret = ['### createUpstream', '', `upstream ${getUpstreamName(service)} {`];
	
	const localPriority = service.existsCurrentServer? 'backup' : '';
	const unique: any = {};
	let anyLocalServer = !!service.existsCurrentServer;
	
	service.machines.forEach((serverName) => {
		if (serverName === whoAmI.id) {
			return; // the current server
		}
		const server = serverMap[serverName];
		if (server.network === whoAmI.network) {
			debugFn(`  local network: ${server.internal}`);
			unique[server.internal] = `server ${server.internal} weight=100 ${localPriority} fail_timeout=1s; # local network`;
			anyLocalServer = anyLocalServer || (localPriority !== 'backup');
		} else {
			const host = server.external || server.interface;
			debugFn(`  remote network: ${host}`);
			if (!unique[host]) {
				unique[host] = `server ${host} weight=1 backup fail_timeout=10s; # internet`;
			}
		}
	});
	
	if (service.existsCurrentServer) {
		debugFn(`  self: docker - ${service.existsCurrentServer}`);
		ret.push(`\tserver ${service.existsCurrentServer} weight=100 fail_timeout=1s; # server in docker`);
		anyLocalServer = true;
	} else if (0 === Object.keys(unique).length) { // if no remote server exists
		debugFn(`  Error: no any server available!`);
		ret.push(`\tserver 127.0.0.1:8888 fail_timeout=1s; # TRIGGER ERROR`);
	}
	
	if (!anyLocalServer) { // all server is internet, so each line have a "backup"
		Object.keys(unique).forEach((index) => {
			unique[index] = unique[index].replace(/ backup /, ' ');
		});
	}
	Object.values(unique).forEach((value) => {
		ret.push(`\t${value}`);
	});
	
	ret.push('}');
	
	return ret.join('\n');
}

export function getUpstreamName(service: IServiceConfig) {
	return `${service.serverName}_service_upstream`;
}
