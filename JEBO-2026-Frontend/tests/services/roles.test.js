import { describe, it, expect } from 'vitest';
import { getRoleId, esAdministrador } from '../../src/services/roles.js';
import { ROLE_IDS } from '../../src/config/constants.js';

describe('roles', () => {
    describe('getRoleId', () => {
        it('sin usuario devuelve null', () => {
            expect(getRoleId(null)).toBe(null);
            expect(getRoleId(undefined)).toBe(null);
        });

        it('prefiere id_rol numerico cuando viene', () => {
            expect(getRoleId({ id_rol: ROLE_IDS.JUEZ, rol: 'Arbitro' })).toBe(ROLE_IDS.JUEZ);
        });

        // `/auth/login` no devuelve `id_rol`, asi que el nombre del rol es el
        // unico dato disponible en el perfil cacheado.
        it('cae al nombre del rol cuando no hay id_rol', () => {
            expect(getRoleId({ rol: 'SuperAdmin' })).toBe(ROLE_IDS.SUPERADMIN);
            expect(getRoleId({ rol: 'Administrador' })).toBe(ROLE_IDS.ADMINISTRADOR);
            expect(getRoleId({ rol: 'Profesor' })).toBe(ROLE_IDS.PROFESOR);
            expect(getRoleId({ rol: 'Arbitro' })).toBe(ROLE_IDS.ARBITRO);
            expect(getRoleId({ rol: 'Juez' })).toBe(ROLE_IDS.JUEZ);
        });

        it('un rol desconocido devuelve null', () => {
            expect(getRoleId({ rol: 'Invitado' })).toBe(null);
        });
    });

    describe('esAdministrador', () => {
        it('SuperAdmin y Administrador son admin', () => {
            expect(esAdministrador({ rol: 'SuperAdmin' })).toBe(true);
            expect(esAdministrador({ rol: 'Administrador' })).toBe(true);
            expect(esAdministrador({ id_rol: ROLE_IDS.SUPERADMIN })).toBe(true);
            expect(esAdministrador({ id_rol: ROLE_IDS.ADMINISTRADOR })).toBe(true);
        });

        // El id 1 es Profesor, no Administrador: el check viejo
        // `user.id_rol === 1` le daba acciones de admin al docente.
        it('Profesor no es admin', () => {
            expect(esAdministrador({ rol: 'Profesor' })).toBe(false);
            expect(esAdministrador({ id_rol: ROLE_IDS.PROFESOR })).toBe(false);
        });

        it('Arbitro, Juez y sin usuario no son admin', () => {
            expect(esAdministrador({ rol: 'Arbitro' })).toBe(false);
            expect(esAdministrador({ rol: 'Juez' })).toBe(false);
            expect(esAdministrador(null)).toBe(false);
        });
    });
});
