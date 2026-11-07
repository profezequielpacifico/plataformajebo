import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import {
    errorBox,
    buttonPrimarySmall,
    buttonOutlineSmall,
    buttonSuccessSmall,
    buttonDangerSmall,
    tableCellBold,
    formSelect,
    formInput
} from '../../styles/commonStyles.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell, TableActions } from '../../components/ui/Table.js';
import { Modal } from '../../components/ui/Modal.js';
import { Loading } from '../../components/ui/Loading.js';
import { IconPlus, IconEdit, IconTrash } from '../../components/icons/index.js';
import { userService } from '../../services/userService.js';
import { roleService } from '../../services/roleService.js';

const { createElement: h } = React;

export function UserListPage({ onNavigate }) {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [rolFilter, setRolFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    const loadRoles = async () => {
        try {
            const res = await roleService.getAll();
            const rolesList = Array.isArray(res) ? res : (res?.data || res?.rows || []);
            setRoles(rolesList);
        } catch (err) {
            console.error('Error cargando roles:', err);
        }
    };

    const loadUsers = async (rol = rolFilter, search = searchTerm) => {
        try {
            setLoading(true);
            const result = await userService.getAll({ rol: rol || undefined, search: search || undefined });
            const list = Array.isArray(result) ? result : result?.data || result?.rows || [];
            setUsers(list);
            setError('');
        } catch (err) {
            setError(err.message || 'Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRoles();
        loadUsers();
    }, []);

    const handleSearch = () => {
        loadUsers(rolFilter, searchTerm);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    const handleRolFilter = (e) => {
        const rol = e.target.value;
        setRolFilter(rol);
        loadUsers(rol, searchTerm);
    };

    const clearFilters = () => {
        setRolFilter('');
        setSearchTerm('');
        loadUsers('', '');
    };

    const handleDelete = (user) => {
        setUserToDelete(user);
        setShowModal(true);
    };

    const confirmDelete = async () => {
        try {
            await userService.delete(userToDelete.id || userToDelete.id_usuario);
            setUsers(users.filter(u => (u.id || u.id_usuario) !== (userToDelete.id || userToDelete.id_usuario)));
        } catch (err) {
            setError(err.message || 'Error al eliminar usuario');
        }
        setShowModal(false);
    };

    const statusVariant = (estado) => {
        if (estado === 'Activo') return 'green';
        return 'red';
    };

    if (loading && users.length === 0) return h(Loading);

    return h('div', null,
        error && h('div', { style: errorBox }, error),

        h(Card, null,
            h(CardHeader, { title: 'Usuarios' },
                h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
                    h('select', { value: rolFilter, onChange: handleRolFilter, style: formSelect },
                        h('option', { value: '' }, 'Todos los roles'),
                        roles.map(r => h('option', { key: r.id_rol, value: r.nombre }, r.nombre))
                    ),
                    h('input', {
                        type: 'text', value: searchTerm,
                        onChange: (e) => setSearchTerm(e.target.value),
                        onKeyDown: handleKeyDown,
                        placeholder: 'Buscar por nombre o documento...',
                        style: { ...formInput, width: '220px', maxWidth: '100%', flexGrow: 1, marginBottom: 0 }
                    }),
                    h('button', { style: buttonPrimarySmall, onClick: handleSearch }, 'Buscar'),
                    h('button', { style: buttonOutlineSmall, onClick: clearFilters }, 'Limpiar'),
                    h('button', { style: styles.buttonPrimary, onClick: () => onNavigate('users-new') }, h(IconPlus), 'Nuevo Usuario')
                )
            ),

            h(Table, null,
                h(TableHeader, null,
                    h(TableHeaderCell, null, 'Nombre'),
                    h(TableHeaderCell, null, 'Email'),
                    h(TableHeaderCell, null, 'Documento'),
                    h(TableHeaderCell, null, 'Rol'),
                    h(TableHeaderCell, null, 'Estado'),
                    h(TableHeaderCell, null, 'Acciones')
                ),
                h('tbody', null,
                    users.length === 0
                        ? h(TableRow, null, h(TableCell, { colSpan: 6, style: { textAlign: 'center' } }, 'No se encontraron usuarios'))
                        : users.map(user => {
                            const id = user.id || user.id_usuario;
                            return h(TableRow, { key: id },
                                h(TableCell, { style: tableCellBold }, user.nombre || user.name),
                                h(TableCell, null, user.email),
                                h(TableCell, null, user.documento || '-'),
                                h(TableCell, null, user.rol || user.rol_descripcion || user.role || '-'),
                                h(TableCell, null, h(Badge, { variant: statusVariant(user.estado || user.status) }, user.estado || user.status)),
                                h(TableCell, null,
                                    h(TableActions, null,
                                        h('button', { style: buttonSuccessSmall, onClick: () => onNavigate(`users-edit/${id}`) }, h(IconEdit)),
                                        h('button', { style: buttonDangerSmall, onClick: () => handleDelete(user) }, h(IconTrash))
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
            message: `¿Eliminar usuario "${userToDelete?.nombre || userToDelete?.name}"?`,
            confirmText: 'Eliminar',
            confirmStyle: 'danger'
        })
    );
}

export default UserListPage;
