import http from 'node:http';
import {readFile, realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const defaultPort = 4191;
const mimeTypes = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml'
};

export function createPreviewServer({root = projectRoot} = {}) {
  const dist = path.resolve(root, 'dist');
  return http.createServer(async (req, res) => {
    const send = (status, body, type = 'text/plain; charset=utf-8') => {
      res.writeHead(status, {'Content-Type':type, 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'});
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    if (!['GET', 'HEAD'].includes(req.method)) return send(405, 'Only GET and HEAD are supported');
    let requested;
    try { requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { return send(400, 'Invalid URL'); }
    if (requested === '/__ai_preview_health') {
      return send(200, JSON.stringify({applicationId:'ai-tier-list', root:path.resolve(root), pid:process.pid}), 'application/json; charset=utf-8');
    }
    if (requested === '/favicon.ico') return send(204, '');
    // Redirect aliases: serving HTML at '/' would resolve './app.js' outside dist.
    if (requested === '/' || requested === '/toy' || requested === '/xhs') {
      res.writeHead(302, {Location:requested === '/xhs' ? '/dist/xhs/index.html' : '/dist/toy/index.html', 'Cache-Control':'no-store'});
      return res.end();
    }
    if (requested.endsWith('/')) requested += 'index.html';
    const filename = path.resolve(root, '.' + requested);
    if (!filename.startsWith(dist + path.sep) || !mimeTypes[path.extname(filename)]) return send(403, 'This preview serves only build files in dist');
    try {
      const [actualDist, actualFile] = await Promise.all([realpath(dist), realpath(filename)]);
      if (!actualFile.startsWith(actualDist + path.sep)) return send(403, 'Resource outside build directory');
      return send(200, await readFile(actualFile), mimeTypes[path.extname(filename)]);
    } catch (error) {
      if (filename.endsWith(path.join('toy','index.html')) || filename.endsWith(path.join('xhs','index.html'))) {
        return send(503, '<!doctype html><meta charset="utf-8"><title>预览尚未构建</title><h1>预览文件尚未准备好</h1><p>请在项目目录运行 <code>npm run dev</code>，或双击“启动AI预览.cmd”。</p>', 'text/html; charset=utf-8');
      }
      return send(error.code === 'ENOENT' ? 404 : 500, error.code === 'ENOENT' ? 'Build resource not found' : 'Unable to read build resource');
    }
  });
}

export function probePreview(port) {
  return new Promise(resolve => {
    let settled = false;
    const finish = value => { if (!settled) { settled = true; resolve(value); } };
    const request = http.get({hostname:'127.0.0.1', port, path:'/__ai_preview_health', timeout:1000}, response => {
      let text = '';
      response.on('data', chunk => { text += chunk; if (text.length > 16384) { response.destroy(); finish(null); } });
      response.on('end', () => { try { finish(response.statusCode === 200 ? JSON.parse(text) : null); } catch { finish(null); } });
      response.on('error', () => finish(null));
    });
    request.on('timeout', () => { request.destroy(); finish(null); });
    request.on('error', () => finish(null));
  });
}

export async function startPreview({port = defaultPort, root = projectRoot} = {}) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Port must be an integer between 1 and 65535');
  const server = createPreviewServer({root});
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
    });
    return {server, reused:false, url:'http://127.0.0.1:' + port + '/'};
  } catch (error) {
    if (error.code !== 'EADDRINUSE') throw error;
    const active = await probePreview(port);
    if (active && active.applicationId === 'ai-tier-list' && path.resolve(active.root) === path.resolve(root)) {
      return {server:null, reused:true, url:'http://127.0.0.1:' + port + '/'};
    }
    throw Error('Port ' + port + ' is used by another application. Choose another port: npm run dev -- 4192');
  }
}
