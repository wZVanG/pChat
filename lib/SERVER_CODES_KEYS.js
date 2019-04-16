const SERVER_CODES = require('./SERVER_CODES');

module.exports = Object.assign({}, ...Object.entries(SERVER_CODES).map(([a,b]) => ({ [b]: a })));