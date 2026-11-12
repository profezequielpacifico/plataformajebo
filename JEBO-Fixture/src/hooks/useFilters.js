import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const CLAVES = { idRegion: 'region', idTorneo: 'torneo', idEtapa: 'etapa' };
const DEPENDIENTES = { idRegion: ['idTorneo', 'idEtapa'], idTorneo: ['idEtapa'], idEtapa: [] };

const leer = (params, clave) => {
  const valor = Number(params.get(CLAVES[clave]));
  return Number.isInteger(valor) && valor > 0 ? valor : undefined;
};

export function useFilters() {
  const [params, setParams] = useSearchParams();

  const filtros = useMemo(() => ({
    idRegion: leer(params, 'idRegion'),
    idTorneo: leer(params, 'idTorneo'),
    idEtapa: leer(params, 'idEtapa')
  }), [params]);

  const cambiar = useCallback((clave, valor) => {
    setParams((actual) => {
      const siguiente = new URLSearchParams(actual);
      if (valor) siguiente.set(CLAVES[clave], String(valor));
      else siguiente.delete(CLAVES[clave]);
      for (const dependiente of DEPENDIENTES[clave]) siguiente.delete(CLAVES[dependiente]);
      return siguiente;
    }, { replace: true });
  }, [setParams]);

  const limpiar = useCallback(() => {
    setParams((actual) => {
      const siguiente = new URLSearchParams(actual);
      Object.values(CLAVES).forEach((c) => siguiente.delete(c));
      return siguiente;
    }, { replace: true });
  }, [setParams]);

  return { filtros, cambiar, limpiar };
}
