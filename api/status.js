/*
 * GET /api/status — 화면이 AI 풀이 사용 가능 여부를 알 수 있게 한다. 키 값은 절대 노출하지 않는다.
 */
'use strict';
module.exports = function handler(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.end(JSON.stringify({ ai: !!process.env.ANTHROPIC_API_KEY }));
};
