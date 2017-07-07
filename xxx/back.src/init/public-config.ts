import {writeConfigFile} from "../lib/files";
import {createPublicServerSection} from "./public-server-sections";

export function init() {
	writeConfigFile('cache', `###   GENERATED FILE ; DO NOT MODIFY   ###
add_header             Cache-Control "public";
more_set_headers       "X-Cached: $upstream_cache_status";

proxy_cache_bypass     $http_cache_control;
proxy_cache_bypass     $arg_nocache;

proxy_cache_use_stale  error timeout invalid_header updating
					   http_404 http_500 http_502 http_503 http_504;

access_log /dev/stdout cache;
expires                6h;
`);
	writeConfigFile('public-body', createPublicServerSection());
}
