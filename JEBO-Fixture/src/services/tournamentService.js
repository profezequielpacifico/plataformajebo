import { get } from './api';

export const obtenerTorneos = ({ idRegion } = {}, opciones) =>
  get('/tournaments', { id_region: idRegion }, opciones);

export const obtenerEtapas = (idTorneo, opciones) =>
  get(`/tournaments/${idTorneo}/stages`, undefined, opciones);
