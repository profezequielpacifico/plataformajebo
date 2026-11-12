import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import FixtureCard from '../components/fixture/FixtureCard';

const base = {
  disciplina: { id: 1, nombre: 'Fútbol', tipo_competencia: 'MARCADOR' },
  torneo: { id: 10, nombre: 'Fútbol masculino', categoria: 'Sub-16' },
  etapa: { id: 101, nombre: 'Etapa Regional', orden: 1 },
  fecha: '2026-11-20',
  hora: '10:00',
  cancha: { id: 1, nombre: 'Polideportivo Municipal', ubicacion: 'Cancha 1', link_maps: 'https://maps.example/x' }
};

describe('FixtureCard', () => {
  it('muestra un enfrentamiento entre dos equipos', () => {
    render(<FixtureCard evento={{
      ...base,
      tipo: 'PARTIDO',
      id: 1,
      clave: 'PARTIDO-1',
      estado: 'PROGRAMADO',
      resultado: null,
      equipos: [
        { id: 1, nombre: 'Equipo A', institucion: 'Escuela A', rol: 'LOCAL' },
        { id: 2, nombre: 'Equipo B', institucion: 'Escuela B', rol: 'VISITANTE' }
      ]
    }} />);

    expect(screen.getByLabelText('Equipo A contra Equipo B')).toBeInTheDocument();
    expect(screen.getByText('vs')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('Fútbol masculino Sub-16')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Polideportivo Municipal' })).toHaveAttribute('href', 'https://maps.example/x');
    expect(screen.getByText('Programado')).toBeInTheDocument();
  });

  it('muestra el marcador de un partido finalizado', () => {
    render(<FixtureCard evento={{
      ...base,
      tipo: 'PARTIDO',
      id: 2,
      clave: 'PARTIDO-2',
      estado: 'FINALIZADO',
      resultado: { local: 3, visitante: 1 },
      equipos: [
        { id: 1, nombre: 'Equipo A', rol: 'LOCAL' },
        { id: 2, nombre: 'Equipo B', rol: 'VISITANTE' }
      ]
    }} />);

    expect(screen.getByLabelText('Equipo A 3, Equipo B 1')).toBeInTheDocument();
    expect(screen.queryByText('vs')).not.toBeInTheDocument();
  });

  it('muestra una participación sin enfrentamiento', () => {
    const { container } = render(<FixtureCard evento={{
      ...base,
      disciplina: { id: 2, nombre: 'Gimnasia artística', tipo_competencia: 'EVALUACION' },
      tipo: 'PRESENTACION',
      id: 3,
      clave: 'PRESENTACION-3',
      estado: 'EN_JUEGO',
      resultado: null,
      cancha: null,
      equipos: [{ id: 9, nombre: 'Delegación A', institucion: 'Escuela A', rol: 'GRUPO', orden_salida: 1 }]
    }} />);

    expect(screen.getByText('Delegación A')).toBeInTheDocument();
    expect(screen.getByText('Grupo, Escuela A')).toBeInTheDocument();
    expect(screen.queryByText('vs')).not.toBeInTheDocument();
    expect(container.querySelector('.enfrentamiento')).toBeNull();
    expect(screen.getByText('Lugar a confirmar')).toBeInTheDocument();
    expect(screen.getByText('En juego')).toBeInTheDocument();
  });
});
