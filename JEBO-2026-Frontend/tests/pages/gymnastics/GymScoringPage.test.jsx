import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { GymScoringPage } from '../../../src/pages/gymnastics/GymScoringPage.js';
import presentacionService from '../../../src/services/presentacionService.js';

vi.mock('../../../src/services/presentacionService.js', () => ({
  default: { getDetalleEvaluacion: vi.fn(), guardarEvaluacion: vi.fn() }
}));

const ID_ADMIN = 1;
const ID_JUEZ = 18;

// El endpoint devuelve una fila de `evaluaciones` por participante y por juez, con
// la clave `${id_equipo}_${id_juez}`. Se arma con las hojas de dos jueces del jurado
// mas la del admin, que no esta en `jueces`. Cada fila lleva valores distintos a
// proposito, para poder afirmar de que fila esta mirando la pantalla y no de otra.
const HOJA_JUEZ = { coord_1: 5, coord_2: 4, coord_3: 4, coord_4: 3, desem_1: 4, desem_2: 4, desem_3: 5, desem_4: 4, observaciones: 'nota del juez' };
const HOJA_OTRO_JUEZ = { coord_1: 3, coord_2: 3, coord_3: 3, coord_4: 3, desem_1: 3, desem_2: 3, desem_3: 3, desem_4: 3, observaciones: '' };
const HOJA_ADMIN = { coord_1: 1, coord_2: 1, coord_3: 1, coord_4: 1, desem_1: 1, desem_2: 1, desem_3: 1, desem_4: 1, observaciones: 'nota del admin' };

const EVALUACIONES = {
  '7_18': { id_equipo: 7, id_juez: ID_JUEZ, ...HOJA_JUEZ },
  '7_19': { id_equipo: 7, id_juez: 19, ...HOJA_OTRO_JUEZ },
  '7_1': { id_equipo: 7, id_juez: ID_ADMIN, ...HOJA_ADMIN }
};

const detalle = (currentUserId, estado = 'EN_CURSO') => ({
  presentacion: {
    id_presentacion: 1, orden: 1, estado,
    torneo_nombre: 'Torneo Gimnasia JEBO 2026', disciplina_nombre: 'Gimnasia Artística'
  },
  participantes: [{ id_equipo: 7, equipo_nombre: 'Trío A - Gimnasia', institucion_nombre: 'Escuela 1' }],
  staff: [{ id_usuario: ID_JUEZ, rol: 'JUEZ_PRESIDENTE' }],
  jueces: [
    { id_usuario: ID_JUEZ, nombre: 'Juez Uno' },
    { id_usuario: 19, nombre: 'Juez Dos' },
    { id_usuario: 20, nombre: 'Juez Tres' }
  ],
  evaluaciones: EVALUACIONES,
  currentUserId
});

// Los radios van con `display: none` (se ve la caja pintada del `label`), asi que se
// alcanzan por nombre en vez de por rol, que los deja fuera del arbol de accesibilidad.
const radio = (container, name, valor) =>
  container.querySelector(`input[name="${name}"][value="${valor}"]`);

describe('GymScoringPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    presentacionService.getDetalleEvaluacion.mockResolvedValue(detalle(ID_ADMIN));
    presentacionService.guardarEvaluacion.mockResolvedValue({});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  // El admin organiza la jornada y es quien asienta los puntos. Antes la pantalla se
  // leellia entera (radios y Guardar con `disabled`) porque el unico chequeo era
  // `jueces.some(j => j.id_usuario === currentUserId)`, y el admin nunca esta en el
  // jurado: el alta de presentacion solo ofrece usuarios con rol 'Juez'.
  it('deja al administrador seleccionar y guardar puntos aunque no este en el jurado', async () => {
    const { container } = render(
      <GymScoringPage match={1} onNavigate={vi.fn()} user={{ id_usuario: ID_ADMIN, rol: 'Administrador' }} />
    );

    await screen.findByText('Hoja de evaluación');

    expect(screen.getByRole('button', { name: /Guardar evaluación/i })).toBeEnabled();
    // El motivo del boton apagado no se muestra cuando el boton funciona: al lado
    // de un boton habilitado Invite a preguntarse por que dice que no se puede.
    expect(screen.getByRole('button', { name: /Guardar evaluación/i })).not.toHaveAttribute('title');
    fireEvent.click(radio(container, 'coord_1_7', 2));
    fireEvent.click(screen.getByRole('button', { name: /Guardar evaluación/i }));

    await waitFor(() => expect(presentacionService.guardarEvaluacion).toHaveBeenCalledTimes(1));
    expect(presentacionService.guardarEvaluacion).toHaveBeenCalledWith(1, expect.objectContaining({
      id_participante_equipo: 7,
      coord_1: 2
    }));
  });

  // La hoja del admin no entra al promedio oficial: lo resuelve la vista
  // `v_resultado_presentacion`, que filtra por `staff_presentacion`. Sin el aviso el
  // admin carga puntos, el resultado no se mueve, y no hay forma de entender desde
  // la pantalla por que.
  it('avisa que la hoja del administrador no suma al resultado oficial', async () => {
    render(
      <GymScoringPage match={1} onNavigate={vi.fn()} user={{ id_usuario: ID_ADMIN, rol: 'Administrador' }} />
    );

    expect(await screen.findByText(/no suma al resultado oficial/i)).toBeInTheDocument();
  });

  // El aviso es del admin fuera del jurado. A un juez del jurado no se le muestra:
  // su hoja si cuenta, y el texto lo dejaria dudando de lo que acaba de cargar.
  it('no muestra el aviso a un juez del jurado', async () => {
    presentacionService.getDetalleEvaluacion.mockResolvedValue(detalle(ID_JUEZ));
    render(
      <GymScoringPage match={1} onNavigate={vi.fn()} user={{ id_usuario: ID_JUEZ, rol: 'Juez' }} />
    );

    await screen.findByText('Hoja de evaluación');
    expect(screen.queryByText(/no suma al resultado oficial/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar evaluación/i })).toBeEnabled();
  });

  // Sin ser juez de la presentacion ni admin no se escribe: es otro rol que abrio la
  // URL de la hoja.
  it('deja la hoja en solo lectura para quien no es juez ni administrador', async () => {
    const { container } = render(
      <GymScoringPage match={1} onNavigate={vi.fn()} user={{ id_usuario: 55, rol: 'Delegado' }} />
    );

    await screen.findByText('Hoja de evaluación');

    expect(screen.getByRole('button', { name: /Guardar evaluación/i })).toBeDisabled();
    const opciones = container.querySelectorAll('input[name="coord_1_7"]');
    expect(opciones.length).toBeGreaterThan(0);
    opciones.forEach(r => expect(r).toBeDisabled());
    expect(container.querySelector('textarea')).toBeDisabled();
  });

  // `evaluaciones` trae las hojas de todo el jurado. La pantalla tiene que mostrar la
  // del usuario que mira: antes se guardaba la ultima fila de cada equipo, o sea la
  // del ultimo juez, y al guardar se pisaba la hoja de otro.
  it('muestra la hoja del usuario que mira, no la de otro juez', async () => {
    presentacionService.getDetalleEvaluacion.mockResolvedValue(detalle(ID_JUEZ));
    const { container } = render(
      <GymScoringPage match={1} onNavigate={vi.fn()} user={{ id_usuario: ID_JUEZ, rol: 'Juez' }} />
    );

    await screen.findByText('Hoja de evaluación');

    // Este juez tiene coord_1 = 5 y coord_4 = 3; el otro, 3 y 3; el admin, 1 y 1.
    expect(radio(container, 'coord_1_7', 5)).toBeChecked();
    expect(radio(container, 'coord_4_7', 3)).toBeChecked();
    expect(container.querySelector('textarea')).toHaveValue('nota del juez');
  });

  it('muestra la hoja del admin, separada de las de los jueces', async () => {
    const { container } = render(
      <GymScoringPage match={1} onNavigate={vi.fn()} user={{ id_usuario: ID_ADMIN, rol: 'Administrador' }} />
    );

    await screen.findByText('Hoja de evaluación');

    expect(radio(container, 'coord_1_7', 1)).toBeChecked();
    expect(container.querySelector('textarea')).toHaveValue('nota del admin');
  });

  // `guardarHoja` rechaza con "Solo se puede evaluar una presentacion EN_CURSO"
  // cualquier estado distinto de EN_CURSO. Con el boton habilitado, el juez
  // llenaba los ocho valores, apretaba Guardar y perdia todo lo escrito con un
  // error que no explicaba el motivo.
  it('deja la hoja en solo lectura si el encuentro no está en curso', async () => {
    presentacionService.getDetalleEvaluacion.mockResolvedValue(detalle(ID_JUEZ, 'PROGRAMADA'));
    const { container } = render(
      <GymScoringPage match={1} onNavigate={vi.fn()} user={{ id_usuario: ID_JUEZ, rol: 'Juez' }} />
    );

    await screen.findByText('Hoja de evaluación');

    expect(screen.getByRole('button', { name: /Guardar evaluación/i })).toBeDisabled();
    // El motivo esta en el boton, no hay que deduucirlo del error.
    expect(screen.getByRole('button', { name: /Guardar evaluación/i }))
      .toHaveAttribute('title', expect.stringContaining('EN_CURSO'));
    const opciones = container.querySelectorAll('input[name="coord_1_7"]');
    expect(opciones.length).toBeGreaterThan(0);
    opciones.forEach(r => expect(r).toBeDisabled());
    expect(container.querySelector('textarea')).toBeDisabled();
    // El motivo se lee en la pantalla y no hay que descubrirlo en el error.
    expect(screen.getByText(/no está en curso \(PROGRAMADA\)/i)).toBeInTheDocument();
  });

  // El mismo corte para el admin: el backend no le acepta una hoja a un encuentro
  // que no esta en curso, asi que el boton apagado evita el guardado perdido.
  it('deja la hoja del administrador en solo lectura si el encuentro no está en curso', async () => {
    presentacionService.getDetalleEvaluacion.mockResolvedValue(detalle(ID_ADMIN, 'FINALIZADA'));
    render(
      <GymScoringPage match={1} onNavigate={vi.fn()} user={{ id_usuario: ID_ADMIN, rol: 'Administrador' }} />
    );

    await screen.findByText('Hoja de evaluación');

    expect(screen.getByRole('button', { name: /Guardar evaluación/i })).toBeDisabled();
  });

  // Al que no tiene permiso no se le agrega el aviso del estado: ya tiene el boton
  // apagado y el aviso lo confundiria con un problema de la jornada.
  it('no muestra el aviso de estado a quien no puede puntuar', async () => {
    presentacionService.getDetalleEvaluacion.mockResolvedValue(detalle(55, 'PROGRAMADA'));
    render(
      <GymScoringPage match={1} onNavigate={vi.fn()} user={{ id_usuario: 55, rol: 'Delegado' }} />
    );

    await screen.findByText('Hoja de evaluación');

    expect(screen.queryByText(/no está en curso/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar evaluación/i })).toBeDisabled();
  });

  // Un trío sin puntuar es una hoja a medio llenar, no una hoja válida. El backend
  // la rechaza con 400 (`coord_3 1-5`), pero el nombre del trío no viaja en el
  // mensaje: con el guardado participante por participante, el juez se enteraba
  // del error cuando ya tenia escritos los tríos anteriores y sin saber cuál
  // estaba incompleto.
  it('no manda a guardar una hoja con puntajes faltantes y dice cuáles faltan', async () => {
    presentacionService.getDetalleEvaluacion.mockResolvedValue({
      ...detalle(ID_JUEZ),
      // El juez tiene su hoja cargada pero le faltan tres casillas.
      evaluaciones: { '7_18': { id_equipo: 7, id_juez: ID_JUEZ, coord_1: 5, coord_2: 4, coord_4: 3, desem_1: 4, desem_2: 4, desem_4: 4 } }
    });
    render(
      <GymScoringPage match={1} onNavigate={vi.fn()} user={{ id_usuario: ID_JUEZ, rol: 'Juez' }} />
    );

    await screen.findByText('Hoja de evaluación');
    fireEvent.click(screen.getByRole('button', { name: /Guardar evaluación/i }));

    // Cero requests: no se guarda media hoja.
    await waitFor(() => expect(screen.getByText(/Faltan puntajes/i)).toBeInTheDocument());
    expect(presentacionService.guardarEvaluacion).not.toHaveBeenCalled();
    // El mensaje nombra el trío y las casillas que faltan, no solo el nombre del
    // campo que devuelve el backend (`coord_3 1-5`, sin decir de qué trío).
    expect(screen.getByText('Faltan puntajes en Trío A - Gimnasia: Coordinación M3, Desempeño M3'))
      .toBeInTheDocument();
    // Y la fila incompleta queda marcada en la grilla.
    expect(screen.getByText('Incompleto')).toBeInTheDocument();
  });

  // Completar las casillas que faltaban y volver a apretar guarda. Sin esto, el
  // mensaje de error del caso anterior sería un callejón sin salida.
  it('guarda cuando la hoja ya está completa', async () => {
    presentacionService.getDetalleEvaluacion.mockResolvedValue({
      ...detalle(ID_JUEZ),
      evaluaciones: { '7_18': { id_equipo: 7, id_juez: ID_JUEZ, coord_1: 5, coord_2: 4, coord_4: 3, desem_1: 4, desem_2: 4, desem_4: 4 } }
    });
    const { container } = render(
      <GymScoringPage match={1} onNavigate={vi.fn()} user={{ id_usuario: ID_JUEZ, rol: 'Juez' }} />
    );

    await screen.findByText('Hoja de evaluación');
    fireEvent.click(radio(container, 'coord_3_7', 4));
    fireEvent.click(radio(container, 'desem_3_7', 5));
    fireEvent.click(screen.getByRole('button', { name: /Guardar evaluación/i }));

    await waitFor(() => expect(presentacionService.guardarEvaluacion).toHaveBeenCalledTimes(1));
    expect(presentacionService.guardarEvaluacion).toHaveBeenCalledWith(1, expect.objectContaining({
      id_participante_equipo: 7,
      coord_3: 4,
      desem_3: 5
    }));
  });
});