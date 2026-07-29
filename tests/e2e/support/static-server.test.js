'use strict';

const assert = require('node:assert/strict');
const http = require('http');
const test = require('node:test');
const { close, host, start } = require('./static-server');

function requestIndex(port) {
  return new Promise(function (resolve, reject) {
    const request = http.get({
      host,
      path: '/',
      port,
      timeout: 1000
    }, function (response) {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', function (chunk) {
        body += chunk;
      });
      response.on('end', function () {
        resolve({
          body,
          statusCode: response.statusCode
        });
      });
    });
    request.on('error', reject);
    request.on('timeout', function () {
      request.destroy(new Error('Timed out requesting the test server.'));
    });
  });
}

test('the static server starts and closes through its in-process API',
  async function () {
    const server = await start({ port: 0 });
    const address = server.address();
    try {
      const response = await requestIndex(address.port);
      assert.equal(response.statusCode, 200);
      assert.match(response.body, /<title>Fallowborn<\/title>/);
    } finally {
      await close(server);
    }
    assert.equal(server.listening, false);
  });
