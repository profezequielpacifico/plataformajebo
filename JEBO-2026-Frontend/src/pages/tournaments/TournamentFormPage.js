import React, { useState, useEffect } from 'react';

import {
    styles
} from '../../styles/theme/index.js';

import { Loading } from '../../components/ui/Loading.js';
import { ErrorAlert } from '../../components/ui/ErrorAlert.js';
import { Modal } from '../../components/ui/Modal.js';
import { CalendarField } from '../../components/ui/CalendarField.js';
import { IconSave, IconArrowLeft, IconPlus, IconTrash, IconCheck, IconFileText, IconEdit } from '../../components/icons/index.js';
import { useResponsive } from '../../hooks/useResponsive.js';
import disciplineService from '../../services/disciplineService.js';
import tournamentService from '../../services/tournamentService.js';
import { stageService } from '../../services/stageService.js';
import { hoyArgentina, instanteAFechaHoraArgentina, fechaHoraArgentinaAInstante, formatearFecha } from '../../services/dateService.js';
import { REGLAS_POR_DEFECTO, ETIQUETAS_AMBITO, ETIQUETAS_MODALIDAD, describirOrigen, crearEtapasJebo } from './etapaReglas.js';

const { createElement: h } = React;

const EMPTY_ETAPA = { nombre: '', descripcion: '', fecha_inicio: '', fecha_fin: '', tipo: null, es_final: false, ...REGLAS_POR_DEFECTO };

const EXTRA_RANGE_COLORS = [
    { bg: '#d1fae5', fg: '#065f46' },
    { bg: '#fef3c7', fg: '#92400e' },
    { bg: '#fce7f3', fg: '#9d174d' },
    { bg: '#e0e7ff', fg: '#3730a3' },
    { bg: '#ffedd5', fg: '#9a3412' },
    { bg: '#cffafe', fg: '#155e75' }
];

const STEP_LABELS = ['Información General', 'Fechas Inscripción', 'Etapas del Torneo'];

const STATUS_BADGES = {
    'Programado': { backgroundColor: '#fef3c7', color: '#92400e' },
    'Pendiente': { backgroundColor: '#fef3c7', color: '#92400e' },
    'En Progreso': { backgroundColor: '#d1fae5', color: '#065f46' },
    'Finalizado': { backgroundColor: '#dbeafe', color: '#1e40af' },
    'Finalizada': { backgroundColor: '#dbeafe', color: '#1e40af' }
};

const DEFAULT_STATUS_BADGE = { backgroundColor: '#f3f4f6', color: '#374151' };

export function TournamentFormPage({ onNavigate, pageParams, readOnly }) {
    const isEdit = Boolean(pageParams?.id);

    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        edicion: '2026',
        id_disciplina: '',
        fecha_inicio: hoyArgentina(),
        fecha_fin: '',
        fecha_inscripcion_inicio: '',
        fecha_inscripcion_fin: ''
    });

    const { isMd, lessThan } = useResponsive();
    const [disciplines, setDisciplines] = useState([]);
    const [etapas, setEtapas] = useState([{ ...EMPTY_ETAPA }]);
    const [loading, setLoading] = useState(isEdit || readOnly);
    const [errors, setErrors] = useState({});
    const [errorAlert, setErrorAlert] = useState({ show: false, title: '', message: '', suggestion: '' });
    const [step, setStep] = useState(1);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [editingEtapaIndex, setEditingEtapaIndex] = useState(null);
    const [etapaDraft, setEtapaDraft] = useState(null);
    const [etapaToRemove, setEtapaToRemove] = useState(null);

    useEffect(() => {
        initForm({
            isEdit,
            readOnly,
            pageParams,
            setDisciplines,
            setFormData,
            setEtapas,
            setErrorAlert,
            setLoading
        });
    }, [pageParams?.id]);

    const applyValidation = (newErrors) => {
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateCurrentStep = () => {
        return applyValidation(computeStepErrors(step, formData, etapas));
    };

    const usarEtapasJebo = () => {
        const disciplina = disciplines.find((d) => String(d.id_disciplina || d.id) === String(formData.id_disciplina));
        setEtapas(crearEtapasJebo(disciplina?.tipo_competencia));
    };

    const addEtapa = () => {
        setEtapas([...etapas, { ...EMPTY_ETAPA }]);
    };

    const requestRemoveEtapa = (index) => {
        setEtapaToRemove(index);
    };

    const confirmRemoveEtapa = () => {
        if (etapaToRemove === null) return;
        setEtapas(etapas.map((e, i) => i === etapaToRemove ? { ...e, _removing: true } : e));
        setEtapaToRemove(null);
    };

    const cancelRemoveEtapa = () => {
        setEtapaToRemove(null);
    };

    const undoRemoveEtapa = (index) => {
        setEtapas(etapas.map((e, i) => i === index ? { ...e, _removing: false } : e));
    };

    const openEtapaEditor = (index) => {
        setEtapaDraft({ ...etapas[index], orden: etapas[index].orden || index + 1 });
        setEditingEtapaIndex(index);
    };

    const closeEtapaEditor = () => {
        setEditingEtapaIndex(null);
        setEtapaDraft(null);
    };

    const updateEtapaDraft = (field, value) => {
        setEtapaDraft(prev => ({ ...prev, [field]: value }));
    };

    const saveEtapaEditor = () => {
        if (!etapaDraft || !etapaDraft.nombre.trim()) return;
        const updated = [...etapas];
        updated[editingEtapaIndex] = { ...updated[editingEtapaIndex], ...etapaDraft };
        setEtapas(updated);
        closeEtapaEditor();
    };

    const handleNext = () => {
        setErrorAlert({ show: false, title: '', message: '', suggestion: '' });
        if (!validateCurrentStep()) return;
        setStep(step + 1);
    };

    const handleBack = () => {
        setErrors({});
        setErrorAlert({ show: false, title: '', message: '', suggestion: '' });
        setStep(step - 1);
    };

    const handleFinish = () => {
        setErrorAlert({ show: false, title: '', message: '', suggestion: '' });
        if (!applyValidation(validateStep3(formData, etapas))) return;
        setShowConfirmModal(true);
    };

    const handleSubmit = async () => {
        setShowConfirmModal(false);
        const payload = buildPayload(formData, etapas);
        await submitTournament({ isEdit, pageParams, payload, onNavigate, setErrorAlert });
    };

    if (loading) return h(Loading);

    const pageTitle = getPageTitle(readOnly, isEdit);
    const pageSubtitle = getPageSubtitle(readOnly, isEdit, step);
    const isWizard = !readOnly;
    const stepCtx = {
        step,
        readOnly,
        formData,
        errors,
        setFormData,
        setErrors,
        isMd,
        disciplines,
        etapas,
        requestRemoveEtapa,
        undoRemoveEtapa,
        addEtapa,
        usarEtapasJebo,
        openEtapaEditor,
        editingEtapaIndex,
        etapaToRemove,
        confirmRemoveEtapa,
        cancelRemoveEtapa
    };

    return h('div', { style: styles.appContainer },

        h('div', { style: styles.tournamentContainer },

            h('div', { style: styles.tournamentHeader },
                h('h2', { style: styles.tournamentTitle }, pageTitle),
                h('p', { style: styles.tournamentSubtitle }, pageSubtitle)
            ),

            renderStepper(readOnly, step, isMd),

            h('div', { style: { ...styles.tournamentLayout, gridTemplateColumns: lessThan(1280) ? '1fr' : 'minmax(0, 1fr) 360px' } },

                h('form', {
                    onSubmit: (e) => e.preventDefault(),
                    style: { ...styles.tournamentForm, ...(isMd ? { padding: 0, border: 'none', backgroundColor: 'transparent' } : {}) }
                },

                    h(ErrorAlert, {
                        show: errorAlert.show,
                        onClose: () => setErrorAlert({ show: false, title: '', message: '', suggestion: '' }),
                        title: errorAlert.title,
                        message: errorAlert.message,
                        suggestion: errorAlert.suggestion
                    }),

                    renderStepContent(stepCtx),

                    isWizard && renderWizardActions({ step, handleBack, handleNext, handleFinish, onNavigate }),

                    readOnly && h('div', { style: { marginTop: '24px', display: 'flex', gap: '12px' } },
                        h('button', {
                            type: 'button',
                            style: styles.buttonOutline,
                            onClick: () => onNavigate('tournaments')
                        }, h(IconArrowLeft), ' Volver')
                    )
                ),

                renderSidebar(stepCtx)
            )
        ),

        renderConfirmModal({
            isEdit,
            showConfirmModal,
            setShowConfirmModal,
            handleSubmit,
            formData,
            disciplines,
            etapas
        }),

        renderEtapaEditorModal({
            editingEtapaIndex,
            etapaDraft,
            updateEtapaDraft,
            saveEtapaEditor,
            closeEtapaEditor,
            isMd,
            formData,
            etapas
        }),

        renderEtapaRemoveModal({
            etapaToRemove,
            confirmRemoveEtapa,
            cancelRemoveEtapa,
            etapas
        })
    );
}

function getEstado(formData) {
    const hoy = hoyArgentina();
    if (!formData.fecha_inicio || hoy < formData.fecha_inicio) return 'Programado';
    if (formData.fecha_fin && hoy > formData.fecha_fin) return 'Finalizado';
    return 'En Progreso';
}

function getEtapaEstado(etapa) {
    const hoy = hoyArgentina();
    if (!etapa.fecha_inicio || hoy < etapa.fecha_inicio) return 'Pendiente';
    if (etapa.fecha_fin && hoy > etapa.fecha_fin) return 'Finalizada';
    return 'En Progreso';
}

function getStatusBadge(status) {
    return STATUS_BADGES[status] || DEFAULT_STATUS_BADGE;
}

function getInscripcionStatus(inicio, fin) {
    const now = new Date();
    const inicioDate = new Date(fechaHoraArgentinaAInstante(inicio) ?? NaN);
    const finDate = new Date(fechaHoraArgentinaAInstante(fin) ?? NaN);
    if (now < inicioDate) {
        return { backgroundColor: '#fef3c7', color: '#92400e', label: 'Inscripciones pendientes' };
    }
    if (now > finDate) {
        return { backgroundColor: '#dbeafe', color: '#1e40af', label: 'Inscripciones cerradas' };
    }
    return { backgroundColor: '#d1fae5', color: '#065f46', label: 'Inscripciones abiertas' };
}

function getDisciplineName(disciplines, formData) {
    const d = disciplines.find(d => String(d.id_disciplina) === String(formData.id_disciplina));
    return d ? d.nombre : '—';
}

function formatDatetime(dateStr) {
    if (!dateStr) return '—';
    return `${formatearFecha(dateStr)}, ${dateStr.slice(11, 16)}`;
}

function toDay(v) {
    return v ? String(v).split('T')[0] : '';
}

function getExtraRanges(formData, etapas, excludeStart, excludeEnd) {
    const ranges = [];

    const torneoRange = { start: formData.fecha_inicio, end: formData.fecha_fin };
    const inscRange = { start: toDay(formData.fecha_inscripcion_inicio), end: toDay(formData.fecha_inscripcion_fin) };
    const etapaRanges = etapas.map((et, idx) => ({
        start: et.fecha_inicio,
        end: et.fecha_fin,
        colorIndex: (idx + 2) % EXTRA_RANGE_COLORS.length
    }));

    [torneoRange, inscRange, ...etapaRanges].forEach((r) => {
        if (excludeStart && r.start === excludeStart && r.end === excludeEnd) return;
        if (!r.start && !r.end) return;
        let colorIndex = r.colorIndex;
        if (colorIndex === undefined) colorIndex = r === torneoRange ? 0 : 1;
        const colors = EXTRA_RANGE_COLORS[colorIndex];
        ranges.push({ ...r, bg: colors.bg, fg: colors.fg });
    });
    return ranges;
}

function validateStep1(formData) {
    const newErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre del torneo es obligatorio';
    if (!formData.edicion.trim()) newErrors.edicion = 'La edición/año es obligatoria';
    if (!formData.id_disciplina) newErrors.id_disciplina = 'Seleccioná una disciplina';
    if (!formData.fecha_inicio) newErrors.fecha_inicio = 'Seleccioná una fecha de inicio';
    if (formData.fecha_fin && formData.fecha_inicio && formData.fecha_fin < formData.fecha_inicio) {
        newErrors.fecha_fin = 'La fecha de fin debe ser posterior al inicio';
    }
    return newErrors;
}

function validateStep2(formData) {
    const newErrors = {};
    if (!formData.fecha_inscripcion_inicio) {
        newErrors.fecha_inscripcion_inicio = 'La fecha de inicio de inscripción es obligatoria';
    }
    if (!formData.fecha_inscripcion_fin) {
        newErrors.fecha_inscripcion_fin = 'La fecha de fin de inscripción es obligatoria';
    }
    if (formData.fecha_inscripcion_inicio && formData.fecha_inscripcion_fin &&
        formData.fecha_inscripcion_fin < formData.fecha_inscripcion_inicio) {
        newErrors.fecha_inscripcion_fin = 'La fecha de fin de inscripción debe ser posterior al inicio';
    }
    if (formData.fecha_inscripcion_fin && formData.fecha_inicio &&
        formData.fecha_inscripcion_fin > formData.fecha_inicio) {
        newErrors.fecha_inscripcion_fin = 'Las inscripciones deben cerrar antes del inicio del torneo';
    }
    return newErrors;
}

function getEtapaDateError(e, formData) {
    const errs = { inicio: null, fin: null };
    if (e.fecha_inicio && e.fecha_fin && e.fecha_fin < e.fecha_inicio) {
        errs.fin = `Etapa "${e.nombre}": la fecha de fin es anterior a la de inicio. Revisá el orden de las fechas.`;
    }
    if (formData.fecha_inicio && e.fecha_inicio && e.fecha_inicio < formData.fecha_inicio) {
        errs.inicio = `Etapa "${e.nombre}": la fecha de inicio (${formatearFecha(e.fecha_inicio)}) es anterior al inicio del torneo (${formatearFecha(formData.fecha_inicio)}). Debe estar dentro del período del torneo.`;
    }
    if (formData.fecha_fin && e.fecha_fin && e.fecha_fin > formData.fecha_fin) {
        errs.fin = `Etapa "${e.nombre}": la fecha de fin (${formatearFecha(e.fecha_fin)}) supera el fin del torneo (${formatearFecha(formData.fecha_fin)}). Debe estar dentro del período del torneo.`;
    }
    return errs;
}

function addEtapasDateErrors(newErrors, validEtapas, formData) {
    for (let i = 0; i < validEtapas.length; i++) {
        const errs = getEtapaDateError(validEtapas[i], formData);
        if (errs.inicio) newErrors[`etapa_fecha_${i}_inicio`] = errs.inicio;
        if (errs.fin) newErrors[`etapa_fecha_${i}_fin`] = errs.fin;
    }
}

function etapasOverlap(a, b) {
    if (!(a.fecha_inicio && a.fecha_fin && b.fecha_inicio && b.fecha_fin)) return false;
    return !(a.fecha_fin < b.fecha_inicio || b.fecha_fin < a.fecha_inicio);
}

function findEtapaOverlapError(validEtapas) {
    let overlapError = null;
    for (let i = 0; i < validEtapas.length; i++) {
        for (let j = i + 1; j < validEtapas.length; j++) {
            const a = validEtapas[i];
            const b = validEtapas[j];
            if (etapasOverlap(a, b)) {
                overlapError = `Etapas "${a.nombre}" y "${b.nombre}" tienen períodos superpuestos (del ${formatearFecha(a.fecha_inicio)} al ${formatearFecha(a.fecha_fin)} y del ${formatearFecha(b.fecha_inicio)} al ${formatearFecha(b.fecha_fin)}). Revisá las fechas de ambas etapas.`;
            }
        }
    }
    return overlapError;
}

function validateStep3(formData, etapas) {
    const newErrors = {};
    const validEtapas = etapas.filter(e => !e._removing && e.nombre.trim());
    if (validEtapas.length === 0) {
        newErrors.etapas = 'Debe haber al menos una etapa con nombre';
    }
    addEtapasDateErrors(newErrors, validEtapas, formData);
    const overlapError = findEtapaOverlapError(validEtapas);
    if (overlapError) {
        newErrors.etapas = overlapError;
    }
    return newErrors;
}

function computeStepErrors(step, formData, etapas) {
    if (step === 1) return validateStep1(formData);
    if (step === 2) return validateStep2(formData);
    if (step === 3) return validateStep3(formData, etapas);
    return {};
}

function mapTournamentToForm(data) {
    return {
        nombre: data.nombre || '',
        edicion: data.categoria || '',
        id_disciplina: String(data.id_disciplina || ''),
        fecha_inicio: data.fecha_inicio ? data.fecha_inicio.split('T')[0] : '',
        fecha_fin: data.fecha_fin ? data.fecha_fin.split('T')[0] : '',
        descripcion: data.descripcion || '',
        fecha_inscripcion_inicio: instanteAFechaHoraArgentina(data.fecha_inscripcion_inicio),
        fecha_inscripcion_fin: instanteAFechaHoraArgentina(data.fecha_inscripcion_fin)
    };
}

function mapStageToEtapa(s) {
    return {
        id_etapa: s.id_etapa,
        nombre: s.nombre || '',
        descripcion: s.descripcion || '',
        fecha_inicio: s.fecha_inicio ? s.fecha_inicio.split('T')[0] : '',
        fecha_fin: s.fecha_fin ? s.fecha_fin.split('T')[0] : '',
        orden: s.orden,
        estado: s.estado || '',
        tipo: s.tipo || null,
        es_final: s.es_final || false,
        ambito: s.ambito || REGLAS_POR_DEFECTO.ambito,
        origen_tipo: s.origen_tipo || REGLAS_POR_DEFECTO.origen_tipo,
        origen_ambito: s.origen_ambito || null,
        id_etapa_origen: s.id_etapa_origen || null,
        clasifican_por_instancia: s.clasifican_por_instancia ?? REGLAS_POR_DEFECTO.clasifican_por_instancia,
        mejores_adicionales: s.mejores_adicionales ?? REGLAS_POR_DEFECTO.mejores_adicionales,
        territorios_por_instancia: s.territorios_por_instancia ?? null,
        avanza_si_unico: s.avanza_si_unico !== false
    };
}

async function loadDisciplines(setDisciplines, setErrorAlert) {
    try {
        const discRes = await disciplineService.getAll({ limit: 100 });
        setDisciplines(discRes.data || []);
    } catch {
        setErrorAlert({ show: true, title: 'Error de carga', message: 'Error al cargar disciplinas', suggestion: '' });
    }
}

async function loadTournamentData(pageParams, { setFormData, setEtapas, setErrorAlert, setLoading }) {
    try {
        const response = await tournamentService.getById(pageParams.id);
        const data = response.data || response;
        setFormData(mapTournamentToForm(data));
        const stageRes = await stageService.getAll({ id_torneo: pageParams.id });
        const stagesData = Array.isArray(stageRes) ? stageRes : stageRes?.data || [];
        if (stagesData.length > 0) {
            setEtapas(stagesData.map(mapStageToEtapa));
        }
    } catch (err) {
        setErrorAlert({ show: true, title: 'Error de carga', message: err.message || 'Error al cargar torneo', suggestion: '' });
    } finally {
        setLoading(false);
    }
}

async function initForm({ isEdit, readOnly, pageParams, setDisciplines, setFormData, setEtapas, setErrorAlert, setLoading }) {
    await loadDisciplines(setDisciplines, setErrorAlert);
    if (isEdit || readOnly) {
        await loadTournamentData(pageParams, { setFormData, setEtapas, setErrorAlert, setLoading });
    }
}

function buildPayload(formData, etapas) {
    const validEtapas = etapas
        .filter(e => !e._removing && e.nombre.trim())
        .map((e, idx) => ({
            ...(e.id_etapa ? { id_etapa: e.id_etapa } : {}),
            nombre: e.nombre.trim(),
            descripcion: e.descripcion || null,
            orden: e.orden || idx + 1,
            fecha_inicio: e.fecha_inicio || null,
            fecha_fin: e.fecha_fin || null,
            estado: e.estado || getEtapaEstado(e),
            tipo: e.tipo || null,
            es_final: e.es_final || false,
            ambito: e.ambito || REGLAS_POR_DEFECTO.ambito,
            origen_tipo: e.origen_tipo || REGLAS_POR_DEFECTO.origen_tipo,
            origen_ambito: e.origen_ambito || null,
            id_etapa_origen: e.id_etapa_origen || null,
            clasifican_por_instancia: Number(e.clasifican_por_instancia) || 1,
            mejores_adicionales: Number(e.mejores_adicionales) || 0,
            territorios_por_instancia: Number(e.territorios_por_instancia) || null,
            avanza_si_unico: e.avanza_si_unico !== false
        }));
    return {
        nombre: formData.nombre,
        descripcion: formData.descripcion || null,
        categoria: formData.edicion,
        estado: getEstado(formData),
        fecha_inicio: formData.fecha_inicio,
        fecha_fin: formData.fecha_fin || null,
        id_disciplina: parseInt(formData.id_disciplina),
        fecha_inscripcion_inicio: fechaHoraArgentinaAInstante(formData.fecha_inscripcion_inicio),
        fecha_inscripcion_fin: fechaHoraArgentinaAInstante(formData.fecha_inscripcion_fin),
        etapas: validEtapas
    };
}

function getSaveSuggestion(msg) {
    return msg.includes('registros asociados') || msg.includes('partidos') || msg.includes('equipos')
        ? 'Eliminá primero los registros asociados antes de realizar esta operación.'
        : '';
}

async function submitTournament({ isEdit, pageParams, payload, onNavigate, setErrorAlert }) {
    try {
        if (isEdit) {
            await tournamentService.update(pageParams.id, payload);
        } else {
            await tournamentService.create(payload);
        }
        onNavigate('tournaments');
    } catch (err) {
        const msg = err.message || 'Error al guardar';
        setErrorAlert({ show: true, title: 'Error al guardar', message: msg, suggestion: getSaveSuggestion(msg) });
    }
}

function errorBorder(error) {
    return error ? { border: '1px solid #ef4444' } : {};
}

function renderFieldError(error, fontSize = '12px', marginTop = '4px') {
    if (!error) return error;
    return h('span', { style: { color: '#ef4444', fontSize, marginTop, display: 'block' } }, error);
}

function updateFormField(setFormData, formData, field, value, errors, setErrors, errorKey) {
    setFormData({ ...formData, [field]: value });
    if (errors[errorKey]) {
        setErrors({ ...errors, [errorKey]: '' });
    }
}

function getPageTitle(readOnly, isEdit) {
    if (readOnly) return 'Detalle del Torneo';
    if (isEdit) return 'Editar torneo';
    return 'Crear torneo';
}

function getPageSubtitle(readOnly, isEdit, step) {
    if (readOnly) return 'Información completa del torneo';
    if (isEdit) return 'Modificá los datos del torneo';
    return `Paso ${step} de 3 — ${STEP_LABELS[step - 1]}`;
}

function renderStepperItem(label, idx, step, compacto) {
    const num = idx + 1;
    const isCompleted = step > num;
    const isCurrent = step === num;
    
    const circleBg = isCompleted ? '#22c55e' : isCurrent ? '#3b82f6' : '#e5e7eb';
    const circleColor = isCompleted || isCurrent ? '#ffffff' : '#9ca3af';
    const circleBorder = isCurrent ? '3px solid #dbeafe' : 'none';
    const circleShadow = isCurrent ? '0 0 0 3px rgba(59,130,246,0.2)' : 'none';
    const labelColor = isCompleted || isCurrent ? '#111827' : '#9ca3af';
    const lineBg = step > num ? '#22c55e' : '#e5e7eb';

    return h(React.Fragment, { key: idx },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
            h('div', {
                style: {
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '700',
                    flexShrink: 0,
                    transition: 'all 0.3s ease',
                    backgroundColor: circleBg,
                    color: circleColor,
                    border: circleBorder,
                    boxShadow: circleShadow
                }
            }, isCompleted ? h(IconCheck, { size: 16 }) : String(num)),
            (!compacto || isCurrent) && h('span', {
                style: {
                    fontSize: '13px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.3s ease',
                    color: labelColor
                }
            }, label)
        ),
        idx < STEP_LABELS.length - 1 && h('div', {
            style: {
                width: compacto ? '24px' : '60px',
                height: '2px',
                margin: compacto ? '0 4px' : '0 8px',
                transition: 'background-color 0.3s ease',
                flexShrink: 0,
                backgroundColor: lineBg
            }
        })
    );
}

function renderStepper(readOnly, step, compacto) {
    if (readOnly) return null;
    return h('div', { 
        style: { 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '24px 0 32px', 
            gap: 0 
        } 
    },
        STEP_LABELS.map((label, idx) => renderStepperItem(label, idx, step, compacto))
    );
}

function renderStep1(ctx) {
    const { formData, errors, setFormData, setErrors, readOnly, isMd, disciplines, etapas } = ctx;
    const columns = isMd ? '1fr' : '1fr 1fr';
    const estado = getEstado(formData);
    const estadoBadge = getStatusBadge(estado);

    return h('div', { style: { border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' } },
        h('h3', { style: styles.sectionTitle }, 'Información general'),

        h('div', { style: { ...styles.twoColumnGrid, gridTemplateColumns: columns } },

            h('div', null,
                h('label', { style: styles.formLabel }, 'Nombre del Torneo *'),
                h('input', {
                    type: 'text',
                    style: {
                        ...styles.formInput,
                        ...errorBorder(errors.nombre)
                    },
                    placeholder: 'Ej: Juegos Bonaerenses 2026',
                    value: formData.nombre,
                    disabled: readOnly,
                    onChange: e => updateFormField(setFormData, formData, 'nombre', e.target.value, errors, setErrors, 'nombre')
                }),
                renderFieldError(errors.nombre)
            ),

            h('div', null,
                h('label', { style: styles.formLabel }, 'Descripción (opcional)'),
                h('textarea', {
                    style: {
                        ...styles.formInput,
                        ...styles.formTextarea
                    },
                    value: formData.descripcion,
                    disabled: readOnly,
                    onChange: e => setFormData({ ...formData, descripcion: e.target.value })
                })
            )
        ),

        h('div', { style: { ...styles.twoColumnGridWithMargin, gridTemplateColumns: columns } },

            h('div', null,
                h('label', { style: styles.formLabel }, 'Edición / Año *'),
                h('input', {
                    type: 'text',
                    style: {
                        ...styles.formInput,
                        ...errorBorder(errors.edicion)
                    },
                    value: formData.edicion,
                    disabled: readOnly,
                    onChange: e => updateFormField(setFormData, formData, 'edicion', e.target.value, errors, setErrors, 'edicion')
                }),
                renderFieldError(errors.edicion)
            ),

            h('div', null,
                h('label', { style: styles.formLabel }, 'Fecha Inicio *'),
                h(CalendarField, {
                    value: formData.fecha_inicio,
                    rangeStart: formData.fecha_inicio,
                    rangeEnd: formData.fecha_fin,
                    extraRanges: getExtraRanges(formData, etapas, formData.fecha_inicio, formData.fecha_fin),
                    disabled: readOnly,
                    onChange: v => updateFormField(setFormData, formData, 'fecha_inicio', v, errors, setErrors, 'fecha_inicio')
                }),
                renderFieldError(errors.fecha_inicio)
            )
        ),

        h('div', { style: { ...styles.twoColumnGridWithMargin, gridTemplateColumns: columns } },

            h('div', null,
                h('label', { style: styles.formLabel }, 'Fecha Fin'),
                h(CalendarField, {
                    value: formData.fecha_fin,
                    rangeStart: formData.fecha_inicio,
                    rangeEnd: formData.fecha_fin,
                    extraRanges: getExtraRanges(formData, etapas, formData.fecha_inicio, formData.fecha_fin),
                    disabled: readOnly,
                    onChange: v => updateFormField(setFormData, formData, 'fecha_fin', v, errors, setErrors, 'fecha_fin')
                }),
                renderFieldError(errors.fecha_fin)
            ),

            h('div', null,
                h('label', { style: styles.formLabel }, 'Estado'),
                h('div', {
                    style: {
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontWeight: 600,
                        backgroundColor: estadoBadge.backgroundColor,
                        color: estadoBadge.color,
                        textAlign: 'center'
                    }
                }, estado)
            )
        ),

        h('div', { style: { ...styles.twoColumnGridWithMargin, gridTemplateColumns: columns } },

            h('div', null,
                h('label', { style: styles.formLabel }, 'Disciplina *'),
                h('select', {
                    style: {
                        ...styles.formSelect,
                        ...errorBorder(errors.id_disciplina)
                    },
                    value: formData.id_disciplina,
                    disabled: readOnly,
                    onChange: e => updateFormField(setFormData, formData, 'id_disciplina', e.target.value, errors, setErrors, 'id_disciplina')
                },
                    h('option', { value: '' }, 'Seleccionar disciplina...'),
                    disciplines.map(d =>
                        h('option', { key: d.id_disciplina, value: String(d.id_disciplina) }, d.nombre)
                    )
                ),
                renderFieldError(errors.id_disciplina)
            )
        ),

        h('div', { style: { marginTop: '16px', padding: '10px 12px', borderRadius: '6px', backgroundColor: '#e0f2fe', color: '#075985', fontSize: '13px', lineHeight: '1.5' } },
            'Importante: las fechas de inscripción de equipos deben ser anteriores al inicio del torneo. Se completan en el paso siguiente (Fechas Inscripción).'
        )
    );
}

function renderStep2(ctx) {
    const { formData, errors, setFormData, setErrors, readOnly, isMd, etapas } = ctx;
    const columns = isMd ? '1fr' : '1fr 1fr';
    const inscripcionStatus = getInscripcionStatus(formData.fecha_inscripcion_inicio, formData.fecha_inscripcion_fin);

    return h('div', null,

        h('h3', { style: styles.sectionTitle }, 'Fechas Inscripción de Equipos'),

        h('p', { style: { color: '#6b7280', fontSize: '13px', marginBottom: '12px' } },
            'Definí el período durante el cual los profesores podrán inscribir sus equipos al torneo. Todos los campos son obligatorios.'
        ),

        h('div', { style: { marginBottom: '16px', padding: '10px 12px', borderRadius: '6px', backgroundColor: '#e0f2fe', color: '#075985', fontSize: '13px', lineHeight: '1.5' } },
            'Estas fechas son ajenas al comienzo y fin del torneo: la inscripción puede abrirse y/o cerrarse antes del inicio del torneo, pero siempre debe cerrarse antes de que el torneo comience.'
        ),

        h('div', { style: { border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: '#f9fafb' } },

            h('div', { style: { display: 'grid', gridTemplateColumns: columns, gap: '16px' } },

                h('div', null,
                    h('label', { style: { ...styles.formLabel, fontSize: '12px' } }, 'Fecha y Hora Inicio Inscripción *'),
                    h(CalendarField, {
                        withTime: true,
                        value: formData.fecha_inscripcion_inicio,
                        rangeStart: toDay(formData.fecha_inscripcion_inicio),
                        rangeEnd: toDay(formData.fecha_inscripcion_inicio),
                        extraRanges: getExtraRanges(formData, etapas, toDay(formData.fecha_inscripcion_inicio), toDay(formData.fecha_inscripcion_fin)),
                        disabled: readOnly,
                        onChange: (v) => updateFormField(setFormData, formData, 'fecha_inscripcion_inicio', v, errors, setErrors, 'fecha_inscripcion_inicio')
                    }),
                    renderFieldError(errors.fecha_inscripcion_inicio, '11px', '2px')
                ),

                h('div', null,
                    h('label', { style: { ...styles.formLabel, fontSize: '12px' } }, 'Fecha y Hora Fin Inscripción *'),
                    h(CalendarField, {
                        withTime: true,
                        value: formData.fecha_inscripcion_fin,
                        rangeStart: toDay(formData.fecha_inscripcion_inicio),
                        rangeEnd: toDay(formData.fecha_inscripcion_fin),
                        extraRanges: getExtraRanges(formData, etapas, toDay(formData.fecha_inscripcion_inicio), toDay(formData.fecha_inscripcion_fin)),
                        disabled: readOnly,
                        onChange: (v) => updateFormField(setFormData, formData, 'fecha_inscripcion_fin', v, errors, setErrors, 'fecha_inscripcion_fin')
                    }),
                    renderFieldError(errors.fecha_inscripcion_fin, '11px', '2px')
                )
            ),

            formData.fecha_inscripcion_inicio && formData.fecha_inscripcion_fin && h('div', {
                style: {
                    marginTop: '12px',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: inscripcionStatus.backgroundColor,
                    color: inscripcionStatus.color,
                    textAlign: 'center'
                }
            }, inscripcionStatus.label)
        )
    );
}

function getEtapaRango(etapa) {
    if (!etapa.fecha_inicio && !etapa.fecha_fin) return 'Fechas sin definir';
    const desde = etapa.fecha_inicio ? formatearFecha(etapa.fecha_inicio) : '...';
    const hasta = etapa.fecha_fin ? formatearFecha(etapa.fecha_fin) : '...';
    return `${desde} — ${hasta}`;
}

function getEtapaCardStyle(etapa) {
    return {
        border: etapa._removing ? '2px solid #ef4444' : '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
        backgroundColor: etapa._removing ? '#fef2f2' : '#f9fafb'
    };
}

function renderEtapaAcciones(etapa, index, ctx) {
    const { readOnly, etapas, requestRemoveEtapa, undoRemoveEtapa, openEtapaEditor } = ctx;
    if (readOnly) return null;

    if (etapa._removing) {
        return h('button', {
            type: 'button',
            style: { ...styles.buttonOutline, padding: '4px 10px', fontSize: '12px', color: '#b91c1c', borderColor: '#fca5a5' },
            onClick: () => undoRemoveEtapa(index)
        }, 'Cancelar eliminación');
    }

    return [
        h('button', {
            key: 'editar',
            type: 'button',
            style: { ...styles.buttonInfo, padding: '4px 10px', fontSize: '12px' },
            onClick: () => openEtapaEditor(index)
        }, h(IconEdit), ' Editar'),
        etapas.length > 1 && h('button', {
            key: 'eliminar',
            type: 'button',
            style: { ...styles.buttonDanger, padding: '4px 8px', fontSize: '12px' },
            onClick: () => requestRemoveEtapa(index)
        }, h(IconTrash), ' Eliminar')
    ];
}

function renderEtapaAviso(etapa) {
    if (etapa._removing) {
        return h('p', { style: { fontSize: '13px', color: '#b91c1c', fontWeight: 500 } },
            'Esta etapa quedó marcada como cancelada y se eliminará recién al guardar los cambios del torneo.');
    }
    if (!etapa.descripcion) return null;
    return h('p', { style: { fontSize: '13px', color: '#6b7280' } }, etapa.descripcion);
}

function renderEtapaCard(etapa, index, ctx) {
    const estadoTexto = etapa.estado || getEtapaEstado(etapa);
    const etapaBadge = getStatusBadge(estadoTexto);
    const rango = getEtapaRango(etapa);

    return h('div', { key: index, style: getEtapaCardStyle(etapa) },

        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' } },
            h('span', { style: { fontWeight: 600, fontSize: '14px', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' } },
                etapa.nombre || `Etapa ${index + 1}`,
                etapa.es_final && h('span', {
                    style: {
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        backgroundColor: '#fef3c7',
                        color: '#92400e'
                    }
                }, 'Final'),
                etapa._removing && h('span', {
                    style: {
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        backgroundColor: '#fee2e2',
                        color: '#b91c1c'
                    }
                }, 'Cancelado')
            ),
            h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                renderEtapaAcciones(etapa, index, ctx)
            )
        ),

        h('div', { style: { fontSize: '12px', color: '#6b7280', marginBottom: '8px' } },
            `${ETIQUETAS_AMBITO[etapa.ambito] || 'Personalizado'} · ${ETIQUETAS_MODALIDAD[etapa.tipo] || 'Según el deporte'} · Vienen de: ${describirOrigen(etapa)} · Clasifican: ${etapa.clasifican_por_instancia ?? 1}`
        ),

        h('div', { style: { display: 'grid', gap: '8px', fontSize: '13px' } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' } },
                h('span', { style: { color: etapa._removing ? '#b91c1c' : '#4b5563' } }, rango),
                h('span', {
                    style: {
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: etapaBadge.backgroundColor,
                        color: etapaBadge.color,
                        textAlign: 'center',
                        whiteSpace: 'nowrap'
                    }
                }, estadoTexto)
            ),
            etapa.tipo && h('div', null,
                h('span', { style: { color: '#6b7280' } }, 'Tipo: '),
                h('span', { style: { fontWeight: 500 } }, etapa.tipo)
            ),
            renderEtapaAviso(etapa)
        )
    );
}

function renderEtapaRemoveModal(ctx) {
    const { etapaToRemove, confirmRemoveEtapa, cancelRemoveEtapa, etapas } = ctx;
    if (etapaToRemove === null) return null;

    const nombre = etapas[etapaToRemove]?.nombre || `Etapa ${etapaToRemove + 1}`;

    return h(Modal, {
        isOpen: true,
        onClose: cancelRemoveEtapa,
        onConfirm: confirmRemoveEtapa,
        title: 'Eliminar etapa',
        confirmText: 'Eliminar',
        confirmStyle: 'danger',
        warning: true,
        cancelText: 'Cancelar',
        message: h('div', null,
            h('p', { style: { marginBottom: '8px' } }, `¿Seguro que querés eliminar la etapa "${nombre}"?`),
            h('p', { style: { color: '#6b7280', fontSize: '13px' } },
                'La etapa no se elimina de inmediato: quedará marcada como Cancelada en rojo. Podés revertirlo con "Cancelar eliminación" antes de guardar. Se elimina definitivamente al guardar los cambios del torneo.'
            )
        )
    });
}

function renderEtapaEditorModal(ctx) {
    const { editingEtapaIndex, etapaDraft, updateEtapaDraft, saveEtapaEditor, closeEtapaEditor, isMd, formData, etapas } = ctx;
    if (editingEtapaIndex === null || !etapaDraft) return null;

    const columns = isMd ? '1fr' : '1fr 1fr';
    const fullRow = isMd ? 'auto' : '1 / -1';
    const labelStyle = { ...styles.formLabel, fontSize: '12px' };

    return h(Modal, {
        isOpen: true,
        onClose: closeEtapaEditor,
        onConfirm: saveEtapaEditor,
        title: `Editar etapa ${editingEtapaIndex + 1}`,
        confirmText: 'Guardar',
        cancelText: 'Cancelar',
        confirmStyle: 'primary',
        message: h('div', { style: { display: 'grid', gridTemplateColumns: columns, gap: '12px', maxHeight: '65vh', overflowY: 'auto', paddingRight: '4px' } },

            h('div', { style: { gridColumn: fullRow } },
                h('label', { style: labelStyle }, 'Nombre *'),
                h('input', {
                    type: 'text',
                    style: styles.formInput,
                    placeholder: 'Ej: Local, Distrital, Regional...',
                    value: etapaDraft.nombre,
                    onChange: e => updateEtapaDraft('nombre', e.target.value)
                })
            ),

            h('div', null,
                h('label', { style: labelStyle }, 'Orden'),
                h('input', {
                    type: 'number',
                    min: 1,
                    style: styles.formInput,
                    value: etapaDraft.orden,
                    onChange: e => updateEtapaDraft('orden', e.target.value)
                })
            ),

            h('div', null,
                h('label', { style: labelStyle }, 'Modalidad'),
                h('select', {
                    style: styles.formSelect,
                    value: etapaDraft.tipo || '',
                    onChange: e => updateEtapaDraft('tipo', e.target.value || null)
                },
                    h('option', { value: '' }, 'Según el deporte'),
                    h('option', { value: 'LIGA' }, 'Liga (todos contra todos)'),
                    h('option', { value: 'EVALUACION' }, 'Evaluación por jurado'),
                    h('option', { value: 'ELIMINACION', disabled: true }, 'Eliminación directa (próximamente)'),
                    h('option', { value: 'GRUPOS', disabled: true }, 'Fase de grupos (próximamente)')
                )
            ),

            h('div', null,
                h('label', { style: labelStyle }, 'Ámbito'),
                h('select', {
                    style: styles.formSelect,
                    value: etapaDraft.ambito || REGLAS_POR_DEFECTO.ambito,
                    onChange: e => updateEtapaDraft('ambito', e.target.value)
                }, Object.entries(ETIQUETAS_AMBITO).map(([valor, etiqueta]) => h('option', { key: valor, value: valor }, etiqueta)))
            ),

            h('div', null,
                h('label', { style: labelStyle }, 'De dónde vienen los equipos'),
                h('select', {
                    style: styles.formSelect,
                    value: etapaDraft.origen_tipo || REGLAS_POR_DEFECTO.origen_tipo,
                    onChange: e => updateEtapaDraft('origen_tipo', e.target.value)
                },
                    h('option', { value: 'INSCRIPCION' }, 'Inscripción al torneo'),
                    h('option', { value: 'ETAPA' }, 'Clasificados de otra etapa'),
                    h('option', { value: 'MANUAL' }, 'Carga manual')
                )
            ),

            etapaDraft.origen_tipo === 'ETAPA' && h('div', null,
                h('label', { style: labelStyle }, 'Etapa de origen'),
                h('select', {
                    style: styles.formSelect,
                    value: etapaDraft.origen_ambito || '',
                    onChange: e => updateEtapaDraft('origen_ambito', e.target.value || null)
                },
                    h('option', { value: '' }, 'La etapa anterior'),
                    Object.entries(ETIQUETAS_AMBITO).map(([valor, etiqueta]) => h('option', { key: valor, value: valor }, etiqueta))
                )
            ),

            h('div', null,
                h('label', { style: labelStyle }, 'Clasifican por instancia'),
                h('input', {
                    type: 'number',
                    min: 1,
                    style: styles.formInput,
                    value: etapaDraft.clasifican_por_instancia ?? 1,
                    onChange: e => updateEtapaDraft('clasifican_por_instancia', e.target.value)
                })
            ),

            h('div', null,
                h('label', { style: labelStyle }, 'Mejores adicionales de la etapa'),
                h('input', {
                    type: 'number',
                    min: 0,
                    style: styles.formInput,
                    value: etapaDraft.mejores_adicionales ?? 0,
                    onChange: e => updateEtapaDraft('mejores_adicionales', e.target.value)
                })
            ),

            etapaDraft.ambito === 'INTERREGIONAL' && h('div', null,
                h('label', { style: labelStyle }, 'Regiones por zona'),
                h('input', {
                    type: 'number',
                    min: 1,
                    style: styles.formInput,
                    placeholder: 'Vacío: una sola zona',
                    value: etapaDraft.territorios_por_instancia ?? '',
                    onChange: e => updateEtapaDraft('territorios_por_instancia', e.target.value)
                })
            ),

            h('div', null,
                h('label', { style: labelStyle }, 'Si queda un solo equipo, avanza directo'),
                h('input', {
                    type: 'checkbox',
                    'aria-label': 'Si queda un solo equipo, avanza directo',
                    checked: etapaDraft.avanza_si_unico !== false,
                    onChange: e => updateEtapaDraft('avanza_si_unico', e.target.checked),
                    style: { marginTop: '8px' }
                })
            ),

            h('div', null,
                h('label', { style: labelStyle }, '¿Es final?'),
                h('input', {
                    type: 'checkbox',
                    checked: etapaDraft.es_final || false,
                    onChange: e => updateEtapaDraft('es_final', e.target.checked),
                    style: { marginTop: '8px' }
                })
            ),

            h('div', null,
                h('label', { style: labelStyle }, 'Estado'),
                h('select', {
                    style: styles.formSelect,
                    value: etapaDraft.estado || '',
                    onChange: e => updateEtapaDraft('estado', e.target.value)
                },
                    h('option', { value: '' }, 'Automático (según fechas)'),
                    h('option', { value: 'Pendiente' }, 'Pendiente'),
                    h('option', { value: 'En Progreso' }, 'En Progreso'),
                    h('option', { value: 'Finalizada' }, 'Finalizada'),
                    h('option', { value: 'Cancelada' }, 'Cancelada')
                )
            ),

            h('div', null,
                h('label', { style: labelStyle }, 'Fecha Inicio'),
                h(CalendarField, {
                    value: etapaDraft.fecha_inicio,
                    rangeStart: etapaDraft.fecha_inicio,
                    rangeEnd: etapaDraft.fecha_fin,
                    extraRanges: getExtraRanges(formData, etapas, etapaDraft.fecha_inicio, etapaDraft.fecha_fin),
                    onChange: v => updateEtapaDraft('fecha_inicio', v)
                })
            ),

            h('div', null,
                h('label', { style: labelStyle }, 'Fecha Fin'),
                h(CalendarField, {
                    value: etapaDraft.fecha_fin,
                    rangeStart: etapaDraft.fecha_inicio,
                    rangeEnd: etapaDraft.fecha_fin,
                    extraRanges: getExtraRanges(formData, etapas, etapaDraft.fecha_inicio, etapaDraft.fecha_fin),
                    onChange: v => updateEtapaDraft('fecha_fin', v)
                })
            ),

            h('div', { style: { gridColumn: fullRow } },
                h('label', { style: labelStyle }, 'Descripción'),
                h('input', {
                    type: 'text',
                    style: styles.formInput,
                    placeholder: 'Descripción opcional de la etapa',
                    value: etapaDraft.descripcion || '',
                    onChange: e => updateEtapaDraft('descripcion', e.target.value)
                })
            )
        )
    });
}

function renderStep3(ctx) {
    const { errors, readOnly, etapas } = ctx;

    return h('div', null,

        h('h3', { style: styles.sectionTitle }, 'Etapas del Torneo'),

        h('p', { style: { color: '#6b7280', fontSize: '13px', marginBottom: '16px' } },
            'Definí las fases o instancias del torneo. Cada etapa puede tener su propio período, tipo y estado.'
        ),

        errors.etapas && h('div', { style: { color: '#ef4444', padding: '8px 12px', marginBottom: '12px', backgroundColor: '#fee2e2', borderRadius: '6px', fontSize: '13px' } }, errors.etapas),

        etapas.map((etapa, index) => renderEtapaCard(etapa, index, ctx)),

        !readOnly && !etapas.some(e => e.id_etapa || e.nombre.trim()) && h('button', {
            type: 'button',
            style: { ...styles.buttonPrimary, marginTop: '8px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' },
            onClick: ctx.usarEtapasJebo
        }, h(IconPlus), ' Usar etapas JEBO'),

        !readOnly && h('button', {
            type: 'button',
            style: { ...styles.buttonOutline, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' },
            onClick: ctx.addEtapa
        }, h(IconPlus), ' Agregar etapa')
    );
}

const SIDEBAR_TIPS = {
    1: {
        title: 'Información general',
        intro: 'Completá los datos principales del torneo correctamente.',
        items: [
            'El nombre del torneo es obligatorio. Usá un nombre claro y representativo, por ejemplo: "Juegos Bonaerenses 2026".',
            'La edición / año es obligatoria. Ingresala con formato numérico de 4 dígitos, por ejemplo: 2026.',
            'La disciplina es obligatoria y se selecciona desde el listado.',
            'La fecha de inicio es obligatoria. La fecha de fin es opcional pero debe ser posterior al inicio.',
            'Las fechas de inscripción de equipos deben ser anteriores al inicio del torneo (se completan en el paso siguiente).',
            'La descripción es opcional y puede ayudar a contextualizar el torneo.'
        ]
    },
    2: {
        title: 'Fechas de inscripción',
        intro: 'Las fechas de inscripción son obligatorias e independientes del período del torneo.',
        items: [
            'Los campos de fecha y hora de inicio y fin de inscripción son obligatorios.',
            'Estas fechas son ajenas al comienzo y fin del torneo: la inscripción puede abrirse antes de que el torneo comience.',
            'La fecha de fin de inscripción debe ser posterior al inicio de la misma.',
            'Las inscripciones siempre deben cerrarse antes de la fecha de inicio del torneo.',
            'El estado de las inscripciones (abiertas, pendientes o cerradas) se calcula automáticamente según las fechas cargadas.'
        ]
    },
    3: {
        title: 'Etapas del torneo',
        intro: 'Las etapas deben respetar el rango de fechas general del torneo.',
        items: [
            'Debe existir al menos una etapa con nombre.',
            'Usá el botón "Editar" de cada etapa para modificar su nombre, orden, descripción, estado y fechas.',
            'Las etapas no pueden superponerse entre sí en fechas.',
            'Las fechas de cada etapa deben estar dentro del período del torneo.',
            'El estado puede fijarse manualmente o dejarse en "Automático" para que se calcule según las fechas.',
            'Al eliminar una etapa queda marcada como Cancelada (en rojo) y podés revertirlo con "Cancelar eliminación" antes de guardar. Se elimina definitivamente al guardar los cambios del torneo.'
        ]
    }
};

const SIDEBAR_GENERAL = {
    title: 'Guía general',
    intro: 'Antes de guardar el torneo, revisá que los datos sean coherentes.',
    items: [
        'El nombre, la edición y la disciplina son obligatorios.',
        'Las fechas de fin siempre deben ser posteriores a las de inicio.',
        'Las etapas deben tener nombre y no superponerse entre sí.',
        'Guardá los cambios una vez que el formulario esté completo.'
    ]
};

function renderSidebar(ctx) {
    const tips = ctx.readOnly ? SIDEBAR_GENERAL : (SIDEBAR_TIPS[ctx.step] || SIDEBAR_TIPS[1]);
    return h('div', { style: { alignSelf: 'start', position: ctx.isMd ? 'static' : 'sticky', top: '24px' } },
        h('div', { style: styles.summaryCard },
            h('div', { style: styles.regulationContainer },
                h(IconFileText, { size: 22 }),
                h('h3', { style: { ...styles.summaryTitle, margin: 0 } }, 'Recomendaciones')
            ),
            h('div', { style: styles.summaryContent },
                h('div', { style: styles.summaryImportantText }, tips.title),
                h('p', { style: { margin: '0 0 10px 0', color: '#6b7280', fontSize: '13px', lineHeight: '1.5' } }, tips.intro),
                h('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: '1.65', color: '#374151' } },
                    tips.items.map(item => h('li', { key: item, style: { marginBottom: '6px' } }, item))
                )
            )
        )
    );
}

function renderStepContent(ctx) {
    if (ctx.readOnly) {
        return h('div', null,
            renderStep1(ctx),
            h('div', { style: { marginTop: '24px' } }, renderStep2(ctx)),
            h('div', { style: { marginTop: '24px' } }, renderStep3(ctx))
        );
    }
    if (ctx.step === 1) return renderStep1(ctx);
    if (ctx.step === 2) return renderStep2(ctx);
    if (ctx.step === 3) return renderStep3(ctx);
    return null;
}

function renderWizardActions({ step, handleBack, handleNext, handleFinish, onNavigate }) {
    return h('div', { style: styles.wizardActions },
        h('div', null,
            step > 1 && h('button', {
                type: 'button',
                style: styles.buttonOutline,
                onClick: handleBack
            }, h(IconArrowLeft), ' Atrás')
        ),
        h('div', { style: styles.wizardActionsRight },
            h('button', {
                type: 'button',
                style: styles.buttonOutline,
                onClick: () => onNavigate('tournaments')
            }, 'Cancelar'),
            step < 3
                ? h('button', {
                    type: 'button',
                    style: { ...styles.buttonPrimary },
                    onClick: handleNext
                }, 'Siguiente →')
                : h('button', {
                    type: 'button',
                    style: { ...styles.buttonPrimary, backgroundColor: '#22c55e' },
                    onClick: handleFinish
                }, h(IconSave), ' Finalizar')
        )
    );
}

function renderConfirmModal({ isEdit, showConfirmModal, setShowConfirmModal, handleSubmit, formData, disciplines, etapas }) {
    const validEtapas = etapas.filter(e => !e._removing && e.nombre.trim());
    return h(Modal, {
        isOpen: showConfirmModal,
        onClose: () => setShowConfirmModal(false),
        onConfirm: handleSubmit,
        title: isEdit ? 'Confirmar cambios del torneo' : 'Confirmar creación del torneo',
        confirmText: isEdit ? 'Guardar cambios' : 'Crear Torneo',
        cancelText: 'Volver al formulario',
        confirmStyle: 'primary',
        message: h('div', null,
            h('p', { style: { color: '#6b7280', fontSize: '14px', marginBottom: '16px' } },
                isEdit
                    ? 'Revisá los datos antes de guardar los cambios del torneo. Esta acción modificará el torneo ya creado:'
                    : 'Revisá los datos antes de crear el torneo:'
            ),
            h('div', { style: styles.confirmSummary },
                h('div', { style: styles.confirmRow },
                    h('span', { style: styles.confirmLabel }, 'Nombre'),
                    h('span', { style: styles.confirmValue }, formData.nombre)
                ),
                h('div', { style: styles.confirmRow },
                    h('span', { style: styles.confirmLabel }, 'Edición'),
                    h('span', { style: styles.confirmValue }, formData.edicion)
                ),
                h('div', { style: styles.confirmRow },
                    h('span', { style: styles.confirmLabel }, 'Disciplina'),
                    h('span', { style: styles.confirmValue }, getDisciplineName(disciplines, formData))
                ),
                h('div', { style: styles.confirmRow },
                    h('span', { style: styles.confirmLabel }, 'Fecha Inicio'),
                    h('span', { style: styles.confirmValue }, formatearFecha(formData.fecha_inicio))
                ),
                h('div', { style: styles.confirmRow },
                    h('span', { style: styles.confirmLabel }, 'Fecha Fin'),
                    h('span', { style: styles.confirmValue }, formatearFecha(formData.fecha_fin))
                ),
                h('div', { style: styles.confirmRow },
                    h('span', { style: styles.confirmLabel }, 'Inscripción'),
                    h('span', { style: styles.confirmValue },
                        formData.fecha_inscripcion_inicio && formData.fecha_inscripcion_fin
                            ? `${formatDatetime(formData.fecha_inscripcion_inicio)} — ${formatDatetime(formData.fecha_inscripcion_fin)}`
                            : 'No definida'
                    )
                ),
                h('div', { style: { ...styles.confirmRow, borderBottom: 'none' } },
                    h('span', { style: styles.confirmLabel }, 'Etapas'),
                    h('span', { style: styles.confirmValue }, `${validEtapas.length} etapa(s)`)
                )
            )
        )
    });
}
