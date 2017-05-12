import {existsSync, writeFileSync} from "fs";
import {resolve} from "path";
import {sync as mkdirpSync} from "mkdirp";
import {IServiceConfig} from "../../handler";

const certbotEnabled = existsSync('/data/certbot-root/');

export function createSSL(service: IServiceConfig) {
	if (certbotEnabled) {
		const exampleFolder = resolve('/data/certbot-root/', service.serverName, '.well-known');
		if (!existsSync(exampleFolder)) {
			mkdirpSync(exampleFolder);
		}
		writeFileSync(resolve(exampleFolder, 'index.html'), `<!DOCTYPE html>
<html>
<head><title>Example page</title></head>
<body>
<h1>This path is for certbot ssl request.</h1>
</body>
</html>`);
	}
	
	return `
## createSSL
listen 443 ssl http2;
listen [::]:443 ssl http2;
### location.ssl
ssl_certificate /data/letsencrypt/live/${service.outerDomainName}/fullchain.pem;
ssl_certificate_key /data/letsencrypt/live/${service.outerDomainName}/privkey.pem;
ssl_trusted_certificate /data/letsencrypt/live/${service.outerDomainName}/chain.pem;
ssl_stapling on;
ssl_stapling_verify on;
ssl_session_cache shared:SSL:1m;
ssl_session_timeout 1440m;
ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
ssl_prefer_server_ciphers on;
# Using list of ciphers from "Bulletproof SSL and TLS"
ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256 ECDHE-ECDSA-AES256-GCM-SHA384 ECDHE-ECDSA-AES128-SHA ECDHE-ECDSA-AES256-SHA ECDHE-ECDSA-AES128-SHA256 ECDHE-ECDSA-AES256-SHA384 ECDHE-RSA-AES128-GCM-SHA256 ECDHE-RSA-AES256-GCM-SHA384 ECDHE-RSA-AES128-SHA ECDHE-RSA-AES128-SHA256 ECDHE-RSA-AES256-SHA384 DHE-RSA-AES128-GCM-SHA256 DHE-RSA-AES256-GCM-SHA384 DHE-RSA-AES128-SHA DHE-RSA-AES256-SHA DHE-RSA-AES128-SHA256 DHE-RSA-AES256-SHA256 EDH-RSA-DES-CBC3-SHA";
## createSSL END
`
}
