import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { TournamentFormPage } from '../../../src/pages/tournaments/TournamentFormPage.js';
import disciplineService from '../../../src/services/disciplineService.js';
import tournamentService from '../../../src/services/tournamentService.js';
import { stageService } from '../../../src/services/stageService.js';

vi.mock('../../../src/components/ui/CalendarField.js', () => {
  const { createElement: h, useRef } = globalThis.React;
  const vistos = { con: 0, sin: 0 };
  return {
    __reiniciar: () => { vistos.con = 0; vistos.sin = 0; },
    CalendarField: ({ value, onChange, disabled, withTime }) => {
      const ref = useRef(null);
      if (ref.current === null) {
        ref.current = withTime ? `inscripcion-${vistos.con++}` : `torneo-${vistos.sin++}`;
      }
      return h('input', {
        type: 'text',
        'data-testid': ref.current,
        value: value || '',
        disabled: !!disabled,
        onChange: (e) => onChange(e.target.value)
      });
    }
  };
});

const { __reiniciar: reiniciarCalendarios } = await import('../../../src/components/ui/CalendarField.js');

vi.mock('../../../src/services/disciplineService.js', () => {
  const s = { getAll: vi.fn() };
  return { default: s, disciplineService: s };
});
vi.mock('../../../src/services/tournamentService.js', () => {
  const s = { getById: vi.fn(), create: vi.fn(), update: vi.fn() };
  return { default: s, tournamentService: s };
});
vi.mock('../../../src/services/stageService.js', () => {
  const s = { getAll: vi.fn() };
  return { default: s, stageService: s };
});

const DISCIPLINAS = { data: [{ id_disciplina: 1, nombre: 'Fútbol 5' }] };

const TORNEO = {
  id_torneo: 5, nombre: 'Torneo Otoño', categoria: 'Senior', descripcion: 'El principal',
  id_disciplina: 1, id_instancia: 2,
  fecha_inicio: '2026-03-01T00:00:00.000Z', fecha_fin: '2026-06-30T00:00:00.000Z',
  fecha_inscripcion_inicio: '2026-02-01T10:00:00.000Z',
  fecha_inscripcion_fin: '2026-02-20T18:00:00.000Z'
};

const ETAPAS = [
  { id_etapa: 1, nombre: 'Local', descripcion: 'Primera etapa', fecha_inicio: '2026-03-01', fecha_fin: '2026-04-01', orden: 1, estado: 'Pendiente' }
];

const local = (yyyy_mm_dd, hhmm = '10:00') => `${yyyy_mm_dd}T${hhmm}`;

const relativo = (dias, hhmm = '10:00') => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return local(d.toISOString().slice(0, 10), hhmm);
};
const ayer = () => relativo(-1, '00:00');
const manana = () => relativo(1, '23:00');
const hace = (dias) => relativo(-dias, '10:00');

const NOMBRE_ETAPA = 'Ej: Local, Distrital, Regional...';
const DESCRIPCION_ETAPA = 'Descripción opcional de la etapa';

const abrirEditorEtapa = async (user, indice) => {
  await user.click(screen.getAllByRole('button', { name: /editar/i })[indice]);
  return screen.findByPlaceholderText(NOMBRE_ETAPA);
};

const botonDelModal = (nombre) => {
  const botones = screen.getAllByRole('button', { name: nombre });
  return botones[botones.length - 1];
};

const guardarEtapa = (user) => user.click(botonDelModal('Guardar'));

const fechasDeEtapa = () => {
  const campos = screen.getAllByTestId(/^torneo-/);
  return { inicio: campos[campos.length - 2], fin: campos[campos.length - 1] };
};

const completarEtapa = async (user, indice, nombre, inicio, fin, descripcion) => {
  const campo = await abrirEditorEtapa(user, indice);
  await user.clear(campo);
  await user.type(campo, nombre);

  const { inicio: fechaInicio, fin: fechaFin } = fechasDeEtapa();
  await user.type(fechaInicio, inicio);
  await user.type(fechaFin, fin);

  if (descripcion !== undefined) {
    const desc = screen.getByPlaceholderText(DESCRIPCION_ETAPA);
    await user.clear(desc);
    await user.type(desc, descripcion);
  }

  await guardarEtapa(user);
};

const completarPaso1 = async (user) => {
  await user.type(screen.getByPlaceholderText('Ej: Juegos Bonaerenses 2026'), 'Torneo Nuevo');
  await user.selectOptions(screen.getByDisplayValue('Seleccionar disciplina...'), '1');
};

const completarPaso2 = async (user, inicio = '2026-02-01T10:00', fin = '2026-02-20T18:00') => {
  await user.type(screen.getByTestId('inscripcion-0'), inicio);
  await user.type(screen.getByTestId('inscripcion-1'), fin);
  await user.click(screen.getByRole('button', { name: /siguiente/i }));
  await screen.findByRole('heading', { name: /Etapas del Torneo/i });
};

describe('TournamentFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reiniciarCalendarios();
    disciplineService.getAll.mockResolvedValue(DISCIPLINAS);
    stageService.getAll.mockResolvedValue(ETAPAS);
    tournamentService.getById.mockResolvedValue({ data: TORNEO });
    tournamentService.create.mockResolvedValue({ id_torneo: 9 });
    tournamentService.update.mockResolvedValue({ id_torneo: 5 });
  });

  const renderPage = (props = {}) =>
    render(<TournamentFormPage onNavigate={vi.fn()} {...props} />);

  describe('carga inicial', () => {
    it('carga las disciplinas al crear', async () => {
      renderPage();
      expect(await screen.findByRole('option', { name: 'Fútbol 5' })).toBeInTheDocument();
      expect(disciplineService.getAll).toHaveBeenCalledWith({ limit: 100 });
    });

    it('no pide el torneo al crear', async () => {
      renderPage();
      await screen.findByRole('option', { name: 'Fútbol 5' });
      expect(tournamentService.getById).not.toHaveBeenCalled();
    });

    it('avisa si fallan las disciplinas', async () => {
      disciplineService.getAll.mockRejectedValue(new Error('sin permiso'));
      renderPage();
      expect(await screen.findByText('Error al cargar disciplinas')).toBeInTheDocument();
    });

    it('no muestra spinner en el alta, que no tiene nada que cargar', async () => {
      renderPage();
      await screen.findByRole('option', { name: 'Fútbol 5' });
      expect(screen.queryByText('Cargando...')).not.toBeInTheDocument();
    });
  });

  describe('modo edicion', () => {
    it('rellena el formulario con el torneo', async () => {
      renderPage({ pageParams: { id: 5 } });
      expect(await screen.findByDisplayValue('Torneo Otoño')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Senior')).toBeInTheDocument();
      expect(tournamentService.getById).toHaveBeenCalledWith(5);
    });

    it('mapea edicion a categoria', async () => {
      renderPage({ pageParams: { id: 5 } });
      expect(await screen.findByDisplayValue('Senior')).toBeInTheDocument();
    });

    it('preselecciona la disciplina', async () => {
      renderPage({ pageParams: { id: 5 } });
      await screen.findByDisplayValue('Torneo Otoño');
      expect(screen.getByDisplayValue('Fútbol 5')).toBeInTheDocument();
    });

    it('carga las etapas del torneo', async () => {
      renderPage({ pageParams: { id: 5 } });
      await screen.findByDisplayValue('Torneo Otoño');
      await userEvent.click(screen.getByRole('button', { name: /siguiente/i }));
      await userEvent.click(await screen.findByRole('button', { name: /siguiente/i }));
      expect(await screen.findByText('Local')).toBeInTheDocument();
      expect(stageService.getAll).toHaveBeenCalledWith({ id_torneo: 5 });
    });

    it('deja la lista de etapas vacía si el torneo no tiene', async () => {
      stageService.getAll.mockResolvedValue([]);
      renderPage({ pageParams: { id: 5 } });
      await screen.findByDisplayValue('Torneo Otoño');
      await userEvent.click(screen.getByRole('button', { name: /siguiente/i }));
      await userEvent.click(await screen.findByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: /Etapas del Torneo/i });
      expect(screen.queryByText('Local')).not.toBeInTheDocument();
    });

    it('acepta etapas en array plano o envueltas en data', async () => {
      stageService.getAll.mockResolvedValue({ data: ETAPAS });
      renderPage({ pageParams: { id: 5 } });
      await screen.findByDisplayValue('Torneo Otoño');
      await userEvent.click(screen.getByRole('button', { name: /siguiente/i }));
      await userEvent.click(await screen.findByRole('button', { name: /siguiente/i }));
      expect(await screen.findByText('Local')).toBeInTheDocument();
    });

    it('avisa si falla la carga del torneo', async () => {
      tournamentService.getById.mockRejectedValue(new Error('Torneo inexistente'));
      renderPage({ pageParams: { id: 5 } });
      expect(await screen.findByText('Torneo inexistente')).toBeInTheDocument();
    });

    it('usa un texto por defecto si el error no trae mensaje', async () => {
      tournamentService.getById.mockRejectedValue(new Error(''));
      renderPage({ pageParams: { id: 5 } });
      expect(await screen.findByText('Error al cargar torneo')).toBeInTheDocument();
    });

    it('muestra el spinner al editar hasta que carga', async () => {
      const pendiente = () => new Promise(() => {});
      tournamentService.getById.mockReturnValue(pendiente());
      disciplineService.getAll.mockReturnValue(pendiente());
      stageService.getAll.mockReturnValue(pendiente());

      renderPage({ pageParams: { id: 5 } });

      expect(screen.getByText('Cargando...')).toBeInTheDocument();
    });
  });

  describe('validación del paso 1', () => {
    it('exige nombre, edicion, disciplina y fecha', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('option', { name: 'Fútbol 5' });
      await user.click(screen.getByRole('button', { name: /siguiente/i }));

      expect(await screen.findByText('El nombre del torneo es obligatorio')).toBeInTheDocument();
      expect(screen.getByText('Seleccioná una disciplina')).toBeInTheDocument();
    });

    it('la edicion tiene un valor por defecto', async () => {
      renderPage();
      expect(await screen.findByDisplayValue('2026')).toBeInTheDocument();
    });

    it('no avanza si falta el nombre', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('option', { name: 'Fútbol 5' });
      await user.selectOptions(screen.getByDisplayValue('Seleccionar disciplina...'), '1');
      await user.click(screen.getByRole('button', { name: /siguiente/i }));

      expect(await screen.findByText('El nombre del torneo es obligatorio')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Información general' })).toBeInTheDocument();
    });

    it('rechaza que la fecha de fin sea anterior a la de inicio', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('option', { name: 'Fútbol 5' });
      await completarPaso1(user);

      const fechas = screen.getAllByTestId(/^torneo-/);
      await user.clear(fechas[0]);
      await user.type(fechas[0], '2026-06-30');
      await user.type(fechas[1], '2026-03-01');
      await user.click(screen.getByRole('button', { name: /siguiente/i }));

      expect(await screen.findByText('La fecha de fin debe ser posterior al inicio')).toBeInTheDocument();
    });

    it('limpia el error del campo al corregirlo', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('option', { name: 'Fútbol 5' });
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      expect(await screen.findByText('El nombre del torneo es obligatorio')).toBeInTheDocument();

      await user.type(screen.getByPlaceholderText('Ej: Juegos Bonaerenses 2026'), 'X');

      await waitFor(() =>
        expect(screen.queryByText('El nombre del torneo es obligatorio')).not.toBeInTheDocument()
      );
    });

    it('avanza al paso 2 con los datos completos', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('option', { name: 'Fútbol 5' });
      await completarPaso1(user);
      await user.click(screen.getByRole('button', { name: /siguiente/i }));

      expect(await screen.findByRole('heading', { name: 'Fechas Inscripción de Equipos' })).toBeInTheDocument();
    });
  });

  describe('estado derivado del torneo', () => {
    const estadoVisible = () => screen.getByText(/^(Programado|Pendiente|En Progreso|Finalizado)$/);

    it('un torneo con fecha de inicio futura esta programado', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('option', { name: 'Fútbol 5' });
      await completarPaso1(user);
      const fechas = screen.getAllByTestId(/^torneo-/);
      await user.clear(fechas[0]);
      await user.type(fechas[0], '2099-01-01');

      expect(estadoVisible()).toHaveTextContent(/Programado|Pendiente/);
    });

    it('un torneo con fechas ya corridas esta finalizado', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('option', { name: 'Fútbol 5' });
      await completarPaso1(user);
      const fechas = screen.getAllByTestId(/^torneo-/);
      await user.clear(fechas[0]);
      await user.type(fechas[0], '2000-01-01');
      await user.type(fechas[1], '2000-06-01');

      expect(estadoVisible()).toHaveTextContent(/Finalizado/);
    });

    it('un torneo en curso se marca en progreso', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('option', { name: 'Fútbol 5' });
      await completarPaso1(user);
      const fechas = screen.getAllByTestId(/^torneo-/);
      const hoy = new Date();
      const inicio = new Date(hoy.getTime() - 86400000).toISOString().slice(0, 10);
      const fin = new Date(hoy.getTime() + 86400000).toISOString().slice(0, 10);
      await user.clear(fechas[0]);
      await user.type(fechas[0], inicio);
      await user.type(fechas[1], fin);

      expect(estadoVisible()).toHaveTextContent(/En Progreso/);
    });
  });

  describe('validación del paso 2', () => {
    it('exige las dos fechas de inscripcion', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('option', { name: 'Fútbol 5' });
      await completarPaso1(user);
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: 'Fechas Inscripción de Equipos' });

      await user.click(screen.getByRole('button', { name: /siguiente/i }));

      expect(await screen.findByText('La fecha de inicio de inscripción es obligatoria')).toBeInTheDocument();
      expect(screen.getByText('La fecha de fin de inscripción es obligatoria')).toBeInTheDocument();
    });

    it('exige que las inscripciones cierren antes del torneo', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('option', { name: 'Fútbol 5' });
      await completarPaso1(user);
      const fechas = screen.getAllByTestId(/^torneo-/);
      await user.clear(fechas[0]);
      await user.type(fechas[0], '2026-03-01');

      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: 'Fechas Inscripción de Equipos' });
      await user.type(screen.getByTestId('inscripcion-0'), '2026-02-01T10:00');
      await user.type(screen.getByTestId('inscripcion-1'), '2026-05-01T10:00');
      await user.click(screen.getByRole('button', { name: /siguiente/i }));

      expect(
        await screen.findByText('Las inscripciones deben cerrar antes del inicio del torneo')
      ).toBeInTheDocument();
    });

    it('rechaza que la inscripción termine antes de empezar', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('option', { name: 'Fútbol 5' });
      await completarPaso1(user);
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: 'Fechas Inscripción de Equipos' });
      await user.type(screen.getByTestId('inscripcion-0'), '2026-02-20T10:00');
      await user.type(screen.getByTestId('inscripcion-1'), '2026-02-01T10:00');
      await user.click(screen.getByRole('button', { name: /siguiente/i }));

      expect(
        await screen.findByText('La fecha de fin de inscripción debe ser posterior al inicio')
      ).toBeInTheDocument();
    });

    it('muestra el estado de la inscripción segun las fechas', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('option', { name: 'Fútbol 5' });
      await completarPaso1(user);
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: 'Fechas Inscripción de Equipos' });

      expect(screen.queryByText(/^Inscripciones (abiertas|pendientes|cerradas)$/)).not.toBeInTheDocument();

      const escribirPeriodo = async (desde, hasta) => {
        await user.clear(screen.getByTestId('inscripcion-0'));
        await user.type(screen.getByTestId('inscripcion-0'), desde);
        await user.clear(screen.getByTestId('inscripcion-1'));
        await user.type(screen.getByTestId('inscripcion-1'), hasta);
      };

      await escribirPeriodo(relativo(20), relativo(30));
      expect(screen.getByText('Inscripciones pendientes')).toBeInTheDocument();

      await escribirPeriodo(ayer(), manana());
      expect(screen.getByText('Inscripciones abiertas')).toBeInTheDocument();

      await escribirPeriodo(hace(40), hace(30));
      expect(screen.getByText('Inscripciones cerradas')).toBeInTheDocument();
    });

    it('el boton atras vuelve al paso 1 y limpia los errores', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('option', { name: 'Fútbol 5' });
      await completarPaso1(user);
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: 'Fechas Inscripción de Equipos' });
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByText('La fecha de inicio de inscripción es obligatoria');

      await user.click(screen.getByRole('button', { name: /atrás/i }));

      expect(await screen.findByRole('heading', { name: 'Información general' })).toBeInTheDocument();
      expect(screen.queryByText('La fecha de inicio de inscripción es obligatoria')).not.toBeInTheDocument();
    });

    it('el boton atras no aparece en el primer paso', async () => {
      renderPage();
      await screen.findByRole('option', { name: 'Fútbol 5' });
      expect(screen.queryByRole('button', { name: /atrás/i })).not.toBeInTheDocument();
    });

    it('cancelar vuelve al listado sin guardar', async () => {
      const onNavigate = vi.fn();
      const user = userEvent.setup();
      renderPage({ onNavigate });
      await screen.findByRole('option', { name: 'Fútbol 5' });
      await user.click(screen.getByRole('button', { name: /cancelar/i }));

      expect(onNavigate).toHaveBeenCalledWith('tournaments');
      expect(tournamentService.create).not.toHaveBeenCalled();
    });
  });

  describe('pasos 3: etapas', () => {
    const irAPaso3 = async (user) => {
      renderPage();
      await screen.findByRole('option', { name: 'Fútbol 5' });
      await completarPaso1(user);
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: 'Fechas Inscripción de Equipos' });
      await completarPaso2(user);
    };

    it('arranca con una etapa vacia', async () => {
      const user = userEvent.setup();
      await irAPaso3(user);
      expect(screen.getByRole('button', { name: /agregar etapa/i })).toBeInTheDocument();
    });

    it('permite agregar varias etapas', async () => {
      const user = userEvent.setup();
      await irAPaso3(user);
      await user.click(screen.getByRole('button', { name: /agregar etapa/i }));
      await user.click(screen.getByRole('button', { name: /agregar etapa/i }));

      expect(screen.getAllByRole('button', { name: /editar/i })).toHaveLength(3);
    });

    it('exige al menos una etapa con nombre', async () => {
      const user = userEvent.setup();
      await irAPaso3(user);
      await user.click(screen.getByRole('button', { name: /finalizar/i }));

      expect(await screen.findByText('Debe haber al menos una etapa con nombre')).toBeInTheDocument();
    });

    it('guarda la etapa editada y cierra el editor', async () => {
      const user = userEvent.setup();
      await irAPaso3(user);
      await completarEtapa(user, 0, 'Local', relativo(10), relativo(20), 'Primera etapa');

      expect(screen.queryByPlaceholderText(NOMBRE_ETAPA)).not.toBeInTheDocument();
      expect(screen.getByText('Local')).toBeInTheDocument();
      expect(screen.getByText('Primera etapa')).toBeInTheDocument();
    });

    it('rechaza dos etapas con periodos superpuestos', async () => {
      const user = userEvent.setup();
      await irAPaso3(user);
      await completarEtapa(user, 0, 'Local', relativo(10), relativo(20));
      await user.click(screen.getByRole('button', { name: /agregar etapa/i }));
      await completarEtapa(user, 1, 'Regional', relativo(15), relativo(25));

      await user.click(screen.getByRole('button', { name: /finalizar/i }));

      expect(await screen.findByText(/períodos superpuestos/)).toBeInTheDocument();
    });

    it('acepta dos etapas con periodos seguidos', async () => {
      const user = userEvent.setup();
      await irAPaso3(user);
      await completarEtapa(user, 0, 'Local', relativo(10), relativo(20));
      await user.click(screen.getByRole('button', { name: /agregar etapa/i }));
      await completarEtapa(user, 1, 'Regional', relativo(21), relativo(30));

      await user.click(screen.getByRole('button', { name: /finalizar/i }));

      expect(await screen.findByText('Confirmar creación del torneo')).toBeInTheDocument();
    });

    it('no guarda una etapa sin nombre', async () => {
      const user = userEvent.setup();
      await irAPaso3(user);
      await abrirEditorEtapa(user, 0);
      await user.clear(await screen.findByPlaceholderText(NOMBRE_ETAPA));
      await guardarEtapa(user);

      expect(screen.getByPlaceholderText(NOMBRE_ETAPA)).toBeInTheDocument();
    });

    it('el editor de etapa se puede cerrar sin guardar', async () => {
      const user = userEvent.setup();
      await irAPaso3(user);
      await abrirEditorEtapa(user, 0);

      await user.click(botonDelModal('Cancelar'));

      await waitFor(() => expect(screen.queryByPlaceholderText(NOMBRE_ETAPA)).not.toBeInTheDocument());
    });

    it('marca la etapa para borrar y permite deshacerlo', async () => {
      const user = userEvent.setup();
      await irAPaso3(user);
      await completarEtapa(user, 0, 'Local', relativo(10), relativo(20));
      await user.click(screen.getByRole('button', { name: /agregar etapa/i }));
      await completarEtapa(user, 1, 'Regional', relativo(21), relativo(30));

      await user.click(screen.getAllByRole('button', { name: /^eliminar$/i })[0]);
      await user.click(botonDelModal('Eliminar'));

      expect(await screen.findByRole('button', { name: /cancelar eliminación/i })).toBeInTheDocument();
      expect(screen.getByText(/se eliminará recién al guardar/)).toBeInTheDocument();
    });

    it('no ofrece eliminar cuando es la unica etapa', async () => {
      const user = userEvent.setup();
      await irAPaso3(user);
      await completarEtapa(user, 0, 'Local', relativo(10), relativo(20));

      expect(screen.queryByRole('button', { name: /^eliminar$/i })).not.toBeInTheDocument();
    });

    it('cancelar el borrado deja la etapa como estaba', async () => {
      const user = userEvent.setup();
      await irAPaso3(user);
      await completarEtapa(user, 0, 'Local', relativo(10), relativo(20));
      await user.click(screen.getByRole('button', { name: /agregar etapa/i }));
      await completarEtapa(user, 1, 'Regional', relativo(21), relativo(30));

      await user.click(screen.getAllByRole('button', { name: /^eliminar$/i })[0]);
      await user.click(botonDelModal('Cancelar'));

      expect(screen.queryByRole('button', { name: /cancelar eliminación/i })).not.toBeInTheDocument();
      expect(screen.getByText('Local')).toBeInTheDocument();
    });

    it('una etapa marcada para borrar no se manda al backend', async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();
      renderPage({ onNavigate });
      await screen.findByRole('option', { name: 'Fútbol 5' });
      await completarPaso1(user);
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: 'Fechas Inscripción de Equipos' });
      await completarPaso2(user);

      await completarEtapa(user, 0, 'Local', relativo(10), relativo(20));
      await user.click(screen.getByRole('button', { name: /agregar etapa/i }));
      await completarEtapa(user, 1, 'Regional', relativo(21), relativo(30));

      await user.click(screen.getAllByRole('button', { name: /^eliminar$/i })[0]);
      await user.click(botonDelModal('Eliminar'));

      await user.click(screen.getByRole('button', { name: /finalizar/i }));
      await screen.findByText('Confirmar creación del torneo');
      await user.click(botonDelModal('Crear Torneo'));

      await waitFor(() => expect(tournamentService.create).toHaveBeenCalled());
      const etapas = tournamentService.create.mock.calls[0][0].etapas;
      expect(etapas).toHaveLength(1);
      expect(etapas[0].nombre).toBe('Regional');
    });
  });

  describe('guardado', () => {
    it('crea con el payload armado desde el formulario', async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();
      renderPage({ onNavigate });
      await screen.findByRole('option', { name: 'Fútbol 5' });
      await completarPaso1(user);
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: 'Fechas Inscripción de Equipos' });
      await completarPaso2(user);

      await completarEtapa(user, 0, 'Local', relativo(10), relativo(20));

      await user.click(screen.getByRole('button', { name: /finalizar/i }));
      expect(await screen.findByText('Confirmar creación del torneo')).toBeInTheDocument();
      await user.click(botonDelModal('Crear Torneo'));

      await waitFor(() => expect(tournamentService.create).toHaveBeenCalled());
      const payload = tournamentService.create.mock.calls[0][0];
      expect(payload).toMatchObject({
        nombre: 'Torneo Nuevo',
        categoria: '2026',
        id_disciplina: 1,
        descripcion: null
      });
      expect(payload.etapas).toHaveLength(1);
      expect(payload.etapas[0]).toMatchObject({ nombre: 'Local' });
      expect(onNavigate).toHaveBeenCalledWith('tournaments');
    });

    it('actualiza con el id del parametro al editar', async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();
      renderPage({ pageParams: { id: 5 }, onNavigate });
      await screen.findByDisplayValue('Torneo Otoño');
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: 'Fechas Inscripción de Equipos' });
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: /Etapas del Torneo/i });

      await user.click(screen.getByRole('button', { name: /finalizar/i }));
      expect(await screen.findByText('Confirmar cambios del torneo')).toBeInTheDocument();
      await user.click(botonDelModal('Guardar cambios'));

      await waitFor(() => expect(tournamentService.update).toHaveBeenCalled());
      expect(tournamentService.update.mock.calls[0][0]).toBe(5);
      expect(tournamentService.create).not.toHaveBeenCalled();
    });

    it('el payload conserva el id de las etapas que ya existen', async () => {
      const user = userEvent.setup();
      renderPage({ pageParams: { id: 5 } });
      await screen.findByDisplayValue('Torneo Otoño');
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: 'Fechas Inscripción de Equipos' });
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: /Etapas del Torneo/i });

      await user.click(screen.getByRole('button', { name: /finalizar/i }));
      await screen.findByText('Confirmar cambios del torneo');
      await user.click(botonDelModal('Guardar cambios'));

      await waitFor(() => expect(tournamentService.update).toHaveBeenCalled());
      expect(tournamentService.update.mock.calls[0][1].etapas[0]).toMatchObject({ id_etapa: 1 });
    });

    it('cerrar el modal de confirmacion no guarda', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('option', { name: 'Fútbol 5' });
      await completarPaso1(user);
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: 'Fechas Inscripción de Equipos' });
      await completarPaso2(user);
      await completarEtapa(user, 0, 'Local', relativo(10), relativo(20));

      await user.click(screen.getByRole('button', { name: /finalizar/i }));
      await screen.findByText('Confirmar creación del torneo');

      await user.click(botonDelModal('Volver al formulario'));

      await waitFor(() =>
        expect(screen.queryByText('Confirmar creación del torneo')).not.toBeInTheDocument()
      );
      expect(tournamentService.create).not.toHaveBeenCalled();
    });

    it('muestra el error si el guardado falla', async () => {
      const user = userEvent.setup();
      renderPage({ pageParams: { id: 5 } });
      await screen.findByDisplayValue('Torneo Otoño');
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: 'Fechas Inscripción de Equipos' });
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: /Etapas del Torneo/i });
      tournamentService.update.mockRejectedValue(new Error('Nombre duplicado'));

      await user.click(screen.getByRole('button', { name: /finalizar/i }));
      await screen.findByText('Confirmar cambios del torneo');
      await user.click(botonDelModal('Guardar cambios'));

      expect(await screen.findByText('Nombre duplicado')).toBeInTheDocument();
    });

    it('sugiere limpiar lo asociado cuando el error menciona partidos', async () => {
      const user = userEvent.setup();
      renderPage({ pageParams: { id: 5 } });
      await screen.findByDisplayValue('Torneo Otoño');
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: 'Fechas Inscripción de Equipos' });
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: /Etapas del Torneo/i });
      tournamentService.update.mockRejectedValue(new Error('Tiene partidos asociados'));

      await user.click(screen.getByRole('button', { name: /finalizar/i }));
      await screen.findByText('Confirmar cambios del torneo');
      await user.click(botonDelModal('Guardar cambios'));

      expect(await screen.findByText(/Eliminá primero los registros asociados/)).toBeInTheDocument();
    });

    it('usa un texto por defecto si el error no trae mensaje', async () => {
      const user = userEvent.setup();
      renderPage({ pageParams: { id: 5 } });
      await screen.findByDisplayValue('Torneo Otoño');
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: 'Fechas Inscripción de Equipos' });
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: /Etapas del Torneo/i });
      tournamentService.update.mockRejectedValue(new Error(''));

      await user.click(screen.getByRole('button', { name: /finalizar/i }));
      await screen.findByText('Confirmar cambios del torneo');
      await user.click(botonDelModal('Guardar cambios'));

      expect((await screen.findAllByText('Error al guardar')).length).toBe(2);
    });
  });

  describe('modo solo lectura', () => {
    it('no muestra el wizard ni el stepper', async () => {
      renderPage({ pageParams: { id: 5 }, readOnly: true });
      await screen.findByDisplayValue('Torneo Otoño');
      expect(screen.queryByRole('button', { name: /siguiente/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /finalizar/i })).not.toBeInTheDocument();
    });

    it('deshabilita los campos editables', async () => {
      renderPage({ pageParams: { id: 5 }, readOnly: true });
      await screen.findByDisplayValue('Torneo Otoño');
      expect(screen.getByDisplayValue('Torneo Otoño')).toBeDisabled();
    });

    it('ofrece solo volver al listado', async () => {
      const onNavigate = vi.fn();
      renderPage({ pageParams: { id: 5 }, readOnly: true, onNavigate });
      await screen.findByDisplayValue('Torneo Otoño');
      await userEvent.click(screen.getByRole('button', { name: /volver/i }));

      expect(onNavigate).toHaveBeenCalledWith('tournaments');
      expect(tournamentService.update).not.toHaveBeenCalled();
    });
  });

  describe('zona horaria de Argentina con el navegador en otra zona', () => {
    beforeEach(() => {
      vi.stubEnv('TZ', 'Asia/Tokyo');
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllEnvs();
    });

    const fijarAhora = (iso) => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(iso));
    };

    const llegarAPaso2 = async (user) => {
      await screen.findByRole('option', { name: 'Fútbol 5' });
      await completarPaso1(user);
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: 'Fechas Inscripción de Equipos' });
    };

    it('envia la inscripcion cargada como hora de Argentina', async () => {
      const user = userEvent.setup();
      renderPage();
      await llegarAPaso2(user);
      await completarPaso2(user, '2026-11-04T00:00', '2026-11-05T20:00');
      await completarEtapa(user, 0, 'Local', relativo(10), relativo(20));
      await user.click(screen.getByRole('button', { name: /finalizar/i }));
      await screen.findByText('Confirmar creación del torneo');
      await user.click(botonDelModal('Crear Torneo'));

      await waitFor(() => expect(tournamentService.create).toHaveBeenCalled());
      expect(tournamentService.create.mock.calls[0][0]).toMatchObject({
        fecha_inscripcion_inicio: '2026-11-04T03:00:00.000Z',
        fecha_inscripcion_fin: '2026-11-05T23:00:00.000Z'
      });
    });

    it('muestra en el formulario la hora de Argentina del dato guardado', async () => {
      const user = userEvent.setup();
      tournamentService.getById.mockResolvedValue({
        ...TORNEO,
        fecha_inscripcion_inicio: '2026-02-04T03:00:00.000Z',
        fecha_inscripcion_fin: '2026-02-20T23:00:00.000Z'
      });
      renderPage({ pageParams: { id: 5 } });
      await screen.findByDisplayValue('Torneo Otoño');
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: 'Fechas Inscripción de Equipos' });

      expect(screen.getByTestId('inscripcion-0')).toHaveValue('2026-02-04T00:00');
      expect(screen.getByTestId('inscripcion-1')).toHaveValue('2026-02-20T20:00');
    });

    it('guardar sin cambios conserva el mismo instante', async () => {
      const user = userEvent.setup();
      renderPage({ pageParams: { id: 5 } });
      await screen.findByDisplayValue('Torneo Otoño');
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: 'Fechas Inscripción de Equipos' });
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: /Etapas del Torneo/i });
      await user.click(screen.getByRole('button', { name: /finalizar/i }));
      await screen.findByText('Confirmar cambios del torneo');
      await user.click(botonDelModal('Guardar cambios'));

      await waitFor(() => expect(tournamentService.update).toHaveBeenCalled());
      expect(tournamentService.update.mock.calls[0][1]).toMatchObject({
        fecha_inscripcion_inicio: TORNEO.fecha_inscripcion_inicio,
        fecha_inscripcion_fin: TORNEO.fecha_inscripcion_fin
      });
    });

    it('la inscripcion sigue pendiente hasta la hora de apertura en Argentina', async () => {
      fijarAhora('2026-11-04T02:30:00.000Z');
      const user = userEvent.setup();
      renderPage();
      await llegarAPaso2(user);
      await user.type(screen.getByTestId('inscripcion-0'), '2026-11-04T00:00');
      await user.type(screen.getByTestId('inscripcion-1'), '2026-11-10T00:00');

      expect(screen.getByText('Inscripciones pendientes')).toBeInTheDocument();
    });

    it('la inscripcion se abre al llegar la hora de apertura en Argentina', async () => {
      fijarAhora('2026-11-04T03:30:00.000Z');
      const user = userEvent.setup();
      renderPage();
      await llegarAPaso2(user);
      await user.type(screen.getByTestId('inscripcion-0'), '2026-11-04T00:00');
      await user.type(screen.getByTestId('inscripcion-1'), '2026-11-10T00:00');

      expect(screen.getByText('Inscripciones abiertas')).toBeInTheDocument();
    });

    it('la inscripcion cierra pasada la hora de cierre en Argentina', async () => {
      fijarAhora('2026-11-05T23:30:00.000Z');
      const user = userEvent.setup();
      renderPage();
      await llegarAPaso2(user);
      await user.type(screen.getByTestId('inscripcion-0'), '2026-11-04T00:00');
      await user.type(screen.getByTestId('inscripcion-1'), '2026-11-05T20:00');

      expect(screen.getByText('Inscripciones cerradas')).toBeInTheDocument();
    });

    it('la fecha de inicio por defecto es el dia de hoy en Argentina', async () => {
      fijarAhora('2026-11-07T02:00:00.000Z');
      renderPage();
      await screen.findByRole('option', { name: 'Fútbol 5' });

      expect(screen.getByTestId('torneo-0')).toHaveValue('2026-11-06');
    });

    it('un torneo que empieza manana en Argentina sigue programado', async () => {
      fijarAhora('2026-11-06T01:00:00.000Z');
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('option', { name: 'Fútbol 5' });
      await completarPaso1(user);
      const fechas = screen.getAllByTestId(/^torneo-/);
      await user.clear(fechas[0]);
      await user.type(fechas[0], '2026-11-06');

      expect(screen.getByText('Programado')).toBeInTheDocument();
    });

    it('un torneo sigue en progreso durante su ultimo dia', async () => {
      fijarAhora('2026-11-06T20:00:00.000Z');
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('option', { name: 'Fútbol 5' });
      await completarPaso1(user);
      const fechas = screen.getAllByTestId(/^torneo-/);
      await user.clear(fechas[0]);
      await user.type(fechas[0], '2026-11-01');
      await user.type(fechas[1], '2026-11-06');

      expect(screen.getByText('En Progreso')).toBeInTheDocument();
    });

    it('la confirmacion muestra el mismo dia cargado para el torneo', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('option', { name: 'Fútbol 5' });
      await completarPaso1(user);
      const fechas = screen.getAllByTestId(/^torneo-/);
      await user.clear(fechas[0]);
      await user.type(fechas[0], '2099-11-06');
      await user.click(screen.getByRole('button', { name: /siguiente/i }));
      await screen.findByRole('heading', { name: 'Fechas Inscripción de Equipos' });
      await completarPaso2(user, '2099-11-04T00:00', '2099-11-05T20:00');
      await completarEtapa(user, 0, 'Local', '2099-11-06', '2099-11-08');

      expect(screen.getByText('06/11/2099 — 08/11/2099')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /finalizar/i }));
      await screen.findByText('Confirmar creación del torneo');

      expect(screen.getByText('06/11/2099')).toBeInTheDocument();
      expect(screen.getByText('04/11/2099, 00:00 — 05/11/2099, 20:00')).toBeInTheDocument();
    });
  });
});
