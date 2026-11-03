import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import disciplineService from '../../services/disciplineService.js';

const { createElement: h } = React;

export function DeporteSelector({ value, onChange, label, required, style }) {
    const [disciplines, setDisciplines] = useState([]);

    useEffect(() => {
        disciplineService.getAll().then(res => {
            const data = res.data || res || [];
            setDisciplines(Array.isArray(data) ? data : []);
        }).catch(err => console.error('Error loading disciplines:', err));
    }, []);

    return h('div', { style: { ...styles.formGroup, ...style } },
        label && h('label', { style: styles.formLabel }, label),
        h('select', {
            value: value || '',
            onChange: (e) => onChange(e.target.value),
            style: styles.formSelect,
            required: required || false
        },
            h('option', { value: '' }, 'Seleccionar deporte'),
            disciplines.map(d =>
                h('option', { key: d.id_disciplina || d.id, value: String(d.id_disciplina || d.id) },
                    d.nombre || d.name
                )
            )
        )
    );
}

export function getDeporteNombre() {
    return '—';
}

export default DeporteSelector;
