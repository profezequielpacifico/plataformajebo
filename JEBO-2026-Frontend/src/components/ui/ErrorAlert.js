import React from 'react';
import { COLORS } from '../../styles/theme/index.js';

const { createElement: h } = React;

export function ErrorAlert({ show, onClose, title, message, suggestion }) {
    if (!show) return null;

    return h('div', {
        style: {
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
        },
        onClick: onClose
    },
        h('div', {
            style: {
                backgroundColor: '#fff',
                borderRadius: '12px',
                maxWidth: '480px',
                width: '100%',
                padding: '28px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                textAlign: 'center'
            },
            onClick: e => e.stopPropagation()
        },
            h('div', {
                style: {
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: COLORS.dangerLight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    fontSize: '28px'
                }
            }, '⚠️'),

            title && h('h3', {
                style: {
                    margin: '0 0 8px',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#1e293b'
                }
            }, title),

            h('p', {
                style: {
                    margin: `0 0 ${suggestion ? '12px' : '24px'}`,
                    fontSize: '14px',
                    color: '#64748b',
                    lineHeight: 1.5
                }
            }, message),

            suggestion && h('p', {
                style: {
                    margin: '0 0 24px',
                    fontSize: '14px',
                    color: '#64748b',
                    lineHeight: 1.5,
                    backgroundColor: '#f8fafc',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                }
            }, suggestion),

            h('button', {
                style: {
                    backgroundColor: COLORS.primary,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 32px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer'
                },
                onClick: onClose
            }, 'Entendido')
        )
    );
}

export default ErrorAlert;
