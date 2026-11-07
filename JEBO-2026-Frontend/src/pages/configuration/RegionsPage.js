import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell, TableActions } from '../../components/ui/Table.js';
import { IconPlus, IconTrash } from '../../components/icons/index.js';
import { Modal } from '../../components/ui/Modal.js';
import { Loading } from '../../components/ui/Loading.js';
import { regionService } from '../../services/regionService.js';

const { createElement: h } = React;

export function RegionsPage({ onNavigate }) {
    const [regions, setRegions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [regionToDelete, setRegionToDelete] = useState(null);
    const [search, setSearch] = useState('');

    const loadRegions = async () => {
        try {
            setLoading(true);
            const result = await regionService.getAll();
            const list = Array.isArray(result) ? result : result?.data || result?.rows || [];
            setRegions(list);
        } catch (err) {
            setError(err.message || 'Error al cargar regiones');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRegions();
    }, []);

    const handleDelete = (region) => {
        setRegionToDelete(region);
        setShowModal(true);
    };

    const confirmDelete = async () => {
        try {
            await regionService.delete(regionToDelete.id || regionToDelete.id_region);
            setRegions(regions.filter(r => (r.id || r.id_region) !== (regionToDelete.id || regionToDelete.id_region)));
        } catch (err) {
            setError(err.message || 'Error al eliminar región');
        }
        setShowModal(false);
    };

    const filtered = search
        ? regions.filter(r => (r.nombre || r.name || '').toLowerCase().includes(search.toLowerCase()))
        : regions;

    if (loading) return h(Loading);

    return h('div', null,
        error && h('div', {
            style: { color: '#ef4444', padding: '12px', marginBottom: '16px', backgroundColor: '#fee2e2', borderRadius: '6px' }
        }, error),

        h('div', { style: { marginBottom: '16px' } },
            h('h1', { style: { fontSize: '24px', fontWeight: 'bold', color: styles.cardTitle.color, marginBottom: '4px' } }, 'Regiones'),
            h('p', { style: { fontSize: '14px', color: '#6b7280' } }, 'Gestioná las regiones deportivas de la provincia de Buenos Aires.')
        ),

        h(Card, null,
            h(CardHeader, { title: 'Regiones' },
                h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
                    h('input', {
                        type: 'text',
                        placeholder: 'Buscar región...',
                        value: search,
                        onChange: (e) => setSearch(e.target.value),
                        style: { ...styles.formInput, width: '200px', maxWidth: '100%', flexGrow: 1, marginBottom: 0 }
                    }),
                    h('button', {
                        style: styles.buttonPrimary,
                        onClick: () => onNavigate('regions-new')
                    }, h(IconPlus), 'Nueva Región')
                )
            ),

            h(Table, null,
                h(TableHeader, null,
                    h(TableHeaderCell, null, 'Región'),
                    h(TableHeaderCell, null, 'Descripción'),
                    h(TableHeaderCell, null, 'Acciones')
                ),
                h('tbody', null,
                    filtered.length === 0
                        ? h(TableRow, null, h(TableCell, { colSpan: 3, style: { textAlign: 'center' } }, 'No se encontraron regiones'))
                        : filtered.map(region => {
                            const id = region.id || region.id_region;
                            return h(TableRow, { key: id },
                                h(TableCell, { style: { fontWeight: 500 } }, region.nombre || region.name),
                                h(TableCell, null, region.descripcion || region.description || '-'),
                                h(TableCell, null,
                                    h(TableActions, null,
                                        h('button', {
                                            style: { ...styles.buttonDanger, padding: '6px 12px' },
                                            onClick: () => handleDelete(region)
                                        }, h(IconTrash))
                                    )
                                )
                            );
                        })
                )
            )
        ),

        showModal && h(Modal, {
            isOpen: showModal,
            onClose: () => setShowModal(false),
            onConfirm: confirmDelete,
            title: 'Confirmar Eliminación',
            message: `¿Eliminar la región "${regionToDelete?.nombre || regionToDelete?.name}"?`,
            confirmText: 'Eliminar',
            confirmStyle: 'danger'
        })
    );
}

export default RegionsPage;
