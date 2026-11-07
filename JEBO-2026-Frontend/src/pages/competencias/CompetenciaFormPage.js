import React, { useState, useEffect } from 'react';

import { styles } from '../../styles/theme/index.js';
import { Loading } from '../../components/ui/Loading.js';
import { ErrorAlert } from '../../components/ui/ErrorAlert.js';
import { Modal } from '../../components/ui/Modal.js';
import { IconSave, IconArrowLeft, IconPlus, IconTrash, IconCheck, IconEdit } from '../../components/icons/index.js';
import { useResponsive } from '../../hooks/useResponsive.js';
import competenciaService from '../../services/competenciaService.js';

const { createElement: h } = React;

const EMPTY_ETAPA = { nombre: '', orden: null, tipo: null, es_final: false, reglas: [] };

const STEP_LABELS = ['Información General', 'Etapas y Reglas', 'Confirmación'];

const TIPOS_ETAPA = [
    { value: null, label: 'Sin tipo' },
    { value: 'ELIMINACION', label: 'Eliminación directa' },
    { value: 'GRUPOS', label: 'Fase de grupos' },
    { value: 'LIGA', label: 'Liga (todos contra todos)' }
];

const FORMATOS_COMPETICION = [
    { value: null, label: 'Sin formato' },
    { value: 'ELIMINACION', label: 'Eliminación directa' },
    { value: 'GRUPOS', label: 'Grupos' },
    { value: 'LIGA', label: 'Liga' }
];

const METODOS_CLASIFICACION = [
    { value: null, label: 'Sin método' },
    { value: 'POSICION', label: 'Por posición' },
    { value: 'GANADOR', label: 'Por ganador (puntos)' }
];

export function CompetenciaFormPage({ onNavigate, pageParams, readOnly }) {
    const isEdit = Boolean(pageParams?.id);
    const { isMd } = useResponsive();

    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        estado: 'BORRADOR'
    });

    const [etapas, setEtapas] = useState([{ ...EMPTY_ETAPA }]);
    const [loading, setLoading] = useState(isEdit || readOnly);
    const [errors, setErrors] = useState({});
    const [errorAlert, setErrorAlert] = useState({ show: false, title: '', message: '', suggestion: '' });
    const [step, setStep] = useState(1);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => {
        if (isEdit || readOnly) {
            loadCompetencia();
        }
    }, [pageParams?.id]);

    const loadCompetencia = async () => {
        try {
            const data = await competenciaService.getById(pageParams.id);
            setFormData({
                nombre: data.nombre || '',
                descripcion: data.descripcion || '',
                estado: data.estado || 'BORRADOR'
            });
            if (data.etapas?.length > 0) {
                setEtapas(data.etapas.map(e => ({
                    nombre: e.nombre || '',
                    orden: e.orden || null,
                    tipo: e.tipo || null,
                    es_final: e.es_final || false,
                    reglas: e.reglas || []
                })));
            }
        } catch (err) {
            setErrorAlert({ show: true, title: 'Error', message: err.message });
        } finally {
            setLoading(false);
        }
    };

    const addEtapa = () => {
        setEtapas([...etapas, { ...EMPTY_ETAPA }]);
    };

    const removeEtapa = (index) => {
        setEtapas(etapas.filter((_, i) => i !== index));
    };

    const updateEtapa = (index, field, value) => {
        const newEtapas = [...etapas];
        newEtapas[index] = { ...newEtapas[index], [field]: value };
        setEtapas(newEtapas);
    };

    const addRegla = (etapaIndex, tipo) => {
        const newEtapas = [...etapas];
        newEtapas[etapaIndex] = {
            ...newEtapas[etapaIndex],
            reglas: [...newEtapas[etapaIndex].reglas, { tipo, configuracion: {} }]
        };
        setEtapas(newEtapas);
    };

    const removeRegla = (etapaIndex, reglaIndex) => {
        const newEtapas = [...etapas];
        newEtapas[etapaIndex] = {
            ...newEtapas[etapaIndex],
            reglas: newEtapas[etapaIndex].reglas.filter((_, i) => i !== reglaIndex)
        };
        setEtapas(newEtapas);
    };

    const updateReglaConfig = (etapaIndex, reglaIndex, key, value) => {
        const newEtapas = [...etapas];
        newEtapas[etapaIndex] = {
            ...newEtapas[etapaIndex],
            reglas: newEtapas[etapaIndex].reglas.map((r, i) =>
                i === reglaIndex ? { ...r, configuracion: { ...r.configuracion, [key]: value } } : r
            )
        };
        setEtapas(newEtapas);
    };

    const buildPayload = () => {
        return {
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            etapas: etapas
                .filter(e => e.nombre.trim())
                .map((e, idx) => ({
                    nombre: e.nombre.trim(),
                    orden: e.orden || idx + 1,
                    tipo: e.tipo,
                    es_final: e.es_final,
                    reglas: e.reglas.map(r => ({
                        tipo: r.tipo,
                        configuracion: r.configuracion
                    }))
                }))
        };
    };

    const handleSubmit = async () => {
        try {
            const payload = buildPayload();
            if (isEdit) {
                await competenciaService.update(pageParams.id, payload);
            } else {
                await competenciaService.create(payload);
            }
            onNavigate('competencias');
        } catch (err) {
            setErrorAlert({ show: true, title: 'Error al guardar', message: err.message });
        }
    };

    const validateCurrentStep = () => {
        const newErrors = {};
        if (step === 1) {
            if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
        }
        if (step === 2) {
            const validEtapas = etapas.filter(e => e.nombre.trim());
            if (validEtapas.length === 0) newErrors.etapas = 'Debe haber al menos una etapa';
            validEtapas.forEach((e, i) => {
                if (!e.nombre.trim()) newErrors[`etapa_${i}_nombre`] = 'Nombre requerido';
            });
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (!validateCurrentStep()) return;
        setStep(step + 1);
    };

    const handleBack = () => {
        setErrors({});
        setStep(step - 1);
    };

    const handleFinish = () => {
        if (!validateCurrentStep()) return;
        setShowConfirmModal(true);
    };

    if (loading) return h(Loading);

    const renderStepper = () => h('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: '24px', gap: '8px' } },
        STEP_LABELS.map((label, idx) => {
            const stepNum = idx + 1;
            const isActive = step === stepNum;
            const isComplete = step > stepNum;
            return h('div', { key: stepNum, style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                h('div', {
                    style: {
                        width: '32px', height: '32px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: '600',
                        backgroundColor: isComplete ? '#10b981' : isActive ? '#3b82f6' : '#e5e7eb',
                        color: isComplete || isActive ? '#fff' : '#6b7280'
                    }
                }, isComplete ? h(IconCheck) : stepNum),
                (!isMd || isActive) && h('span', { style: { fontSize: '14px', color: isActive ? '#1f2937' : '#6b7280' } }, label),
                stepNum < STEP_LABELS.length && h('div', { style: { width: isMd ? '16px' : '40px', height: '2px', backgroundColor: step > stepNum ? '#10b981' : '#e5e7eb' } })
            );
        })
    );

    const renderStep1 = () => h('div', null,
        h('div', { style: { ...styles.formGroup } },
            h('label', { style: styles.formLabel }, 'Nombre de la Competencia *'),
            h('input', {
                type: 'text',
                value: formData.nombre,
                onChange: e => setFormData({ ...formData, nombre: e.target.value }),
                disabled: readOnly,
                style: { ...styles.formInput, ...(errors.nombre ? { border: '1px solid #ef4444' } : {}) }
            }),
            errors.nombre && h('span', { style: { color: '#ef4444', fontSize: '12px', marginTop: '4px' } }, errors.nombre)
        ),
        h('div', { style: { ...styles.formGroup } },
            h('label', { style: styles.formLabel }, 'Descripción'),
            h('textarea', {
                value: formData.descripcion,
                onChange: e => setFormData({ ...formData, descripcion: e.target.value }),
                disabled: readOnly,
                style: { ...styles.formInput, minHeight: '80px', resize: 'vertical' }
            })
        ),
        h('div', { style: { ...styles.formGroup } },
            h('label', { style: styles.formLabel }, 'Estado'),
            h('select', {
                value: formData.estado,
                onChange: e => setFormData({ ...formData, estado: e.target.value }),
                disabled: readOnly,
                style: styles.formSelect
            },
                h('option', { value: 'BORRADOR' }, 'Borrador'),
                h('option', { value: 'CONFIGURADA' }, 'Configurada'),
                h('option', { value: 'EN_CURSO' }, 'En Curso'),
                h('option', { value: 'FINALIZADA' }, 'Finalizada')
            )
        )
    );

    const renderStep2 = () => h('div', null,
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' } },
            h('h3', { style: { fontSize: '16px', fontWeight: 600 } }, 'Etapas de la Competencia'),
            !readOnly && h('button', {
                style: styles.buttonOutline,
                onClick: addEtapa
            }, h(IconPlus), ' Agregar Etapa')
        ),
        errors.etapas && h('div', { style: { color: '#ef4444', fontSize: '13px', marginBottom: '12px' } }, errors.etapas),
        etapas.map((etapa, idx) => h('div', {
            key: idx,
            style: {
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px'
            }
        },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px' } },
                h('strong', null, `Etapa ${idx + 1}`),
                !readOnly && h('button', {
                    style: { color: '#ef4444' },
                    onClick: () => removeEtapa(idx)
                }, h(IconTrash))
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: isMd ? '1fr' : '1fr 1fr 1fr', gap: '12px' } },
                h('div', null,
                    h('label', { style: styles.formLabel }, 'Nombre *'),
                    h('input', {
                        type: 'text',
                        value: etapa.nombre,
                        onChange: e => updateEtapa(idx, 'nombre', e.target.value),
                        disabled: readOnly,
                        style: styles.formInput
                    })
                ),
                h('div', null,
                    h('label', { style: styles.formLabel }, 'Tipo'),
                    h('select', {
                        value: etapa.tipo || '',
                        onChange: e => updateEtapa(idx, 'tipo', e.target.value || null),
                        disabled: readOnly,
                        style: styles.formSelect
                    },
                        TIPOS_ETAPA.map(t => h('option', { key: t.value || 'null', value: t.value || '' }, t.label))
                    )
                ),
                h('div', null,
                    h('label', { style: styles.formLabel }, '¿Es final?'),
                    h('input', {
                        type: 'checkbox',
                        checked: etapa.es_final,
                        onChange: e => updateEtapa(idx, 'es_final', e.target.checked),
                        disabled: readOnly,
                        style: { marginTop: '8px' }
                    })
                )
            ),
            h('div', { style: { marginTop: '12px' } },
                h('div', { style: { fontSize: '13px', fontWeight: 600, marginBottom: '8px' } }, 'Reglas'),
                etapa.reglas.map((regla, rIdx) => h('div', {
                    key: rIdx,
                    style: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }
                },
                    h('span', { style: { fontSize: '12px', color: '#6b7280', minWidth: '120px' } }, regla.tipo),
                    regla.tipo === 'COMPETICION' && h('select', {
                        value: regla.configuracion.formato || '',
                        onChange: e => updateReglaConfig(idx, rIdx, 'formato', e.target.value || null),
                        disabled: readOnly,
                        style: { ...styles.formSelect, minWidth: '120px' }
                    }, FORMATOS_COMPETICION.map(f => h('option', { key: f.value || 'null', value: f.value || '' }, f.label))),
                    regla.tipo === 'CLASIFICACION' && h('select', {
                        value: regla.configuracion.metodo || '',
                        onChange: e => updateReglaConfig(idx, rIdx, 'metodo', e.target.value || null),
                        disabled: readOnly,
                        style: { ...styles.formSelect, minWidth: '120px' }
                    }, METODOS_CLASIFICACION.map(m => h('option', { key: m.value || 'null', value: m.value || '' }, m.label))),
                    regla.tipo === 'CLASIFICACION' && h('input', {
                        type: 'number',
                        placeholder: 'Cantidad',
                        value: regla.configuracion.cantidad || '',
                        onChange: e => updateReglaConfig(idx, rIdx, 'cantidad', parseInt(e.target.value) || null),
                        disabled: readOnly,
                        style: { ...styles.formInput, width: '80px' }
                    }),
                    !readOnly && h('button', {
                        style: { color: '#ef4444', padding: '4px' },
                        onClick: () => removeRegla(idx, rIdx)
                    }, h(IconTrash))
                )),
                !readOnly && h('div', { style: { display: 'flex', gap: '8px', marginTop: '8px' } },
                    h('select', {
                        value: '',
                        onChange: e => {
                            if (e.target.value) addRegla(idx, e.target.value);
                            e.target.value = '';
                        },
                        style: { ...styles.formSelect, minWidth: '150px' }
                    },
                        h('option', { value: '' }, 'Agregar regla...'),
                        h('option', { value: 'PARTICIPANTES' }, 'Participantes'),
                        h('option', { value: 'COMPETICION' }, 'Competición'),
                        h('option', { value: 'CLASIFICACION' }, 'Clasificación')
                    )
                )
            )
        ))
    );

    const renderStep3 = () => h('div', null,
        h('div', { style: { backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' } },
            h('h3', { style: { fontSize: '16px', fontWeight: 600, marginBottom: '12px' } }, 'Resumen'),
            h('div', { style: { marginBottom: '8px' } },
                h('strong', null, 'Nombre: '), formData.nombre
            ),
            formData.descripcion && h('div', { style: { marginBottom: '8px' } },
                h('strong', null, 'Descripción: '), formData.descripcion
            ),
            h('div', { style: { marginBottom: '12px' } },
                h('strong', null, 'Estado: '), formData.estado
            ),
            h('h4', { style: { fontSize: '14px', fontWeight: 600, marginBottom: '8px' } }, `Etapas (${etapas.filter(e => e.nombre.trim()).length})`),
            etapas.filter(e => e.nombre.trim()).map((e, idx) => h('div', {
                key: idx,
                style: { marginBottom: '8px', paddingLeft: '12px', borderLeft: '3px solid #e5e7eb' }
            },
                h('div', null, h('strong', null, `${idx + 1}. ${e.nombre}`)),
                h('div', { style: { fontSize: '12px', color: '#6b7280' } },
                    [e.tipo, e.es_final ? 'Final' : null].filter(Boolean).join(' | ')
                )
            ))
        )
    );

    const stepContent = step === 1 ? renderStep1() : step === 2 ? renderStep2() : renderStep3();

    return h('div', { style: styles.appContainer },
        h('div', { style: styles.pageContainer },
            h('h2', { style: styles.pageTitle }, isEdit ? 'Editar Competencia' : 'Nueva Competencia'),
            renderStepper(),
            h(ErrorAlert, {
                show: errorAlert.show,
                onClose: () => setErrorAlert({ ...errorAlert, show: false }),
                title: errorAlert.title,
                message: errorAlert.message,
                suggestion: errorAlert.suggestion
            }),
            stepContent,
            h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' } },
                h('button', {
                    style: styles.buttonOutline,
                    onClick: step === 1 ? () => onNavigate('competencias') : handleBack
                }, h(IconArrowLeft), step === 1 ? ' Cancelar' : ' Atrás'),
                h('div', { style: { display: 'flex', gap: '12px' } },
                    step < 3 && h('button', {
                        style: styles.buttonPrimary,
                        onClick: handleNext
                    }, 'Siguiente'),
                    step === 3 && h('button', {
                        style: styles.buttonSuccess,
                        onClick: handleFinish
                    }, h(IconSave), isEdit ? ' Guardar' : ' Crear Competencia')
                )
            )
        ),
        showConfirmModal && h(Modal, {
            isOpen: showConfirmModal,
            onClose: () => setShowConfirmModal(false),
            onConfirm: handleSubmit,
            title: isEdit ? 'Guardar cambios' : 'Crear competencia',
            message: isEdit ? '¿Guardar los cambios?' : '¿Crear la competencia con la configuración actual?',
            confirmText: isEdit ? 'Guardar' : 'Crear',
            cancelText: 'Cancelar'
        })
    );
}
