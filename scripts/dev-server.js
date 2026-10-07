/*
 * 로컬 개발 서버: public/ 정적 파일 + /api/reading (Vercel 함수와 같은 핸들러)
 *   ANTHROPIC_API_KEY=sk-... npm run dev   →  http://localhost:3000
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const reading = require('../api/reading.js');

const ROOT = path.join(__dirname, '..', 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };

function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/reading') return reading(req, res);
    let file = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
    if (!file.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (err, data) => {
      if (err) { res.statusCode = 404; return res.end('Not found'); }
      res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
      res.end(data);
    });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, () => console.log(`명식 개발 서버: http://localhost:${port}${process.env.ANTHROPIC_API_KEY ? '' : '  (ANTHROPIC_API_KEY가 없어 AI 풀이는 비활성)'}`));
}
module.exports = { createServer };
