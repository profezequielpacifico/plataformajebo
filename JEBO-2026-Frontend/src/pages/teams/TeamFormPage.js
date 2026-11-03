import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Loading } from '../../components/ui/Loading.js';
import { IconSave, IconArrowLeft } from '../../components/icons/index.js';
import teamService from '../../services/teamService.js';
import institutionService from '../../services/institutionService.js';
import disciplineService from '../../services/disciplineService.js';
import userService from '../../services/userService.js';
import districtService from '../../services/districtService.js';
import localityService from '../../services/localityService.js';
import { USER_ROLES } from '../../config/constants.js';
import { useAuth } from '../../providers/AuthProvider.js';

const { createElement: h } = React;

/**
 * Alta de equipo.
 *
 * Va separada de la consulta a proposito: la consulta es de solo lectura y esta
 * es la unica pagina que escribe. El campo de disciplina va segundo, despues del
 * nombre, porque es lo que define contra que compite el equipo.
 *
 * La disciplina se elige de las ya creadas: no hay alta de disciplina desde
 * aca. Si falta la que se necesita, se carga en "Deportes"/"Disciplinas" y se
 * vuelve.
 */
export function TeamFormPage({ onNavigate, pageParams }) {
    const teamId = pageParams?.id;
    const isEdit = !!teamId;
    const { user } = useAuth();
    const [institutions, setInstitutions] = useState([]);
    const [disciplines, setDisciplines] = useState([]);
    const [professors, setProfessors] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [localities, setLocalities] = useState([]);
    const [formData, setFormData] = useState({
        nombre: '',
        id_institucion: '',
        id_disciplina: '',
        colores: '',
        id_usuario: '',
        id_distrito: '',
        id_localidad: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [loadingTeam, setLoadingTeam] = useState(isEdit);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState('');

    const loadInitialData = async () => {
        try {
            // `?rol=Profesor` lo resuelve el servidor. Antes se traian TODOS los

            const [instRes, discRes, userRes, distRes, locRes] = await Promise.all([
                institutionService.getAll().catch(() => []),
                disciplineService.getAll().catch(() => []),
                userService.getAll({ rol: USER_ROLES.PROFESOR }).catch(() => []),
                districtService.getAll().catch(() => []),
                localityService.getAll().catch(() => [])
            ]);

            const aLista = (r) => (Array.isArray(r) ? r : (r?.data || r?.rows || []));

            setInstitutions(aLista(instRes));
            setDisciplines(aLista(discRes));
            setProfessors(aLista(userRes));
            setDistricts(aLista(distRes));
            setLocalities(aLista(locRes));
        } catch (err) {
            console.error('Error loading initial data:', err);
        }
    };

    const loadTeamData = async () => {
        try {
            setLoadingTeam(true);
            const res = await teamService.getById(teamId);
            const team = res.data || res;

            setFormData({
                nombre: team.nombre || '',
                id_institucion: String(team.id_institucion || ''),
                id_disciplina: String(team.id_disciplina || ''),
                colores: team.colores || '',
                id_usuario: String(team.id_usuario || ''),
                id_distrito: String(team.id_distrito || ''),
                id_localidad: String(team.id_localidad || '')
            });
        } catch {
            setError('Error al cargar datos del equipo');
        }
        setLoadingTeam(false);
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    // Autorellenar profesor cuando el usuario logueado es profesor y no estamos editando
    useEffect(() => {
        if (isEdit) return;
        if (!user) return;
        const userRole = user.rol || user.role;
        if (userRole === USER_ROLES.PROFESOR || userRole === 'Profesor') {
            const userId = String(user.id_usuario || user.id);
            if (userId) {
                setFormData(prev => ({
                    ...prev,
                    id_usuario: userId
                }));
            }
        }
    }, [user, isEdit]);

    useEffect(() => {
        if (!teamId || !institutions.length) return;
        loadTeamData();
    }, [teamId, institutions.length]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');
        const payload = {
            nombre: formData.nombre,
            id_institucion: formData.id_institucion,
            id_disciplina: formData.id_disciplina,
            id_usuario: formData.id_usuario,
            colores: formData.colores,
            id_localidad: formData.id_localidad || undefined
        };
        try {
            if (isEdit) {
                await teamService.update(teamId, payload);
            } else {
                await teamService.create(payload);
            }
            setShowSuccess(true);
        } catch (err) {
            setError('Error al guardar: ' + (err.message || 'Error desconocido'));
        }
        setIsSaving(false);
    };

    const volver = () => onNavigate('teams');

    if (loadingTeam) return h(Loading, { message: 'Cargando equipo...' });

    if (isSaving) return h(Loading, { message: 'Guardando equipo...' });

    if (showSuccess) {
        return h('div', { style: styles.successContainer },
            h('div', { style: styles.successTitle }, isEdit ? '¡Equipo actualizado!' : '¡Equipo guardado!'),
            h('div', { style: styles.successText }, isEdit ? 'El equipo ha sido actualizado exitosamente' : 'El equipo ha sido registrado exitosamente'),
            h('button', { style: styles.successButton, onClick: volver }, 'Volver')
        );
    }

    return h(Card, null,
        h(CardHeader, { title: isEdit ? 'Editar Equipo' : 'Alta de Equipo' },
            h('button', { style: { ...styles.buttonOutline, display: 'flex', alignItems: 'center', gap: '6px' }, onClick: volver }, h(IconArrowLeft), 'Volver')
        ),

        h('div', { style: { padding: '24px' } },
            error && h('div', {
                style: { color: '#ef4444', padding: '12px', marginBottom: '16px', backgroundColor: '#fee2e2', borderRadius: '6px' }
            }, error),

            disciplines.length === 0 && h('div', {
                style: { color: '#92400e', padding: '12px', marginBottom: '16px', backgroundColor: '#fef3c7', borderRadius: '6px' }
            }, 'No hay disciplinas cargadas. El equipo no se puede dar de alta sin una: primero creá la disciplina y volvé a esta pantalla.'),

            h('form', { onSubmit: handleSubmit },
            h('div', { style: { display: 'grid', gap: '20px' } },

                h('div', { style: styles.formGroup },
                    h('label', { htmlFor: 'team-nombre', style: styles.formLabel }, 'Nombre del Equipo *'),
                    h('input', {
                        id: 'team-nombre',
                        type: 'text',
                        value: formData.nombre,
                        onChange: (e) => setFormData({ ...formData, nombre: e.target.value }),
                        style: styles.formInput,
                        placeholder: 'Ej: Club Atlético Norte',
                        required: true
                    })
                ),

                h('div', { style: styles.formGroup },
                    h('label', { htmlFor: 'team-disciplina', style: styles.formLabel }, 'Disciplina *'),
                    h('select', {
                        id: 'team-disciplina',
                        value: formData.id_disciplina,
                        onChange: (e) => setFormData({ ...formData, id_disciplina: e.target.value }),
                        style: styles.formSelect,
                        required: true
                    },
                        h('option', { value: '' }, 'Seleccione disciplina'),
                        disciplines.map(d => h('option', {
                            key: d.id_disciplina || d.id,
                            value: String(d.id_disciplina || d.id)
                        }, d.nombre || d.name))
                    ),
                    h('small', { style: { color: '#6b7280', marginTop: '4px' } },
                        'Define contra que disciplina va a competir el equipo.')
                ),

                h('div', { style: styles.formGroup },
                    h('label', { htmlFor: 'team-institucion', style: styles.formLabel }, 'Institución *'),
                    h('select', {
                        id: 'team-institucion',
                        value: formData.id_institucion,
                        onChange: (e) => setFormData({ ...formData, id_institucion: e.target.value }),
                        style: styles.formSelect,
                        required: true
                    },
                        h('option', { value: '' }, 'Seleccione institución'),
                        institutions.map(inst => h('option', {
                            key: inst.id_institucion || inst.id,
                            value: String(inst.id_institucion || inst.id)
                        }, inst.nombre || inst.name))
                    )
                ),

                h('div', { style: styles.formGroup },
                    h('label', { htmlFor: 'team-profesor', style: styles.formLabel }, 'Profesor del equipo *'),
                    h('select', {
                        id: 'team-profesor',
                        value: formData.id_usuario,
                        onChange: (e) => setFormData({ ...formData, id_usuario: e.target.value }),
                        style: styles.formSelect,
                        required: true,
                        disabled: !isEdit && user && (user.rol === USER_ROLES.PROFESOR || user.rol === 'Profesor' || user.role === USER_ROLES.PROFESOR || user.role === 'Profesor')
                    },
                        h('option', { value: '' }, 'Seleccione profesor'),
                        professors.map(p => h('option', {
                            key: p.id_usuario || p.id,
                            value: String(p.id_usuario || p.id)
                        }, p.nombre || p.name))
                    )
                ),

                h('div', { style: styles.formGroup },
                    h('label', { htmlFor: 'team-distrito', style: styles.formLabel }, 'Distrito (filtro)'),
                    h('select', {
                        id: 'team-distrito',
                        value: formData.id_distrito,
                        onChange: (e) => setFormData({ ...formData, id_distrito: e.target.value, id_localidad: '' }),
                        style: styles.formSelect
                    },
                        h('option', { value: '' }, 'Todos los distritos'),
                        districts.map(di => h('option', {
                            key: di.id_distrito || di.id,
                            value: String(di.id_distrito || di.id)
                        }, di.nombre || di.name))
                    )
                ),

                h('div', { style: styles.formGroup },
                    h('label', { htmlFor: 'team-localidad', style: styles.formLabel }, 'Localidad'),
                    h('select', {
                        id: 'team-localidad',
                        value: formData.id_localidad,
                        onChange: (e) => setFormData({ ...formData, id_localidad: e.target.value }),
                        style: styles.formSelect
                    },
                        h('option', { value: '' }, 'Seleccione localidad'),
                        localities
                            .filter(l => !formData.id_distrito || String(l.id_distrito) === String(formData.id_distrito))
                            .map(l => h('option', {
                                key: l.id_localidad || l.id,
                                value: String(l.id_localidad || l.id)
                            }, l.nombre || l.name))
                    )
                ),

                h('div', { style: styles.formGroup },
                    h('label', { htmlFor: 'team-colores', style: styles.formLabel }, 'Colores'),
                    h('input', {
                        id: 'team-colores',
                        type: 'text',
                        value: formData.colores,
                        onChange: (e) => setFormData({ ...formData, colores: e.target.value }),
                        style: styles.formInput,
                        placeholder: 'Ej: Azul y Blanco'
                    })
                )
            ),
            h('div', { style: { marginTop: '24px', display: 'flex', gap: '12px' } },
                h('button', { type: 'submit', style: styles.buttonPrimary }, h(IconSave), isEdit ? 'Actualizar Equipo' : 'Guardar Equipo'),
                h('button', { type: 'button', style: styles.buttonOutline, onClick: volver }, 'Cancelar')
            )
        )
        )
    );
}

export default TeamFormPage;
