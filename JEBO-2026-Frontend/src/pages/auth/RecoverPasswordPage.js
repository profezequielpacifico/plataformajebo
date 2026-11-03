import React, { useState } from 'react';
import { styles } from '../../styles/theme/index.js';
import { IconLoader, IconCheck } from '../../components/icons/index.js';
import authService from '../../services/authService.js';

const { createElement: h } = React;

export function RecoverPasswordPage({ onNavigate }) {
    const [email, setEmail] = useState('');
    const [step, setStep] = useState('form');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStep('loading');
        try {
            await authService.recoverPassword(email);
            setStep('success');
        } catch (err) {
            alert('Error: ' + (err.message || 'Error desconocido'));
            setStep('form');
        }
    };

    if (step === 'loading') {
        return h('div', { style: styles.loadingContainer },
            h(IconLoader),
            h('div', { style: styles.loadingText }, 'Procesando solicitud...')
        );
    }

    if (step === 'success') {
        return h('div', { style: styles.successContainer },
            h(IconCheck),
            h('div', { style: styles.successTitle }, '¡Solicitud enviada!'),
            h('div', { style: styles.successText }, 'Revisa tu correo para restablecer tu contraseña'),
            h('button', {
                style: styles.successButton,
                onClick: () => onNavigate('login')
            }, 'Volver al inicio de sesión')
        );
    }

    return h('div', { style: styles.loginContainer },
        h('div', { style: styles.loginBox },
            h('div', { style: styles.loginLogo },
                h('div', { style: styles.loginLogoText }, 'Recuperar Contraseña')
            ),

            h('form', { onSubmit: handleSubmit },
                h('div', { style: styles.formGroup },
                    h('label', { style: styles.formLabel }, 'Correo Electrónico'),
                    h('input', {
                        type: 'email',
                        value: email,
                        onChange: (e) => setEmail(e.target.value),
                        style: styles.formInput,
                        placeholder: 'tu@correo.com',
                        required: true
                    })
                ),

                h('button', { type: 'submit', style: styles.loginButton }, 'Enviar solicitud'),

                h('div', { style: { marginTop: '16px', textAlign: 'center' } },
                    h('a', {
                        href: '#',
                        style: styles.loginLink,
                        onClick: (e) => { e.preventDefault(); onNavigate('login'); }
                    }, '← Volver al inicio de sesión')
                )
            )
        )
    );
}

export default RecoverPasswordPage;
