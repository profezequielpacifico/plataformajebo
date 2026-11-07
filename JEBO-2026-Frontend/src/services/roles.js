import { ROLE_IDS } from '../config/constants.js';

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

export function esAdministrador(user) {
    const roleId = getRoleId(user);
    return roleId === ROLE_IDS.ADMINISTRADOR || roleId === ROLE_IDS.SUPERADMIN;
}
