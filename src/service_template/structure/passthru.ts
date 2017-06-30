import {IServiceConfig} from "../../handler";
import {getUpstreamNameDown, getUpstreamNameUp} from "./upstream";

export function createPassthru(service: IServiceConfig, direction: 'up'|'down') {
	const upstream = direction === 'down'
		? getUpstreamNameDown(service)
		: getUpstreamNameUp(service);
//proxy_set_header Host ${service.outerDomainName};
	return `# createPassthru(${service.outerSubDomainName}, ${direction})

proxy_set_header Connection "";

proxy_pass http://${upstream};
`;
}
