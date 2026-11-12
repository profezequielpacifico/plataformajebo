import { describe, it, expect } from 'vitest';
import { getRoleId, esAdministrador, esSuperAdmin, tieneRol, etiquetaDeRol } from '../../src/services/roles.js';
import { ROLE_IDS } from '../../src/config/constants.js';

describe('roles', () => {
    describe('getRoleId', () => {
        it('sin usuario devuelve null', () => {
            expect(getRoleId(null)).toBe(null);
            expect(getRoleId(undefined)).toBe(null);
        });

        it('resuelve el rol por su nombre', () => {
            expect(getRoleId({ rol: 'SuperAdmin' })).toBe(ROLE_IDS.SUPERADMIN);
            expect(getRoleId({ rol: 'Administrador' })).toBe(ROLE_IDS.ADMINISTRADOR);
            expect(getRoleId({ rol: 'Profesor' })).toBe(ROLE_IDS.PROFESOR);
            expect(getRoleId({ rol: 'Arbitro' })).toBe(ROLE_IDS.ARBITRO);
            expect(getRoleId({ rol: 'Juez' })).toBe(ROLE_IDS.JUEZ);
        });

        it('ignora el id_rol de la base, que no coincide con los codigos internos', () => {
            expect(getRoleId({ id_rol: 1, rol: 'SuperAdmin' })).toBe(ROLE_IDS.SUPERADMIN);
            expect(getRoleId({ id_rol: 3, rol: 'Profesor' })).toBe(ROLE_IDS.PROFESOR);
            expect(getRoleId({ id_rol: 13, rol: 'Arbitro' })).toBe(ROLE_IDS.ARBITRO);
            expect(getRoleId({ id_rol: ROLE_IDS.SUPERADMIN })).toBe(null);
        });

        it('tolera mayusculas, tildes y espacios en el nombre', () => {
            expect(getRoleId({ rol: 'ÁRBITRO' })).toBe(ROLE_IDS.ARBITRO);
            expect(getRoleId({ rol: ' super admin ' })).toBe(ROLE_IDS.SUPERADMIN);
            expect(getRoleId({ rol: 'administrador' })).toBe(ROLE_IDS.ADMINISTRADOR);
        });

        it('un rol desconocido devuelve null', () => {
            expect(getRoleId({ rol: 'Invitado' })).toBe(null);
        });
    });

    describe('esAdministrador', () => {
        it('SuperAdmin y Administrador son admin', () => {
            expect(esAdministrador({ rol: 'SuperAdmin' })).toBe(true);
            expect(esAdministrador({ rol: 'Administrador', id_rol: 2 })).toBe(true);
        });

        it('Profesor no es admin aunque su id_rol coincida con un codigo de admin', () => {
            expect(esAdministrador({ rol: 'Profesor', id_rol: ROLE_IDS.ADMINISTRADOR })).toBe(false);
        });

        it('Arbitro, Juez y sin usuario no son admin', () => {
            expect(esAdministrador({ rol: 'Arbitro' })).toBe(false);
            expect(esAdministrador({ rol: 'Juez' })).toBe(false);
            expect(esAdministrador(null)).toBe(false);
        });
    });

    it('esSuperAdmin solo acepta al SuperAdmin', () => {
        expect(esSuperAdmin({ rol: 'SuperAdmin' })).toBe(true);
        expect(esSuperAdmin({ rol: 'Administrador' })).toBe(false);
    });

    it('tieneRol compara contra la lista dada', () => {
        expect(tieneRol({ rol: 'Juez' }, ROLE_IDS.JUEZ, ROLE_IDS.ADMINISTRADOR)).toBe(true);
        expect(tieneRol({ rol: 'Juez' }, ROLE_IDS.ARBITRO)).toBe(false);
        expect(tieneRol(null, ROLE_IDS.ARBITRO)).toBe(false);
    });

    it('etiquetaDeRol muestra el nombre legible del rol', () => {
        expect(etiquetaDeRol({ rol: 'Arbitro' })).toBe('Árbitro');
        expect(etiquetaDeRol({ rol: 'SuperAdmin' })).toBe('SuperAdmin');
        expect(etiquetaDeRol(null)).toBe('Sin rol');
    });
});
