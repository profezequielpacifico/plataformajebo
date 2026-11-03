import React from 'react';
import { styles } from '../../styles/theme/index.js';

const { createElement: h } = React;

export function Badge({ children, variant = 'green' }) {
    const variantStyles = {
        green: styles.badgeGreen,
        yellow: styles.badgeYellow,
        red: styles.badgeRed,
        blue: styles.badgeBlue,
        orange: styles.badgeOrange
    };

    return h('span', { style: { ...styles.badge, ...variantStyles[variant] } }, children);
}

export function getBadgeStyleByEstado(estado) {
    const estadoMap = {
        'Activo': 'green',
        'En curso': 'green',
        'Finalizado': 'blue',
        'Pendiente': 'yellow',
        'Inactivo': 'red',
        'Cancelado': 'red',
        'Programado': 'green',
        'En juego': 'blue'
    };
    return estadoMap[estado] || 'green';
}
