import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { EnrolledTeamsPage } from '../../../src/pages/teams/EnrolledTeamsPage.js';
import teamService from '../../../src/services/teamService.js';
import disciplineService from '../../../src/services/disciplineService.js';
import tournamentService from '../../../src/services/tournamentService.js';

vi.mock('../../../src/services/teamService.js', () => ({
  default: { getEnrolled: vi.fn() }
}));
vi.mock('../../../src/services/disciplineService.js', () => ({
  default: { getAll: vi.fn() }
}));
vi.mock('../../../src/services/tournamentService.js', () => ({
  default: { getAll: vi.fn() }
}));

describe('EnrolledTeamsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    disciplineService.getAll.mockResolvedValue({ data: [] });
    tournamentService.getAll.mockResolvedValue({ data: [] });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('sigue mostrando los equipos después de que cierra la inscripción', async () => {
    teamService.getEnrolled.mockResolvedValue({
      data: [{
        id_posicion: 1,
        equipo_nombre: 'Equipo Handball Región 9',
        disciplina_nombre: 'Handball',
        torneo_nombre: 'handball 2026',
        estado_torneo: '16avos'
      }],
      pagination: { totalPages: 1 }
    });
    render(<EnrolledTeamsPage onNavigate={vi.fn()} />);

    expect(await screen.findByText('Equipo Handball Región 9')).toBeInTheDocument();
    await waitFor(() => expect(teamService.getEnrolled)
      .toHaveBeenCalledWith(expect.objectContaining({ include_cerradas: 'true' })));
  });
});
