import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DistrictsListPage } from '../../../src/pages/districts/DistrictsListPage.js';
import { districtService } from '../../../src/services/districtService.js';

vi.mock('../../../src/services/districtService.js', () => ({
    districtService: { getAll: vi.fn(), delete: vi.fn() }
}));

const distritos = [
    { id_distrito: 1, nombre: 'Bolívar' },
    { id_distrito: 2, nombre: 'Tandil' }
];

const buscar = async () => {
    render(<DistrictsListPage onNavigate={vi.fn()} />);
    return screen.findByPlaceholderText('Buscar distrito...');
};

describe('DistrictsListPage - búsqueda', () => {
    beforeEach(() => {
        districtService.getAll.mockResolvedValue(distritos);
    });

    it('muestra todos los distritos sin búsqueda', async () => {
        await buscar();
        expect(screen.getByText('Bolívar')).toBeInTheDocument();
        expect(screen.getByText('Tandil')).toBeInTheDocument();
    });

    it('filtra sin distinguir acentos ni mayúsculas', async () => {
        const input = await buscar();
        fireEvent.change(input, { target: { value: 'BOLIVAR' } });
        expect(screen.getByText('Bolívar')).toBeInTheDocument();
        expect(screen.queryByText('Tandil')).not.toBeInTheDocument();
    });

    it('avisa cuando no hay resultados', async () => {
        const input = await buscar();
        fireEvent.change(input, { target: { value: 'zzz' } });
        expect(screen.getByText('Sin resultados para la búsqueda')).toBeInTheDocument();
    });
});
