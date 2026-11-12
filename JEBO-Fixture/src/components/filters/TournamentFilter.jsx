import SelectFilter from './SelectFilter';
import { nombreTorneo } from '../../utils/fixtureFormatter';

export default function TournamentFilter({ torneos, valor, onCambiar, cargando }) {
  return (
    <SelectFilter
      id="filtro-torneo"
      etiqueta="Torneo"
      valor={valor}
      todos={torneos.length || cargando ? 'Todos los torneos' : 'Sin torneos en esta región'}
      cargando={cargando}
      deshabilitado={!cargando && torneos.length === 0}
      opciones={torneos.map((t) => ({ valor: t.id_torneo, texto: nombreTorneo(t) }))}
      onCambiar={onCambiar}
    />
  );
}
