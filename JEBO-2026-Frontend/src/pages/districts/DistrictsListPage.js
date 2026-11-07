import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell, TableActions } from '../../components/ui/Table.js';
import { Modal } from '../../components/ui/Modal.js';
import { Loading } from '../../components/ui/Loading.js';
import { IconEdit, IconTrash, IconPlus } from '../../components/icons/index.js';
import { districtService } from '../../services/districtService.js';

const { createElement: h } = React;

const normalizar = (texto) => String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function DistrictsListPage({ onNavigate }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [search, setSearch] = useState('');

    const load = async () => {
        try {
            setLoading(true);
            const result = await districtService.getAll();
            setItems(Array.isArray(result) ? result : result?.data || result?.rows || []);
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleDelete = (item) => { setItemToDelete(item); setShowModal(true); };
    const confirmDelete = async () => {
        try {
            await districtService.delete(itemToDelete.id || itemToDelete.id_distrito);
            setItems(items.filter(i => (i.id || i.id_distrito) !== (itemToDelete.id || itemToDelete.id_distrito)));
        } catch (err) { setError(err.message); }
        setShowModal(false);
    };

    const termino = normalizar(search);
    const filtered = termino
        ? items.filter(i => normalizar(i.nombre || i.name).includes(termino))
        : items;

    if (loading) return h(Loading);

    return h('div', null,
        error && h('div', { style: { color: '#ef4444', padding: '12px', marginBottom: '16px', backgroundColor: '#fee2e2', borderRadius: '6px' } }, error),

        h('div', { style: { marginBottom: '16px' } },
            h('h1', { style: { fontSize: '24px', fontWeight: 'bold', color: styles.cardTitle.color, marginBottom: '4px' } }, 'Distritos'),
            h('p', { style: { fontSize: '14px', color: '#6b7280' } }, 'Gestioná los distritos escolares: creá, editá o eliminá según corresponda.')
        ),

        h(Card, null,
            h(CardHeader, { title: 'Distritos' },
                h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
                    h('input', {
                        type: 'text',
                        placeholder: 'Buscar distrito...',
                        'aria-label': 'Buscar distrito',
                        value: search,
                        onChange: (e) => setSearch(e.target.value),
                        style: { ...styles.formInput, width: '200px', maxWidth: '100%', flexGrow: 1, marginBottom: 0 }
                    }),
                    h('button', {
                        style: styles.buttonPrimary,
                        onClick: () => onNavigate('districts-new')
                    }, h(IconPlus), 'Crear')
                )
            ),
            h(Table, null,
                h(TableHeader, null,
                    h(TableHeaderCell, null, 'Nombre'),
                    h(TableHeaderCell, null, 'Acciones')
                ),
                h('tbody', null,
                    filtered.length === 0
                        ? h(TableRow, null, h(TableCell, { colSpan: 2, style: { textAlign: 'center', color: '#9ca3af' } }, termino ? 'Sin resultados para la búsqueda' : 'No hay distritos registrados'))
                        : filtered.map(item => {
                            const id = item.id || item.id_distrito;
                            return h(TableRow, { key: id },
                                h(TableCell, { style: { fontWeight: 500 } }, item.nombre || item.name),
                                h(TableCell, null,
                                    h(TableActions, null,
                                        h('button', {
                                            style: { ...styles.buttonSuccess, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' },
                                            onClick: () => onNavigate('districts-edit/' + id)
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
        showModal && h(Modal, { isOpen: showModal, onClose: () => setShowModal(false), onConfirm: confirmDelete, title: 'Confirmar Eliminación', message: `¿Eliminar "${itemToDelete?.nombre || itemToDelete?.name}"?`, confirmText: 'Eliminar', confirmStyle: 'danger' })
    );
}
