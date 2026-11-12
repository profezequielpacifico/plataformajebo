import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell } from '../../components/ui/Table.js';
import { Badge } from '../../components/ui/Badge.js';
import { IconPlus } from '../../components/icons/index.js';
import api from '../../api/index.js';
import { translateAction, formatDetail } from '../audit/actionLabels.js';
import { ROUTES } from '../../config/constants.js';
import { esAdministrador } from '../../services/roles.js';
import { canAccess } from '../../permissions.js';

const { createElement: h } = React;

function getResultBadge(resultado) {
    if (resultado === 'exitoso') return h(Badge, { variant: 'green' }, 'Éxito');
    if (resultado === 'fallido') return h(Badge, { variant: 'red' }, 'Fallo');
    return h(Badge, { variant: 'blue' }, resultado || '—');
}

function canViewAudit(user) {
    return esAdministrador(user);
}

function getQuickAccessButtons(user) {
    const buttons = [
        { route: ROUTES.TOURNAMENTS_NEW, label: 'Nuevo Torneo' },
        { route: ROUTES.TEAMS_NEW, label: 'Alta de Equipo' },
        { route: ROUTES.TOURNAMENT_REGISTRATION, label: 'Inscripción a Torneo' },
        { route: ROUTES.MATCHES_NEW, label: 'Nuevo Partido' }
    ];
    return buttons.filter(btn => canAccess(user, btn.route));
}

export function DashboardPage({ user, onNavigate }) {
    const [stats, setStats] = useState([]);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activityError, setActivityError] = useState('');

    const showAudit = canViewAudit(user);

    useEffect(() => {
        async function loadData() {
            try {
                const statsRes = await api.get('/statistics/dashboard');
                const statsData = statsRes.data || statsRes;
                setStats([
                    { label: 'Torneos Activos', value: String(statsData.total_torneos || 0) },
                    { label: 'Equipos Registrados', value: String(statsData.total_equipos || 0) },
                    { label: 'Partidos Jugados', value: String(statsData.total_partidos || 0) },
                    { label: 'Usuarios', value: String(statsData.total_usuarios_activos || 0) }
                ]);
            } catch (err) {
                console.error('Error loading dashboard stats:', err);
            }
            if (showAudit) {
                try {
                    const activityRes = await api.get('/audit/logs?limit=10');
                    const activityData = activityRes.data || [];
                    setActivity(Array.isArray(activityData) ? activityData.map(a => ({
                        id: a.id_bitacora,
                        usuario: a.usuario_nombre || '—',
                        accion: translateAction(a.tipo_accion),
                        detalle: formatDetail(a.detalle),
                        resultado: a.resultado || '—',
                        fecha: a.fecha_hora ? new Date(a.fecha_hora).toLocaleString('es-ES') : '—'
                    })) : []);
                    setActivityError('');
                } catch {
                    setActivityError('No se pudieron cargar los registros de actividad');
                }
            }
            setLoading(false);
        }
        loadData();
    }, [showAudit]);

    return h('div', null,
        h('div', { style: styles.statsGrid },
            stats.map((stat, index) =>
                h('div', { key: index, style: styles.statCard },
                    h('div', { style: styles.statLabel }, stat.label),
                    h('div', { style: styles.statValue }, stat.value)
                )
            )
        ),

        showAudit && h(Card, null,
            h(CardHeader, { title: 'Actividad Reciente' }),
            activityError && h('div', { style: { padding: '12px', color: '#ef4444', fontSize: '14px' } }, activityError),
            h(Table, null,
                h(TableHeader, null,
                    h(TableHeaderCell, {}, 'Usuario'),
                    h(TableHeaderCell, {}, 'Acción'),
                    h(TableHeaderCell, {}, 'Detalle'),
                    h(TableHeaderCell, {}, 'Resultado'),
                    h(TableHeaderCell, {}, 'Fecha')
                ),
                h('tbody', null,
                    activity.length === 0 && !activityError
                        ? h(TableRow, null,
                            h(TableCell, { colSpan: 5, style: { textAlign: 'center', color: '#9ca3af' } }, loading ? 'Cargando...' : 'Sin actividad reciente')
                        )
                        : activity.map((act) =>
                            h(TableRow, { key: act.id },
                                h(TableCell, {}, act.usuario),
                                h(TableCell, {}, act.accion),
                                h(TableCell, { style: { fontSize: '13px', color: '#6b7280' } }, act.detalle),
                                h(TableCell, {}, getResultBadge(act.resultado)),
                                h(TableCell, { style: { whiteSpace: 'nowrap', fontSize: '13px' } }, act.fecha)
                            )
                        )
                )
            )
        ),

        h(Card, null,
            h(CardHeader, { title: 'Acceso Rápido' }),
            h('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap' } },
                getQuickAccessButtons(user).map(btn =>
                    h('button', {
                        key: btn.route,
                        style: styles.buttonPrimary,
                        onClick: () => onNavigate(btn.route)
                    }, h(IconPlus), btn.label)
                )
            )
        )
    );
}

export default DashboardPage;
