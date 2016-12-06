import {IServiceConfig} from "../../handler";
import {whoAmI} from "../../../who_am_i/index";
export function createUpstream(service: IServiceConfig) {
	return `### createUpstream
upstream ${getUpstreamName(service)} {
	server ${service.serviceName} weight=100 fail_timeout=1s; # <- self
${service.machines.map((server) => {
		if (server === whoAmI.id) {
			server = 'upstream:8888';
		}
		return `    server ${server} weight=10 fail_timeout=5s;`;
	}).join('\n')}
}
`;
}

export function getUpstreamName(service: IServiceConfig) {
	return `${service.serviceName}_service_upstream`;
}
