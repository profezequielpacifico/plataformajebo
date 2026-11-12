import { useEffect } from 'react';
import RegionFilter from './RegionFilter';
import TournamentFilter from './TournamentFilter';
import StageFilter from './StageFilter';
import { useRegions } from '../../hooks/useRegions';
import { useStages, useTournaments } from '../../hooks/useTournaments';

export default function FilterBar({ filtros, onCambiar, onLimpiar }) {
  const { idRegion, idTorneo, idEtapa } = filtros;
  const { regiones, cargando: cargandoRegiones } = useRegions();
  const { torneos, cargando: cargandoTorneos } = useTournaments(idRegion);
  const { etapas, cargando: cargandoEtapas } = useStages(idTorneo);

  useEffect(() => {
    if (!cargandoTorneos && idTorneo && !torneos.some((t) => t.id_torneo === idTorneo)) onCambiar('idTorneo', undefined);
  }, [cargandoTorneos, torneos, idTorneo, onCambiar]);

  useEffect(() => {
    if (!cargandoEtapas && idEtapa && !etapas.some((e) => e.id_etapa === idEtapa)) onCambiar('idEtapa', undefined);
  }, [cargandoEtapas, etapas, idEtapa, onCambiar]);

  const hayFiltros = Boolean(idRegion || idTorneo || idEtapa);

  return (
    <section className="barra-filtros" aria-label="Filtros">
      <div className="barra-filtros__interior">
        <RegionFilter regiones={regiones} valor={idRegion} cargando={cargandoRegiones} onCambiar={(v) => onCambiar('idRegion', v)} />
        <TournamentFilter torneos={torneos} valor={idTorneo} cargando={cargandoTorneos} onCambiar={(v) => onCambiar('idTorneo', v)} />
        <StageFilter etapas={etapas} valor={idEtapa} cargando={cargandoEtapas} habilitado={Boolean(idTorneo)} onCambiar={(v) => onCambiar('idEtapa', v)} />
        <button type="button" className="boton-texto" onClick={onLimpiar} disabled={!hayFiltros}>
          Ver todo
        </button>
      </div>
    </section>
  );
}
