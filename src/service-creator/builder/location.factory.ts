import {IServiceConfig} from "../config.define";
import {ILocationRenderConfig, LocationBuilder} from "./location-builder";
import {BlindLocation} from "./locations/blind.location";
import {StaticLocation} from "./locations/static.location";
import {WebsocketLocation} from "./locations/websocket.location";

export function createLocationRender(location: ILocationRenderConfig, config: IServiceConfig): LocationBuilder {
	try {
		const {type} = location;
		if (!type) {
			throw new TypeError(`no option \`type'`);
		}
		switch (type) {
		case 'static':
			return new StaticLocation(config, location);
		case 'blind':
			return new BlindLocation(config, location);
		case 'websocks':
			return new WebsocketLocation(config, location);
		}
		throw new TypeError('invalid type: ' + type);
	} catch (e) {
		e.message += ` in service "${config.serviceName}" location "${location.location}"`;
		throw e;
	}
}
