import React, { useState } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Modal } from '../../components/ui/Modal.js';

const { createElement: h } = React;

export function pluralPeriodo(nombre) {
    return (nombre || 'Set').toLowerCase() === 'set' ? 'sets' : 'períodos';
}

function nombreEquipo(equipos, id) {
    if (Number(equipos.local?.id) === Number(id)) return equipos.local?.nombre || 'Local';
    if (Number(equipos.visitante?.id) === Number(id)) return equipos.visitante?.nombre || 'Visitante';
    return '';
}

function SetsCerrados({ lista, nombre }) {
    const cerrados = lista.filter(p => p.estado === 'CERRADO');
    if (!cerrados.length) return null;
    return h('div', {
        style: { display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', fontSize: '13px', color: '#4b5563', padding: '6px 0' }
    }, cerrados.map(p => h('div', { key: p.numero },
        h('span', null, `${nombre} ${p.numero}: ${p.puntos_local}–${p.puntos_visitante}`),
        h('span', { style: { color: '#16a34a', marginLeft: '4px' }, 'aria-hidden': 'true' }, '✔')
    )));
}

function SetEnJuego({ periodo, nombre, equipos, children }) {
    const numero = (valor, color) => h('div', {
        style: { fontSize: '30px', fontWeight: '800', color, fontVariantNumeric: 'tabular-nums' }
    }, String(valor));
    return h('div', {
        'data-testid': 'set-en-juego',
        style: { border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', margin: '8px 0' }
    },
        h('div', { style: { textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#6b7280' } },
            `${nombre} ${periodo.numero}`),
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '4px 0' } },
            h('div', { style: { flex: 1, textAlign: 'right', fontSize: '13px', color: '#4b5563' } }, equipos.local?.nombre || 'Local'),
            numero(periodo.puntos_local, '#dc2626'),
            h('div', { style: { color: '#9ca3af', fontWeight: '700' } }, '-'),
            numero(periodo.puntos_visitante, '#1d4ed8'),
            h('div', { style: { flex: 1, textAlign: 'left', fontSize: '13px', color: '#4b5563' } }, equipos.visitante?.nombre || 'Visitante')
        ),
        children
    );
}

function confirmacionDe(paso, { nombreMin, set, equipos, resumen }) {
    const marcador = `${resumen.local}–${resumen.visitante}`;
    const ganador = nombreEquipo(equipos, resumen.ganador);
    if (paso === 'set') {
        const lider = Number(set.puntos_local) > Number(set.puntos_visitante) ? equipos.local?.id : equipos.visitante?.id;
        return {
            title: `Terminar ${nombreMin} ${set.numero}`,
            message: `¿Terminar el ${nombreMin} ${set.numero} con ${set.puntos_local}–${set.puntos_visitante}? Lo gana ${nombreEquipo(equipos, lider)}. No se puede deshacer.`,
            confirmText: `Terminar ${nombreMin}`
        };
    }
    if (paso === 'anticipado') {
        return {
            title: 'Terminar el partido',
            message: `¿Terminar el partido sin jugar el ${nombreMin} 3?`,
            confirmText: 'Sí, terminar'
        };
    }
    if (paso === 'anticipadoOtraVez') {
        return {
            title: 'Confirmar el final del partido',
            message: `Confirmá otra vez: ${ganador} gana ${marcador}. No se puede deshacer.`,
            confirmText: 'Terminar partido'
        };
    }
    return {
        title: 'Cerrar el partido',
        message: `¿Cerrar el partido ${marcador}? Gana ${ganador}. No se puede deshacer.`,
        confirmText: 'Cerrar partido'
    };
}

export function PanelSets({ periodos, equipos, jugable, resultadoCerrado, busy, botonesPunto, onCerrarSet, onAbrirTercero, onCerrarPartido }) {
    const [paso, setPaso] = useState(null);
    const [setAConfirmar, setSetAConfirmar] = useState(null);

    const nombre = periodos.nombre || 'Set';
    const nombreMin = nombre.toLowerCase();
    const lista = periodos.lista || [];
    const resumen = periodos.resumen || {};
    const enJuego = lista.find(p => p.estado === 'EN_JUEGO');
    const marcador = `${resumen.local}–${resumen.visitante}`;
    const empatado = enJuego && Number(enJuego.puntos_local) === Number(enJuego.puntos_visitante);

    const cerrarModal = () => { setPaso(null); setSetAConfirmar(null); };

    const confirmar = () => {
        if (paso === 'anticipado') {
            setPaso('anticipadoOtraVez');
            return;
        }
        const numero = setAConfirmar?.numero;
        const eraSet = paso === 'set';
        cerrarModal();
        if (eraSet) onCerrarSet(numero);
        else onCerrarPartido();
    };

    const acciones = () => {
        if (resultadoCerrado) {
            return h('div', { style: { textAlign: 'center', fontSize: '13px', color: '#4b5563', padding: '8px' } },
                `Resultado cerrado ${marcador}. Falta finalizar el partido desde la pantalla de partidos.`);
        }
        if (!jugable) return null;
        if (enJuego) {
            return h('div', { style: { textAlign: 'center', paddingTop: '6px' } },
                h('button', {
                    style: styles.buttonPrimary,
                    disabled: busy || empatado,
                    onClick: () => { setSetAConfirmar({ ...enJuego }); setPaso('set'); }
                }, `Terminar ${nombreMin} ${enJuego.numero}`),
                empatado
                    ? h('div', { style: { fontSize: '12px', color: '#92400e', marginTop: '6px' } },
                        `No se puede terminar un ${nombreMin} empatado`)
                    : null
            );
        }
        if (resumen.puedeAbrirTercero) {
            return h('div', { style: { textAlign: 'center', paddingTop: '6px' } },
                h('div', { style: { fontSize: '13px', color: '#4b5563', marginBottom: '8px' } },
                    `${nombreEquipo(equipos, resumen.ganador)} ganó los ${pluralPeriodo(nombre)} 1 y 2 (${marcador}).`),
                h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' } },
                    h('button', { style: styles.buttonOutline, disabled: busy, onClick: onAbrirTercero },
                        `Jugar ${nombreMin} 3`),
                    h('button', { style: styles.buttonSuccess, disabled: busy, onClick: () => setPaso('anticipado') },
                        `Terminar partido ${marcador}`))
            );
        }
        if (resumen.definido) {
            return h('div', { style: { textAlign: 'center', paddingTop: '6px' } },
                h('button', { style: styles.buttonSuccess, disabled: busy, onClick: () => setPaso('final') },
                    `Cerrar partido ${marcador}`));
        }
        return null;
    };

    const modal = paso ? confirmacionDe(paso, { nombreMin, set: setAConfirmar, equipos, resumen }) : null;

    return h('div', null,
        h(SetsCerrados, { lista, nombre }),
        enJuego
            ? h(SetEnJuego, { periodo: enJuego, nombre, equipos }, jugable && !resultadoCerrado ? botonesPunto : null)
            : null,
        acciones(),
        h(Modal, {
            isOpen: Boolean(modal),
            onClose: cerrarModal,
            onConfirm: confirmar,
            title: modal?.title,
            message: modal?.message,
            confirmText: modal?.confirmText,
            confirmStyle: 'primary',
            warning: paso === 'anticipadoOtraVez'
        })
    );
}

export default PanelSets;
