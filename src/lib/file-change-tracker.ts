import {createLogger} from "@gongt/ts-stl-library/log/debug";
import {LOG_LEVEL} from "@gongt/ts-stl-library/log/levels";
import {createHash} from "crypto";
import {readFileSync, writeFileSync} from "fs";
import {ensureDirSync, pathExistsSync} from "fs-extra";
import {dirname, resolve} from "path";
import {CONFIGFILE_PATH, debugPath} from "../init/folders";

const info = createLogger(LOG_LEVEL.INFO, 'file');
const debug = createLogger(LOG_LEVEL.DEBUG, 'file');
const notice = createLogger(LOG_LEVEL.NOTICE, 'file');
const silly = createLogger(LOG_LEVEL.SILLY, 'file');
const warn = createLogger(LOG_LEVEL.WARN, 'file');

function md5(content: string) {
	return createHash('md5').update(content).digest('hex');
}

export class FileTracker {
	protected knownFiles: string [] = [];
	protected change = false;
	protected contentCompare: any = {};
	
	writeFile(absPath: string, content: string) {
		const hash = md5(content);
		const fileDebug = debugPath(absPath);
		if (this.isKnown(absPath)) {
			if (!this.contentCompare[absPath]) {
				this.contentCompare[absPath] = md5(readFileSync(absPath, {encoding: 'utf8'}));
			}
			if (this.contentCompare[absPath] === hash) {
				silly('%s - not write - same content write twice', fileDebug);
			} else {
				warn('=file1(new)====================\n%s\n==========================', content);
				warn('=file2(old)====================\n%s\n==========================', readFileSync(absPath, {encoding: 'utf8'}));
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
				silly('%s - not write - same content', fileDebug);
				return;
			}
			
			this.contentCompare[absPath] = hash;
			
			info('write file: %s = %s', fileDebug, hash);
			ensureDirSync(dirname(absPath));
			writeFileSync(absPath, content, {encoding: 'utf8'});
			this.change = true;
		}
	}
	
	hasSomeChange() {
		return this.change;
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
