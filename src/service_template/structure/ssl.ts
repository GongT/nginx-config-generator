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
ssl_trusted_certificate /etc/letsencrypt/live/${service.outerDomainName}/chain.pem;
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
