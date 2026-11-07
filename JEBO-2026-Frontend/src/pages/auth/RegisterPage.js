import React, { useState } from 'react';
import { styles } from '../../styles/theme/index.js';
import { IconLoader, IconCheck } from '../../components/icons/index.js';
import authService from '../../services/authService.js';
import { useUiScale } from '../../hooks/useResponsive.js';

const { createElement: h } = React;

export function RegisterPage({ onNavigate }) {

  const uiScale = useUiScale();
  const [step, setStep] = useState('form');

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    documento: '',
    password: '',
    confirmarpassword: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!/^\d{1,8}$/.test(formData.documento)) {
      alert("El documento debe contener solo números entre 1 y 8 dígitos");
      return;
    }

    if (formData.password.length < 8) {
      alert("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (formData.password !== formData.confirmarpassword) {
      alert("Las contraseñas no coinciden");
      return;
    }

    setStep('loading');
    try {
      await authService.register({
        nombre: formData.nombre,
        email: formData.email,

        documento: formData.documento,
        password: formData.password
      });
      setStep('success');
    } catch (err) {
      alert('Error al registrarse: ' + (err.message || 'Error desconocido'));
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

      h('div', { style: styles.successTitle }, '¡Cuenta creada!'),
      h('div', { style: styles.successText },
        'Ya podés iniciar sesión con tu correo y la contraseña que elegiste.'),
      h('button', {
        style: styles.successButton,
        onClick: () => onNavigate('login')
      }, 'Volver al inicio de sesión')
    );
  }

  return h('div', { style: styles.loginContainer },
    h('div', { style: styles.loginArea },
      h('div', { style: { ...styles.loginColumn, zoom: uiScale } },
        h('div', { style: styles.loginBox },

          h('div', { style: styles.loginLogo },
            h('div', { style: styles.loginLogoText }, 'Alta de usuario')
          ),

          h('form', { onSubmit: handleSubmit },
            h('div', { style: styles.formGroup },
              h('label', { style: styles.formLabel, htmlFor: 'nombre' }, 'Nombre:'),
              h('input', { type: 'text', id: 'nombre', name: 'nombre', placeholder: 'Nombre completo', value: formData.nombre, onChange: handleChange, style: styles.formInput, required: true })
            ),
            h('div', { style: styles.formGroup },
              h('label', { style: styles.formLabel, htmlFor: 'email' }, 'Correo Electrónico:'),
              h('input', { type: 'email', id: 'email', name: 'email', placeholder: 'tu@correo.com', value: formData.email, onChange: handleChange, style: styles.formInput, required: true })
            ),
            h('div', { style: styles.formGroup },
              h('label', { style: styles.formLabel, htmlFor: 'documento' }, 'Documento:'),
              h('input', {
                type: 'text', id: 'documento', name: 'documento', inputMode: 'numeric',
                pattern: '[0-9]*', maxLength: 8, placeholder: 'Solo números',
                value: formData.documento,

                onChange: (e) => setFormData(prev => ({ ...prev, documento: e.target.value.replace(/\D/g, '').slice(0, 8) })),
                style: styles.formInput, required: true
              })
            ),
            h('div', { style: styles.formGroup },
              h('label', { style: styles.formLabel, htmlFor: 'password' }, 'Contraseña:'),
              h('input', { type: 'password', id: 'password', name: 'password', placeholder: 'Mínimo 8 caracteres', value: formData.password, onChange: handleChange, style: styles.formInput, required: true, minLength: 8 })
            ),
            h('div', { style: styles.formGroup },
              h('label', { style: styles.formLabel, htmlFor: 'confirmarpassword' }, 'Confirmar contraseña:'),
              h('input', { type: 'password', id: 'confirmarpassword', name: 'confirmarpassword', placeholder: 'Repita la contraseña', value: formData.confirmarpassword, onChange: handleChange, style: styles.formInput, required: true, minLength: 8 })
            ),

            h('button', { type: 'submit', style: styles.loginButton }, 'Crear cuenta'),

            h('div', { style: { marginTop: '16px', textAlign: 'center' } },
              h('a', {
                href: '#',
                style: styles.loginLink,
                onClick: (e) => { e.preventDefault(); onNavigate('login'); }
              }, '← Volver al inicio de sesión')
            )
          )
        )
      )
    )
  );
}

export default RegisterPage;