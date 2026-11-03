import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CourtListPage } from '../../../src/pages/courts/CourtListPage.js';
import { courtService } from '../../../src/services/courtService.js';

vi.mock('../../../src/services/courtService.js', () => ({
  courtService: {
    getAll: vi.fn(),
    delete: vi.fn()
  }
}));

const CANCHAS = [
  { id_cancha: 1, nombre: 'Cancha 1', ubicacion: 'Barrio Norte', disciplina_nombre: 'Fútbol 5' },
  { id_cancha: 2, nombre: 'Cancha 2', ubicacion: '', disciplina_nombre: '' }
];

describe('CourtListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    courtService.getAll.mockResolvedValue(CANCHAS);
    courtService.delete.mockResolvedValue({});
  });

  const renderPage = (props = {}) =>
    render(<CourtListPage onNavigate={vi.fn()} {...props} />);

  it('muestra el spinner mientras carga', () => {
    courtService.getAll.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('lista las canchas', async () => {
    renderPage();
    expect(await screen.findByText('Cancha 1')).toBeInTheDocument();
    expect(screen.getByText('Cancha 2')).toBeInTheDocument();
  });

  it('muestra ubicacion y disciplina', async () => {
    renderPage();
    expect(await screen.findByText('Barrio Norte')).toBeInTheDocument();
    expect(screen.getByText('Fútbol 5')).toBeInTheDocument();
  });

  it('sustituye los campos vacios por un guion', async () => {
    renderPage();
    await screen.findByText('Cancha 1');
    expect(screen.getAllByText('-').length).toBe(2);
  });

  it('avisa cuando no hay canchas', async () => {
    courtService.getAll.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('No hay canchas registradas')).toBeInTheDocument();
  });

  it('muestra un texto por defecto si el error no trae mensaje', async () => {
    // courtService puede rechazar con un error sin message si algo fallo antes
    // de construirlo; la pagina tiene que mostrar algo legible igual.
    courtService.getAll.mockRejectedValue(new Error(''));
    renderPage();
    expect(await screen.findByText('Error al cargar')).toBeInTheDocument();
  });

  it('muestra el mensaje real del error', async () => {
    courtService.getAll.mockRejectedValue(new Error('Timeout del servidor'));
    renderPage();
    expect(await screen.findByText('Timeout del servidor')).toBeInTheDocument();
  });

  it('acepta las tres formas de respuesta del servicio', async () => {
    // La pagina normaliza array plano, { data } y { rows } para no romperse si
    // el backend cambia la envoltura.
    for (const envoltura of [CANCHAS, { data: CANCHAS }, { rows: CANCHAS }]) {
      courtService.getAll.mockResolvedValue(envoltura);
      const { unmount } = renderPage();
      expect(await screen.findByText('Cancha 1')).toBeInTheDocument();
      unmount();
    }
  });

  it('navega al alta', async () => {
    const onNavigate = vi.fn();
    renderPage({ onNavigate });
    await screen.findByText('Cancha 1');
    await userEvent.click(screen.getByRole('button', { name: /nueva cancha/i }));
    expect(onNavigate).toHaveBeenCalledWith('courts-new');
  });

  it('navega a la edicion con el id en la ruta', async () => {
    const onNavigate = vi.fn();
    renderPage({ onNavigate });
    const fila = (await screen.findByText('Cancha 2')).closest('tr');
    await userEvent.click(fila.querySelectorAll('button')[0]);
    expect(onNavigate).toHaveBeenCalledWith('courts-edit/2');
  });

  it('pide confirmacion antes de eliminar', async () => {
    renderPage();
    const fila = (await screen.findByText('Cancha 1')).closest('tr');
    await userEvent.click(fila.querySelectorAll('button')[1]);

    expect(await screen.findByText(/¿Eliminar "Cancha 1"\?/)).toBeInTheDocument();
    expect(courtService.delete).not.toHaveBeenCalled();
  });

  it('elimina al confirmar', async () => {
    const user = userEvent.setup();
    renderPage();
    const fila = (await screen.findByText('Cancha 1')).closest('tr');
    await user.click(fila.querySelectorAll('button')[1]);
    await user.click(await screen.findByRole('button', { name: /eliminar/i }));

    await waitFor(() => expect(courtService.delete).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.queryByText('Cancha 1')).not.toBeInTheDocument());
    expect(screen.getByText('Cancha 2')).toBeInTheDocument();
  });

  it('no borra al cancelar', async () => {
    const user = userEvent.setup();
    renderPage();
    const fila = (await screen.findByText('Cancha 1')).closest('tr');
    await user.click(fila.querySelectorAll('button')[1]);
    await screen.findByText(/¿Eliminar "Cancha 1"\?/);
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    await waitFor(() => expect(screen.queryByText(/¿Eliminar/)).not.toBeInTheDocument());
    expect(courtService.delete).not.toHaveBeenCalled();
  });

  it('muestra un texto por defecto si el borrado falla sin mensaje', async () => {
    const user = userEvent.setup();
    courtService.delete.mockRejectedValue(new Error(''));
    renderPage();
    const fila = (await screen.findByText('Cancha 1')).closest('tr');
    await user.click(fila.querySelectorAll('button')[1]);
    await user.click(await screen.findByRole('button', { name: /eliminar/i }));

    expect(await screen.findByText('Error al eliminar')).toBeInTheDocument();
    expect(screen.getByText('Cancha 1')).toBeInTheDocument();
  });

  it('muestra el mensaje real si el borrado falla', async () => {
    const user = userEvent.setup();
    courtService.delete.mockRejectedValue(new Error('Cancha con partidos'));
    renderPage();
    const fila = (await screen.findByText('Cancha 1')).closest('tr');
    await user.click(fila.querySelectorAll('button')[1]);
    await user.click(await screen.findByRole('button', { name: /eliminar/i }));

    expect(await screen.findByText('Cancha con partidos')).toBeInTheDocument();
  });

  it('usa el campo id si la cancha viene con esa forma', async () => {
    // Las respuestas del backend alternan entre id e id_cancha segun el endpoint.
    courtService.getAll.mockResolvedValue([{ id: 7, nombre: 'Cancha vieja', name: 'Cancha vieja' }]);
    renderPage();
    await screen.findByText('Cancha vieja');
    const fila = screen.getByText('Cancha vieja').closest('tr');
    await userEvent.click(fila.querySelectorAll('button')[1]);
    await userEvent.click(await screen.findByRole('button', { name: /eliminar/i }));

    await waitFor(() => expect(courtService.delete).toHaveBeenCalledWith(7));
  });
});
