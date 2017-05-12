import {existsSync, mkdirSync} from "fs";
import {dirname} from "path";
import {EXTRA_CONFIG_SAVE_FOLDER, LOADER_PATH, SERVER_SAVE_FOLDER, SERVICE_SAVE_FOLDER} from "../boot";

export function init() {
	if (!existsSync(SERVICE_SAVE_FOLDER)) {
		mkdirSync(SERVICE_SAVE_FOLDER);
	}
	if (!existsSync(EXTRA_CONFIG_SAVE_FOLDER)) {
		mkdirSync(EXTRA_CONFIG_SAVE_FOLDER);
	}
	if (!existsSync(SERVER_SAVE_FOLDER)) {
		mkdirSync(SERVER_SAVE_FOLDER);
	}
	if (!existsSync(dirname(LOADER_PATH))) {
		mkdirSync(dirname(LOADER_PATH));
	}
}
