import {writeConfigFile} from "../lib/files";
import {createPublicServerSection} from "./public-server-sections";

export function init() {
	writeConfigFile('server-body', `###   GENERATED FILE ; DO NOT MODIFY   ###
proxy_http_version     1.1;
proxy_next_upstream error timeout invalid_header non_idempotent http_503 http_500 http_502;
proxy_next_upstream_tries 3;
`);
	writeConfigFile('cache', `###   GENERATED FILE ; DO NOT MODIFY   ###
add_header             Cache-Control "public";
add_header             X-Cached $upstream_cache_status always;

proxy_cache_bypass     $http_cache_control;
proxy_cache_bypass     $arg_nocache;

proxy_cache_use_stale  error timeout invalid_header updating
					   http_404 http_500 http_502 http_503 http_504;

access_log /dev/stdout cache;
expires                6h;
`);
	writeConfigFile('puiblic-body', createPublicServerSection());
}
