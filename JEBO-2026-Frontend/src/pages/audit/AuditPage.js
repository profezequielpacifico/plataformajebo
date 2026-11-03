import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell } from '../../components/ui/Table.js';
import { Badge } from '../../components/ui/Badge.js';
import api from '../../api/index.js';
import { translateAction, formatDetail } from './actionLabels.js';

const { createElement: h } = React;

function getResultBadge(resultado) {
    if (resultado === 'exitoso') return h(Badge, { variant: 'green' }, 'Éxito');
    if (resultado === 'fallido') return h(Badge, { variant: 'red' }, 'Fallo');
    return h(Badge, { variant: 'blue' }, resultado || '—');
}

export function AuditPage() {
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function loadActivity() {
            try {
                const res = await api.get('/audit/logs?limit=10');
                const data = res.data || [];
                setActivity(Array.isArray(data) ? data.map(a => ({
                    id: a.id_bitacora,
                    usuario: a.usuario_nombre || '—',
                    email: a.email || '',
                    accion: translateAction(a.tipo_accion),
                    accionCodigo: a.tipo_accion,
                    detalle: formatDetail(a.detalle),
                    resultado: a.resultado || '—',
                    fecha: a.fecha_hora ? new Date(a.fecha_hora).toLocaleString('es-ES') : '—',
                    ip: a.ip_address || '—',
                    userAgent: a.user_agent || ''
                })) : []);
                setError('');
            } catch {
                setError('No se pudieron cargar los registros de actividad');
            }
            setLoading(false);
        }
        loadActivity();
    }, []);

    return h('div', null,
        h('h2', { style: { ...styles.sectionTitle, marginBottom: '24px' } }, 'Actividad Reciente'),

        h(Card, null,
            h(CardHeader, { title: 'Últimos 10 registros' }),
            error && h('div', { style: { padding: '12px', color: '#ef4444', fontSize: '14px' } }, error),
            h(Table, null,
                h(TableHeader, null,
                    h(TableHeaderCell, {}, 'Usuario'),
                    h(TableHeaderCell, {}, 'Acción'),
                    h(TableHeaderCell, {}, 'Detalle'),
                    h(TableHeaderCell, {}, 'Resultado'),
                    h(TableHeaderCell, {}, 'Fecha')
                ),
                h('tbody', null,
                    activity.length === 0 && !error
                        ? h(TableRow, null,
                            h(TableCell, { colSpan: 5, style: { textAlign: 'center', color: '#9ca3af' } },
                                loading ? 'Cargando...' : 'Sin actividad reciente'
                            )
                        )
                        : activity.map(act =>
                            h(TableRow, { key: act.id },
                                h(TableCell, { style: { fontWeight: 500 } },
                                    act.usuario,
                                    act.email ? h('span', { style: { display: 'block', fontSize: '12px', color: '#9ca3af' } }, act.email) : null
                                ),
                                h(TableCell, {}, act.accion),
                                h(TableCell, { style: { fontSize: '13px', color: '#6b7280' } }, act.detalle),
                                h(TableCell, {}, getResultBadge(act.resultado)),
                                h(TableCell, { style: { whiteSpace: 'nowrap', fontSize: '13px' } }, act.fecha)
                            )
                        )
                )
            )
        )
    );
}

export default AuditPage;
