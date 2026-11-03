import React, { useState, useEffect } from 'react';
import { styles, COLORS } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Loading } from '../../components/ui/Loading.js';
import { IconSave, IconArrowLeft, IconMap } from '../../components/icons/index.js';
import matchService from '../../services/matchService.js';
import tournamentService from '../../services/tournamentService.js';
import { soloTorneosConPartidos } from '../../services/tiposCompetencia.js';
import teamService from '../../services/teamService.js';
import courtService from '../../services/courtService.js';
import userService from '../../services/userService.js';

const { createElement: h } = React;

function loadInitialData(setAllCanchas, setUsuarios, setTournaments) {
    Promise.all([
        courtService.getAll(),
        userService.getAll({ rol: 'Arbitro' })
    ]).then(([courtRes, userRes]) => {
        const courtData = courtRes.data || courtRes || [];
        setAllCanchas(Array.isArray(courtData) ? courtData : []);
        const userData = userRes.data || userRes || [];
        setUsuarios(Array.isArray(userData) ? userData : []);
    }).catch(err => console.error('Error loading data:', err));

    tournamentService.getAll(1, 100).then(res => {
        const data = res.data || res || [];
        // Un torneo de Gimnasia no admite partidos: se presenta un equipo solo y

        setTournaments(soloTorneosConPartidos(Array.isArray(data) ? data : []));
    }).catch(err => console.error(err));
}

function loadEnrolledTeams(idTorneo, idDisciplina, setTeams, setLoadingTeams) {
    let cancelled = false;
    if (!idTorneo) {
        setTeams([]);
        return () => { cancelled = true; };
    }
    setLoadingTeams(true);
    const params = { id_torneo: idTorneo, limit: 100, include_cerradas: 'true' };
    // El backend devuelve todos los equipos inscriptos al torneo sin importar su
    // disciplina (inscribir no valida el deporte). Filtramos por la disciplina
    // del torneo para que solo aparezcan equipos de ese deporte.
    if (idDisciplina) params.id_disciplina = idDisciplina;
    teamService.getEnrolled(params)
        .then(res => {
            const data = res.data || res || [];
            const list = Array.isArray(data) ? data : [];
            if (!cancelled) {
                setTeams(list.map(t => ({
                    id_equipo: t.id_equipo,
                    nombre: t.equipo_nombre || t.nombre || t.name,
                    colores: t.colores
                })));
            }
        })
        .catch(err => {
            console.error('Error loading enrolled teams:', err);
            if (!cancelled) setTeams([]);
        })
        .finally(() => {
            if (!cancelled) setLoadingTeams(false);
        });
    return () => { cancelled = true; };
}

function mapMatchToFormData(data) {
    const arbitros = Array.isArray(data.arbitros)
        ? data.arbitros.map(a => String(a.id || a.id_usuario)).filter(Boolean)
        : [];
    return {
        id_torneo: String(data.id_torneo || ''),
        id_cancha: String(data.id_cancha || ''),
        id_equipo_local: String(data.id_equipo_local || ''),
        id_equipo_visitante: String(data.id_equipo_visitante || ''),
        fecha: data.fecha ? data.fecha.split('T')[0] : '',
        hora: data.hora || '',
        id_arbitro: data.id_arbitro ? String(data.id_arbitro) : '',
        arbitros
    };
}

function loadMatchData(matchId, setFormData, setIsLoading) {
    if (!matchId) return;
    setIsLoading(true);
    matchService.getById(matchId).then(res => {
        const data = res.data || res;
        if (data) {
            setFormData(mapMatchToFormData(data));
        }
    }).catch(err => console.error('Error loading match:', err))
    .finally(() => setIsLoading(false));
}

function updateFilteredCanchas(idTorneo, idCancha, tournaments, allCanchas, setFilteredCanchas, setFormData) {
    if (!idTorneo) {
        setFilteredCanchas([]);
        return;
    }
    const torneo = tournaments.find(t => String(t.id_torneo || t.id) === idTorneo);
    if (torneo && torneo.id_disciplina) {
        const filtered = allCanchas.filter(c => String(c.id_disciplina) === String(torneo.id_disciplina));
        setFilteredCanchas(filtered);
        if (idCancha && !filtered.find(c => String(c.id_cancha || c.id) === idCancha)) {
            setFormData(prev => ({ ...prev, id_cancha: '' }));
        }
    } else {
        setFilteredCanchas(allCanchas);
    }
}

function loadAvailabilitySlots(idCancha, fecha, setAvailableSlots, setLoadingSlots) {
    if (idCancha && fecha) {
        setLoadingSlots(true);
        courtService.getAvailability(idCancha, fecha)
            .then(res => {
                const data = res.data || res || [];
                setAvailableSlots(Array.isArray(data) ? data : []);
            })
            .catch(err => {
                console.error('Error loading slots:', err);
                setAvailableSlots([]);
            })
            .finally(() => setLoadingSlots(false));
    } else {
        setAvailableSlots([]);
    }
}

function updateSelectedCancha(idCancha, filteredCanchas, setSelectedCancha) {
    if (idCancha) {
        const cancha = filteredCanchas.find(c => String(c.id_cancha || c.id) === idCancha);
        setSelectedCancha(cancha || null);
    } else {
        setSelectedCancha(null);
    }
}

async function submitMatchForm(e, formData, isEditing, matchId, setIsSaving, setShowSuccess) {
    e.preventDefault();
    setIsSaving(true);
    try {
        const payload = {
            id_torneo: formData.id_torneo,
            id_equipo_local: formData.id_equipo_local,
            id_equipo_visitante: formData.id_equipo_visitante,
            fecha: formData.fecha,
            hora: formData.hora,
            id_cancha: formData.id_cancha
        };
        if (formData.arbitros && formData.arbitros.length > 0) {
            payload.arbitros = formData.arbitros.map(a => parseInt(a, 10)).filter(Number.isFinite);
        }
        if (isEditing) {
            await matchService.update(matchId, payload);
        } else {
            await matchService.create(payload);
        }
        setShowSuccess(true);
    } catch (err) {
        alert('Error al guardar: ' + (err.message || 'Error desconocido'));
    }
    setIsSaving(false);
}

function renderSuccessView(isEditing, onNavigate) {
    return h('div', { style: styles.successContainer },
        h('div', { style: styles.successTitle }, isEditing ? '¡Partido actualizado!' : '¡Partido guardado!'),
        h('div', { style: styles.successText }, isEditing ? 'El partido ha sido actualizado exitosamente' : 'El partido ha sido registrado exitosamente'),
        h('button', { style: styles.successButton, onClick: () => onNavigate('matches') }, 'Volver')
    );
}

function renderFormHeader(readOnly, isEditing, onNavigate) {
    let title;
    if (readOnly) {
        title = 'Detalle del Partido';
    } else if (isEditing) {
        title = 'Editar Partido';
    } else {
        title = 'Nuevo Partido';
    }
    if (readOnly) {
        return h(CardHeader, { title },
            h('button', { style: { ...styles.buttonOutline, display: 'flex', alignItems: 'center', gap: '6px' }, onClick: () => onNavigate('matches') }, h(IconArrowLeft), 'Volver')
        );
    }
    return h(CardHeader, { title });
}

function renderTorneoField(formData, setFormData, tournaments, readOnly) {
    return h('div', { style: styles.formGroup },
        h('label', { style: styles.formLabel }, 'Torneo *'),
        h('select', {
            value: formData.id_torneo,
            onChange: (e) => setFormData({ ...formData, id_torneo: e.target.value, id_cancha: '', id_equipo_local: '', id_equipo_visitante: '' }),
            style: styles.formSelect,
            required: !readOnly,
            disabled: readOnly
        },
            h('option', { value: '' }, 'Seleccione torneo'),
            tournaments.map(t => h('option', { key: t.id_torneo || t.id, value: String(t.id_torneo || t.id) }, `${t.nombre || t.name} (${t.disciplina_nombre || ''})`))
        )
    );
}

/**
 * Disciplina del torneo elegido: se autorellena y no se edita, porque el
 * partido hereda el deporte del torneo (no se elige por separado).
 */
function renderDisciplinaField(selectedTorneo, readOnly) {
    const disciplina = selectedTorneo && selectedTorneo.disciplina_nombre
        ? selectedTorneo.disciplina_nombre
        : '';
    return h('div', { style: styles.formGroup },
        h('label', { style: styles.formLabel }, 'Disciplina'),
        h('input', {
            type: 'text',
            value: disciplina,
            readOnly: true,
            disabled: readOnly,
            placeholder: 'Se completa con el torneo elegido',
            style: { ...styles.formInput, backgroundColor: '#f3f4f6', cursor: 'default' }
        })
    );
}

function renderCanchaField(formData, setFormData, filteredCanchas, selectedCancha, readOnly) {
    let placeholder;
    if (!formData.id_torneo) {
        placeholder = 'Primero seleccione un torneo';
    } else if (filteredCanchas.length === 0) {
        placeholder = 'No hay canchas para esta disciplina';
    } else {
        placeholder = 'Seleccione cancha';
    }
    return h('div', { style: styles.formGroup },
        h('label', { style: styles.formLabel }, 'Cancha *'),
        h('select', {
            value: formData.id_cancha,
            onChange: (e) => setFormData({ ...formData, id_cancha: e.target.value }),
            style: styles.formSelect,
            disabled: readOnly || !formData.id_torneo
        },
            h('option', { value: '' }, placeholder),
            filteredCanchas.map(c => h('option', { key: c.id_cancha || c.id, value: String(c.id_cancha || c.id) }, `${c.nombre} (${c.disciplina_nombre || ''})`))
        ),
        selectedCancha && selectedCancha.link_maps && h('div', { style: { marginTop: '4px', fontSize: '12px' } },
            h('a', {
                href: selectedCancha.link_maps,
                target: '_blank',
                rel: 'noopener noreferrer',
                style: { color: COLORS.primary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }
            }, h(IconMap, { size: 14 }), 'Ver en Google Maps')
        )
    );
}

function renderFechaField(formData, setFormData, readOnly) {
    return h('div', { style: styles.formGroup },
        h('label', { style: styles.formLabel }, 'Fecha *'),
        h('input', {
            type: 'date',
            value: formData.fecha,
            onChange: (e) => setFormData({ ...formData, fecha: e.target.value }),
            style: styles.formInput,
            required: !readOnly,
            disabled: readOnly
        })
    );
}

function renderHoraField(formData, setFormData, loadingSlots, availableSlots, readOnly) {
    const hasSlotBasis = formData.id_cancha && formData.fecha;
    const slotPlaceholder = hasSlotBasis ? 'Seleccione horario' : 'Primero seleccione cancha y fecha';
    const placeholder = loadingSlots ? 'Cargando...' : slotPlaceholder;
    return h('div', { style: styles.formGroup },
        h('label', { style: styles.formLabel }, 'Hora *'),
        h('select', {
            value: formData.hora,
            onChange: (e) => setFormData({ ...formData, hora: e.target.value }),
            style: styles.formSelect,
            disabled: readOnly || !formData.id_cancha || !formData.fecha
        },
            h('option', { value: '' }, placeholder),
            availableSlots.map(s => h('option', { key: s.id_horario_cancha, value: s.hora_inicio }, `${s.hora_inicio} - ${s.hora_fin || ''}`))
        )
    );
}

function renderEquipoLocalField(formData, setFormData, teams, readOnly, loadingTeams) {
    let placeholder;
    if (!formData.id_torneo) {
        placeholder = 'Primero seleccione un torneo';
    } else if (loadingTeams) {
        placeholder = 'Cargando equipos...';
    } else if (teams.length === 0) {
        placeholder = 'No hay equipos inscriptos';
    } else {
        placeholder = 'Seleccione equipo';
    }
    return h('div', { style: styles.formGroup },
        h('label', { style: styles.formLabel }, 'Equipo Local *'),
        h('select', {
            value: formData.id_equipo_local,
            onChange: (e) => setFormData({ ...formData, id_equipo_local: e.target.value }),
            style: styles.formSelect,
            required: !readOnly,
            disabled: readOnly || !formData.id_torneo || loadingTeams
        },
            h('option', { value: '' }, placeholder),
            teams.map(t => h('option', { key: t.id_equipo, value: String(t.id_equipo) }, t.nombre))
        )
    );
}

function renderEquipoVisitanteField(formData, setFormData, teams, readOnly, loadingTeams) {
    let placeholder;
    if (!formData.id_torneo) {
        placeholder = 'Primero seleccione un torneo';
    } else if (loadingTeams) {
        placeholder = 'Cargando equipos...';
    } else if (teams.length === 0) {
        placeholder = 'No hay equipos inscriptos';
    } else {
        placeholder = 'Seleccione equipo';
    }
    return h('div', { style: styles.formGroup },
        h('label', { style: styles.formLabel }, 'Equipo Visitante *'),
        h('select', {
            value: formData.id_equipo_visitante,
            onChange: (e) => setFormData({ ...formData, id_equipo_visitante: e.target.value }),
            style: styles.formSelect,
            required: !readOnly,
            disabled: readOnly || !formData.id_torneo || loadingTeams
        },
            h('option', { value: '' }, placeholder),
            teams.filter(t => String(t.id_equipo) !== formData.id_equipo_local).map(t => h('option', { key: t.id_equipo, value: String(t.id_equipo) }, t.nombre))
        )
    );
}

function toggleArbitro(formData, setFormData, id) {
    const idStr = String(id);
    const next = formData.arbitros.includes(idStr)
        ? formData.arbitros.filter(a => a !== idStr)
        : [...formData.arbitros, idStr];
    setFormData({ ...formData, arbitros: next });
}

function renderArbitroField(formData, setFormData, usuarios, readOnly) {
    const arbitros = Array.isArray(usuarios) ? usuarios : [];
    return h('div', { style: styles.formGroup },
        h('label', { style: styles.formLabel }, 'Árbitro(s)'),
        h('div', {
            style: {
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                padding: '8px',
                maxHeight: '160px',
                overflowY: 'auto',
                backgroundColor: readOnly ? '#f9fafb' : '#ffffff'
            }
        },
            arbitros.length === 0
                ? h('div', { style: { fontSize: '13px', color: '#999999' } }, 'No hay árbitros registrados')
                : arbitros.map(u => {
                    const value = String(u.id_usuario || u.id);
                    const checked = formData.arbitros.includes(value);
                    return h('label', {
                        key: value,
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '4px 2px',
                            fontSize: '13px',
                            cursor: readOnly ? 'default' : 'pointer'
                        }
                    },
                        h('input', {
                            type: 'checkbox',
                            checked,
                            disabled: readOnly,
                            onChange: () => toggleArbitro(formData, setFormData, value)
                        }),
                        u.nombre || u.name
                    );
                })
        )
    );
}

function renderFormActions(isEditing, readOnly, onNavigate) {
    if (readOnly) return null;
    return h('div', { style: { marginTop: '24px', display: 'flex', gap: '12px' } },
        h('button', { type: 'submit', style: styles.buttonPrimary }, h(IconSave), isEditing ? 'Actualizar Partido' : 'Guardar Partido'),
        h('button', { type: 'button', style: styles.buttonOutline, onClick: () => onNavigate('matches') }, 'Cancelar')
    );
}

function renderMatchForm({ readOnly, isEditing, onNavigate, handleSubmit, formData, setFormData, tournaments, filteredCanchas, selectedCancha, loadingSlots, availableSlots, loadingTeams, teams, usuarios }) {
    const selectedTorneo = tournaments.find(t => String(t.id_torneo || t.id) === formData.id_torneo);
    const titulo = selectedTorneo ? `${selectedTorneo.disciplina_nombre || ''}` : '';

    return h(Card, null,
        renderFormHeader(readOnly, isEditing, onNavigate),

        titulo && h('div', { style: { padding: '14px 20px', backgroundColor: '#eff6ff', borderRadius: '6px', margin: '0 24px', fontSize: '16px', color: '#2563eb' } },
            'Deporte seleccionado: ', h('strong', null, titulo)
        ),

        h('form', { onSubmit: handleSubmit, style: { padding: '24px' } },
            h('div', { style: { display: 'grid', gap: '20px', gridTemplateColumns: readOnly ? '1fr' : '1fr 1fr' } },
                renderTorneoField(formData, setFormData, tournaments, readOnly),
                renderDisciplinaField(selectedTorneo, readOnly),
                renderCanchaField(formData, setFormData, filteredCanchas, selectedCancha, readOnly),
                renderFechaField(formData, setFormData, readOnly),
                renderHoraField(formData, setFormData, loadingSlots, availableSlots, readOnly),
                renderEquipoLocalField(formData, setFormData, teams, readOnly, loadingTeams),
                renderEquipoVisitanteField(formData, setFormData, teams, readOnly, loadingTeams),
                renderArbitroField(formData, setFormData, usuarios, readOnly)
            ),
            renderFormActions(isEditing, readOnly, onNavigate)
        )
    );
}

export function MatchFormPage({ onNavigate, matchId, readOnly }) {
    const [tournaments, setTournaments] = useState([]);
    const [teams, setTeams] = useState([]);
    const [allCanchas, setAllCanchas] = useState([]);
    const [filteredCanchas, setFilteredCanchas] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedCancha, setSelectedCancha] = useState(null);
    const [formData, setFormData] = useState({
        id_torneo: '',
        id_cancha: '',
        id_equipo_local: '',
        id_equipo_visitante: '',
        fecha: '',
        hora: '',
        id_arbitro: '',
        arbitros: []
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [loadingTeams, setLoadingTeams] = useState(false);
    const isEditing = !!matchId;

    useEffect(() => {
        loadInitialData(setAllCanchas, setUsuarios, setTournaments);
    }, []);

    // Disciplina del torneo elegido: gobierna el filtro de equipos inscriptos
    // (el backend no valida el deporte al inscribir, asi que un torneo puede
    // tener equipos de otras disciplinas) y el textbox de disciplina.
    const torneoSeleccionado = tournaments.find(t => String(t.id_torneo || t.id) === formData.id_torneo);
    const idDisciplinaTorneo = torneoSeleccionado && torneoSeleccionado.id_disciplina
        ? String(torneoSeleccionado.id_disciplina)
        : '';

    useEffect(() => loadEnrolledTeams(formData.id_torneo, idDisciplinaTorneo, setTeams, setLoadingTeams), [formData.id_torneo, idDisciplinaTorneo]);

    useEffect(() => {
        loadMatchData(matchId, setFormData, setIsLoading);
    }, [matchId]);

    useEffect(() => {
        updateFilteredCanchas(formData.id_torneo, formData.id_cancha, tournaments, allCanchas, setFilteredCanchas, setFormData);
    }, [formData.id_torneo, tournaments, allCanchas]);

    useEffect(() => {
        loadAvailabilitySlots(formData.id_cancha, formData.fecha, setAvailableSlots, setLoadingSlots);
    }, [formData.id_cancha, formData.fecha]);

    useEffect(() => {
        updateSelectedCancha(formData.id_cancha, filteredCanchas, setSelectedCancha);
    }, [formData.id_cancha, filteredCanchas]);

    const handleSubmit = (e) => submitMatchForm(e, formData, isEditing, matchId, setIsSaving, setShowSuccess);

    if (isLoading) return h(Loading, { message: 'Cargando partido...' });
    if (isSaving) return h(Loading, { message: 'Guardando partido...' });

    if (showSuccess) {
        return renderSuccessView(isEditing, onNavigate);
    }

    return renderMatchForm({
        readOnly,
        isEditing,
        onNavigate,
        handleSubmit,
        formData,
        setFormData,
        tournaments,
        filteredCanchas,
        selectedCancha,
        loadingSlots,
        availableSlots,
        loadingTeams,
        teams,
        usuarios
    });
}

export default MatchFormPage;