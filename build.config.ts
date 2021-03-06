/// <reference path="./.jsonenv/_current_result.json.d.ts"/>
import {JsonEnv} from "@gongt/jenv-data";
import {EPlugins, MicroBuildConfig} from "./.micro-build/x/microbuild-config";
import {MicroBuildHelper} from "./.micro-build/x/microbuild-helper";
declare const build: MicroBuildConfig;
declare const helper: MicroBuildHelper;
/*
 +==================================+
 |  **DON'T EDIT ABOVE THIS LINE**  |
 | THIS IS A PLAIN JAVASCRIPT FILE  |
 |   NOT A TYPESCRIPT OR ES6 FILE   |
 |    ES6 FEATURES NOT AVAILABLE    |
 +==================================+
 */

const projectName = 'nginx-config-generator';

build.baseImage('node', 'alpine');
build.projectName(projectName);
build.domainName(`${projectName}.${JsonEnv.baseDomainName}`);

build.isInChina(JsonEnv.gfw.isInChina);
build.forceLocalDns(false, true);
build.npmInstallSource(JsonEnv.gfw.npmRegistry.upstream);
build.npmInstall('./package.json', ['g++', 'make', 'python']);

build.systemd({
	type: 'notify',
	startTimeout: 20,
//	watchdog: 5,
});
build.startupCommand('dist/boot.js');
build.shellCommand('/usr/local/bin/node');
// build.stopCommand('stop.sh');

build.addPlugin(EPlugins.jenv);
build.addPlugin(EPlugins.typescript, {
	source: 'src',
	target: 'dist',
});

build.environmentVariableAppend('DEBUG', 'ncg:*,start,handle,template,docker', null, ',');

build.volume('/var/run', './host-var-run');

build.dependService('nginx', 'http://github.com/GongT/nginx-docker.git');
build.dependService('hosts-generator', 'http://github.com/GongT/hosts-generator.git');
build.dockerRunArgument(`--volumes-from=nginx`, "--dns=${HOST_LOOP_IP}");

build.onConfig(() => {
	process.env.DEBUG += ',ip:*';
	try {
		const resolve = require('path').resolve;
		const fs = require('fs');
		
		const whoAmI = require(resolve(__dirname, './who_am_i/who_am_i'));
		const serverMap = require(resolve(__dirname, './who_am_i/get_server_ip'));
		
		const config = helper.createTextFile(`
export const whoAmI = ${JSON.stringify(whoAmI, null, 4)};
export const serverMap = ${JSON.stringify(serverMap, null, 4)};
`);
		config.save('./src/config.ts');
	} catch (e) {
		console.error(e);
		process.exit(1);
	}
});
