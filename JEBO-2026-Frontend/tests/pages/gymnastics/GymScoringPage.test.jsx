import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { GymScoringPage } from '../../../src/pages/gymnastics/GymScoringPage.js';
import presentacionService from '../../../src/services/presentacionService.js';

vi.mock('../../../src/services/presentacionService.js', () => ({
  default: { getDetalleEvaluacion: vi.fn(), guardarEvaluacion: vi.fn() }
}));

const ID_ADMIN = 1;
const ID_JUEZ = 18;

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

  it('deja al administrador seleccionar y guardar puntos aunque no este en el jurado', async () => {
    const { container } = render(
      <GymScoringPage match={1} onNavigate={vi.fn()} user={{ id_usuario: ID_ADMIN, rol: 'Administrador' }} />
    );

    await screen.findByText('Hoja de evaluación');

    expect(screen.getByRole('button', { name: /Guardar evaluación/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Guardar evaluación/i })).not.toHaveAttribute('title');
    fireEvent.click(radio(container, 'coord_1_7', 2));
    fireEvent.click(screen.getByRole('button', { name: /Guardar evaluación/i }));

    await waitFor(() => expect(presentacionService.guardarEvaluacion).toHaveBeenCalledTimes(1));
    expect(presentacionService.guardarEvaluacion).toHaveBeenCalledWith(1, expect.objectContaining({
      id_participante_equipo: 7,
      coord_1: 2
    }));
  });

  it('avisa que la hoja del administrador no suma al resultado oficial', async () => {
    render(
      <GymScoringPage match={1} onNavigate={vi.fn()} user={{ id_usuario: ID_ADMIN, rol: 'Administrador' }} />
    );

    expect(await screen.findByText(/no suma al resultado oficial/i)).toBeInTheDocument();
  });

  it('no muestra el aviso a un juez del jurado', async () => {
    presentacionService.getDetalleEvaluacion.mockResolvedValue(detalle(ID_JUEZ));
    render(
      <GymScoringPage match={1} onNavigate={vi.fn()} user={{ id_usuario: ID_JUEZ, rol: 'Juez' }} />
    );

    await screen.findByText('Hoja de evaluación');
    expect(screen.queryByText(/no suma al resultado oficial/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar evaluación/i })).toBeEnabled();
  });

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

  it('muestra la hoja del usuario que mira, no la de otro juez', async () => {
    presentacionService.getDetalleEvaluacion.mockResolvedValue(detalle(ID_JUEZ));
    const { container } = render(
      <GymScoringPage match={1} onNavigate={vi.fn()} user={{ id_usuario: ID_JUEZ, rol: 'Juez' }} />
    );

    await screen.findByText('Hoja de evaluación');

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

  it('deja la hoja en solo lectura si el encuentro no está en curso', async () => {
    presentacionService.getDetalleEvaluacion.mockResolvedValue(detalle(ID_JUEZ, 'PROGRAMADA'));
    const { container } = render(
      <GymScoringPage match={1} onNavigate={vi.fn()} user={{ id_usuario: ID_JUEZ, rol: 'Juez' }} />
    );

    await screen.findByText('Hoja de evaluación');

    expect(screen.getByRole('button', { name: /Guardar evaluación/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Guardar evaluación/i }))
      .toHaveAttribute('title', expect.stringContaining('EN_CURSO'));
    const opciones = container.querySelectorAll('input[name="coord_1_7"]');
    expect(opciones.length).toBeGreaterThan(0);
    opciones.forEach(r => expect(r).toBeDisabled());
    expect(container.querySelector('textarea')).toBeDisabled();
    expect(screen.getByText(/no está en curso \(PROGRAMADA\)/i)).toBeInTheDocument();
  });

  it('deja la hoja del administrador en solo lectura si el encuentro no está en curso', async () => {
    presentacionService.getDetalleEvaluacion.mockResolvedValue(detalle(ID_ADMIN, 'FINALIZADA'));
    render(
      <GymScoringPage match={1} onNavigate={vi.fn()} user={{ id_usuario: ID_ADMIN, rol: 'Administrador' }} />
    );

    await screen.findByText('Hoja de evaluación');

    expect(screen.getByRole('button', { name: /Guardar evaluación/i })).toBeDisabled();
  });

  it('no muestra el aviso de estado a quien no puede puntuar', async () => {
    presentacionService.getDetalleEvaluacion.mockResolvedValue(detalle(55, 'PROGRAMADA'));
    render(
      <GymScoringPage match={1} onNavigate={vi.fn()} user={{ id_usuario: 55, rol: 'Delegado' }} />
    );

    await screen.findByText('Hoja de evaluación');

    expect(screen.queryByText(/no está en curso/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Guardar evaluación/i })).toBeDisabled();
  });

  it('no manda a guardar una hoja con puntajes faltantes y dice cuáles faltan', async () => {
    presentacionService.getDetalleEvaluacion.mockResolvedValue({
      ...detalle(ID_JUEZ),
      evaluaciones: { '7_18': { id_equipo: 7, id_juez: ID_JUEZ, coord_1: 5, coord_2: 4, coord_4: 3, desem_1: 4, desem_2: 4, desem_4: 4 } }
    });
    render(
      <GymScoringPage match={1} onNavigate={vi.fn()} user={{ id_usuario: ID_JUEZ, rol: 'Juez' }} />
    );

    await screen.findByText('Hoja de evaluación');
    fireEvent.click(screen.getByRole('button', { name: /Guardar evaluación/i }));

    await waitFor(() => expect(screen.getByText(/Faltan puntajes/i)).toBeInTheDocument());
    expect(presentacionService.guardarEvaluacion).not.toHaveBeenCalled();
    expect(screen.getByText('Faltan puntajes en Trío A - Gimnasia: Coordinación M3, Desempeño M3'))
      .toBeInTheDocument();
    expect(screen.getByText('Incompleto')).toBeInTheDocument();
  });

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