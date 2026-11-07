import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Loading } from '../../components/ui/Loading.js';
import { IconSave } from '../../components/icons/index.js';
import userService from '../../services/userService.js';
import roleService from '../../services/roleService.js';
import authService from '../../services/authService.js';

const { createElement: h } = React;

export function UserFormPage({ onNavigate, userId }) {
    const isEdit = !!userId;
    const [roles, setRoles] = useState([]);
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        documento: '',
        password: '',
        rol: ''
    });
    const [loadingUser, setLoadingUser] = useState(isEdit);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [sesionCerrada, setSesionCerrada] = useState(false);
    const [error, setError] = useState('');

    const loadRoles = async () => {
        try {
            const res = await roleService.getAll();
            const rolesList = Array.isArray(res) ? res : (res?.data || res?.rows || []);
            setRoles(rolesList);
            if (rolesList.length > 0 && !formData.rol) {
                setFormData(prev => ({ ...prev, rol: rolesList[0].nombre }));
            }
        } catch (err) {
            console.error('Error loading roles:', err);
        }
    };

    const loadUserData = async () => {
        try {
            setLoadingUser(true);
            const res = await userService.getById(userId);
            const user = res.data || res;
            setFormData({
                nombre: user.nombre || '',
                email: user.email || '',
                documento: user.documento || '',
                password: '',
                rol: user.rol || user.rol_descripcion || (roles.length > 0 ? roles[0].nombre : '')
            });
        } catch {
            setError('Error al cargar datos del usuario');
        }
        setLoadingUser(false);
    };

    useEffect(() => {
        loadRoles();
    }, []);

    useEffect(() => {
        if (!userId || !roles.length) return;
        loadUserData();
    }, [userId, roles.length]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');
        if (!/^\d{1,8}$/.test(formData.documento)) {
            setError('El documento debe contener solo números entre 1 y 8 dígitos');
            setIsSaving(false);
            return;
        }
        try {
            const payload = {
                nombre: formData.nombre,
                email: formData.email,
                documento: formData.documento,
                rol: formData.rol
            };
            if (formData.password) payload.password = formData.password;

            if (isEdit) {
                await userService.update(userId, payload);

                const propio = authService.getUser()?.id_usuario;
                if (payload.password && propio != null && String(propio) === String(userId)) {
                    await authService.logout();
                    setSesionCerrada(true);
                } else {
                    setShowSuccess(true);
                }
            } else {
                await userService.create(payload);
                setShowSuccess(true);
            }
        } catch (err) {
            setError('Error al guardar: ' + (err.message || 'Error desconocido'));
        }
        setIsSaving(false);
    };

    if (loadingUser) return h(Loading, { message: 'Cargando datos del usuario...' });

    if (isSaving) return h(Loading, { message: 'Guardando usuario...' });

    if (sesionCerrada) {
        return h('div', { style: styles.successContainer },
            h('div', { style: styles.successTitle }, '¡Contraseña actualizada!'),
            h('div', { style: styles.successText },
                'Tu sesión se cerró porque cambiaste tu propia contraseña. Volvé a iniciar sesión con la nueva.'
            ),
            h('button', { style: styles.successButton, onClick: () => onNavigate('login') }, 'Iniciar sesión')
        );
    }

    if (showSuccess) {
        return h('div', { style: styles.successContainer },
            h('div', { style: styles.successTitle }, isEdit ? '¡Usuario actualizado!' : '¡Usuario guardado!'),
            h('div', { style: styles.successText }, isEdit ? 'El usuario ha sido actualizado exitosamente' : 'El usuario ha sido registrado exitosamente'),
            h('button', { style: styles.successButton, onClick: () => onNavigate('users') }, 'Volver')
        );
    }

    return h(Card, null,
        h(CardHeader, { title: isEdit ? 'Editar Usuario' : 'Nuevo Usuario' }),

        h('div', { style: { padding: '24px' } },
            error && h('div', { style: { color: '#ef4444', padding: '12px', marginBottom: '16px', backgroundColor: '#fee2e2', borderRadius: '6px' } }, error),

            h('form', { onSubmit: handleSubmit },
            h('div', { style: { display: 'grid', gap: '20px' } },
                h('div', { style: styles.formGroup },
                    h('label', { style: styles.formLabel }, 'Nombre *'),
                    h('input', { type: 'text', value: formData.nombre, onChange: (e) => setFormData({ ...formData, nombre: e.target.value }), style: styles.formInput, placeholder: 'Nombre completo', required: true })
                ),
                h('div', { style: styles.formGroup },
                    h('label', { style: styles.formLabel }, 'Email *'),
                    h('input', { type: 'email', value: formData.email, onChange: (e) => setFormData({ ...formData, email: e.target.value }), style: styles.formInput, placeholder: 'email@ejemplo.com', required: true })
                ),
                h('div', { style: styles.formGroup },
                    h('label', { style: styles.formLabel }, 'Documento *'),
                    h('input', {
                        type: 'text', inputMode: 'numeric', pattern: '[0-9]*',
                        maxLength: 8, value: formData.documento,
                        onChange: (e) => setFormData({ ...formData, documento: e.target.value.replace(/\D/g, '').slice(0, 8) }),
                        style: styles.formInput, placeholder: 'Ej: 12345678', required: true
                    })
                ),
                h('div', { style: styles.formGroup },
                    h('label', { style: styles.formLabel }, isEdit ? 'Contraseña (dejar vacío para mantener)' : 'Contraseña *'),
                    h('input', { type: 'password', value: formData.password, onChange: (e) => setFormData({ ...formData, password: e.target.value }), style: styles.formInput, placeholder: isEdit ? 'Nueva contraseña (opcional)' : 'Mínimo 8 caracteres', required: !isEdit, minLength: isEdit ? undefined : 8 })
                ),
                h('div', { style: styles.formGroup },
                    h('label', { style: styles.formLabel }, 'Rol *'),
                    h('select', { value: formData.rol, onChange: (e) => setFormData({ ...formData, rol: e.target.value }), style: styles.formSelect, required: true },
                        h('option', { value: '' }, 'Seleccione rol'),
                        roles.map(r => h('option', { key: r.id_rol, value: r.nombre }, r.nombre))
                    )
                )
            ),
            h('div', { style: { marginTop: '24px', display: 'flex', gap: '12px' } },
                h('button', { type: 'submit', style: styles.buttonPrimary }, h(IconSave), isEdit ? 'Actualizar Usuario' : 'Guardar Usuario'),
                h('button', { type: 'button', style: styles.buttonOutline, onClick: () => onNavigate('users') }, 'Cancelar')
            )
        )
        )
    );
}

export default UserFormPage;
