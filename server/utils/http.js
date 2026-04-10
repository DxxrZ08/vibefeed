const { URL } = require('url');

const parseUrl = (req) => new URL(req.url, 'http://127.0.0.1');

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(payload));
};

const sendNotFound = (res) => sendJson(res, 404, { error: 'Route not found.' });

const sendMethodNotAllowed = (res) => sendJson(res, 405, { error: 'Method not allowed.' });

module.exports = {
  parseUrl,
  sendJson,
  sendNotFound,
  sendMethodNotAllowed,
};
