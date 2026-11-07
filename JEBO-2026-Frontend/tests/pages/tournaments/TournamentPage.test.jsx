import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { TournamentPage } from '../../../src/pages/tournaments/TournamentPage.js';
import disciplineService from '../../../src/services/disciplineService.js';
import tournamentService from '../../../src/services/tournamentService.js';
import teamService from '../../../src/services/teamService.js';

vi.mock('../../../src/services/disciplineService.js', () => {
  const s = { getAll: vi.fn() };
  return { default: s, disciplineService: s };
});
vi.mock('../../../src/services/tournamentService.js', () => {
  const s = { getAll: vi.fn(), delete: vi.fn() };
  return { default: s, tournamentService: s };
});
vi.mock('../../../src/services/teamService.js', () => {
  const s = { getAll: vi.fn() };
  return { default: s, teamService: s };
});

const DISCIPLINAS = [
  { id_disciplina: 1, nombre: 'Fútbol 5' },
  { id_disciplina: 2, nombre: 'Vóley' }
];

const TORNEOS = [
  {
    id_torneo: 1, id_disciplina: 1, nombre: 'Torneo Otoño', categoria: 'Senior',
    fecha_inicio: '2026-03-01T00:00:00.000Z', fecha_fin: '2026-06-30T00:00:00.000Z',
    fecha_inscripcion_inicio: '2026-02-01T03:00:00.000Z', fecha_inscripcion_fin: '2026-02-21T02:30:00.000Z',
    estado: 'En Progreso'
  },
  {
    id_torneo: 2, id_disciplina: 2, nombre: 'Copa Primavera',
    fecha_inicio: null, fecha_fin: null,
    fecha_inscripcion_inicio: null, fecha_inscripcion_fin: null,
    estado: 'Programado'
  }
];

describe('TournamentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    disciplineService.getAll.mockResolvedValue({ data: DISCIPLINAS });
    tournamentService.getAll.mockResolvedValue({ data: TORNEOS });
    teamService.getAll.mockResolvedValue({ data: [], pagination: { total: 14 } });
    tournamentService.delete.mockResolvedValue({});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  const renderPage = (props = {}) =>
    render(<TournamentPage onNavigate={vi.fn()} {...props} />);

  const valorDe = (label) => {
    const etiqueta = screen.getAllByText(label)[0];
    return etiqueta.parentElement.lastElementChild.textContent;
  };

  it('carga los tres conjuntos de datos al montar', async () => {
    renderPage();
    await waitFor(() => expect(disciplineService.getAll).toHaveBeenCalled());
    expect(teamService.getAll).toHaveBeenCalledWith({ limit: 100 });
    expect(tournamentService.getAll).toHaveBeenCalledWith(1, 100, { scope: 'active' });
  });

  it('muestra los contadores en las tarjetas', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Disciplinas')).toBeInTheDocument());
    expect(valorDe('Disciplinas')).toBe('2');
    expect(valorDe('Equipos')).toBe('14');
    expect(valorDe('Torneos')).toBe('2');
  });

  it('cae al largo del array si no hay paginacion', async () => {
    teamService.getAll.mockResolvedValue({ data: [{ id: 1 }, { id: 2 }, { id: 3 }] });
    renderPage();
    await waitFor(() => expect(screen.getByText('Equipos')).toBeInTheDocument());
    const valorEquipos = within(
      screen.getByText('Equipos').closest('div').parentElement
    ).getByText('3');
    expect(valorEquipos).toBeInTheDocument();
  });

  it('lista los torneos activos', async () => {
    renderPage();
    expect(await screen.findByText('Torneo Otoño')).toBeInTheDocument();
    expect(screen.getByText('Copa Primavera')).toBeInTheDocument();
  });

  it('muestra el rango de inscripcion', async () => {
    renderPage();
    expect(await screen.findByText('01/02/2026 - 20/02/2026')).toBeInTheDocument();
  });

  it('muestra el dia de las columnas DATE sin correrlo', async () => {
    renderPage();
    const fila = (await screen.findByText('Torneo Otoño')).closest('tr');
    const celdas = [...fila.querySelectorAll('td')].map((td) => td.textContent);
    expect(celdas.slice(2, 4)).toEqual(['01/03/2026', '30/06/2026']);
  });

  it('pone guion en las fechas ausentes', async () => {
    renderPage();
    const fila = (await screen.findByText('Copa Primavera')).closest('tr');
    const celdas = [...fila.querySelectorAll('td')].map((td) => td.textContent);
    expect(celdas.slice(1, 4)).toEqual(['-', '-', '-']);
    expect(celdas[4]).toBe('- - -');
  });

  it('distingue sin torneos de sin resultados', async () => {
    tournamentService.getAll.mockResolvedValue({ data: [] });
    renderPage();
    expect(await screen.findByText('Sin torneos')).toBeInTheDocument();
  });

  it('dice "sin resultados" cuando el filtro no deja ninguno', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Torneo Otoño');
    await user.selectOptions(screen.getByDisplayValue('Todas las disciplinas'), '1');
    await user.selectOptions(screen.getByDisplayValue('Todos'), 'programado');

    await waitFor(() =>
      expect(screen.getByText('Sin resultados para los filtros seleccionados')).toBeInTheDocument()
    );
    expect(screen.queryByText('Torneo Otoño')).not.toBeInTheDocument();
  });

  it('filtra por disciplina', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Torneo Otoño');
    await user.selectOptions(screen.getByDisplayValue('Todas las disciplinas'), '1');

    await waitFor(() => expect(screen.queryByText('Copa Primavera')).not.toBeInTheDocument());
    expect(screen.getByText('Torneo Otoño')).toBeInTheDocument();
  });

  it('filtra por estado usando el valor con guion del select', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Torneo Otoño');
    await user.selectOptions(screen.getByDisplayValue('Todos'), 'en-progreso');

    await waitFor(() => expect(screen.queryByText('Copa Primavera')).not.toBeInTheDocument());
    expect(screen.getByText('Torneo Otoño')).toBeInTheDocument();
  });

  it('filtra por el estado Programado', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Torneo Otoño');
    await user.selectOptions(screen.getByDisplayValue('Todos'), 'programado');

    await waitFor(() => expect(screen.queryByText('Torneo Otoño')).not.toBeInTheDocument());
    expect(screen.getByText('Copa Primavera')).toBeInTheDocument();
  });

  it('colorea el badge de cada estado', async () => {
    const COLORES = { 'En Progreso': '#22c55e', Programado: '#f59e0b' };
    renderPage();
    await screen.findByText('Torneo Otoño');
    const tabla = within(screen.getByRole('table'));
    for (const [estado, color] of Object.entries(COLORES)) {
      expect(tabla.getByText(estado).closest('span')).toHaveStyle({ backgroundColor: color });
    }
  });

  it('navega a historial, nuevo, ver y editar', async () => {
    const onNavigate = vi.fn();
    renderPage({ onNavigate });
    const fila = (await screen.findByText('Torneo Otoño')).closest('tr');
    const botones = within(fila).getAllByRole('button');

    await userEvent.click(screen.getByRole('button', { name: /historial de torneos/i }));
    await userEvent.click(screen.getByRole('button', { name: /nuevo torneo/i }));
    await userEvent.click(botones[0]);
    await userEvent.click(botones[1]);

    expect(onNavigate).toHaveBeenCalledWith('tournaments-history');
    expect(onNavigate).toHaveBeenCalledWith('tournaments-new');
    expect(onNavigate).toHaveBeenCalledWith('tournaments-view/1');
    expect(onNavigate).toHaveBeenCalledWith('tournaments-edit/1');
  });

  it('elimina al confirmar', async () => {
    const user = userEvent.setup();
    renderPage();
    const fila = (await screen.findByText('Torneo Otoño')).closest('tr');
    await user.click(within(fila).getAllByRole('button')[2]);

    expect(await screen.findByText(/¿Eliminar el torneo "Torneo Otoño"\?/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^eliminar$/i }));

    await waitFor(() => expect(tournamentService.delete).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.queryByText('Torneo Otoño')).not.toBeInTheDocument());
  });

  it('no borra al cancelar', async () => {
    const user = userEvent.setup();
    renderPage();
    const fila = (await screen.findByText('Torneo Otoño')).closest('tr');
    await user.click(within(fila).getAllByRole('button')[2]);
    await screen.findByText(/¿Eliminar el torneo/);
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(tournamentService.delete).not.toHaveBeenCalled();
    expect(screen.getByText('Torneo Otoño')).toBeInTheDocument();
  });

  it('sugiere limpiar lo asociado cuando el borrado choca con partidos', async () => {
    const user = userEvent.setup();
    tournamentService.delete.mockRejectedValue(
      new Error('No se puede eliminar: tiene partidos asociados')
    );
    renderPage();
    const fila = (await screen.findByText('Torneo Otoño')).closest('tr');
    await user.click(within(fila).getAllByRole('button')[2]);
    await user.click(await screen.findByRole('button', { name: /^eliminar$/i }));

    expect(await screen.findByText('Error al eliminar')).toBeInTheDocument();
    expect(screen.getByText(/tiene partidos asociados/)).toBeInTheDocument();
    expect(screen.getByText(/Eliminá primero los partidos/)).toBeInTheDocument();
  });

  it('reconoce el error de registros asociados', async () => {
    const user = userEvent.setup();
    tournamentService.delete.mockRejectedValue(new Error('Tiene registros asociados'));
    renderPage();
    const fila = (await screen.findByText('Torneo Otoño')).closest('tr');
    await user.click(within(fila).getAllByRole('button')[2]);
    await user.click(await screen.findByRole('button', { name: /^eliminar$/i }));

    expect(await screen.findByText(/Eliminá primero los partidos/)).toBeInTheDocument();
  });

  it('usa un texto por defecto si el error de borrado no trae mensaje', async () => {
    const user = userEvent.setup();
    tournamentService.delete.mockRejectedValue(new Error(''));
    renderPage();
    const fila = (await screen.findByText('Torneo Otoño')).closest('tr');
    await user.click(within(fila).getAllByRole('button')[2]);
    await user.click(await screen.findByRole('button', { name: /^eliminar$/i }));

    expect(await screen.findByText('No se pudo eliminar el torneo.')).toBeInTheDocument();
  });

  it('un fallo al cargar no tapa la pagina', async () => {
    tournamentService.getAll.mockRejectedValue(new Error('API caída'));
    renderPage();
    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(await screen.findByText('Sin torneos')).toBeInTheDocument();
  });

  it('tolera que las respuestas no sean listas', async () => {
    disciplineService.getAll.mockResolvedValue({ data: 'nope' });
    teamService.getAll.mockResolvedValue({ data: 42 });
    renderPage();
    expect(await screen.findByText('Torneo Otoño')).toBeInTheDocument();
  });
});
