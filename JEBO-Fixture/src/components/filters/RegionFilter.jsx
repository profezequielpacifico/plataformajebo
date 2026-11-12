import SelectFilter from './SelectFilter';

export default function RegionFilter({ regiones, valor, onCambiar, cargando }) {
  return (
    <SelectFilter
      id="filtro-region"
      etiqueta="Región educativa"
      valor={valor}
      todos="Todas las regiones"
      cargando={cargando}
      opciones={regiones.map((r) => ({ valor: r.id_region, texto: r.nombre }))}
      onCambiar={onCambiar}
    />
  );
}
