import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import { authService } from '../../services/authService.js';
import { useResponsive } from '../../hooks/useResponsive.js';

const { createElement: h } = React;

const developers = [
    { name: 'Gonzalez, Maitena', role: 'Directora del proyecto' },
    { name: 'Liparelli, Ramiro', role: 'Encargado de QA' },
    { name: 'Olivares, Catalina', role: 'Encargada del Frontend' },
    { name: 'Soria, Gaspar', role: 'Encargado de documentación' },
    { name: 'Lujan, Ulises', role: 'Director técnico y encargado del backend' }
];

function formatTiempo(segundos) {
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function LoginPage({ onLogin, onNavigate }) {
    const { lessThan } = useResponsive();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [cuentaAtras, setCuentaAtras] = useState(0);
    const [permanente, setPermanente] = useState(false);
    const [mensajeBloqueo, setMensajeBloqueo] = useState('');

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await authService.getLoginStatus();
                const data = res && res.data ? res.data : res;
                if (data && data.bloqueado && active) {
                    setPermanente(!!(data.bloqueoPermanente || data.permanente));
                    setMensajeBloqueo(data.mensaje || 'Acceso bloqueado');
                    setCuentaAtras(data.retryAfterSeconds || 0);
                }
            } catch { /* una respuesta inesperada no debe romper el login */ }
        })();
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (cuentaAtras <= 0 || permanente) return;
        const t = setInterval(() => {
            setCuentaAtras((s) => (s > 0 ? s - 1 : 0));
        }, 1000);
        return () => clearInterval(t);
    }, [cuentaAtras, permanente]);

    const bloqueado = permanente || cuentaAtras > 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await authService.login({ email, password });
            const user = response.data?.user || response.user;
            if (user && onLogin) {
                onLogin(user);
            }
        } catch (err) {
            const msg = err.message || 'Error al iniciar sesión';
            if (err.bloqueoPermanente) {
                setPermanente(true);
                setMensajeBloqueo(msg);
                setCuentaAtras(0);
            } else if (Number.isFinite(err.retryAfterSeconds)) {
                setMensajeBloqueo(msg);
                setCuentaAtras(err.retryAfterSeconds);
                setError('');
            } else if (msg.includes('inactivo')) {
                setError('Usuario inactivo. Contacta al administrador.');
            } else if (msg.includes('contraseña') || msg.includes('password')) {
                setError('Contraseña incorrecta.');
            } else if (msg.includes('usuario') || msg.includes('email') || msg.includes('Credenciales')) {
                setError('Credenciales inválidas.');
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const errorBoxStyle = {
        color: '#ef4444',
        fontSize: '14px',
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: '#fee2e2',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    };

    const bloqueoBoxStyle = {
        color: permanente ? '#b91c1c' : '#92400e',
        fontSize: '14px',
        marginBottom: '16px',
        padding: '16px',
        backgroundColor: permanente ? '#fee2e2' : '#fef3c7',
        borderRadius: '6px',
        textAlign: 'center'
    };

    // Debajo de este ancho no hay lugar al costado de la tarjeta.
    const ocultarMascota = lessThan(860);

    const countdownStyle = {
        marginTop: '10px',
        fontSize: '30px',
        fontWeight: '700',
        letterSpacing: '2px',
        fontVariantNumeric: 'tabular-nums'
    };

    return h('div', { style: styles.loginContainer },
        h('div', { style: styles.loginArea },
            h('div', { style: styles.loginColumn },
            !ocultarMascota && h('img', { src: '/login-assets/mascota.webp', alt: '', style: styles.loginMascot }),
            h('div', { style: styles.loginBox },
                h('div', { style: styles.loginLogo },
                    h('img', { src: '/login-assets/logo-jebo.webp', alt: 'JEBO', style: styles.loginLogoImage }),
                    h('div', { style: styles.loginSubtitle }, 'Sistema Administrativo 2026')
                ),

                bloqueado && h('div', { style: bloqueoBoxStyle },
                    h('div', { style: { fontWeight: '700' } }, permanente ? 'Acceso bloqueado' : 'Inicio de sesión temporalmente bloqueado'),
                    h('div', { style: { marginTop: '6px' } }, mensajeBloqueo),
                    !permanente && cuentaAtras > 0 && h('div', { style: countdownStyle }, formatTiempo(cuentaAtras))
                ),

                h('form', { onSubmit: handleSubmit },
                    h('div', { style: styles.formGroup },
                        h('label', { style: styles.formLabel }, 'Email'),
                        h('input', {
                            type: 'email',
                            value: email,
                            onChange: (e) => setEmail(e.target.value),
                            style: styles.formInput,
                            placeholder: 'usuario@abc.com o usuario@gmail.com',
                            required: true,
                            disabled: bloqueado
                        })
                    ),

                    h('div', { style: styles.formGroup },
                        h('label', { style: styles.formLabel }, 'Contraseña'),
                        h('input', {
                            type: 'password',
                            value: password,
                            onChange: (e) => setPassword(e.target.value),
                            style: styles.formInput,
                            placeholder: '••••••••',
                            required: true,
                            disabled: bloqueado
                        })
                    ),

                    error && h('div', { style: errorBoxStyle }, error),

                    h('button', {
                        type: 'submit',
                        style: {
                            ...styles.loginButton,
                            opacity: (loading || bloqueado) ? 0.7 : 1,
                            cursor: (loading || bloqueado) ? 'not-allowed' : 'pointer'
                        },
                        disabled: loading || bloqueado
                    }, loading ? 'Iniciando sesión...' : 'Iniciar Sesión'),

                    h('div', { style: styles.loginLinks },
                        h('a', {
                            href: '#',
                            style: styles.loginLink,
                            onClick: (e) => { e.preventDefault(); onNavigate('recover-password'); }
                        }, '¿Olvidaste tu contraseña?')
                    )
                )
            )
        )
    ),

        h('div', { style: styles.loginInfo },
                h('div', { style: styles.loginInfoLogo }, 'JEBO 2026'),
                h('div', { style: styles.loginInfoSubtitle }, 'Sistema Administrativo para Torneos Deportivos'),

                h('div', { style: styles.loginInfoSectionTitle }, '¿Qué es JEBO 2026?'),
                h('p', { style: styles.loginInfoText },
                    'JEBO 2026 es un sistema administrativo integral para la gestión de torneos deportivos. Permite administrar equipos, programar y registrar partidos, generar clasificaciones automáticas y gestionar las etapas e instancias de la competencia, todo desde una interfaz moderna y responsiva.'
                ),

                h('div', { style: styles.loginInfoSectionTitle }, '¿A quién está dirigido?'),
                h('p', { style: styles.loginInfoText },
                    'Está dirigido a organizadores, delegados, árbitros y personal administrativo responsable de planificar y controlar la competencia, así como a los usuarios con distintos roles de acceso (Administrador, Editor y Visualizador) que necesitan consultar la información del torneo de forma rápida y ordenada.'
                ),

                h('hr', { style: styles.loginInfoDivider }),

                h('div', { style: styles.loginInfoSectionTitle }, 'Equipo de Desarrollo'),
                h('ul', { style: styles.developerList },
                    developers.map((d) =>
                        h('li', { key: d.name, style: styles.developerItem },
                            h('span', { style: styles.developerName }, d.name),
                            h('span', { style: styles.developerRole }, d.role)
                        )
                    )
                )
            )
    );
}

export default LoginPage;