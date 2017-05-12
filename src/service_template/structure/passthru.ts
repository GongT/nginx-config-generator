import {getUpstreamNameDown, getUpstreamNameUp} from "./upstream";
import {IServiceConfig} from "../../handler";

export function createPassthru(service: IServiceConfig, direction: 'up'|'down') {
	const upstream = direction === 'down'
		? getUpstreamNameDown(service)
		: getUpstreamNameUp(service);
	
	return `
proxy_set_header Host ${service.outerDomainName};
proxy_pass http://${upstream};
`;
}
