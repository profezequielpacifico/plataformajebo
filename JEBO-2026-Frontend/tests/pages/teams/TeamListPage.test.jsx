import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { TeamListPage } from '../../../src/pages/teams/TeamListPage.js';
import { teamService } from '../../../src/services/teamService.js';
import disciplineService from '../../../src/services/disciplineService.js';
import { ROLE_IDS } from '../../../src/config/constants.js';

// La pagina habla con la API solo a traves de los servicios, asi que el mock
// queda en esa capa: los tests ejercitan el render real sin tocar fetch.
vi.mock('../../../src/services/teamService.js', () => ({
  teamService: { getAll: vi.fn() },
  default: { getAll: vi.fn() }
}));
vi.mock('../../../src/services/disciplineService.js', () => ({
  default: { getAll: vi.fn() }
}));

const DISCIPLINAS = [
  { id_disciplina: 1, nombre: 'Fútbol 5' },
  { id_disciplina: 2, nombre: 'Gimnasia Artística' }
];

const equipo = (over) => ({
  id_equipo: 39,
  nombre: 'Trío A',
  disciplina_nombre: 'Gimnasia Artística',
  entrenador: 'Liparelli',
  cantidad_jugadores: 3,
  institucion: 'Club Norte',
  distrito: 'Centro',
  torneo_nombre: 'Torneo 32',
  ...over
});

/** Respuesta paginada de `GET /teams`. */
const pagina = (data, total, page = 1, limit = 10) => ({
  success: true,
  data,
  pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
});

describe('TeamListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    disciplineService.getAll.mockResolvedValue(DISCIPLINAS);
    teamService.getAll.mockResolvedValue(pagina([equipo()], 18));
  });

  const renderPage = (props = {}) => render(<TeamListPage {...props} />);

  it('muestra el spinner mientras carga', () => {
    teamService.getAll.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Cargando equipos...')).toBeInTheDocument();
  });

  it('lista los equipos con su disciplina, institution y torneo', async () => {
    renderPage();
    expect(await screen.findByText('Trío A')).toBeInTheDocument();

    // Acotado a la tabla: 'Gimnasia Artística' tambien esta en el desplegable
    // de disciplinas y `getByText` tiraria por los dos.
    const tabla = within(screen.getByRole('table'));
    expect(tabla.getByText('Gimnasia Artística')).toBeInTheDocument();
    expect(tabla.getByText('Club Norte')).toBeInTheDocument();
    expect(tabla.getByText('Centro')).toBeInTheDocument();
    expect(tabla.getByText('Torneo 32')).toBeInTheDocument();
  });

  // El bug que motivo el desdoblamiento: sin `page`/`limit` el backend usa
  // limit=10 y de 18 equipos solo se veian los de Futbol. Los de Gimnasia
  // quedaban en la pagina 2, que la pantalla anterior no tenia forma de pedir.
  it('pide la primera pagina con limite explicito', async () => {
    renderPage();
    await screen.findByText('Trío A');
    expect(teamService.getAll).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 10 }));
  });

  it('avanza de pagina al tocar el boton de la pagina 2', async () => {
    const user = userEvent.setup();
    teamService.getAll.mockResolvedValue(pagina([equipo()], 18, 1, 10));
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Pagina 2' }));

    expect(teamService.getAll).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, limit: 10 }));
  });

  it('muestra el rango real y no se queda corto en la ultima pagina', async () => {
    // 23 equipos con limit=10: la pagina 3 trae 3 filas. El pie tiene que
    // decir 21-23, no "mostrando 21-30 de 23" — sale de `total` recortado por
    // la pagina, no de `page * limit` a pelo ni del largo del arreglo.
    const user = userEvent.setup();
    teamService.getAll.mockResolvedValue(pagina([equipo()], 23, 1, 10));
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Pagina 3' }));

    expect(await screen.findByText('Mostrando 21-23 de 23 equipos')).toBeInTheDocument();
  });

  it('recorta el rango por el total cuando la pagina trae menos que el limite', async () => {
    // Sin este recorte el pie decia "1-10 de 2".
    teamService.getAll.mockResolvedValue(pagina([equipo(), equipo({ id_equipo: 40, nombre: 'Trío B' })], 2, 1, 10));
    renderPage();

    expect(await screen.findByText('Mostrando 1-2 de 2 equipos')).toBeInTheDocument();
  });

  it('cambiar la cantidad por pagina vuelve a la pagina 1', async () => {
    const user = userEvent.setup();
    teamService.getAll.mockResolvedValue(pagina([equipo()], 23, 1, 10));
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Pagina 3' }));
    expect(teamService.getAll).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3, limit: 10 }));

    await user.selectOptions(screen.getByLabelText('Equipos por pagina'), '25');

    expect(teamService.getAll).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, limit: 25 }));
  });

  it('filtra por disciplina y vuelve a la pagina 1', async () => {
    const user = userEvent.setup();
    teamService.getAll.mockResolvedValue(pagina([equipo()], 30));
    renderPage();

    await screen.findByText('Trío A');
    await user.click(await screen.findByRole('button', { name: 'Pagina 3' }));
    expect(teamService.getAll).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3 }));

    await user.selectOptions(screen.getByLabelText('Filtrar por disciplina'), '2');

    expect(teamService.getAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ id_disciplina: '2', page: 1 })
    );
  });

  it('no manda id_disciplina vacio ni search sin aplicar', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Trío A');

    // Escribir NO dispara consulta: el termino se aplica al enviar el form.
    await user.type(screen.getByLabelText('Buscar equipo'), 'Trío');
    expect(teamService.getAll).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(teamService.getAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'Trío', filter: 'nombre' })
    );
  });

  it('el boton Limpiar borra la busqueda y el filtro de disciplina', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Trío A');

    await user.selectOptions(screen.getByLabelText('Filtrar por disciplina'), '2');
    await user.type(screen.getByLabelText('Buscar equipo'), 'Trío');
    await user.click(screen.getByRole('button', { name: 'Limpiar' }));
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    const ultima = teamService.getAll.mock.calls.at(-1)[0];
    expect(ultima.search).toBeUndefined();
    expect(ultima.id_disciplina).toBeUndefined();
  });

  it('tolera que la API responda un array plano sin envelope de paginacion', async () => {
    // `/teams` responde {data, pagination}, pero un mock o una version vieja
    // pueden devolver el array. Sin fallback la tabla queda vacia con la
    // respuesta correcta en la mano.
    teamService.getAll.mockResolvedValue([equipo(), equipo({ id_equipo: 40, nombre: 'Trío B' })]);
    renderPage();

    expect(await screen.findByText('Trío A')).toBeInTheDocument();
    expect(screen.getByText('Trío B')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 1-2 de 2 equipos')).toBeInTheDocument();
  });

  it('muestra el error y vacia la tabla si la consulta falla', async () => {
    teamService.getAll.mockRejectedValueOnce(new Error('boom'));
    renderPage();

    expect(await screen.findByText('boom')).toBeInTheDocument();
    expect(screen.getByText('No se encontraron equipos')).toBeInTheDocument();
  });

  // Contrato de la pagina: la consulta NO crea ni borra. La columna Acciones
  // existe (alta y edicion viven en TeamFormPage), pero el boton de editar
  // solo aparece para quien tiene permiso: Admin/SuperAdmin siempre,
  // Profesor solo si es entrenador del equipo. Sin permisos no hay acciones.
  it('no ofrece crear ni eliminar, y sin permisos no muestra acciones', async () => {
    renderPage();
    await screen.findByText('Trío A');

    expect(screen.queryByRole('button', { name: /Nuevo Equipo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Alta de Equipo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument();

    const tabla = within(screen.getByRole('table'));
    expect(tabla.getByRole('columnheader', { name: 'Acciones' })).toBeInTheDocument();
    expect(tabla.queryByRole('button')).not.toBeInTheDocument();
  });

  it('un admin puede editar cualquier equipo y navega al form de edicion', async () => {
    const onNavigate = vi.fn();
    renderPage({ user: { id_rol: ROLE_IDS.ADMINISTRADOR, id_usuario: 7 }, onNavigate });
    await screen.findByText('Trío A');

    const editar = screen.getByRole('button', { name: 'Editar Trío A' });
    await userEvent.setup().click(editar);

    expect(onNavigate).toHaveBeenCalledWith('teams-edit/39');
  });

  it('un profesor solo edita el equipo del que es entrenador', async () => {
    teamService.getAll.mockResolvedValue(pagina([
      equipo({ id_usuario: 55 }),
      equipo({ id_equipo: 40, nombre: 'Trío B', id_usuario: 99 })
    ], 2));
    renderPage({ user: { id_rol: ROLE_IDS.PROFESOR, id_usuario: 55 } });
    await screen.findByText('Trío A');

    expect(screen.getByRole('button', { name: 'Editar Trío A' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar Trío B' })).not.toBeInTheDocument();
  });

  it('no llama a teamService.create/update/delete en toda la sesion', async () => {
    renderPage();
    await screen.findByText('Trío A');
    // Si el service no tiene esos metodos, un click que los use reventaria el
    // test antes de poder hacer nada sospechoso.
    expect(teamService.create).toBeUndefined();
    expect(teamService.update).toBeUndefined();
    expect(teamService.delete).toBeUndefined();
  });
});
