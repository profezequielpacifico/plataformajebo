import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Loading } from '../../components/ui/Loading.js';
import { courtService } from '../../services/courtService.js';
import disciplineService from '../../services/disciplineService.js';
import districtService from '../../services/districtService.js';

const { createElement: h } = React;

export function CourtFormPage({ onNavigate, pageParams }) {
    const courtId = pageParams?.id;
    const isEdit = !!courtId;

    const [form, setForm] = useState({
        nombre: '',
        ubicacion: '',
        link_maps: '',
        id_disciplina: '',
        id_distrito: ''
    });
    const [disciplines, setDisciplines] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [horarios, setHorarios] = useState([]);
    const [horariosReady, setHorariosReady] = useState(false);
    const [schedule, setSchedule] = useState({});

    const DIAS_SEMANA = [
        { v: 1, label: 'Lunes' },
        { v: 2, label: 'Martes' },
        { v: 3, label: 'Miércoles' },
        { v: 4, label: 'Jueves' },
        { v: 5, label: 'Viernes' },
        { v: 6, label: 'Sábado' },
        { v: 7, label: 'Domingo' }
    ];

    const loadFilters = async () => {
        try {
            const [discRes, distRes] = await Promise.all([
                disciplineService.getAll().catch(() => []),
                districtService.getAll().catch(() => [])
            ]);
            setDisciplines(Array.isArray(discRes) ? discRes : (discRes?.data || discRes?.rows || []));
            setDistricts(Array.isArray(distRes) ? distRes : (distRes?.data || distRes?.rows || []));
        } catch (err) {
            console.error('Error loading filters:', err);
        }
    };

    const loadSchedule = async () => {
        try {
            const res = await courtService.getSchedule(courtId);
            const rows = Array.isArray(res?.data) ? res.data : [];
            const next = {};
            rows.forEach(r => {
                if (!r.dia_semana) return;
                next[r.dia_semana] = next[r.dia_semana] || {};
                next[r.dia_semana][r.id_horario_cancha] = true;
            });
            setSchedule(next);
        } catch (err) {
            console.error('Error cargando horarios de la cancha:', err);
        }
    };

    const loadCourt = async () => {
        try {
            setLoading(true);
            const res = await courtService.getById(courtId);
            const data = res?.data || res;
            if (data) {
                setForm({
                    nombre: data.nombre || '',
                    ubicacion: data.ubicacion || '',
                    link_maps: data.link_maps || '',
                    id_disciplina: data.id_disciplina ? String(data.id_disciplina) : '',
                    id_distrito: data.id_distrito ? String(data.id_distrito) : ''
                });
                await loadSchedule();
            }
        } catch {
            setError('Error al cargar cancha');
        }
        setLoading(false);
    };

    const loadHorarios = async () => {
        try {
            const res = await courtService.getHorarios();
            setHorarios(Array.isArray(res?.data) ? res.data : []);
            setHorariosReady(true);
        } catch (err) {
            console.error('Error cargando horarios:', err);
        }
    };

    useEffect(() => {
        loadFilters();
        loadHorarios();
        if (isEdit) loadCourt();
    }, []);

    const toggleHorario = (dia, idHorario) => {
        setSchedule(prev => {
            const next = { ...prev };
            const daySet = { ...(next[dia] || {}) };
            if (daySet[idHorario]) {
                delete daySet[idHorario];
                if (Object.keys(daySet).length === 0) delete next[dia];
            } else {
                daySet[idHorario] = true;
                next[dia] = daySet;
            }
            return next;
        });
    };

    const toggleDiaCompleto = (dia) => {
        setSchedule(prev => {
            const next = { ...prev };
            const daySet = { ...(next[dia] || {}) };
            const allSelected = horarios.length > 0 && horarios.every(h => daySet[h.id_horario_cancha]);
            if (allSelected) {
                delete next[dia];
            } else {
                const nuevo = { ...next[dia] };
                horarios.forEach(h => { nuevo[h.id_horario_cancha] = true; });
                if (Object.keys(nuevo).length > 0) next[dia] = nuevo;
            }
            return next;
        });
    };

    const buildScheduleItems = () => {
        const items = [];
        Object.entries(schedule).forEach(([dia, horarioIds]) => {
            Object.keys(horarioIds).forEach(idHorario => {
                items.push({ dia_semana: parseInt(dia), id_horario_cancha: parseInt(idHorario) });
            });
        });
        return items;
    };

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.nombre.trim()) {
            setError('El nombre es requerido');
            return;
        }
        if (!form.id_disciplina) {
            setError('La disciplina es requerida');
            return;
        }
        if (!form.id_distrito) {
            setError('El distrito es requerido');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const payload = {
                nombre: form.nombre.trim(),
                ubicacion: form.ubicacion.trim() || null,
                link_maps: form.link_maps.trim() || null,
                id_disciplina: parseInt(form.id_disciplina),
                id_distrito: parseInt(form.id_distrito)
            };

            let savedId = courtId;
            if (isEdit) {
                await courtService.update(courtId, payload);
            } else {
                const created = await courtService.create(payload);
                savedId = created?.data?.id_cancha || created?.data?.id || savedId;
            }

            if (savedId && horariosReady) {
                await courtService.updateSchedule(savedId, buildScheduleItems());
            }
            onNavigate('courts');
        } catch (err) {
            setError(err.message || 'Error al guardar');
        }
        setSaving(false);
    };

    const renderScheduleGrid = () => {
        const colCount = horarios.length;
        const minWidth = 120 + colCount * 96;

        const headerCell = (content) => h('div', {
            style: {
                fontSize: '12px',
                fontWeight: 700,
                color: '#374151',
                textAlign: 'center',
                padding: '6px 8px',
                backgroundColor: '#f3f4f6',
                borderRadius: '4px'
            }
        }, content);

        return h('div', { style: { overflowX: 'auto', marginTop: '12px' } },
            h('div', { style: { minWidth: `${minWidth}px`, padding: '4px 0' } },
                h('div', { style: { display: 'grid', gridTemplateColumns: `120px repeat(${colCount}, 1fr)`, gap: '4px', marginBottom: '4px' } },
                    headerCell(''),
                    horarios.map(hor => headerCell(formatHorario(hor)))
                ),
                DIAS_SEMANA.map(dia => {
                    const daySet = schedule[dia.v] || {};
                    const allSelected = colCount > 0 && horarios.every(hor => daySet[hor.id_horario_cancha]);
                    return h('div', {
                        key: dia.v,
                        style: { display: 'grid', gridTemplateColumns: `120px repeat(${colCount}, 1fr)`, gap: '4px', marginBottom: '4px' }
                    },
                        h('div', {
                            style: {
                                fontSize: '13px',
                                fontWeight: allSelected ? 700 : 500,
                                color: allSelected ? '#1d4ed8' : '#374151',
                                padding: '6px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            },
                            onClick: () => toggleDiaCompleto(dia.v),
                            title: 'Marcar o desmarcar todo el día'
                        }, dia.label),
                        horarios.map(hor => {
                            const selected = !!daySet[hor.id_horario_cancha];
                            return h('div', {
                                key: hor.id_horario_cancha,
                                onClick: () => toggleHorario(dia.v, hor.id_horario_cancha),
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '8px',
                                    border: selected ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                                    backgroundColor: selected ? '#dbeafe' : '#f9fafb',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    minHeight: '34px'
                                }
                            },
                                h('input', {
                                    type: 'checkbox',
                                    checked: selected,
                                    onChange: () => {},
                                    style: { cursor: 'pointer', accentColor: '#2563eb', width: '16px', height: '16px' }
                                })
                            );
                        })
                    );
                })
            )
        );
    };

    if (loading) return h(Loading, { message: 'Cargando cancha...' });

    return h('div', null,
        error && h('div', {
            style: { color: '#ef4444', padding: '12px', marginBottom: '16px', backgroundColor: '#fee2e2', borderRadius: '6px' }
        }, error),

        h(Card, null,
            h(CardHeader, { title: isEdit ? 'Editar Cancha' : 'Nueva Cancha' }),

            h('form', { onSubmit: handleSubmit, style: { padding: '24px' } },
                h('div', { style: styles.formGroup },
                    h('label', { style: styles.formLabel }, 'Nombre *'),
                    h('input', {
                        type: 'text',
                        value: form.nombre,
                        onChange: (e) => handleChange('nombre', e.target.value),
                        style: styles.formInput,
                        placeholder: 'Nombre de la cancha'
                    })
                ),

                h('div', { style: styles.formGroup },
                    h('label', { style: styles.formLabel }, 'Disciplina *'),
                    h('select', {
                        value: form.id_disciplina,
                        onChange: (e) => handleChange('id_disciplina', e.target.value),
                        style: styles.formSelect
                    },
                        h('option', { value: '' }, 'Seleccione disciplina'),
                        disciplines.map(d => h('option', {
                            key: d.id_disciplina || d.id,
                            value: String(d.id_disciplina || d.id)
                        }, d.nombre || d.name))
                    )
                ),

                h('div', { style: styles.formGroup },
                    h('label', { style: styles.formLabel }, 'Distrito *'),
                    h('select', {
                        value: form.id_distrito,
                        onChange: (e) => handleChange('id_distrito', e.target.value),
                        style: styles.formSelect
                    },
                        h('option', { value: '' }, 'Seleccione distrito'),
                        districts.map(d => h('option', {
                            key: d.id_distrito || d.id,
                            value: String(d.id_distrito || d.id)
                        }, d.nombre || d.name))
                    )
                ),

                h('div', { style: styles.formGroup },
                    h('label', { style: styles.formLabel }, 'Ubicación'),
                    h('input', {
                        type: 'text',
                        value: form.ubicacion,
                        onChange: (e) => handleChange('ubicacion', e.target.value),
                        style: styles.formInput,
                        placeholder: 'Dirección o referencia'
                    })
                ),

                h('div', { style: styles.formGroup },
                    h('label', { style: styles.formLabel }, 'Link Google Maps'),
                    h('input', {
                        type: 'url',
                        value: form.link_maps,
                        onChange: (e) => handleChange('link_maps', e.target.value),
                        style: styles.formInput,
                        placeholder: 'https://maps.google.com/...'
                    })
                ),

                h('div', { style: { marginTop: '24px', borderTop: '1px solid #e5e7eb', paddingTop: '20px' } },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' } },
                        h('div', null,
                            h('label', { style: { ...styles.formLabel, fontSize: '15px', fontWeight: 700, marginBottom: '4px' } }, 'Días y Horarios Disponibles'),
                            h('p', { style: { fontSize: '13px', color: '#6b7280', margin: 0 } },
                                'Marcá en qué días y franjas horarias la cancha está disponible para asignar horarios.')
                        ),
                        h('span', {
                            style: {
                                padding: '4px 10px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 600,
                                backgroundColor: '#eff6ff',
                                color: '#1d4ed8'
                            }
                        }, `${buildScheduleItems().length} horario(s) seleccionados`)
                    ),
                    h('p', { style: { fontSize: '12px', color: '#9ca3af', marginTop: '8px' } },
                        'Hacé clic en el nombre del día para marcarlo o desmarcarlo completo.'),
                    !horariosReady
                        ? h('p', { style: { fontSize: '13px', color: '#9ca3af', marginTop: '12px' } }, 'Cargando horarios...')
                        : renderScheduleGrid()
                ),

                h('div', { style: { display: 'flex', gap: '12px', marginTop: '20px' } },
                    h('button', {
                        type: 'submit',
                        style: { ...styles.buttonPrimary, padding: '10px 24px' },
                        disabled: saving
                    }, saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear')),
                    h('button', {
                        type: 'button',
                        style: { ...styles.buttonOutline, padding: '10px 24px' },
                        onClick: () => onNavigate('courts')
                    }, 'Cancelar')
                )
            )
        )
    );
}

export default CourtFormPage;

function formatHorario(hor) {
    const inicio = (hor.hora_inicio || '').slice(0, 5);
    const fin = (hor.hora_fin || '').slice(0, 5);
    if (inicio && fin) return `${inicio} - ${fin}`;
    return inicio || '--:--';
}
