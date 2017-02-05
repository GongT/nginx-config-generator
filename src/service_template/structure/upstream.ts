import {IServiceConfig} from "../../handler";
import {whoAmI, serverMap} from "../../config";
import {debugFn} from "../template-render";
export function createUpstream(service: IServiceConfig) {
	debugFn('create upstream: ');
	let ret = ['### createUpstream', '', `upstream ${getUpstreamName(service)} {`];
	
	const localPriority = service.existsCurrentServer? 'backup' : '';
	const unique: any = {};
	
	service.machines.forEach((serverName) => {
		if (serverName === whoAmI.id) {
			return false;
		}
		const server = serverMap[serverName];
		if (server.network === whoAmI.network) {
			debugFn(`  local network: ${server.internal}`);
			if (!unique[server.internal]) {
				unique[server.internal] = true;
				ret.push(`\tserver ${server.internal} weight=100 ${localPriority} fail_timeout=1s; # local network`);
			}
		} else {
			const host = server.external || server.interface;
			debugFn(`  remote network: ${host}`);
			if (!unique[host]) {
				unique[host] = true;
				ret.push(`\tserver ${host} weight=1 backup fail_timeout=10s; # internet`);
			}
		}
	});
	
	if (service.existsCurrentServer) {
		debugFn(`  self: docker - ${service.existsCurrentServer}`);
		ret.push(`\tserver ${service.existsCurrentServer} weight=100 fail_timeout=1s; # server in docker`);
	} else if (0 === Object.keys(unique).length) { // if no remote server exists
		debugFn(`  Error: no any server available!`);
		ret.push(`\tserver 127.0.0.1:8888 fail_timeout=1s; # TRIGGER ERROR`);
	}
	
	ret.push('}');
	
	return ret.join('\n');
}

export function getUpstreamName(service: IServiceConfig) {
	return `${service.serverName}_service_upstream`;
}
