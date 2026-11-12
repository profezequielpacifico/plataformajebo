import { obtenerEtapas, obtenerTorneos } from '../services/tournamentService';
import { useAsync } from './useAsync';

export function useTournaments(idRegion) {
  const { datos, error, cargando } = useAsync(
    (opciones) => obtenerTorneos({ idRegion }, opciones),
    [idRegion]
  );
  return { torneos: datos || [], error, cargando };
}

export function useStages(idTorneo) {
  const { datos, error, cargando } = useAsync(
    (opciones) => obtenerEtapas(idTorneo, opciones),
    [idTorneo],
    { activo: Boolean(idTorneo) }
  );
  return { etapas: datos || [], error, cargando };
}
