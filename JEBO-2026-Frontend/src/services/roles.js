import { ROLE_IDS } from '../config/constants.js';

const ROLES_POR_NOMBRE = {
    superadmin: ROLE_IDS.SUPERADMIN,
    administrador: ROLE_IDS.ADMINISTRADOR,
    profesor: ROLE_IDS.PROFESOR,
    arbitro: ROLE_IDS.ARBITRO,
    juez: ROLE_IDS.JUEZ
};

const ETIQUETAS_DE_ROL = {
    [ROLE_IDS.SUPERADMIN]: 'SuperAdmin',
    [ROLE_IDS.ADMINISTRADOR]: 'Administrador',
    [ROLE_IDS.PROFESOR]: 'Profesor',
    [ROLE_IDS.ARBITRO]: 'Árbitro',
    [ROLE_IDS.JUEZ]: 'Juez'
};

function normalizarNombre(nombre) {
    return String(nombre)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[\s_-]/g, '')
        .toLowerCase();
}

export function getRoleId(user) {
    if (!user || user.rol == null) return null;
    return ROLES_POR_NOMBRE[normalizarNombre(user.rol)] ?? null;
}

export function tieneRol(user, ...roles) {
    const roleId = getRoleId(user);
    return roleId !== null && roles.includes(roleId);
}

export function esAdministrador(user) {
    return tieneRol(user, ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN);
}

export function esSuperAdmin(user) {
    return tieneRol(user, ROLE_IDS.SUPERADMIN);
}

export function etiquetaDeRol(user) {
    return ETIQUETAS_DE_ROL[getRoleId(user)] ?? 'Sin rol';
}
