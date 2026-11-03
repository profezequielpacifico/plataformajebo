import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { MainLayout } from '../../src/layouts/MainLayout.js';

/** El sidebar se muestra con left/width, no con transform. */
const sidebar = () => screen.getByText('JEBO').closest('div').parentElement;

/** Capa oscura que se dibuja detras del menu abierto. */
const overlayAbierto = () =>
  [...document.querySelectorAll('div')].find(d => d.style.backgroundColor === 'rgba(0, 0, 0, 0.5)');

/** Fija el ancho de la ventana: por debajo de 768px el layout pasa a mobile. */
const setAncho = (width) => {
  window.innerWidth = width;
  fireEvent(window, new Event('resize'));
};

const renderLayout = (props = {}) =>
  render(
    <MainLayout user={{ rol: 'Administrador' }} onLogout={vi.fn()} onNavigate={vi.fn()} currentPage="dashboard" {...props}>
      <p>Contenido de la pagina</p>
    </MainLayout>
  );

describe('MainLayout', () => {
  beforeEach(() => {
    setAncho(1200);
  });

  afterEach(() => {
    window.innerWidth = 1024;
  });

  it('muestra el logo, el rol y el contenido', () => {
    renderLayout();

    expect(screen.getByText('JEBO')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
    expect(screen.getByText('JEBO 2026')).toBeInTheDocument();
    expect(screen.getByText('Contenido de la pagina')).toBeInTheDocument();
  });

  it('agrupa el menu por secciones', () => {
    renderLayout();

    for (const grupo of ['General', 'Competencia', 'Gimnasia Artística', 'Infraestructura', 'Configuración Deportiva']) {
      expect(screen.getByText(grupo)).toBeInTheDocument();
    }
    // El Administrador no administra usuarios: esa seccion es del SuperAdmin.
    expect(screen.queryByText('Administración')).not.toBeInTheDocument();
  });

  // El modulo de Competencias se saco del menu. La ruta y la pantalla siguen
  // existiendo (se puede entrar por URL), pero ya no se ofrece en la barra.
  it('no ofrece Competencias en la barra lateral', () => {
    renderLayout();

    expect(screen.queryByRole('link', { name: 'Competencias' })).not.toBeInTheDocument();
  });

  it('tampoco le ofrece Competencias al SuperAdmin', () => {
    renderLayout({ user: { rol: 'SuperAdmin' } });

    expect(screen.queryByRole('link', { name: 'Competencias' })).not.toBeInTheDocument();
  });

  it('solo el SuperAdmin ve la seccion de Administración', () => {
    renderLayout({ user: { rol: 'SuperAdmin' } });

    expect(screen.getByText('Administración')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Usuarios' })).toBeInTheDocument();
  });

  it('tiene una seccion para las presentaciones de gimnasia', async () => {
    // Sin este item no habia forma de llegar a la disciplina desde la UI: la
    // ruta existia pero nadie la enlazaba, y el modulo queda invisible.
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    renderLayout({ onNavigate });

    expect(screen.getByText('Gimnasia Artística')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Presentaciones' }));

    expect(onNavigate).toHaveBeenCalledWith('gymnastics/presentaciones');
  });

  it('marca activo el item de gimnasia dentro de sus subpaginas', () => {
    for (const subpagina of ['gymnastics/presentaciones/5/detalle', 'gymnastics/presentaciones/5/resultado']) {
      const { unmount } = renderLayout({ currentPage: subpagina });
      const activo = screen.getByRole('link', { name: 'Presentaciones' });

      expect(activo.style.backgroundColor).not.toBe('');
      unmount();
    }
  });

  describe('equipos: consulta y alta separadas', () => {
    it('ofrece las dos entradas por separado', async () => {
      const user = userEvent.setup();
      const onNavigate = vi.fn();
      renderLayout({ onNavigate });

      expect(screen.getByRole('link', { name: 'Consulta de Equipos' })).toBeInTheDocument();
      await user.click(screen.getByRole('link', { name: 'Alta de Equipo' }));

      expect(onNavigate).toHaveBeenCalledWith('teams-new');
    });

    it('no marca activa la consulta cuando estas en el alta', () => {
      // Con 'teams' y 'teams-new' en el mismo grupo, el comparador
      // `startsWith(item.id + '-')` dejaba los dos items marcados a la vez.
      renderLayout({ currentPage: 'teams-new' });

      const consulta = screen.getByRole('link', { name: 'Consulta de Equipos' });
      const alta = screen.getByRole('link', { name: 'Alta de Equipo' });

      expect(alta.style.backgroundColor).not.toBe('');
      expect(consulta.style.backgroundColor).toBe('');
    });

    it('el encabezado dice Alta de Equipo, no Consulta de Equipos', () => {
      // Mismo problema en el titulo: `find(i => currentPage.startsWith(i.id))`
      // siempre encontraba 'teams' primero.
      renderLayout({ currentPage: 'teams-new' });

      const titulo = screen.getByText('JEBO 2026').closest('div');
      expect(titulo.textContent).toContain('Alta de Equipo');
      expect(titulo.textContent).not.toContain('Consulta de Equipos');
    });

    it('sigue funcionando la edicion por URL sin item en el menu', () => {
      const { unmount } = renderLayout({ currentPage: 'teams-edit/39' });
      // 'teams-edit' no tiene item propio; el mas especifico es 'teams'.
      expect(screen.getByRole('link', { name: 'Consulta de Equipos' }).style.backgroundColor).not.toBe('');
      unmount();

      renderLayout({ currentPage: 'teams' });
      expect(screen.getByRole('link', { name: 'Consulta de Equipos' }).style.backgroundColor).not.toBe('');
    });
  });

  it('navega a la seccion elegida', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    renderLayout({ onNavigate });

    await user.click(screen.getByRole('link', { name: 'Canchas' }));

    expect(onNavigate).toHaveBeenCalledWith('courts');
  });

  it('marca como activo el item de la pagina actual', () => {
    renderLayout({ currentPage: 'courts' });

    const activo = screen.getByRole('link', { name: 'Canchas' });
    expect(activo.style.color).not.toBe('');
    expect(activo.style.backgroundColor).not.toBe('');
  });

  it('acepta las subpaginas de una seccion', () => {
    renderLayout({ currentPage: 'tournament-registration' });

    // La subpagina no tiene item propio en el menu admin: cae en el primero.
    expect(screen.getByText('Torneos')).toBeInTheDocument();
  });

  it('muestra el nombre de la seccion actual en el encabezado', () => {
    renderLayout({ currentPage: 'matches' });

    // "Partidos" aparece en el menu y en el encabezado; se verifican ambos.
    expect(screen.getAllByText('Partidos').length).toBeGreaterThanOrEqual(2);
  });

  it('el administrador ve tambien Mis Partidos', () => {
    renderLayout();

    expect(screen.getByRole('link', { name: 'Mis Partidos' })).toBeInTheDocument();
  });

  it('el arbitro solo ve Inicio y Mis Partidos', () => {
    renderLayout({ user: { rol: 'Arbitro' } });

    expect(screen.getByText('ARBITRO')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mis Partidos' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Canchas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument();
  });

  it('un profesor ve su menu sin infraestructura ni administracion', () => {
    renderLayout({ user: { rol: 'Profesor' } });

    expect(screen.getByRole('link', { name: 'Consulta de Equipos' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Canchas' })).not.toBeInTheDocument();
    expect(screen.queryByText('Administración')).not.toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('usa el id_rol para detectar al arbitro', () => {
    renderLayout({ user: { id_rol: 10 } });

    expect(screen.getByText('ARBITRO')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Canchas' })).not.toBeInTheDocument();
  });

  it('sin usuario sigue funcionando', () => {
    renderLayout({ user: null });

    expect(screen.getByText('ADMIN')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Inicio' })).toBeInTheDocument();
  });

  it('cierra sesion y vuelve al login', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    const onNavigate = vi.fn();
    renderLayout({ onLogout, onNavigate });

    await user.click(screen.getByRole('button', { name: /cerrar sesión/i }));

    expect(onLogout).toHaveBeenCalled();
    expect(onNavigate).toHaveBeenCalledWith('login');
  });

  it('muestra la fecha de hoy en el encabezado', () => {
    renderLayout();

    const hoy = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' });
    expect(screen.getByText(hoy)).toBeInTheDocument();
  });

  describe('mobile', () => {
    it('muestra el boton de menu y esconde la fecha', () => {
      setAncho(500);
      renderLayout();

      expect(screen.getByRole('button', { name: '☰' })).toBeInTheDocument();
      const hoy = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' });
      expect(screen.queryByText(hoy)).not.toBeInTheDocument();
    });

    it('abre y cierra el menu lateral', async () => {
      setAncho(500);
      const user = userEvent.setup();
      renderLayout();

      const boton = screen.getByRole('button', { name: '☰' });

      // Cerrado: el sidebar queda fuera de pantalla.
      expect(sidebar().style.left).toBe('-260px');
      expect(sidebar().style.width).toBe('0px');

      await user.click(boton);
      expect(sidebar().style.left).toBe('0px');
      expect(sidebar().style.width).toBe('260px');

      await user.click(boton);
      expect(sidebar().style.left).toBe('-260px');
    });

    it('no dibuja la capa oscura con el menu cerrado', () => {
      setAncho(500);
      renderLayout();

      const overlay = [...document.querySelectorAll('div')].find(
        d => d.style.backgroundColor === 'rgba(0, 0, 0, 0.5)'
      );
      expect(overlay.style.display).toBe('none');
    });

    it('cierra el menu al tocar la capa de fondo', async () => {
      setAncho(500);
      const user = userEvent.setup();
      renderLayout();

      await user.click(screen.getByRole('button', { name: '☰' }));
      const overlay = overlayAbierto();
      expect(overlay).toBeTruthy();
      expect(overlay.style.display).toBe('block');

      await user.click(overlay);

      expect(sidebar().style.left).toBe('-260px');
    });

    it('vuelve a desktop al agrandar la ventana y cierra el menu', async () => {
      setAncho(500);
      const user = userEvent.setup();
      renderLayout();

      await user.click(screen.getByRole('button', { name: '☰' }));
      act(() => setAncho(1200));

      expect(screen.queryByRole('button', { name: '☰' })).not.toBeInTheDocument();
    });
  });
});
