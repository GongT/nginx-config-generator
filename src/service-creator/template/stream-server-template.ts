import {FileWrite, Template} from "./base";
import {UpstreamTemplate} from "./upstream-template";

export class StreamServerTemplate extends Template {
	public readonly upstream: UpstreamTemplate;
	
	protected *writeFile(): IterableIterator<FileWrite> {
	}
}
