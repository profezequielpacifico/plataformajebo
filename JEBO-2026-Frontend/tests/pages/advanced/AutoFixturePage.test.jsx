import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { AutoFixturePage } from '../../../src/pages/advanced/AutoFixturePage.js';
import tournamentService from '../../../src/services/tournamentService.js';
import fixtureService from '../../../src/services/fixtureService.js';

vi.mock('../../../src/services/tournamentService.js', () => ({
  default: { getAll: vi.fn() }
}));
vi.mock('../../../src/services/fixtureService.js', () => ({
  default: { getStatus: vi.fn(), generate: vi.fn() }
}));

const TORNEOS = [
  { id_torneo: 30, nombre: 'Torneo Regional Futsal 2026', tipo_competencia: 'MARCADOR' },
  { id_torneo: 29, nombre: 'Copa JEBO 2026', tipo_competencia: 'MARCADOR' },
  {
    id_torneo: 32,
    nombre: 'Torneo Gimnasia JEBO 2026',
    tipo_competencia: 'EVALUACION'
  }
];

describe('AutoFixturePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tournamentService.getAll.mockResolvedValue({ data: TORNEOS });
    fixtureService.getStatus.mockResolvedValue({ data: { generado: false } });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  const renderPage = (props = {}) => render(<AutoFixturePage onNavigate={vi.fn()} {...props} />);

  const selector = () => screen.getByDisplayValue('Seleccione torneo');
  const opciones = () => within(selector()).getAllByRole('option').map(o => o.textContent);

  const esperarSelector = () =>
    waitFor(() => expect(opciones().length).toBeGreaterThan(1));

  it('lista los torneos que se juegan con marcador', async () => {
    renderPage();
    await esperarSelector();

    expect(opciones().some(o => o.includes('Futsal'))).toBe(true);
    expect(opciones().some(o => o.includes('Copa JEBO'))).toBe(true);
  });

  it('no ofrece el torneo de Gimnasia', async () => {
    renderPage();
    await esperarSelector();

    expect(opciones().some(o => o.includes('Gimnasia'))).toBe(false);
  });

  it('no consulta el estado de los torneos de Gimnasia', async () => {
    renderPage();
    await esperarSelector();

    const consultados = fixtureService.getStatus.mock.calls.map(c => c[0]);
    expect(consultados).not.toContain('32');
  });

  it('genera el fixture del torneo elegido', async () => {
    fixtureService.generate.mockResolvedValue({ data: { partidos: 3, rondas: 3 } });
    renderPage();
    await esperarSelector();

    await userEvent.selectOptions(selector(), '30');
    await userEvent.click(screen.getByRole('button', { name: /confirmar/i }));
    await userEvent.click(await screen.findByRole('button', { name: /sí, continuar/i }));

    await waitFor(() => expect(fixtureService.generate).toHaveBeenCalledWith('30'));
  });

  it('deja pasar los torneos que no traen tipo', async () => {
    tournamentService.getAll.mockResolvedValue({
      data: [{ id_torneo: 40, nombre: 'Torneo Sin Tipo' }]
    });
    renderPage();
    await esperarSelector();

    expect(opciones().some(o => o.includes('Sin Tipo'))).toBe(true);
  });

  it('tolera que la API devuelva algo que no es una lista', async () => {
    tournamentService.getAll.mockResolvedValue({ data: 'no soy una lista' });
    renderPage();

    await waitFor(() => expect(screen.getByDisplayValue('Seleccione torneo')).toBeInTheDocument());
    expect(opciones()).toHaveLength(1);
  });
});