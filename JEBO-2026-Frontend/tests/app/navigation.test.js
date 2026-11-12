import { describe, it, expect } from 'vitest';
import { paginaDesdeUrl, urlDePagina } from '../../src/navigation.js';

describe('navigation', () => {
    it('convierte la URL en el nombre de la pagina', () => {
        expect(paginaDesdeUrl('/')).toBe('');
        expect(paginaDesdeUrl('/teams')).toBe('teams');
        expect(paginaDesdeUrl('/teams-edit/39/')).toBe('teams-edit/39');
        expect(paginaDesdeUrl('/gymnastics/presentaciones/5/detalle')).toBe('gymnastics/presentaciones/5/detalle');
    });

    it('decodifica la URL y tolera valores invalidos', () => {
        expect(paginaDesdeUrl('/tournaments%20history')).toBe('tournaments history');
        expect(paginaDesdeUrl('/%E0%A4%A')).toBe('%E0%A4%A');
        expect(paginaDesdeUrl(undefined)).toBe('');
    });

    it('arma la URL de una pagina', () => {
        expect(urlDePagina('courts')).toBe('/courts');
        expect(urlDePagina('teams-edit/39')).toBe('/teams-edit/39');
        expect(urlDePagina('')).toBe('/');
    });
});
