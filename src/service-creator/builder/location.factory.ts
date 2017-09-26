import {ILocationConfig, IServiceConfig} from "../config.define";
import {ILocationRenderConfig, LocationBuilder} from "./location-builder";
import {BlindLocation} from "./locations/blind.location";
import {ManualLocation} from "./locations/manual.location";
import {RootLocation} from "./locations/root.location";
import {StaticLocation} from "./locations/static.location";
import {WebsocketLocation} from "./locations/websocket.location";
import {WellknownLocation} from "./locations/wellknown.location";

function id(id: number) {
	if (id < 10) {
		return '0' + id.toString();
	} else {
		return id.toString();
	}
}

const $guid: any = {};

function guid(name) {
	if (!$guid[name]) {
		$guid[name] = 0;
	}
	return id($guid[name]++);
}

export function createLocationRender(pushTo: LocationBuilder<any>[],
                                     location: ILocationConfig,
                                     service: IServiceConfig) {
	let exLoc: ILocationConfig&ILocationRenderConfig;
	if (location.name) {
		exLoc = Object.assign({
			id: location.name,
		}, location);
	} else {
		exLoc = Object.assign({
			id: location.type + '.' + guid(location.type + '.' + service.serviceName),
		}, location);
	}
	pushTo.push(factory({service}, exLoc));
}

function factory({service}, location: ILocationConfig&ILocationRenderConfig) {
	try {
		const {type} = location;
		if (!type) {
			throw new TypeError(`no option \`type'`);
		}
		switch (type) {
		case 'static':
			return new StaticLocation({service}, <any>location);
		case 'blind':
			return new BlindLocation({service}, <any>location);
		case 'websocks':
			return new WebsocketLocation({service}, <any>location);
		case 'well-known':
			return new WellknownLocation({service}, <any>location);
		case 'root':
			return new RootLocation({service}, <any>location);
		case 'manual':
			return new ManualLocation({service}, <any>location);
		}
		throw new TypeError('invalid type: ' + type);
	} catch (e) {
		e.message += ` in service "${service.serviceName}" location "${location.location}"`;
		throw e;
	}
}
