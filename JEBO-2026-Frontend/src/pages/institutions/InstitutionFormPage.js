import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Loading } from '../../components/ui/Loading.js';
import { IconSave, IconArrowLeft } from '../../components/icons/index.js';
import { institutionService } from '../../services/institutionService.js';
import { districtService } from '../../services/districtService.js';
import { localityService } from '../../services/localityService.js';

const { createElement: h } = React;

export function InstitutionFormPage({ onNavigate, pageParams }) {
    const isEdit = Boolean(pageParams?.id);
    const [formData, setFormData] = useState({ nombre: '', id_distrito: '', id_localidad: '', tipo: '', direccion: '', telefono: '' });
    const [districts, setDistricts] = useState([]);
    const [localities, setLocalities] = useState([]);
    const [loading, setLoading] = useState(isEdit);
    const [error, setError] = useState('');

    useEffect(() => {
        async function init() {
            try {
                const [distRes, locRes] = await Promise.all([
                    districtService.getAll({ limit: 200 }),
                    localityService.getAll({ limit: 1000 })
                ]);
                const districtList = Array.isArray(distRes) ? distRes : (distRes?.data || distRes?.rows || []);
                const localityList = Array.isArray(locRes) ? locRes : (locRes?.data || locRes?.rows || []);
                setDistricts(districtList);
                setLocalities(localityList);

                if (isEdit) {
                    const res = await institutionService.getById(pageParams.id);
                    const data = res.data || res;
                    setFormData({
                        nombre: data.nombre || '',
                        id_distrito: String(data.id_distrito || ''),
                        id_localidad: String(data.id_localidad || ''),
                        tipo: data.tipo || '',
                        direccion: data.direccion || '',
                        telefono: data.telefono || ''
                    });
                }
            } catch { setError('Error al cargar datos'); }
            finally { setLoading(false); }
        }
        init();
    }, [pageParams?.id]);

    const filteredLocalities = localities.filter(l => String(l.id_distrito) === String(formData.id_distrito));

    const handleDistritoChange = (value) => {
        setFormData({ ...formData, id_distrito: value, id_localidad: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            nombre: formData.nombre,
            id_distrito: formData.id_distrito,
            id_localidad: formData.id_localidad || null,
            tipo: formData.tipo,
            direccion: formData.direccion,
            telefono: formData.telefono
        };
        try {
            if (isEdit) await institutionService.update(pageParams.id, payload);
            else await institutionService.create(payload);
            onNavigate('institutions');
        } catch (err) { setError(err.response?.data?.message || err.message || 'Error al guardar'); }
    };

    if (loading) return h(Loading);

    return h('div', { style: styles.appContainer },
        h(Card, null,
            h(CardHeader, { title: isEdit ? 'Editar Institución' : 'Nueva Institución' }),
            h('form', { onSubmit: handleSubmit, style: { padding: '24px' } },
                error && h('div', { style: { color: '#ef4444', marginBottom: '16px' } }, error),
                h('div', { style: { marginBottom: '16px' } },
                    h('label', { style: styles.formLabel }, 'Nombre *'),
                    h('input', { type: 'text', style: styles.formInput, value: formData.nombre, required: true, onChange: e => setFormData({ ...formData, nombre: e.target.value }) })
                ),
                h('div', { style: { marginBottom: '16px' } },
                    h('label', { style: styles.formLabel }, 'Distrito *'),
                    h('select', { style: styles.formSelect, value: formData.id_distrito, required: true, onChange: e => handleDistritoChange(e.target.value) },
                        h('option', { value: '' }, 'Seleccionar distrito...'),
                        districts.map(d => h('option', { key: d.id_distrito, value: String(d.id_distrito) }, d.nombre))
                    )
                ),
                h('div', { style: { marginBottom: '16px' } },
                    h('label', { style: styles.formLabel }, 'Localidad'),
                    h('select', { style: styles.formSelect, value: formData.id_localidad, onChange: e => setFormData({ ...formData, id_localidad: e.target.value }) },
                        h('option', { value: '' }, 'Seleccionar localidad...'),
                        filteredLocalities.map(l => h('option', { key: l.id_localidad, value: String(l.id_localidad) }, l.nombre))
                    )
                ),
                h('div', { style: { marginBottom: '16px' } },
                    h('label', { style: styles.formLabel }, 'Tipo'),
                    h('input', { type: 'text', style: styles.formInput, value: formData.tipo, placeholder: 'Ej: Escuela, Club, Federación...', onChange: e => setFormData({ ...formData, tipo: e.target.value }) })
                ),
                h('div', { style: { marginBottom: '16px' } },
                    h('label', { style: styles.formLabel }, 'Dirección'),
                    h('input', { type: 'text', style: styles.formInput, value: formData.direccion, onChange: e => setFormData({ ...formData, direccion: e.target.value }) })
                ),
                h('div', { style: { marginBottom: '16px' } },
                    h('label', { style: styles.formLabel }, 'Teléfono'),
                    h('input', { type: 'text', style: styles.formInput, value: formData.telefono, onChange: e => setFormData({ ...formData, telefono: e.target.value }) })
                ),
                h('div', { style: { display: 'flex', gap: '8px' } },
                    h('button', { type: 'submit', style: styles.buttonPrimary }, h(IconSave), isEdit ? 'Actualizar' : 'Guardar'),
                    h('button', { type: 'button', style: styles.buttonOutline, onClick: () => onNavigate('institutions') }, h(IconArrowLeft), 'Cancelar')
                )
            )
        )
    );
}

export default InstitutionFormPage;
