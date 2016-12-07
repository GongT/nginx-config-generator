import {existsSync, writeFileSync} from "fs";
import {resolve} from "path";
import {sync as mkdirpSync} from "mkdirp";

const certbotEnabled = existsSync('/data/certbot/');

export function createSSL(arg, missingSafe: boolean) {
	const {service, configMainBody, configFileServer} = arg;
	
	if (certbotEnabled) {
		const exampleFolder = resolve('/data/certbot/', service.serverName, '.well-known');
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
	
	const certFile = resolve('/etc/letsencrypt/live', service.outerDomainName, 'privkey.pem');
	if (!existsSync(certFile)) {
		if (missingSafe) {
			return `
### no ssl cert found...  at: ${certFile}
listen 443;
listen [::]:443;
`;
		} else {
			return `
### no ssl cert found...  at: ${certFile}
`;
		}
	}
	
	return `
## createSSL
listen 443 ssl http2;
listen [::]:443 ssl http2;
### location.ssl
ssl_certificate /etc/letsencrypt/live/${service.outerDomainName}/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/${service.outerDomainName}/privkey.pem;
include /etc/letsencrypt/options-ssl-nginx.conf;
ssl_trusted_certificate /etc/letsencrypt/live/${service.outerDomainName}/chain.pem;
ssl_stapling on;
ssl_stapling_verify on;
## createSSL END
`
}
