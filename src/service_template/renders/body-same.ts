export function bodySamePart(names, locationBody: string[], passthru: string) {
	return `
server {
	server_name ${names};
	
	${locationBody.join('\n').replace(/\n/g, '\n\t')}
	
	location / {
		${passthru.replace(/\n/g, '\n\t\t')}
	}
}
`
}
