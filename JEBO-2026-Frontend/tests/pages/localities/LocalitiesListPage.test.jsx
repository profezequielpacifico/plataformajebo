import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LocalitiesListPage } from '../../../src/pages/localities/LocalitiesListPage.js';
import { localityService } from '../../../src/services/localityService.js';

vi.mock('../../../src/services/localityService.js', () => ({
    localityService: { getAll: vi.fn(), delete: vi.fn() }
}));

const localidades = [
    { id_localidad: 1, nombre: 'Mar del Plata', distrito_nombre: 'General Pueyrredón', region_nombre: 'Región 19', codigo: '7600' },
    { id_localidad: 2, nombre: 'Claromecó', distrito_nombre: 'Tres Arroyos', region_nombre: 'Región 21', codigo: '7505' },
    { id_localidad: 3, nombre: 'Dique N° 1', distrito_nombre: 'Ensenada', region_nombre: 'Región 1', codigo: null }
];

const buscar = async (valor) => {
    render(<LocalitiesListPage onNavigate={vi.fn()} />);
    const input = await screen.findByLabelText('Buscar localidad');
    fireEvent.change(input, { target: { value: valor } });
};

describe('LocalitiesListPage - búsqueda', () => {
    beforeEach(() => {
        localityService.getAll.mockResolvedValue(localidades);
    });

    it.each([
        ['nombre sin acento', 'claromeco', 'Claromecó'],
        ['distrito', 'pueyrredon', 'Mar del Plata'],
        ['región', 'región 21', 'Claromecó'],
        ['código postal', '7600', 'Mar del Plata']
    ])('filtra por %s', async (_caso, valor, esperado) => {
        await buscar(valor);
        expect(screen.getByText(esperado)).toBeInTheDocument();
        expect(screen.getAllByRole('row')).toHaveLength(2);
    });

    it('no falla con una localidad sin código', async () => {
        await buscar('dique');
        expect(screen.getByText('Dique N° 1')).toBeInTheDocument();
    });

    it('avisa cuando no hay resultados', async () => {
        await buscar('zzz');
        expect(screen.getByText('Sin resultados para la búsqueda')).toBeInTheDocument();
    });
});
