import React, { useState, useEffect, useCallback } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell } from '../../components/ui/Table.js';
import { Loading } from '../../components/ui/Loading.js';
import { Modal } from '../../components/ui/Modal.js';
import { IconArrowLeft, IconCheck, IconPlus } from '../../components/icons/index.js';
import stageInstanceService from '../../services/stageInstanceService.js';
import { matchService } from '../../services/matchService.js';
import { ETIQUETAS_AMBITO, ETIQUETAS_MODALIDAD, describirOrigen } from './etapaReglas.js';

const { createElement: h } = React;

const COLORES_ESTADO = {
    Pendiente: { backgroundColor: '#fef3c7', color: '#92400e' },
    'En Progreso': { backgroundColor: '#d1fae5', color: '#065f46' },
    Finalizada: { backgroundColor: '#dbeafe', color: '#1e40af' }
};

const normalizar = (texto) => String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const mensajeDe = (err) => err?.response?.data?.message || err?.message || 'Ocurrió un error';

function EstadoBadge({ estado }) {
    const colores = COLORES_ESTADO[estado] || { backgroundColor: '#f3f4f6', color: '#374151' };
    return h('span', {
        style: { ...colores, padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }
    }, estado);
}

function TarjetaEtapa({ etapa, activa, onSelect }) {
    return h('button', {
        type: 'button',
        onClick: onSelect,
        'aria-pressed': activa,
        style: {
            textAlign: 'left',
            padding: '12px',
            minWidth: '190px',
            flex: '1 1 190px',
            cursor: 'pointer',
            backgroundColor: activa ? '#eff6ff' : '#ffffff',
            border: activa ? '2px solid #2563eb' : '1px solid #e5e7eb',
            borderRadius: '8px'
        }
    },
        h('div', { style: { fontSize: '12px', color: '#6b7280' } }, `Etapa ${etapa.orden}`),
        h('div', { style: { fontWeight: 700, fontSize: '15px', color: '#111827', margin: '2px 0 6px' } }, etapa.nombre),
        h(EstadoBadge, { estado: etapa.estado }),
        h('div', { style: { fontSize: '12px', color: '#4b5563', marginTop: '8px' } }, ETIQUETAS_MODALIDAD[etapa.modalidad] || etapa.modalidad),
        h('div', { style: { fontSize: '12px', color: '#4b5563' } }, `Vienen de: ${describirOrigen(etapa)}`)
    );
}

function ResumenReglas({ etapa }) {
    const clasificacion = `${etapa.clasifican_por_instancia} por instancia`
        + (etapa.mejores_adicionales > 0 ? ` + ${etapa.mejores_adicionales} mejores` : '');
    const items = [
        ['Ámbito', ETIQUETAS_AMBITO[etapa.ambito] || etapa.ambito],
        ['Modalidad', ETIQUETAS_MODALIDAD[etapa.modalidad] || etapa.modalidad],
        ['Vienen de', describirOrigen(etapa)],
        ['Clasifican', clasificacion],
        ['Si queda un solo equipo', etapa.avanza_si_unico ? 'Avanza directo' : 'Espera definición']
    ];
    return h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '12px 16px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' } },
        items.map(([titulo, valor]) => h('div', { key: titulo },
            h('div', { style: { fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' } }, titulo),
            h('div', { style: { fontSize: '13px', fontWeight: 600, color: '#111827' } }, valor)
        ))
    );
}

function TablaPosiciones({ detalle }) {
    const evaluacion = detalle.etapa.modalidad === 'EVALUACION';
    const columnas = evaluacion
        ? ['#', 'Equipo', 'Puntaje', 'Coordinación', 'Muy bien', 'Regular', 'Estado']
        : ['#', 'Equipo', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DIF', 'Pts', 'Estado'];
    const estadoDe = (fila) => {
        if (fila.clasificado) return h('span', { style: { color: '#15803d', fontWeight: 700 } }, 'Clasificado');
        return fila.empatado && detalle.pendientes === 0 ? h('span', { style: { color: '#b45309' } }, 'Empatado') : '-';
    };
    return h(Table, null,
        h(TableHeader, null, columnas.map((c) => h(TableHeaderCell, { key: c }, c))),
        h('tbody', null, detalle.tabla.map((f) => h(TableRow, {
            key: f.id_equipo,
            style: f.clasificado ? { backgroundColor: '#f0fdf4' } : {}
        },
            h(TableCell, null, f.posicion),
            h(TableCell, { style: { fontWeight: 500 } }, f.equipo_nombre),
            ...(evaluacion
                ? [f.puntaje_promedio ?? '-', f.coord_promedio ?? '-', f.muy_bien_total ?? '-', f.regular_total ?? '-']
                : [f.pj, f.pg, f.pe, f.pp, f.gf, f.gc, f.gf - f.gc, h('strong', null, f.puntos)]
            ).map((valor, indice) => h(TableCell, { key: indice }, valor)),
            h(TableCell, null, estadoDe(f))
        )))
    );
}

function ListaEncuentros({ detalle, onNavigate, onError, onCambio }) {
    const finalizarPartido = async (partido) => {
        try {
            await matchService.updateStatus(partido.id_partido, { estado: 'Finalizado' });
            await onCambio();
        } catch (err) {
            onError(mensajeDe(err));
        }
    };

    const jugar = async (partido) => {
        try {
            if (partido.estado === 'Pendiente') {
                await matchService.updateStatus(partido.id_partido, { estado: 'En Juego' });
            }
            onNavigate('match-live/' + partido.id_partido);
        } catch (err) {
            onError(mensajeDe(err));
        }
    };

    if (detalle.encuentros.length === 0) {
        return h('p', { style: { padding: '16px', color: '#6b7280', fontSize: '14px' } }, 'Todavía no hay encuentros generados.');
    }
    if (detalle.etapa.modalidad === 'EVALUACION') {
        return h(Table, null,
            h(TableHeader, null, ['Orden', 'Trío', 'Estado'].map((c) => h(TableHeaderCell, { key: c }, c))),
            h('tbody', null, detalle.encuentros.map((p) => h(TableRow, { key: p.id_presentacion },
                h(TableCell, null, p.orden),
                h(TableCell, null, p.equipo_nombre),
                h(TableCell, null, p.estado)
            )))
        );
    }
    return h(Table, null,
        h(TableHeader, null, ['Fecha', 'Local', 'Resultado', 'Visitante', 'Estado', ''].map((c, i) => h(TableHeaderCell, { key: i }, c))),
        h('tbody', null, detalle.encuentros.map((p) => h(TableRow, { key: p.id_partido },
            h(TableCell, null, p.ronda ?? '-'),
            h(TableCell, null, p.local_nombre),
            h(TableCell, { style: { fontWeight: 700, whiteSpace: 'nowrap' } }, `${p.puntos_local} - ${p.puntos_visitante}`),
            h(TableCell, null, p.visitante_nombre),
            h(TableCell, null, p.estado),
            h(TableCell, null,
                p.estado !== 'Finalizado' && !p.resultado_cargado && h('button', {
                    type: 'button',
                    style: { ...styles.buttonOutline, padding: '4px 10px' },
                    onClick: () => jugar(p)
                }, p.estado === 'Pendiente' ? 'Jugar' : 'Continuar'),
                p.estado !== 'Finalizado' && p.resultado_cargado && h('button', {
                    type: 'button',
                    style: { ...styles.buttonSuccess, padding: '4px 10px' },
                    onClick: () => finalizarPartido(p)
                }, 'Finalizar partido')
            )
        )))
    );
}

function DetalleInstancia({ idInstancia, onCerrar, onCambio, onNavigate }) {
    const [detalle, setDetalle] = useState(null);
    const [error, setError] = useState('');
    const [trabajando, setTrabajando] = useState(false);
    const [elegidos, setElegidos] = useState([]);
    const [confirmar, setConfirmar] = useState(false);

    const cargar = useCallback(async () => {
        try {
            setDetalle(await stageInstanceService.getDetalle(idInstancia));
        } catch (err) {
            setError(mensajeDe(err));
        }
    }, [idInstancia]);

    useEffect(() => { cargar(); }, [cargar]);

    const ejecutar = async (accion) => {
        setTrabajando(true);
        setError('');
        try {
            await accion();
            await cargar();
            await onCambio();
        } catch (err) {
            setError(mensajeDe(err));
        }
        setTrabajando(false);
    };

    if (!detalle) {
        return error
            ? h('div', { role: 'alert', style: { color: '#ef4444', padding: '16px' } }, error)
            : h(Loading);
    }

    const { instancia, etapa, empate_en_corte: empate, pendientes, tabla } = detalle;
    const abierta = instancia.estado !== 'Finalizada';
    const empatados = tabla.filter((f) => detalle.empatados.includes(f.equipo_nombre));
    const posicionEmpate = empatados[0]?.posicion;
    const seguros = empate ? tabla.filter((f) => f.posicion < posicionEmpate).length : 0;
    const cupos = etapa.clasifican_por_instancia - seguros;
    const puedeFinalizar = abierta && instancia.encuentros_generados && pendientes === 0 && (!empate || elegidos.length === cupos);

    const alternar = (id) => setElegidos((actual) => (actual.includes(id)
        ? actual.filter((x) => x !== id)
        : [...actual, id]));

    return h('div', { style: { borderTop: '1px solid #e5e7eb', marginTop: '8px' } },
        h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '16px' } },
            h('div', null,
                h('h3', { style: { fontSize: '18px', fontWeight: 700, margin: 0, color: '#111827' } }, instancia.nombre, ' ', h(EstadoBadge, { estado: instancia.estado })),
                detalle.territorios.length > 0 && h('div', { style: { fontSize: '13px', color: '#6b7280', marginTop: '4px' } }, detalle.territorios.join(', '))
            ),
            h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                abierta && !instancia.encuentros_generados && h('button', {
                    type: 'button',
                    style: styles.buttonPrimary,
                    disabled: trabajando,
                    onClick: () => ejecutar(() => stageInstanceService.generarEncuentros(idInstancia))
                }, h(IconPlus), 'Generar encuentros'),
                abierta && instancia.encuentros_generados && h('button', {
                    type: 'button',
                    style: { ...styles.buttonSuccess, opacity: puedeFinalizar ? 1 : 0.5 },
                    disabled: trabajando || !puedeFinalizar,
                    onClick: () => setConfirmar(true)
                }, h(IconCheck), 'Finalizar y clasificar'),
                h('button', { type: 'button', style: styles.buttonOutline, onClick: onCerrar }, 'Cerrar')
            )
        ),
        error && h('div', { role: 'alert', style: { color: '#b91c1c', backgroundColor: '#fee2e2', padding: '10px 16px', margin: '0 16px 12px', borderRadius: '6px' } }, error),
        abierta && pendientes > 0 && h('div', { style: { color: '#92400e', backgroundColor: '#fef3c7', padding: '10px 16px', margin: '0 16px 12px', borderRadius: '6px', fontSize: '14px' } },
            `Faltan ${pendientes} encuentro(s) para poder finalizar.`),
        abierta && empate && pendientes === 0 && h('div', { style: { backgroundColor: '#fff7ed', border: '1px solid #fdba74', padding: '12px 16px', margin: '0 16px 12px', borderRadius: '6px' } },
            h('div', { style: { fontWeight: 600, color: '#9a3412', marginBottom: '8px', fontSize: '14px' } },
                `Empate que los criterios no resuelven. Elegí ${cupos} equipo(s) después de definirlo (por ejemplo, con un sorteo):`),
            empatados.map((f) => h('label', { key: f.id_equipo, style: { display: 'block', fontSize: '14px', padding: '2px 0' } },
                h('input', {
                    type: 'checkbox',
                    checked: elegidos.includes(f.id_equipo),
                    onChange: () => alternar(f.id_equipo),
                    style: { marginRight: '8px' }
                }),
                f.equipo_nombre
            ))
        ),
        h(TablaPosiciones, { detalle }),
        h('h4', { style: { fontSize: '15px', fontWeight: 700, padding: '16px 16px 0', margin: 0, color: '#111827' } }, 'Encuentros'),
        h(ListaEncuentros, {
            detalle,
            onNavigate,
            onError: setError,
            onCambio: async () => {
                await cargar();
                await onCambio();
            }
        }),
        confirmar && h(Modal, {
            isOpen: true,
            title: 'Finalizar instancia',
            message: `Vas a cerrar "${instancia.nombre}" y confirmar a sus clasificados. Esta acción no se puede deshacer desde la pantalla.`,
            confirmText: 'Finalizar',
            cancelText: 'Cancelar',
            onClose: () => setConfirmar(false),
            onConfirm: () => {
                setConfirmar(false);
                ejecutar(() => stageInstanceService.finalizar(idInstancia, empate ? elegidos : undefined));
            }
        })
    );
}

export function TournamentStagesPage({ onNavigate, pageParams }) {
    const idTorneo = pageParams?.id;
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState('');
    const [idEtapa, setIdEtapa] = useState(null);
    const [idInstancia, setIdInstancia] = useState(null);
    const [busqueda, setBusqueda] = useState('');
    const [trabajando, setTrabajando] = useState(false);

    const cargar = useCallback(async () => {
        try {
            const respuesta = await stageInstanceService.getPorTorneo(idTorneo);
            setDatos(respuesta);
            setIdEtapa((actual) => {
                if (actual) return actual;
                const enCurso = respuesta.etapas.find((e) => e.estado === 'En Progreso');
                return (enCurso || respuesta.etapas[0])?.id_etapa ?? null;
            });
        } catch (err) {
            setError(mensajeDe(err));
        }
    }, [idTorneo]);

    useEffect(() => { cargar(); }, [cargar]);

    if (!datos) {
        return error ? h('div', { role: 'alert', style: { color: '#ef4444', padding: '16px' } }, error) : h(Loading);
    }

    const { torneo, etapas } = datos;
    const etapa = etapas.find((e) => e.id_etapa === idEtapa);
    const instancias = etapa?.instancias || [];
    const termino = normalizar(busqueda);
    const visibles = termino ? instancias.filter((i) => normalizar(i.nombre).includes(termino)) : instancias;

    const preparar = async () => {
        setTrabajando(true);
        setError('');
        try {
            await stageInstanceService.prepararEtapa(etapa.id_etapa);
            setIdInstancia(null);
            await cargar();
        } catch (err) {
            setError(mensajeDe(err));
        }
        setTrabajando(false);
    };

    return h('div', null,
        h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '16px' } },
            h('div', null,
                h('h1', { style: { fontSize: '24px', fontWeight: 'bold', color: styles.cardTitle.color, marginBottom: '4px' } }, torneo.nombre),
                h('p', { style: { fontSize: '14px', color: '#6b7280' } },
                    `${torneo.disciplina_nombre} · ${torneo.inscriptos} equipos inscriptos`,
                    torneo.tipo_competencia === 'MARCADOR'
                        ? ` · Ganar ${torneo.puntos_victoria}, empatar ${torneo.puntos_empate}, perder ${torneo.puntos_derrota}`
                        : ' · Por evaluación del jurado')
            ),
            h('button', { type: 'button', style: styles.buttonOutline, onClick: () => onNavigate('tournaments') }, h(IconArrowLeft), 'Volver')
        ),
        error && h('div', { role: 'alert', style: { color: '#b91c1c', padding: '12px', marginBottom: '16px', backgroundColor: '#fee2e2', borderRadius: '6px' } }, error),
        etapas.length === 0
            ? h(Card, null, h('p', { style: { padding: '24px', color: '#6b7280' } }, 'Este torneo no tiene etapas. Agregalas desde la edición del torneo.'))
            : h('div', null,
                h('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' } },
                    etapas.map((e) => h(TarjetaEtapa, {
                        key: e.id_etapa,
                        etapa: e,
                        activa: e.id_etapa === idEtapa,
                        onSelect: () => {
                            setIdEtapa(e.id_etapa);
                            setIdInstancia(null);
                            setBusqueda('');
                        }
                    }))
                ),
                etapa && h(Card, null,
                    h(CardHeader, { title: `${etapa.nombre}: ${instancias.length} instancia(s)` },
                        h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
                            instancias.length > 6 && h('input', {
                                type: 'text',
                                placeholder: 'Buscar instancia...',
                                'aria-label': 'Buscar instancia',
                                value: busqueda,
                                onChange: (e) => setBusqueda(e.target.value),
                                style: { ...styles.formInput, width: '200px', maxWidth: '100%', flexGrow: 1, marginBottom: 0 }
                            }),
                            etapa.estado !== 'Finalizada' && !instancias.some((i) => i.encuentros_generados) && h('button', {
                                type: 'button',
                                style: styles.buttonPrimary,
                                disabled: trabajando,
                                onClick: preparar
                            }, h(IconPlus), instancias.length > 0 ? 'Volver a preparar' : 'Preparar etapa')
                        )
                    ),
                    h(ResumenReglas, { etapa }),
                    instancias.length === 0
                        ? h('p', { style: { padding: '24px', color: '#6b7280', fontSize: '14px' } },
                            'Todavía no se prepararon las instancias. "Preparar etapa" toma a los equipos según su origen y los reparte por ámbito.')
                        : h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', padding: '16px' } },
                            visibles.map((i) => h('button', {
                                key: i.id_etapa_instancia,
                                type: 'button',
                                'aria-pressed': i.id_etapa_instancia === idInstancia,
                                onClick: () => setIdInstancia(i.id_etapa_instancia),
                                style: {
                                    textAlign: 'left',
                                    padding: '10px 12px',
                                    cursor: 'pointer',
                                    backgroundColor: i.id_etapa_instancia === idInstancia ? '#eff6ff' : '#ffffff',
                                    border: i.id_etapa_instancia === idInstancia ? '2px solid #2563eb' : '1px solid #e5e7eb',
                                    borderRadius: '8px'
                                }
                            },
                                h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' } },
                                    h('span', { style: { fontWeight: 600, fontSize: '14px', color: '#111827' } }, i.nombre),
                                    h(EstadoBadge, { estado: i.estado })
                                ),
                                h('div', { style: { fontSize: '12px', color: '#6b7280' } }, `${i.participantes} equipo(s)`),
                                i.clasificados_nombres && h('div', { style: { fontSize: '12px', color: '#15803d', marginTop: '4px' } }, `Clasifica: ${i.clasificados_nombres}`)
                            ))
                        ),
                    idInstancia && h(DetalleInstancia, {
                        key: idInstancia,
                        idInstancia,
                        onCerrar: () => setIdInstancia(null),
                        onCambio: cargar,
                        onNavigate
                    })
                )
            )
    );
}

export default TournamentStagesPage;
