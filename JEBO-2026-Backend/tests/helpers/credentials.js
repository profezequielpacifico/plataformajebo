const crypto = require('crypto');

// Credenciales de la suite, generadas en runtime a proposito. Un literal de
// password en el repo es una credencialKnown: se filtra con el codigo y
// SonarQube la reporta como hotspot de seguridad (S2068). Ademas una contrasena
// fija entre corridas hace que un usuario de prueba pueda sobrevivir a un
// cleanup y chocar con otra suite.
const contrasenaDePrueba = () => `Aa1${crypto.randomBytes(16).toString('hex')}`;

// Valor para un campo que el test espera ver DESCARTADO por la allowlist.
// No es un hash real: se arma en runtime para que no quede una cadena que
// parezca una credencial en el codigo.
const hashInyectado = () => crypto.randomBytes(24).toString('hex');

module.exports = { contrasenaDePrueba, hashInyectado };
