import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { TournamentStagesPage } from '../../../src/pages/tournaments/TournamentStagesPage.js';
import { describirOrigen, crearEtapasJebo } from '../../../src/pages/tournaments/etapaReglas.js';
import stageInstanceService from '../../../src/services/stageInstanceService.js';
import { matchService } from '../../../src/services/matchService.js';

vi.mock('../../../src/services/stageInstanceService.js', () => ({
  default: {
    getPorTorneo: vi.fn(),
    getDetalle: vi.fn(),
    prepararEtapa: vi.fn(),
    generarEncuentros: vi.fn(),
    finalizar: vi.fn()
  }
}));

vi.mock('../../../src/services/matchService.js', () => ({
  matchService: { updateStatus: vi.fn() }
}));

const etapa = (extra) => ({
  id_etapa: 1,
  orden: 1,
  nombre: 'Interregional',
  estado: 'En Progreso',
  modalidad: 'LIGA',
  ambito: 'INTERREGIONAL',
  origen_tipo: 'ETAPA',
  origen_ambito: 'REGION',
  clasifican_por_instancia: 1,
  mejores_adicionales: 0,
  avanza_si_unico: true,
  instancias: [
    { id_etapa_instancia: 10, nombre: 'Zona 1', estado: 'En Progreso', participantes: 3, clasificados: 0 }
  ],
  ...extra
});

const torneo = {
  id_torneo: 5,
  nombre: 'Torneo',
  disciplina_nombre: 'Fútbol',
  tipo_competencia: 'MARCADOR',
  inscriptos: 3,
  puntos_victoria: 2,
  puntos_empate: 1,
  puntos_derrota: 1
};

const fila = (id, nombre, extra) => ({
  id_equipo: id, equipo_nombre: nombre, posicion: 1, pj: 2, pg: 1, pe: 0, pp: 1, gf: 2, gc: 2, puntos: 3, empatado: true, clasificado: false, ...extra
});

const detalleEmpatado = {
  instancia: { id_etapa_instancia: 10, nombre: 'Zona 1', estado: 'En Progreso', encuentros_generados: true },
  etapa: { modalidad: 'LIGA', clasifican_por_instancia: 1 },
  territorios: ['Región 1', 'Región 2'],
  tabla: [fila(1, 'Equipo A'), fila(2, 'Equipo B')],
  encuentros: [],
  pendientes: 0,
  empate_en_corte: true,
  empatados: ['Equipo A', 'Equipo B']
};

const abrirZona = async (detalle) => {
  stageInstanceService.getDetalle.mockResolvedValue(detalle);
  render(<TournamentStagesPage onNavigate={vi.fn()} pageParams={{ id: '5' }} />);
  await userEvent.click(await screen.findByRole('button', { name: /Zona 1/ }));
  await screen.findByRole('heading', { name: /Zona 1/ });
};

describe('TournamentStagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stageInstanceService.getPorTorneo.mockResolvedValue({ torneo, etapas: [etapa()] });
  });

  it('muestra los puntos de la disciplina y el origen de los equipos', async () => {
    render(<TournamentStagesPage onNavigate={vi.fn()} pageParams={{ id: '5' }} />);
    expect(await screen.findByText(/Ganar 2, empatar 1, perder 1/)).toBeInTheDocument();
    expect(screen.getAllByText(/clasificados de las regiones/).length).toBeGreaterThan(0);
  });

  it('no deja finalizar con un empate hasta elegir quién clasifica', async () => {
    await abrirZona(detalleEmpatado);
    const finalizar = screen.getByRole('button', { name: /Finalizar y clasificar/ });
    expect(finalizar).toBeDisabled();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Equipo B' }));
    expect(finalizar).toBeEnabled();
  });

  it('envía el equipo elegido al finalizar', async () => {
    stageInstanceService.finalizar.mockResolvedValue({});
    await abrirZona(detalleEmpatado);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Equipo B' }));
    await userEvent.click(screen.getByRole('button', { name: /Finalizar y clasificar/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Finalizar' }));
    await waitFor(() => expect(stageInstanceService.finalizar).toHaveBeenCalledWith(10, [2]));
  });

  it('avisa si faltan encuentros', async () => {
    await abrirZona({ ...detalleEmpatado, pendientes: 2, empate_en_corte: false, empatados: [] });
    expect(screen.getByText(/Faltan 2 encuentro/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Finalizar y clasificar/ })).toBeDisabled();
  });

  it('Jugar pone el partido En Juego y abre el partido en vivo', async () => {
    matchService.updateStatus.mockResolvedValue({});
    const onNavigate = vi.fn();
    stageInstanceService.getDetalle.mockResolvedValue({
      ...detalleEmpatado,
      pendientes: 1,
      empate_en_corte: false,
      empatados: [],
      encuentros: [{ id_partido: 7, estado: 'Pendiente', ronda: 1, local_nombre: 'A', visitante_nombre: 'B', puntos_local: 0, puntos_visitante: 0 }]
    });
    render(<TournamentStagesPage onNavigate={onNavigate} pageParams={{ id: '5' }} />);
    await userEvent.click(await screen.findByRole('button', { name: /Zona 1/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Jugar' }));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('match-live/7'));
    expect(matchService.updateStatus).toHaveBeenCalledWith(7, { estado: 'En Juego' });
  });

  it('con el resultado cerrado ofrece finalizar el partido', async () => {
    matchService.updateStatus.mockResolvedValue({});
    stageInstanceService.getDetalle.mockResolvedValue({
      ...detalleEmpatado,
      pendientes: 1,
      empate_en_corte: false,
      empatados: [],
      encuentros: [{ id_partido: 7, estado: 'En Juego', resultado_cargado: true, ronda: 1, local_nombre: 'A', visitante_nombre: 'B', puntos_local: 2, puntos_visitante: 0 }]
    });
    render(<TournamentStagesPage onNavigate={vi.fn()} pageParams={{ id: '5' }} />);
    await userEvent.click(await screen.findByRole('button', { name: /Zona 1/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Finalizar partido' }));
    await waitFor(() => expect(matchService.updateStatus).toHaveBeenCalledWith(7, { estado: 'Finalizado' }));
  });

  it('no ofrece volver a preparar si ya hay encuentros', async () => {
    stageInstanceService.getPorTorneo.mockResolvedValue({
      torneo,
      etapas: [etapa({ instancias: [{ id_etapa_instancia: 10, nombre: 'Zona 1', estado: 'En Progreso', participantes: 3, encuentros_generados: true }] })]
    });
    render(<TournamentStagesPage onNavigate={vi.fn()} pageParams={{ id: '5' }} />);
    await screen.findByRole('button', { name: /Zona 1/ });
    expect(screen.queryByRole('button', { name: /preparar/i })).not.toBeInTheDocument();
  });

  it('muestra el error del servidor al preparar', async () => {
    stageInstanceService.getPorTorneo.mockResolvedValue({ torneo, etapas: [etapa({ instancias: [], estado: 'Pendiente' })] });
    stageInstanceService.prepararEtapa.mockRejectedValue(new Error('Primero tiene que finalizar la etapa "Regional"'));
    render(<TournamentStagesPage onNavigate={vi.fn()} pageParams={{ id: '5' }} />);
    await userEvent.click(await screen.findByRole('button', { name: /Preparar etapa/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Primero tiene que finalizar la etapa "Regional"');
  });
});

describe('etapaReglas', () => {
  it('describe cada origen', () => {
    expect(describirOrigen({ origen_tipo: 'INSCRIPCION' })).toBe('inscripción al torneo');
    expect(describirOrigen({ origen_tipo: 'MANUAL' })).toBe('carga manual');
    expect(describirOrigen({ origen_tipo: 'ETAPA' })).toBe('clasificados de la etapa anterior');
    expect(describirOrigen({ origen_tipo: 'ETAPA', origen_ambito: 'DISTRITO' })).toBe('clasificados de los distritos');
  });

  it('arma las cuatro etapas JEBO encadenadas', () => {
    const etapas = crearEtapasJebo('MARCADOR');
    expect(etapas.map((e) => e.nombre)).toEqual(['Distrital', 'Regional', 'Interregional', 'Nacional']);
    expect(etapas[1].origen_ambito).toBe('DISTRITO');
    expect(etapas[3].es_final).toBe(true);
    expect(crearEtapasJebo('EVALUACION')[0].tipo).toBe('EVALUACION');
  });
});
