import {existsSync, readFileSync, writeFileSync} from "fs";
import {basename, resolve} from "path";
import {createHash} from "crypto";
import {createLogger, LEVEL} from "typescript-common-library/server/debug";
import {EXTRA_CONFIG_SAVE_FOLDER, HTTP_SAVE_FOLDER, SERVER_SAVE_FOLDER, SERVICE_SAVE_FOLDER} from "../boot";

const debug = createLogger(LEVEL.INFO, 'filesystem');

export function writeConfigFile(filename: string, content: string, storage: {[id: string]: boolean} = {}) {
	const configFile = resolve(EXTRA_CONFIG_SAVE_FOLDER, `${filename}.conf`);
	return writeFileAbs(storage, configFile, content);
}
export function writeHtmlFile(filename: string, content: string) {
	const configFile = resolve(HTTP_SAVE_FOLDER, `${filename}.html`);
	return writeFileAbs({}, configFile, content);
}
export function writeGeneratedFile(storage: {[id: string]: boolean}, filename: string, content: string) {
	const configFile = resolve(SERVICE_SAVE_FOLDER, `${filename}.conf`);
	return writeFileAbs(storage, configFile, content);
}
export function writeServerFile(storage: {[id: string]: boolean}, filename: string, content: string) {
	const configFile = resolve(SERVER_SAVE_FOLDER, `${filename}.conf`);
	return writeFileAbs(storage, configFile, content);
}

export function writeFileAbs(storage: {[id: string]: boolean}, filePath: string, content: string) {
	debug('file: %s', basename(filePath));
	debug(`  location: ${filePath}.`);
	
	storage[filePath] = true;
	
	const oldHash = existsSync(filePath)? md5(readFileSync(filePath, 'utf-8')) : '';
	debug(`    old file hash    = ${oldHash}`);
	
	if (oldHash) {
		const newHash = md5(content);
		debug(`    new content hash = ${oldHash}`);
		
		if (oldHash === newHash) {
			debug('  file not changed.');
			debug(`file: ${filePath} -- complete`);
			storage[filePath] = false;
			return;
		} else {
			debug('  file changed.');
		}
	} else {
		debug('  file not exists.');
	}
	
	try {
		writeFileSync(filePath, content, 'utf-8');
		debug('  write complete.');
	} catch (error) {
		debug('  write file error: \n%s', error.trace);
		storage[filePath] = false;
	}
	debug(`file: ${filePath} -- complete`);
}

export function md5(str) {
	return createHash('md5').update(str).digest().toString('hex');
}
