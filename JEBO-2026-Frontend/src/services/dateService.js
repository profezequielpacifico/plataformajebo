/**
 * Fechas de calendario (sin hora) que llegan de la API.
 *
 * El problema que viene a resolver: la API manda la fecha programada como
 * texto `YYYY-MM-DD`, y `new Date('2026-09-30')` NO es "30 de septiembre":
 * los strings date-only de JavaScript se parsean como medianoche **UTC**. Al
 * pasarlo a hora local en Argentina (UTC-3) eso cae en el dia **anterior**, y
 * la tabla llegaba a mostrar 29/9 para un partido del 30.
 *
 * Por eso aca no se usa `new Date()` para nada. La fecha se parte en sus tres
 * numeros y se compara con el dia local, que es el calendario que ve el
 * arbitro. Es texto contra texto: sin zona horaria en el medio, sin surprises
 * de UTC, y hace lo mismo en cualquier maquina desde la que se mire.
 */

/** Devuelve `YYYY-MM-DD` del dia local, sin tocar la zona horaria. */
export function hoyLocal() {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
}

/**
 * Compara la fecha del partido contra hoy en hora local.
 *
 * Devuelve un estado en vez de un booleano para que la UI pueda explicar por
 * que el boton esta bloqueado, en vez de solo apagarlo.
 *
 * `sin_fecha`: el partido no tiene slot de disponibilidad, asi que no hay
 * fecha con la cual comparar. El backend lo permite (y lo asienta en bitacora);
 * aca tampoco se bloquea.
 */
export function estadoFechaPartido(fecha, hoy = hoyLocal()) {
    if (!fecha) return { permitido: true, motivo: 'sin_fecha', fecha: null };

    const f = String(fecha).slice(0, 10);
    if (f === hoy) return { permitido: true, motivo: 'hoy', fecha: f };

    return {
        permitido: false,
        motivo: f < hoy ? 'pasado' : 'futuro',
        fecha: f
    };
}

/** `YYYY-MM-DD` -> `30/09/2026`, sin el corrimiento de UTC. */
export function formatearFecha(fecha) {
    if (!fecha) return '—';
    const [a, m, d] = String(fecha).slice(0, 10).split('-');
    if (!a || !m || !d) return '—';
    return `${d}/${m}/${a}`;
}
