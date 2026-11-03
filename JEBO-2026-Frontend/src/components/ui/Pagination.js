import React from 'react';
import { styles } from '../../styles/theme/index.js';
import { PAGINATION } from '../../config/constants.js';

const { createElement: h } = React;

// Tope de botones visibles. Con 18 equipos y limit=10 son 2 paginas; el tope

const MAX_BOTONES = 7;

/**
 * Arma la lista de paginas a dibujar, con `null` en el lugar de los saltos.
 * 1 … 4 5 [6] 7 … 12 en vez de los 12 numeros sueltos.
 */
export function paginasVisibles(page, totalPages) {
    const total = Math.max(1, totalPages || 1);
    const actual = Math.min(Math.max(1, page || 1), total);
    if (total <= MAX_BOTONES) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const paginas = new Set([1, total, actual]);
    // Dos vecinos a cada lado: suficiente para orientar sin llenar la barra.
    for (let d = 1; d <= 2; d++) {
        if (actual - d > 1) paginas.add(actual - d);
        if (actual + d < total) paginas.add(actual + d);
    }

    const ordenadas = [...paginas].sort((a, b) => a - b);
    const conSaltos = [];
    ordenadas.forEach((n, i) => {
        if (i > 0 && n - ordenadas[i - 1] > 1) conSaltos.push(null);
        conSaltos.push(n);
    });
    return conSaltos;
}

function estilosBoton(activo, deshabilitado) {
    return {
        ...styles.buttonOutline,
        padding: '6px 12px',
        minHeight: '36px',
        minWidth: '36px',
        marginBottom: 0,
        borderColor: activo ? styles.buttonOutline.border : '#e5e7eb',
        backgroundColor: activo ? styles.buttonOutline.color : 'transparent',
        color: activo ? '#ffffff' : styles.buttonOutline.color,
        opacity: deshabilitado ? 0.4 : 1,
        cursor: deshabilitado ? 'not-allowed' : 'pointer'
    };
}

function renderBoton(texto, destino, { activo = false, deshabilitado = false, onClick, ariaLabel }) {
    return h('button', {
        key: texto === '…' ? `gap-${destino}` : `pag-${texto}`,
        type: 'button',
        style: texto === '…'
            ? { padding: '6px 8px', minHeight: '36px', color: styles.buttonOutline.color, background: 'none', border: 'none', cursor: 'default' }
            : estilosBoton(activo, deshabilitado),
        disabled: texto === '…' ? true : deshabilitado,
        'aria-label': ariaLabel,
        'aria-current': activo ? 'page' : undefined,
        onClick: texto === '…' ? undefined : () => onClick(destino)
    }, texto);
}

/**
 * Pie de tabla con "mostrando X-Y de Z", navegacion de paginas y selector de
 * cantidad por pagina.
 *
 * El rango se calcula desde `total`, no desde el largo del arreglo de la pagina:
 * cuando la ultima pagina viene incompleta, `(page-1)*limit` sigue siendo la
 * cuenta de equipos que quedaron atras. Con los datos de la pagina,
 * `rows.length` daria el total y el pie diria "mostrando 1 de 1" en la ultima.
 */
export function Pagination({ page = 1, limit = PAGINATION.DEFAULT_LIMIT, total = 0, onPageChange, onLimitChange }) {
    const totalPaginas = Math.max(1, Math.ceil((total || 0) / (limit || PAGINATION.DEFAULT_LIMIT)));
    const actual = Math.min(Math.max(1, page || 1), totalPaginas);
    const desde = total === 0 ? 0 : (actual - 1) * limit + 1;
    const hasta = Math.min(actual * limit, total);
    // Con `total = 0` el backend manda `totalPages: 0` y la barra quedaria con

    const hayPaginas = total > 0;

    return h('div', {
        style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '16px',
            borderTop: '1px solid #e5e7eb'
        }
    },
        h('span', { style: { fontSize: '13px', color: '#6b7280' } },
            !hayPaginas
                ? 'Sin resultados'
                : `Mostrando ${desde}-${hasta} de ${total} equipos`
        ),

        h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
            hayPaginas && paginasVisibles(actual, totalPaginas).map(n =>
                n === null
                    ? renderBoton('…', 0, {})
                    : renderBoton(String(n), n, { activo: n === actual, onClick: onPageChange, ariaLabel: `Pagina ${n}` })
            ),

            onLimitChange && h('select', {
                'aria-label': 'Equipos por pagina',
                value: String(limit),
                onChange: (e) => onLimitChange(Number(e.target.value)),
                style: { ...styles.formSelect, width: 'auto', minWidth: '120px', marginBottom: 0 }
            },
                [PAGINATION.DEFAULT_LIMIT, 25, 50, PAGINATION.MAX_LIMIT]
                    .filter((v, i, arr) => arr.indexOf(v) === i)
                    .map(v => h('option', { key: v, value: String(v) }, `${v} por pagina`))
            )
        )
    );
}

export default Pagination;
