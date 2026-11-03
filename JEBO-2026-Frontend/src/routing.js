/**
 * Resolucion de rutas del cliente.
 *
 * Vive aparte de `app.js` porque ese archivo monta la aplicacion contra el DOM
 * apenas se importa (`createRoot(document.getElementById('root'))`), asi que no
 * se puede testear sin un contenedor real.
 */

/**
 * Resuelve una pagina contra el mapa de rutas.
 *
 * No alcanza con partir por '/': casi todas las rutas son planas (`matches`,
 * `users`), pero las de gimnasia tienen mas de un segmento
 * (`gymnastics/presentaciones/5/resultado`). Con un `split('/')[0]` la base daba
 * siempre `gymnastics`, que no es clave de ningun renderer, y las tres pantallas
 * de gimnasia caian en el login.
 *
 * Se comparan segmento a segmento en vez de por prefijo de string. Al ordenar de
 * mas larga a mas corta, `gymnastics/presentaciones/nueva` se prueba antes que
 * `gymnastics/presentaciones/:id/detalle`; y como el match es exacto por
 * segmento, un id nunca puede confundirse con un literal como `nueva`.
 *
 * Hay dos estilos de ruta en el mapa y conviven:
 *  - declarativa: `gymnastics/presentaciones/:id/resultado`. Un segmento `:nombre`
 *    captura el valor y lo devuelve en `matchId`.
 *  - implicita: `matches-edit`, al que la pagina se llega como `matches-edit/5`.
 *    El id es el primer segmento de mas. Solo se acepta uno: si sobran dos, la
 *    pagina no es de esta ruta (asi `gymnastics/presentaciones/5/resultado` no
 *    se resuelve como la ruta base y necesita su ruta declarativa).
 */
export function resolverRuta(currentPage, rutas) {
    if (typeof currentPage !== 'string' || currentPage === '') {
        return { ruta: null, matchId: null };
    }
    const segmentos = currentPage.split('/');
    const candidatos = Object.keys(rutas).sort((a, b) => b.length - a.length);

    for (const ruta of candidatos) {
        const patron = ruta.split('/');
        if (patron.length > segmentos.length) continue;

        let capture = null;
        let coincide = true;
        for (let i = 0; i < patron.length; i++) {
            const p = patron[i];
            if (p.startsWith(':')) {
                // Un parametro no puede quedar vacio: `nueva` no es un id.
                if (segmentos[i] === '') { coincide = false; break; }
                capture = segmentos[i];
            } else if (p !== segmentos[i]) {
                coincide = false;
                break;
            }
        }
        if (!coincide) continue;

        if (patron.length === segmentos.length) return { ruta, matchId: capture };

        // Estilo implicito: un unico segmento extra es el id.
        if (capture === null && patron.length + 1 === segmentos.length) {
            return { ruta, matchId: segmentos[patron.length] };
        }
    }
    return { ruta: null, matchId: null };
}