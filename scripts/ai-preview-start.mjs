import {mkdir, open, readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {defaultPort, projectRoot, probePreview} from './ai-preview-server.mjs';

const arg = process.argv[2];
const port = Number(arg || defaultPort);
if (process.argv.length > 3 || !Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Usage: npm run preview:start -- [port]');
  process.exit(1);
}
function isOurs(health) {
  return health && health.applicationId === 'ai-tier-list' && path.resolve(health.root) === path.resolve(projectRoot);
}
try {
  let health = await probePreview(port);
  if (!isOurs(health)) {
    const output = path.join(projectRoot, 'output');
    await mkdir(output, {recursive:true});
    const stamp = Date.now();
    const stdoutPath = path.join(output, 'ai-preview-' + stamp + '.stdout.log');
    const stderrPath = path.join(output, 'ai-preview-' + stamp + '.stderr.log');
    const stdout = await open(stdoutPath, 'a'), stderr = await open(stderrPath, 'a');
    let child, exited = false, spawnError = null;
    try {
      child = spawn(process.execPath, [path.join(projectRoot, 'scripts/ai-dev.mjs'), String(port)], {
        cwd:projectRoot, detached:true, windowsHide:true, stdio:['ignore', stdout.fd, stderr.fd]
      });
      child.on('error', error => { spawnError = error; });
      child.on('exit', () => { exited = true; });
      child.unref();
    } finally { await stdout.close(); await stderr.close(); }
    for (let attempt = 0; attempt < 40; attempt++) {
      await delay(250);
      health = await probePreview(port);
      if (isOurs(health)) break;
      if (spawnError || exited) {
        const details = await readFile(stderrPath, 'utf8').catch(() => '');
        throw Error('Preview could not start. ' + (spawnError ? spawnError.message : details) + '\nLog: ' + stderrPath);
      }
    }
    if (!isOurs(health)) throw Error('Preview startup timed out. Check ' + stdoutPath + ' and ' + stderrPath);
  }
  console.log('AI preview: http://127.0.0.1:' + port + '/');
  console.log('XHS preview: http://127.0.0.1:' + port + '/xhs');
  console.log('Running independently in the background. Closing this launcher will not stop it.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
