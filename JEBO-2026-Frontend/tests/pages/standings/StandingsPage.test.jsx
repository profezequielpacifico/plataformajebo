import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { StandingsPage } from '../../../src/pages/standings/StandingsPage.js';
import teamService from '../../../src/services/teamService.js';
import tournamentService from '../../../src/services/tournamentService.js';
import disciplineService from '../../../src/services/disciplineService.js';
import regionService from '../../../src/services/regionService.js';

vi.mock('../../../src/services/teamService.js', () => ({
  default: { getEnrolled: vi.fn() }
}));
vi.mock('../../../src/services/tournamentService.js', () => ({
  default: { getAll: vi.fn(), getQualified: vi.fn() }
}));
vi.mock('../../../src/services/disciplineService.js', () => ({
  default: { getAll: vi.fn() }
}));
vi.mock('../../../src/services/regionService.js', () => ({
  default: { getAll: vi.fn() }
}));

const fila = (id, nombre, puntos) => ({
  id_posicion: id,
  equipo_nombre: nombre,
  disciplina_nombre: 'Handball',
  torneo_nombre: 'handball 2026',
  estado_torneo: '16avos',
  puntos,
  pj: 1
});

describe('StandingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tournamentService.getAll.mockResolvedValue({ data: [] });
    disciplineService.getAll.mockResolvedValue({ data: [] });
    regionService.getAll.mockResolvedValue({ data: [] });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('pide también los equipos con la inscripción cerrada', async () => {
    teamService.getEnrolled.mockResolvedValue({ data: [], pagination: { totalPages: 1 } });
    render(<StandingsPage />);

    await waitFor(() => expect(teamService.getEnrolled).toHaveBeenCalled());
    expect(teamService.getEnrolled).toHaveBeenCalledWith(expect.objectContaining({ include_cerradas: 'true' }));
  });

  it('muestra los equipos que ya pasaron de fase con sus puntos', async () => {
    teamService.getEnrolled.mockResolvedValue({
      data: [fila(1, 'Equipo Handball Región 23', 2)],
      pagination: { totalPages: 1 }
    });
    render(<StandingsPage />);

    expect(await screen.findByText('Equipo Handball Región 23')).toBeInTheDocument();
    expect(screen.getByText('16avos')).toBeInTheDocument();
  });

  it('junta todas las páginas cuando hay más de 100 equipos', async () => {
    teamService.getEnrolled
      .mockResolvedValueOnce({ data: [fila(1, 'Equipo Uno', 3)], pagination: { totalPages: 2 } })
      .mockResolvedValueOnce({ data: [fila(2, 'Equipo Dos', 1)], pagination: { totalPages: 2 } });
    render(<StandingsPage />);

    expect(await screen.findByText('Equipo Dos')).toBeInTheDocument();
    expect(screen.getByText('Equipo Uno')).toBeInTheDocument();
    expect(teamService.getEnrolled).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
  });
});
