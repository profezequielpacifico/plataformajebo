import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { TournamentListPage } from '../../../src/pages/tournaments/TournamentListPage.js';
import { tournamentService } from '../../../src/services/tournamentService.js';

vi.mock('../../../src/services/tournamentService.js', () => ({
  tournamentService: { getAll: vi.fn(), delete: vi.fn() }
}));

const TORNEOS = [
  {
    id_torneo: 1, nombre: 'Torneo Otoño', categoria: 'Senior',
    fecha_inicio: '2026-03-01T00:00:00.000Z', fecha_fin: '2026-06-30T00:00:00.000Z',
    cantidad_equipos: 8, estado: 'Finalizado'
  },
  {
    id_torneo: 2, nombre: 'Copa Primavera', categoria: 'Junior',
    fecha_inicio: '2026-09-01T00:00:00.000Z', fecha_fin: '2026-11-30T00:00:00.000Z',
    cantidad_equipos: 6, estado: 'En Progreso'
  }
];

describe('TournamentListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tournamentService.getAll.mockResolvedValue(TORNEOS);
    tournamentService.delete.mockResolvedValue({});
  });

  const renderPage = (props = {}) =>
    render(<TournamentListPage onNavigate={vi.fn()} {...props} />);

  it('pide solo losarchivados al montar', async () => {
    renderPage();
    await waitFor(() =>
      expect(tournamentService.getAll).toHaveBeenCalledWith(1, 100, { scope: 'archived' })
    );
  });

  it('muestra el spinner mientras carga', () => {
    tournamentService.getAll.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('lista los torneos con sus fechas y cantidad de equipos', async () => {
    renderPage();
    expect(await screen.findByText('Torneo Otoño')).toBeInTheDocument();
    expect(screen.getByText('01/03/2026')).toBeInTheDocument();
    expect(screen.getByText('30/11/2026')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('avisa cuando no hay torneos', async () => {
    tournamentService.getAll.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('Sin torneos')).toBeInTheDocument();
  });

  it('filtra por nombre al escribir en el buscador', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Torneo Otoño');

    await user.type(screen.getByPlaceholderText('Buscar torneo por nombre...'), 'primavera');

    await waitFor(() => expect(screen.queryByText('Torneo Otoño')).not.toBeInTheDocument());
    expect(screen.getByText('Copa Primavera')).toBeInTheDocument();
  });

  it('la busqueda no distingue mayusculas', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Torneo Otoño');

    await user.type(screen.getByPlaceholderText('Buscar torneo por nombre...'), 'OTOÑO');

    expect(screen.getByText('Torneo Otoño')).toBeInTheDocument();
    expect(screen.queryByText('Copa Primavera')).not.toBeInTheDocument();
  });

  it('distingue el mensaje de sin resultados del de sin torneos', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Torneo Otoño');

    await user.type(screen.getByPlaceholderText('Buscar torneo por nombre...'), 'zzzz');

    expect(await screen.findByText('Sin resultados para la búsqueda')).toBeInTheDocument();
  });

  it('muestra el error de carga', async () => {
    tournamentService.getAll.mockRejectedValue(new Error('Sin permisos'));
    renderPage();
    expect(await screen.findByText('Sin permisos')).toBeInTheDocument();
  });

  it('usa un texto por defecto si el error no trae mensaje', async () => {
    tournamentService.getAll.mockRejectedValue(new Error(''));
    renderPage();
    expect(await screen.findByText('Error al cargar torneos')).toBeInTheDocument();
  });

  it('colorea el badge segun el estado', async () => {
    const COLORES = { Finalizado: '#2196f3', 'En Progreso': '#22c55e' };
    renderPage();
    await screen.findByText('Torneo Otoño');
    const tabla = within(screen.getByRole('table'));

    for (const [estado, color] of Object.entries(COLORES)) {
      expect(tabla.getByText(estado).closest('span')).toHaveStyle({ backgroundColor: color });
    }
  });

  it('un estado desconocido queda en amarillo', async () => {
    tournamentService.getAll.mockResolvedValue([{ id_torneo: 1, nombre: 'X', estado: 'Rareza' }]);
    renderPage();
    const tabla = within(await screen.findByRole('table'));
    expect(tabla.getByText('Rareza').closest('span')).toHaveStyle({ backgroundColor: '#f59e0b' });
  });

  it('navega a ver, volver y crear', async () => {
    const onNavigate = vi.fn();
    renderPage({ onNavigate });
    const fila = (await screen.findByText('Torneo Otoño')).closest('tr');

    await userEvent.click(within(fila).getAllByRole('button')[0]);
    expect(onNavigate).toHaveBeenCalledWith('tournaments-view/1');

    await userEvent.click(screen.getByRole('button', { name: /volver/i }));
    expect(onNavigate).toHaveBeenCalledWith('tournaments');

    await userEvent.click(screen.getByRole('button', { name: /nuevo torneo/i }));
    expect(onNavigate).toHaveBeenCalledWith('tournaments-new');
  });

  it('el lapiz abre un aviso antes de editar', async () => {
    renderPage();
    const fila = (await screen.findByText('Torneo Otoño')).closest('tr');
    await userEvent.click(within(fila).getAllByRole('button')[1]);

    expect(await screen.findByText('Modificar torneo')).toBeInTheDocument();
    expect(screen.getByText(/Estás por modificar el torneo "Torneo Otoño"/)).toBeInTheDocument();
    expect(screen.getByText(/Los cambios que realices se aplicarán recién/)).toBeInTheDocument();
  });

  it('confirmar la edicion navega al formulario con el id', async () => {
    const onNavigate = vi.fn();
    renderPage({ onNavigate });
    const fila = (await screen.findByText('Copa Primavera')).closest('tr');
    await userEvent.click(within(fila).getAllByRole('button')[1]);
    await userEvent.click(await screen.findByRole('button', { name: /continuar/i }));

    expect(onNavigate).toHaveBeenCalledWith('tournaments-edit/2');
  });

  it('cancelar la edicion no navega', async () => {
    const onNavigate = vi.fn();
    renderPage({ onNavigate });
    const fila = (await screen.findByText('Copa Primavera')).closest('tr');
    await userEvent.click(within(fila).getAllByRole('button')[1]);
    await userEvent.click(await screen.findByRole('button', { name: /cancelar/i }));

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('el aviso de borrado dice que no se puede deshacer', async () => {
    renderPage();
    const fila = (await screen.findByText('Torneo Otoño')).closest('tr');
    await userEvent.click(within(fila).getAllByRole('button')[2]);

    expect(await screen.findByText('Eliminar torneo')).toBeInTheDocument();
    expect(screen.getByText('Esta acción no se puede deshacer.')).toBeInTheDocument();
    expect(screen.getByText(/Se eliminarán también sus etapas/)).toBeInTheDocument();
  });

  it('elimina al confirmar', async () => {
    const user = userEvent.setup();
    renderPage();
    const fila = (await screen.findByText('Torneo Otoño')).closest('tr');
    await user.click(within(fila).getAllByRole('button')[2]);
    await user.click(await screen.findByRole('button', { name: /eliminar/i }));

    await waitFor(() => expect(tournamentService.delete).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.queryByText('Torneo Otoño')).not.toBeInTheDocument());
    expect(screen.getByText('Copa Primavera')).toBeInTheDocument();
  });

  it('no borra al cancelar', async () => {
    const user = userEvent.setup();
    renderPage();
    const fila = (await screen.findByText('Torneo Otoño')).closest('tr');
    await user.click(within(fila).getAllByRole('button')[2]);
    await user.click(await screen.findByRole('button', { name: /cancelar/i }));

    expect(tournamentService.delete).not.toHaveBeenCalled();
    expect(screen.getByText('Torneo Otoño')).toBeInTheDocument();
  });

  it('muestra el error si el borrado falla y conserva la fila', async () => {
    const user = userEvent.setup();
    tournamentService.delete.mockRejectedValue(new Error('Tiene partidos'));
    renderPage();
    const fila = (await screen.findByText('Torneo Otoño')).closest('tr');
    await user.click(within(fila).getAllByRole('button')[2]);
    await user.click(await screen.findByRole('button', { name: /eliminar/i }));

    expect(await screen.findByText('Tiene partidos')).toBeInTheDocument();
    expect(screen.getByText('Torneo Otoño')).toBeInTheDocument();
  });

  it('sustituye por guion los campos que faltan', async () => {
    tournamentService.getAll.mockResolvedValue([{ id_torneo: 1, nombre: 'Solo nombre' }]);
    renderPage();
    await screen.findByText('Solo nombre');
    expect(screen.getAllByText('-').length).toBe(4);
  });

  it('acepta los nombres de campo alternativos del historial', async () => {
    tournamentService.getAll.mockResolvedValue([{
      id: 4, name: 'Viejo', category: 'Legend', start: '2020-01-01',
      end: '2020-12-31', teams: 10, status: 'Finalizado'
    }]);
    renderPage();
    await screen.findByText('Viejo');
    expect(screen.getByText('Legend')).toBeInTheDocument();
    expect(screen.getByText('01/01/2020')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('elimina usando el id alternativo', async () => {
    const user = userEvent.setup();
    tournamentService.getAll.mockResolvedValue([{ id: 4, name: 'Viejo', status: 'Finalizado' }]);
    renderPage();
    await screen.findByText('Viejo');
    await user.click(within(screen.getByText('Viejo').closest('tr')).getAllByRole('button')[2]);
    await user.click(await screen.findByRole('button', { name: /eliminar/i }));

    await waitFor(() => expect(tournamentService.delete).toHaveBeenCalledWith(4));
  });
});
