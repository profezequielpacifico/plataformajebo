import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { MatchListPage } from '../../../src/pages/matches/MatchListPage.js';
import matchService from '../../../src/services/matchService.js';
import tournamentService from '../../../src/services/tournamentService.js';

vi.mock('../../../src/services/matchService.js', () => ({
  default: { getAll: vi.fn(), delete: vi.fn() }
}));
vi.mock('../../../src/services/tournamentService.js', () => ({
  default: { getAll: vi.fn() }
}));

const PARTIDOS = [
  {
    id_partido: 1,
    fecha: '2026-10-05T00:00:00.000Z',
    hora: '18:00',
    cancha_nombre: 'Cancha 1',
    torneo: 'Torneo Otoño',
    equipo_local_nombre: 'Local FC',
    equipo_visitante_nombre: 'Visitante FC',
    arbitros: [{ nombre: 'Ana' }, { nombre: 'Luis' }],
    estado: 'Finalizado',
    goles_local: 3,
    goles_visitante: 1
  },
  {
    id_partido: 2,
    fecha: null,
    hora: null,
    estado: 'Pendiente',
    equipo_local: 'A',
    equipo_visitante: 'B',
    arbitros: [],
    goles_local: null
  }
];

const TORNEOS = [
  { id_torneo: 1, nombre: 'Torneo Otoño', disciplina_nombre: 'Fútbol 5' },
  { id_torneo: 2, nombre: 'Copa Primavera', disciplina_nombre: 'Vóley' }
];

describe('MatchListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    matchService.getAll.mockResolvedValue(PARTIDOS);
    matchService.delete.mockResolvedValue({});
    tournamentService.getAll.mockResolvedValue({ data: TORNEOS });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  const renderPage = (props = {}) =>
    render(<MatchListPage onNavigate={vi.fn()} {...props} />);

  it('pide los partidos al montar', async () => {
    renderPage();
    await waitFor(() => expect(matchService.getAll).toHaveBeenCalled());
    expect(matchService.getAll).toHaveBeenCalledWith({ limit: 100 });
  });

  it('muestra el spinner en la tabla mientras carga', () => {
    matchService.getAll.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getAllByText('Cargando...').length).toBeGreaterThan(0);
  });

  it('lista los partidos con equipos, cancha y torneo', async () => {
    renderPage();
    expect(await screen.findByText('Local FC')).toBeInTheDocument();
    expect(screen.getByText('Visitante FC')).toBeInTheDocument();
    expect(screen.getByText('Cancha 1')).toBeInTheDocument();
    expect(screen.getByText('Torneo Otoño')).toBeInTheDocument();
  });

  it('muestra la fecha en formato local', async () => {
    renderPage();
    await screen.findByText('Local FC');
    const esperada = new Date('2026-10-05T00:00:00.000Z').toLocaleDateString('es-ES');
    expect(screen.getByText(esperada)).toBeInTheDocument();
  });

  it('sustituye por raya lo que falta', async () => {
    // La segunda fila llega sin fecha, hora ni cancha: la tabla tiene que
    // seguir alineada, con guiones en vez de celdas vacias.
    renderPage();
    await screen.findByText('Local FC');
    expect(screen.getAllByText('—').length).toBeGreaterThan(3);
  });

  it('muestra el resultado solo si hay goles', async () => {
    renderPage();
    expect(await screen.findByText('3 - 1')).toBeInTheDocument();
  });

  it('no inventa un resultado cuando los goles son null', async () => {
    // Un partido sin goles registrados no es un 0-0: es un partido sin jugar.
    renderPage();
    await screen.findByText('Local FC');
    expect(screen.queryByText('0 - 0')).not.toBeInTheDocument();
  });

  it('concatena los arbitros de un array', async () => {
    renderPage();
    expect(await screen.findByText('Ana, Luis')).toBeInTheDocument();
  });

  it('pone raya cuando no hay arbitros', async () => {
    renderPage();
    await screen.findByText('Local FC');
    const fila2 = screen.getByText('A').closest('tr');
    expect(within(fila2).getAllByText('—').length).toBeGreaterThan(0);
  });

  it('acepta arbitros como texto plano', async () => {
    matchService.getAll.mockResolvedValue([
      { id_partido: 9, estado: 'Pendiente', arbitros: 'Tercero Arbol' }
    ]);
    renderPage();
    expect(await screen.findByText('Tercero Arbol')).toBeInTheDocument();
  });

  it('muestra un mensaje cuando no hay partidos', async () => {
    matchService.getAll.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('No hay partidos')).toBeInTheDocument();
  });

  it('avisa cuando la carga de partidos falla', async () => {
    // A diferencia de otras paginas, aca el error solo va a la consola; la
    // tabla queda vacia. Se documenta el comportamiento real.
    matchService.getAll.mockRejectedValue(new Error('Fallo la API'));
    renderPage();
    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(await screen.findByText('No hay partidos')).toBeInTheDocument();
  });

  it('carga los torneos para el filtro', async () => {
    renderPage();
    await waitFor(() => expect(tournamentService.getAll).toHaveBeenCalledWith(1, 100));
    expect(await screen.findByRole('option', { name: /Torneo Otoño \(Fútbol 5\)/ })).toBeInTheDocument();
  });

  it('un fallo al cargar los torneos no rompe la pagina', async () => {
    tournamentService.getAll.mockRejectedValue(new Error('sin torneos'));
    renderPage();
    expect(await screen.findByText('Local FC')).toBeInTheDocument();
  });

  it('filtra por estado al cambiar el select', async () => {
    renderPage();
    await screen.findByText('Local FC');
    await userEvent.selectOptions(screen.getByDisplayValue('Todos los estados'), 'Pendiente');

    await waitFor(() =>
      expect(matchService.getAll).toHaveBeenCalledWith({ limit: 100, estado: 'Pendiente' })
    );
  });

  it('filtra por torneo al cambiar el select', async () => {
    renderPage();
    await screen.findByText('Local FC');
    await userEvent.selectOptions(screen.getByDisplayValue('Todos los torneos'), '1');

    await waitFor(() =>
      expect(matchService.getAll).toHaveBeenCalledWith({ limit: 100, id_torneo: '1' })
    );
  });

  it('combina ambos filtros', async () => {
    renderPage();
    await screen.findByText('Local FC');
    await userEvent.selectOptions(screen.getByDisplayValue('Todos los torneos'), '1');
    await userEvent.selectOptions(screen.getByDisplayValue('Todos los estados'), 'Finalizado');

    await waitFor(() =>
      expect(matchService.getAll).toHaveBeenCalledWith({
        limit: 100, estado: 'Finalizado', id_torneo: '1'
      })
    );
  });

  it('navega al alta, al detalle y a la edicion', async () => {
    const onNavigate = vi.fn();
    renderPage({ onNavigate });
    const fila = (await screen.findByText('Local FC')).closest('tr');
    const botones = within(fila).getAllByRole('button');

    await userEvent.click(screen.getByRole('button', { name: /nuevo partido/i }));
    await userEvent.click(botones[0]);
    await userEvent.click(botones[1]);

    expect(onNavigate).toHaveBeenCalledWith('matches-new');
    expect(onNavigate).toHaveBeenCalledWith('matches-detail/1');
    expect(onNavigate).toHaveBeenCalledWith('matches-edit/1');
  });

  it('elimina el partido si se confirma', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();
    const fila = (await screen.findByText('Local FC')).closest('tr');
    await userEvent.click(within(fila).getAllByRole('button')[2]);

    await waitFor(() => expect(matchService.delete).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.queryByText('Local FC')).not.toBeInTheDocument());
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('no borra si el usuario cancela la confirmacion', async () => {
    // Se usa confirm() nativo, no un modal: si el usuario dice que no, no debe
    // llegar una llamada de borrado.
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage();
    const fila = (await screen.findByText('Local FC')).closest('tr');
    await userEvent.click(within(fila).getAllByRole('button')[2]);

    expect(matchService.delete).not.toHaveBeenCalled();
    expect(screen.getByText('Local FC')).toBeInTheDocument();
  });

  it('un fallo al borrar deja el partido en la lista', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    matchService.delete.mockRejectedValue(new Error('Partido con resultados'));
    renderPage();
    const fila = (await screen.findByText('Local FC')).closest('tr');
    await userEvent.click(within(fila).getAllByRole('button')[2]);

    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(screen.getByText('Local FC')).toBeInTheDocument();
  });

  it('colorea el badge segun el estado', async () => {
    // getBadgeVariant mapea el texto del estado a un color. Se comprueba el
    // color real del span, no solo que el texto exista: el filtro de estados
    // tiene options con los mismos textos, asi que hay que acotar a la tabla.
    const COLORES = {
      Finalizado: '#2196f3',   // blue
      Pendiente: '#ff9800'     // orange
    };
    renderPage();
    await screen.findByText('Local FC');

    for (const [estado, color] of Object.entries(COLORES)) {
      const badge = within(screen.getByRole('table')).getByText(estado).closest('span');
      expect(badge).toHaveStyle({ backgroundColor: color });
    }
  });

  it('mapa cada estado a su color en la lista', async () => {
    // Se recorre la tabla entera con un partido por estado para cubrir todos
    // los brazos del mapeo de una sola vez.
    const ESPERADOS = {
      'Finalizado': '#2196f3',
      'En Juego': '#22c55e',
      'Cancelado': '#f44336',
      'Pendiente': '#ff9800',
      'Programado': '#f59e0b'
    };
    matchService.getAll.mockResolvedValue(
      Object.keys(ESPERADOS).map((estado, i) => ({ id_partido: i + 1, estado }))
    );
    renderPage();

    await screen.findByText('Finalizado');
    const tabla = within(screen.getByRole('table'));
    for (const [estado, color] of Object.entries(ESPERADOS)) {
      expect(tabla.getByText(estado).closest('span')).toHaveStyle({ backgroundColor: color });
    }
  });

  it('un estado desconocido cae en el color por defecto', async () => {
    matchService.getAll.mockResolvedValue([{ id_partido: 1, estado: 'Cachoeira' }]);
    renderPage();
    const badge = within(await screen.findByRole('table')).getByText('Cachoeira').closest('span');
    expect(badge).toHaveStyle({ backgroundColor: '#f59e0b' });
  });

  it('usa el campo status como respaldo del estado', async () => {
    matchService.getAll.mockResolvedValue([{ id_partido: 3, status: 'Cancelado' }]);
    renderPage();
    expect(await screen.findByText('Cancelado')).toBeInTheDocument();
  });

  it('muestra raya si el partido no trae estado', async () => {
    matchService.getAll.mockResolvedValue([{ id_partido: 4 }]);
    renderPage();
    await waitFor(() => expect(matchService.getAll).toHaveBeenCalled());
    expect(await screen.findAllByText('—')).toBeTruthy();
  });

  it('acepta respuestas envueltas en data', async () => {
    matchService.getAll.mockResolvedValue({ data: PARTIDOS });
    renderPage();
    expect(await screen.findByText('Local FC')).toBeInTheDocument();
  });

  it('tolera que la API devuelva algo que no es una lista', async () => {
    matchService.getAll.mockResolvedValue({ data: 'no soy una lista' });
    renderPage();
    expect(await screen.findByText('No hay partidos')).toBeInTheDocument();
  });

  // Un torneo de Gimnasia Artística no tiene partidos: se presenta un equipo
  // solo y lo evalúa un jurado. Listarlo en este filtro ofrecía una opción que
  // siempre devolvía vacío y, si se llegaba al alta, un 409 explicando el
  // modelo equivocado.
  describe('torneos de tipo EVALUACION (Gimnasia)', () => {
    const CON_GIMNASIA = [
      ...TORNEOS,
      {
        id_torneo: 32,
        nombre: 'Torneo Gimnasia JEBO 2026',
        disciplina_nombre: 'Gimnasia Artística',
        tipo_competencia: 'EVALUACION'
      }
    ];

    it('no ofrece el torneo de Gimnasia en el filtro', async () => {
      tournamentService.getAll.mockResolvedValue({ data: CON_GIMNASIA });
      renderPage();

      const select = await screen.findByDisplayValue('Todos los torneos');
      const labels = within(select).getAllByRole('option').map(o => o.textContent);

      expect(labels.some(l => l.includes('Gimnasia'))).toBe(false);
    });

    it('deja los torneos de fútbol y los que no traen tipo', async () => {
      tournamentService.getAll.mockResolvedValue({ data: CON_GIMNASIA });
      renderPage();

      const select = await screen.findByDisplayValue('Todos los torneos');
      const labels = within(select).getAllByRole('option').map(o => o.textContent);

      expect(labels.some(l => l.includes('Torneo Otoño'))).toBe(true);
      expect(labels.some(l => l.includes('Copa Primavera'))).toBe(true);
    });

    it('no manda el torneo de Gimnasia como filtro de la consulta', async () => {
      tournamentService.getAll.mockResolvedValue({ data: CON_GIMNASIA });
      matchService.getAll.mockResolvedValue([]);
      renderPage();

      await waitFor(() => expect(matchService.getAll).toHaveBeenCalled());
      for (const llamada of matchService.getAll.mock.calls) {
        expect(llamada[0].id_torneo).not.toBe('32');
      }
    });
  });
});
