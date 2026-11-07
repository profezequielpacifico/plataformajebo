import React from 'react';
import { styles } from '../../styles/theme/index.js';

const { createElement: h } = React;

export function Card({ children, style = {} }) {
    return h('div', { style: { ...styles.card, ...style } }, children);
}

export function CardHeader({ title, children }) {
    return h('div', { style: styles.cardHeader },
        h('h2', { style: styles.cardTitle }, title),
        children && h('div', { style: styles.cardHeaderActions }, children)
    );
}

export function CardTitle({ children }) {
    return h('h2', { style: styles.cardTitle }, children);
}
