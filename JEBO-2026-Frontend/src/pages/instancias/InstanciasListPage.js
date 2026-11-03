import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell, TableActions } from '../../components/ui/Table.js';
import { Modal } from '../../components/ui/Modal.js';
import { Loading } from '../../components/ui/Loading.js';
import { IconTrash } from '../../components/icons/index.js';
import { instanceService } from '../../services/instanceService.js';

const { createElement: h } = React;

export function InstanciasListPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const load = async () => {
        try {
            setLoading(true);
            const result = await instanceService.getAll();
            setItems(Array.isArray(result) ? result : result?.data || result?.rows || []);
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleDelete = (item) => { setItemToDelete(item); setShowModal(true); };
    const confirmDelete = async () => {
        try {
            await instanceService.delete(itemToDelete.id || itemToDelete.id_instancia);
            setItems(items.filter(i => (i.id || i.id_instancia) !== (itemToDelete.id || itemToDelete.id_instancia)));
        } catch (err) { setError(err.message); }
        setShowModal(false);
    };

    if (loading) return h(Loading);

    return h('div', null,
        error && h('div', { style: { color: '#ef4444', padding: '12px', marginBottom: '16px', backgroundColor: '#fee2e2', borderRadius: '6px' } }, error),
        h(Card, null,
            h(CardHeader, { title: 'Instancias' }),
            h(Table, null,
                h(TableHeader, null,
                    h(TableHeaderCell, null, 'Descripción'),
                    h(TableHeaderCell, null, 'Acciones')
                ),
                h('tbody', null,
                    items.map(item => {
                        const id = item.id || item.id_instancia;
                        return h(TableRow, { key: id },
                            h(TableCell, { style: { fontWeight: 500 } }, item.descripcion_instancia || item.descripcion || item.description),
                            h(TableCell, null,
                                h(TableActions, null,
                                    h('button', { style: { ...styles.buttonDanger, padding: '6px 12px' }, onClick: () => handleDelete(item) }, h(IconTrash))
                                )
                            )
                        );
                    })
                )
            )
        ),
        showModal && h(Modal, { isOpen: showModal, onClose: () => setShowModal(false), onConfirm: confirmDelete, title: 'Confirmar', message: `¿Eliminar "${itemToDelete?.descripcion_instancia || itemToDelete?.descripcion || itemToDelete?.description}"?`, confirmText: 'Eliminar', confirmStyle: 'danger' })
    );
}
