import React from 'react';
import { styles } from '../../styles/theme/index.js';

const { createElement: h } = React;

export function Modal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', confirmStyle = 'danger', warning = false }) {
    if (!isOpen) return null;

    const confirmButtonStyle = confirmStyle === 'danger' ? styles.buttonDanger : styles.buttonPrimary;

    return h('div', { style: styles.modalOverlay, onClick: onClose },
        h('div', { style: { ...styles.modal, ...(warning ? { border: '2px solid #ef4444' } : {}) }, onClick: (e) => e.stopPropagation() },
            h('h3', { style: { ...styles.modalTitle, ...(warning ? { color: '#b91c1c' } : {}) } }, title),
            h('div', { style: styles.modalText },
                typeof message === 'string' ? h('p', null, message) : message
            ),
            h('div', { style: styles.modalButtons },
                h('button', { style: styles.buttonOutline, onClick: onClose }, cancelText),
                h('button', { style: confirmButtonStyle, onClick: onConfirm }, confirmText)
            )
        )
    );
}

export function Notification({ message, type = 'success', onClose }) {
    const bgColor = type === 'success' ? '#22c55e' : '#ef4444';

    return h('div', {
        style: {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            backgroundColor: bgColor,
            color: 'white',
            borderRadius: '6px',
            zIndex: 1000
        },
        onClick: onClose
    }, message);
}
