import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { CalendarField } from '../../src/components/ui/CalendarField.js';

const renderField = (props = {}) => {
  const onChange = vi.fn();
  const utils = render(<CalendarField onChange={onChange} {...props} />);
  return { onChange, ...utils };
};

const campo = () => screen.getByPlaceholderText('dd/mm/aaaa');
const campoConHora = () => screen.getByPlaceholderText('dd/mm/aaaa hh:mm');

/** Abre el calendario con el click en el input. */
const abrir = async (user) => {
  await user.click(campoConHora());
  return screen.getByText(/^\w+ \d{4}$/);
};

describe('CalendarField', () => {
  it('arranca cerrado y muestra el placeholder segun pida hora', () => {
    renderField();
    expect(campo()).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '1' })).not.toBeInTheDocument();
  });

  it('abre el calendario al hacer clic', async () => {
    const user = userEvent.setup();
    renderField();

    await user.click(campo());

    expect(screen.getByText(`${mesActual()} ${anioActual()}`)).toBeInTheDocument();
  });

  it('abre el calendario al enfocarlo con el teclado', async () => {
    const user = userEvent.setup();
    renderField();

    await user.tab();

    expect(screen.getByText(`${mesActual()} ${anioActual()}`)).toBeInTheDocument();
  });

  it('muestra los dias de la semana y el mes en curso', async () => {
    const user = userEvent.setup();
    renderField();
    await user.click(campo());

    for (const dia of ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']) {
      expect(screen.getByText(dia)).toBeInTheDocument();
    }
  });

  it('navega de mes con las flechas', async () => {
    const user = userEvent.setup();
    renderField();
    await user.click(campo());

    await user.click(screen.getByRole('button', { name: '›' }));
    expect(screen.getByText(mesSiguiente())).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '‹' }));
    await user.click(screen.getByRole('button', { name: '‹' }));
    expect(screen.getByText(mesPrevio())).toBeInTheDocument();
  });

  it('devuelve el dia elegido en formato ISO y se cierra', async () => {
    const user = userEvent.setup();
    const { onChange } = renderField();
    await user.click(campo());

    await user.click(screen.getByRole('button', { name: '15' }));

    expect(onChange).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-15$/));
    expect(screen.queryByText(`${mesActual()} ${anioActual()}`)).not.toBeInTheDocument();
  });

  it('muestra el valor recibido con formato dd/mm/aaaa', () => {
    renderField({ value: '2026-03-09' });

    expect(campo()).toHaveValue('09/03/2026');
  });

  it('marca el dia seleccionado', async () => {
    const user = userEvent.setup();
    renderField({ value: '2026-03-09' });
    await user.click(campo());

    const nueve = screen.getByRole('button', { name: '9' });
    expect(nueve.style.backgroundColor).toBe('rgb(59, 130, 246)');
    expect(nueve.style.color).toBe('rgb(255, 255, 255)');
  });

  it('marca el rango entre inicio y fin', async () => {
    const user = userEvent.setup();
    renderField({ value: '2026-03-09', rangeStart: '2026-03-09', rangeEnd: '2026-03-11' });
    await user.click(campo());

    expect(screen.getByText('Marzo 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '10' }).style.backgroundColor).toBe('rgb(219, 234, 254)');
  });

  it('marca un rango con un solo extremo', async () => {
    const user = userEvent.setup();
    renderField({ value: '2026-03-20', rangeStart: '2026-03-09' });
    await user.click(campo());
    expect(screen.getByRole('button', { name: '9' }).style.backgroundColor).toBe('rgb(219, 234, 254)');

    cleanup();
    renderField({ value: '2026-03-20', rangeEnd: '2026-03-11' });
    await user.click(campo());
    expect(screen.getByRole('button', { name: '11' }).style.backgroundColor).toBe('rgb(219, 234, 254)');
  });

  it('pinta los rangos extra con su color', async () => {
    const user = userEvent.setup();
    renderField({
      value: '2026-03-20',
      extraRanges: [{ start: '2026-03-05', end: '2026-03-06', bg: '#fef3c7', fg: '#92400e' }]
    });
    await user.click(campo());

    const cinco = screen.getByRole('button', { name: '5' });
    expect(cinco.style.backgroundColor).toBe('rgb(254, 243, 199)');
    expect(cinco.style.color).toBe('rgb(146, 64, 14)');
  });

  it('acepta rangos extra de un solo dia, por inicio o por fin', async () => {
    const user = userEvent.setup();
    renderField({ value: '2026-03-20', extraRanges: [{ start: '2026-03-05' }, { end: '2026-03-07' }] });
    await user.click(campo());

    expect(screen.getByRole('button', { name: '5' }).style.backgroundColor).toBe('rgb(209, 250, 229)');
    expect(screen.getByRole('button', { name: '7' }).style.backgroundColor).toBe('rgb(209, 250, 229)');
  });

  it('ignora los rangos extra sin inicio valido', async () => {
    const user = userEvent.setup();
    renderField({ value: '2026-03-20', extraRanges: [null, {}, { end: '2026-03-07' }] });
    await user.click(campo());

    expect(screen.getByRole('button', { name: '7' }).style.backgroundColor).toBe('rgb(209, 250, 229)');
    expect(screen.getByRole('button', { name: '8' }).style.backgroundColor).toBe('transparent');
  });

  it('no rompe si los rangos extra no son una lista', async () => {
    const user = userEvent.setup();
    renderField({ value: '2026-03-20', extraRanges: 'nada' });
    await user.click(campo());

    expect(screen.getByRole('button', { name: '8' })).toBeInTheDocument();
  });

  it('cierra el calendario al tocar fuera', async () => {
    const user = userEvent.setup();
    renderField();
    await user.click(campo());
    expect(screen.getByText(`${mesActual()} ${anioActual()}`)).toBeInTheDocument();

    // La capa oscura cubre toda la ventana: es lo que recibe el toque de afuera.
    const capa = [...document.querySelectorAll('div')].find(d => d.style.cursor === 'default');
    await user.click(capa);

    expect(screen.queryByText(`${mesActual()} ${anioActual()}`)).not.toBeInTheDocument();
  });

  it('no se abre cuando esta deshabilitado', async () => {
    const user = userEvent.setup();
    renderField({ disabled: true });

    expect(campo()).toBeDisabled();
    await user.click(campo());

    expect(screen.queryByText(`${mesActual()} ${anioActual()}`)).not.toBeInTheDocument();
  });

  describe('con hora', () => {
    it('muestra la hora cargada junto a la fecha', () => {
      renderField({ value: '2026-03-09T18:30', withTime: true });

      expect(campoConHora()).toHaveValue('09/03/2026 18:30');
    });

    it('devuelve la fecha con la hora actual al elegir un dia', async () => {
      const user = userEvent.setup();
      const { onChange } = renderField({ withTime: true });
      await abrir(user);

      await user.click(screen.getByRole('button', { name: '15' }));

      expect(onChange).toHaveBeenCalledWith(expect.stringMatching(/T00:00$/));
      // Con hora el calendario sigue abierto para ajustar el horario.
      expect(screen.getByText(`${mesActual()} ${anioActual()}`)).toBeInTheDocument();
    });

    it('cambia la hora y la devuelve con la fecha', async () => {
      const user = userEvent.setup();
      const { onChange } = renderField({ value: '2026-03-09T18:30', withTime: true });
      await abrir(user);

      const [horas, minutos] = screen.getAllByRole('combobox');
      await user.selectOptions(horas, '20');
      await user.selectOptions(minutos, '45');

      expect(onChange).toHaveBeenLastCalledWith('2026-03-09T20:45');
    });

    it('no devuelve hora si todavia no se eligio un dia', async () => {
      const user = userEvent.setup();
      const { onChange } = renderField({ withTime: true });
      await abrir(user);

      await user.selectOptions(screen.getAllByRole('combobox')[0], '07');

      expect(onChange).not.toHaveBeenCalled();
    });

    it('cierra el calendario con el boton OK', async () => {
      const user = userEvent.setup();
      renderField({ value: '2026-03-09T18:30', withTime: true });
      await abrir(user);

      await user.click(screen.getByRole('button', { name: 'OK' }));

      expect(screen.queryByText(`${mesActual()} ${anioActual()}`)).not.toBeInTheDocument();
    });
  });

  it('descarta valores imposibles y deja el campo vacio', () => {
    const onChange = vi.fn();
    render(
      <>
        <CalendarField value="no-es-fecha" onChange={onChange} />
        <CalendarField value="" onChange={onChange} />
      </>
    );

    for (const input of screen.getAllByPlaceholderText('dd/mm/aaaa')) {
      expect(input).toHaveValue('');
    }
  });

  it('parte del mes del valor cargado', async () => {
    const user = userEvent.setup();
    renderField({ value: '2026-03-09' });

    await user.click(campo());

    expect(screen.getByText('Marzo 2026')).toBeInTheDocument();
  });
});

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const anioActual = () => new Date().getFullYear();
const mesActual = () => MESES[new Date().getMonth()];

const mesSiguiente = () => {
  const m = new Date().getMonth() + 1;
  return `${MESES[m % 12]} ${m === 12 ? anioActual() + 1 : anioActual()}`;
};

const mesPrevio = () => {
  const hoy = new Date();
  const m = hoy.getMonth() - 1;
  return `${MESES[(m + 12) % 12]} ${m < 0 ? anioActual() - 1 : anioActual()}`;
};
