import {getUpstreamName} from "./upstream";
export function createPassthru(arg) {
	const {service, configMainBody, configFileServer} = arg;
	
	const upstream = getUpstreamName(service);
	
	return `
# prevent request loop - buggy
#if ($is_loop_request) { return 500; }
#proxy_set_header x-is-internal-request YES;

## upstream config
proxy_http_version 1.1;
proxy_set_header Host ${service.outerDomainName};
# health_check;
proxy_buffer_size 128k;
proxy_buffers 32 32k;
proxy_busy_buffers_size 128k;
proxy_next_upstream error timeout invalid_header non_idempotent http_503;

## pass to upstream (define above)
proxy_pass http://${upstream};
`;
}
