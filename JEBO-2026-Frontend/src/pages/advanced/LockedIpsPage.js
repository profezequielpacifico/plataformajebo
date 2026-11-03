import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell, TableActions } from '../../components/ui/Table.js';
import { Modal } from '../../components/ui/Modal.js';
import { Loading } from '../../components/ui/Loading.js';
import { IconShield, IconTrash } from '../../components/icons/index.js';
import { lockoutService } from '../../services/lockoutService.js';
import { ROLE_IDS } from '../../config/constants.js';

const { createElement: h } = React;

function getRoleId(user) {
    if (!user) return null;
    if (user.id_rol) return Number(user.id_rol);
    const roleMap = {
        'SuperAdmin': ROLE_IDS.SUPERADMIN,
        'Administrador': ROLE_IDS.ADMINISTRADOR,
        'Profesor': ROLE_IDS.PROFESOR,
        'Arbitro': ROLE_IDS.ARBITRO,
        'Juez': ROLE_IDS.JUEZ
    };
    return roleMap[user.rol] ?? null;
}

function isSuperAdmin(user) {
    return getRoleId(user) === ROLE_IDS.SUPERADMIN;
}

function formatRetry(seconds) {
    if (seconds == null) return '-';
    if (seconds > 1e9) return 'Permanente';
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatEstado(item) {
    if (item.permanente) return { text: 'Permanente', variant: 'red' };
    if (item.bloqueado) return { text: 'Bloqueado', variant: 'orange' };
    if (item.expirado) return { text: 'Expirado', variant: 'yellow' };
    return { text: 'Inactivo', variant: 'green' };
}

function formatFecha(iso) {
    if (!iso) return '-';
    try {
        return new Date(iso).toLocaleString('es-AR');
    } catch {
        return iso;
    }
}

export function LockedIpsPage({ user, onNavigate }) {
    const isSuperAdminUser = isSuperAdmin(user);
    const [lockouts, setLockouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [ipToUnlock, setIpToUnlock] = useState(null);
    const [unlocking, setUnlocking] = useState(false);

    const loadLockouts = async () => {
        try {
            setLoading(true);
            const result = await lockoutService.getAll();
            const list = Array.isArray(result) ? result : result?.data || result?.rows || [];
            setLockouts(list);
            setError('');
        } catch (err) {
            setError(err.message || 'Error al cargar bloqueos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isSuperAdminUser) loadLockouts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleUnlock = (item) => {
        setIpToUnlock(item);
        setShowModal(true);
    };

    const confirmUnlock = async () => {
        try {
            setUnlocking(true);
            await lockoutService.unlock(ipToUnlock.ip);
            setLockouts(lockouts.filter(l => l.ip !== ipToUnlock.ip));
        } catch (err) {
            setError(err.message || 'Error al desbloquear IP');
        } finally {
            setUnlocking(false);
            setShowModal(false);
        }
    };

    if (!isSuperAdminUser) {
        return h(Card, null,
            h(CardHeader, { title: 'Bloqueos de Login' }),
            h('div', { style: { padding: '24px 20px', color: '#b91c1c' } },
                'No tiene permisos para acceder a esta seccion. Solo SuperAdmin.'
            )
        );
    }

    if (loading && lockouts.length === 0) return h(Loading);

    return h('div', null,
        error && h('div', {
            style: { color: '#ef4444', padding: '12px', marginBottom: '16px', backgroundColor: '#fee2e2', borderRadius: '6px' }
        }, error),

        h(Card, null,
            h(CardHeader, { title: 'Bloqueos de Login' },
                h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                    h('button', {
                        style: { ...styles.buttonOutline, padding: '8px 14px' },
                        onClick: loadLockouts
                    }, 'Actualizar'),
                    h('button', {
                        style: { ...styles.buttonOutline, display: 'flex', alignItems: 'center', gap: '6px' },
                        onClick: () => onNavigate('advanced-options')
                    }, h(IconShield), 'Volver')
                )
            ),

            h(Table, null,
                h(TableHeader, null,
                    h(TableHeaderCell, null, 'IP'),
                    h(TableHeaderCell, null, 'Intentos'),
                    h(TableHeaderCell, null, 'Estado'),
                    h(TableHeaderCell, null, 'Tiempo restante'),
                    h(TableHeaderCell, null, 'Ultima actividad'),
                    h(TableHeaderCell, null, 'Acciones')
                ),
                h('tbody', null,
                    lockouts.length === 0
                        ? h(TableRow, null, h(TableCell, { colSpan: 6, style: { textAlign: 'center' } }, 'No hay IPs bloqueadas'))
                        : lockouts.map(item => {
                            const estado = formatEstado(item);
                            return h(TableRow, { key: item.ip },
                                h(TableCell, { style: { fontWeight: 500, fontFamily: 'monospace' } }, item.ip),
                                h(TableCell, null, String(item.failures)),
                                h(TableCell, null, h(Badge, { variant: estado.variant }, estado.text)),
                                h(TableCell, null, item.permanente
                                    ? h('span', { style: { color: '#dc2626', fontWeight: 500 } }, 'Comuniquese con servicio tecnico')
                                    : formatRetry(item.retryAfterSeconds)),
                                h(TableCell, null, formatFecha(item.actualizado_en)),
                                h(TableCell, null,
                                    h(TableActions, null,
                                        h('button', {
                                            style: { ...styles.buttonDanger, padding: '6px 12px' },
                                            onClick: () => handleUnlock(item)
                                        }, h(IconTrash), ' Desbloquear')
                                    )
                                )
                            );
                        })
                )
            )
        ),

        showModal && h(Modal, {
            isOpen: showModal,
            onClose: () => !unlocking && setShowModal(false),
            onConfirm: confirmUnlock,
            title: 'Desbloquear IP',
            message: `Se eliminaran todos los bloqueos de la IP "${ipToUnlock?.ip}". Esta accion no se puede deshacer.`,
            confirmText: unlocking ? 'Desbloqueando...' : 'Desbloquear',
            confirmStyle: 'danger'
        })
    );
}

export default LockedIpsPage;