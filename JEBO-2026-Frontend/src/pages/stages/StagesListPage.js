import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell } from '../../components/ui/Table.js';
import { Loading } from '../../components/ui/Loading.js';
import { stageService } from '../../services/stageService.js';

const { createElement: h } = React;

export function StagesListPage({ torneoId }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = async () => {
        try {
            setLoading(true);
            const params = torneoId ? { id_torneo: torneoId } : {};
            const result = await stageService.getAll(params);
            setItems(Array.isArray(result) ? result : result?.data || result?.rows || []);
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [torneoId]);

    if (loading) return h(Loading);

    return h('div', null,
        error && h('div', { style: { color: '#ef4444', padding: '12px', marginBottom: '16px', backgroundColor: '#fee2e2', borderRadius: '6px' } }, error),
        h(Card, null,
            h(CardHeader, { title: 'Etapas' }),
            h(Table, null,
                h(TableHeader, null,
                    h(TableHeaderCell, null, 'Nombre'),
                    h(TableHeaderCell, null, 'Torneo'),
                    h(TableHeaderCell, null, 'Orden')
                ),
                h('tbody', null,
                    items.map(item => {
                        return h(TableRow, { key: item.id_etapa },
                            h(TableCell, { style: { fontWeight: 500 } }, item.nombre),
                            h(TableCell, null, item.torneo_nombre || '-'),
                            h(TableCell, null, item.orden)
                        );
                    })
                )
            )
        )
    );
}
