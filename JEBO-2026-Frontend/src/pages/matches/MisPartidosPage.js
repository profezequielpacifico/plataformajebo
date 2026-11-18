import React, { useState, useEffect, useCallback } from 'react';
import { styles } from '../../styles/theme/index.js';
import { Card, CardHeader } from '../../components/ui/Card.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal, Notification } from '../../components/ui/Modal.js';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell } from '../../components/ui/Table.js';
import { IconGamepad } from '../../components/icons/index.js';
import matchService from '../../services/matchService.js';
import { estadoFechaPartido, formatearFecha } from '../../services/dateService.js';
import { useFiltrosPartidos, paramsDeFiltros, renderFiltrosPartidos } from '../../components/matches/FiltrosPartidos.js';
import { ROUTES } from '../../config/constants.js';
import { esAdministrador } from '../../services/roles.js';

const { createElement: h } = React;

function getBadgeVariant(status) {
    const s = (status || '').toLowerCase();
    if (s === 'finalizado') return 'blue';
    if (s === 'en juego' || s === 'en progreso' || s === 'en curso') return 'green';
    if (s === 'cancelado') return 'red';
    if (s === 'pendiente') return 'orange';
    return 'yellow';
}

function loadMatches(filtros, setMatches, setLoading) {
    setLoading(true);
    matchService.getMine(paramsDeFiltros(filtros))
        .then(res => {
            const data = res.data || res || [];
            setMatches(Array.isArray(data) ? data : []);
        })
        .catch(err => console.error('Error loading my matches:', err))
        .finally(() => setLoading(false));
}

function renderFilters({ filtrosPartidos, onRefresh }) {
    return h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
        renderFiltrosPartidos(filtrosPartidos),
        h('button', { style: styles.buttonPrimary, onClick: () => onRefresh() }, h(IconGamepad, { size: 16 }), 'Actualizar')
    );
}

function renderMatchActions(match, onStart, onLive, onFinalize) {
    const estado = match.estado || match.status;
    if (estado === 'Finalizado' || estado === 'Cancelado') return '—';

    const buttons = [];
    if (estado === 'Pendiente' || estado === 'Programado') {

        const fecha = estadoFechaPartido(match.fecha);
        const bloqueado = !fecha.permitido;
        const motivo = bloqueado
            ? (fecha.motivo === 'pasado'
                ? `La fecha (${formatearFecha(fecha.fecha)}) ya paso`
                : `El partido es del ${formatearFecha(fecha.fecha)}`)
            : '';
        buttons.push(h('button', {
            key: 'start',
            style: bloqueado
                ? { ...styles.buttonPrimary, opacity: 0.5, cursor: 'not-allowed' }
                : styles.buttonPrimary,
            disabled: bloqueado,
            title: bloqueado ? motivo : undefined,
            onClick: () => { if (!bloqueado) onStart(match); }
        }, '▶', ' Comenzar'));
        if (bloqueado) {
            buttons.push(h('span', {
                key: 'fecha-nota',
                style: { fontSize: '11px', color: '#94a3b8', alignSelf: 'center' },
                title: motivo
            }, motivo));
        }
    }
    if (estado === 'En Juego' || estado === 'En Progreso' || estado === 'En progreso') {

        buttons.push(h('button', {
            key: 'live',
            style: styles.buttonSuccess,
            onClick: () => onLive(match)
        }, '▶ Abrir en vivo'));
        buttons.push(h('button', {
            key: 'finalize',
            style: styles.buttonDanger,
            onClick: () => onFinalize(match)
        }, 'Finalizar'));
    }

    if (buttons.length === 0) return '—';
    return h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } }, buttons);
}

function renderStartModal({ showStart, startMatch, setShowStart, onConfirm }) {
    if (!showStart) return null;
    return h(Modal, {
        isOpen: showStart,
        onClose: () => setShowStart(false),
        onConfirm,
        title: 'Comenzar partido',
        message: startMatch
            ? `¿Dar inicio al partido "${startMatch.equipo_local_nombre || 'Local'} vs ${startMatch.equipo_visitante_nombre || 'Visitante'}"?`
            : '¿Deseas comenzar el partido?',
        confirmText: 'Comenzar',
        confirmStyle: 'primary'
    });
}

function renderFinalizeModal({ showFinalize, finalizeMatch, setShowFinalize, onConfirm }) {
    if (!showFinalize) return null;
    const basico = finalizeMatch
        ? `¿Registrar la finalización del partido "${finalizeMatch.equipo_local_nombre || 'Local'} vs ${finalizeMatch.equipo_visitante_nombre || 'Visitante'}"?`
        : 'El partido quedará finalizado y ya no podrá modificarse.';
    const resultado = finalizeMatch && (finalizeMatch.resultado || finalizeMatch.resultado_cargado)
        ? ` Resultado: ${finalizeMatch.goles_local} - ${finalizeMatch.goles_visitante}.`
        : ' Aún no se cargó el resultado.';
    return h(Modal, {
        isOpen: showFinalize,
        onClose: () => setShowFinalize(false),
        onConfirm,
        title: 'Finalizar partido',
        warning: true,
        message: basico + resultado,
        confirmText: 'Finalizar',
        confirmStyle: 'danger'
    });
}

function getMatchResultado(match) {
    if (match.resultado) return match.resultado;
    if (match.resultado_cargado) return `${match.goles_local} - ${match.goles_visitante}`;
    return '';
}

function getMatchNombre(equipo, fallback, conGoles) {
    const nombre = equipo || fallback;
    return conGoles ? `${nombre} (${conGoles})` : nombre;
}

function renderMatchRow(match, onStart, onLive, onFinalize) {
    const resultado = getMatchResultado(match);
    return h(TableRow, { key: match.id_partido || match.id },
        h(TableCell, null, formatearFecha(match.fecha)),
        h(TableCell, null, match.hora || '—'),
        h(TableCell, null, match.cancha_nombre || '—'),
        h(TableCell, null, match.torneo || '—'),
        h(TableCell, null, match.disciplina_nombre || '—'),
        h(TableCell, { className: 'bold' }, getMatchNombre(
            match.equipo_local_nombre, match.local || 'Local',
            resultado ? match.goles_local : null
        )),
        h(TableCell, { className: 'bold' }, getMatchNombre(
            match.equipo_visitante_nombre, match.visitante || 'Visitante',
            resultado ? match.goles_visitante : null
        )),
        h(TableCell, null, h(Badge, { variant: getBadgeVariant(match.estado || match.status) }, match.estado || match.status || '—')),
        h(TableCell, { align: 'center', className: 'score' }, resultado || '—'),
        h(TableCell, null, renderMatchActions(match, onStart, onLive, onFinalize))
    );
}

function getMatchesRows({ loading, matches, onStart, onLive, onFinalize }) {
    if (loading) {
        return h(TableRow, null, h(TableCell, { colSpan: 10, style: { textAlign: 'center' } }, 'Cargando...'));
    }
    if (matches.length === 0) {
        return h(TableRow, null, h(TableCell, { colSpan: 10, style: { textAlign: 'center' } }, 'No hay partidos para los filtros seleccionados'));
    }
    return matches.map(match => renderMatchRow(match, onStart, onLive, onFinalize));
}

function renderMatchesTable(props) {
    const rows = getMatchesRows(props);

    return h(Table, null,
        h(TableHeader, null,
            h(TableHeaderCell, null, 'Fecha'),
            h(TableHeaderCell, null, 'Hora'),
            h(TableHeaderCell, null, 'Cancha'),
            h(TableHeaderCell, null, 'Torneo'),
            h(TableHeaderCell, null, 'Deporte'),
            h(TableHeaderCell, null, 'Equipo A'),
            h(TableHeaderCell, null, 'Equipo B'),
            h(TableHeaderCell, null, 'Estado'),
            h(TableHeaderCell, { align: 'center' }, 'Resultado'),
            h(TableHeaderCell, null, 'Acciones')
        ),
        h('tbody', null, rows)
    );
}

function useMatchActions(refresh, onNavigate) {
    const [showStart, setShowStart] = useState(false);
    const [startMatch, setStartMatch] = useState(null);
    const [showFinalize, setShowFinalize] = useState(false);
    const [finalizeMatch, setFinalizeMatch] = useState(null);
    const [notif, setNotif] = useState(null);

    useEffect(() => {
        if (!notif) return;
        const t = setTimeout(() => setNotif(null), 3000);
        return () => clearTimeout(t);
    }, [notif]);

    const openStart = (match) => {
        setStartMatch(match);
        setShowStart(true);
    };

    const handleStart = async () => {
        if (!startMatch) return;
        try {
            await matchService.updateStatus(startMatch.id_partido || startMatch.id, { estado: 'En Juego' });
            setShowStart(false);
            setStartMatch(null);
            setNotif({ message: 'Partido iniciado', type: 'success' });
            refresh();
        } catch (err) {

            setShowStart(false);
            setStartMatch(null);
            setNotif({ message: err.message || 'No se pudo iniciar el partido', type: 'error' });
            refresh();
        }
    };

    const abrirEnVivo = (match) => onNavigate(`${ROUTES.MATCH_LIVE}/${match.id_partido || match.id}`);

    const openFinalize = (match) => {
        setFinalizeMatch(match);
        setShowFinalize(true);
    };

    const handleFinalize = async () => {
        if (!finalizeMatch) return;
        try {
            await matchService.updateStatus(finalizeMatch.id_partido || finalizeMatch.id, { estado: 'Finalizado' });
            setShowFinalize(false);
            setFinalizeMatch(null);
            setNotif({ message: 'Partido finalizado', type: 'success' });
            refresh();
        } catch (err) {
            alert('Error al finalizar: ' + (err.message || 'Error desconocido'));
        }
    };

    return {
        notif, setNotif,
        showStart, startMatch, setShowStart, handleStart, openStart,
        showFinalize, finalizeMatch, setShowFinalize, handleFinalize, openFinalize,
        abrirEnVivo
    };
}

export function MisPartidosPage({ user, onNavigate }) {
    const isAdmin = esAdministrador(user);
    const subtitle = isAdmin
        ? 'Todos los partidos con filtros por región, torneo, equipos y estado'
        : 'Partidos donde estás asignado como árbitro';
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const filtrosPartidos = useFiltrosPartidos();
    const { filtros } = filtrosPartidos;

    const refresh = useCallback(() => {
        loadMatches(filtros, setMatches, setLoading);
    }, [filtros]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const acciones = useMatchActions(refresh, onNavigate);

    return h('div', { className: 'match-page' },
        acciones.notif && h(Notification, {
            message: acciones.notif.message,
            type: acciones.notif.type,
            onClose: () => acciones.setNotif(null)
        }),
        h('div', { className: 'match-section' },
            h('h1', { className: 'match-title' }, 'Mis Partidos'),
            h('div', { style: { fontSize: '13px', color: '#666666' } }, subtitle)
        ),
        h(Card, null,
            h(CardHeader, { title: 'Mis Partidos' },
                renderFilters({ filtrosPartidos, onRefresh: refresh })
            ),
            renderMatchesTable({
                loading,
                matches,
                onStart: acciones.openStart,
                onLive: acciones.abrirEnVivo,
                onFinalize: acciones.openFinalize
            })
        ),
        renderStartModal({
            showStart: acciones.showStart,
            startMatch: acciones.startMatch,
            setShowStart: acciones.setShowStart,
            onConfirm: acciones.handleStart
        }),
        renderFinalizeModal({
            showFinalize: acciones.showFinalize,
            finalizeMatch: acciones.finalizeMatch,
            setShowFinalize: acciones.setShowFinalize,
            onConfirm: acciones.handleFinalize
        })
    );
}

export default MisPartidosPage;
