import React, { useState, useEffect } from 'react';
import { styles, COLORS } from '../../styles/theme/index.js';
import { Card } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Loading } from '../../components/ui/Loading.js';
import { Modal } from '../../components/ui/Modal.js';
import { IconArrowLeft, IconMap } from '../../components/icons/index.js';
import matchService from '../../services/matchService.js';

const { createElement: h } = React;

function getBadgeVariant(status) {
    const s = (status || '').toLowerCase();
    if (s === 'finalizado') return 'blue';
    if (s === 'en juego' || s === 'en progreso') return 'green';
    if (s === 'cancelado') return 'red';
    if (s === 'pendiente') return 'orange';
    if (s === 'programado') return 'yellow';
    return 'yellow';
}

function DetailRow({ label, value }) {
    return h('div', { style: { display: 'flex', padding: '10px 0', borderBottom: '1px solid #f0f0f0' } },
        h('div', { style: { width: '40%', maxWidth: '180px', flexShrink: 0, fontWeight: 600, color: '#374151', fontSize: '14px' } }, label),
        h('div', { style: { flex: 1, minWidth: 0, color: '#111827', fontSize: '14px' } }, value || '—')
    );
}

export function MatchDetailPage({ onNavigate, matchId, user }) {
    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    const isAdmin = user?.rol === 'Administrador';

    useEffect(() => {
        if (!matchId) return;
        setLoading(true);
        matchService.getById(matchId)
            .then(res => {
                const data = res.data || res;
                setMatch(data);
            })
            .catch(err => setError(err.message || 'Error al cargar partido'))
            .finally(() => setLoading(false));
    }, [matchId]);

    const handleCancel = async () => {
        try {
            setCancelling(true);
            await matchService.updateStatus(matchId, { estado: 'Cancelado' });
            setMatch(prev => ({ ...prev, estado: 'Cancelado' }));
            setShowCancelModal(false);
        } catch (err) {
            setError(err.message || 'Error al cancelar partido');
        }
        setCancelling(false);
    };

    if (loading) return h(Loading, { message: 'Cargando detalle del partido...' });

    if (error) {
        return h('div', { style: { padding: '24px', textAlign: 'center', color: '#ef4444' } },
            h('p', null, error),
            h('button', { style: styles.buttonOutline, onClick: () => onNavigate('matches') }, h(IconArrowLeft), 'Volver')
        );
    }

    if (!match) {
        return h('div', { style: { padding: '24px', textAlign: 'center', color: '#9ca3af' } },
            h('p', null, 'Partido no encontrado'),
            h('button', { style: styles.buttonOutline, onClick: () => onNavigate('matches') }, h(IconArrowLeft), 'Volver')
        );
    }

    const arbitros = match.arbitros && Array.isArray(match.arbitros)
        ? match.arbitros.map(a => a.nombre).join(', ')
        : (match.arbitros || '—');

    const mapsUrl = match.link_maps || '';

    const localDisplayName = match.institucion_local_nombre
        ? `${match.equipo_local_nombre || '—'} (${match.institucion_local_nombre})`
        : match.equipo_local_nombre || '—';
    const visitorDisplayName = match.institucion_visitante_nombre
        ? `${match.equipo_visitante_nombre || '—'} (${match.institucion_visitante_nombre})`
        : match.equipo_visitante_nombre || '—';

    return h('div', { style: { padding: '24px', maxWidth: '800px', margin: '0 auto' } },
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } },
            h('button', { style: styles.buttonOutline, onClick: () => onNavigate('matches') }, h(IconArrowLeft), 'Volver'),
            isAdmin && match.estado !== 'Cancelado' && match.estado !== 'Finalizado'
                ? h('button', {
                    style: { ...styles.buttonDanger, display: 'flex', alignItems: 'center', gap: '6px' },
                    onClick: () => setShowCancelModal(true)
                }, 'Cancelar Partido')
                : null
        ),

        h(Card, null,
            h('div', { style: { padding: '24px' } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
                    h('h2', { style: { margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' } },
                        match.equipo_local_nombre || 'Local', ' vs ', match.equipo_visitante_nombre || 'Visitante'
                    ),
                    h(Badge, { variant: getBadgeVariant(match.estado) }, match.estado || '—')
                ),

                h('div', { style: { display: 'grid', gap: '4px' } },
                    DetailRow({ label: 'Torneo', value: match.torneo }),
                    DetailRow({ label: 'Fecha', value: match.fecha }),
                    DetailRow({ label: 'Hora', value: match.hora || '—' }),
                    DetailRow({ label: 'Cancha', value: match.cancha_nombre || '—' }),
                    DetailRow({ label: 'Equipo Local', value: localDisplayName }),
                    DetailRow({ label: 'Equipo Visitante', value: visitorDisplayName }),
                    DetailRow({ label: 'Delegado Local', value: match.equipo_local_coach || '—' }),
                    DetailRow({ label: 'Delegado Visitante', value: match.equipo_visitante_coach || '—' }),
                    DetailRow({ label: 'Árbitro(s)', value: arbitros }),
                    DetailRow({ label: 'Resultado', value: match.goles_local != null ? `${match.goles_local} - ${match.goles_visitante}` : '—' }),
                    mapsUrl ? h('div', { style: { display: 'flex', padding: '10px 0', borderBottom: '1px solid #f0f0f0' } },
                        h('div', { style: { width: '40%', maxWidth: '180px', flexShrink: 0, fontWeight: 600, color: '#374151', fontSize: '14px' } }, 'Ubicación'),
                        h('div', { style: { flex: 1 } },
                            h('a', {
                                href: mapsUrl,
                                target: '_blank',
                                rel: 'noopener noreferrer',
                                style: { color: COLORS.primary, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }
                            }, h(IconMap, { size: 18 }), match.cancha_nombre || 'Ver en Google Maps', ' →')
                        )
                    ) : null
                )
            )
        ),

        showCancelModal && h(Modal, {
            isOpen: showCancelModal,
            onClose: () => setShowCancelModal(false),
            onConfirm: handleCancel,
            title: 'Cancelar Partido',
            message: `¿Estás seguro de cancelar el partido "${match.equipo_local_nombre || 'Local'} vs ${match.equipo_visitante_nombre || 'Visitante'}"?`,
            confirmText: cancelling ? 'Cancelando...' : 'Sí, cancelar',
            confirmStyle: 'danger'
        })
    );
}

export default MatchDetailPage;
