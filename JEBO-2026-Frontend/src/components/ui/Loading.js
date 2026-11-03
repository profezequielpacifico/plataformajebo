import React from 'react';
import { styles } from '../../styles/theme/index.js';
import { IconLoader, IconCheck } from '../icons/index.js';

const { createElement: h } = React;

export function Loading({ message = 'Cargando...' }) {
    return h('div', { style: styles.loadingContainer },
        h(IconLoader),
        h('div', { style: styles.loadingText }, message)
    );
}

export function Success({ message, subMessage, buttonText, onButtonClick }) {
    return h('div', { style: styles.successContainer },
        h(IconCheck),
        h('div', { style: styles.successTitle }, message),
        h('div', { style: styles.successText }, subMessage),
        h('button', { style: styles.successButton, onClick: onButtonClick }, buttonText)
    );
}
