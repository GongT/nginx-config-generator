import {createLogger, LEVEL} from "@gongt/ts-stl-server/debug";
import {createHash} from "crypto";
import {readFileSync, writeFileSync} from "fs";
import {ensureDirSync, pathExistsSync} from "fs-extra";
import {dirname, resolve} from "path";
import {CONFIGFILE_PATH, debugPath} from "../init/folders";

const info = createLogger(LEVEL.INFO, 'file');
const debug = createLogger(LEVEL.DEBUG, 'file');
const notice = createLogger(LEVEL.NOTICE, 'file');
const silly = createLogger(LEVEL.SILLY, 'file');

function md5(content: string) {
	return createHash('md5').update(content).digest('hex');
}

export class FileTracker {
	protected knownFiles: string [] = [];
	protected contentCompare: any = {};
	
	writeFile(absPath: string, content: string) {
		const hash = md5(content);
		const fileDebug = debugPath(absPath);
		if (this.isKnown(absPath)) {
			if (this.contentCompare[absPath] === hash) {
				silly('%s - not write - same content write twice', fileDebug);
			} else {
				throw new Error('overwrite a single file twice with different content in same transaction: ' + absPath);
			}
		} else {
			absPath = resolve(absPath);
			this.knownFiles.push(absPath);
			
			if (!this.contentCompare.hasOwnProperty(absPath) && pathExistsSync(absPath)) {
				debug('file exists: %s', fileDebug);
				this.contentCompare[absPath] = md5(readFileSync(absPath, 'utf8'));
			}
			
			if (this.contentCompare[absPath] === hash) {
				info('%s - not write - same content', fileDebug);
				return;
			}
			
			this.contentCompare[absPath] = hash;
			
			info('write file: %s = %s', fileDebug, hash);
			ensureDirSync(dirname(absPath));
			writeFileSync(absPath, content, {encoding: 'utf8'});
		}
	}
	
	hasSomeChange() {
		return this.knownFiles.length > 0;
	}
	
	know(absPath: string) {
		silly('know file: ', absPath.replace(CONFIGFILE_PATH, '.'));
		if (!this.isKnown(absPath)) {
			this.knownFiles.push(absPath);
		}
	}
	
	isKnown(absPath: string) {
		return this.knownFiles.indexOf(absPath) !== -1;
	}
}
