import {readFile, access} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {projectRoot, defaultPort, startPreview} from './ai-preview-server.mjs';

const args = process.argv.slice(2);
if (args.length > 1 || args[0] && !/^\d+$/.test(args[0])) {
  console.error('Usage: npm run dev -- [port]');
  process.exit(1);
}
const port = Number(args[0] || process.env.PORT || defaultPort);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('Port must be an integer between 1 and 65535');
  process.exit(1);
}
async function exists(relative) { try { await access(path.join(projectRoot, relative)); return true; } catch { return false; } }
try {
  const realInputs = await Promise.all(['data/ai-apps.json', 'data/llm-models.json'].map(exists));
  const demo = !realInputs.every(Boolean);
  console.log(demo ? 'Development preview: available real catalogs are used; missing board catalogs remain clearly marked fixtures.' : 'Building preview from real AI catalogs.');
  const build = spawnSync(process.execPath, [path.join(projectRoot, 'scripts/ai-build.mjs')].concat(demo ? ['--demo'] : []), {cwd:projectRoot, stdio:'inherit'});
  if (build.error) throw build.error;
  if (build.status !== 0) throw Error('Preview build failed. See the build error above.');
  // Require the built application identity before opening a local listener.
  for (const platform of ['toy', 'xhs']) {
    const config = await readFile(path.join(projectRoot, 'dist', platform, 'config.js'), 'utf8');
    if (!config.includes('"applicationId":"ai-tier-list"')) throw Error('Wrong preview application identity');
  }
  const result = await startPreview({port});
  console.log((result.reused ? 'Reusing existing preview: ' : 'Preview ready: ') + result.url);
  console.log('XHS preview: ' + result.url + 'xhs');
  if (result.server) {
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => result.server.close(() => process.exit(0)));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
