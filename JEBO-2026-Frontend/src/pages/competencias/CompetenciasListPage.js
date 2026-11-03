import React, { useState, useEffect } from 'react';

import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell, TableActions } from '../../components/ui/Table.js';
import { Modal } from '../../components/ui/Modal.js';
import { Loading } from '../../components/ui/Loading.js';
import { IconPlus, IconEdit, IconTrash, IconEye, IconTrophy } from '../../components/icons/index.js';
import { competenciaService } from '../../services/competenciaService.js';

const { createElement: h } = React;

const ESTADO_BADGE = {
    'BORRADOR': { backgroundColor: '#f3f4f6', color: '#374151', variant: 'default' },
    'CONFIGURADA': { backgroundColor: '#dbeafe', color: '#1e40af', variant: 'blue' },
    'EN_CURSO': { backgroundColor: '#d1fae5', color: '#065f46', variant: 'green' },
    'FINALIZADA': { backgroundColor: '#e5e7eb', color: '#1f2937', variant: 'default' },
    'SUSPENDIDA': { backgroundColor: '#fef3c7', color: '#92400e', variant: 'orange' }
};

function getEstadoBadge(estado) {
    return ESTADO_BADGE[estado] || ESTADO_BADGE['BORRADOR'];
}

export function CompetenciasListPage({ onNavigate }) {
    const [competencias, setCompetencias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [competenciaToDelete, setCompetenciaToDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadCompetencias();
    }, []);

    const loadCompetencias = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await competenciaService.getAll();
            setCompetencias(Array.isArray(result) ? result : result.data || []);
        } catch (err) {
            setError(err.message || 'Error al cargar competencias');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (competencia) => {
        setCompetenciaToDelete(competencia);
        setShowModal(true);
    };

    const confirmDelete = async () => {
        try {
            await competenciaService.delete(competenciaToDelete.id_competencia);
            setCompetencias(competencias.filter(c => c.id_competencia !== competenciaToDelete.id_competencia));
            setShowModal(false);
            setCompetenciaToDelete(null);
        } catch (err) {
            setError(err.message || 'Error al eliminar');
        }
    };

    const filteredCompetencias = competencias.filter(c =>
        !searchTerm || c.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return h(Loading);

    return h('div', { style: styles.appContainer },
        h('div', { style: styles.pageContainer },
            h(Card, null,
                h(CardHeader, { title: 'Competencias', icon: h(IconTrophy) },
                    h('button', {
                        style: styles.buttonPrimary,
                        onClick: () => onNavigate('competencias-new')
                    }, h(IconPlus), ' Nueva Competencia')
                ),
                // Búsqueda
                h('div', { style: { marginBottom: '16px' } },
                    h('input', {
                        type: 'text',
                        placeholder: 'Buscar por nombre...',
                        value: searchTerm,
                        onChange: e => setSearchTerm(e.target.value),
                        style: { ...styles.formInput, maxWidth: '300px' }
                    })
                ),
                // Tabla
                h(Table, null,
                    h(TableHeader, null,
                        h(TableHeaderCell, null, 'Nombre'),
                        h(TableHeaderCell, null, 'Estado'),
                        h(TableHeaderCell, null, 'Etapas'),
                        h(TableHeaderCell, null, 'Creada'),
                        h(TableHeaderCell, null, 'Acciones')
                    ),
                    h('tbody', null,
                        filteredCompetencias.length === 0
                            ? h(TableRow, null,
                                h(TableCell, { colSpan: 5 }, 'No hay competencias')
                              )
                            : filteredCompetencias.map(comp => {
                                const badge = getEstadoBadge(comp.estado);
                                return h(TableRow, { key: comp.id_competencia },
                                    h(TableCell, null, comp.nombre),
                                    h(TableCell, null,
                                        h(Badge, { variant: badge.variant }, comp.estado)
                                    ),
                                    h(TableCell, null, comp.cantidad_etapas || '—'),
                                    h(TableCell, null, comp.fecha_creacion ? new Date(comp.fecha_creacion).toLocaleDateString('es-AR') : '—'),
                                    h(TableActions, null,
                                        h('button', {
                                            title: 'Ver detalle',
                                            onClick: () => onNavigate(`competencias-view/${comp.id_competencia}`)
                                        }, h(IconEye)),
                                        h('button', {
                                            title: 'Editar',
                                            onClick: () => onNavigate(`competencias-edit/${comp.id_competencia}`)
                                        }, h(IconEdit)),
                                        h('button', {
                                            title: 'Eliminar',
                                            onClick: () => handleDelete(comp)
                                        }, h(IconTrash))
                                    )
                                );
                            })
                    )
                )
            ),
            // Modal de confirmación
            showModal && h(Modal, {
                isOpen: showModal,
                onClose: () => setShowModal(false),
                onConfirm: confirmDelete,
                title: 'Eliminar competencia',
                message: `¿Estás seguro de eliminar "${competenciaToDelete?.nombre}"? Esta acción no se puede deshacer.`,
                confirmText: 'Eliminar',
                cancelText: 'Cancelar',
                confirmStyle: 'danger'
            }),
            // Error
            error && h('div', {
                style: {
                    marginTop: '16px',
                    padding: '12px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #ef4444',
                    borderRadius: '6px',
                    color: '#dc2626'
                }
            }, error)
        )
    );
}
