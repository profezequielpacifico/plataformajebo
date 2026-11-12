import { describe, it, expect } from 'vitest';
import { canAccess, rutaDe, ROUTE_PERMISSIONS, PUBLIC_ROUTES } from '../../src/permissions.js';
import { ROUTES } from '../../src/config/constants.js';

const superadmin = { rol: 'SuperAdmin', id_rol: 1 };
const admin = { rol: 'Administrador', id_rol: 2 };
const profesor = { rol: 'Profesor', id_rol: 3 };
const juez = { rol: 'Juez', id_rol: 5 };
const arbitro = { rol: 'Arbitro', id_rol: 13 };

describe('permissions', () => {
    it('toda ruta privada tiene permisos definidos', () => {
        const privadas = Object.values(ROUTES).filter(r => !PUBLIC_ROUTES.includes(r) && r !== ROUTES.GYM_FIXTURE);
        for (const ruta of privadas) {
            expect(ROUTE_PERMISSIONS[ruta], ruta).toBeDefined();
        }
    });

    it('las rutas publicas no piden usuario', () => {
        for (const ruta of PUBLIC_ROUTES) {
            expect(canAccess(null, ruta)).toBe(true);
        }
    });

    it('sin usuario o sin rol valido no entra a rutas privadas', () => {
        expect(canAccess(null, ROUTES.DASHBOARD)).toBe(false);
        expect(canAccess({ rol: 'Invitado', id_rol: 20 }, ROUTES.DASHBOARD)).toBe(false);
    });

    it('usa el nombre del rol y no el id_rol de la base', () => {
        expect(canAccess(superadmin, ROUTES.REGIONS)).toBe(true);
        expect(canAccess(admin, ROUTES.USERS)).toBe(true);
        expect(canAccess(profesor, ROUTES.TEAMS_NEW)).toBe(true);
        expect(canAccess(arbitro, ROUTES.MIS_PARTIDOS)).toBe(true);
        expect(canAccess(juez, ROUTES.GYM_PRESENTACIONES)).toBe(true);
    });

    it('aplica los permisos tambien a las rutas con parametros', () => {
        expect(rutaDe('tournaments-edit/5')).toBe(ROUTES.TOURNAMENTS_EDIT);
        expect(rutaDe('gymnastics/presentaciones/7/detalle')).toBe(ROUTES.GYM_PRESENTACIONES_DETALLE);
        expect(canAccess(profesor, 'tournaments-edit/5')).toBe(false);
        expect(canAccess(admin, 'tournaments-edit/5')).toBe(true);
        expect(canAccess(arbitro, 'gymnastics/presentaciones/7/detalle')).toBe(false);
        expect(canAccess(juez, 'gymnastics/presentaciones/7/detalle')).toBe(true);
        expect(canAccess(admin, 'districts-edit/3')).toBe(false);
    });

    it('una ruta desconocida no esta permitida', () => {
        expect(canAccess(superadmin, 'no-existe')).toBe(false);
    });

    it('el administrador no entra a las paginas del SuperAdmin', () => {
        for (const ruta of [ROUTES.REGIONS, ROUTES.DISTRICTS, ROUTES.LOCALITIES, ROUTES.AUDIT, ROUTES.LOCKOUTS, ROUTES.ADVANCED_OPTIONS]) {
            expect(canAccess(admin, ruta), ruta).toBe(false);
            expect(canAccess(superadmin, ruta), ruta).toBe(true);
        }
    });

    it('el profesor no ve las presentaciones de gimnasia', () => {
        expect(canAccess(profesor, ROUTES.GYM_PRESENTACIONES)).toBe(false);
    });
});
