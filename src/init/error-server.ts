import {writeFileAbs} from "../lib/files";
import {LOADER_PATH} from "../boot";

export function init() {
	writeFileAbs({}, LOADER_PATH, `
server {
	listen 8888 default_server;
	server_name _;
	
	root /etc/nginx/html;
	
	location / {
		return 500 /noupstream.html;
	}
}

include generated.d/*.conf;
`);
}
