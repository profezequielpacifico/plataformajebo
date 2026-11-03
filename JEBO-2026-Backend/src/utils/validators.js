const { ValidationError } = require('./errors');

const documentoValidator = (value) => {
  if (!value || !String(value).trim()) {
    throw new ValidationError('El documento es requerido');
  }
  if (!/^\d{1,8}$/.test(String(value))) {
    throw new ValidationError('El documento debe contener entre 1 y 8 dígitos');
  }
  return true;
};

// Decide si un valor "parece" un email. No se usa regex a proposito: la forma

const looksLikeEmail = (value) => {
  if (typeof value !== 'string' || value === '' || /\s/.test(value)) return false;

  const partes = value.split('@');
  if (partes.length !== 2) return false;

  const [local, dominio] = partes;
  if (!local || !dominio) return false;

  const etiquetas = dominio.split('.');
  return etiquetas.length >= 2 && etiquetas.every((etiqueta) => etiqueta.length > 0);
};

const passwordValidator = (value) => {
  if (!value || value.length < 8) {
    throw new ValidationError('La contraseña debe tener al menos 8 caracteres');
  }
  if (!/[A-Z]/.test(value)) {
    throw new ValidationError('La contraseña debe tener al menos una mayúscula');
  }
  if (!/[a-z]/.test(value)) {
    throw new ValidationError('La contraseña debe tener al menos una minúscula');
  }
  if (!/\d/.test(value)) {
    throw new ValidationError('La contraseña debe tener al menos un número');
  }
  return true;
};

/**
 * Forma canónica de un email: sin espacios y en minúscula.
 *
 * El problema medido: la unicidad de `usuario.email` estaba garantizada por
 * `UNIQUE (email)`, que en Postgres compara byte a byte. `admin@jebo2026.com` y
 * `ADMIN@jebo2026.com` son dos valores distintos para el índice, así que la app
 * aceptaba las dos cuentas: el alta de la segunda devolvía 201 y las dos
 * entraban al login. Medido en vivo contra la base de desarrollo:
 * `POST /users` con `ADMIN@jebo2026.com` creó el usuario 503 y
 * `admin@jebo2026.com` y `ADMIN@jebo2026.com` autenticaban las dos.
 *
 * Por eso la normalización va en dos capas y no solo en la validación:
 *  - acá, para que toda escritura y toda búsqueda usen la misma forma;
 *  - en la migración `usuario_email_lower_uk`, un índice único sobre
 *    `lower(email)`, para que el que escriba directo en SQL (seeds, scripts
 *    demo, una consola) tampoco pueda meter la cuenta gemela.
 *
 * `btrim` y no `trim`: es la función de Postgres, y la migración necesita la
 * misma expresión.
 */
const normalizarEmail = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/**
 * Valida que el rol exista en la tabla `rol`.
 *
 * Antes la validación era una lista de nombres escrita en la ruta
 * (`isIn(['Administrador', 'Editor', 'Profesor', 'Arbitro'])`) y esa lista
 * quedó desactualizada en las dos direcciones:
 *  - faltaba `Juez`, que la app usa para la高分子ia Artística: cualquier
 *    `PUT /users/:id` sobre un juez —empezando por un cambio de contraseña—
 *    devolvía 400 "Invalid value" y el admin no podía ni tocarlo;
 *  - sobraba `Editor`, que no existe en la tabla: el `isIn` lo aceptaba y
 *    después `RolRepository.findByDescripcion('Editor')` devolvía `undefined`,
 *    así que `POST /users` respondía 500 "Ha ocurrido un error inesperado".
 *
 * Consultar la tabla es lo que evita que vuelva a pasar: el día que se agregue
 * un rol, el formulario ya lo ofrece y la API lo acepta, sin tocar código.
 */
const rolExisteValidator = async (value) => {
  // `optional()` deja pasar el `undefined`; el string vacío también se trata
  // como "no informado" porque `create` usa 'Profesor' como default.
  if (value === undefined || value === null || String(value).trim() === '') return true;

  // Require diferido: `utils` se carga desde `utils/index.js`, que usan los
  // repositorios, y un require de ida y vuelta en ese momento deja
  // `RolRepository` a medias.
  const { RolRepository } = require('../repositories');
  const rol = await RolRepository.findByDescripcion(String(value).trim());
  if (!rol) {
    const roles = await RolRepository.findAll();
    throw new ValidationError(
      `Rol inválido: "${value}". Roles disponibles: ${roles.map((r) => r.descripcion).join(', ')}`
    );
  }
  return true;
};

module.exports = {
  passwordValidator,
  documentoValidator,
  looksLikeEmail,
  normalizarEmail,
  rolExisteValidator
};
