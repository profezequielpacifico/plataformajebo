import { describe, it, expect, vi, beforeEach } from 'vitest';

import { buildQuery } from '../../src/services/buildQuery.js';
import { teamService } from '../../src/services/teamService.js';
import api from '../../src/api/index.js';

vi.mock('../../src/api/index.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
}));

describe('buildQuery', () => {
  it('descarta undefined, null y cadena vacia', () => {
    const q = buildQuery({ a: undefined, b: null, c: '', d: 'ok' });
    expect(q).toBe('d=ok');
  });

  it('conserva el 0 y el false porque son parametros con significado', () => {
    expect(buildQuery({ page: 0, incluir_cerradas: false })).toBe('page=0&incluir_cerradas=false');
  });

  it('codifica los valores', () => {
    expect(buildQuery({ search: 'Club Norte' })).toBe('search=Club+Norte');
  });

  it('devuelve cadena vacia sin parametros', () => {
    expect(buildQuery()).toBe('');
    expect(buildQuery({})).toBe('');
    expect(buildQuery({ a: undefined })).toBe('');
  });
});

describe('teamService.getAll', () => {
  beforeEach(() => vi.clearAllMocks());

  it('no manda parametros vacios a la API', async () => {
    api.get.mockResolvedValue({ data: [] });
    await teamService.getAll({ page: 1, limit: 10, id_disciplina: undefined, search: undefined, filter: undefined });

    expect(api.get).toHaveBeenCalledWith('/teams?page=1&limit=10');
  });

  it('manda el filtro cuando tiene valor', async () => {
    api.get.mockResolvedValue({ data: [] });
    await teamService.getAll({ page: 1, limit: 10, id_disciplina: '11' });

    expect(api.get).toHaveBeenCalledWith('/teams?page=1&limit=10&id_disciplina=11');
  });

  it('no cuelga un ? pelado cuando no hay nada que mandar', async () => {
    api.get.mockResolvedValue({ data: [] });
    await teamService.getAll();

    expect(api.get).toHaveBeenCalledWith('/teams');
  });
});
