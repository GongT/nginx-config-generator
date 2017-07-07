import {IServiceConfig} from "../../handler";

export function createServerName(service: IServiceConfig) {
	return `server_name ${service._alias.join(' ')};`;
}
