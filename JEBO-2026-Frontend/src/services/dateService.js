export function hoyLocal() {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
}

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

export function formatearFecha(fecha) {
    if (!fecha) return '—';
    const [a, m, d] = String(fecha).slice(0, 10).split('-');
    if (!a || !m || !d) return '—';
    return `${d}/${m}/${a}`;
}

const FORMATO_ARGENTINA = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
});

function enHoraArgentina(instante) {
    const p = Object.fromEntries(FORMATO_ARGENTINA.formatToParts(instante).map(({ type, value }) => [type, value]));
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function hoyArgentina() {
    return enHoraArgentina(new Date()).slice(0, 10);
}

export function instanteAFechaHoraArgentina(valor) {
    if (!valor) return '';
    const instante = new Date(valor);
    return isNaN(instante) ? '' : enHoraArgentina(instante);
}

export function fechaHoraArgentinaAInstante(valor) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor || '')) return null;
    const comoUtc = new Date(`${valor}:00Z`);
    if (isNaN(comoUtc)) return null;
    const desfase = comoUtc - new Date(`${enHoraArgentina(comoUtc)}:00Z`);
    return new Date(comoUtc.getTime() + desfase).toISOString();
}
