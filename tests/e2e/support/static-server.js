'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { URL } = require('url');

const gameRoot = path.resolve(__dirname, '..', '..', '..');
const host = '127.0.0.1';
const port = Number(process.env.FALLOWBORN_TEST_PORT || 4173);
const allowedRootFiles = new Set(['index.html', 'LICENSE']);
const allowedDirectories = new Set([
  'css',
  'data',
  'docs',
  'js',
  'mods',
  'static'
]);
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

function resolveRequest(requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, 'http://' + host).pathname);
  } catch (error) {
    return null;
  }
  if (pathname === '/') pathname = '/index.html';
  const relative = pathname.replace(/^\/+/, '').replace(/\\/g, '/');
  const parts = relative.split('/');
  if (!relative || parts.includes('..') || parts.includes('.')) return null;
  if (parts.length === 1 && !allowedRootFiles.has(parts[0])) return null;
  if (parts.length > 1 && !allowedDirectories.has(parts[0])) return null;
  const absolute = path.resolve(gameRoot, ...parts);
  const withinRoot = path.relative(gameRoot, absolute);
  if (withinRoot.startsWith('..') || path.isAbsolute(withinRoot)) return null;
  return absolute;
}

const server = http.createServer(function (request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end();
    return;
  }

  const absolute = resolveRequest(request.url);
  if (!absolute) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  fs.stat(absolute, function (statError, stat) {
    if (statError || !stat.isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
    const type = contentTypes[path.extname(absolute).toLowerCase()] ||
      'application/octet-stream';
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Length': stat.size,
      'Content-Type': type
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    fs.createReadStream(absolute).pipe(response);
  });
});

server.listen(port, host, function () {
  process.stdout.write('Fallowborn test server listening on http://' + host + ':' + port + '\n');
});

function close() {
  server.close(function () {
    process.exit(0);
  });
  if (server.closeAllConnections) server.closeAllConnections();
}

process.on('SIGINT', close);
process.on('SIGTERM', close);
