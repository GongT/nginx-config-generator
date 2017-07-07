import {resolve} from "path";
import {CONFIGFILE_PATH} from "../../init/folders";
import {FileTracker} from "../../lib/file-change-tracker";

export class FileWrite {
	protected path: string;
	
	constructor(path: string, protected content: string) {
		this.path = resolve(CONFIGFILE_PATH, path);
	}
	
	doneWith(fileTracker: FileTracker) {
		fileTracker.writeFile(this.path, this.content);
	}
}

export abstract class Template {
	private tplList: Template[] = [];
	
	protected subTemplate(tpl: Template) {
	
	}
	
	protected abstract writeFile(): IterableIterator<FileWrite>;
	
	writeFiles(fileTracker: FileTracker) {
		const g = this.writeFile();
		console.log(g);
		
		for (let write of g) {
			write.doneWith(fileTracker);
		}
	}
}
