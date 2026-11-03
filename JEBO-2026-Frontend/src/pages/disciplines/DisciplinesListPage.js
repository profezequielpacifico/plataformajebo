import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell, TableActions } from '../../components/ui/Table.js';
import { Modal } from '../../components/ui/Modal.js';
import { Loading } from '../../components/ui/Loading.js';
import { IconPlus, IconEdit, IconTrash, IconEye } from '../../components/icons/index.js';
import disciplineService from '../../services/disciplineService.js';

const { createElement: h } = React;

export function DisciplinesListPage({ onNavigate }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const load = async () => {
        try {
            setLoading(true);
            const result = await disciplineService.getAll();
            setItems(Array.isArray(result) ? result : result?.data || result?.rows || []);
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleDelete = (item) => { setItemToDelete(item); setShowModal(true); };
    const confirmDelete = async () => {
        try {
            await disciplineService.delete(itemToDelete.id || itemToDelete.id_disciplina);
            setItems(items.filter(i => (i.id || i.id_disciplina) !== (itemToDelete.id || itemToDelete.id_disciplina)));
        } catch (err) { setError(err.message); }
        setShowModal(false);
    };

    if (loading) return h(Loading);

    return h('div', null,
        error && h('div', { style: { color: '#ef4444', padding: '12px', marginBottom: '16px', backgroundColor: '#fee2e2', borderRadius: '6px' } }, error),
        h(Card, null,
            h(CardHeader, { title: 'Deportes' },
                h('button', {
                    style: styles.buttonPrimary,
                    onClick: () => onNavigate && onNavigate('sports-new')
                }, h(IconPlus), 'Nuevo Deporte')
            ),
            h(Table, null,
                h(TableHeader, null,
                    h(TableHeaderCell, null, 'Nombre'),
                    h(TableHeaderCell, null, 'Estudiantes por Equipo'),
                    h(TableHeaderCell, null, 'Descripción'),
                    h(TableHeaderCell, null, 'Acciones')
                ),
                h('tbody', null,
                    items.length === 0
                        ? h(TableRow, null,
                            h(TableCell, { colSpan: 4, style: { textAlign: 'center', color: '#9ca3af' } }, 'Sin deportes registrados')
                        )
                        : items.map(item => {
                            const id = item.id || item.id_disciplina;
                            return h(TableRow, { key: id },
                                h(TableCell, { style: { fontWeight: 500 } }, item.nombre || item.name),
                                h(TableCell, null, item.jugadores_por_equipo || item.players_per_team || '-'),
                                h(TableCell, null, item.descripcion || item.description || '-'),
                                h(TableCell, null,
                                    h(TableActions, null,
                                        h('button', {
                                            style: { ...styles.buttonOutline, padding: '6px 10px' },
                                            title: 'Ver detalle',
                                            onClick: () => onNavigate && onNavigate(`sports-view/${id}`)
                                        }, h(IconEye)),
                                        h('button', {
                                            style: { ...styles.buttonSuccess, padding: '6px 10px' },
                                            onClick: () => onNavigate && onNavigate(`sports-edit/${id}`)
                                        }, h(IconEdit)),
                                        h('button', {
                                            style: { ...styles.buttonDanger, padding: '6px 10px' },
                                            onClick: () => handleDelete(item)
                                        }, h(IconTrash))
                                    )
                                )
                            );
                        })
                )
            )
        ),
        showModal && h(Modal, {
            isOpen: showModal, onClose: () => setShowModal(false),
            onConfirm: confirmDelete, title: 'Confirmar',
            message: `¿Eliminar "${itemToDelete?.nombre || itemToDelete?.name}"?`,
            confirmText: 'Eliminar', confirmStyle: 'danger'
        })
    );
}

export default DisciplinesListPage;
