import { get } from './api';

export const obtenerRegiones = (opciones) => get('/regions', undefined, opciones);
export const obtenerDisciplinas = (opciones) => get('/disciplines', undefined, opciones);
