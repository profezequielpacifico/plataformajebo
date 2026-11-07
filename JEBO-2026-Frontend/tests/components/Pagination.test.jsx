import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { Pagination, paginasVisibles } from '../../src/components/ui/Pagination.js';

const renderPagination = (props = {}) =>
  render(
    <Pagination
      page={1}
      limit={10}
      total={0}
      onPageChange={vi.fn()}
      onLimitChange={vi.fn()}
      {...props}
    />
  );

describe('paginasVisibles', () => {
  it('lista todas las paginas mientras entran en el tope', () => {
    expect(paginasVisibles(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('marca el tope de 7 botones', () => {
    expect(paginasVisibles(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('colapsa el medio con … y deja primera y ultima a la vista', () => {
    expect(paginasVisibles(1, 40)).toEqual([1, 2, 3, null, 40]);
  });

  it('centra la ventana cuando la pagina actual esta en el medio', () => {
    expect(paginasVisibles(20, 40)).toEqual([1, null, 18, 19, 20, 21, 22, null, 40]);
  });

  it('no se rompe con totales ridiculos', () => {
    expect(paginasVisibles(1, 0)).toEqual([1]);
    expect(paginasVisibles(99, 3)).toEqual([1, 2, 3]);
  });
});

describe('Pagination', () => {
  it('dice "Sin resultados" cuando no hay nada que mostrar', () => {
    renderPagination({ total: 0 });
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Pagina/ })).not.toBeInTheDocument();
  });

  it('calcula el rango desde el total, no desde las filas de la pagina', () => {
    renderPagination({ page: 3, limit: 10, total: 23 });
    expect(screen.getByText('Mostrando 21-23 de 23 equipos')).toBeInTheDocument();
  });

  it('no dibuja botones de pagina con un solo resultado', () => {
    renderPagination({ page: 1, limit: 10, total: 2 });
    expect(screen.queryByRole('button', { name: /Pagina 2/ })).not.toBeInTheDocument();
  });

  it('avisa al cambiar de pagina', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderPagination({ page: 1, limit: 10, total: 35, onPageChange });

    await user.click(screen.getByRole('button', { name: 'Pagina 2' }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('marca la pagina actual con aria-current', () => {
    renderPagination({ page: 2, limit: 10, total: 35 });
    expect(screen.getByRole('button', { name: 'Pagina 2' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Pagina 1' })).not.toHaveAttribute('aria-current');
  });

  it('avisa el limite como numero, no como string', async () => {
    const user = userEvent.setup();
    const onLimitChange = vi.fn();
    renderPagination({ page: 1, limit: 10, total: 35, onLimitChange });

    await user.selectOptions(screen.getByLabelText('Equipos por pagina'), '50');

    expect(onLimitChange).toHaveBeenCalledWith(50);
  });

  it('omite el selector de limite si la pagina no lo pide', () => {
    renderPagination({ page: 1, limit: 10, total: 35, onLimitChange: undefined });
    expect(screen.queryByLabelText('Equipos por pagina')).not.toBeInTheDocument();
  });
});
