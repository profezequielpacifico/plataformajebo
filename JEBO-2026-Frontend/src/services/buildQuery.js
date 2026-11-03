/**
 * Arma un query string descartando los parametros vacios.
 *
 * `new URLSearchParams({ search: undefined })` NO omite el parametro: produce
 * `search=undefined`, y el backend lo recibe como una busqueda legitima de la
 * cadena "undefined". Contra `/teams?search=undefined` la respuesta es `200` con
 * `data: []`: un filtro invisible que deja la tabla vacia sin ningun error que
 * delate el typo. Por eso los selects de filtro se arman con `cond ? valor : ''`
 * y no con `valor || undefined`.
 *
 * Se descartan `undefined`, `null` y `''`. El `0` y el `false` se conservan:
 * `?page=0` y `?incluir_cerradas=false` son parametros con significado y
 * borrarlos cambia el significado de la consulta.
 */
export function buildQuery(params = {}) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '') continue;
        query.append(key, value);
    }
    return query.toString();
}

export default buildQuery;
