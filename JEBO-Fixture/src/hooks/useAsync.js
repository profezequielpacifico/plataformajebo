import { useEffect, useState } from 'react';

export function useAsync(cargar, dependencias, { activo = true } = {}) {
  const [estado, setEstado] = useState({ datos: null, error: null, cargando: activo });

  useEffect(() => {
    if (!activo) {
      setEstado({ datos: null, error: null, cargando: false });
      return undefined;
    }
    const controlador = new AbortController();
    setEstado((previo) => ({ ...previo, cargando: true, error: null }));
    cargar({ signal: controlador.signal })
      .then((datos) => setEstado({ datos, error: null, cargando: false }))
      .catch((error) => {
        if (controlador.signal.aborted) return;
        setEstado({ datos: null, error, cargando: false });
      });
    return () => controlador.abort();
  }, [activo, ...dependencias]);

  return estado;
}
