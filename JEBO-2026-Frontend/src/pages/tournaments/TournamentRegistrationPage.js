import React, { useState, useEffect, useRef } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Loading } from '../../components/ui/Loading.js';
import { IconSave, IconPlus, IconTrash } from '../../components/icons/index.js';
import teamService from '../../services/teamService.js';
import tournamentService from '../../services/tournamentService.js';
import disciplineService from '../../services/disciplineService.js';

const { createElement: h } = React;

function createClickOutsideHandler(teamDropdownRef, setShowTeamDropdown) {
    return (e) => {
        if (teamDropdownRef.current && !teamDropdownRef.current.contains(e.target)) {
            setShowTeamDropdown(false);
        }
    };
}

async function loadRegistrationData(setTeams, setDisciplines, setLoading) {
    try {
        setLoading(true);
        const [teamsRes, disciplinesRes] = await Promise.all([
            teamService.getTodos().catch((e) => { console.error('Error loading teams:', e); return []; }),
            disciplineService.getAll().catch((e) => { console.error('Error loading disciplines:', e); return []; })
        ]);
        const teamsList = Array.isArray(teamsRes) ? teamsRes : (teamsRes?.data || teamsRes?.rows || []);
        const disciplinesList = Array.isArray(disciplinesRes) ? disciplinesRes : (disciplinesRes?.data || disciplinesRes?.rows || []);
        console.log('Teams raw:', teamsRes, 'parsed:', teamsList);
        console.log('Disciplines raw:', disciplinesRes, 'parsed:', disciplinesList);
        setTeams(teamsList);
        setDisciplines(disciplinesList);
    } catch (err) {
        console.error('Error loading data:', err);
    }
    setLoading(false);
}

async function loadTournamentOptions(selectedDiscipline, setTournaments, setLoading) {
    try {
        setLoading(true);
        const params = { scope: 'inscripciones_abiertas' };
        if (selectedDiscipline) params.id_disciplina = selectedDiscipline;
        const tournamentsRes = await tournamentService.getAll(1, 100, params).catch(() => []);
        const tournamentsList = Array.isArray(tournamentsRes) ? tournamentsRes : (tournamentsRes?.data || tournamentsRes?.rows || []);
        setTournaments(tournamentsList);
    } catch (err) {
        console.error('Error loading tournaments:', err);
    }
    setLoading(false);
}

async function loadEnrolledTeams(id_torneo, setEnrolledTeams) {
    try {
        const res = await teamService.getEnrolled({ id_torneo, limit: 100 }).catch(() => []);
        const list = Array.isArray(res) ? res : (res?.data || res?.rows || []);
        setEnrolledTeams(list);
    } catch (err) {
        console.error('Error loading enrolled teams:', err);
        setEnrolledTeams([]);
    }
}

function getFilteredTeams(teams, selectedDiscipline, teamSearch) {
    const filteredTeams = selectedDiscipline
        ? teams.filter(t => String(t.id_disciplina) === String(selectedDiscipline))
        : teams;
    const searchedTeams = teamSearch.trim()
        ? filteredTeams.filter(t => (t.nombre || '').toLowerCase().includes(teamSearch.toLowerCase()))
        : filteredTeams;
    return searchedTeams;
}

function isTeamUnavailable(t, selectedTournament, registrations, enrolledTeams) {
    return registrations.some(r =>
        String(r.id_torneo) === String(selectedTournament) && String(r.id_equipo) === String(t.id_equipo || t.id)
    ) ||
    enrolledTeams.some(r =>
        String(r.id_torneo) === String(selectedTournament) && String(r.id_equipo) === String(t.id_equipo || t.id)
    );
}

function validateNewRegistration(state) {
    const { selectedTeam, selectedTournament, teams, tournaments, registrations, enrolledTeams } = state;
    if (!selectedTeam || !selectedTournament) {
        return { ok: false, error: 'Seleccione un equipo y un torneo' };
    }
    const team = teams.find(t => String(t.id_equipo) === String(selectedTeam));
    const tournament = tournaments.find(t => String(t.id_torneo) === String(selectedTournament));
    if (!team || !tournament) {
        return { ok: false };
    }
    if (String(team.id_disciplina) !== String(tournament.id_disciplina)) {
        return { ok: false, error: 'El equipo no es de la disciplina del torneo' };
    }
    const exists = registrations.some(
        r => r.id_equipo === selectedTeam && r.id_torneo === selectedTournament
    );
    if (exists) {
        return { ok: false, error: 'Este equipo ya está en la lista de inscripciones' };
    }
    if (registrations.length > 0) {
        return { ok: false, error: 'Solo se puede registrar un equipo a la vez. Guarde o elimine la inscripción actual.' };
    }
    const alreadyEnrolled = enrolledTeams.some(
        r => String(r.id_equipo) === String(selectedTeam) && String(r.id_torneo) === String(selectedTournament)
    );
    if (alreadyEnrolled) {
        return { ok: false, error: 'Este equipo ya está inscrito en este torneo' };
    }
    return { ok: true, team, tournament };
}

async function submitRegistrations(registrations, setShowSuccess, setError) {
    try {
        const payload = registrations.map(r => ({
            id_equipo: parseInt(r.id_equipo),
            id_torneo: parseInt(r.id_torneo)
        }));
        await teamService.enrollBatch(payload);
        setShowSuccess(true);
    } catch (err) {
        setError('Error al guardar inscripciones: ' + (err.message || 'Error desconocido'));
    }
}

function renderSuccessView(onNavigate) {
    return h('div', { style: styles.successContainer },
        h('div', { style: styles.successTitle }, '¡Inscripciones guardadas!'),
        h('div', { style: styles.successText }, 'Los equipos han sido inscritos exitosamente'),
        h('button', { style: styles.successButton, onClick: () => onNavigate('tournaments') }, 'Volver')
    );
}

function renderFormHeader() {
    return h(CardHeader, { title: 'Inscripción de Equipos a Torneo' });
}

function renderErrorBanner(error) {
    return error && h('div', {
        style: { color: '#ef4444', padding: '12px', marginBottom: '16px', backgroundColor: '#fee2e2', borderRadius: '6px' }
    }, error);
}

function renderDisciplineField(selectedDiscipline, disciplines, onChange) {
    return h('div', { style: styles.formGroup },
        h('label', { style: styles.formLabel }, 'Filtrar por Deporte'),
        h('select', { value: selectedDiscipline, onChange: onChange, style: styles.formSelect },
            h('option', { value: '' }, 'Todos los deportes'),
            disciplines.map(d => h('option', {
                key: d.id_disciplina || d.id,
                value: String(d.id_disciplina || d.id)
            }, d.nombre || d.name))
        )
    );
}

function renderTeamField(params) {
    const { teamDropdownRef, teamSearch, selectedTeam, selectedTeamObj, showTeamDropdown, setTeamSearch, setSelectedTeam, setShowTeamDropdown, searchedTeams, availableTeams, handleSelectTeam } = params;
    const selectedTeamName = selectedTeamObj ? (selectedTeamObj.nombre || '') : teamSearch;
    const teamInputValue = showTeamDropdown ? teamSearch : selectedTeamName;
    return h('div', { style: { ...styles.formGroup, position: 'relative', marginBottom: 0 }, ref: teamDropdownRef },
        h('label', { style: styles.formLabel }, 'Equipo *'),
        h('input', {
            type: 'text',
            value: teamInputValue,
            onChange: (e) => {
                setTeamSearch(e.target.value);
                setSelectedTeam('');
                setShowTeamDropdown(true);
            },
            onFocus: () => setShowTeamDropdown(true),
            style: styles.formInput,
            placeholder: 'Buscar equipo...',
            required: !selectedTeam
        }),
        showTeamDropdown && h('div', {
            style: {
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                maxHeight: '200px',
                overflowY: 'auto',
                zIndex: 100,
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }
        },
            renderTeamDropdownList(searchedTeams, availableTeams, selectedTeam, handleSelectTeam)
        )
    );
}

function renderTeamDropdownList(searchedTeams, availableTeams, selectedTeam, handleSelectTeam) {
    if (searchedTeams.length === 0) {
        return h('div', { style: { padding: '12px', color: '#9ca3af', fontSize: '13px', textAlign: 'center' } }, 'Sin resultados');
    }
    if (availableTeams.length === 0) {
        return h('div', { style: { padding: '12px', color: '#9ca3af', fontSize: '13px', textAlign: 'center' } }, 'Todos los equipos ya están inscritos en este torneo');
    }
    return availableTeams.slice(0, 50).map(t => renderTeamOption(t, selectedTeam, handleSelectTeam));
}

function renderTeamOption(t, selectedTeam, handleSelectTeam) {
    return h('div', {
        key: t.id_equipo || t.id,
        onClick: () => handleSelectTeam(t),
        style: {
            padding: '10px 12px',
            cursor: 'pointer',
            fontSize: '14px',
            borderBottom: '1px solid #f3f4f6',
            backgroundColor: String(t.id_equipo) === String(selectedTeam) ? '#eff6ff' : '#ffffff'
        },
        onMouseEnter: (e) => e.currentTarget.style.backgroundColor = '#f9fafb',
        onMouseLeave: (e) => e.currentTarget.style.backgroundColor = String(t.id_equipo) === String(selectedTeam) ? '#eff6ff' : '#ffffff'
    }, t.nombre || t.name);
}

function renderTournamentField(selectedTournament, tournaments, setSelectedTournament) {
    return h('div', { style: { ...styles.formGroup, marginBottom: 0 } },
        h('label', { style: styles.formLabel }, 'Torneo *'),
        h('select', {
            value: selectedTournament,
            onChange: (e) => setSelectedTournament(e.target.value),
            style: styles.formSelect,
            required: true
        },
            h('option', { value: '' }, 'Seleccione torneo'),
            tournaments.map(t => h('option', {
                key: t.id_torneo || t.id,
                value: String(t.id_torneo || t.id)
            }, t.nombre || t.name))
        )
    );
}

function renderAddButton(registrations, handleAddRegistration) {
    const disabled = registrations.length > 0;
    return h('button', {
        type: 'button',
        style: { ...styles.buttonPrimary, height: '42px', opacity: disabled ? 0.6 : 1, cursor: disabled ? 'not-allowed' : 'pointer' },
        disabled,
        onClick: handleAddRegistration
    }, h(IconPlus), 'Agregar');
}

function renderRegistrationsCard(registrations, handleRemoveRegistration) {
    return registrations.length > 0 && h(Card, { style: { marginTop: '24px' } },
        h(CardHeader, { title: 'Inscripción a Registrar' }),
        h('table', { style: { width: '100%', borderCollapse: 'collapse' } },
            h('thead', null,
                h('tr', null,
                    h('th', { style: { padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: '600', color: '#6b7280' } }, 'Equipo'),
                    h('th', { style: { padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: '600', color: '#6b7280' } }, 'Torneo'),
                    h('th', { style: { padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontSize: '12px', fontWeight: '600', color: '#6b7280' } }, 'Acción')
                )
            ),
            h('tbody', null,
                registrations.map((reg, index) =>
                    h('tr', { key: index },
                        h('td', { style: { padding: '12px', borderBottom: '1px solid #e5e7eb' } }, reg.equipo_nombre),
                        h('td', { style: { padding: '12px', borderBottom: '1px solid #e5e7eb' } }, reg.torneo_nombre),
                        h('td', { style: { padding: '12px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' } },
                            h('button', {
                                type: 'button',
                                style: { ...styles.buttonDanger, padding: '6px 12px' },
                                onClick: () => handleRemoveRegistration(index)
                            }, h(IconTrash))
                        )
                    )
                )
            )
        )
    );
}

function renderFormActions(onNavigate) {
    return h('div', { style: { marginTop: '24px', display: 'flex', gap: '12px' } },
        h('button', { type: 'submit', style: styles.buttonPrimary }, h(IconSave), 'Guardar Inscripciones'),
        h('button', { type: 'button', style: styles.buttonOutline, onClick: () => onNavigate('tournaments') }, 'Cancelar')
    );
}

export function TournamentRegistrationPage({ onNavigate }) {
    const [teams, setTeams] = useState([]);
    const [tournaments, setTournaments] = useState([]);
    const [disciplines, setDisciplines] = useState([]);
    const [selectedDiscipline, setSelectedDiscipline] = useState('');
    const [selectedTeam, setSelectedTeam] = useState('');
    const [teamSearch, setTeamSearch] = useState('');
    const [showTeamDropdown, setShowTeamDropdown] = useState(false);
    const [selectedTournament, setSelectedTournament] = useState('');
    const [enrolledTeams, setEnrolledTeams] = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const teamDropdownRef = useRef(null);

    useEffect(() => {
        loadRegistrationData(setTeams, setDisciplines, setLoading);
    }, []);

    useEffect(() => {
        loadTournamentOptions(selectedDiscipline, setTournaments, setLoading);
    }, [selectedDiscipline]);

    useEffect(() => {
        if (!selectedTournament) {
            setEnrolledTeams([]);
            return;
        }
        loadEnrolledTeams(selectedTournament, setEnrolledTeams);
    }, [selectedTournament]);

    useEffect(() => {
        const handleClickOutside = createClickOutsideHandler(teamDropdownRef, setShowTeamDropdown);
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const searchedTeams = getFilteredTeams(teams, selectedDiscipline, teamSearch);
    const availableTeams = searchedTeams.filter(t => !isTeamUnavailable(t, selectedTournament, registrations, enrolledTeams));
    const selectedTeamObj = teams.find(t => String(t.id_equipo) === String(selectedTeam));

    const handleDisciplineChange = (e) => {
        setSelectedDiscipline(e.target.value);
        setSelectedTeam('');
        setTeamSearch('');
        setSelectedTournament('');
    };

    const handleSelectTeam = (team) => {
        setSelectedTeam(String(team.id_equipo));
        setTeamSearch(team.nombre || '');
        setShowTeamDropdown(false);
    };

    const handleAddRegistration = () => {
        const result = validateNewRegistration({ selectedTeam, selectedTournament, teams, tournaments, registrations, enrolledTeams });
        if (!result.ok) {
            if (result.error) setError(result.error);
            return;
        }
        setRegistrations([
            ...registrations,
            {
                id_equipo: selectedTeam,
                id_torneo: selectedTournament,
                equipo_nombre: result.team.nombre,
                torneo_nombre: result.tournament.nombre
            }
        ]);
        setSelectedTeam('');
        setTeamSearch('');
        setError('');
    };

    const handleRemoveRegistration = (index) => {
        setRegistrations(registrations.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (registrations.length === 0) {
            setError('Agregue al menos una inscripción');
            return;
        }
        setIsSaving(true);
        setError('');
        await submitRegistrations(registrations, setShowSuccess, setError);
        setIsSaving(false);
    };

    if (loading) return h(Loading, { message: 'Cargando datos...' });
    if (isSaving) return h(Loading, { message: 'Guardando inscripciones...' });

    if (showSuccess) {
        return renderSuccessView(onNavigate);
    }

    return h(Card, null,
        renderFormHeader(),
        h('div', { style: { padding: '24px' } },
            renderErrorBanner(error),

            h('form', { onSubmit: handleSubmit, noValidate: true },
            h('div', { style: { display: 'grid', gap: '20px' } },
                renderDisciplineField(selectedDiscipline, disciplines, handleDisciplineChange),

                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '12px', alignItems: 'end' } },
                    renderTeamField({
                        teamDropdownRef,
                        teamSearch,
                        selectedTeam,
                        selectedTeamObj,
                        showTeamDropdown,
                        setTeamSearch,
                        setSelectedTeam,
                        setShowTeamDropdown,
                        searchedTeams,
                        availableTeams,
                        handleSelectTeam
                    }),

                    renderTournamentField(selectedTournament, tournaments, setSelectedTournament),

                    renderAddButton(registrations, handleAddRegistration)
                )
            ),

            renderRegistrationsCard(registrations, handleRemoveRegistration),

                    renderFormActions(onNavigate)
                )
        )
    );
}

export default TournamentRegistrationPage;