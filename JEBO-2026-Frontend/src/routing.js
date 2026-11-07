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
                if (segmentos[i] === '') { coincide = false; break; }
                capture = segmentos[i];
            } else if (p !== segmentos[i]) {
                coincide = false;
                break;
            }
        }
        if (!coincide) continue;

        if (patron.length === segmentos.length) return { ruta, matchId: capture };

        if (capture === null && patron.length + 1 === segmentos.length) {
            return { ruta, matchId: segmentos[patron.length] };
        }
    }
    return { ruta: null, matchId: null };
}