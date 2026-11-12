import { get } from './api';

const aParametros = ({ idRegion, idTorneo, idEtapa, idDisciplina, desde, hasta, estados } = {}) => ({
  id_region: idRegion,
  id_torneo: idTorneo,
  id_etapa: idEtapa,
  id_disciplina: idDisciplina,
  desde,
  hasta,
  estado: estados
});

export const obtenerFixture = (filtros, opciones) => get('/fixture', aParametros(filtros), opciones);
export const obtenerResumen = (filtros, opciones) => get('/summary', aParametros(filtros), opciones);
