import {createLogger} from "@gongt/ts-stl-library/log/debug";
import {LOG_LEVEL} from "@gongt/ts-stl-library/log/levels";
import {docker} from "./docker";
import {docker_exec} from "./docker-exec";

const debug_normal = createLogger(LOG_LEVEL.INFO, 'handle');
const debug_notice = createLogger(LOG_LEVEL.NOTICE, 'handle');
const debug_nginx_error = createLogger(LOG_LEVEL.ERROR, 'nginx');

const NGINX_DOCKER_NAME = 'nginx';

function timeout(ms: number): Promise<void> {
	return <any>new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve();
		}, ms);
	});
}

export async function reloadNginxConfig() {
	debug_normal('wait 3s to restart nginx...');
	await timeout(3000);
	
	debug_normal('try to restart nginx...');
	
	let ret = await docker_exec(docker, NGINX_DOCKER_NAME, ['nginx', '-t']).catch(logThrow);
	if (ret[0] !== 0) {
		debug_nginx_error('>>> nginx config has error.');
		throw new Error('nginx config error');
	}
	
	debug_normal('>>> nginx config test success.');
	
	if (!process.env.RUN_IN_DOCKER) {
		debug_notice('  not run in docker, not really restart nginx');
		return;
	}
	
	ret = await docker_exec(docker, NGINX_DOCKER_NAME, ['nginx', '-s', 'reload']).catch(logThrow);
	
	if (ret[0] === 0) {
		debug_normal('>>> nginx reload success.');
	} else {
		debug_nginx_error('>>> nginx reload failed.');
		throw new Error('nginx reload error');
	}
}

function logThrow(e: Error) {
	debug_nginx_error('Docker Exec failed: ', e);
	throw e;
}
