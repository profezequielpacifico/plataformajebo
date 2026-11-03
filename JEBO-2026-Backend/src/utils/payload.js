/**
 * Reduce el body a una lista explícita de campos.
 *
 * El problema: los controladores hacen `service.update(req.params.id, req.body)`
 * y los repositorios terminan en `knex(tabla).update(data)`. `express-validator`
 * no recorta las claves que no tengan una cadena de validación declarada, así
 * que cualquier campo del body que llegue al INSERT/UPDATE se escribe. Con un
 * `PUT /users/:id` eso permite escribir `password_hash` directo —esquivando
 * `passwordValidator`— o `resultado_cargado` en un partido.
 *
 * Por qué acá y no con `matchedData`: `matchedData` devuelve únicamente los
 * campos que tienen una cadena declarada, así que en los endpoints sin
 * validación completa devolvería `{}` y rompería el flujo. La lista explícita
 * no depende de que exista la cadena.
 *
 * Los campos que no estén en la lista se descartan en silencio a propósito: un
 * cliente que mande de más es un bug del cliente, no un intento de ataque, y
 * una allowlist estricta que tira 400 termina siendo la primera coisa que
 * alguien relaja.
 */
const soloCampos = (req, campos) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};

  const permitidos = new Set(campos);
  return Object.fromEntries(
    Object.entries(body).filter(([k]) => permitidos.has(k))
  );
};

module.exports = { soloCampos };
