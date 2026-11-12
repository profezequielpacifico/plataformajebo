import { obtenerRegiones } from '../services/regionService';
import { useAsync } from './useAsync';

export function useRegions() {
  const { datos, error, cargando } = useAsync((opciones) => obtenerRegiones(opciones), []);
  return { regiones: datos || [], error, cargando };
}
