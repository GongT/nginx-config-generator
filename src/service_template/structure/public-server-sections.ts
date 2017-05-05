import {whoAmI} from "../../config";

export function escapeRegExp(str) {
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

export function createPublicServerSection() {
	return [].concat(
		createPreventLoop(),
		createProxySettings(),
	).join('\n');
}

export function createProxySettings(){
    return `
proxy_connect_timeout 1s;
proxy_http_version 1.1;
# health_check;
proxy_buffer_size 128k;
proxy_buffers 32 32k;
proxy_busy_buffers_size 128k;
`;
}
export function createPreventLoop() {
	return `
add_header X-Proxy-Path "$http_x_proxy_path->${whoAmI.id}" always;
if ( $http_x_proxy_path ~ /->${escapeRegExp(whoAmI.id)}($|->)/ ) {
	# 508 Loop Detected (WebDAV)
	return 508 $http_x_proxy_path;
}
proxy_set_header X-Proxy-Path "$http_x_proxy_path->${whoAmI.id}";
proxy_set_header X-Proxy-Request-Id $request_id;
`;
}
