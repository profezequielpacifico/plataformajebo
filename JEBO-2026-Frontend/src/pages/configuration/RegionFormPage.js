import React, { useState } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Loading } from '../../components/ui/Loading.js';
import { IconSave } from '../../components/icons/index.js';
import regionService from '../../services/regionService.js';

const { createElement: h } = React;

export function RegionFormPage({ onNavigate }) {
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nombre.trim()) {
            alert('El nombre es requerido');
            return;
        }
        setIsSaving(true);
        try {
            await regionService.create({ nombre: formData.nombre, descripcion: formData.descripcion });
            setShowSuccess(true);
        } catch (err) {
            alert('Error al guardar: ' + (err.message || 'Error desconocido'));
        }
        setIsSaving(false);
    };

    const handleClear = () => {
        setFormData({ nombre: '', descripcion: '' });
    };

    if (isSaving) return h(Loading, { message: 'Guardando región...' });

    if (showSuccess) {
        return h('div', { style: styles.successContainer },
            h('div', { style: styles.successTitle }, '¡Región guardada!'),
            h('div', { style: styles.successText }, 'La región ha sido registrada exitosamente'),
            h('button', {
                style: styles.successButton,
                onClick: () => onNavigate('regions')
            }, 'Volver')
        );
    }

    return h(Card, null,
        h(CardHeader, { title: 'Nueva Región' }),

        h('div', { style: { padding: '24px' } },
            h('form', { onSubmit: handleSubmit },
            h('div', { style: { display: 'grid', gap: '20px' } },
                h('div', { style: styles.formGroup },
                    h('label', { style: styles.formLabel }, 'Nombre de la Región *'),
                    h('input', {
                        type: 'text',
                        value: formData.nombre,
                        onChange: (e) => setFormData({ ...formData, nombre: e.target.value }),
                        style: styles.formInput,
                        placeholder: 'Ej: Región Norte',
                        required: true
                    })
                ),
                h('div', { style: styles.formGroup },
                    h('label', { style: styles.formLabel }, 'Descripción'),
                    h('textarea', {
                        value: formData.descripcion,
                        onChange: (e) => setFormData({ ...formData, descripcion: e.target.value }),
                        style: { ...styles.formInput, minHeight: '80px', resize: 'vertical' },
                        placeholder: 'Descripción de la región...'
                    })
                ),

            ),
            h('div', { style: { marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' } },
                h('button', { type: 'submit', style: styles.buttonPrimary }, h(IconSave), 'Guardar'),
                h('button', { type: 'button', style: styles.buttonOutline, onClick: handleClear }, 'Limpiar'),
                h('button', { type: 'button', style: styles.buttonOutline, onClick: () => onNavigate('regions') }, 'Cancelar')
            )
        )
        )
    );
}

export default RegionFormPage;
