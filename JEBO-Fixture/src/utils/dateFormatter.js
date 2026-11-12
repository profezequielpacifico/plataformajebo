const ZONA = 'America/Argentina/Buenos_Aires';

export const hoyEnArgentina = (ahora = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora);

const aFecha = (iso) => {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia, 12));
};

const formato = (opciones) => new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', ...opciones });
const diaLargo = formato({ weekday: 'long', day: 'numeric', month: 'long' });
const inicialDia = formato({ weekday: 'narrow' });
const numeroDia = formato({ day: 'numeric' });
const numerico = formato({ day: '2-digit', month: '2-digit', year: 'numeric' });
const hora = new Intl.DateTimeFormat('es-AR', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

const capitalizar = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

export const sumarDias = (iso, dias) => {
  const fecha = aFecha(iso);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
};

export const formatearDiaLargo = (iso, hoy = hoyEnArgentina()) => {
  if (!iso) return 'Fecha a confirmar';
  if (iso === hoy) return 'Hoy';
  if (iso === sumarDias(hoy, 1)) return 'Mañana';
  if (iso === sumarDias(hoy, -1)) return 'Ayer';
  return capitalizar(diaLargo.format(aFecha(iso)));
};

export const formatearDiaCorto = (iso) => (iso
  ? { inicial: inicialDia.format(aFecha(iso)).toUpperCase(), numero: numeroDia.format(aFecha(iso)) }
  : null);

export const formatearFecha = (iso) => (iso ? numerico.format(aFecha(iso)) : 'A confirmar');

export const formatearHora = (hhmm) => (hhmm ? `${hhmm} h` : 'A confirmar');

export const formatearHoraDeInstante = (instante) => (instante ? hora.format(instante) : '');
