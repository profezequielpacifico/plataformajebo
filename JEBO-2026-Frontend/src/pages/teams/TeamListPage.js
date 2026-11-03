import React, { useState, useEffect, useCallback } from 'react';
import { errorBox, formSelect, formInput, buttonPrimarySmall, buttonOutlineSmall, tableCellBold } from '../../styles/commonStyles.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell } from '../../components/ui/Table.js';
import { Pagination } from '../../components/ui/Pagination.js';
import { Loading } from '../../components/ui/Loading.js';
import { teamService } from '../../services/teamService.js';
import disciplineService from '../../services/disciplineService.js';
import { TEAM_SEARCH_FILTERS, PAGINATION, ROLE_IDS } from '../../config/constants.js';
import { IconEdit } from '../../components/icons/index.js';

const { createElement: h } = React;

/**
 * Consulta de equipos.
 *
 * Ahora incluye columna de acciones con botón de editar.
 * Permisos de edición:
 * - Admin (3) y SuperAdmin (20): pueden editar TODOS los equipos
 * - Profesor (1): solo puede editar el equipo donde es entrenador (id_usuario coincide)
 */
export function TeamListPage({ user, onNavigate }) {
    const [teams, setTeams] = useState([]);
    const [disciplines, setDisciplines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [page, setPage] = useState(PAGINATION.DEFAULT_PAGE);
    const [limit, setLimit] = useState(PAGINATION.DEFAULT_LIMIT);
    const [total, setTotal] = useState(0);

    const [idDisciplina, setIdDisciplina] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBy, setFilterBy] = useState('nombre');
    // Texto realmente aplicado. While se escribe se consulta `searchTerm`, pero

    const [busqueda, setBusqueda] = useState('');

    // Verifica si el usuario actual puede editar un equipo
    const puedeEditar = (team) => {
        if (!user) return false;
        const roleId = user.id_rol ? Number(user.id_rol) : null;
        // Admin y SuperAdmin pueden editar todo
        if (roleId === ROLE_IDS.ADMINISTRADOR || roleId === ROLE_IDS.SUPERADMIN) {
            return true;
        }
        // Profesor solo puede editar su propio equipo
        if (roleId === ROLE_IDS.PROFESOR) {
            const teamCoachId = team.id_usuario ? Number(team.id_usuario) : null;
            const currentUserId = user.id_usuario ? Number(user.id_usuario) : null;
            return teamCoachId && currentUserId && teamCoachId === currentUserId;
        }
        return false;
    };

    useEffect(() => {
        disciplineService.getAll()
            .then(res => setDisciplines(Array.isArray(res) ? res : res?.data || res?.rows || []))
            .catch(() => setDisciplines([]));
    }, []);

    const loadTeams = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const res = await teamService.getAll({
                page,
                limit,
                id_disciplina: idDisciplina || undefined,
                search: busqueda || undefined,
                filter: busqueda ? filterBy : undefined
            });

            setTeams(Array.isArray(res) ? res : res?.data || res?.rows || []);
            // `pagination` no siempre viene: `/teams` lo manda, pero un mock o

            setTotal(res?.pagination?.total ?? (Array.isArray(res) ? res.length : (res?.data?.length ?? 0)));
        } catch (err) {
            setError(err.message || 'Error al cargar equipos');
            setTeams([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [page, limit, idDisciplina, busqueda, filterBy]);

    useEffect(() => { loadTeams(); }, [loadTeams]);

    // Cualquier cambio de filtro vuelve a la primera pagina: quedarse en la 3

    const cambiarDisciplina = (e) => {
        setIdDisciplina(e.target.value);
        setPage(PAGINATION.DEFAULT_PAGE);
    };

    const buscar = (e) => {
        e.preventDefault();
        setBusqueda(searchTerm.trim());
        setPage(PAGINATION.DEFAULT_PAGE);
    };

    const limpiar = () => {
        setSearchTerm('');
        setBusqueda('');
        setIdDisciplina('');
        setPage(PAGINATION.DEFAULT_PAGE);
    };

    const cambiarPagina = (nueva) => {
        setPage(nueva);
        setError('');
    };

    const cambiarLimit = (nuevo) => {
        setLimit(nuevo);
        setPage(PAGINATION.DEFAULT_PAGE);
    };

    const renderFiltros = () => h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
        h('form', { onSubmit: buscar, style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
            h('select', {
                'aria-label': 'Buscar por',
                value: filterBy,
                onChange: (e) => setFilterBy(e.target.value),
                style: { ...formSelect, width: 'auto', minWidth: '140px', marginBottom: 0 }
            }, TEAM_SEARCH_FILTERS.map(f =>
                h('option', { key: f.value, value: f.value }, f.label)
            )),
            h('input', {
                type: 'text',
                'aria-label': 'Buscar equipo',
                placeholder: 'Buscar equipo...',
                value: searchTerm,
                onChange: (e) => setSearchTerm(e.target.value),
                style: { ...formInput, width: '200px', marginBottom: 0 }
            }),
            h('button', { type: 'submit', style: buttonPrimarySmall }, 'Buscar'),
            h('button', {
                type: 'button',
                style: buttonOutlineSmall,
                onClick: limpiar
            }, 'Limpiar')
        ),

        h('select', {
            'aria-label': 'Filtrar por disciplina',
            value: idDisciplina,
            onChange: cambiarDisciplina,
            style: { ...formSelect, width: 'auto', minWidth: '180px', marginBottom: 0 }
        },
            h('option', { value: '' }, 'Todas las disciplinas'),
            disciplines.map(d => h('option', {
                key: d.id_disciplina || d.id,
                value: String(d.id_disciplina || d.id)
            }, d.nombre || d.name))
        )
    );

    if (loading && !teams.length) return h(Loading, { message: 'Cargando equipos...' });

    return h('div', null,
        error && h('div', { style: errorBox }, error),

        h(Card, null,
            h(CardHeader, { title: 'Consulta de Equipos' }, renderFiltros()),

            h(Table, null,
                h(TableHeader, null,
                    h(TableHeaderCell, null, 'Equipo'),
                    h(TableHeaderCell, null, 'Disciplina'),
                    h(TableHeaderCell, null, 'Profesor'),
                    h(TableHeaderCell, null, 'Estudiantes'),
                    h(TableHeaderCell, null, 'Institución'),
                    h(TableHeaderCell, null, 'Distrito'),
                    h(TableHeaderCell, null, 'Torneo'),
                    h(TableHeaderCell, null, 'Acciones')
                ),
                h('tbody', null,
                    teams.length === 0
                        ? h(TableRow, null, h(TableCell, { colSpan: 8, style: { textAlign: 'center' } }, 'No se encontraron equipos'))
                        : teams.map(team => {
                            const id = team.id || team.id_equipo;
                            const canEdit = puedeEditar(team);
                            return h(TableRow, { key: id },
                                h(TableCell, { style: tableCellBold }, team.nombre || team.name),
                                h(TableCell, null, team.disciplina_nombre || '-'),
                                h(TableCell, null, team.entrenador || team.coach || team.profesor || '-'),
                                h(TableCell, null, team.cantidad_jugadores ?? team.players ?? '-'),
                                h(TableCell, null, team.institucion || team.institution || '-'),
                                h(TableCell, null, team.distrito || team.distrito_nombre || '-'),
                                h(TableCell, null, team.torneo_nombre || '-'),
                                h(TableCell, { style: { textAlign: 'center', whiteSpace: 'nowrap' } },
                                    canEdit && h('button', {
                                        style: {
                                            padding: '6px 8px',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#2563eb',
                                            borderRadius: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'background-color 0.15s'
                                        },
                                        onMouseEnter: (e) => { e.target.style.backgroundColor = '#eff6ff'; },
                                        onMouseLeave: (e) => { e.target.style.backgroundColor = 'transparent'; },
                                        onClick: () => onNavigate(`teams-edit/${id}`),
                                        'aria-label': `Editar ${team.nombre || team.name}`,
                                        title: 'Editar equipo'
                                    }, h(IconEdit))
                                )
                            );
                        })
                )
            ),

            h(Pagination, {
                page,
                limit,
                total,
                onPageChange: cambiarPagina,
                onLimitChange: cambiarLimit
            })
        )
    );
}

export default TeamListPage;
