import { lugarDeEvento } from '../../utils/fixtureFormatter';

export default function EventPlace({ cancha }) {
  const lugar = lugarDeEvento(cancha);
  if (!lugar) return <span className="lugar lugar--vacio">Lugar a confirmar</span>;
  return (
    <span className="lugar">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 15s5-4.6 5-8.5A5 5 0 0 0 3 6.5C3 10.4 8 15 8 15Z" fill="none" stroke="currentColor" strokeWidth="1.4" /><circle cx="8" cy="6.5" r="1.8" fill="currentColor" /></svg>
      {lugar.mapa
        ? <a href={lugar.mapa} target="_blank" rel="noopener noreferrer">{lugar.principal}</a>
        : <span>{lugar.principal}</span>}
      {lugar.detalle && <span className="lugar__detalle">{lugar.detalle}</span>}
    </span>
  );
}
