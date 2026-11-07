const crypto = require('crypto');

const contrasenaDePrueba = () => `Aa1${crypto.randomBytes(16).toString('hex')}`;

const hashInyectado = () => crypto.randomBytes(24).toString('hex');

module.exports = { contrasenaDePrueba, hashInyectado };
