export const ACTION_LABELS = {
    INICIO_SESION: 'Inicio de sesión',
    INTENTO_FALLIDO: 'Intento fallido de inicio',
    REGISTRO_USUARIO: 'Registro de usuario',
    REGISTRO_FALLIDO: 'Registro fallido',
    RECUPERAR_CONTRASENA: 'Recuperar contraseña',
    CREAR_USUARIO: 'Crear usuario',
    ACTUALIZAR_USUARIO: 'Actualizar usuario',
    CAMBIAR_ROL_USUARIO: 'Cambiar rol de usuario',
    ELIMINAR_USUARIO: 'Eliminar usuario',
    CREAR_TORNEO: 'Crear torneo',
    ACTUALIZAR_TORNEO: 'Actualizar torneo',
    ELIMINAR_TORNEO: 'Eliminar torneo',
    CREAR_EQUIPO: 'Crear equipo',
    ACTUALIZAR_EQUIPO: 'Actualizar equipo',
    ELIMINAR_EQUIPO: 'Eliminar equipo',
    CREAR_PARTIDO: 'Crear partido',
    ACTUALIZAR_PARTIDO: 'Actualizar partido',
    ACTUALIZAR_RESULTADO: 'Actualizar resultado',
    ACTUALIZAR_ESTADO_PARTIDO: 'Cambiar estado de partido',
    ELIMINAR_PARTIDO: 'Eliminar partido',
    CREAR_CANCHA: 'Crear cancha',
    ACTUALIZAR_CANCHA: 'Actualizar cancha',
    ELIMINAR_CANCHA: 'Eliminar cancha',
    CREAR_REGION: 'Crear región',
    ACTUALIZAR_REGION: 'Actualizar región',
    ELIMINAR_REGION: 'Eliminar región',
    CREAR_DISTRITO: 'Crear distrito',
    ACTUALIZAR_DISTRITO: 'Actualizar distrito',
    ELIMINAR_DISTRITO: 'Eliminar distrito',
    CREAR_INSTITUCION: 'Crear institución',
    ACTUALIZAR_INSTITUCION: 'Actualizar institución',
    ELIMINAR_INSTITUCION: 'Eliminar institución',
    CREAR_INSTANCIA: 'Crear instancia'
};

export function translateAction(action) {
    return ACTION_LABELS[action] || action;
}

export function formatDetail(detalleRaw) {
    if (!detalleRaw) return '—';
    try {
        const obj = typeof detalleRaw === 'string' ? JSON.parse(detalleRaw) : detalleRaw;
        const parts = [];
        if (obj.entity) parts.push(obj.entity);
        if (obj.motivo) parts.push(`— ${obj.motivo}`);
        if (obj.email) parts.push(`(${obj.email})`);
        if (obj.goles_local !== undefined && obj.goles_visitante !== undefined) {
            parts.push(`${obj.goles_local} - ${obj.goles_visitante}`);
        }
        if (obj.estado) parts.push(`→ ${obj.estado}`);
        if (parts.length === 0 && obj.entityId) parts.push(`ID: ${obj.entityId}`);
        return parts.join(' ') || '—';
    } catch {
        return detalleRaw;
    }
}
