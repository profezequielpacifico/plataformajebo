const valorDeCookie = (response, nombre) => {
  const cookies = normalizar(response.headers['set-cookie']);
  const prefijo = `${nombre}=`;
  for (const cookie of cookies) {
    const par = cookie.split(';')[0];
    if (par.startsWith(prefijo)) return par.slice(prefijo.length);
  }
  return null;
};

const accessTokenDe = (response) => valorDeCookie(response, 'accessToken');

const cookiesDe = (response) => {
  const pares = normalizar(response.headers['set-cookie'])
    .map((cookie) => cookie.split(';')[0])
    .filter((par) => par && par.includes('=') && par.split('=')[1] !== '');
  return pares.length ? { Cookie: pares.join('; ') } : {};
};

const normalizar = (headers) => {
  if (!headers) return [];
  return Array.isArray(headers) ? headers : [headers];
};

module.exports = { valorDeCookie, accessTokenDe, cookiesDe };
