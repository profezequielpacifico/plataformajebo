import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card.js';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell } from '../../components/ui/Table.js';
import { Badge } from '../../components/ui/Badge.js';
import { Loading } from '../../components/ui/Loading.js';
import teamService from '../../services/teamService.js';
import tournamentService from '../../services/tournamentService.js';
import disciplineService from '../../services/disciplineService.js';
import regionService from '../../services/regionService.js';

const { createElement: h } = React;

const tabStyle = (active) => ({
    padding: '10px 20px',
    cursor: 'pointer',
    border: 'none',
    borderBottom: active ? '3px solid #2563eb' : '3px solid transparent',
    backgroundColor: active ? '#eff6ff' : 'transparent',
    color: active ? '#2563eb' : '#6b7280',
    fontWeight: active ? 600 : 400,
    fontSize: '14px',
    transition: 'all 0.2s'
});

export function StandingsPage() {
    const [activeTab, setActiveTab] = useState('posiciones');
    const [selectedTournament, setSelectedTournament] = useState('');
    const [selectedDiscipline, setSelectedDiscipline] = useState('');
    const [selectedRegion, setSelectedRegion] = useState('');
    const [standingsData, setStandingsData] = useState([]);
    const [qualified, setQualified] = useState([]);
    const [loading, setLoading] = useState(false);

    const [tournaments, setTournaments] = useState([]);
    const [disciplines, setDisciplines] = useState([]);
    const [regions, setRegions] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [tournamentsRes, disciplinesRes, regionsRes] = await Promise.all([
                    tournamentService.getAll(1, 100).catch(() => []),
                    disciplineService.getAll().catch(() => []),
                    regionService.getAll().catch(() => [])
                ]);

                const tournamentList = Array.isArray(tournamentsRes) ? tournamentsRes : (tournamentsRes?.data || tournamentsRes?.rows || []);
                const disciplineList = Array.isArray(disciplinesRes) ? disciplinesRes : (disciplinesRes?.data || disciplinesRes?.rows || []);
                const regionList = Array.isArray(regionsRes) ? regionsRes : (regionsRes?.data || regionsRes?.rows || []);

                setTournaments(tournamentList.map(t => ({ value: String(t.id || t.id_torneo), label: t.nombre || t.name })));
                setDisciplines(disciplineList.map(d => ({ value: String(d.id || d.id_disciplina), label: d.nombre || d.name })));
                setRegions(regionList.map(r => ({ value: String(r.id || r.id_region), label: r.nombre || r.name })));
            } catch (error) {
                console.error("Error fetching initial data", error);
            }
        };
        fetchData();
    }, []);

    const fetchStandings = async () => {
        try {
            setLoading(true);
            const params = { limit: 100 };
            if (selectedTournament) params.id_torneo = selectedTournament;
            if (selectedDiscipline) params.id_disciplina = selectedDiscipline;
            if (selectedRegion) params.id_region = selectedRegion;

            const res = await teamService.getEnrolled(params);
            const list = Array.isArray(res) ? res : (res?.data || res?.rows || []);
            setStandingsData(list);
        } catch (error) {
            console.error("Error fetching standings", error);
            setStandingsData([]);
        }
        setLoading(false);
    };

    const fetchQualified = async () => {
        if (!selectedTournament) {
            setQualified([]);
            return;
        }
        try {
            setLoading(true);
            const res = await tournamentService.getQualified(selectedTournament);
            const data = res?.data || res || [];
            setQualified(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching qualified:", error);
            setQualified([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (activeTab === 'posiciones') {
            fetchStandings();
        } else {
            fetchQualified();
        }
    }, [selectedTournament, selectedDiscipline, selectedRegion, activeTab]);

    const renderFilters = () =>
        h('div', { style: { display: 'flex', gap: '16px', marginBottom: '20px', padding: '16px' } },
            h('div', { style: { ...styles.formGroup, marginBottom: 0 } },
                h('label', { style: styles.formLabel }, 'Deporte'),
                h('select', {
                    value: selectedDiscipline,
                    onChange: (e) => setSelectedDiscipline(e.target.value),
                    style: { ...styles.formSelect, width: '200px' }
                },
                    h('option', { value: '' }, 'Todos los deportes'),
                    disciplines.map(d => h('option', { key: d.value, value: d.value }, d.label))
                )
            ),
            h('div', { style: { ...styles.formGroup, marginBottom: 0 } },
                h('label', { style: styles.formLabel }, 'Torneo'),
                h('select', {
                    value: selectedTournament,
                    onChange: (e) => setSelectedTournament(e.target.value),
                    style: { ...styles.formSelect, width: '250px' }
                },
                    h('option', { value: '' }, 'Todos los torneos'),
                    tournaments.map(t => h('option', { key: t.value, value: t.value }, t.label))
                )
            ),
            h('div', { style: { ...styles.formGroup, marginBottom: 0 } },
                h('label', { style: styles.formLabel }, 'Región'),
                h('select', {
                    value: selectedRegion,
                    onChange: (e) => setSelectedRegion(e.target.value),
                    style: { ...styles.formSelect, width: '200px' }
                },
                    h('option', { value: '' }, 'Todas las regiones'),
                    regions.map(r => h('option', { key: r.value, value: r.value }, r.label))
                )
            )
        );

    const renderPosiciones = () =>
        loading
            ? h(Loading, { message: 'Cargando clasificación...' })
            : h(Table, null,
                h(TableHeader, null,
                    h(TableHeaderCell, null, 'Equipo'),
                    h(TableHeaderCell, null, 'Deporte'),
                    h(TableHeaderCell, null, 'Región'),
                    h(TableHeaderCell, null, 'Institución'),
                    h(TableHeaderCell, null, 'Torneo'),
                    h(TableHeaderCell, null, 'Pts'),
                    h(TableHeaderCell, null, 'PJ'),
                    h(TableHeaderCell, null, 'PG'),
                    h(TableHeaderCell, null, 'PE'),
                    h(TableHeaderCell, null, 'PP'),
                    h(TableHeaderCell, null, 'GF'),
                    h(TableHeaderCell, null, 'GC'),
                    h(TableHeaderCell, null, 'Estado')
                ),
                h('tbody', null,
                    standingsData.length === 0
                        ? h(TableRow, null,
                            h(TableCell, { colSpan: 13, style: { textAlign: 'center', color: '#9ca3af', padding: '24px' } },
                                'No hay equipos inscriptos para los filtros seleccionados'
                            )
                        )
                        : standingsData
                            .sort((a, b) => (b.puntos || 0) - (a.puntos || 0))
                            .map(item =>
                                h(TableRow, { key: item.id_posicion },
                                    h(TableCell, { style: { fontWeight: 500 } }, item.equipo_nombre),
                                    h(TableCell, null, item.disciplina_nombre),
                                    h(TableCell, null, item.region_nombre || '-'),
                                    h(TableCell, null, item.institucion_nombre || '-'),
                                    h(TableCell, null, item.torneo_nombre),
                                    h(TableCell, { style: { fontWeight: 700, color: '#2563eb' } }, String(item.puntos || 0)),
                                    h(TableCell, null, String(item.pj || 0)),
                                    h(TableCell, null, String(item.pg || 0)),
                                    h(TableCell, null, String(item.pe || 0)),
                                    h(TableCell, null, String(item.pp || 0)),
                                    h(TableCell, null, String(item.gf || 0)),
                                    h(TableCell, null, String(item.gc || 0)),
                                    h(TableCell, null,
                                        h(Badge, { variant: 'blue' }, item.estado_torneo || 'Programado')
                                    )
                                )
                            )
                )
            );

    const renderClasificados = () => {
        if (!selectedTournament) {
            return h('div', { style: { textAlign: 'center', color: '#9ca3af', padding: '40px' } },
                'Seleccione un torneo para ver los equipos clasificados'
            );
        }
        if (loading) return h(Loading, { message: 'Cargando clasificados...' });

        return h(Table, null,
            h(TableHeader, null,
                h(TableHeaderCell, null, 'Equipo'),
                h(TableHeaderCell, null, 'PJ'),
                h(TableHeaderCell, null, 'PG'),
                h(TableHeaderCell, null, 'Puntos')
            ),
            h('tbody', null,
                qualified.length === 0
                    ? h(TableRow, null,
                        h(TableCell, { colSpan: 4, style: { textAlign: 'center', color: '#9ca3af', padding: '24px' } },
                            'No hay equipos clasificados para este torneo'
                        )
                    )
                    : qualified.map((equipo, index) =>
                        h(TableRow, { key: index },
                            h(TableCell, { style: { fontWeight: 500 } }, equipo.equipo_nombre || equipo.nombre || '-'),
                            h(TableCell, null, String(equipo.pj || 0)),
                            h(TableCell, null, String(equipo.pg || 0)),
                            h(TableCell, { style: { fontWeight: 700, color: '#16a34a' } }, String(equipo.puntos || 0))
                        )
                    )
            )
        );
    };

    return h(Card, null,
        h(CardHeader, null, h(CardTitle, null, 'Clasificación')),
        h('div', { style: { display: 'flex', borderBottom: '1px solid #e5e7eb', padding: '0 16px' } },
            h('button', { style: tabStyle(activeTab === 'posiciones'), onClick: () => setActiveTab('posiciones') }, 'Posiciones'),
            h('button', { style: tabStyle(activeTab === 'clasificados'), onClick: () => setActiveTab('clasificados') }, 'Clasificados')
        ),
        renderFilters(),
        activeTab === 'posiciones' ? renderPosiciones() : renderClasificados()
    );
}

export default StandingsPage;
