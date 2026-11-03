import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Loading } from '../../components/ui/Loading.js';
import { IconSave, IconArrowLeft } from '../../components/icons/index.js';
import { districtService } from '../../services/districtService.js';

const { createElement: h } = React;

export function DistrictsFormPage({ onNavigate, pageParams }) {
    const isEdit = Boolean(pageParams?.id);
    const [formData, setFormData] = useState({ nombre: '' });
    const [loading, setLoading] = useState(isEdit);
    const [error, setError] = useState('');

    useEffect(() => {
        async function init() {
            try {
                if (isEdit) {
                    const res = await districtService.getById(pageParams.id);
                    const data = res.data || res;
                    setFormData({
                        nombre: data.nombre || ''
                    });
                }
            } catch { setError('Error al cargar datos'); }
            finally { setLoading(false); }
        }
        init();
    }, [pageParams?.id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEdit) await districtService.update(pageParams.id, formData);
            else await districtService.create(formData);
            onNavigate('districts');
        } catch (err) { setError(err.message || 'Error al guardar'); }
    };

    if (loading) return h(Loading);

    return h('div', { style: styles.appContainer },
        h(Card, null,
            h(CardHeader, { title: isEdit ? 'Editar Distrito' : 'Nuevo Distrito' }),
            h('form', { onSubmit: handleSubmit, style: { padding: '24px' } },
                error && h('div', { style: { color: '#ef4444', marginBottom: '16px' } }, error),
                h('div', { style: { marginBottom: '16px' } },
                    h('label', { style: styles.formLabel }, 'Nombre *'),
                    h('input', { type: 'text', style: styles.formInput, value: formData.nombre, required: true, onChange: e => setFormData({ ...formData, nombre: e.target.value }) })
                ),
                h('div', { style: { display: 'flex', gap: '8px' } },
                    h('button', { type: 'submit', style: styles.buttonPrimary }, h(IconSave), 'Guardar'),
                    h('button', { type: 'button', style: styles.buttonOutline, onClick: () => onNavigate('districts') }, h(IconArrowLeft), 'Cancelar')
                )
            )
        )
    );
}
