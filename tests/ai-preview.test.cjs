const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const {once} = require('node:events');

async function fixture(t, {built = true} = {}) {
  const output = path.resolve(__dirname, '../output');
  await fs.mkdir(output, {recursive:true});
  const root = await fs.mkdtemp(path.join(output, 'ai-preview-test-'));
  t.after(async () => {
    assert.ok(path.resolve(root).startsWith(output + path.sep));
    await fs.rm(root, {recursive:true, force:true});
  });
  if (built) {
    for (const platform of ['toy', 'xhs']) {
      await fs.mkdir(path.join(root, 'dist', platform), {recursive:true});
      await fs.writeFile(path.join(root, 'dist', platform, 'index.html'), '<title>AI preview ' + platform + '</title>');
      await fs.writeFile(path.join(root, 'dist', platform, 'app.js'), 'window.previewLoaded=true;');
    }
  }
  return root;
}

async function listen(t, root) {
  const {createPreviewServer} = await import('../scripts/ai-preview-server.mjs');
  const server = createPreviewServer({root});
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  return {server, port:server.address().port};
}

function request(port, url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({hostname:'127.0.0.1', port, path:url, method}, response => {
      let body = '';
      response.on('data', data => { body += data; });
      response.on('end', () => resolve({status:response.statusCode, body, headers:response.headers}));
    });
    req.on('error', reject);
    req.end();
  });
}

test('preview default port matches the shared documented 4191 link', async () => {
  const {defaultPort} = await import('../scripts/ai-preview-server.mjs');
  assert.equal(defaultPort, 4191);
});

test('preview serves root, both platform aliases and original full link', async t => {
  const root = await fixture(t), {port} = await listen(t, root);
  for (const url of ['/', '/toy', '/xhs']) {
    const result = await request(port, url);
    assert.equal(result.status, 302);
    assert.equal(result.headers.location, url === '/xhs' ? '/dist/xhs/index.html' : '/dist/toy/index.html');
  }
  for (const url of ['/dist/toy/index.html', '/dist/toy/']) {
    const result = await request(port, url);
    assert.equal(result.status, 200);
    assert.match(result.body, /AI preview toy/);
  }
  assert.match((await request(port, '/dist/xhs/index.html')).body, /AI preview xhs/);
});

test('preview returns correct script MIME and no-store to avoid stale builds', async t => {
  const root = await fixture(t), {port} = await listen(t, root);
  const result = await request(port, '/dist/toy/app.js');
  assert.equal(result.status, 200);
  assert.match(result.headers['content-type'], /javascript/);
  assert.equal(result.headers['cache-control'], 'no-store');
  assert.equal((await request(port, '/', 'HEAD')).body, '');
});

test('missing build gives actionable 503 instead of unexplained blank/404 page', async t => {
  const root = await fixture(t, {built:false}), {port} = await listen(t, root);
  const result = await request(port, '/dist/toy/index.html');
  assert.equal(result.status, 503);
  assert.match(result.body, /npm run dev/);
});

test('preview confines requests to dist and rejects malformed URLs and methods', async t => {
  const root = await fixture(t), {port} = await listen(t, root);
  for (const url of ['/package.json', '/.git/config', '/dist/%2e%2e%2fpackage.json']) {
    assert.equal((await request(port, url)).status, 403);
  }
  assert.equal((await request(port, '/dist/toy/absent.js')).status, 404);
  assert.equal((await request(port, '/%')).status, 400);
  assert.equal((await request(port, '/', 'POST')).status, 405);
});

test('preview health and duplicate startup reuse only the same AI workspace', async t => {
  const root = await fixture(t), {server, port} = await listen(t, root);
  const {probePreview, startPreview} = await import('../scripts/ai-preview-server.mjs');
  const health = await probePreview(port);
  assert.equal(health.applicationId, 'ai-tier-list');
  assert.equal(health.root, path.resolve(root));
  const duplicate = await startPreview({root, port});
  assert.equal(duplicate.reused, true);
  assert.equal(duplicate.server, null);
  assert.equal(server.listening, true);
  await assert.rejects(startPreview({root:root + '-another-workspace', port}), /another application/);
});

test('foreign listener fails clearly without terminating or replacing it', async t => {
  const server = http.createServer((req, res) => res.end('Other project'));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const {startPreview} = await import('../scripts/ai-preview-server.mjs');
  await assert.rejects(startPreview({port:server.address().port}), /Choose another port/);
  assert.equal(server.listening, true);
});

test('invalid port rejected before starting a listener', async () => {
  const {startPreview} = await import('../scripts/ai-preview-server.mjs');
  for (const port of [0, -1, 65536, 4191.5, NaN]) await assert.rejects(startPreview({port}), /Port must/);
});
