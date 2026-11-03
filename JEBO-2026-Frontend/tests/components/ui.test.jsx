import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';

import {
  Table, TableHeader, TableHeaderCell, TableRow, TableCell, TableActions
} from '../../src/components/ui/Table.js';
import { Badge, getBadgeStyleByEstado } from '../../src/components/ui/Badge.js';
import { Modal, Notification } from '../../src/components/ui/Modal.js';
import { Card, CardHeader, CardTitle } from '../../src/components/ui/Card.js';
import { useResponsive } from '../../src/hooks/useResponsive.js';

const setWidth = (w) => {
  window.innerWidth = w;
  act(() => { window.dispatchEvent(new Event('resize')); });
};

// render() no devuelve el estado interno, asi que el probe lo publica en una
// variable externa que cada test puede leer.
let probe;
const leerProbe = () => {
  render(<Probe />);
  return probe;
};

describe('useResponsive', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('expone los cuatro flags a partir del ancho', () => {
    // Los componentes de tabla cambian padding y tipografia con estos flags, asi
    // que el calculo tiene que ser coherente entre si.
    setWidth(500);
    const r = leerProbe();
    expect(r.isSm).toBe(true);
    expect(r.isMd).toBe(true);
    expect(r.isXl).toBe(true);
  });

  it('clasifica un ancho de escritorio grande', () => {
    setWidth(1400);
    const r = leerProbe();
    expect(r.isSm).toBe(false);
    expect(r.isMd).toBe(false);
    expect(r.isXl).toBe(false);
  });

  it('lessThan acepta nombre de breakpoint o numero', () => {
    setWidth(700);
    const r = leerProbe();
    expect(r.lessThan('md')).toBe(true);
    expect(r.lessThan(600)).toBe(false);
  });

  it('greaterThan acepta nombre de breakpoint o numero', () => {
    setWidth(700);
    const r = leerProbe();
    expect(r.greaterThan('sm')).toBe(true);
    expect(r.greaterThan('lg')).toBe(false);
    expect(r.greaterThan(500)).toBe(true);
  });

  it('expone los breakpoints', () => {
    setWidth(800);
    const r = leerProbe();
    expect(r.breakpoints).toEqual({ sm: 640, md: 768, lg: 1024, xl: 1280 });
  });

  it('ignora los resize hasta que pasan 100ms', () => {
    // Sin el debounce, arrastrar la ventana re-renderiza en cada pixel.
    vi.useFakeTimers();
    setWidth(1000);
    render(<Probe />);
    expect(probe.width).toBe(1000);
    window.innerWidth = 500;
    act(() => { window.dispatchEvent(new Event('resize')); });
    expect(probe.width).toBe(1000);
    act(() => { vi.advanceTimersByTime(150); });
    expect(probe.width).toBe(500);
  });

  it('solo toma la ultima medicion de una rafaga de resize', () => {
    vi.useFakeTimers();
    setWidth(1000);
    render(<Probe />);
    for (const w of [900, 800, 700]) {
      window.innerWidth = w;
      act(() => { window.dispatchEvent(new Event('resize')); });
    }
    expect(probe.width).toBe(1000);
    act(() => { vi.advanceTimersByTime(150); });
    expect(probe.width).toBe(700);
  });
});

function Probe() {
  probe = useResponsive();
  return <span data-testid="probe">{String(probe.width)}</span>;
}

describe('Table', () => {
  it('renderiza la tabla con su contenido', () => {
    render(
      <Table>
        <TableHeader><TableHeaderCell>Nombre</TableHeaderCell></TableHeader>
        <tbody><TableRow><TableCell>Cancha 1</TableCell></TableRow></tbody>
      </Table>
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Nombre' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Cancha 1' })).toBeInTheDocument();
  });

  it('alinea las celdas segun el prop align', () => {
    render(
      <Table><tbody><TableRow>
        <TableCell align="center">Centro</TableCell>
        <TableCell>Izquierda</TableCell>
      </TableRow></tbody></Table>
    );
    expect(screen.getByText('Centro')).toHaveStyle({ textAlign: 'center' });
    expect(screen.getByText('Izquierda')).toHaveStyle({ textAlign: 'left' });
  });

  it('ignora colSpan en TableCell', () => {
    // TableCell solo acepta children/align/style/className: el colSpan que le
    // pasan las paginas de listado se descarta y la celda queda en una sola
    // columna. Se documenta el comportamiento real, no el deseado.
    render(<Table><tbody><TableRow><TableCell colSpan={4}>Sin datos</TableCell></TableRow></tbody></Table>);
    expect(screen.getByText('Sin datos')).not.toHaveAttribute('colspan');
  });

  it('TableActions agrupa los botones de la fila', () => {
    render(<TableActions><button>Uno</button><button>Dos</button></TableActions>);
    expect(screen.getByRole('button', { name: 'Uno' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dos' })).toBeInTheDocument();
  });
});

describe('Badge', () => {
  it('usa la variante verde por defecto', () => {
    render(<Badge>Activo</Badge>);
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('acepta cada variante sin fallar', () => {
    for (const v of ['green', 'yellow', 'red', 'blue', 'orange']) {
      const { unmount } = render(<Badge variant={v}>x</Badge>);
      expect(screen.getByText('x')).toBeInTheDocument();
      unmount();
    }
  });

  it('mapea los estados conocidos a su variante', () => {
    // La tabla de estados es la que decide el color de cada fila sin que
    // cada pagina tenga que repetir el mapeo.
    expect(getBadgeStyleByEstado('Activo')).toBe('green');
    expect(getBadgeStyleByEstado('En curso')).toBe('green');
    expect(getBadgeStyleByEstado('Programado')).toBe('green');
    expect(getBadgeStyleByEstado('Finalizado')).toBe('blue');
    expect(getBadgeStyleByEstado('En juego')).toBe('blue');
    expect(getBadgeStyleByEstado('Pendiente')).toBe('yellow');
    expect(getBadgeStyleByEstado('Inactivo')).toBe('red');
    expect(getBadgeStyleByEstado('Cancelado')).toBe('red');
  });

  it('un estado desconocido cae en verde en vez de romper', () => {
    // Si el backend agrega un estado nuevo, la fila tiene que verse igual de
    // legible, no desaparecer ni lanzar.
    expect(getBadgeStyleByEstado('Desconocido')).toBe('green');
    expect(getBadgeStyleByEstado(undefined)).toBe('green');
  });
});

describe('Modal', () => {
  it('no renderiza nada si esta cerrado', () => {
    render(<Modal isOpen={false} title="T" message="M" onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByText('T')).not.toBeInTheDocument();
  });

  it('muestra titulo y mensaje', () => {
    render(<Modal isOpen title="Borrar cancha" message="¿Eliminar?" onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Borrar cancha' })).toBeInTheDocument();
    expect(screen.getByText('¿Eliminar?')).toBeInTheDocument();
  });

  it('acepta un mensaje como nodo de React', () => {
    // Los mensajes con lista de filas se pasan como JSX, no como texto.
    render(
      <Modal isOpen title="Aviso" message={<ul><li>Fila 1</li></ul>} onClose={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(screen.getByText('Fila 1')).toBeInTheDocument();
  });

  it('confirma y cancela con los textos por defecto', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<Modal isOpen title="T" message="M" onClose={onClose} onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('permite textos de boton personalizados', async () => {
    render(
      <Modal isOpen title="T" message="M" confirmText="Eliminar" cancelText="Volver"
        onClose={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeInTheDocument();
  });

  it('un clic en el fondo cierra el modal', async () => {
    // El overlay es clicable para poder descartar sin buscar la X.
    const onClose = vi.fn();
    const { container } = render(
      <Modal isOpen title="Aviso" message="M" onClose={onClose} onConfirm={vi.fn()} />
    );
    const overlay = container.firstChild;
    await userEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it('un clic dentro del modal no lo cierra', async () => {
    // Si no, ningun clic util dentro del dialogo serviria de nada.
    const onClose = vi.fn();
    render(<Modal isOpen title="Aviso" message="M" onClose={onClose} onConfirm={vi.fn()} />);
    await userEvent.click(screen.getByText('Aviso'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('el modo warning marca el borde del dialogo y enrojece el titulo', () => {
    // El borde va en el contenedor del modal y el color en el h3, para que se
    // note sin tener que leer el texto.
    const { container } = render(
      <Modal isOpen warning title="Aviso" message="M" onClose={vi.fn()} onConfirm={vi.fn()} />
    );
    // El overlay es el primer div; el dialogo es su unico hijo.
    const dialogo = container.firstChild.firstChild;
    expect(dialogo).toHaveStyle({ border: '2px solid #ef4444' });
    expect(screen.getByRole('heading', { name: 'Aviso' })).toHaveStyle({ color: '#b91c1c' });
  });

  it('sin warning el dialogo no lleva el borde rojo', () => {
    const { container } = render(
      <Modal isOpen title="Aviso" message="M" onClose={vi.fn()} onConfirm={vi.fn()} />
    );
    const dialogo = container.firstChild.firstChild;
    expect(dialogo.style.border).toBe('');
  });
});

describe('Notification', () => {
  it('muestra el mensaje y llama onClose', async () => {
    const onClose = vi.fn();
    render(<Notification message="Guardado" onClose={onClose} />);
    await userEvent.click(screen.getByText('Guardado'));
    expect(onClose).toHaveBeenCalled();
  });

  it('el tipo error usa fondo rojo', () => {
    render(<Notification type="error" message="Falló" onClose={vi.fn()} />);
    expect(screen.getByText('Falló')).toHaveStyle({ backgroundColor: '#ef4444' });
  });

  it('el tipo success usa fondo verde', () => {
    render(<Notification message="Ok" onClose={vi.fn()} />);
    expect(screen.getByText('Ok')).toHaveStyle({ backgroundColor: '#22c55e' });
  });
});

describe('Card', () => {
  it('Card y CardHeader muestran titulo y contenido', () => {
    render(<Card><CardHeader title="Canchas"><button>Nuevo</button></CardHeader></Card>);
    expect(screen.getByRole('heading', { name: 'Canchas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nuevo' })).toBeInTheDocument();
  });

  it('CardTitle acepta children libres', () => {
    render(<Card><CardTitle>Libre</CardTitle></Card>);
    expect(screen.getByRole('heading', { name: 'Libre' })).toBeInTheDocument();
  });
});
