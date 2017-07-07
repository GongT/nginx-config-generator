import {FileWrite, Template} from "./base";

export interface IUpstreamTemplateVar {
}

export class UpstreamTemplate extends Template {
	constructor(name: string, data: IUpstreamTemplateVar) {
		super();
	}
	
	protected *writeFile(): IterableIterator<FileWrite> {
	}
	
}
