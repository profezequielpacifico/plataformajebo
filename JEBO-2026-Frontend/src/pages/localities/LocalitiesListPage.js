import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell, TableActions } from '../../components/ui/Table.js';
import { Modal } from '../../components/ui/Modal.js';
import { Loading } from '../../components/ui/Loading.js';
import { IconTrash, IconPlus, IconEdit } from '../../components/icons/index.js';
import { localityService } from '../../services/localityService.js';

const { createElement: h } = React;

const normalizar = (texto) => String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function LocalitiesListPage({ onNavigate }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [search, setSearch] = useState('');

    const load = async () => {
        try {
            setLoading(true);
            const result = await localityService.getAll();
            setItems(Array.isArray(result) ? result : result?.data || result?.rows || []);
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleDelete = (item) => { setItemToDelete(item); setShowModal(true); };
    const confirmDelete = async () => {
        try {
            await localityService.delete(itemToDelete.id_localidad);
            setItems(items.filter(i => i.id_localidad !== itemToDelete.id_localidad));
        } catch (err) { setError(err.message); }
        setShowModal(false);
    };

    const termino = normalizar(search);
    const filtered = termino
        ? items.filter(i => [i.nombre, i.distrito_nombre, i.region_nombre, i.codigo].some(v => normalizar(v).includes(termino)))
        : items;

    if (loading) return h(Loading);

    return h('div', null,
        error && h('div', { style: { color: '#ef4444', padding: '12px', marginBottom: '16px', backgroundColor: '#fee2e2', borderRadius: '6px' } }, error),
        h(Card, null,
            h(CardHeader, { title: 'Localidades' },
                h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
                    h('input', {
                        type: 'text',
                        placeholder: 'Buscar por nombre, distrito, región o código...',
                        'aria-label': 'Buscar localidad',
                        value: search,
                        onChange: (e) => setSearch(e.target.value),
                        style: { ...styles.formInput, width: '340px', maxWidth: '100%', flexGrow: 1, marginBottom: 0 }
                    }),
                    h('button', {
                        style: styles.buttonPrimary,
                        onClick: () => onNavigate('localities-new')
                    }, h(IconPlus), 'Nueva Localidad')
                )
            ),
            h(Table, null,
                h(TableHeader, null,
                    h(TableHeaderCell, null, 'Nombre'),
                    h(TableHeaderCell, null, 'Distrito'),
                    h(TableHeaderCell, null, 'Región'),
                    h(TableHeaderCell, null, 'Código'),
                    h(TableHeaderCell, null, 'Acciones')
                ),
                h('tbody', null,
                    filtered.length === 0 && h(TableRow, null, h(TableCell, { colSpan: 5, style: { textAlign: 'center', color: '#9ca3af' } }, termino ? 'Sin resultados para la búsqueda' : 'No hay localidades registradas')),
                    filtered.map(item => {
                        return h(TableRow, { key: item.id_localidad },
                            h(TableCell, { style: { fontWeight: 500 } }, item.nombre),
                            h(TableCell, null, item.distrito_nombre || '-'),
                            h(TableCell, null, item.region_nombre || '-'),
                            h(TableCell, null, item.codigo || '-'),
                            h(TableCell, null,
                                h(TableActions, null,
                                    h('button', { style: { ...styles.buttonSuccess, padding: '6px 12px' }, onClick: () => onNavigate('localities-edit/' + item.id_localidad) }, h(IconEdit)),
                                    h('button', { style: { ...styles.buttonDanger, padding: '6px 12px' }, onClick: () => handleDelete(item) }, h(IconTrash))
                                )
                            )
                        );
                    })
                )
            )
        ),
        showModal && h(Modal, { isOpen: showModal, onClose: () => setShowModal(false), onConfirm: confirmDelete, title: 'Confirmar', message: `¿Eliminar "${itemToDelete?.nombre}"?`, confirmText: 'Eliminar', confirmStyle: 'danger' })
    );
}
