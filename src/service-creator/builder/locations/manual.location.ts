import {RouteDirection} from "../../config.define";
import {AccessLog} from "../../global.http";
import {LocationConfigFile} from "../../template/location-configfile";
import {IManualLocationConfig, ManualLocationConfigFile} from "../../template/manual-configfile";
import {ProxyConfigFile} from "../../template/proxy-configfile";
import {LocationBuilder} from "../location-builder";

const isDocker = !!process.env.RUN_IN_DOCKER;

export class ManualLocation extends LocationBuilder<IManualLocationConfig> {
	private direction: RouteDirection;
	
	protected init(config) {
		const {direction} = this.config;
		if (direction) {
			if (direction === 'IN' || direction === 'OUT') {
				this.direction = RouteDirection[direction];
			} else {
				throw new Error('wrong direction type: ' + direction);
			}
		} else {
			this.direction = null;
		}
		this.createUpstream();
		this.include(LocationConfigFile, ManualLocationConfigFile);
		this.include(LocationConfigFile, ProxyConfigFile);
	}
	
	protected * buildLocationFile(status, location) {
		if (this.direction !== null && status.direction !== this.direction) {
			return;
		}
		
		yield new ProxyConfigFile({
			id: this.id,
			upstream: {
				url: `http://${this.upstream.getName(status.direction)}`,
				stream: false,
			},
		});
		
		yield new ManualLocationConfigFile({
			id: this.id,
			content: this.config.content,
		});
		
		yield new LocationConfigFile({
			id: this.id,
			location: location.location,
			log: {
				access: AccessLog.tiny,
				error: 'warn',
			},
		});
	}
}
