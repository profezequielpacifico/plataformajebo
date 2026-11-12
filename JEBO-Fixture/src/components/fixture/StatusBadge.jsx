import { etiquetaEstado, tonoEstado } from '../../utils/fixtureFormatter';

export default function StatusBadge({ estado }) {
  return <span className={`estado estado--${tonoEstado(estado)}`}>{etiquetaEstado(estado)}</span>;
}
