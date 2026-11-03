import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { GymPresentationsPage } from '../../../src/pages/gymnastics/GymPresentationsPage.js';
import presentacionService from '../../../src/services/presentacionService.js';
import tournamentService from '../../../src/services/tournamentService.js';
import disciplineService from '../../../src/services/disciplineService.js';
import userService from '../../../src/services/userService.js';
import teamService from '../../../src/services/teamService.js';

vi.mock('../../../src/services/presentacionService.js', () => ({
  default: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), updateEstado: vi.fn(), delete: vi.fn() }
}));
vi.mock('../../../src/services/tournamentService.js', () => ({
  default: { getAll: vi.fn() }
}));
vi.mock('../../../src/services/disciplineService.js', () => ({
  default: { getAll: vi.fn() }
}));
// El alta pide el jurado y los tríos al abrir el modal. Sin mock, esas llamadas
// salen a la red desde el test y el formulario queda incompleto por accidente.
vi.mock('../../../src/services/userService.js', () => ({
  default: { getAll: vi.fn() }
}));
vi.mock('../../../src/services/teamService.js', () => ({
  default: { getAll: vi.fn() }
}));

// Estas pantallas las usa hoy el admin (el que organiza la jornada) y, desde que
// el backend filtro el listado por jurado, tambien el juez. Los tests de esta suite
// arman la pantalla como admin salvo los que dicen lo contrario: sin `user` la
// pantalla esconde todo lo del admin, asi que dejarlo sin pasar es partir de la
// rama del juez sin querer.
const ADMIN = { id_usuario: 1, rol: 'Administrador' };
const JUEZ = { id_usuario: 18, rol: 'Juez' };
// El perfil cacheado del login trae `rol` (y NO `id_rol`, que el backend no
// devuelve): el SuperAdmin se reconoce por el nombre, no por un numero.
const SUPERADMIN = { id_usuario: 2, rol: 'SuperAdmin' };

const TORNEOS = [
  { id_torneo: 32, nombre: 'Torneo Gimnasia JEBO 2026', id_disciplina: 11, tipo_competencia: 'EVALUACION' },
  { id_torneo: 30, nombre: 'Torneo Regional Futsal 2026', id_disciplina: 3, tipo_competencia: 'MARCADOR' }
];

const DISCIPLINAS = [
  { id_disciplina: 11, nombre: 'Gimnasia Artística', tipo_competencia: 'EVALUACION' },
  { id_disciplina: 3, nombre: 'Futsal', tipo_competencia: 'MARCADOR' }
];

// Catálogos del alta: el jurado se pide al abrir el modal y los tríos cuando ya
// se eligió el torneo.
const JURADO = [{ id_usuario: 41, nombre: 'Juez Uno' }];
const EQUIPOS = [
  { id_equipo: 6, nombre: 'Trío A', id_disciplina: 11, institucion_nombre: 'Escuela 1' }
];

// Una presentacion por cada estado con acciones distintas, para cubrir el ciclo
// de vida. IMPORTANTE: la PROGRAMADA usa la fecha de HOY, porque "Comenzar" solo
// se habilita el dia de la fecha (misma regla que el arbitro de un partido).
const HOY = (() => {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
})();

const PRESENTACIONES = [
  {
    id_presentacion: 1, orden: 1, estado: 'EN_CURSO',
    id_torneo: 32, torneo_nombre: 'Torneo Gimnasia JEBO 2026',
    id_disciplina: 11, disciplina_nombre: 'Gimnasia Artística',
    fecha: '2026-09-30', hora_inicio: '10:00', cancha_nombre: 'Gimnasio Sur',
    equipo_nombre: 'Trío A - Gimnasia', institucion_nombre: 'Escuela 1'
  },
  {
    id_presentacion: 2, orden: 2, estado: 'FINALIZADA',
    id_torneo: 32, torneo_nombre: 'Torneo Gimnasia JEBO 2026',
    id_disciplina: 11, disciplina_nombre: 'Gimnasia Artística',
    fecha: '2026-10-01', hora_inicio: '11:00', cancha_nombre: 'Gimnasio Norte',
    equipo_nombre: 'Trío B - Gimnasia', institucion_nombre: 'Escuela 2'
  },
  {
    id_presentacion: 3, orden: 3, estado: 'PROGRAMADA',
    id_torneo: 32, torneo_nombre: 'Torneo Gimnasia JEBO 2026',
    id_disciplina: 11, disciplina_nombre: 'Gimnasia Artística',
    fecha: HOY, hora_inicio: '16:00', cancha_nombre: 'Gimnasio Este',
    equipo_nombre: 'Trío C - Gimnasia', institucion_nombre: 'Escuela 3'
  },
  {
    // Programada pero de otro dia: sirve para ver que el boton sale apagado con
    // el motivo a la vista.
    id_presentacion: 4, orden: 4, estado: 'PROGRAMADA',
    id_torneo: 32, torneo_nombre: 'Torneo Gimnasia JEBO 2026',
    id_disciplina: 11, disciplina_nombre: 'Gimnasia Artística',
    fecha: '2026-01-15', hora_inicio: '09:00', cancha_nombre: 'Gimnasio Oeste',
    equipo_nombre: 'Trío D - Gimnasia', institucion_nombre: 'Escuela 4'
  },
  {
    // Cancelada: no hay nada que evaluar ni que mirar. Por eso no debe aparecer
    // ninguna de las dos acciones de la columna.
    id_presentacion: 5, orden: 5, estado: 'CANCELADA',
    id_torneo: 32, torneo_nombre: 'Torneo Gimnasia JEBO 2026',
    id_disciplina: 11, disciplina_nombre: 'Gimnasia Artística',
    fecha: '2026-09-30', hora_inicio: '12:00', cancha_nombre: 'Gimnasio Norte',
    equipo_nombre: 'Trío E - Gimnasia', institucion_nombre: 'Escuela 5'
  }
];



describe('pantallas de Gimnasia Artística', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tournamentService.getAll.mockResolvedValue({ data: TORNEOS });
    disciplineService.getAll.mockResolvedValue({ data: DISCIPLINAS });
    userService.getAll.mockResolvedValue({ data: JURADO });
    teamService.getAll.mockResolvedValue({ data: EQUIPOS });
    presentacionService.create.mockResolvedValue({ data: { id_presentacion: 99 } });
    presentacionService.getAll.mockResolvedValue({ data: PRESENTACIONES });
    presentacionService.updateEstado.mockResolvedValue({});
    presentacionService.delete.mockResolvedValue({});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  // Estas pantallas se caian con la app entera en blanco. React tiraba
  // "Cannot use 'in' operator to search for '__self' in EN_CURSO" porque el
  // estado se pasaba con `h(renderEstadoBadge, estado)`, y en esa posicion del
  // `createElement` el string es props, no hijo. Nadie lo noto porque no habia
  // ningun test que renderizara la tabla con una fila.
  describe('GymPresentationsPage', () => {
    it('renderiza la tabla con las presentaciones del torneo', async () => {
      render(<GymPresentationsPage onNavigate={vi.fn()} user={ADMIN} />);

      expect(await screen.findByText('EN_CURSO')).toBeInTheDocument();
      expect(screen.getByText('FINALIZADA')).toBeInTheDocument();
      expect(screen.getAllByText('Torneo Gimnasia JEBO 2026').length).toBeGreaterThan(0);
    });

    it('no se cae al pintar el estado de la presentacion', async () => {
      // Si el estado volviera a pasarse como props, React explotaria y el root
      // quedaria vacio: no habria ninguna fila de la tabla.
      render(<GymPresentationsPage onNavigate={vi.fn()} user={ADMIN} />);

      await waitFor(() =>
        expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
      );
    });

    it('pone las filas dentro de un tbody, no sueltas bajo el table', async () => {
      const { container } = render(<GymPresentationsPage onNavigate={vi.fn()} user={ADMIN} />);

      await waitFor(() => expect(container.querySelector('table')).toBeTruthy());
      const tabla = container.querySelector('table');

      expect(tabla.querySelector('tbody')).toBeTruthy();
      // `TableHeader` ya arma su propio `<thead><tr>`: meter un `TableRow` ahi
      // produce `<tr><tr>...</tr></tr>`, que React no valida y el navegador
      // corrige a ojo.
      expect(tabla.querySelector('thead > tr > tr')).toBeNull();
      expect(tabla.querySelectorAll('tbody tr')).toHaveLength(PRESENTACIONES.length);
    });

    // Un encuentro es de un solo trío. La columna no puede decir "4 tríos"
    // porque eso era justo el modelo que se Elimino: cada trío sale solo y es
    // evaluado por separado.
    it('muestra el trio de cada encuentro, no una cantidad de equipos', async () => {
      render(<GymPresentationsPage onNavigate={vi.fn()} user={ADMIN} />);

      expect(await screen.findByText('Trío A - Gimnasia')).toBeInTheDocument();
      expect(screen.getByText('Trío B - Gimnasia')).toBeInTheDocument();
      expect(screen.queryByText(/tríos$/)).not.toBeInTheDocument();
    });

    it('muestra el mensaje de lista vacia sin fallar', async () => {
      presentacionService.getAll.mockResolvedValue({ data: [] });
      render(<GymPresentationsPage onNavigate={vi.fn()} user={ADMIN} />);

      expect(await screen.findByText('No hay encuentros')).toBeInTheDocument();
    });

    it('en el alta solo ofrece torneos de una disciplina de evaluación', async () => {
      // Gimnasia no admite partidos, y el backend rechaza una presentación en
      // un torneo de fútbol. Ofrecerlo en el selector convertía un error en
      // algo que simplemente no está en la lista.
      const user = userEvent.setup();
      render(<GymPresentationsPage onNavigate={vi.fn()} user={ADMIN} />);

      await user.click(await screen.findByRole('button', { name: /nuevo encuentro/i }));
      await waitFor(() => expect(screen.getByText(/Trío que se presenta/)).toBeInTheDocument());

      // El modal tiene su propio selector de torneo, distinto del filtro de la
      // pagina: hay que leer ese y no el primer option que aparezca.
      const selectorTorneoDelModal = screen.getAllByRole('combobox')
        .find(s => Array.from(s.querySelectorAll('option'))
          .some(o => o.textContent.includes('Gimnasia JEBO')));

      expect(selectorTorneoDelModal).toBeTruthy();
      const opciones = Array.from(selectorTorneoDelModal.querySelectorAll('option'))
        .map(o => o.textContent);

      expect(opciones.some(o => o.includes('Gimnasia JEBO'))).toBe(true);
      expect(opciones.some(o => o.includes('Futsal'))).toBe(false);
    });

    // El formulario no le pide la disciplina al usuario, pero el backend la exige
    // en el body (`POST /presentaciones` la valida como EVALUACION). Sin este
    // campo el alta rebotaba con 400 "id_disciplina requerido" y el botón no
    // creaba nada. Tiene que derivarla del torneo elegido.
    it('manda la disciplina del torneo elegido al crear el encuentro', async () => {
      const user = userEvent.setup();
      render(<GymPresentationsPage onNavigate={vi.fn()} user={ADMIN} />);

      await user.click(await screen.findByRole('button', { name: /nuevo encuentro/i }));
      await waitFor(() => expect(screen.getByText(/Trío que se presenta/)).toBeInTheDocument());

      const selectorTorneo = screen.getAllByRole('combobox')
        .find(s => Array.from(s.querySelectorAll('option'))
          .some(o => o.textContent.includes('Gimnasia JEBO')));
      await user.selectOptions(selectorTorneo, '32');

      const selectorEquipo = await waitFor(() => {
        const s = screen.getAllByRole('combobox')
          .find(c => Array.from(c.querySelectorAll('option'))
            .some(o => o.textContent.includes('Trío A')));
        expect(s).toBeTruthy();
        return s;
      });
      await user.selectOptions(selectorEquipo, '6');

      await user.type(screen.getByRole('spinbutton'), '1');
      await user.click(screen.getByRole('checkbox', { name: 'Juez Uno' }));

      await user.click(screen.getByRole('button', { name: /crear encuentro/i }));

      await waitFor(() => expect(presentacionService.create).toHaveBeenCalledTimes(1));
      expect(presentacionService.create).toHaveBeenCalledWith({
        id_torneo: 32,
        id_disciplina: 11,
        orden: 1,
        fecha_hora: undefined,
        participantes: [{ id_equipo: 6, rol: 'GRUPO', orden_salida: 1 }],
        staff: [{ id_usuario: 41, rol: 'JUEZ_PRESIDENTE' }]
      });
    });

    // El ciclo de vida tiene el mismo criterio que la tabla de "Mis Partidos":
    // el boton de la fila abre un modal y recien ahi se avisa al backend.
    describe('ciclo de vida de la presentacion', () => {
      const botonDelModal = (nombre) => {
        const botones = screen.getAllByRole('button', { name: nombre });
        return botones[botones.length - 1];
      };

      const soloLaPresentacion = (indice) => {
        presentacionService.getAll.mockResolvedValue({ data: [PRESENTACIONES[indice]] });
        return render(<GymPresentationsPage onNavigate={vi.fn()} user={ADMIN} />);
      };

      it('ofrece Comenzar solo en las programadas y Finalizar solo en las que estan en curso', async () => {
        render(<GymPresentationsPage onNavigate={vi.fn()} user={ADMIN} />);

        expect((await screen.findAllByText('PROGRAMADA')).length).toBe(2);
        // Las dos programadas (3 y 4) ofrecen comenzar; la en curso, finalizar.
        expect(screen.getAllByRole('button', { name: /comenzar/i })).toHaveLength(2);
        expect(screen.getAllByRole('button', { name: /^finalizar$/i })).toHaveLength(1);
      });

      it('no ofrece ni Comenzar ni Finalizar en una presentacion finalizada', async () => {
        soloLaPresentacion(1);

        expect(await screen.findByText('FINALIZADA')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /comenzar/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^finalizar$/i })).not.toBeInTheDocument();
      });

      it('bloquea Comenzar si la presentacion no es de hoy, mostrando el motivo', async () => {
        const user = userEvent.setup();
        // La 4 es del 15/01: pasada.
        soloLaPresentacion(3);
        await screen.findByText('PROGRAMADA');

        const comenzar = screen.getByRole('button', { name: /comenzar/i });
        expect(comenzar).toBeDisabled();
        // El motivo se lee en la fila, no hay que Discoverlo en un error.
        expect(screen.getByText(/La fecha \(15\/01\/2026\) ya pasó/)).toBeInTheDocument();

        await user.click(comenzar);
        expect(presentacionService.updateEstado).not.toHaveBeenCalled();
      });

      it('inicia la presentacion recien despues de confirmar en el modal', async () => {
        const user = userEvent.setup();
        soloLaPresentacion(2);
        await screen.findByText('PROGRAMADA');

        await user.click(screen.getByRole('button', { name: /comenzar/i }));

        // Todavia no se toca el backend: el modal pide primero.
        expect(presentacionService.updateEstado).not.toHaveBeenCalled();
        expect(await screen.findByText(/Dar inicio a la presentación N° 3/)).toBeInTheDocument();

        await user.click(botonDelModal(/^comenzar$/i));

        await waitFor(() =>
          expect(presentacionService.updateEstado).toHaveBeenCalledWith(3, 'EN_CURSO')
        );
        expect(await screen.findByText('Presentación iniciada')).toBeInTheDocument();
      });

      it('muestra el motivo que devuelve el backend si no se puede iniciar', async () => {
        const user = userEvent.setup();
        presentacionService.updateEstado.mockRejectedValue(
          new Error('Se requieren exactamente 3 jueces para iniciar')
        );
        soloLaPresentacion(2);
        await screen.findByText('PROGRAMADA');

        await user.click(screen.getByRole('button', { name: /comenzar/i }));
        await user.click(botonDelModal(/^comenzar$/i));

        expect(await screen.findByText('Se requieren exactamente 3 jueces para iniciar')).toBeInTheDocument();
      });

      it('finaliza la presentacion avisando que no tiene vuelta atras', async () => {
        const user = userEvent.setup();
        soloLaPresentacion(0);
        await screen.findByText('EN_CURSO');

        await user.click(screen.getByRole('button', { name: /^finalizar$/i }));

        expect(presentacionService.updateEstado).not.toHaveBeenCalled();
        expect(await screen.findByText(/registrar la finalización de la presentación N° 1/i)).toBeInTheDocument();
        expect(screen.getByText(/ya no podrá modificarse/)).toBeInTheDocument();

        await user.click(botonDelModal(/^finalizar$/i));

        await waitFor(() =>
          expect(presentacionService.updateEstado).toHaveBeenCalledWith(1, 'FINALIZADA')
        );
        expect(await screen.findByText('Presentación finalizada')).toBeInTheDocument();
      });

      it('deja el modal abierto sin tocar nada si el usuario cancela', async () => {
        const user = userEvent.setup();
        soloLaPresentacion(0);
        await screen.findByText('EN_CURSO');

        await user.click(screen.getByRole('button', { name: /^finalizar$/i }));
        await user.click(botonDelModal('Cancelar'));

        expect(screen.queryByRole('heading', { name: 'Finalizar presentación' })).not.toBeInTheDocument();
        expect(presentacionService.updateEstado).not.toHaveBeenCalled();
      });
    });

    // La baja usa el mismo `Modal` compartido que el resto de los modulos (antes
    // era un `window.confirm`). El boton de la fila abre el aviso y recien ahi,
    // al confirmar, se llama al backend.
    describe('baja de la presentacion', () => {
      const botonConfirmarDelModal = () => {
        const botones = screen.getAllByRole('button', { name: /^Eliminar$/ });
        return botones[botones.length - 1];
      };

      const unaProgramada = () => {
        // Indice 2: id 3, orden 3, PROGRAMADA. Es el unico estado que ofrece borrar.
        presentacionService.getAll.mockResolvedValue({ data: [PRESENTACIONES[2]] });
        return render(<GymPresentationsPage onNavigate={vi.fn()} user={ADMIN} />);
      };

      it('pide confirmacion en el modal compartido antes de borrar', async () => {
        const user = userEvent.setup();
        unaProgramada();
        await screen.findByText('PROGRAMADA');

        await user.click(screen.getByTitle('Eliminar'));

        // Todavia no se toca el backend: primero el aviso.
        expect(presentacionService.delete).not.toHaveBeenCalled();
        expect(await screen.findByRole('heading', { name: 'Eliminar presentación' })).toBeInTheDocument();
        expect(screen.getByText(/N° 3 de Torneo Gimnasia JEBO 2026/)).toBeInTheDocument();
        expect(screen.getByText(/no se puede deshacer/)).toBeInTheDocument();
      });

      it('borra recien despues de confirmar en el modal', async () => {
        const user = userEvent.setup();
        unaProgramada();
        await screen.findByText('PROGRAMADA');

        await user.click(screen.getByTitle('Eliminar'));
        await user.click(botonConfirmarDelModal());

        await waitFor(() => expect(presentacionService.delete).toHaveBeenCalledWith(3));
        expect(await screen.findByText('Encuentro eliminado')).toBeInTheDocument();
      });

      it('no borra nada si el usuario cancela', async () => {
        const user = userEvent.setup();
        unaProgramada();
        await screen.findByText('PROGRAMADA');

        await user.click(screen.getByTitle('Eliminar'));
        await user.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(presentacionService.delete).not.toHaveBeenCalled();
        expect(screen.queryByRole('heading', { name: 'Eliminar presentación' })).not.toBeInTheDocument();
      });
    });

    // El listado dejo de ser solo del admin: el juez entra por aca a cargar su
    // hoja, asi que la pantalla tiene que abrirle la lista y SACARLE todo lo que
    // es del admin. Es la contraparte en pantalla de que el backend filtro el
    // listado por jurado y dejo el ciclo de vida en `requireAdmin`: ocultar aca es
    // para que no le ofrezcan botones que le van a ser rechazados, no la proteccion
    // en si.
    describe('vista del juez', () => {
      it('le muestra sus encuentros, sin las acciones del admin', async () => {
        render(<GymPresentationsPage onNavigate={vi.fn()} user={JUEZ} />);

        expect(await screen.findByText('EN_CURSO')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /nuevo encuentro/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /comenzar/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^finalizar$/i })).not.toBeInTheDocument();
        expect(screen.queryByTitle('Eliminar')).not.toBeInTheDocument();
        // La columna del ciclo de vida desaparece entera: para el juez no tiene
        // nada que decidir ahi y una columna vacia hace ruido.
        expect(screen.queryByText('Estado del encuentro')).not.toBeInTheDocument();
      });

      // "Evaluar" cuando corresponde: solo con el encuentro en curso, que es el
      // unico estado en el que el backend acepta una hoja. En los demas se abre la
      // misma pantalla pero en lectura, y el aviso esta a la vista.
      it('ofrece Evaluar en el encuentro en curso y Ver hoja en los demas', async () => {
        render(<GymPresentationsPage onNavigate={vi.fn()} user={JUEZ} />);

        expect(await screen.findByText('EN_CURSO')).toBeInTheDocument();
        // Solo la presentacion 1 esta EN_CURSO.
        expect(screen.getAllByRole('button', { name: 'Evaluar' })).toHaveLength(1);
        // 2 (finalizada) + 3 y 4 (programadas). La cancelada no muestra ninguna.
        expect(screen.getAllByRole('button', { name: 'Ver hoja' })).toHaveLength(3);
      });

      it('no ofrece ninguna acción en un encuentro cancelado', async () => {
        presentacionService.getAll.mockResolvedValue({ data: [PRESENTACIONES[4]] });
        render(<GymPresentationsPage onNavigate={vi.fn()} user={JUEZ} />);

        expect(await screen.findByText('CANCELADA')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Evaluar' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Ver hoja' })).not.toBeInTheDocument();
      });

      it('lleva al juez a la hoja de evaluacion de su encuentro', async () => {
        const user = userEvent.setup();
        const onNavigate = vi.fn();
        render(<GymPresentationsPage onNavigate={onNavigate} user={JUEZ} />);

        await user.click(await screen.findByRole('button', { name: 'Evaluar' }));

        expect(onNavigate).toHaveBeenCalledWith('gymnastics/presentaciones/1/detalle');
      });

      // El `colSpan` de la fila de "No hay encuentros" tiene que acompañar al
      // encabezado: con la columna del ciclo de vida oculta son 7, no 8, y si se
      // deja en 8 la celda se parte en dos.
      it('no deja la fila de lista vacia partida al buscar como juez', async () => {
        presentacionService.getAll.mockResolvedValue({ data: [] });
        const { container } = render(<GymPresentationsPage onNavigate={vi.fn()} user={JUEZ} />);

        expect(await screen.findByText('No hay encuentros')).toBeInTheDocument();
        const columnas = container.querySelectorAll('thead th').length;
        expect(container.querySelector('td[colspan]').getAttribute('colspan'))
          .toBe(String(columnas));
      });

      // El admin no pierde nada de lo que tenia antes: sigue viendo el alta, el
      // ciclo de vida y el eliminar.
      it('no le quita nada al administrador', async () => {
        render(<GymPresentationsPage onNavigate={vi.fn()} user={ADMIN} />);

        expect(await screen.findByRole('button', { name: /nuevo encuentro/i })).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /comenzar/i })).toHaveLength(2);
        expect(screen.getAllByRole('button', { name: /^finalizar$/i })).toHaveLength(1);
        // Solo las dos PROGRAMADA (3 y 4): borrar despues dejaria evaluaciones
        // cargadas de un encuentro que ya cuenta en el torneo.
        expect(screen.getAllByTitle('Eliminar')).toHaveLength(2);
      });

      // El SuperAdmin es admin para el backend (`ROLES_ADMIN`), pero su rol se
      // llama `'SuperAdmin'`, no `'Administrador'`, y el login no manda `id_rol`.
      // El check viejo (`rol === 'Administrador' || id_rol === 1`) lo dejaba sin
      // alta ni ciclo de vida: el boton de crear encuentro no aparecia.
      it('le da al SuperAdmin las mismas acciones que al administrador', async () => {
        render(<GymPresentationsPage onNavigate={vi.fn()} user={SUPERADMIN} />);

        expect(await screen.findByRole('button', { name: /nuevo encuentro/i })).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /comenzar/i })).toHaveLength(2);
        expect(screen.getAllByTitle('Eliminar')).toHaveLength(2);
      });

      // El id 1 del rol es Profesor: el check viejo `user.id_rol === 1` le daba
      // las acciones de admin al docente. El gate tiene que mirar el rol, no el id.
      it('no le da acciones de admin a un Profesor aunque tenga id_rol 1', async () => {
        render(<GymPresentationsPage onNavigate={vi.fn()} user={{ id_usuario: 5, rol: 'Profesor', id_rol: 1 }} />);

        expect(await screen.findByText('EN_CURSO')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /nuevo encuentro/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^finalizar$/i })).not.toBeInTheDocument();
      });
    });
  });

});