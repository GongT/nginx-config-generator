import {IServiceConfig} from "../../handler";
export function createUpstream(service: IServiceConfig) {
	return `### createUpstream
upstream ${service.serviceName}_services {
	server ${service.serviceName} weight=100 fail_timeout=1s; # <- self
	${service.machines.map((server) => {
		return `    server ${server} weight=10 fail_timeout=5s`
	})}
}
`;
}
