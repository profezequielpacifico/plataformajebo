import { lazy, createElement as h } from 'react';

const RELOAD_KEY = 'jebo:chunk-reload';

function readFlag() {
    try {
        return sessionStorage.getItem(RELOAD_KEY);
    } catch {
        return '1';
    }
}

function writeFlag(value) {
    try {
        if (value) sessionStorage.setItem(RELOAD_KEY, value);
        else sessionStorage.removeItem(RELOAD_KEY);
    } catch {
        return;
    }
}

function ChunkLoadError() {
    return h('div', { role: 'alert', style: { padding: '32px', textAlign: 'center' } },
        h('p', null, 'No se pudo cargar esta pantalla.'),
        h('button', { type: 'button', onClick: () => window.location.reload() }, 'Reintentar')
    );
}

export function lazyPage(load, exportName) {
    return lazy(async () => {
        try {
            const module = await load();
            writeFlag(null);
            return { default: module[exportName] };
        } catch {
            if (!readFlag()) {
                writeFlag('1');
                window.location.reload();
                return new Promise(() => {});
            }
            writeFlag(null);
            return { default: ChunkLoadError };
        }
    });
}
