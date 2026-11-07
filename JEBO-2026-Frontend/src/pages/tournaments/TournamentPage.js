import React, { useState, useEffect } from 'react';
import { styles, COLORS } from '../../styles/theme/index.js';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell, TableActions } from '../../components/ui/Table.js';
import { Modal } from '../../components/ui/Modal.js';
import { ErrorAlert } from '../../components/ui/ErrorAlert.js';
import { IconTrophy, IconUsers, IconHome, IconPlus, IconEye, IconEdit, IconTrash } from '../../components/icons/index.js';
import disciplineService from '../../services/disciplineService.js';
import tournamentService from '../../services/tournamentService.js';
import teamService from '../../services/teamService.js';
import { formatearFecha, instanteAFechaHoraArgentina } from '../../services/dateService.js';

const { createElement: h } = React;

function getBadgeVariant(status) {
    if (status === 'Activo' || status === 'En Progreso') return 'green';
    if (status === 'Programado' || status === 'Pendiente') return 'yellow';
    if (status === 'Finalizado') return 'blue';
    if (status === 'Cancelado') return 'red';
    return 'yellow';
}

function getFilteredTournaments(tournaments, disciplineFilter, statusFilter) {
    return tournaments.filter(t => {
        const matchDiscipline = disciplineFilter === 'all' || String(t.id_disciplina || t.id) === disciplineFilter;
        const statusMap = { 'programado': 'Programado', 'en-progreso': 'En Progreso' };
        const matchStatus = statusFilter === 'all'
            || (t.estado || '').toLowerCase() === (statusMap[statusFilter] || statusFilter).toLowerCase();
        return matchDiscipline && matchStatus;
    });
}

function buildDeleteErrorState(err) {
    return {
        show: true,
        title: 'Error al eliminar',
        message: err.message || 'No se pudo eliminar el torneo.',
        suggestion: err.message.includes('registros asociados') || err.message.includes('partidos')
            ? 'Eliminá primero los partidos, equipos o posiciones asociadas a este torneo antes de intentar eliminarlo.'
            : ''
    };
}

async function loadDisciplineStats(setDisciplines) {
    let count = 0;
    try {
        const res = await disciplineService.getAll();
        const data = res.data || res || [];
        const arr = Array.isArray(data) ? data : [];
        setDisciplines(arr);
        count = arr.length;
    } catch (err) {
        console.error('Error loading disciplines:', err);
    }
    return count;
}

async function loadTeamStats() {
    let count = 0;
    try {
        const res = await teamService.getAll({ limit: 100 });
        const data = res.data || res || [];
        const arr = Array.isArray(data) ? data : [];
        count = res.pagination?.total || arr.length;
    } catch (err) {
        console.error('Error loading teams:', err);
    }
    return count;
}

async function loadTournamentStats(setTournaments) {
    let count = 0;
    try {
        const res = await tournamentService.getAll(1, 100, { scope: 'active' });
        const data = res.data || res || [];
        const arr = Array.isArray(data) ? data : [];
        setTournaments(arr);
        count = arr.length;
    } catch (err) {
        console.error('Error loading tournaments:', err);
    }
    return count;
}

async function loadDashboardData(setDisciplines, setTournaments, setStats) {
    const discCount = await loadDisciplineStats(setDisciplines);
    const teamCount = await loadTeamStats();
    const tournCount = await loadTournamentStats(setTournaments);
    setStats([
        { icon: IconTrophy, label: 'Disciplinas', value: String(discCount) },
        { icon: IconUsers, label: 'Equipos', value: String(teamCount) },
        { icon: IconHome, label: 'Torneos', value: String(tournCount) }
    ]);
}

function renderStatCards(stats, isMobile) {
    return h('div', { style: { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: isMobile ? '10px' : '15px', marginBottom: '16px' } },
        stats.map((stat, index) =>
            h('div', { key: index, style: { backgroundColor: 'white', border: `1px solid ${COLORS.borderGray}`, borderRadius: '8px', padding: '15px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } },
                h('div', { style: { color: COLORS.primary, display: 'flex', alignItems: 'center' } }, h(stat.icon)),
                h('div', null,
                    h('div', { style: { fontSize: '12px', color: COLORS.textDark, fontWeight: '500' } }, stat.label),
                    h('div', { style: { fontSize: '20px', fontWeight: '700', color: COLORS.primary } }, stat.value)
                )
            )
        )
    );
}

function renderFilters(disciplines, disciplineFilter, statusFilter, setDisciplineFilter, setStatusFilter, isMobile) {
    return h('div', { style: { display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '15px', marginBottom: '20px', alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap' } },
        h('select', { value: disciplineFilter, onChange: (e) => setDisciplineFilter(e.target.value), style: { ...styles.formSelect, minWidth: isMobile ? '100%' : '150px', width: isMobile ? '100%' : 'auto' } },
            h('option', { value: 'all' }, 'Todas las disciplinas'),
            disciplines.map(d => h('option', { key: d.id_disciplina || d.id, value: String(d.id_disciplina || d.id) }, d.nombre || d.name))
        ),
        h('select', { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), style: { ...styles.formSelect, minWidth: isMobile ? '100%' : '120px', width: isMobile ? '100%' : 'auto' } },
            h('option', { value: 'all' }, 'Todos'),
            h('option', { value: 'programado' }, 'Programado'),
            h('option', { value: 'en-progreso' }, 'En Progreso')
        )
    );
}

function renderToolbar(onNavigate) {
    return h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' } },
        h('h3', { style: { margin: 0 } }, 'Torneos'),
        h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
            onNavigate && h('button', {
                style: { ...styles.buttonOutline, padding: '8px 12px', fontSize: '14px' },
                onClick: () => onNavigate('tournaments-history')
            }, 'Historial de Torneos'),
            onNavigate && h('button', {
                style: styles.buttonPrimary,
                onClick: () => onNavigate('tournaments-new')
            }, h(IconPlus), 'Nuevo Torneo')
        )
    );
}

function renderTournamentTableHeader() {
    return h(TableHeader, null,
        h(TableHeaderCell, {}, 'Nombre'),
        h(TableHeaderCell, {}, 'Categoría'),
        h(TableHeaderCell, {}, 'Inicio'),
        h(TableHeaderCell, {}, 'Fin'),
        h(TableHeaderCell, {}, 'Inscripciones'),
        h(TableHeaderCell, {}, 'Estado'),
        h(TableHeaderCell, {}, 'Acciones')
    );
}

function renderEmptyTournamentsRow() {
    return h(TableRow, null,
        h(TableCell, { colSpan: 7, style: { textAlign: 'center', color: '#9ca3af' } }, 'Sin torneos')
    );
}

function renderNoResultsRow() {
    return h(TableRow, null,
        h(TableCell, { colSpan: 7, style: { textAlign: 'center', color: '#9ca3af' } }, 'Sin resultados para los filtros seleccionados')
    );
}

function formatDate(value) {
    return value ? formatearFecha(value) : '-';
}

function formatInstantDate(value) {
    return value ? formatearFecha(instanteAFechaHoraArgentina(value)) : '-';
}

function renderTournamentRow(t, onNavigate, handleDelete) {
    return h(TableRow, { key: t.id_torneo || t.id },
        h(TableCell, { style: { fontWeight: 500 } }, t.nombre),
        h(TableCell, {}, t.categoria || '-'),
        h(TableCell, {}, formatDate(t.fecha_inicio)),
        h(TableCell, {}, formatDate(t.fecha_fin)),
        h(TableCell, {}, formatInstantDate(t.fecha_inscripcion_inicio) + ' - ' + formatInstantDate(t.fecha_inscripcion_fin)),
        h(TableCell, {}, h(Badge, { variant: getBadgeVariant(t.estado) }, t.estado)),
        h(TableCell, null,
            h(TableActions, null,
                h('button', {
                    style: { ...styles.buttonInfo, padding: '6px 10px' },
                    onClick: () => onNavigate && onNavigate('tournaments-view/' + (t.id_torneo || t.id))
                }, h(IconEye)),
                h('button', {
                    style: { ...styles.buttonSuccess, padding: '6px 10px' },
                    onClick: () => onNavigate && onNavigate(`tournaments-edit/${t.id_torneo || t.id}`)
                }, h(IconEdit)),
                h('button', {
                    style: { ...styles.buttonDanger, padding: '6px 10px' },
                    onClick: () => handleDelete(t)
                }, h(IconTrash)),
                h('button', {
                    style: { ...styles.buttonPrimary, padding: '6px 10px' },
                    onClick: () => onNavigate && onNavigate('tournaments-stages/' + (t.id_torneo || t.id))
                }, 'Etapas')
            )
        )
    );
}

function renderTournamentRows(tournaments, filteredTournaments, onNavigate, handleDelete) {
    if (tournaments.length === 0) {
        return renderEmptyTournamentsRow();
    }
    if (filteredTournaments.length === 0) {
        return renderNoResultsRow();
    }
    return filteredTournaments.map(t => renderTournamentRow(t, onNavigate, handleDelete));
}

function renderDeleteModal(showModal, tournamentToDelete, setShowModal, confirmDelete) {
    return showModal && h(Modal, {
        isOpen: showModal,
        onClose: () => setShowModal(false),
        onConfirm: confirmDelete,
        title: 'Confirmar Eliminación',
        message: `¿Eliminar el torneo "${tournamentToDelete?.nombre}"?`,
        confirmText: 'Eliminar',
        confirmStyle: 'danger'
    });
}

function renderErrorAlert(errorAlert, setErrorAlert) {
    return h(ErrorAlert, {
        show: errorAlert.show,
        onClose: () => setErrorAlert({ show: false, title: '', message: '', suggestion: '' }),
        title: errorAlert.title,
        message: errorAlert.message,
        suggestion: errorAlert.suggestion
    });
}

export function TournamentPage({ onNavigate }) {
    const [disciplines, setDisciplines] = useState([]);
    const [tournaments, setTournaments] = useState([]);
    const [stats, setStats] = useState([]);
    const [disciplineFilter, setDisciplineFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showModal, setShowModal] = useState(false);
    const [tournamentToDelete, setTournamentToDelete] = useState(null);
    const [errorAlert, setErrorAlert] = useState({ show: false, title: '', message: '', suggestion: '' });

    const filteredTournaments = getFilteredTournaments(tournaments, disciplineFilter, statusFilter);

    const handleDelete = (tournament) => {
        setTournamentToDelete(tournament);
        setShowModal(true);
    };

    const confirmDelete = async () => {
        try {
            await tournamentService.delete(tournamentToDelete.id_torneo || tournamentToDelete.id);
            setTournaments(tournaments.filter(t => (t.id_torneo || t.id) !== (tournamentToDelete.id_torneo || tournamentToDelete.id)));
            setShowModal(false);
        } catch (err) {
            setShowModal(false);
            setErrorAlert(buildDeleteErrorState(err));
        }
    };

    useEffect(() => {
        loadDashboardData(setDisciplines, setTournaments, setStats);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return h('div', { style: { padding: isMobile ? '12px' : '24px' } },
        renderStatCards(stats, isMobile),
        renderFilters(disciplines, disciplineFilter, statusFilter, setDisciplineFilter, setStatusFilter, isMobile),

        h(Card, null,
            renderToolbar(onNavigate),
            h(Table, null,
                renderTournamentTableHeader(),
                h('tbody', null, renderTournamentRows(tournaments, filteredTournaments, onNavigate, handleDelete))
            ),
            renderDeleteModal(showModal, tournamentToDelete, setShowModal, confirmDelete),
            renderErrorAlert(errorAlert, setErrorAlert)
        )
    );
}

export default TournamentPage;