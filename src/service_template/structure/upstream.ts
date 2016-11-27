import {IServiceConfig} from "../../handler";
export function createUpstream(service: IServiceConfig) {
	return `### createUpstream
upstream ${service.serviceName}_service_upstream {
	server ${service.serviceName} weight=100 fail_timeout=1s; # <- self
${service.machines.map((server) => {
		return `    server ${server} weight=10 fail_timeout=5s;`;
	}).join('\n')}
}
`;
}

export function getUpstreamName(service: IServiceConfig) {
	if (service.existsCurrentServer) {
		return `${service.serviceName}_service_upstream`;
	} else {
		return 'default-global-upstream'
	}
}
