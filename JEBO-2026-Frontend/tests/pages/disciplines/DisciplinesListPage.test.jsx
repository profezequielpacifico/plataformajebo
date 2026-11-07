import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { DisciplinesListPage } from '../../../src/pages/disciplines/DisciplinesListPage.js';
import disciplineService from '../../../src/services/disciplineService.js';

vi.mock('../../../src/services/disciplineService.js', () => ({
  default: {
    getAll: vi.fn(),
    delete: vi.fn()
  }
}));

const DISCIPLINAS = [
  { id_disciplina: 1, nombre: 'Fútbol 5', jugadores_por_equipo: 5, descripcion: 'Cancha chica' },
  { id_disciplina: 2, nombre: 'Vóley', jugadores_por_equipo: 6, descripcion: '' }
];

describe('DisciplinesListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    disciplineService.getAll.mockResolvedValue(DISCIPLINAS);
    disciplineService.delete.mockResolvedValue({});
  });

  const renderPage = (props = {}) =>
    render(<DisciplinesListPage onNavigate={vi.fn()} {...props} />);

  it('muestra el spinner mientras carga', () => {
    disciplineService.getAll.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('lista las disciplinas traidas del servicio', async () => {
    renderPage();
    expect(await screen.findByText('Fútbol 5')).toBeInTheDocument();
    expect(screen.getByText('Vóley')).toBeInTheDocument();
  });

  it('muestra los jugadores por equipo y la descripcion', async () => {
    renderPage();
    expect(await screen.findByText('5')).toBeInTheDocument();
    expect(screen.getByText('Cancha chica')).toBeInTheDocument();
  });

  it('sustituye los campos vacios por un guion', async () => {
    renderPage();
    await screen.findByText('Vóley');
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('muestra un mensaje cuando no hay disciplinas', async () => {
    disciplineService.getAll.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('Sin deportes registrados')).toBeInTheDocument();
  });

  it('muestra el error si el servicio falla', async () => {
    disciplineService.getAll.mockRejectedValue(new Error('Fallo la base'));
    renderPage();
    expect(await screen.findByText('Fallo la base')).toBeInTheDocument();
  });

  it('acepta una respuesta envuelta en data', async () => {
    disciplineService.getAll.mockResolvedValue({ data: DISCIPLINAS });
    renderPage();
    expect(await screen.findByText('Fútbol 5')).toBeInTheDocument();
  });

  it('acepta una respuesta envuelta en rows', async () => {
    disciplineService.getAll.mockResolvedValue({ rows: DISCIPLINAS });
    renderPage();
    expect(await screen.findByText('Fútbol 5')).toBeInTheDocument();
  });

  it('navega al detalle al pulsar el ojo', async () => {
    const onNavigate = vi.fn();
    renderPage({ onNavigate });
    const fila = (await screen.findByText('Fútbol 5')).closest('tr');
    await userEvent.click(fila.querySelector('button[title="Ver detalle"]'));
    expect(onNavigate).toHaveBeenCalledWith('sports-view/1');
  });

  it('navega a la edicion al pulsar el lapiz', async () => {
    const onNavigate = vi.fn();
    renderPage({ onNavigate });
    const fila = (await screen.findByText('Vóley')).closest('tr');
    const botones = fila.querySelectorAll('button');
    await userEvent.click(botones[1]);
    expect(onNavigate).toHaveBeenCalledWith('sports-edit/2');
  });

  it('navega al alta desde el boton Nuevo Deporte', async () => {
    const onNavigate = vi.fn();
    renderPage({ onNavigate });
    await screen.findByText('Fútbol 5');
    await userEvent.click(screen.getByRole('button', { name: /nuevo deporte/i }));
    expect(onNavigate).toHaveBeenCalledWith('sports-new');
  });

  it('pide confirmacion antes de eliminar', async () => {
    renderPage();
    const fila = (await screen.findByText('Fútbol 5')).closest('tr');
    await userEvent.click(fila.querySelectorAll('button')[2]);

    expect(await screen.findByText(/¿Eliminar "Fútbol 5"\?/)).toBeInTheDocument();
    expect(disciplineService.delete).not.toHaveBeenCalled();
  });

  it('elimina la disciplina al confirmar', async () => {
    const user = userEvent.setup();
    renderPage();
    const fila = (await screen.findByText('Fútbol 5')).closest('tr');
    await user.click(fila.querySelectorAll('button')[2]);

    const confirmar = await screen.findByRole('button', { name: /eliminar/i });
    await user.click(confirmar);

    await waitFor(() => expect(disciplineService.delete).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.queryByText('Fútbol 5')).not.toBeInTheDocument());
    expect(screen.getByText('Vóley')).toBeInTheDocument();
  });

  it('no borra si el usuario cancela', async () => {
    const user = userEvent.setup();
    renderPage();
    const fila = (await screen.findByText('Fútbol 5')).closest('tr');
    await user.click(fila.querySelectorAll('button')[2]);

    await screen.findByText(/¿Eliminar "Fútbol 5"\?/);
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    await waitFor(() => expect(screen.queryByText(/¿Eliminar/)).not.toBeInTheDocument());
    expect(disciplineService.delete).not.toHaveBeenCalled();
    expect(screen.getByText('Fútbol 5')).toBeInTheDocument();
  });

  it('muestra el error si el borrado falla y conserva la fila', async () => {
    const user = userEvent.setup();
    disciplineService.delete.mockRejectedValue(new Error('No se pudo eliminar'));
    renderPage();
    const fila = (await screen.findByText('Fútbol 5')).closest('tr');
    await user.click(fila.querySelectorAll('button')[2]);
    await user.click(await screen.findByRole('button', { name: /eliminar/i }));

    expect(await screen.findByText('No se pudo eliminar')).toBeInTheDocument();
    expect(screen.getByText('Fútbol 5')).toBeInTheDocument();
  });

  it('no rompe si onNavigate no viene', async () => {
    disciplineService.getAll.mockResolvedValue([]);
    render(<DisciplinesListPage />);
    expect(await screen.findByText('Sin deportes registrados')).toBeInTheDocument();
  });
});
