const Dato = ({ valor, singular, plural }) => (
  <div className="resumen__dato">
    <dt>{valor === 1 ? singular : plural}</dt>
    <dd>{valor ?? '–'}</dd>
  </div>
);

export default function SummaryCard({ resumen }) {
  const r = resumen || {};
  return (
    <dl className="resumen">
      <Dato valor={r.disciplinas} singular="disciplina" plural="disciplinas" />
      <Dato valor={r.equipos} singular="equipo participante" plural="equipos participantes" />
      <Dato valor={r.encuentros} singular="encuentro en el fixture" plural="encuentros en el fixture" />
      <Dato valor={r.por_estado?.FINALIZADO} singular="encuentro finalizado" plural="encuentros finalizados" />
    </dl>
  );
}
