const { buildPagination, buildOrderBy, formatResponse, formatPaginatedResponse, formatError } = require('../../src/utils');

describe('Utils - buildPagination', () => {
  it('usa valores por defecto', () => {
    const result = buildPagination();
    expect(result).toEqual({ page: 1, limit: 10, offset: 0 });
  });

  it('respeta valores máximos de limit', () => {
    const result = buildPagination(1, 200);
    expect(result.limit).toBe(100);
  });

  it('calcula offset correctamente', () => {
    const result = buildPagination(3, 20);
    expect(result).toEqual({ page: 3, limit: 20, offset: 40 });
  });
});

describe('Utils - formatResponse', () => {
  it('formatea respuesta exitosa con datos', () => {
    const result = formatResponse({ id: 1 });
    expect(result).toEqual({ success: true, data: { id: 1 } });
  });

  it('formatea respuesta con mensaje', () => {
    const result = formatResponse(null, 'Creado');
    expect(result).toEqual({ success: true, data: null, message: 'Creado' });
  });
});

describe('Utils - formatError', () => {
  it('formatea error sin detalles', () => {
    const result = formatError('Algo salió mal');
    expect(result).toEqual({ success: false, error: 'Algo salió mal' });
  });
});

describe('Utils - buildOrderBy', () => {
  it('usa campo por defecto si no está permitido', () => {
    const result = buildOrderBy('invalid', 'ASC', ['name']);
    expect(result).toBe('id DESC');
  });

  it('construye ORDER BY válido', () => {
    const result = buildOrderBy('name', 'DESC', ['name', 'id']);
    expect(result).toBe('name DESC');
  });
});
