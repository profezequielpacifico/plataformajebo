import { useCallback, useEffect, useRef, useState } from 'react';
import { obtenerFixture, obtenerResumen } from '../services/fixtureService';

const INTERVALO_MS = Number(import.meta.env.VITE_REFRESH_MS) || 60000;

export function useFixture(filtros, { intervaloMs = INTERVALO_MS } = {}) {
  const [estado, setEstado] = useState({
    eventos: [],
    resumen: null,
    truncado: false,
    total: 0,
    error: null,
    cargando: true,
    actualizando: false,
    ultimaActualizacion: null
  });
  const controladorRef = useRef(null);
  const { idRegion, idTorneo, idEtapa } = filtros;

  const cargar = useCallback(async ({ inicial } = {}) => {
    controladorRef.current?.abort();
    const controlador = new AbortController();
    controladorRef.current = controlador;
    setEstado((previo) => ({ ...previo, cargando: inicial || previo.cargando, actualizando: !inicial, error: null }));

    try {
      const consulta = { idRegion, idTorneo, idEtapa };
      const [fixture, resumen] = await Promise.all([
        obtenerFixture(consulta, { signal: controlador.signal }),
        obtenerResumen(consulta, { signal: controlador.signal })
      ]);
      setEstado({
        eventos: fixture.eventos,
        total: fixture.total,
        truncado: fixture.truncado,
        resumen,
        error: null,
        cargando: false,
        actualizando: false,
        ultimaActualizacion: new Date()
      });
    } catch (error) {
      if (controlador.signal.aborted) return;
      setEstado((previo) => ({ ...previo, error, cargando: false, actualizando: false }));
    }
  }, [idRegion, idTorneo, idEtapa]);

  useEffect(() => {
    setEstado((previo) => ({ ...previo, eventos: [], resumen: null }));
    cargar({ inicial: true });
    return () => controladorRef.current?.abort();
  }, [cargar]);

  useEffect(() => {
    if (!intervaloMs) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') cargar();
    }, intervaloMs);
    const alVolver = () => { if (document.visibilityState === 'visible') cargar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [cargar, intervaloMs]);

  return { ...estado, actualizar: () => cargar() };
}
