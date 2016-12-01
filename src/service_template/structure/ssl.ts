export function createSSL(arg){
	const {service, configMainBody, configFileServer} = arg;
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