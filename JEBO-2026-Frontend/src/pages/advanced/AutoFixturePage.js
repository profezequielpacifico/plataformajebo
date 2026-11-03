import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Loading } from '../../components/ui/Loading.js';
import { IconArrowLeft, IconCheck, IconAlertCircle } from '../../components/icons/index.js';
import tournamentService from '../../services/tournamentService.js';
import { soloTorneosConPartidos } from '../../services/tiposCompetencia.js';
import fixtureService from '../../services/fixtureService.js';

const { createElement: h } = React;

const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};

const modalCardStyle = {
    width: '100%',
    maxWidth: '460px',
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '28px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
    textAlign: 'center'
};

export function AutoFixturePage({ onNavigate }) {
    const [tournaments, setTournaments] = useState([]);
    const [selectedTournament, setSelectedTournament] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingStatus, setLoadingStatus] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [statusMap, setStatusMap] = useState({});
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        tournamentService.getAll(1, 100)
            .then(async (tourRes) => {
                const data = tourRes.data || tourRes || [];
                const raw = Array.isArray(data) ? data : (data.rows || []);
                // Un fixture ES una lista de partidos local/visitante, así que

                const list = soloTorneosConPartidos(raw);
                setTournaments(list);
                const checks = {};
                await Promise.all(list.map(async (t) => {
                    try {
                        const res = await fixtureService.getStatus(String(t.id_torneo || t.id));
                        const s = res.data || res;
                        if (s && typeof s.generado === 'boolean') checks[t.id_torneo || t.id] = s.generado;
                    } catch { /* ignore */ }
                }));
                setStatusMap(checks);
            })
            .catch(err => console.error('Error loading tournaments:', err))
            .finally(() => setLoading(false));
    }, []);
    return h(Card, null,
        h(CardHeader, { title: 'Auto Selección Partidos' }),
        h('div', { style: { padding: '24px' } },

            loading
                ? h(Loading, { message: 'Cargando torneos...' })
                : h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } },
                    h('div', { style: styles.formGroup },
                        h('label', { style: styles.formLabel }, 'Torneo *'),
h('select', {
                            value: selectedTournament,
                            onChange: (e) => { setSelectedTournament(e.target.value); setResult(null); },
                            style: styles.formSelect,
                            disabled: loadingStatus
                        },
                            h('option', { value: '' }, 'Seleccione torneo'),
                            tournaments.map(t => {
                                const generado = statusMap[t.id_torneo || t.id];
                                return h('option', {
                                    key: t.id_torneo || t.id,
                                    value: String(t.id_torneo || t.id),
                                    disabled: generado
                                }, `${t.nombre || t.name}${generado ? ' (Ya generado)' : ''}`);
                            })
                        ),

                    result && h('div', {
                        style: result.success
                            ? { ...styles.successContainer, padding: '16px' }
                            : { ...styles.errorContainer, padding: '16px' },
                        id: 'auto-fixture-result'
                    }, result.message),

                    error && h('div', {
                        style: { padding: '10px 12px', borderRadius: '8px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '13px' },
                        id: 'auto-fixture-error'
                    }, error),

                    h('div', { style: { display: 'flex', gap: '12px', marginTop: '8px' } },
                        h('button', {
                            style: { ...styles.buttonPrimary, disabled: generating || !selectedTournament || loadingStatus },
                            disabled: generating || !selectedTournament || loadingStatus,
                            onClick: async () => {
                                setError('');
                                setLoadingStatus(true);
                                try {
                                    const res = await fixtureService.getStatus(selectedTournament);
                                    const d = res.data || res;
                                    if (d && d.generado) {
                                        setResult({ success: false, message: 'Este torneo ya tiene asignación de partidos y no se puede repetir.' });
                                    } else {
                                        setShowConfirm(true);
                                    }
                                } catch (err) {
                                    setResult({ success: false, message: err.message || 'No se pudo verificar el torneo.' });
                                } finally {
                                    setLoadingStatus(false);
                                }
                            }
                        }, h(IconCheck), loadingStatus ? 'Verificando...' : 'Confirmar'),

                        h('button', {
                            style: styles.buttonOutline,
                            onClick: () => onNavigate('advanced-options')
                        }, h(IconArrowLeft), 'Cancelar')
                    )
                )
        ),
        showConfirm && h('div', { style: modalOverlayStyle },
            h('div', { style: modalCardStyle },
                h('div', {
                    style: {
                        width: '52px', height: '52px', margin: '0 auto 16px', borderRadius: '50%',
                        backgroundColor: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }
                }, h(IconAlertCircle, { size: 28 })),
                h('div', { style: { fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '10px' } }, '¿Confirmar auto selección?'),
                h('div', { style: { fontSize: '14px', color: '#6b7280', lineHeight: '1.6', marginBottom: '8px' } },
                    'Se generarán automáticamente los partidos del torneo seleccionado asignándoles los días y horarios disponibles configurados en las canchas. Esta operación no se podrá repetir con el mismo torneo hasta que este vence.'
                ),
                h('div', {
                    style: {
                        fontSize: '12px', color: '#b45309', backgroundColor: '#fffbeb', border: '1px solid #fde68a',
                        borderRadius: '8px', padding: '10px 12px', margin: '12px 0'
                    }
                }, 'ADVERTENCIA: Esta acción no se puede deshacer.'),
                h('div', { style: { display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '18px' } },
                    h('button', {
                        style: styles.buttonOutline,
                        disabled: generating,
                        onClick: () => setShowConfirm(false)
                    }, 'Cancelar'),
                    h('button', {
                        style: { ...styles.buttonPrimary, backgroundColor: '#dc2626' },
                        disabled: generating,
                        onClick: async () => {
                            setGenerating(true);
                            try {
                                const res = await fixtureService.generate(selectedTournament);
                                const d = res.data || res;
                                setResult({ success: true, message: `Fixture generado: ${(d && d.partidos) || 0} partidos en ${(d && d.rondas) || 0} rondas.` });
                                setShowConfirm(false);
                            } catch (err) {
                                setError(err.response && err.response.data && err.response.data.error
                                    ? err.response.data.error
                                    : (err.message || 'Ocurrió un error al generar el fixture.'));
                                setShowConfirm(false);
                            } finally {
                                setGenerating(false);
                            }
                        }
                    }, generating ? 'Generando...' : 'Sí, continuar')
                )
            )
        )
    )
    );
}

export default AutoFixturePage;