import SelectFilter from './SelectFilter';

export default function StageFilter({ etapas, valor, onCambiar, cargando, habilitado }) {
  return (
    <SelectFilter
      id="filtro-etapa"
      etiqueta="Etapa"
      valor={valor}
      todos={habilitado ? 'Todas las etapas' : 'Elegí un torneo primero'}
      cargando={cargando}
      deshabilitado={!habilitado || (!cargando && etapas.length === 0)}
      opciones={etapas.map((e) => ({ valor: e.id_etapa, texto: e.nombre }))}
      onCambiar={onCambiar}
    />
  );
}
