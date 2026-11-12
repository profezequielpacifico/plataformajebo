const BASE_URL = (import.meta.env.VITE_API_URL || '/api/public').replace(/\/$/, '');
const USAR_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const TIEMPO_MAXIMO_MS = 15000;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const armarQuery = (params = {}) => {
  const query = new URLSearchParams();
  for (const [clave, valor] of Object.entries(params)) {
    if (valor === undefined || valor === null || valor === '') continue;
    query.set(clave, Array.isArray(valor) ? valor.join(',') : String(valor));
  }
  const texto = query.toString();
  return texto ? `?${texto}` : '';
};

export async function get(ruta, params, { signal } = {}) {
  if (USAR_MOCK) {
    const { responderMock } = await import('../mocks/mockApi');
    return responderMock(ruta, params);
  }

  const controlador = new AbortController();
  const cancelar = () => controlador.abort();
  signal?.addEventListener('abort', cancelar);
  const temporizador = setTimeout(cancelar, TIEMPO_MAXIMO_MS);

  try {
    const respuesta = await fetch(`${BASE_URL}${ruta}${armarQuery(params)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      signal: controlador.signal
    });
    const cuerpo = await respuesta.json().catch(() => null);
    if (!respuesta.ok) {
      throw new ApiError(cuerpo?.message || cuerpo?.error || `La API respondió ${respuesta.status}`, respuesta.status);
    }
    return cuerpo?.data;
  } catch (err) {
    if (err.name === 'AbortError') {
      if (signal?.aborted) throw err;
      throw new ApiError('La API tardó demasiado en responder', 0);
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError('No se pudo conectar con la API de JEBO', 0);
  } finally {
    clearTimeout(temporizador);
    signal?.removeEventListener('abort', cancelar);
  }
}
