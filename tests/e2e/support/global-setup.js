'use strict';

const http = require('http');
const {
  close,
  defaultPort,
  host,
  start
} = require('./static-server');

function serverIsAvailable() {
  return new Promise(function (resolve) {
    const request = http.get({
      host,
      path: '/',
      port: defaultPort,
      timeout: 1000
    }, function (response) {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode <= 403);
    });
    request.on('error', function () {
      resolve(false);
    });
    request.on('timeout', function () {
      request.destroy();
      resolve(false);
    });
  });
}

module.exports = async function () {
  try {
    const server = await start();
    return async function () {
      await close(server);
    };
  } catch (error) {
    const mayReuse = error && error.code === 'EADDRINUSE' && !process.env.CI;
    if (mayReuse && await serverIsAvailable()) return;
    throw error;
  }
};
