import {ILocationConfig, RouteDirection} from "../../config.define";
import {AccessLog} from "../../global.http";
import {LocationConfigFile} from "../../template/location-configfile";
import {LocationBuilder} from "../location-builder";

export interface IWellknownLocationConfig extends ILocationConfig {
}

export class WellknownLocationConfigFile extends LocationConfigFile {
}

export class WellknownLocation extends LocationBuilder<IWellknownLocationConfig> {
	protected *buildLocationFile(status) {
		if (status.direction === RouteDirection.OUT) {
			return;
		}
		yield new WellknownLocationConfigFile({
			location: '/.well-known',
			id: 'well-known',
			log: {
				access: AccessLog.main,
				error: 'warn',
			},
		});
	}
}
