import {createLogger, LEVEL} from "@gongt/ts-stl-server/debug";
import {readFileSync, utimesSync, writeFileSync} from "fs";
import {resolve} from "path";

const debug = createLogger(LEVEL.INFO, 'file');
const notice = createLogger(LEVEL.NOTICE, 'file');
const silly = createLogger(LEVEL.SILLY, 'file');

export class FileTracker {
	protected knownFiles: string [] = [];
	
	writeFile(absPath: string, content: string) {
		debug('write file: ', absPath);
		if (this.isKnown(absPath)) {
			throw new Error('overwrite a single file twice in same transaction: ' + absPath);
		}
		absPath = resolve(absPath);
		this.knownFiles.push(absPath);
		
		if (readFileSync(absPath, 'utf8') === content) {
			silly('not write - same content');
			return;
		}
		writeFileSync(absPath, content, {encoding: 'utf8'});
	}
	
	touchFile(absPath) {
		silly('touch file: ', absPath);
		if (this.isKnown(absPath)) {
			return;
		}
		utimesSync(absPath, new Date, new Date);
		this.knownFiles.push(absPath);
	}
	
	hasSomeChange() {
		return this.knownFiles.length > 0;
	}
	
	know(absPath: string) {
		silly('know file: ', absPath);
		if (!this.isKnown(absPath)) {
			this.knownFiles.push(absPath);
		}
	}
	
	isKnown(absPath: string) {
		return this.knownFiles.indexOf(absPath) !== -1;
	}
}
