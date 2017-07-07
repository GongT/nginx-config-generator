import {Builder, IServiceConfig, IServiceStatus} from "../config.define";
import {LocationTemplate} from "../template/location-template";

export interface ILocationRenderConfig {
	location: string;
	type: string;
}
export abstract class LocationBuilder implements Builder {
	readonly type: string;
	readonly location: string;
	
	constructor(protected config: IServiceConfig, protected locationDefine: ILocationRenderConfig) {
		this.type = locationDefine.type;
		this.location = locationDefine.location;
	}
	
	abstract buildTemplate(status: IServiceStatus): LocationTemplate;
}
