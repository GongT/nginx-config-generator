import {IServiceConfig} from "../../handler";
import {whoAmI} from "../../../who_am_i/index";
export function createUpstream(service: IServiceConfig) {
	const externals = service.machines.map((server) => {
		return server !== whoAmI.id;
	});
	let selfLine = '# no self';
	if (service.existsCurrentServer) {
		selfLine = `server ${service.serviceName} weight=100 fail_timeout=1s; # <- self`;
	} else if (externals.length === 0 && !service.existsCurrentServer) {
		selfLine = `server upstream:8888 weight=100 fail_timeout=1s; # TRIGGER ERROR`;
	}
	
	return `### createUpstream
	
upstream ${getUpstreamName(service)} {
	${selfLine}
${service.machines.map((server) => {
		if (server === whoAmI.id && !service.existsCurrentServer) {
			return '';
		}
		return `    server ${server} weight=10 fail_timeout=5s;`;
	}).join('\n')}
}
`;
}

export function getUpstreamName(service: IServiceConfig) {
	return `${service.serviceName}_service_upstream`;
}
