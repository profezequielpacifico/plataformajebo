import { describe, it, expect } from 'vitest';
import {
    esTorneoDeEncuentros,
    soloTorneosConPartidos,
    TIPO_MARCADOR,
    TIPO_EVALUACION
} from '../../src/services/tiposCompetencia.js';

describe('tiposCompetencia', () => {
    describe('esTorneoDeEncuentros', () => {
        it('reconoce un torneo de Gimnasia', () => {
            expect(esTorneoDeEncuentros({ id_torneo: 32, tipo_competencia: TIPO_EVALUACION })).toBe(true);
        });

        it('un torneo de fútbol no es de encuentros', () => {
            expect(esTorneoDeEncuentros({ id_torneo: 30, tipo_competencia: TIPO_MARCADOR })).toBe(false);
        });

        // Un torneo sin tipo viene de una respuesta vieja de la API, o de una
        // disciplina dada de alta antes de que existiera la columna. Tratarlo
        // como Gimnasia haría desaparecer los torneos de fútbol de todos los
        // selectores de la app.
        it('sin tipo, asume MARCADOR para no esconder torneos de fútbol', () => {
            expect(esTorneoDeEncuentros({ id_torneo: 30 })).toBe(false);
        });

        it('tolera un torneo null o undefined', () => {
            expect(esTorneoDeEncuentros(null)).toBe(false);
            expect(esTorneoDeEncuentros(undefined)).toBe(false);
        });

        it('no confunde un tipo desconocido con Gimnasia', () => {
            expect(esTorneoDeEncuentros({ tipo_competencia: 'OTRO' })).toBe(false);
        });
    });

    describe('soloTorneosConPartidos', () => {
        const lista = [
            { id_torneo: 32, nombre: 'Torneo Gimnasia JEBO 2026', tipo_competencia: TIPO_EVALUACION },
            { id_torneo: 30, nombre: 'Torneo Regional Futsal 2026', tipo_competencia: TIPO_MARCADOR },
            { id_torneo: 29, nombre: 'Copa JEBO 2026', tipo_competencia: TIPO_MARCADOR }
        ];

        it('deja fuera los torneos de Gimnasia', () => {
            const ids = soloTorneosConPartidos(lista).map(t => t.id_torneo);
            expect(ids).toEqual([30, 29]);
        });

        it('conserva el orden original', () => {
            expect(soloTorneosConPartidos(lista).map(t => t.nombre)).toEqual([
                'Torneo Regional Futsal 2026',
                'Copa JEBO 2026'
            ]);
        });

        it('no muta la lista original', () => {
            const original = [...lista];
            soloTorneosConPartidos(lista);
            expect(lista).toEqual(original);
        });

        // La respuesta de /tournaments puede venir envuelta o no según cómo la
        // tipifique el service. Devolver [] es lo seguro: `undefined` en un
        // `.map` del selector rompe la pantalla entera.
        it('devuelve [] con una lista vacia o no-array', () => {
            expect(soloTorneosConPartidos([])).toEqual([]);
            expect(soloTorneosConPartidos(null)).toEqual([]);
            expect(soloTorneosConPartidos(undefined)).toEqual([]);
            expect(soloTorneosConPartidos({ rows: [] })).toEqual([]);
        });

        it('deja pasar todos los torneos si ninguno trae tipo', () => {
            const sinTipo = [{ id_torneo: 1 }, { id_torneo: 2 }];
            expect(soloTorneosConPartidos(sinTipo)).toHaveLength(2);
        });

        it('deja pasar todo si la disciplina es Gimnasia pero el tipo no llego', () => {
            // Filtra por tipo, no por nombre: el nombre de la disciplina puede
            // cambiar sin que cambie el modelo de competencia.
            const porNombre = [{ id_torneo: 32, disciplina_nombre: 'Gimnasia Artística' }];
            expect(soloTorneosConPartidos(porNombre)).toHaveLength(1);
        });
    });
});