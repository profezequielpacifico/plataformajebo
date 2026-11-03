import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell, TableActions } from '../../components/ui/Table.js';
import { Modal } from '../../components/ui/Modal.js';
import { Loading } from '../../components/ui/Loading.js';
import { IconEdit, IconTrash, IconPlus } from '../../components/icons/index.js';
import { institutionService } from '../../services/institutionService.js';

const { createElement: h } = React;

export function InstitutionsListPage({ onNavigate }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const load = async () => {
        try {
            setLoading(true);
            const result = await institutionService.getAll();
            setItems(Array.isArray(result) ? result : result?.data || result?.rows || []);
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleDelete = (item) => { setItemToDelete(item); setShowModal(true); };
    const confirmDelete = async () => {
        try {
            await institutionService.delete(itemToDelete.id || itemToDelete.id_institucion);
            setItems(items.filter(i => (i.id || i.id_institucion) !== (itemToDelete.id || itemToDelete.id_institucion)));
        } catch (err) { setError(err.message); }
        setShowModal(false);
    };

    if (loading) return h(Loading);

    return h('div', null,
        error && h('div', { style: { color: '#ef4444', padding: '12px', marginBottom: '16px', backgroundColor: '#fee2e2', borderRadius: '6px' } }, error),

        h('div', { style: { marginBottom: '16px' } },
            h('h1', { style: { fontSize: '24px', fontWeight: 'bold', color: styles.cardTitle.color, marginBottom: '4px' } }, 'Instituciones'),
            h('p', { style: { fontSize: '14px', color: '#6b7280' } }, 'Gestioná las instituciones: creá, editá o eliminá según corresponda.')
        ),

        h(Card, null,
            h(CardHeader, { title: 'Instituciones' },
                h('div', { style: { display: 'flex', gap: '8px' } },
                    h('button', {
                        style: styles.buttonPrimary,
                        onClick: () => onNavigate('institutions-new')
                    }, h(IconPlus), 'Crear')
                )
            ),
            h(Table, null,
                h(TableHeader, null,
                    h(TableHeaderCell, null, 'Nombre'),
                    h(TableHeaderCell, null, 'Tipo'),
                    h(TableHeaderCell, null, 'Dirección'),
                    h(TableHeaderCell, null, 'Teléfono'),
                    h(TableHeaderCell, null, 'Acciones')
                ),
                h('tbody', null,
                    items.length === 0
                        ? h(TableRow, null, h(TableCell, { colSpan: 5, style: { textAlign: 'center', color: '#9ca3af' } }, 'No hay instituciones registradas'))
                        : items.map(item => {
                            const id = item.id || item.id_institucion;
                            return h(TableRow, { key: id },
                                h(TableCell, { style: { fontWeight: 500 } }, item.nombre || item.name),
                                h(TableCell, null, item.tipo || item.type || '-'),
                                h(TableCell, null, item.direccion || item.address || '-'),
                                h(TableCell, null, item.telefono || item.phone || '-'),
                                h(TableCell, null,
                                    h(TableActions, null,
                                        h('button', {
                                            style: { ...styles.buttonSuccess, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' },
                                            onClick: () => onNavigate('institutions-edit/' + id)
                                        }, h(IconEdit), 'Editar'),
                                        h('button', {
                                            style: { ...styles.buttonDanger, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' },
                                            onClick: () => handleDelete(item)
                                        }, h(IconTrash), 'Eliminar')
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
