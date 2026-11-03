import React, { useState, useEffect } from 'react';
import { styles, COLORS } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Loading } from '../../components/ui/Loading.js';
import { Notification } from '../../components/ui/Modal.js';
import { IconArrowLeft } from '../../components/icons/index.js';
import presentacionService from '../../services/presentacionService.js';
import { ROUTES } from '../../config/constants.js';
import { esAdministrador } from '../../services/roles.js';

const { createElement: h } = React;

const MOMENTOS = [
    { n: 1, label: 'Momento 1', desc: 'Pose inicial → Acrobacia grupal (Tabla 1)' },
    { n: 2, label: 'Momento 2', desc: 'Desplazamientos talón-glúteos → Acrobacia individual (Tabla 3)' },
    { n: 3, label: 'Momento 3', desc: 'Salticado → Saltos girando con puño elevado' },
    { n: 4, label: 'Momento 4', desc: 'Paso gatito → Final + Acrobacia grupal (Tabla 2)' }
];

const ESCALA = [
    { valor: 1, label: 'Regular', color: '#fef3c7', text: '#92400e' },
    { valor: 2, label: 'Regular', color: '#fef3c7', text: '#92400e' },
    { valor: 3, label: 'Bien', color: '#dbeafe', text: '#1e40af' },
    { valor: 4, label: 'Muy Bien', color: '#dcfce7', text: '#166534' },
    { valor: 5, label: 'Muy Bien', color: '#dcfce7', text: '#166534' }
];

// Los ocho puntajes de cada trío, con el nombre con el que se los muestra al

const CAMPOS_HOJA = [1, 2, 3, 4].flatMap(n => ([
    { campo: `coord_${n}`, etiqueta: `Coordinación M${n}` },
    { campo: `desem_${n}`, etiqueta: `Desempeño M${n}` }
]));

/**
 * Qué puntajes de una hoja no están en condiciones de guardarse.
 *
 * El backend los valida uno por uno y devuelve `coord_3 1-5`: el mensaje dice qué
 * campo, pero no qué trío, y con el guardado por participante el juez se
 * enteraba del error cuando ya tenía la mitad de la hoja escrita.
 */
const faltantesDe = (ev) => CAMPOS_HOJA.filter(({ campo }) => {
    const v = ev[campo];
    const n = Number(v);
    return v === null || v === undefined || v === '' || !Number.isInteger(n) || n < 1 || n > 5;
}).map(({ etiqueta }) => etiqueta);

// `Badge` solo acepta `variant`: el `style` que se le pasaba antes se descartaba y

function getBadgeVariant(estado) {
    const e = (estado || '').toUpperCase();
    if (e === 'EN_CURSO') return 'green';
    if (e === 'FINALIZADA') return 'blue';
    if (e === 'CANCELADA') return 'red';
    return 'yellow';
}

function RadioGroup({ name, value, onChange, disabled, className }) {
    return h('div', { style: { display: 'flex', gap: '4px', justifyContent: 'center' }, className },
        ESCALA.map(opt =>
            h('label', {
                key: opt.valor,
                style: {
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '4px 8px', borderRadius: '6px', cursor: disabled ? 'not-allowed' : 'pointer',
                    backgroundColor: value === opt.valor ? opt.color : 'transparent',
                    border: value === opt.valor ? `2px solid ${opt.text}` : `1px solid ${COLORS.border}`,
                    color: value === opt.valor ? opt.text : COLORS.textMedium,
                    fontWeight: value === opt.valor ? 600 : 400,
                    fontSize: '11px', minWidth: '44px', transition: 'all 0.15s',
                    opacity: disabled ? 0.6 : 1
                }
            },
                h('input', {
                    type: 'radio', name, value: opt.valor,
                    checked: value === opt.valor,
                    onChange: () => !disabled && onChange(opt.valor),
                    disabled, style: { display: 'none' }
                }),
                h('span', null, opt.valor),
                h('span', { style: { fontSize: '9px', marginTop: '2px', opacity: 0.8 } }, opt.label)
            )
        )
    );
}

function TotalCell({ value, color = COLORS.text }) {
    return h('div', { style: { fontWeight: 700, fontSize: '16px', color, textAlign: 'center' } }, value ?? '—');
}

function GymScoringPage({ match: presentacionId, onNavigate, user }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notif, setNotif] = useState(null);
    const [evaluacion, setEvaluacion] = useState({});

    useEffect(() => {
        if (!presentacionId) return;
        setLoading(true);
        presentacionService.getDetalleEvaluacion(presentacionId)
            .then(d => {
                setData(d);
                // `evaluaciones` trae una fila por participante y por juez, o sea

                const evals = {};
                const uid = String(d.currentUserId);
                for (const e of Object.values(d.evaluaciones || {})) {
                    if (String(e.id_juez) !== uid) continue;
                    evals[e.id_equipo] = {
                        coord_1: e.coord_1, desem_1: e.desem_1,
                        coord_2: e.coord_2, desem_2: e.desem_2,
                        coord_3: e.coord_3, desem_3: e.desem_3,
                        coord_4: e.coord_4, desem_4: e.desem_4,
                        observaciones: e.observaciones
                    };
                }
                setEvaluacion(evals);
            })
            .catch(err => setNotif({ message: 'Error: ' + err.message, type: 'error' }))
            .finally(() => setLoading(false));
    }, [presentacionId]);

    // Los errores no se auto-cercan a los 3 s: el de puntajes incompletos nombra

    useEffect(() => {
        if (!notif || notif.type === 'error') return;
        const t = setTimeout(() => setNotif(null), 3000);
        return () => clearTimeout(t);
    }, [notif]);

    const handleChange = (participanteId, campo, valor) => {
        setEvaluacion(prev => ({
            ...prev,
            [participanteId]: { ...prev[participanteId], [campo]: valor }
        }));
    };

    const handleSave = async () => {
        if (!data) return;

        // Revisar la hoja entera ANTES de mandar el primer request. Antes el

        const incompletos = data.participantes
            .map(p => ({ p, campos: faltantesDe(evaluacion[p.id_equipo] || {}) }))
            .filter(({ campos }) => campos.length > 0);

        if (incompletos.length) {
            const detalle = incompletos
                .map(({ p, campos }) => `${p.equipo_nombre}: ${campos.join(', ')}`)
                .join(' · ');
            setNotif({
                message: incompletos.length === 1
                    ? `Faltan puntajes en ${detalle}`
                    : `${incompletos.length} tríos con puntajes incompletos — ${detalle}`,
                type: 'error'
            });
            return;
        }

        setSaving(true);
        try {
            // El backend resuelve el juez desde el token, así que acá no hay que

            for (const p of data.participantes) {
                const ev = evaluacion[p.id_equipo] || {};
                await presentacionService.guardarEvaluacion(data.presentacion.id_presentacion, {
                    id_participante_equipo: p.id_equipo,
                    ...ev
                });
            }
            setNotif({ message: 'Evaluación guardada', type: 'success' });
        } catch (err) {
            setNotif({ message: 'Error al guardar: ' + err.message, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const getTotalCoord = (pid) => {
        const ev = evaluacion[pid] || {};
        return [1,2,3,4].reduce((s, n) => s + (ev[`coord_${n}`] || 0), 0);
    };
    const getTotalDesem = (pid) => {
        const ev = evaluacion[pid] || {};
        return [1,2,3,4].reduce((s, n) => s + (ev[`desem_${n}`] || 0), 0);
    };

    if (loading) return h(Loading, { message: 'Cargando hoja de evaluación...' });
    // Misma caja de error que el resto de las paginas, no un texto suelto.
    if (!data) return h('div', {
        style: { color: '#ef4444', padding: '12px', marginBottom: '16px', backgroundColor: '#fee2e2', borderRadius: '6px' }
    }, 'No se pudo cargar la presentación');

    const { presentacion, participantes, jueces } = data;
    const esJuez = jueces.some(j => j.id_usuario === data.currentUserId);
    const esAdmin = esAdministrador(user);
    // El administrador carga su propia hoja aunque no figure en el jurado de esta

    const puedePuntuar = esJuez || esAdmin;
    // `guardarHoja` rechaza con "Solo se puede evaluar una presentacion EN_CURSO"

    const enCurso = presentacion.estado === 'EN_CURSO';
    const puedeEditar = puedePuntuar && enCurso;
    // Por que el boton esta apagado, escrito donde uno lo busca en vez de

    const motivoGuardar = !puedePuntuar
        ? 'Solo el jurado de esta presentación y el administrador pueden cargar la hoja'
        : !enCurso
            ? `La hoja se guarda con el encuentro en EN_CURSO (ahora está ${presentacion.estado})`
            : '';

    // Sin padding ni `height: '100%'` en la raiz: `MainLayout` ya pone el

    return h('div', null,
        h('div', { style: { marginBottom: '16px' } },
            h('h1', {
                style: { fontSize: '24px', fontWeight: 'bold', color: styles.cardTitle.color, marginBottom: '4px' }
            }, 'Hoja de evaluación'),
            h('p', {
                style: { fontSize: '14px', color: COLORS.textMedium, display: 'flex', alignItems: 'center', gap: '8px' }
            },
                `${presentacion.torneo_nombre} · Presentación ${presentacion.orden} · ${presentacion.disciplina_nombre}`,
                h(Badge, { variant: getBadgeVariant(presentacion.estado) }, presentacion.estado)
            )
        ),

        // Aviso con el mismo formato de los demas recuadros del app (ver el de

        esAdmin && !esJuez
            ? h('div', {
                style: {
                    background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e',
                    padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '12px'
                }
            }, 'Estás puntuando como administrador y no figuras en el jurado de esta presentación. Se guarda como una hoja aparte y NO suma al resultado oficial, que es el promedio de las hojas de los jueces del jurado.')
            : null,

        // El encuentro todavia no empezo (o ya termino) y el backend no acepta

        puedePuntuar && !puedeEditar
            ? h('div', {
                style: {
                    background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e',
                    padding: '10px 14px', borderRadius: '6px', fontSize: '13px', marginBottom: '12px'
                }
            }, `Este encuentro no está en curso (${presentacion.estado}): la hoja se completa mientras dura la presentación, en EN_CURSO. Ahora se ve en solo lectura.`)
            : null,

        h(Card, null,
            // Titulo, leyenda y acciones en el `CardHeader`, como en el alta de

            h(CardHeader, { title: 'Puntuación' },
                h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' } },
                    h('span', { style: { fontSize: '13px', color: COLORS.textMedium } },
                        'Regular: 1-2  |  Bien: 3  |  Muy Bien: 4-5'),
                    h('button', {
                        style: { ...styles.buttonOutline, display: 'flex', alignItems: 'center', gap: '6px' },
                        onClick: () => onNavigate(ROUTES.GYM_PRESENTACIONES)
                    }, h(IconArrowLeft), 'Volver'),
                    h('button', {
                        style: styles.buttonPrimary,
                        onClick: handleSave,
                        disabled: saving || !puedeEditar,
                        title: motivoGuardar || undefined
                    }, saving ? 'Guardando...' : 'Guardar evaluación')
                )
            ),

            // La grilla de la hoja se arma con `<table>` a mano y no con el

            h('div', { style: { overflowX: 'auto' } },
                h('table', { style: { ...styles.table, fontSize: '12px' } },
                    h('thead', null,
                        h('tr', { style: { ...styles.tableHeader, borderBottom: `2px solid ${COLORS.border}` } },
                            h('th', {
                                style: {
                                    ...styles.tableHeaderCell, width: '180px', position: 'sticky', left: 0,
                                    background: COLORS.background, zIndex: 1
                                }
                            }, 'Trío'),
                            ...MOMENTOS.flatMap(m => [
                                h('th', {
                                    key: `c${m.n}`,
                                    style: {
                                        ...styles.tableHeaderCell, width: '180px', textAlign: 'center',
                                        borderLeft: `1px solid ${COLORS.border}`, whiteSpace: 'normal'
                                    },
                                    colSpan: 2
                                },
                                    h('div', { style: { fontWeight: 600 } }, m.label),
                                    h('div', { style: { fontSize: '10px', color: COLORS.textMuted } }, m.desc)
                                )
                            ]),
                            h('th', {
                                style: {
                                    ...styles.tableHeaderCell, width: '100px', textAlign: 'center', whiteSpace: 'normal',
                                    borderLeft: `2px solid ${COLORS.border}`, background: COLORS.bgLight
                                }
                            }, 'Total Coord.'),
                            h('th', {
                                style: {
                                    ...styles.tableHeaderCell, width: '100px', textAlign: 'center', whiteSpace: 'normal',
                                    background: COLORS.bgLight
                                }
                            }, 'Total Desem.'),
                            h('th', {
                                style: {
                                    ...styles.tableHeaderCell, width: '90px', textAlign: 'center', whiteSpace: 'normal',
                                    borderLeft: `2px solid ${COLORS.border}`, background: '#fef3c7', fontWeight: 700
                                }
                            }, 'TOTAL')
                        )
                    ),
                    h('tbody', null,
                        participantes.map(p => {
                            const ev = evaluacion[p.id_equipo] || {};
                            const totalCoord = getTotalCoord(p.id_equipo);
                            const totalDesem = getTotalDesem(p.id_equipo);
                            const total = totalCoord + totalDesem;
                            // `completo` estaba calculado y no se usaba en ninguna

                            const completo = CAMPOS_HOJA.every(({ campo }) => ev[campo]);

                            return h('tr', { key: p.id_equipo, style: styles.tableRow },
                                h('td', { style: { ...styles.tableCell, fontWeight: 500, position: 'sticky', left: 0, background: COLORS.surface, zIndex: 1 } },
                                    h('div', null, p.equipo_nombre),
                                    // Sin el nombre de institucion se muestra el id

                                    p.institucion_nombre && h('div', { style: { fontSize: '11px', color: COLORS.textMuted } }, p.institucion_nombre),
                                    !completo && puedeEditar && h('div', {
                                        style: { fontSize: '11px', fontWeight: 600, color: '#b91c1c', marginTop: '2px' }
                                    }, 'Incompleto')
                                ),
                                ...MOMENTOS.flatMap(m => [
                                    h('td', { key: `coord${m.n}`, style: { padding: '4px', textAlign: 'center' } },
                                        h(RadioGroup, {
                                            name: `coord_${m.n}_${p.id_equipo}`,
                                            value: ev[`coord_${m.n}`],
                                            onChange: v => handleChange(p.id_equipo, `coord_${m.n}`, v),
                                            disabled: !puedeEditar
                                        })
                                    ),
                                    h('td', { key: `desem${m.n}`, style: { padding: '4px', textAlign: 'center', borderLeft: `1px solid ${COLORS.border}` } },
                                        h(RadioGroup, {
                                            name: `desem_${m.n}_${p.id_equipo}`,
                                            value: ev[`desem_${m.n}`],
                                            onChange: v => handleChange(p.id_equipo, `desem_${m.n}`, v),
                                            disabled: !puedeEditar
                                        })
                                    )
                                ]),
                                h('td', { style: { ...styles.tableCell, textAlign: 'center', borderLeft: `2px solid ${COLORS.border}`, background: COLORS.bgLight } },
                                    h(TotalCell, { value: totalCoord || '—', color: totalCoord ? '#1e40af' : COLORS.textMuted })
                                ),
                                h('td', { style: { ...styles.tableCell, textAlign: 'center', background: COLORS.bgLight } },
                                    h(TotalCell, { value: totalDesem || '—', color: totalDesem ? '#1e40af' : COLORS.textMuted })
                                ),
                                h('td', { style: { ...styles.tableCell, textAlign: 'center', borderLeft: `2px solid ${COLORS.border}`, background: '#fef3c7' } },
                                    h(TotalCell, { value: (totalCoord + totalDesem) || '—', color: total ? '#92400e' : COLORS.textMuted })
                                )
                            );
                        })
                    )
                )
            )
        ),

        // Sin `marginTop`: `styles.card` ya separa las tarjetas de la pantalla.
        h(Card, null,
            h(CardHeader, { title: 'Observaciones' }),
            h('div', { style: { display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' } },
                participantes.map(p => {
                    const ev = evaluacion[p.id_equipo] || {};
                    return h('div', { key: p.id_equipo, style: { border: `1px solid ${COLORS.border}`, borderRadius: '8px', padding: '12px' } },
                        h('div', { style: { fontWeight: 600, marginBottom: '8px' } }, p.equipo_nombre),
                        h('textarea', {
                            value: ev.observaciones || '',
                            onChange: e => handleChange(p.id_equipo, 'observaciones', e.target.value),
                            disabled: !puedeEditar,
                            placeholder: 'Observaciones del juez...',
                            style: { ...styles.formInput, width: '100%', minHeight: '80px', fontSize: '13px', resize: 'vertical' }
                        })
                    );
                })
            )
        ),

        // `Notification` en vez del recuadro fijo hecho a mano: mismo cartelito

        notif && h(Notification, {
            message: notif.message,
            type: notif.type,
            onClose: () => setNotif(null)
        })
    );
}

export { GymScoringPage };