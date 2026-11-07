import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { TeamFormPage } from '../../../src/pages/teams/TeamFormPage.js';
import teamService from '../../../src/services/teamService.js';
import institutionService from '../../../src/services/institutionService.js';
import disciplineService from '../../../src/services/disciplineService.js';
import userService from '../../../src/services/userService.js';
import districtService from '../../../src/services/districtService.js';
import localityService from '../../../src/services/localityService.js';

vi.mock('../../../src/services/teamService.js', () => ({
  default: { create: vi.fn(), update: vi.fn(), getById: vi.fn(), getAll: vi.fn() }
}));
vi.mock('../../../src/services/institutionService.js', () => ({
  default: { getAll: vi.fn() }
}));
vi.mock('../../../src/services/disciplineService.js', () => ({
  default: { getAll: vi.fn() }
}));
vi.mock('../../../src/services/userService.js', () => ({
  default: { getAll: vi.fn() }
}));
vi.mock('../../../src/services/districtService.js', () => ({
  default: { getAll: vi.fn() }
}));
vi.mock('../../../src/services/localityService.js', () => ({
  default: { getAll: vi.fn() }
}));

const DISCIPLINAS = [
  { id_disciplina: 1, nombre: 'Fútbol 5' },
  { id_disciplina: 2, nombre: 'Gimnasia Artística' }
];

describe('TeamFormPage', () => {
  let onNavigate;

  beforeEach(() => {
    vi.clearAllMocks();
    onNavigate = vi.fn();
    institutionService.getAll.mockResolvedValue([{ id_institucion: 1, nombre: 'Club Norte' }]);
    disciplineService.getAll.mockResolvedValue(DISCIPLINAS);
    userService.getAll.mockResolvedValue([{ id_usuario: 6, nombre: 'Profesor Diaz' }]);
    districtService.getAll.mockResolvedValue([{ id_distrito: 1, nombre: 'Centro' }]);
    localityService.getAll.mockResolvedValue([{ id_localidad: 1, id_distrito: 1, nombre: 'Palermo' }]);
    teamService.create.mockResolvedValue({ success: true });
  });

  const renderPage = (props = {}) =>
    render(<TeamFormPage onNavigate={onNavigate} {...props} />);

  it('es la pantalla de alta, no un listado', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Alta de Equipo' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('ofrece solo las disciplinas ya creadas', async () => {
    renderPage();
    const select = await screen.findByLabelText('Disciplina *');
    const opciones = [...select.querySelectorAll('option')].map(o => o.textContent);

    expect(opciones).toEqual(['Seleccione disciplina', 'Fútbol 5', 'Gimnasia Artística']);
  });

  it('pide la disciplina al servidor con ?rol=Profesor y no trae todos los usuarios', async () => {
    renderPage();
    await screen.findByLabelText('Disciplina *');

    expect(userService.getAll).toHaveBeenCalledWith({ rol: 'Profesor' });
  });

  it('avisa cuando no hay ninguna disciplina cargada', async () => {
    disciplineService.getAll.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText(/No hay disciplinas cargadas/)).toBeInTheDocument();
  });

  it('crea el equipo con la disciplina elegida', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('Nombre del Equipo *'), 'Trío F');
    await user.selectOptions(screen.getByLabelText('Disciplina *'), '2');
    await user.selectOptions(screen.getByLabelText('Institución *'), '1');
    await user.selectOptions(screen.getByLabelText('Profesor del equipo *'), '6');
    await user.click(screen.getByRole('button', { name: /Guardar Equipo/ }));

    expect(teamService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Trío F',
        id_disciplina: '2',
        id_institucion: '1',
        id_usuario: '6'
      })
    );
  });

  it('no manda id_localidad vacio como string', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText('Nombre del Equipo *'), 'Trío F');
    await user.selectOptions(screen.getByLabelText('Disciplina *'), '2');
    await user.selectOptions(screen.getByLabelText('Institución *'), '1');
    await user.selectOptions(screen.getByLabelText('Profesor del equipo *'), '6');
    await user.click(screen.getByRole('button', { name: /Guardar Equipo/ }));

    expect(teamService.create.mock.calls[0][0].id_localidad).toBeUndefined();
  });

  it('muestra el error del backend sin perder lo ya cargado', async () => {
    const user = userEvent.setup();
    teamService.create.mockRejectedValue(new Error('disciplina invalida'));
    renderPage();

    await user.type(await screen.findByLabelText('Nombre del Equipo *'), 'Trío F');
    await user.selectOptions(screen.getByLabelText('Disciplina *'), '2');
    await user.selectOptions(screen.getByLabelText('Institución *'), '1');
    await user.selectOptions(screen.getByLabelText('Profesor del equipo *'), '6');
    await user.click(screen.getByRole('button', { name: /Guardar Equipo/ }));

    expect(await screen.findByText(/disciplina invalida/)).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre del Equipo *')).toHaveValue('Trío F');
  });

  it('vuelve a la consulta con el boton Cancelar', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(onNavigate).toHaveBeenCalledWith('teams');
  });

  it('sigue respetando la edicion por URL sin exponerla en el menu', async () => {
    teamService.getById.mockResolvedValue({
      data: { id_equipo: 39, nombre: 'Trío A', id_disciplina: 2, id_institucion: 1, id_usuario: 6 }
    });
    renderPage({ pageParams: { id: '39' } });

    expect(await screen.findByRole('heading', { name: 'Editar Equipo' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Nombre del Equipo *')).toHaveValue('Trío A');
  });
});
