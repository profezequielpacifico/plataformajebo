import { describe, it, expect, vi, beforeEach } from 'vitest';
import teamService from '../../src/services/teamService.js';

vi.mock('../../src/api/index.js', () => ({
  default: { get: vi.fn() }
}));

describe('teamService.getTodos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('junta todas las páginas que devuelve el servidor', async () => {
    const espia = vi.spyOn(teamService, 'getAll')
      .mockResolvedValueOnce({ data: [{ id_equipo: 1 }], pagination: { totalPages: 3 } })
      .mockResolvedValueOnce({ data: [{ id_equipo: 2 }], pagination: { totalPages: 3 } })
      .mockResolvedValueOnce({ data: [{ id_equipo: 3 }], pagination: { totalPages: 3 } });

    const equipos = await teamService.getTodos({ id_disciplina: 9 });

    expect(equipos.map(e => e.id_equipo)).toEqual([1, 2, 3]);
    expect(espia).toHaveBeenCalledTimes(3);
    expect(espia).toHaveBeenLastCalledWith({ id_disciplina: 9, page: 3, limit: 100 });
    espia.mockRestore();
  });

  it('acepta una respuesta sin paginar', async () => {
    const espia = vi.spyOn(teamService, 'getAll').mockResolvedValueOnce([{ id_equipo: 1 }]);
    expect(await teamService.getTodos()).toEqual([{ id_equipo: 1 }]);
    expect(espia).toHaveBeenCalledTimes(1);
    espia.mockRestore();
  });
});
