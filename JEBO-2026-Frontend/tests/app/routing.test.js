import { describe, it, expect } from 'vitest';

import { resolverRuta } from '../../src/routing.js';

/**
 * Mapa mínimo con las dos formas que conviven en la app: rutas planas
 * (`users`) y rutas anidadas con parametro (`gymnastics/presentaciones/:id/detalle`).
 */
const RUTAS = {
    login: 'x',
    dashboard: 'x',
    users: 'x',
    'users-edit': 'x',
    tournaments: 'x',
    'tournaments-history': 'x',
    'matches-edit': 'x',
    'gymnastics/presentaciones': 'x',
    'gymnastics/presentaciones/nueva': 'x',
    'gymnastics/presentaciones/:id/detalle': 'x',
    'gymnastics/presentaciones/:id/resultado': 'x'
};

describe('resolverRuta', () => {
    it('resuelve las rutas planas', () => {
        expect(resolverRuta('users', RUTAS)).toEqual({ ruta: 'users', matchId: null });
        expect(resolverRuta('dashboard', RUTAS)).toEqual({ ruta: 'dashboard', matchId: null });
    });

    it('extrae el id de las rutas con parametro', () => {
        expect(resolverRuta('matches-edit/5', RUTAS)).toEqual({ ruta: 'matches-edit', matchId: '5' });
        expect(resolverRuta('users-edit/42', RUTAS)).toEqual({ ruta: 'users-edit', matchId: '42' });
    });

    // El bug que hacia que el modulo de gimnasia fuera inalcanzable: la base de
    // `gymnastics/presentaciones/5/resultado` es `gymnastics`, que no es clave de
    // ningun renderer, asi que la pagina caia en el login.
    it('resuelve las rutas anidadas de gimnasia', () => {
        expect(resolverRuta('gymnastics/presentaciones', RUTAS)).toEqual({
            ruta: 'gymnastics/presentaciones',
            matchId: null
        });
        expect(resolverRuta('gymnastics/presentaciones/5/resultado', RUTAS)).toEqual({
            ruta: 'gymnastics/presentaciones/:id/resultado',
            matchId: '5'
        });
        expect(resolverRuta('gymnastics/presentaciones/3/detalle', RUTAS)).toEqual({
            ruta: 'gymnastics/presentaciones/:id/detalle',
            matchId: '3'
        });
    });

    it('prefiere el literal nueva sobre el parametro de la misma posicion', () => {
        expect(resolverRuta('gymnastics/presentaciones/nueva', RUTAS)).toEqual({
            ruta: 'gymnastics/presentaciones/nueva',
            matchId: null
        });
    });

    it('no confunde un id con el literal nueva', () => {
        // `nueva` es un id valido en la BD, asi que la busqueda tiene que ir por
        // numero de segmentos, no por "la ruta mas corta que prefixe".
        expect(resolverRuta('gymnastics/presentaciones/nueva/detalle', RUTAS)).toEqual({
            ruta: 'gymnastics/presentaciones/:id/detalle',
            matchId: 'nueva'
        });
    });

    it('devuelve null para paginas desconocidas', () => {
        expect(resolverRuta('no-existe', RUTAS)).toEqual({ ruta: null, matchId: null });
        expect(resolverRuta('gymnastics', RUTAS)).toEqual({ ruta: null, matchId: null });
    });

    it('resuelve una ruta plana con el id implicito', () => {
        expect(resolverRuta('users/5', RUTAS)).toEqual({ ruta: 'users', matchId: '5' });
    });

    it('no resuelve una ruta plana si sobran dos segmentos', () => {
        // `gymnastics/presentaciones/5/resultado` necesita su ruta declarativa:
        // si la base aceptara dos segmentos de mas, el id y el sufijo se
        // mezclarian y la pantalla de resultado se abriria con la de detalle.
        expect(resolverRuta('gymnastics/presentaciones/5/extra', RUTAS)).toEqual({
            ruta: null,
            matchId: null
        });
    });

    it('devuelve null para entradas invalidas', () => {
        expect(resolverRuta('', RUTAS)).toEqual({ ruta: null, matchId: null });
        expect(resolverRuta(null, RUTAS)).toEqual({ ruta: null, matchId: null });
        expect(resolverRuta(undefined, RUTAS)).toEqual({ ruta: null, matchId: null });
    });
});