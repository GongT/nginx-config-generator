import {Builder, IServiceStatus, IStreamServerConfig} from "../config.define";
import {StreamServerTemplate} from "../template/stream-server-template";

export interface IStreamServerOpt {
	servers: {[port: string]: IStreamServerConfig};
}
export class StreamServerBuilder implements Builder {
	constructor(protected config: IStreamServerOpt) {
	
	}
	
	buildTemplate(status: IServiceStatus): StreamServerTemplate {
		return undefined;
	}
}
