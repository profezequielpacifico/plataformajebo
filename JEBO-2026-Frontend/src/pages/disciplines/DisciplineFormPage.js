import React, { useState, useEffect, useRef } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Loading } from '../../components/ui/Loading.js';
import { IconSave, IconFileText, IconEye } from '../../components/icons/index.js';
import disciplineService from '../../services/disciplineService.js';

const { createElement: h } = React;

export function DisciplineFormPage({ onNavigate, disciplineId, readOnly = false }) {
    const isEdit = !!disciplineId && !readOnly;
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        jugadores_por_equipo: '',
        tipo_competencia: 'MARCADOR',
        puntos_victoria: 2,
        puntos_empate: 1,
        puntos_derrota: 1,
        reglamento: ''
    });
    const [loading, setLoading] = useState(isEdit);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState('');
    const [reglamentoFile, setReglamentoFile] = useState(null);
    const [reglamentoUploading, setReglamentoUploading] = useState(false);
    const [reglamentoMsg, setReglamentoMsg] = useState('');
    const fileInputRef = useRef(null);

    const handleChooseFile = () => fileInputRef.current && fileInputRef.current.click();

    useEffect(() => {
        if (!disciplineId) return;
        (async () => {
            try {
                const res = await disciplineService.getById(disciplineId);
                const d = res.data || res;
                setFormData({
                    nombre: d.nombre || '',
                    descripcion: d.descripcion || '',
                    jugadores_por_equipo: d.jugadores_por_equipo || '',
                    tipo_competencia: d.tipo_competencia || 'MARCADOR',
                    puntos_victoria: d.puntos_victoria ?? 2,
                    puntos_empate: d.puntos_empate ?? 1,
                    puntos_derrota: d.puntos_derrota ?? 1,
                    reglamento: d.reglamento || ''
                });
            } catch {
                setError('Error al cargar datos del deporte');
            }
            setLoading(false);
        })();
    }, [disciplineId]);

    const handleUploadReglamento = async () => {
        if (!reglamentoFile) {
            setReglamentoMsg('Seleccione un archivo primero');
            return;
        }
        setReglamentoUploading(true);
        setReglamentoMsg('');
        setError('');
        try {
            const res = await disciplineService.uploadReglamento(disciplineId, reglamentoFile);
            const d = res?.data || {};
            setFormData((prev) => ({ ...prev, reglamento: d.reglamento || res?.reglamento || '' }));
            setReglamentoFile(null);
            setReglamentoMsg('Reglamento subido correctamente');
        } catch {
            setReglamentoMsg('Error al subir el reglamento');
        }
        setReglamentoUploading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nombre.trim()) {
            setError('El nombre es requerido');
            return;
        }
        const puntos = [formData.puntos_victoria, formData.puntos_empate, formData.puntos_derrota];
        if (puntos.some((p) => p === '' || !Number.isInteger(Number(p)) || Number(p) < 0 || Number(p) > 100)) {
            setError('Los puntos deben ser números enteros entre 0 y 100');
            return;
        }
        setIsSaving(true);
        setError('');
        try {
            const payload = {
                nombre: formData.nombre.trim(),
                descripcion: formData.descripcion.trim(),
                jugadores_por_equipo: formData.jugadores_por_equipo ? parseInt(formData.jugadores_por_equipo, 10) : undefined,
                tipo_competencia: formData.tipo_competencia,
                puntos_victoria: Number(formData.puntos_victoria),
                puntos_empate: Number(formData.puntos_empate),
                puntos_derrota: Number(formData.puntos_derrota)
            };
            if (isEdit) {
                await disciplineService.update(disciplineId, payload);
            } else {
                const created = await disciplineService.create(payload);
                const newId = created?.data?.id_disciplina || created?.id_disciplina;
                if (reglamentoFile && newId) {
                    await disciplineService.uploadReglamento(newId, reglamentoFile);
                }
            }
            setShowSuccess(true);
        } catch (err) {
            setError('Error al guardar: ' + (err.response?.data?.message || err.message || 'Error desconocido'));
        }
        setIsSaving(false);
    };

    if (loading) return h(Loading, { message: 'Cargando deporte...' });
    if (isSaving) return h(Loading, { message: 'Guardando deporte...' });

    if (showSuccess) {
        return h('div', { style: styles.successContainer },
            h('div', { style: styles.successTitle }, isEdit ? '¡Deporte actualizado!' : '¡Deporte registrado!'),
            h('div', { style: styles.successText }, isEdit ? 'El deporte ha sido actualizado exitosamente' : 'El deporte ha sido registrado exitosamente'),
            h('button', { style: styles.successButton, onClick: () => onNavigate('sports') }, 'Volver')
        );
    }

    return h(Card, null,
        h(CardHeader, { title: readOnly ? 'Detalle del Deporte' : (isEdit ? 'Editar Deporte' : 'Nuevo Deporte') }),
        h('div', { style: { padding: '24px' } },
            error && h('div', { style: { color: '#ef4444', padding: '12px', marginBottom: '16px', backgroundColor: '#fee2e2', borderRadius: '6px' } }, error),
            h('form', { onSubmit: handleSubmit },
            h('div', { style: { display: 'grid', gap: '20px' } },
                h('div', { style: styles.formGroup },
                    h('label', { style: styles.formLabel }, 'Nombre del Deporte *'),
                    h('input', {
                        type: 'text', value: formData.nombre,
                        onChange: (e) => setFormData({ ...formData, nombre: e.target.value }),
                        style: styles.formInput, placeholder: 'Ej: Fútbol, Voleibol...', required: true, disabled: readOnly
                    })
                ),
                h('div', { style: styles.formGroup },
                    h('label', { style: styles.formLabel }, 'Estudiantes por Equipo'),
                    h('input', {
                        type: 'number', value: formData.jugadores_por_equipo,
                        onChange: (e) => setFormData({ ...formData, jugadores_por_equipo: e.target.value }),
                        style: styles.formInput, placeholder: 'Ej: 11', min: 1, disabled: readOnly
                    })
                ),
                h('div', { style: styles.formGroup },
                    h('label', { style: styles.formLabel }, 'Tipo de competencia'),
                    readOnly
                        ? h('div', { style: { fontSize: '14px', color: '#374151' } },
                            formData.tipo_competencia === 'EVALUACION'
                                ? 'Por evaluación (presentaciones con jurado)'
                                : 'Con marcador (partidos entre dos equipos)')
                        : h('select', {
                            value: formData.tipo_competencia,
                            onChange: (e) => setFormData({ ...formData, tipo_competencia: e.target.value }),
                            style: styles.formSelect
                        },
                            h('option', { value: 'MARCADOR' }, 'Con marcador (partidos entre dos equipos)'),
                            h('option', { value: 'EVALUACION' }, 'Por evaluación (presentaciones con jurado)')
                        ),
                    (!readOnly && formData.tipo_competencia === 'EVALUACION')
                        && h('div', { style: { fontSize: '12px', color: '#6b7280', marginTop: '6px' } },
                            'Las competencias de este deporte no tienen partidos: los encuentros se cargan en Presentaciones, donde cada trío se presenta solo y lo evalúa un jurado.')
                ),
                formData.tipo_competencia === 'MARCADOR' && h('div', { style: styles.formGroup },
                    h('div', { style: styles.formLabel }, 'Puntos por resultado'),
                    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' } },
                        [
                            ['puntos_victoria', 'Si gana'],
                            ['puntos_empate', 'Si empata'],
                            ['puntos_derrota', 'Si pierde']
                        ].map(([campo, etiqueta]) => h('div', { key: campo },
                            h('label', { htmlFor: campo, style: { fontSize: '13px', color: '#4b5563', display: 'block', marginBottom: '4px' } }, etiqueta),
                            h('input', {
                                id: campo,
                                type: 'number',
                                min: 0,
                                max: 100,
                                value: formData[campo],
                                onChange: (e) => setFormData({ ...formData, [campo]: e.target.value }),
                                style: styles.formInput,
                                disabled: readOnly
                            })
                        ))
                    ),
                    !readOnly && h('div', { style: { fontSize: '12px', color: '#6b7280', marginTop: '6px' } },
                        'Al cambiarlos se recalculan las tablas por etapa. La clasificación general del torneo se actualiza con el próximo partido que termine.')
                ),
                h('div', { style: styles.formGroup },
                    h('label', { style: styles.formLabel }, 'Descripción'),
                    h('textarea', {
                        value: formData.descripcion,
                        onChange: (e) => setFormData({ ...formData, descripcion: e.target.value }),
                        style: { ...styles.formInput, minHeight: '100px', resize: 'vertical' },
                        placeholder: 'Descripción del deporte...', disabled: readOnly
                    })
                ),
                h('div', { style: styles.formGroup },
                    h('label', { style: styles.formLabel }, 'Reglamento'),
                    readOnly
                        ? h('div', null,
                            formData.reglamento
                                ? h('a', {
                                    href: disciplineService.getReglamentoUrl(formData.reglamento),
                                    target: '_blank',
                                    rel: 'noopener noreferrer',
                                    style: { display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontSize: '14px' }
                                }, h(IconEye), 'Descargar reglamento')
                                : h('div', { style: { color: '#9ca3af', fontSize: '13px' } }, 'Sin reglamento cargado')
                        )
                        : h('div', null,
                            h('input', {
                                ref: fileInputRef,
                                type: 'file',
                                accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png',
                                style: { display: 'none' },
                                onChange: (e) => {
                                    setReglamentoFile(e.target.files?.[0] || null);
                                    setReglamentoMsg('');
                                }
                            }),
                            h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' } },
                                h('button', {
                                    type: 'button',
                                    style: { ...styles.buttonOutline, display: 'flex', alignItems: 'center', gap: '6px' },
                                    onClick: handleChooseFile
                                }, h(IconFileText), reglamentoFile ? 'Cambiar documento' : 'Cargar documento'),
                                reglamentoFile && h('span', { style: { color: '#374151', fontSize: '13px', wordBreak: 'break-all' } }, reglamentoFile.name),
                                isEdit && h('button', {
                                    type: 'button',
                                    style: { ...styles.buttonPrimary, display: 'flex', alignItems: 'center', gap: '6px' },
                                    onClick: handleUploadReglamento,
                                    disabled: reglamentoUploading || !reglamentoFile
                                }, h(IconFileText), reglamentoUploading ? 'Subiendo...' : 'Subir documento')
                            ),
                            !isEdit && reglamentoFile && h('div', { style: { color: '#6b7280', marginTop: '6px', fontSize: '13px' } },
                                'El documento se subirá al guardar el deporte.'
                            ),
                            formData.reglamento
                                ? h('a', {
                                    href: disciplineService.getReglamentoUrl(formData.reglamento),
                                    target: '_blank',
                                    rel: 'noopener noreferrer',
                                    style: { display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#2563eb', marginTop: '8px', fontSize: '14px' }
                                }, h(IconEye), 'Descargar reglamento actual')
                                : h('div', { style: { color: '#9ca3af', marginTop: '8px', fontSize: '13px' } }, 'No hay reglamento cargado'),
                            reglamentoMsg && h('div', { style: { color: reglamentoMsg.startsWith('Error') ? '#ef4444' : '#16a34a', marginTop: '8px', fontSize: '13px' } }, reglamentoMsg)
                        )
                )
            ),
            h('div', { style: { marginTop: '24px', display: 'flex', gap: '12px' } },
                readOnly
                    ? h('button', { type: 'button', style: styles.buttonPrimary, onClick: () => onNavigate('sports') }, 'Volver')
                    : h('button', { type: 'submit', style: styles.buttonPrimary }, h(IconSave), isEdit ? 'Actualizar Deporte' : 'Guardar Deporte'),
                !readOnly && h('button', { type: 'button', style: styles.buttonOutline, onClick: () => onNavigate('sports') }, 'Cancelar')
            )
        )
        )
    );
}

export default DisciplineFormPage;
