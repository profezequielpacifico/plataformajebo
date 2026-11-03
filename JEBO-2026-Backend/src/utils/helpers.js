const generateUsername = (email) => {
  return email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
};

const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

/**
 * Binda todos los metodos de una instancia de controlador.
 *
 * Los handlers se pasan sueltos a `router.post(handler)`, asi que cuando uno
 * usa `this` y no esta bindeado, `this` queda en `undefined`: las clases son
 * strict siempre, y Express no re-liga el receiver. El sintoma es un 500 en la
 * primera linea del handler ("Cannot read properties of undefined (reading
 * '_context')"), no un error de sintaxis ni un test rojo, porque el problema no
 * esta en el codigo sino en como Express lo invoca.
 *
 * La lista a mano es el problema de fondo: con `this.x = this.x.bind(this)` en
 * el constructor hay que acordarse de cada metodo nuevo, y acordarse es
 * justamente lo que falle. `POST /tournaments/:id/reglamento` y los dos
 * `etapa.controller` de torneo estan rotos por eso. Con esto, un metodo nuevo
 * queda bindeado solo.
 *
 * Se llama desde el constructor, no al exportar: `Object.getPrototypeOf(this)`
 * tiene que ser la clase concreta, y `getOwnPropertyNames` sobre el prototipo
 * incluye metodos heredados, asi que una subclase tambien queda cubierta.
 */
const bindAll = (instancia) => {
  for (const nombre of Object.getOwnPropertyNames(Object.getPrototypeOf(instancia))) {
    if (nombre === 'constructor') continue;
    if (typeof instancia[nombre] === 'function') {
      instancia[nombre] = instancia[nombre].bind(instancia);
    }
  }
  return instancia;
};

module.exports = { generateUsername, sanitizeString, bindAll };
