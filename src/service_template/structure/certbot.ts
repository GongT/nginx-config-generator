export function createCertBotPass(arg) {
	const {service, configMainBody, configFileServer} = arg;
	
	return `###createCertBot
location /.well-known {
	root /data/certbot/${service.outerDomainName}/;
	autoindex on;
}
`;
}
