import React, { useState, useEffect } from 'react';
import { styles } from '../../styles/theme/index.js';
import tournamentService from '../../services/tournamentService.js';
import regionService from '../../services/regionService.js';
import teamService from '../../services/teamService.js';
import { soloTorneosConPartidos } from '../../services/tiposCompetencia.js';

const { createElement: h } = React;

const ESTADOS_TORNEO_CERRADO = ['finalizado', 'cancelado'];

const ESTADOS_PARTIDO = ['Pendiente', 'Programado', 'En Juego', 'Finalizado', 'Cancelado'];

export const FILTROS_VACIOS = { region: '', torneo: '', equipoA: '', equipoB: '', estado: '' };

const lista = (res) => {
    const data = res?.data ?? res;
    return Array.isArray(data) ? data : [];
};

const comboStyle = (width) => ({ ...styles.formSelect, width, maxWidth: '100%', flexGrow: 1, marginBottom: 0 });

function loadTournaments(setTournaments) {
    tournamentService.getAll(1, 100).then(res => {
        const activos = lista(res).filter(t => !ESTADOS_TORNEO_CERRADO.includes(String(t.estado || '').toLowerCase()));
        setTournaments(soloTorneosConPartidos(activos));
    }).catch(err => console.error(err));
}

function loadRegions(setRegions) {
    regionService.getAll({ limit: 100 }).then(res => {
        setRegions(lista(res).slice().sort((a, b) => a.id_region - b.id_region));
    }).catch(err => console.error(err));
}

function loadTeams(torneo, region, setTeams) {
    if (!torneo) {
        setTeams([]);
        return;
    }
    const params = { id_torneo: torneo, limit: 100, include_cerradas: 'true' };
    if (region) params.id_region = region;
    teamService.getEnrolled(params).then(res => {
        setTeams(lista(res).slice().sort((a, b) => String(a.equipo_nombre).localeCompare(String(b.equipo_nombre), 'es', { numeric: true })));
    }).catch(err => {
        console.error(err);
        setTeams([]);
    });
}

export function paramsDeFiltros(filtros) {
    const params = { limit: 100 };
    if (filtros.estado) params.estado = filtros.estado;
    if (filtros.torneo) params.id_torneo = filtros.torneo;
    if (filtros.region) params.id_region = filtros.region;
    if (filtros.equipoA) params.id_equipo = filtros.equipoA;
    if (filtros.equipoB) params.id_equipo_rival = filtros.equipoB;
    return params;
}

export function useFiltrosPartidos() {
    const [filtros, setFiltros] = useState(FILTROS_VACIOS);
    const [tournaments, setTournaments] = useState([]);
    const [regions, setRegions] = useState([]);
    const [teams, setTeams] = useState([]);
    const cambiar = (parcial) => setFiltros(prev => ({ ...prev, ...parcial }));

    useEffect(() => {
        loadTournaments(setTournaments);
        loadRegions(setRegions);
    }, []);

    useEffect(() => {
        loadTeams(filtros.torneo, filtros.region, setTeams);
    }, [filtros.torneo, filtros.region]);

    return { filtros, cambiar, tournaments, regions, teams };
}

function renderTeamCombo({ label, value, teams, excluir, disabled, onChange }) {
    return h('select', {
        key: label,
        value,
        disabled,
        'aria-label': label,
        title: disabled ? 'Elegí un torneo para ver sus equipos' : label,
        onChange: (e) => onChange(e.target.value),
        style: comboStyle('220px')
    },
        h('option', { value: '' }, disabled ? `${label}: elegí un torneo` : `${label}: todos`),
        teams
            .filter(t => String(t.id_equipo) !== String(excluir))
            .map(t => h('option', { key: t.id_equipo, value: String(t.id_equipo) }, t.equipo_nombre))
    );
}

export function renderFiltrosPartidos({ filtros, cambiar, regions, tournaments, teams }) {
    const sinTorneo = !filtros.torneo;
    return [
        h('select', {
            key: 'region',
            value: filtros.region,
            'aria-label': 'Región',
            onChange: (e) => cambiar({ region: e.target.value, equipoA: '', equipoB: '' }),
            style: comboStyle('170px')
        },
            h('option', { value: '' }, 'Todas las regiones'),
            regions.map(r => h('option', { key: r.id_region, value: String(r.id_region) }, r.nombre))
        ),
        h('select', {
            key: 'torneo',
            value: filtros.torneo,
            'aria-label': 'Torneo',
            onChange: (e) => cambiar({ torneo: e.target.value, equipoA: '', equipoB: '' }),
            style: comboStyle('220px')
        },
            h('option', { value: '' }, 'Todos los torneos activos'),
            tournaments.map(t => h('option', { key: t.id_torneo || t.id, value: String(t.id_torneo || t.id) }, `${t.nombre || t.name} (${t.disciplina_nombre || ''})`))
        ),
        renderTeamCombo({
            label: 'Equipo A',
            value: filtros.equipoA,
            teams,
            excluir: filtros.equipoB,
            disabled: sinTorneo,
            onChange: (v) => cambiar({ equipoA: v })
        }),
        renderTeamCombo({
            label: 'Equipo B',
            value: filtros.equipoB,
            teams,
            excluir: filtros.equipoA,
            disabled: sinTorneo,
            onChange: (v) => cambiar({ equipoB: v })
        }),
        h('select', {
            key: 'estado',
            value: filtros.estado,
            'aria-label': 'Estado',
            onChange: (e) => cambiar({ estado: e.target.value }),
            style: comboStyle('160px')
        },
            h('option', { value: '' }, 'Todos los estados'),
            ESTADOS_PARTIDO.map(e => h('option', { key: e, value: e }, e))
        )
    ];
}
