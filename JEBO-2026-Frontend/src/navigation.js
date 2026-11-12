export function paginaDesdeUrl(pathname) {
    if (typeof pathname !== 'string') return '';
    let ruta = pathname;
    try {
        ruta = decodeURI(pathname);
    } catch {
        ruta = pathname;
    }
    return ruta.replace(/^\/+|\/+$/g, '');
}

export function urlDePagina(page) {
    return '/' + (page || '');
}
