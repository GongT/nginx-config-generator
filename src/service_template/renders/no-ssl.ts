import {IServiceConfig} from "../../handler";
export function withoutSSL(service: IServiceConfig) {
	return `
listen 80;
listen [::]:80;
`
}
