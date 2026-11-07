import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell } from '../../components/ui/Table.js';
import { Loading } from '../../components/ui/Loading.js';
import { Badge } from '../../components/ui/Badge.js';
import { IconArrowLeft } from '../../components/icons/index.js';
import teamService from '../../services/teamService.js';
import disciplineService from '../../services/disciplineService.js';
import tournamentService from '../../services/tournamentService.js';

const { createElement: h } = React;

export function EnrolledTeamsPage({ onNavigate }) {
    const [enrolled, setEnrolled] = useState([]);
    const [disciplines, setDisciplines] = useState([]);
    const [tournaments, setTournaments] = useState([]);
    const [selectedDiscipline, setSelectedDiscipline] = useState('');
    const [selectedTournament, setSelectedTournament] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadFilters = async () => {
        try {
            const [discRes, tourRes] = await Promise.all([
                disciplineService.getAll().catch(() => []),
                tournamentService.getAll(1, 100).catch(() => [])
            ]);
            const discList = Array.isArray(discRes) ? discRes : (discRes?.data || discRes?.rows || []);
            const tourList = Array.isArray(tourRes) ? tourRes : (tourRes?.data || tourRes?.rows || []);
            setDisciplines(discList);
            setTournaments(tourList);
        } catch (err) {
            console.error('Error loading filters:', err);
        }
    };

    const loadEnrolled = async () => {
        try {
            setLoading(true);
            const params = { limit: 100 };
            if (selectedDiscipline) params.id_disciplina = selectedDiscipline;
            if (selectedTournament) params.id_torneo = selectedTournament;
            const res = await teamService.getEnrolled(params);
            const list = Array.isArray(res) ? res : (res?.data || res?.rows || []);
            setEnrolled(list);
        } catch (err) {
            console.error('Error loading enrolled teams:', err);
            setError('Error al cargar equipos inscriptos');
        }
        setLoading(false);
    };

    useEffect(() => {
        loadFilters();
    }, []);

    useEffect(() => {
        loadEnrolled();
    }, [selectedDiscipline, selectedTournament]);

    if (loading) return h(Loading, { message: 'Cargando equipos inscriptos...' });

    return h('div', null,
        error && h('div', {
            style: { color: '#ef4444', padding: '12px', marginBottom: '16px', backgroundColor: '#fee2e2', borderRadius: '6px' }
        }, error),

        h(Card, null,
            h(CardHeader, { title: 'Equipos Inscriptos en Torneos' },
                h('button', {
                    style: { ...styles.buttonOutline, display: 'flex', alignItems: 'center', gap: '6px' },
                    onClick: () => onNavigate('dashboard')
                }, h(IconArrowLeft), 'Volver')
            ),

            h('div', { style: { display: 'flex', gap: '12px', padding: '16px', flexWrap: 'wrap' } },
                h('div', { style: { ...styles.formGroup, marginBottom: 0, minWidth: '180px' } },
                    h('label', { style: styles.formLabel }, 'Deporte'),
                    h('select', {
                        value: selectedDiscipline,
                        onChange: (e) => setSelectedDiscipline(e.target.value),
                        style: styles.formSelect
                    },
                        h('option', { value: '' }, 'Todos los deportes'),
                        disciplines.map(d => h('option', {
                            key: d.id_disciplina || d.id,
                            value: String(d.id_disciplina || d.id)
                        }, d.nombre || d.name))
                    )
                ),
                h('div', { style: { ...styles.formGroup, marginBottom: 0, minWidth: '180px' } },
                    h('label', { style: styles.formLabel }, 'Torneo'),
                    h('select', {
                        value: selectedTournament,
                        onChange: (e) => setSelectedTournament(e.target.value),
                        style: styles.formSelect
                    },
                        h('option', { value: '' }, 'Todos los torneos'),
                        tournaments.map(t => h('option', {
                            key: t.id_torneo || t.id,
                            value: String(t.id_torneo || t.id)
                        }, t.nombre || t.name))
                    )
                )
            ),

            h(Table, null,
                h(TableHeader, null,
                    h(TableHeaderCell, null, 'Equipo'),
                    h(TableHeaderCell, null, 'Torneo'),
                    h(TableHeaderCell, null, 'Deporte'),
                    h(TableHeaderCell, null, 'Institución'),
                    h(TableHeaderCell, null, 'Estado'),
                ),
                h('tbody', null,
                    enrolled.length === 0
                        ? h(TableRow, null,
                            h(TableCell, { colSpan: 5, style: { textAlign: 'center', color: '#9ca3af', padding: '24px' } },
                                'No hay equipos inscriptos'
                            )
                        )
                        : enrolled.map(item =>
                            h(TableRow, { key: item.id_posicion },
                                h(TableCell, { style: { fontWeight: 500 } }, item.equipo_nombre),
                                h(TableCell, null, item.torneo_nombre),
                                h(TableCell, null, item.disciplina_nombre),
                                h(TableCell, null, item.institucion_nombre || '-'),
                                h(TableCell, null,
                                    h(Badge, { variant: 'blue' }, item.estado_torneo || 'Programado')
                                )
                            )
                        )
                )
            )
        )
    );
}

export default EnrolledTeamsPage;
