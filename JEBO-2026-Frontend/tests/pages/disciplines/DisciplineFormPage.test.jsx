import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { DisciplineFormPage } from '../../../src/pages/disciplines/DisciplineFormPage.js';
import disciplineService from '../../../src/services/disciplineService.js';

vi.mock('../../../src/services/disciplineService.js', () => ({
  default: {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    uploadReglamento: vi.fn(),
    getReglamentoUrl: vi.fn(() => '#')
  }
}));

const VOLEY = {
  id_disciplina: 2, nombre: 'Vóley', descripcion: '', jugadores_por_equipo: 6,
  tipo_competencia: 'MARCADOR', puntos_victoria: 2, puntos_empate: 1, puntos_derrota: 1,
  marcador_por_periodos: true, nombre_periodo: 'Set', max_periodos: 3
};

describe('DisciplineFormPage por sets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    disciplineService.create.mockResolvedValue({ data: { id_disciplina: 9 } });
    disciplineService.update.mockResolvedValue({});
  });

  it('una disciplina nueva no va por sets y lo manda asi', async () => {
    render(<DisciplineFormPage onNavigate={vi.fn()} />);

    expect(screen.getByLabelText('Se juega por sets o períodos (al mejor de 3)')).not.toBeChecked();
    await userEvent.type(screen.getByPlaceholderText('Ej: Fútbol, Voleibol...'), 'Fútbol');
    await userEvent.click(screen.getByRole('button', { name: /Guardar|Registrar/ }));

    expect(disciplineService.create).toHaveBeenCalledWith(expect.objectContaining({
      marcador_por_periodos: false, nombre_periodo: null, max_periodos: null
    }));
  });

  it('al marcarlo deja elegir Set o Período y manda el maximo en 3', async () => {
    render(<DisciplineFormPage onNavigate={vi.fn()} />);

    await userEvent.type(screen.getByPlaceholderText('Ej: Fútbol, Voleibol...'), 'Ringo');
    await userEvent.click(screen.getByLabelText('Se juega por sets o períodos (al mejor de 3)'));
    await userEvent.selectOptions(screen.getByLabelText('Cada parte se llama'), 'Período');
    await userEvent.click(screen.getByRole('button', { name: /Guardar|Registrar/ }));

    expect(disciplineService.create).toHaveBeenCalledWith(expect.objectContaining({
      marcador_por_periodos: true, nombre_periodo: 'Período', max_periodos: 3
    }));
  });

  it('al editar vóley carga el modo por sets', async () => {
    disciplineService.getById.mockResolvedValue(VOLEY);
    render(<DisciplineFormPage onNavigate={vi.fn()} disciplineId={2} />);

    expect(await screen.findByLabelText('Se juega por sets o períodos (al mejor de 3)')).toBeChecked();
    expect(screen.getByLabelText('Cada parte se llama')).toHaveValue('Set');
  });
});
