import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Loading } from '../../components/ui/Loading.js';
import { IconSave, IconArrowLeft } from '../../components/icons/index.js';
import { localityService } from '../../services/localityService.js';
import { districtService } from '../../services/districtService.js';
import { regionService } from '../../services/regionService.js';

const { createElement: h } = React;

export function LocalitiesFormPage({ onNavigate, pageParams }) {
    const isEdit = Boolean(pageParams?.id);
    const [formData, setFormData] = useState({ nombre: '', id_distrito: '', id_region: '', codigo: '' });
    const [districts, setDistricts] = useState([]);
    const [regions, setRegions] = useState([]);
    const [loading, setLoading] = useState(isEdit);
    const [error, setError] = useState('');

    useEffect(() => {
        async function init() {
            try {
                const [distRes, regRes] = await Promise.all([
                    districtService.getAll({ limit: 100 }),
                    regionService.getAll({ limit: 100 })
                ]);
                const districtList = Array.isArray(distRes) ? distRes : (distRes?.data || distRes?.rows || []);
                const regionList = Array.isArray(regRes) ? regRes : (regRes?.data || regRes?.rows || []);

                setDistricts(districtList);
                setRegions(regionList.map(r => ({ value: r.id || r.id_region, label: r.nombre || r.name })));

                if (isEdit) {
                    const res = await localityService.getById(pageParams.id);
                    const data = res.data || res;
                    setFormData({
                        nombre: data.nombre || '',
                        id_distrito: String(data.id_distrito || ''),
                        id_region: String(data.id_region || ''),
                        codigo: data.codigo || ''
                    });
                }
            } catch { setError('Error al cargar datos'); }
            finally { setLoading(false); }
        }
        init();
    }, [pageParams?.id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            nombre: formData.nombre,
            id_distrito: formData.id_distrito,
            id_region: formData.id_region,
            codigo: formData.codigo
        };
        try {
            if (isEdit) await localityService.update(pageParams.id, payload);
            else await localityService.create(payload);
            onNavigate('localities');
        } catch (err) { setError(err.message || 'Error al guardar'); }
    };

    if (loading) return h(Loading);

    return h('div', { style: styles.appContainer },
        h(Card, null,
            h(CardHeader, { title: isEdit ? 'Editar Localidad' : 'Nueva Localidad' }),
            h('form', { onSubmit: handleSubmit, style: { padding: '24px' } },
                error && h('div', { style: { color: '#ef4444', marginBottom: '16px' } }, error),
                h('div', { style: { marginBottom: '16px' } },
                    h('label', { style: styles.formLabel }, 'Nombre *'),
                    h('input', { type: 'text', style: styles.formInput, value: formData.nombre, required: true, onChange: e => setFormData({ ...formData, nombre: e.target.value }) })
                ),
                h('div', { style: { marginBottom: '16px' } },
                    h('label', { style: styles.formLabel }, 'Distrito *'),
                    h('select', { style: styles.formSelect, value: formData.id_distrito, required: true, onChange: e => setFormData({ ...formData, id_distrito: e.target.value }) },
                        h('option', { value: '' }, 'Seleccionar distrito...'),
                        districts.map(d => h('option', { key: d.id_distrito, value: String(d.id_distrito) }, d.nombre))
                    )
                ),
                h('div', { style: { marginBottom: '16px' } },
                    h('label', { style: styles.formLabel }, 'Región Educativa *'),
                    h('select', { style: styles.formSelect, value: formData.id_region, required: true, onChange: e => setFormData({ ...formData, id_region: e.target.value }) },
                        h('option', { value: '' }, 'Seleccionar región...'),
                        regions.map(r => h('option', { key: r.value, value: String(r.value) }, r.label))
                    )
                ),
                h('div', { style: { marginBottom: '16px' } },
                    h('label', { style: styles.formLabel }, 'Código'),
                    h('input', { type: 'text', style: styles.formInput, value: formData.codigo, onChange: e => setFormData({ ...formData, codigo: e.target.value }) })
                ),
                h('div', { style: { display: 'flex', gap: '8px' } },
                    h('button', { type: 'submit', style: styles.buttonPrimary }, h(IconSave), 'Guardar'),
                    h('button', { type: 'button', style: styles.buttonOutline, onClick: () => onNavigate('localities') }, h(IconArrowLeft), 'Cancelar')
                )
            )
        )
    );
}
