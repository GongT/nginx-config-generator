import {writeFileSync} from "fs";
import {ensureDirSync, pathExistsSync} from "fs-extra";
import {ILocationConfig, RouteDirection} from "../../config.define";
import {AccessLog} from "../../global.http";
import {LocationConfigFile} from "../../template/location-configfile";
import {LocationBuilder} from "../location-builder";

export interface IWellknownLocationConfig extends ILocationConfig {
}

export class WellknownLocationConfigFile extends LocationConfigFile {
}

const isDocker = !!process.env.RUN_IN_DOCKER;

export class WellknownLocation extends LocationBuilder<IWellknownLocationConfig> {
	protected *buildLocationFile(status) {
		if (status.direction === RouteDirection.OUT) {
			return;
		}
		
		const root = `/data/certbot-root/${this.service.serviceName}/`;
		
		if (isDocker) {
			ensureDirSync(root);
			if (!pathExistsSync(root + 'index.html')) {
				//language=TEXT
				writeFileSync(root + 'index.html', `<h1>SSL request folder for service ${this.service.serviceName}</h1>`, {encoding: 'utf8'});
			}
		}
		
		yield new WellknownLocationConfigFile({
			location: '/.well-known/',
			id: 'well-known',
			alias: root,
			log: {
				access: AccessLog.main,
				error: 'warn',
			},
		});
	}
}
