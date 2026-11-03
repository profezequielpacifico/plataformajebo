import React from 'react';
import { styles } from '../../styles/theme/index.js';
import { useResponsive } from '../../hooks/useResponsive.js';

const { createElement: h } = React;

export function Table({ children, className = '' }) {
    const { isMd } = useResponsive();
    return h('div', { style: { overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' } },
        h('table', { style: { ...styles.table, ...(isMd ? { fontSize: '12px' } : {}) }, className }, children)
    );
}

export function TableHeader({ children }) {
    return h('thead', null,
        h('tr', { style: styles.tableHeader }, children)
    );
}

export function TableHeaderCell({ children, align = 'left', style = {}, className = '' }) {
    const { isMd } = useResponsive();
    return h('th', {
        style: {
            ...styles.tableHeaderCell,
            textAlign: align,
            ...style,
            ...(isMd ? { padding: '8px 10px', fontSize: '10px' } : {})
        },
        className
    }, children);
}

export function TableRow({ children, style = {}, className = '' }) {
    return h('tr', { style: { ...styles.tableRow, ...style }, className }, children);
}

export function TableCell({ children, align = 'left', style = {}, className = '' }) {
    const { isMd } = useResponsive();
    return h('td', {
        style: {
            ...styles.tableCell,
            textAlign: align,
            ...style,
            ...(isMd ? { padding: '8px 10px', fontSize: '12px' } : {})
        },
        className
    }, children);
}

export function TableActions({ children }) {
    const { isMd } = useResponsive();
    return h('div', {
        style: {
            display: 'flex',
            gap: isMd ? '2px' : '8px',
            alignItems: 'center',
            flexWrap: 'nowrap'
        }
    }, children);
}
