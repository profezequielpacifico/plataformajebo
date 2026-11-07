import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { Suspense } from 'react';
import { render, screen } from '@testing-library/react';

import { lazyPage } from '../../src/lazyPage.js';

const renderLazy = (Page) => render(
    React.createElement(Suspense, { fallback: 'cargando' }, React.createElement(Page))
);

describe('lazyPage', () => {
    let reload;

    beforeEach(() => {
        sessionStorage.clear();
        reload = vi.fn();
        vi.stubGlobal('location', { ...window.location, reload });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('renderiza el export con nombre del modulo', async () => {
        const Page = lazyPage(async () => ({ MiPagina: () => 'contenido' }), 'MiPagina');
        renderLazy(Page);
        expect(await screen.findByText('contenido')).toBeTruthy();
        expect(reload).not.toHaveBeenCalled();
    });

    it('recarga una sola vez si el chunk ya no existe', async () => {
        const Page = lazyPage(async () => { throw new Error('chunk 404'); }, 'MiPagina');
        renderLazy(Page);
        await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
        expect(sessionStorage.getItem('jebo:chunk-reload')).toBe('1');
    });

    it('si tras recargar sigue fallando muestra el error en vez de recargar en bucle', async () => {
        sessionStorage.setItem('jebo:chunk-reload', '1');
        const Page = lazyPage(async () => { throw new Error('chunk 404'); }, 'MiPagina');
        renderLazy(Page);
        expect(await screen.findByRole('alert')).toBeTruthy();
        expect(reload).not.toHaveBeenCalled();
        expect(sessionStorage.getItem('jebo:chunk-reload')).toBeNull();
    });

    it('una carga exitosa limpia la marca de recarga', async () => {
        sessionStorage.setItem('jebo:chunk-reload', '1');
        const Page = lazyPage(async () => ({ MiPagina: () => 'ok' }), 'MiPagina');
        renderLazy(Page);
        expect(await screen.findByText('ok')).toBeTruthy();
        expect(sessionStorage.getItem('jebo:chunk-reload')).toBeNull();
    });
});
