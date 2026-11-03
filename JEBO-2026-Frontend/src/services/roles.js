import { ROLE_IDS } from '../config/constants.js';

/**
 * Rol numerico del usuario logueado.
 *
 * `id_rol` es la fuente mas confiable, pero `/auth/login` no lo devuelve (el
 * repositorio de usuarios no selecciona `u.id_rol`), asi que hace falta el mapa
 * por nombre. El backend autoriza por el nombre del rol (`ROLES_ADMIN`), no por
 * el id, y ese nombre SI viaja en el perfil cacheado.
 */
export function getRoleId(user) {
    if (!user) return null;
    if (user.id_rol) return Number(user.id_rol);
    const roleMap = {
        'SuperAdmin': ROLE_IDS.SUPERADMIN,
        'Administrador': ROLE_IDS.ADMINISTRADOR,
        'Profesor': ROLE_IDS.PROFESOR,
        'Arbitro': ROLE_IDS.ARBITRO,
        'Juez': ROLE_IDS.JUEZ
    };
    return roleMap[user.rol] ?? null;
}

/**
 * SuperAdmin o Administrador: los mismos dos roles que el backend acepta en
 * `esAdministrador` (`ROLES_ADMIN`) y en `gestionarPresentacion`.
 *
 * Antes cada pantalla comparaba a mano `user.rol === 'Administrador' ||
 * user.id_rol === 1`. Tenia dos errores: dejaba afuera al SuperAdmin (su rol se
 * llama `'SuperAdmin'`) y el id 1 del rol es Profesor, no Administrador.
 */
export function esAdministrador(user) {
    const roleId = getRoleId(user);
    return roleId === ROLE_IDS.ADMINISTRADOR || roleId === ROLE_IDS.SUPERADMIN;
}
