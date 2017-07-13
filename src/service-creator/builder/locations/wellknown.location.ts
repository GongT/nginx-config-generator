import {ILocationConfig, IServiceStatus} from "../../config.define";
import {LocationConfigFile} from "../../template/location-configfile";
import {LocationBuilder} from "../location-builder";
import {AccessLog} from "../../global.http";

export interface IWellknownLocationConfig extends ILocationConfig {
}

export class WellknownLocation extends LocationBuilder<IWellknownLocationConfig> {
	protected *buildLocationFile(status: IServiceStatus) {
		yield new LocationConfigFile({
			location: '/.well-known',
			id: 'well-known',
			log: {
				access: AccessLog.main,
				error: 'info',
			},
		});
	}
}
