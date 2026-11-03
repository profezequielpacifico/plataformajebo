/**
 * Lectura de tokens desde `Set-Cookie` para los tests.
 *
 * Los tokens ya no viajan en el cuerpo de la respuesta de `/auth/login` sino
 * en cookies `httpOnly` (ver `src/controllers/auth.controller.js`). Los tests
 * que hacen login y después pegan `Authorization: Bearer` tienen que sacarlo de
 * ahí. Lo que se hace es pedirle la cookie a supertest y entregarla por el
 * header, que el `authenticate` sigue aceptando — así los tests ejercitan el
 * camino viejo sin tener que simular un navegador con una cookie jar.
 *
 * Nota: `httpOnly` no es un obstáculo desde supertest, porque `httpOnly` es una
 * restricción para JavaScript del navegador, no para un cliente HTTP.
 */

/** Devuelve el valor de una cookie del array de `Set-Cookie`, o `null`. */
const valorDeCookie = (response, nombre) => {
  const cookies = normalizar(response.headers['set-cookie']);
  const prefijo = `${nombre}=`;
  for (const cookie of cookies) {
    const par = cookie.split(';')[0];
    if (par.startsWith(prefijo)) return par.slice(prefijo.length);
  }
  return null;
};

/** El access token del login, listo para `set('Authorization', ...)`. */
const accessTokenDe = (response) => valorDeCookie(response, 'accessToken');

/**
 * Header `Cookie` con solo los pares `nombre=valor`, sin atributos.
 *
 * Los atributos (`Path`, `Expires`, `HttpOnly`, `SameSite`, `Max-Age`) se
 * dejan fuera a propósito: un header `Cookie` de verdad no los lleva, y pegarlos
 * hace que `cookie-parser` los interprete como cookies con esos nombres. No
 * rompe nada, pero el test deja de parecerse a lo que hace el navegador.
 */
const cookiesDe = (response) => {
  const pares = normalizar(response.headers['set-cookie'])
    .map((cookie) => cookie.split(';')[0])
    .filter((par) => par && par.includes('=') && par.split('=')[1] !== '');
  return pares.length ? { Cookie: pares.join('; ') } : {};
};

/** Un `Set-Cookie` puede venir como string o como array según el caso. */
const normalizar = (headers) => {
  if (!headers) return [];
  return Array.isArray(headers) ? headers : [headers];
};

module.exports = { valorDeCookie, accessTokenDe, cookiesDe };
