import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell, TableActions } from '../../components/ui/Table.js';
import { IconPlus, IconEdit, IconTrash, IconEye } from '../../components/icons/index.js';
import matchService from '../../services/matchService.js';
import { formatearFecha } from '../../services/dateService.js';
import tournamentService from '../../services/tournamentService.js';
import { soloTorneosConPartidos } from '../../services/tiposCompetencia.js';
import '../../styles/components.css';

const { createElement: h } = React;

function getBadgeVariant(status) {
    const s = (status || '').toLowerCase();
    if (s === 'finalizado') return 'blue';
    if (s === 'en juego' || s === 'en progreso' || s === 'en curso') return 'green';
    if (s === 'cancelado') return 'red';
    if (s === 'pendiente') return 'orange';
    if (s === 'programado') return 'yellow';
    return 'yellow';
}

function loadTournaments(setTournaments) {
    tournamentService.getAll(1, 100).then(res => {
        const data = res.data || res || [];

        setTournaments(soloTorneosConPartidos(Array.isArray(data) ? data : []));
    }).catch(err => console.error(err));
}

async function loadMatches(estadoFilter, selectedTorneo, setMatches, setLoading) {
    try {
        setLoading(true);
        const params = { limit: 100 };
        if (estadoFilter) params.estado = estadoFilter;
        if (selectedTorneo) params.id_torneo = selectedTorneo;
        const res = await matchService.getAll(params);
        const data = res.data || res || [];
        setMatches(Array.isArray(data) ? data : []);
    } catch (err) {
        console.error('Error loading matches:', err);
    }
    setLoading(false);
}

async function deleteMatch(match, setMatches) {
    if (!confirm('¿Estás seguro de eliminar este partido?')) return;
    try {
        await matchService.delete(match.id_partido || match.id);
        setMatches(prev => prev.filter(m => (m.id_partido || m.id) !== (match.id_partido || match.id)));
    } catch (err) {
        console.error(err);
    }
}

function renderFilters({ selectedTorneo, setSelectedTorneo, tournaments, estadoFilter, setEstadoFilter, onNavigate }) {
    return h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
        h('select', {
            value: selectedTorneo,
            onChange: (e) => setSelectedTorneo(e.target.value),
            style: { ...styles.formSelect, width: '220px', maxWidth: '100%', flexGrow: 1, marginBottom: 0 }
        },
            h('option', { value: '' }, 'Todos los torneos'),
            tournaments.map(t => h('option', { key: t.id_torneo || t.id, value: String(t.id_torneo || t.id) }, `${t.nombre || t.name} (${t.disciplina_nombre || ''})`))
        ),
        h('select', {
            value: estadoFilter,
            onChange: (e) => setEstadoFilter(e.target.value),
            style: { ...styles.formSelect, width: '160px', maxWidth: '100%', flexGrow: 1, marginBottom: 0 }
        },
            h('option', { value: '' }, 'Todos los estados'),
            h('option', { value: 'Pendiente' }, 'Pendiente'),
            h('option', { value: 'Programado' }, 'Programado'),
            h('option', { value: 'En Juego' }, 'En Juego'),
            h('option', { value: 'Finalizado' }, 'Finalizado'),
            h('option', { value: 'Cancelado' }, 'Cancelado')
        ),
        h('button', { style: styles.buttonPrimary, onClick: () => onNavigate('matches-new') }, h(IconPlus), 'Nuevo Partido')
    );
}

function renderMatchActions(match, onNavigate, setMatches) {
    return h(TableActions, null,
        h('button', { style: { ...styles.buttonInfo, padding: '6px' }, onClick: () => onNavigate('matches-detail/' + (match.id_partido || match.id)) }, h(IconEye)),
        h('button', { style: { ...styles.buttonSuccess, padding: '6px' }, onClick: () => onNavigate('matches-edit/' + (match.id_partido || match.id)) }, h(IconEdit)),
        h('button', { style: { ...styles.buttonDanger, padding: '6px' }, onClick: () => deleteMatch(match, setMatches) }, h(IconTrash))
    );
}

function renderArbitrosCell(match) {
    if (!match.arbitros) return '—';
    if (Array.isArray(match.arbitros)) {
        return match.arbitros.map(a => a.nombre).join(', ') || '—';
    }
    return match.arbitros;
}

function renderMatchRow(match, onNavigate, setMatches) {
    return h(TableRow, { key: match.id_partido || match.id },
        h(TableCell, null, formatearFecha(match.fecha)),
        h(TableCell, null, match.hora || '—'),
        h(TableCell, null, match.cancha_nombre || '—'),
        h(TableCell, null, match.torneo || '—'),
        h(TableCell, { className: 'bold' }, match.equipo_local_nombre || match.teamA || match.equipo_local || match.local || 'Local'),
        h(TableCell, { className: 'bold' }, match.equipo_visitante_nombre || match.teamB || match.equipo_visitante || match.visitante || 'Visitante'),
        h(TableCell, null, renderArbitrosCell(match)),
        h(TableCell, null, h(Badge, { variant: getBadgeVariant(match.estado || match.status) }, match.estado || match.status || '—')),
        h(TableCell, { align: 'center', className: 'score' }, match.goles_local != null ? `${match.goles_local} - ${match.goles_visitante}` : '—'),
        h(TableCell, null,
            renderMatchActions(match, onNavigate, setMatches)
        )
    );
}

function renderMatchesTable({ loading, matches, onNavigate, setMatches }) {
    let rows;
    if (loading) {
        rows = h(TableRow, null, h(TableCell, { colSpan: 10, style: { textAlign: 'center' } }, 'Cargando...'));
    } else if (matches.length === 0) {
        rows = h(TableRow, null, h(TableCell, { colSpan: 10, style: { textAlign: 'center' } }, 'No hay partidos'));
    } else {
        rows = matches.map(match => renderMatchRow(match, onNavigate, setMatches));
    }

    return h(Table, null,
        h(TableHeader, null,
            h(TableHeaderCell, null, 'Fecha'),
            h(TableHeaderCell, null, 'Hora'),
            h(TableHeaderCell, null, 'Cancha'),
            h(TableHeaderCell, null, 'Torneo'),
            h(TableHeaderCell, null, 'Equipo A'),
            h(TableHeaderCell, null, 'Equipo B'),
            h(TableHeaderCell, null, 'Árbitro(s)'),
            h(TableHeaderCell, null, 'Estado'),
            h(TableHeaderCell, { align: 'center' }, 'Resultado'),
            h(TableHeaderCell, null, 'Acciones')
        ),
        h('tbody', null, rows)
    );
}

export function MatchListPage({ onNavigate }) {
    const [matches, setMatches] = useState([]);
    const [tournaments, setTournaments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [estadoFilter, setEstadoFilter] = useState('');
    const [selectedTorneo, setSelectedTorneo] = useState('');

    useEffect(() => {
        loadTournaments(setTournaments);
    }, []);

    useEffect(() => {
        loadMatches(estadoFilter, selectedTorneo, setMatches, setLoading);
    }, [estadoFilter, selectedTorneo]);

    return h('div', { className: 'match-page' },
        h('div', { className: 'match-section' },
            h('h1', { className: 'match-title' }, 'Partidos')
        ),

        h(Card, null,
            h(CardHeader, { title: 'Partidos' },
                renderFilters({ selectedTorneo, setSelectedTorneo, tournaments, estadoFilter, setEstadoFilter, onNavigate })
            ),

            renderMatchesTable({ loading, matches, onNavigate, setMatches })
        )
    );
}

export default MatchListPage;