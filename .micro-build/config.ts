import {MicroBuildConfig, EPlugins} from "./x/microbuild-config";
declare const build: MicroBuildConfig;
/*
 +==================================+
 | <**DON'T EDIT ABOVE THIS LINE**> |
 | THIS IS A PLAIN JAVASCRIPT FILE  |
 |   NOT A TYPESCRIPT OR ES6 FILE   |
 |    ES6 FEATURES NOT AVAILABLE    |
 +==================================+
 */

const projectName = 'nginx-config-generator';

build.baseImage('node');
build.projectName(projectName);
build.domainName(`${projectName}.${JsonEnv.baseDomainName}`);

build.isInChina(JsonEnv.gfw.isInChina);
build.npmInstallSource(JsonEnv.gfw.npmRegistry.upstream);
build.install('./package.json');

build.startupCommand('dist/boot.js');
build.shellCommand('/usr/local/bin/node');
// build.stopCommand('stop.sh');

build.addPlugin(EPlugins.typescript, {
	source: 'src',
	target: 'dist',
});

build.environmentVariableAppend('DEBUG', 'ncg:*,config:*', null, ',');

build.volume('/etc', './host-etc');
build.volume('/var/run', './host-var-run');

// build.prependDockerFile('/path/to/docker/file');
// build.appendDockerFile('/path/to/docker/file');
if (JsonEnv.isDebug) {
	build.dependService('nginx', 'http://github.com/GongT/nginx-docker.git');
} else {
	build.dependIsolate('nginx');
}
// can't depend on this:  build.dependService('npm-registry', 'http://github.com/GongT/npm-registry.git');
build.dockerRunArgument(`--volumes-from=nginx`, "--dns=${HOST_LOOP_IP}");

process.env.DEBUG += ',config:*';
try {
	require(require('path').resolve(__dirname, '../who_am_i/index'));
} catch (e) {
	console.error(e);
	process.exit(1);
}
