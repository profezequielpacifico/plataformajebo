import React, { useState, useEffect, useCallback } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal, Notification } from '../../components/ui/Modal.js';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell } from '../../components/ui/Table.js';
import matchService from '../../services/matchService.js';
import { ROUTES } from '../../config/constants.js';
import { esAdministrador } from '../../services/roles.js';

const { createElement: h } = React;

const TICK_MS = 1000;
const RECARGA_MS = 15000;

function useRelojLocal(reloj, base) {

    const [transcurrido, setTranscurrido] = useState(0);

    useEffect(() => {
        if (!reloj || !base || reloj.estado !== 'EN_CURSO') return undefined;

        const tic = () => setTranscurrido(
            Math.max(0, Math.floor((Date.now() - base.recibidoEn) / 1000))
        );

        tic();
        const t = setInterval(tic, TICK_MS);
        return () => clearInterval(t);
    }, [reloj, base]);

    if (!reloj || !base) return 0;
    if (reloj.estado !== 'EN_CURSO') return base.segundos;
    return base.segundos + transcurrido;
}

function horaLocal(iso, offset) {
    if (!iso) return '—';
    const d = new Date(new Date(iso).getTime() + offset);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatearReloj(segundos) {
    const s = Math.max(0, Math.floor(Number(segundos) || 0));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function nombreAnotacion(disciplinaNombre) {
    const d = (disciplinaNombre || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    if (d.includes('softbol')) return 'Carrera';
    if (['baloncesto', 'basquet', 'basket', 'voleibol', 'voley', 'ringo'].some(n => d.includes(n))) return 'Punto';
    return 'Gol';
}

function badgePartido(estado) {
    const e = (estado || '').toLowerCase();
    if (e === 'finalizado') return 'blue';
    if (e === 'en juego' || e === 'suspendido') return 'green';
    if (e === 'cancelado') return 'red';
    if (e === 'pendiente' || e === 'programado') return 'orange';
    return 'yellow';
}

const ETIQUETA_RELOJ = {
    PENDIENTE: 'Sin iniciar',
    EN_CURSO: 'Corriendo',
    PAUSADO: 'En pausa',
    FINALIZADO: 'Terminado'
};

function nuevaClave() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `k-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function usePartidoLive(matchId) {
    const [live, setLive] = useState(null);
    const [eventos, setEventos] = useState([]);
    const [error, setError] = useState(null);

    const [cargadoPara, setCargadoPara] = useState(null);

    const [relojBase, setRelojBase] = useState(null);
    const [offset, setOffset] = useState(0);

    const cargar = useCallback(async () => {
        if (!matchId) return;
        try {

            const [l, ev] = await Promise.all([
                matchService.getLive(matchId),
                matchService.getEvents(matchId, { limit: 100 })
            ]);

            const datos = l.data || l;
            const recibidoEn = Date.now();
            const horaServidor = datos.server_time ? new Date(datos.server_time).getTime() : NaN;

            setLive(datos);
            setEventos(ev.data || []);
            setRelojBase({ segundos: Number(datos.reloj?.segundos) || 0, recibidoEn });
            setOffset(Number.isNaN(horaServidor) ? 0 : horaServidor - recibidoEn);
            setCargadoPara(matchId);
            setError(null);
        } catch (err) {
            setError(err.message || 'No se pudo cargar el partido');
        }
    }, [matchId]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    useEffect(() => {
        const t = setInterval(cargar, RECARGA_MS);
        return () => clearInterval(t);
    }, [cargar]);

    const cargando = !error && cargadoPara !== matchId;

    return { live, eventos, cargando, error, offset, relojBase, recargar: cargar };
}

function RelojPanel({ reloj, segundos, partido, busy, onAccion }) {
    const estado = reloj.estado || 'PENDIENTE';
    const cerrado = partido.estado === 'Finalizado' || partido.estado === 'Cancelado';

    const boton = () => {        if (cerrado) return null;
        if (estado === 'PENDIENTE') {
            return h('button', {
                style: styles.buttonSuccess, disabled: busy,
                onClick: () => onAccion('INICIAR')
            }, '▶ Iniciar reloj');
        }
        if (estado === 'EN_CURSO') {
            return h('button', {
                style: styles.buttonOutline, disabled: busy,
                onClick: () => onAccion('PAUSAR')
            }, '⏸ Pausar');
        }
        if (estado === 'PAUSADO') {
            return h('button', {
                style: styles.buttonSuccess, disabled: busy,
                onClick: () => onAccion('REANUDAR')
            }, '▶ Reanudar');
        }
        return null;
    };

    return h('div', { style: { textAlign: 'center', padding: '10px 0 4px' } },
        h('div', {
            role: 'timer',

            'aria-label': `Tiempo de partido: ${formatearReloj(segundos)}, ${(ETIQUETA_RELOJ[estado] || estado).toLowerCase()}`,
            style: {
                fontSize: '38px',
                fontWeight: '800',

                fontVariantNumeric: 'tabular-nums',
                color: estado === 'EN_CURSO' ? '#16a34a' : '#6b7280'
            }
        }, formatearReloj(segundos)),
        h(Badge, { variant: estado === 'EN_CURSO' ? 'green' : estado === 'FINALIZADO' ? 'blue' : 'orange' },
            ETIQUETA_RELOJ[estado] || estado),
        h('div', { style: { marginTop: '10px' } }, boton())
    );
}

function BotonAnotacion({ equipo, disabled, onClick }) {
    return h('button', {
        style: {
            flex: 1,
            fontSize: '19px',
            fontWeight: '800',
            padding: '20px 8px',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            background: '#dc2626'
        },
        disabled,
        onClick
    }, `${equipo}`);
}

function columnaQuien(ev) {
    if (ev.arbitro_nombre) return ev.arbitro_nombre;
    if (ev.registrado_por_nombre) {
        return h('span', null,
            ev.registrado_por_nombre,
            h('span', { style: { color: '#9ca3af' } }, ' (admin)'));
    }

    return h('span', { style: { color: '#9ca3af' } }, 'desconocido');
}

function TablaEventos({ eventos, anotacion, offset, busy, onAnular }) {
    if (!eventos.length) {
        return h('div', { style: { padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' } },
            'Todavía no hay eventos en este partido.');
    }

    return h(Table, null,
        h(TableHeader, null,
            h(TableHeaderCell, { style: { width: '46px' } }, '#'),
            h(TableHeaderCell, null, 'Equipo'),
            h(TableHeaderCell, { style: { width: '70px' } }, anotacion),
            h(TableHeaderCell, null, 'Árbitro'),
            h(TableHeaderCell, null, 'Hora real'),
            h(TableHeaderCell, null, 'Estado'),
            h(TableHeaderCell, null, '')
        ),

        eventos.map(ev => h(TableRow, { key: ev.id_evento },
            h(TableCell, { style: { color: '#9ca3af' } }, `#${ev.numero_evento}`),
            h(TableCell, null, ev.equipo_nombre || '—'),
            h(TableCell, { style: { fontVariantNumeric: 'tabular-nums' } },
                ev.segundos_partido == null ? '—' : formatearReloj(ev.segundos_partido)),
            h(TableCell, null, columnaQuien(ev)),
            h(TableCell, null, horaLocal(ev.hora_real, offset)),
            h(TableCell, null,
                h(Badge, { variant: ev.estado === 'ANULADO' ? 'red' : 'green' },
                    ev.estado === 'ANULADO' ? 'Anulado' : 'Confirmado'),
                ev.estado === 'ANULADO' && ev.motivo_anulacion
                    ? h('div', { style: { fontSize: '11px', color: '#6b7280', marginTop: '4px', maxWidth: '220px' } },
                        ev.motivo_anulacion)
                    : null,
                ev.estado === 'ANULADO' && ev.anulado_por_nombre
                    ? h('div', { style: { fontSize: '10px', color: '#9ca3af', marginTop: '2px' } },
                        `por ${ev.anulado_por_nombre}`)
                    : null
            ),
            h(TableCell, { align: 'right' },
                ev.estado === 'ANULADO' ? null : h('button', {
                    style: {
                        ...styles.buttonOutline,
                        padding: '5px 10px',
                        fontSize: '11px',
                        cursor: busy ? 'not-allowed' : 'pointer'
                    },
                    disabled: busy,
                    onClick: () => onAnular(ev)
                }, 'Anular'))
        ))
    );
}

export function MatchLivePage({ matchId, onNavigate, user }) {
    const { live, eventos, cargando, error, offset, relojBase, recargar } = usePartidoLive(matchId);
    const [notif, setNotif] = useState(null);
    const [busy, setBusy] = useState(false);
    const [anulando, setAnulando] = useState(null);
    const [motivo, setMotivo] = useState('');
    const [sellando, setSellando] = useState(false);

    const segundos = useRelojLocal(live?.reloj, relojBase);

    useEffect(() => {
        if (!notif) return undefined;
        const t = setTimeout(() => setNotif(null), 3000);
        return () => clearTimeout(t);
    }, [notif]);

    const avisar = useCallback((message, type = 'success') => setNotif({ message, type }), []);

    const correr = useCallback(async (quehacer, exito) => {
        setBusy(true);
        try {
            await quehacer();
            await recargar();
            if (exito) avisar(exito);
        } catch (err) {
            avisar(err.message || 'No se pudo completar la operacion', 'error');
        } finally {
            setBusy(false);
        }
    }, [recargar, avisar]);

    const registrar = (idEquipo) => correr(
        () => matchService.createEvent(matchId, {
            id_equipo: idEquipo,
            idempotency_key: nuevaClave()
        })
    );

    const accionReloj = (accion) => correr(
        () => matchService.clockAction(matchId, accion),
        accion === 'INICIAR' ? 'Reloj iniciado' : accion === 'PAUSAR' ? 'Reloj en pausa' : 'Reloj reanudado'
    );

    const confirmarAnulacion = () => {
        const limpio = (motivo || '').trim();
        if (!limpio) {
            avisar('El motivo es obligatorio: sin el, una anulacion es indistinguible de un error', 'error');
            return;
        }
        const objetivo = anulando;
        setAnulando(null);
        setMotivo('');
        correr(
            () => matchService.annulEvent(matchId, objetivo.id_evento, { motivo_anulacion: limpio }),
            'Evento anulado. El marcador se ajusto solo.'
        );
    };

    const sellar = () => {
        setSellando(true);
        correr(
            () => matchService.updateResult(matchId, {}),
            'Resultado cerrado con el marcador derivado. Ya no se puede cambiar.'
        ).finally(() => setSellando(false));
    };

    if (cargando) {
        return h('div', { style: { padding: '48px', textAlign: 'center', color: '#6b7280' } }, 'Cargando partido…');
    }
    if (error) {
        return h('div', { style: { padding: '48px', textAlign: 'center', color: '#b91c1c' } }, error);
    }
    if (!live) return null;

    const partido = live.partido || {};
    const equipos = live.equipos || {};
    const reloj = live.reloj || {};
    const marcador = live.marcador || {};
    const anotacion = nombreAnotacion(partido.disciplina_nombre);

    const local = Number(marcador.local) || 0;
    const visitante = Number(marcador.visitante) || 0;

    const cerrado = partido.estado === 'Finalizado' || partido.estado === 'Cancelado';
    const jugable = partido.estado === 'En Juego' && !cerrado;

    const esAdmin = esAdministrador(user);
    const sinArbitros = (live.arbitros || []).length === 0;
    const avisoSinArbitros = sinArbitros && !esAdmin;

    return h('div', { style: { padding: '16px' } },
        notif && h(Notification, { message: notif.message, type: notif.type, onClose: () => setNotif(null) }),

        h('div', {
            style: {
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                gap: '12px', flexWrap: 'wrap', marginBottom: '16px'
            }
        },
            h('div', null,
                h('h1', { style: { margin: 0, fontSize: '22px' } }, 'Partido en vivo'),
                h('div', { style: { fontSize: '13px', color: '#6b7280', marginTop: '2px' } },
                    [partido.torneo, partido.disciplina_nombre, partido.fecha, partido.hora]
                        .filter(Boolean).join(' · ')),
                h('div', { style: { fontSize: '12px', color: '#9ca3af', marginTop: '2px' } },
                    `${partido.cancha_nombre || 'Cancha sin asignar'}`)
            ),
            h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                h(Badge, { variant: badgePartido(partido.estado) }, partido.estado || ''),
                h('button', {
                    style: styles.buttonOutline,
                    onClick: () => onNavigate && onNavigate(ROUTES.MIS_PARTIDOS)
                }, 'Volver'))
        ),

        avisoSinArbitros
            ? h('div', {
                style: {
                    background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e',
                    padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '12px'
                }
            }, 'Este partido no tiene arbitros asignados. Vas a poder mirarlo, pero registrar eventos requiere estar en el staff.')
            : null,

        h(Card, { style: { marginBottom: '16px' } },
            h('div', {

                role: 'status',
                'aria-live': 'polite',
                'aria-label': `Marcador: ${equipos.local?.nombre || 'local'} ${local}, ${equipos.visitante?.nombre || 'visitante'} ${visitante}`,
                style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '18px 0 4px' }
            },
                h('div', { style: { flex: 1, textAlign: 'center' } },
                    h('div', { style: { fontSize: '14px', fontWeight: '600', color: '#4b5563' } },
                        equipos.local?.nombre || 'Local'),
                    h('div', { style: { fontSize: '52px', fontWeight: '800', lineHeight: 1.05, color: '#dc2626' } },
                        String(local))),
                h('div', { style: { fontSize: '22px', fontWeight: '700', color: '#9ca3af' } }, '-'),
                h('div', { style: { flex: 1, textAlign: 'center' } },
                    h('div', { style: { fontSize: '14px', fontWeight: '600', color: '#4b5563' } },
                        equipos.visitante?.nombre || 'Visitante'),
                    h('div', { style: { fontSize: '52px', fontWeight: '800', lineHeight: 1.05, color: '#1d4ed8' } },
                        String(visitante)))
            ),

            h('div', {
                style: { textAlign: 'center', fontSize: '11px', color: '#9ca3af', paddingBottom: '6px' }
            }, 'El marcador se cuenta solo: cada anotación registrada suma uno. No se escribe a mano.'),

            h(RelojPanel, {
                reloj, segundos, partido, busy, onAccion: accionReloj
            }),

            h('div', { style: { display: 'flex', gap: '12px', padding: '14px 0 6px' } },
                jugable
                    ? [
                        h(BotonAnotacion, {
                            key: 'l',
                            equipo: `${anotacion} ${equipos.local?.nombre || 'local'}`,
                            disabled: busy,
                            onClick: () => registrar(equipos.local?.id)
                        }),
                        h(BotonAnotacion, {
                            key: 'v',
                            equipo: `${anotacion} ${equipos.visitante?.nombre || 'visitante'}`,
                            disabled: busy,
                            onClick: () => registrar(equipos.visitante?.id)
                        })
                    ]
                    : h('div', {
                        style: { flex: 1, textAlign: 'center', fontSize: '12px', color: '#9ca3af', padding: '10px' }
                    }, cerrado
                        ? 'El partido esta cerrado: el ledger ya no admite cambios.'
                        : 'El partido tiene que estar "En Juego" para registrar eventos.')
            )
        ),

        h(Card, { style: { marginBottom: '16px' } },
            h(CardHeader, { title: 'Historial de eventos' },
                h('button', {
                    style: { ...styles.buttonOutline, padding: '6px 12px', fontSize: '12px' },
                    onClick: recargar
                }, 'Actualizar')),
            h(TablaEventos, {
                eventos, anotacion, offset, busy,
                onAnular: (ev) => { setAnulando(ev); setMotivo(''); }
            })
        ),

        h(Card, null,
            h(CardHeader, { title: 'Cerrar el resultado' }),
            h('div', { style: { fontSize: '13px', color: '#4b5563', marginBottom: '12px' } },
                'Cerrar el resultado congela el marcador derivado y deja registrado quien lo cerro. ',
                h('strong', null, 'No escribe el resultado'),
                ': los toma del ledger. Despues solo falta finalizar el partido desde la pantalla de partidos.'),
            h('button', {
                style: styles.buttonSuccess,
                disabled: busy || sellando || cerrado || reloj.estado === 'PENDIENTE',
                onClick: sellar
            }, sellando ? 'Cerrando…' : `Cerrar resultado ${local} - ${visitante}`),
            reloj.estado === 'PENDIENTE'
                ? h('div', { style: { fontSize: '11px', color: '#92400e', marginTop: '8px' } },
                    'No se puede cerrar antes de que el reloj haya arrancado: un 0-0 legitimo es indistinguible de un cierre por error.')
                : null
        ),

        h(Modal, {
            isOpen: !!anulando,
            onClose: () => { setAnulando(null); setMotivo(''); },
            onConfirm: confirmarAnulacion,
            title: `Anular evento #${anulando?.numero_evento ?? ''}`,
            confirmText: busy ? 'Anulando…' : 'Anular evento',
            message: h('div', null,
                h('p', { style: { fontSize: '13px', color: '#4b5563', marginTop: 0 } },
                    'El evento no se borra: queda anulado con tu nombre, la hora y este motivo. El marcador se descuenta solo.'),
                h('label', { style: styles.formLabel }, 'Motivo de la anulacion'),
                h('input', {
                    type: 'text',
                    value: motivo,
                    maxLength: 500,
                    autoFocus: true,
                    placeholder: 'Por ejemplo: cargado por error',
                    onChange: (e) => setMotivo(e.target.value),
                    style: styles.formInput
                }),
                h('div', { style: { fontSize: '11px', color: '#9ca3af', marginTop: '4px' } },
                    'Obligatorio. Queda guardado en el evento.')
            )
        })
    );
}

export default MatchLivePage;
