import {FileWrite, Template} from "./base";
import {LocationTemplate} from "./location-template";
import {UpstreamTemplate} from "./upstream-template";

export class HttpTemplate extends Template {
	public readonly locations: LocationTemplate[];
	public readonly upstream: UpstreamTemplate;
	
	location(location: LocationTemplate) {
		// const exists = this.locations.find(i => i.location === location.location);
		// if (exists) {
		// 	throw new Error('duplicate location: ' + location);
		// } else {
		// 	this.locations.push(location);
		// }
	}
	
	protected *writeFile(): IterableIterator<FileWrite> {
		yield new FileWrite('generated.d/test.conf', 'test');
	}
}
