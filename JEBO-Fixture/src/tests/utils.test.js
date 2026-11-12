import { describe, expect, it } from 'vitest';
import { formatearDiaLargo, formatearFecha, hoyEnArgentina, sumarDias } from '../utils/dateFormatter';
import { agruparPorDia, agruparPorDisciplina, proximos, ultimosResultados } from '../utils/fixtureGrouping';
import { colorDisciplina, etiquetaEstado, nombreTorneo } from '../utils/fixtureFormatter';

const evento = (id, fecha, hora, estado = 'PROGRAMADO', disciplina = { id: 1, nombre: 'Fútbol' }) => ({
  clave: `PARTIDO-${id}`, id, tipo: 'PARTIDO', fecha, hora, estado, disciplina, equipos: []
});

describe('fechas', () => {
  it('usa el calendario de Argentina y no el de UTC', () => {
    expect(hoyEnArgentina(new Date('2026-11-13T02:30:00Z'))).toBe('2026-11-12');
  });

  it('suma días cruzando el mes', () => {
    expect(sumarDias('2026-11-30', 1)).toBe('2026-12-01');
  });

  it('nombra hoy, mañana y ayer, y avisa si falta la fecha', () => {
    expect(formatearDiaLargo('2026-11-12', '2026-11-12')).toBe('Hoy');
    expect(formatearDiaLargo('2026-11-13', '2026-11-12')).toBe('Mañana');
    expect(formatearDiaLargo('2026-11-11', '2026-11-12')).toBe('Ayer');
    expect(formatearDiaLargo('2026-11-20', '2026-11-12')).toBe('Viernes, 20 de noviembre');
    expect(formatearDiaLargo(null)).toBe('Fecha a confirmar');
    expect(formatearFecha('2026-11-20')).toBe('20/11/2026');
  });
});

describe('agrupación del fixture', () => {
  const eventos = [
    evento(1, '2026-11-14', '10:00'),
    evento(2, '2026-11-12', '16:00'),
    evento(3, '2026-11-12', '09:00', 'FINALIZADO'),
    evento(4, null, null, 'PENDIENTE'),
    evento(5, '2026-11-13', '11:00', 'CANCELADO', { id: 2, nombre: 'Básquet' }),
    evento(6, '2026-11-10', '11:00')
  ];

  it('agrupa por día en orden cronológico y deja lo que no tiene fecha al final', () => {
    const grupos = agruparPorDia(eventos);
    expect(grupos.map((g) => g.fecha)).toEqual(['2026-11-10', '2026-11-12', '2026-11-13', '2026-11-14', null]);
    expect(grupos[1].eventos.map((e) => e.id)).toEqual([3, 2]);
  });

  it('lista próximos desde hoy sin finalizados, cancelados ni encuentros sin fecha', () => {
    expect(proximos(eventos, '2026-11-12').map((e) => e.id)).toEqual([2, 1]);
  });

  it('ordena los últimos resultados del más reciente al más viejo', () => {
    expect(ultimosResultados([...eventos, evento(7, '2026-11-11', '10:00', 'FINALIZADO')]).map((e) => e.id)).toEqual([3, 7]);
  });

  it('agrupa por disciplina en orden alfabético', () => {
    expect(agruparPorDisciplina(eventos).map((g) => g.disciplina.nombre)).toEqual(['Básquet', 'Fútbol']);
  });
});

describe('formato', () => {
  it('traduce los estados públicos', () => {
    expect(etiquetaEstado('EN_JUEGO')).toBe('En juego');
    expect(etiquetaEstado('PENDIENTE')).toBe('A confirmar');
    expect(etiquetaEstado('OTRO')).toBe('Sin estado');
  });

  it('asigna siempre el mismo color a una disciplina', () => {
    expect(colorDisciplina(7)).toBe(colorDisciplina(7));
    expect(colorDisciplina(1)).not.toBe(colorDisciplina(2));
  });

  it('agrega la categoría al torneo solo si no la tiene en el nombre', () => {
    expect(nombreTorneo({ nombre: 'Fútbol masculino', categoria: 'Sub-16' })).toBe('Fútbol masculino Sub-16');
    expect(nombreTorneo({ nombre: 'Fútbol Sub-16', categoria: 'Sub-16' })).toBe('Fútbol Sub-16');
  });
});
