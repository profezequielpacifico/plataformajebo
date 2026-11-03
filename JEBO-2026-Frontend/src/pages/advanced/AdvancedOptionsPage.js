import React from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { IconArrowLeft, IconShield, IconCalendar } from '../../components/icons/index.js';

const { createElement: h } = React;

export function AdvancedOptionsPage({ onNavigate }) {
    return h(Card, null,
        h(CardHeader, { title: 'Opciones Avanzadas' },
            h('button', {
                style: { ...styles.buttonOutline, display: 'flex', alignItems: 'center', gap: '6px' },
                onClick: () => onNavigate('dashboard')
            }, h(IconArrowLeft), 'Volver')
        ),
        h('div', { style: { padding: '24px' } },
            h('div', { style: styles.formGroup },
                h('label', { style: { ...styles.formLabel, marginBottom: '12px', display: 'block' } }, 'Auto Selección Partidos'),
                h('button', {
                    style: { ...styles.buttonPrimary, display: 'flex', alignItems: 'center', gap: '6px' },
                    onClick: () => onNavigate('auto-fixture')
                }, h(IconCalendar), ' Auto Seleccion Partidos')
            ),
            h('div', { style: styles.formGroup },
                h('label', { style: { ...styles.formLabel, marginBottom: '12px', display: 'block' } }, 'Bloqueos de Login'),
                h('button', {
                    style: { ...styles.buttonPrimary, display: 'flex', alignItems: 'center', gap: '6px' },
                    onClick: () => onNavigate('login-lockouts')
                }, h(IconShield), ' Desbloquear Bloqueos')
            )
        )
    );
}

export default AdvancedOptionsPage;
