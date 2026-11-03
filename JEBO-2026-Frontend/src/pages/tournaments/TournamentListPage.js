import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell, TableActions } from '../../components/ui/Table.js';
import { Modal } from '../../components/ui/Modal.js';
import { Loading } from '../../components/ui/Loading.js';
import { IconPlus, IconEdit, IconTrash, IconEye, IconArrowLeft } from '../../components/icons/index.js';
import { tournamentService } from '../../services/tournamentService.js';

const { createElement: h } = React;

function getBadgeVariant(status) {
    if (status === 'En Progreso') return 'green';
    if (status === 'Pendiente') return 'yellow';
    if (status === 'Finalizado') return 'blue';
    return 'yellow';
}

function getFilteredTournaments(tournaments, searchTerm) {
    return tournaments.filter(t => {
        const nombre = (t.nombre || t.name || '').toLowerCase();
        return nombre.includes(searchTerm.toLowerCase());
    });
}

async function loadTournaments(setTournaments, setLoading, setError) {
    try {
        setLoading(true);
        const result = await tournamentService.getAll(1, 100, { scope: 'archived' });
        const list = Array.isArray(result) ? result : result?.data || result?.rows || [];
        setTournaments(list);
    } catch (err) {
        setError(err.message || 'Error al cargar torneos');
    } finally {
        setLoading(false);
    }
}

function renderErrorBanner(error) {
    return error && h('div', {
        style: { color: '#ef4444', padding: '12px', marginBottom: '16px', backgroundColor: '#fee2e2', borderRadius: '6px' }
    }, error);
}

function renderListHeader(onNavigate) {
    return h(CardHeader, { title: 'Historial de Torneos' },
        h('div', { style: { display: 'flex', gap: '8px' } },
            h('button', {
                style: styles.buttonOutline,
                onClick: () => onNavigate('tournaments')
            }, h(IconArrowLeft), 'Volver'),
            h('button', {
                style: styles.buttonPrimary,
                onClick: () => onNavigate('tournaments-new')
            }, h(IconPlus), 'Nuevo Torneo')
        )
    );
}

function renderSearchBox(searchTerm, setSearchTerm) {
    return h('div', { style: { padding: '16px', borderBottom: '1px solid #e5e7eb' } },
        h('input', {
            type: 'text',
            placeholder: 'Buscar torneo por nombre...',
            value: searchTerm,
            onChange: (e) => setSearchTerm(e.target.value),
            style: {
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
            }
        })
    );
}

function renderTableHeader() {
    return h(TableHeader, null,
        h(TableHeaderCell, null, 'Nombre'),
        h(TableHeaderCell, null, 'Categoría'),
        h(TableHeaderCell, null, 'Inicio'),
        h(TableHeaderCell, null, 'Fin'),
        h(TableHeaderCell, null, 'Equipos'),
        h(TableHeaderCell, null, 'Estado'),
        h(TableHeaderCell, null, 'Acciones')
    );
}

function renderEmptyRow(searchTerm) {
    const message = searchTerm ? 'Sin resultados para la búsqueda' : 'Sin torneos';
    return h(TableRow, null,
        h(TableCell, { colSpan: 7, style: { textAlign: 'center', color: '#9ca3af' } }, message)
    );
}

function renderTournamentRow(tournament, onNavigate, handleEdit, handleDelete) {
    return h(TableRow, { key: tournament.id || tournament.id_torneo },
        h(TableCell, { style: { fontWeight: 500 } }, tournament.nombre || tournament.name),
        h(TableCell, null, tournament.categoria || tournament.category || '-'),
        h(TableCell, null, tournament.fecha_inicio || tournament.start || '-'),
        h(TableCell, null, tournament.fecha_fin || tournament.end || '-'),
        h(TableCell, null, tournament.cantidad_equipos || tournament.teams || '-'),
        h(TableCell, null, h(Badge, { variant: getBadgeVariant(tournament.estado || tournament.status) }, tournament.estado || tournament.status)),
        h(TableCell, null,
            h(TableActions, null,
                h('button', {
                    style: { ...styles.buttonInfo, padding: '6px 12px' },
                    onClick: () => onNavigate('tournaments-view/' + (tournament.id || tournament.id_torneo))
                }, h(IconEye)),
                h('button', {
                    style: { ...styles.buttonSuccess, padding: '6px 12px' },
                    onClick: () => handleEdit(tournament)
                }, h(IconEdit)),
                h('button', {
                    style: { ...styles.buttonDanger, padding: '6px 12px' },
                    onClick: () => handleDelete(tournament)
                }, h(IconTrash))
            )
        )
    );
}

function renderTournamentRows(filteredTournaments, searchTerm, onNavigate, handleEdit, handleDelete) {
    if (filteredTournaments.length === 0) {
        return renderEmptyRow(searchTerm);
    }
    return filteredTournaments.map(tournament => renderTournamentRow(tournament, onNavigate, handleEdit, handleDelete));
}

function renderEditModal(showModal, tournamentToEdit, setShowModal, confirmEdit) {
    return showModal && h(Modal, {
        isOpen: showModal,
        onClose: () => setShowModal(false),
        onConfirm: confirmEdit,
        title: 'Modificar torneo',
        confirmText: 'Continuar',
        confirmStyle: 'primary',
        warning: true,
        cancelText: 'Cancelar',
        message: h('div', null,
            h('p', { style: { marginBottom: '8px' } },
                `Estás por modificar el torneo "${tournamentToEdit?.nombre || tournamentToEdit?.name}".`
            ),
            h('p', { style: { color: '#6b7280', fontSize: '14px' } },
                'Se abrirá el formulario en modo edición. Los cambios que realices se aplicarán recién cuando confirmes el guardado. Revisá con atención los datos antes de guardar.'
            )
        )
    });
}

function renderDeleteModal(showModal, tournamentToDelete, setShowModal, confirmDelete) {
    const nombre = tournamentToDelete?.nombre || tournamentToDelete?.name;
    return showModal && h(Modal, {
        isOpen: showModal,
        onClose: () => setShowModal(false),
        onConfirm: confirmDelete,
        title: 'Eliminar torneo',
        confirmText: 'Eliminar',
        confirmStyle: 'danger',
        warning: true,
        cancelText: 'Cancelar',
        message: h('div', null,
            h('p', { style: { marginBottom: '8px' } }, `¿Seguro que querés eliminar el torneo "${nombre}"?`),
            h('p', { style: { color: '#b91c1c', fontSize: '13px', fontWeight: 600, marginBottom: '8px' } },
                'Esta acción no se puede deshacer.'
            ),
            h('p', { style: { color: '#6b7280', fontSize: '13px' } },
                'Se eliminarán también sus etapas y todos los datos asociados (partidos, posiciones y registros de la competencia).'
            )
        )
    });
}

export function TournamentListPage({ onNavigate }) {
    const [tournaments, setTournaments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [tournamentToDelete, setTournamentToDelete] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [tournamentToEdit, setTournamentToEdit] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTournaments = getFilteredTournaments(tournaments, searchTerm);

    useEffect(() => {
        loadTournaments(setTournaments, setLoading, setError);
    }, []);

    const handleEdit = (tournament) => {
        setTournamentToEdit(tournament);
        setShowEditModal(true);
    };

    const confirmEdit = () => {
        setShowEditModal(false);
        onNavigate('tournaments-edit/' + (tournamentToEdit.id || tournamentToEdit.id_torneo));
    };

    const handleDelete = (tournament) => {
        setTournamentToDelete(tournament);
        setShowModal(true);
    };

    const confirmDelete = async () => {
        try {
            const id = tournamentToDelete.id || tournamentToDelete.id_torneo;
            await tournamentService.delete(id);
            setTournaments(tournaments.filter(t => (t.id || t.id_torneo) !== id));
        } catch (err) {
            setError(err.message || 'Error al eliminar torneo');
        }
        setShowModal(false);
    };

    if (loading) return h(Loading);

    return h('div', null,
        renderErrorBanner(error),

        h(Card, null,
            renderListHeader(onNavigate),
            renderSearchBox(searchTerm, setSearchTerm),

            h(Table, null,
                renderTableHeader(),
                h('tbody', null, renderTournamentRows(filteredTournaments, searchTerm, onNavigate, handleEdit, handleDelete))
            )
        ),

        renderEditModal(showEditModal, tournamentToEdit, setShowEditModal, confirmEdit),
        renderDeleteModal(showModal, tournamentToDelete, setShowModal, confirmDelete)
    );
}

export default TournamentListPage;