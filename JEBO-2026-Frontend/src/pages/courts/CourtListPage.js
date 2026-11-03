import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell, TableActions } from '../../components/ui/Table.js';
import { Modal } from '../../components/ui/Modal.js';
import { Loading } from '../../components/ui/Loading.js';
import { IconPlus, IconEdit, IconTrash } from '../../components/icons/index.js';
import { courtService } from '../../services/courtService.js';

const { createElement: h } = React;

export function CourtListPage({ onNavigate }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const load = async () => {
        try {
            setLoading(true);
            const result = await courtService.getAll();
            setItems(Array.isArray(result) ? result : result?.data || result?.rows || []);
        } catch (err) {
            setError(err.message || 'Error al cargar');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleDelete = (item) => { setItemToDelete(item); setShowModal(true); };
    const confirmDelete = async () => {
        try {
            await courtService.delete(itemToDelete.id || itemToDelete.id_cancha);
            setItems(items.filter(i => (i.id || i.id_cancha) !== (itemToDelete.id || itemToDelete.id_cancha)));
        } catch (err) { setError(err.message || 'Error al eliminar'); }
        setShowModal(false);
    };

    if (loading) return h(Loading);

    return h('div', null,
        error && h('div', { style: { color: '#ef4444', padding: '12px', marginBottom: '16px', backgroundColor: '#fee2e2', borderRadius: '6px' } }, error),
        h(Card, null,
            h(CardHeader, { title: 'Canchas' },
                h('button', {
                    style: { ...styles.buttonPrimary, display: 'flex', alignItems: 'center', gap: '6px' },
                    onClick: () => onNavigate('courts-new')
                }, h(IconPlus), 'Nueva Cancha')
            ),
            h(Table, null,
                h(TableHeader, null,
                    h(TableHeaderCell, null, 'Nombre'),
                    h(TableHeaderCell, null, 'Ubicación'),
                    h(TableHeaderCell, null, 'Disciplina'),
                    h(TableHeaderCell, null, 'Acciones')
                ),
                h('tbody', null,
                    items.length === 0
                        ? h(TableRow, null,
                            h(TableCell, { colSpan: 4, style: { textAlign: 'center', color: '#9ca3af', padding: '24px' } },
                                'No hay canchas registradas'
                            )
                        )
                        : items.map(item => {
                            const id = item.id || item.id_cancha;
                            return h(TableRow, { key: id },
                                h(TableCell, { style: { fontWeight: 500 } }, item.nombre || item.name),
                                h(TableCell, null, item.ubicacion || item.location || '-'),
                                h(TableCell, null, item.disciplina_nombre || '-'),
                                h(TableCell, null,
                                    h(TableActions, null,
                                        h('button', {
                                            style: { ...styles.buttonInfo, padding: '6px 12px' },
                                            onClick: () => onNavigate('courts-edit/' + id)
                                        }, h(IconEdit)),
                                        h('button', {
                                            style: { ...styles.buttonDanger, padding: '6px 12px' },
                                            onClick: () => handleDelete(item)
                                        }, h(IconTrash))
                                    )
                                )
                            );
                        })
                )
            )
        ),
        showModal && h(Modal, { isOpen: showModal, onClose: () => setShowModal(false), onConfirm: confirmDelete, title: 'Confirmar', message: `¿Eliminar "${itemToDelete?.nombre || itemToDelete?.name}"?`, confirmText: 'Eliminar', confirmStyle: 'danger' })
    );
}

export default CourtListPage;
