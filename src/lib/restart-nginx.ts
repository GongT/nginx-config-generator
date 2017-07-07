import {createLogger, LEVEL} from "@gongt/ts-stl-server/debug";
import {docker} from "./docker";
import {docker_exec} from "./docker-exec";

const debug_normal = createLogger(LEVEL.INFO, 'handle');
const debug_notice = createLogger(LEVEL.NOTICE, 'handle');
const debug_nginx_error = createLogger(LEVEL.ERROR, 'nginx');

export async function reloadNginxConfig() {
	debug_normal('try to restart nginx...');
	
	let ret = await docker_exec(docker, 'nginx', ['nginx', '-t']).catch(logThrow);
	if (ret[0] !== 0) {
		debug_nginx_error('>>> nginx config has error.');
		throw new Error('nginx config error');
	}
	
	debug_normal('>>> nginx config test success.');
	
	if (!process.env.RUN_IN_DOCKER) {
		debug_notice('  not run in docker, not really restart nginx');
		return;
	}
	
	ret = await docker_exec(docker, 'nginx', ['nginx', '-s', 'reload']).catch(logThrow);
	
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
