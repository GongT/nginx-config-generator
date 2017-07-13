import {ILocationConfig} from "../../config.define";
import {AccessLog} from "../../global.http";
import {LocationConfigFile} from "../../template/location-configfile";
import {LocationBuilder} from "../location-builder";

export interface IBlindLocationConfig extends ILocationConfig {
}

export class BlindLocation extends LocationBuilder<IBlindLocationConfig> {
	protected *buildLocationFile(status, location): any {
		
		yield new LocationConfigFile({
			location: location.location,
			id: this.id,
			log: {
				access: AccessLog.tiny,
				error: 'warn',
			},
			content: `# blind
add_header             Cache-Control "public";
expires                24h;return 404;`,
		});
	}
}
