import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '../../components/ui/Card.js';
import tournamentService from '../../services/tournamentService.js';
import disciplineService from '../../services/disciplineService.js';

const { createElement: h } = React;

export function QualifiedPage() {
    const [tournaments, setTournaments] = useState([]);
    const [disciplines, setDisciplines] = useState([]);
    const [selectedTournament, setSelectedTournament] = useState('');
    const [selectedSport, setSelectedSport] = useState('');
    const [qualified, setQualified] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const tournRes = await tournamentService.getAll(1, 100);
                const tournData = tournRes.data || tournRes || [];
                setTournaments(Array.isArray(tournData) ? tournData : []);
            } catch (err) { console.error(err); }
            try {
                const discRes = await disciplineService.getAll();
                const discData = discRes.data || discRes || [];
                setDisciplines(Array.isArray(discData) ? discData : []);
            } catch (err) { console.error(err); }
        }
        load();
    }, []);

    useEffect(() => {
        if (!selectedTournament) return;
        async function loadQualified() {
            setLoading(true);
            try {
                const res = await tournamentService.getQualified(selectedTournament);
                const data = res.data || res || [];
                setQualified(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error loading qualified:', err);
                setQualified([]);
            }
            setLoading(false);
        }
        loadQualified();
    }, [selectedTournament]);

    return h(Card, null,
        h(CardHeader, { title: 'Equipos Clasificados' }),
        h('p', { style: { color: '#6b7280', fontSize: '13px', padding: '16px 16px 0' } },
            'Equipos que han clasificado para la siguiente ronda.'
        ),

        h('div', { style: { display: 'flex', gap: '16px', margin: '15px 0', padding: '0 16px', flexWrap: 'wrap' } },
            h('div', { style: { minWidth: 0, maxWidth: '100%' } },
                h('label', { style: { marginRight: '10px', fontWeight: 'bold', color: '#374151' } }, 'Torneo:'),
                h('select', {
                    value: selectedTournament,
                    onChange: (e) => setSelectedTournament(e.target.value),
                    style: { padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '14px' }
                },
                    h('option', { value: '' }, 'Seleccione un torneo'),
                    tournaments.map(t => h('option', { key: t.id_torneo || t.id, value: String(t.id_torneo || t.id) }, t.nombre || t.name))
                )
            ),
            h('div', { style: { minWidth: 0, maxWidth: '100%' } },
                h('label', { style: { marginRight: '10px', fontWeight: 'bold', color: '#374151' } }, 'Deporte:'),
                h('select', {
                    value: selectedSport,
                    onChange: (e) => setSelectedSport(e.target.value),
                    style: { padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '14px' }
                },
                    h('option', { value: '' }, 'Todos'),
                    disciplines.map(d => h('option', { key: d.id_disciplina || d.id, value: String(d.id_disciplina || d.id) }, d.nombre || d.name))
                )
            )
        ),

        h('div', { style: { overflowX: 'auto' } }, h('table', { style: { width: '100%', borderCollapse: 'collapse', marginTop: '10px', backgroundColor: '#ffffff', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e5e7eb' } },
            h('thead', null,
                h('tr', { style: { backgroundColor: '#f3f4f6' } },
                    h('th', { style: { padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' } }, 'Equipo'),
                    h('th', { style: { padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' } }, 'PJ'),
                    h('th', { style: { padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' } }, 'PG'),
                    h('th', { style: { padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' } }, 'Puntos')
                )
            ),
            h('tbody', null,
                loading
                    ? h('tr', null, h('td', { colSpan: 4, style: { padding: '20px', textAlign: 'center', color: '#6b7280' } }, 'Cargando...'))
                    : qualified.length === 0
                        ? h('tr', null, h('td', { colSpan: 4, style: { padding: '20px', textAlign: 'center', color: '#6b7280' } }, 'Seleccione un torneo'))
                        : qualified.map((equipo, index) =>
                            h('tr', { key: index },
                                h('td', { style: { padding: '12px', borderBottom: '1px solid #e5e7eb' } }, equipo.equipo_nombre || equipo.nombre || '—'),
                                h('td', { style: { padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', color: '#6b7280' } }, equipo.pj || 0),
                                h('td', { style: { padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', color: '#6b7280' } }, equipo.pg || 0),
                                h('td', { style: { padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', color: '#111827' } }, equipo.puntos || 0)
                            )
                        )
            )
        ))
    );
}

export default QualifiedPage;