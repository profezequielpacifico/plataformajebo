import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useFilters } from '../hooks/useFilters';

const conRuta = (inicial) => ({ children }) => <MemoryRouter initialEntries={[inicial]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{children}</MemoryRouter>;

describe('useFilters', () => {
  it('lee los filtros de la URL e ignora valores inválidos', () => {
    const { result } = renderHook(() => useFilters(), { wrapper: conRuta('/?region=2&torneo=abc&etapa=7') });
    expect(result.current.filtros).toEqual({ idRegion: 2, idTorneo: undefined, idEtapa: 7 });
  });

  it('al cambiar la región borra torneo y etapa', () => {
    const { result } = renderHook(() => useFilters(), { wrapper: conRuta('/?region=2&torneo=10&etapa=101') });
    act(() => result.current.cambiar('idRegion', 6));
    expect(result.current.filtros).toEqual({ idRegion: 6, idTorneo: undefined, idEtapa: undefined });
  });

  it('al cambiar el torneo borra solo la etapa', () => {
    const { result } = renderHook(() => useFilters(), { wrapper: conRuta('/?region=2&torneo=10&etapa=101') });
    act(() => result.current.cambiar('idTorneo', 11));
    expect(result.current.filtros).toEqual({ idRegion: 2, idTorneo: 11, idEtapa: undefined });
  });

  it('limpiar vuelve a ver todo', () => {
    const { result } = renderHook(() => useFilters(), { wrapper: conRuta('/?region=2&torneo=10') });
    act(() => result.current.limpiar());
    expect(result.current.filtros).toEqual({ idRegion: undefined, idTorneo: undefined, idEtapa: undefined });
  });
});
