import React from 'react';
import { IconHome, IconTrophy, IconGamepad, IconShield, IconBarChart, IconStar, IconMap, IconMapPin, IconUsers, IconLogOut, IconActivity, IconSport, IconDistrict, IconSettings, IconPlus } from '../components/icons/index.js';
import { COLORS } from '../styles/theme/index.js';

const menuGroups = [
    {
        label: 'General',
        items: [
            { id: 'dashboard', label: 'Inicio', icon: IconHome }
        ]
    },
    {
        label: 'Competencia',
        items: [
            { id: 'tournaments', label: 'Torneos', icon: IconTrophy },
            // Consulta y alta van como dos entradas y no como una pantalla con

            { id: 'teams', label: 'Consulta de Equipos', icon: IconShield },
            { id: 'teams-new', label: 'Alta de Equipo', icon: IconPlus },
            { id: 'tournament-registration', label: 'Inscripción', icon: IconShield },
            { id: 'enrolled-teams', label: 'Inscriptos', icon: IconShield },
            { id: 'matches', label: 'Partidos', icon: IconGamepad },
            { id: 'standings', label: 'Clasificación', icon: IconBarChart },
            { id: 'final', label: 'Finales', icon: IconStar }
        ]
    },
    {
        // Seccion propia y no un item mas de Competencia: las presentaciones de

        label: 'Gimnasia Artística',
        items: [
            { id: 'gymnastics/presentaciones', label: 'Presentaciones', icon: IconStar }
        ]
    },
    {
        label: 'Infraestructura',
        items: [
            { id: 'regions', label: 'Regiones', icon: IconMap },
            { id: 'districts', label: 'Distritos', icon: IconDistrict },
            { id: 'localities', label: 'Localidades', icon: IconMapPin },
            { id: 'institutions', label: 'Instituciones', icon: IconShield },
            { id: 'courts', label: 'Canchas', icon: IconMapPin }
        ]
    },
    {
        label: 'Configuración Deportiva',
        items: [
            { id: 'sports', label: 'Deportes', icon: IconSport }
        ]
    },
    {
        label: 'Administración',
        items: [
            { id: 'users', label: 'Usuarios', icon: IconUsers },
            { id: 'audit', label: 'Actividad', icon: IconActivity }
        ]
    },
    {
        label: 'Opciones Avanzadas',
        items: [
            { id: 'advanced-options', label: 'Opciones Avanzadas', icon: IconSettings }
        ]
    }
];

const allItems = menuGroups.flatMap(g => g.items);

// IDs reales de la BD
const ROLE_IDS = {
    PROFESOR: 1,
    ARBITRO: 2,
    ADMINISTRADOR: 3,
    JUEZ: 4,
    SUPERADMIN: 20
};

function getRoleId(user) {
    if (!user) return null;
    // Prioridad: id_rol (numérico de la BD) > rol (string legacy)
    if (user.id_rol) return Number(user.id_rol);
    const roleMap = {
        'SuperAdmin': ROLE_IDS.SUPERADMIN,
        'Administrador': ROLE_IDS.ADMINISTRADOR,
        'Profesor': ROLE_IDS.PROFESOR,
        'Arbitro': ROLE_IDS.ARBITRO,
        'Juez': ROLE_IDS.JUEZ
    };
    return roleMap[user.rol] ?? null;
}

function getMenuGroups(user) {
    const roleId = getRoleId(user);

    // ÁRBITRO: solo ve sus partidos asignados
    if (roleId === ROLE_IDS.ARBITRO) {
        return [
            {
                label: 'General',
                items: [
                    { id: 'dashboard', label: 'Inicio', icon: IconHome },
                    { id: 'mis-partidos', label: 'Mis Partidos', icon: IconGamepad }
                ]
            }
        ];
    }

    if (roleId === ROLE_IDS.JUEZ) {
        return [
            {
                label: 'General',
                items: [
                    { id: 'dashboard', label: 'Inicio', icon: IconHome },
                    { id: 'gymnastics/presentaciones', label: 'Presentaciones', icon: IconStar }
                ]
            }
        ];
    }

    if (roleId === ROLE_IDS.PROFESOR) {
        return [
            {
                label: 'General',
                items: [
                    { id: 'dashboard', label: 'Inicio', icon: IconHome }
                ]
            },
            {
                label: 'Mis Equipos',
                items: [
                    { id: 'teams', label: 'Consulta de Equipos', icon: IconShield },
                    // El Profesor da de alta sus propios equipos (hasta 3, nombre
                    // único entre los suyos): el backend lo resuelve en
                    // gestionarEquipoPropio y este acceso ya estaba habilitado en
                    // ROUTE_PERMISSIONS; faltaba el atajo en el menú del rol.
                    { id: 'teams-new', label: 'Alta de Equipo', icon: IconPlus },
                    { id: 'tournament-registration', label: 'Inscripción', icon: IconShield },
                    { id: 'enrolled-teams', label: 'Inscriptos', icon: IconShield }
                ]
            },
            {
                label: 'Competencia',
                items: [
                    { id: 'tournaments', label: 'Torneos', icon: IconTrophy },
                    { id: 'matches', label: 'Partidos', icon: IconGamepad },
                    { id: 'standings', label: 'Clasificación', icon: IconBarChart }
                ]
            },
            {
                label: 'Gimnasia Artística',
                items: [
                    { id: 'gymnastics/presentaciones', label: 'Presentaciones', icon: IconStar }
                ]
            }
        ];
    }

    if (roleId === ROLE_IDS.ADMINISTRADOR) {
        const groups = menuGroups.map(group => {
            if (group.label !== 'Competencia') return group;
            const items = [];
            for (const item of group.items) {
                items.push(item);
                if (item.id === 'matches') {
                    items.push({ id: 'mis-partidos', label: 'Mis Partidos', icon: IconGamepad });
                }
            }
            return { ...group, items };
        });
        // Ocultar Administración (Usuarios, Auditoría) y Opciones Avanzadas
        return groups.filter(g => !['Administración', 'Opciones Avanzadas'].includes(g.label));
    }

    if (roleId === ROLE_IDS.SUPERADMIN) {
        return menuGroups.map(group => {
            if (group.label !== 'Competencia') return group;
            const items = [];
            for (const item of group.items) {
                items.push(item);
                if (item.id === 'matches') {
                    items.push({ id: 'mis-partidos', label: 'Mis Partidos', icon: IconGamepad });
                }
            }
            return { ...group, items };
        });
    }

    return [
        {
            label: 'General',
            items: [{ id: 'dashboard', label: 'Inicio', icon: IconHome }]
        }
    ];
}

function createResizeHandler(setIsMobile, setSidebarOpen) {
    return () => {
        const mobile = window.innerWidth < 768;
        setIsMobile(mobile);
        if (!mobile) setSidebarOpen(false);
    };
}

function getBaseStyles() {
    return {
        appContainer: {
            minHeight: '100vh',
            height: '100vh',
            backgroundColor: '#f3f4f6',
            display: 'flex',
            overflow: 'hidden',
            maxWidth: '100vw'
        },
        layout: {
            display: 'flex',
            width: '100%',
            height: '100vh',
            backgroundColor: '#ffffff',
            overflow: 'hidden'
        },
        sidebarLogo: {
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '8px',
            fontSize: '12px',
            fontWeight: 'bold',
            color: 'white',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
        },
        sidebarAdmin: {
            fontSize: '11px',
            color: COLORS.textMedium,
            marginBottom: '32px',
            fontWeight: '600',
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
        },
        sidebarGroupLabel: {
            fontSize: '10px',
            fontWeight: '700',
            color: COLORS.textMedium,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            padding: '16px 16px 6px',
            opacity: 0.6
        },
        sidebarMenu: {
            flex: 1,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
        },
        sidebarItem: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            color: COLORS.textMedium,
            textDecoration: 'none',
            transition: 'all 0.2s',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            borderRadius: '8px',
            border: 'none'
        },
        sidebarItemActive: {
            color: COLORS.primary,
            backgroundColor: '#eff6ff',
            borderLeft: '3px solid ' + COLORS.primary
        },
        sidebarPlaceholder: {
            marginTop: 'auto',
            width: '100%',
            height: '120px',
            backgroundColor: 'linear-gradient(135deg, #f3f4f6 0%, #ede9fe 100%)',
            borderRadius: '12px',
            border: '2px dashed #d1d5db',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: COLORS.textMedium,
            fontSize: '12px',
            fontWeight: '500'
        },
        mainContent: {
            flex: 1,
            backgroundColor: COLORS.bgLight,
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        },
        statCard: {
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid ' + COLORS.borderGray,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        },
        statLabel: {
            fontSize: '13px',
            color: COLORS.textMedium,
            fontWeight: '500'
        },
        statValue: {
            fontSize: '28px',
            fontWeight: '700',
            color: COLORS.primary
        },
        actionButtons: {
            display: 'flex',
            gap: '12px',
            marginBottom: '32px',
            flexWrap: 'wrap'
        },
        actionButton: {
            padding: '10px 20px',
            backgroundColor: COLORS.primary,
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        actionButtonHover: {
            backgroundColor: COLORS.primaryDark
        },
        tableContainer: {
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid ' + COLORS.borderGray,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            overflow: 'hidden'
        },
        tableHeader: {
            backgroundColor: '#f9fafb',
            padding: '16px 24px',
            borderBottom: '1px solid ' + COLORS.borderGray,
            fontSize: '16px',
            fontWeight: '600',
            color: COLORS.textDark
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse'
        },
        tableHeaderCell: {
            padding: '12px 24px',
            textAlign: 'left',
            fontSize: '12px',
            fontWeight: '600',
            color: COLORS.textMedium,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            backgroundColor: '#f9fafb',
            borderBottom: '1px solid ' + COLORS.borderGray
        },
        tableCell: {
            padding: '16px 24px',
            fontSize: '14px',
            color: COLORS.textDark,
            borderBottom: '1px solid ' + COLORS.borderGray
        }
    };
}

function getSidebarStyle(isMobile, sidebarOpen) {
    const mobileWidth = sidebarOpen ? '260px' : '0px';
    const width = isMobile ? mobileWidth : '240px';
    const mobileLeft = sidebarOpen ? '0' : '-260px';
    const left = isMobile ? mobileLeft : '0';
    return {
        width,
        minWidth: isMobile ? '0px' : '240px',
        backgroundColor: COLORS.bgSidebar,
        borderRight: isMobile ? 'none' : '1px solid ' + COLORS.borderGray,
        display: 'flex',
        flexDirection: 'column',
        padding: isMobile ? '20px' : '24px',
        height: '100vh',
        overflowY: 'auto',
        flexShrink: 0,
        position: isMobile ? 'fixed' : 'relative',
        top: 0,
        left,
        zIndex: 1000,
        transition: 'left 0.3s ease, width 0.3s ease',
        boxShadow: isMobile && sidebarOpen ? '2px 0 20px rgba(0,0,0,0.15)' : 'none',
        boxSizing: 'border-box'
    };
}

function getMobileToggleStyles(isMobile, sidebarOpen) {
    return {
        mobileMenuButton: {
            display: isMobile ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            backgroundColor: '#ffffff',
            border: '1px solid ' + COLORS.borderGray,
            borderRadius: '8px',
            cursor: 'pointer',
            position: 'fixed',
            top: '12px',
            left: '12px',
            zIndex: 1001,
            color: COLORS.textDark,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        },
        mobileOverlay: {
            display: isMobile && sidebarOpen ? 'block' : 'none',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999
        }
    };
}

function getContentStyles(isMobile) {
    return {
        header: {
            backgroundColor: '#ffffff',
            padding: isMobile ? '0 16px' : '20px 32px',
            borderBottom: '1px solid ' + COLORS.borderGray,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
            position: isMobile ? 'fixed' : 'relative',
            top: isMobile ? '0' : 'auto',
            left: '0',
            right: '0',
            zIndex: isMobile ? 998 : 'auto',
            width: '100%',
            height: isMobile ? '64px' : '72px',
            boxSizing: 'border-box'
        },
        contentArea: {
            flex: 1,
            padding: isMobile ? '80px 16px 20px' : '32px',
            overflowY: 'auto',
            overflowX: 'hidden',
            maxWidth: '100%',
            boxSizing: 'border-box'
        },
        statsGrid: {
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
            gap: isMobile ? '16px' : '24px',
            marginBottom: '32px'
        }
    };
}

function renderMobileOverlay(styles, setSidebarOpen) {
    return React.createElement('div', {
        style: styles.mobileOverlay,
        onClick: () => setSidebarOpen(false)
    });
}

function renderMobileMenuButton(styles, sidebarOpen, setSidebarOpen) {
    return React.createElement('button', {
        style: styles.mobileMenuButton,
        onClick: () => setSidebarOpen(!sidebarOpen)
    }, React.createElement('span', { style: { fontSize: '20px', lineHeight: 1 } }, '\u2630'));
}

function renderSidebarItem(item, styles, isActive, onNavigate) {
    return React.createElement('a', {
        key: item.id,
        href: '#',
        onClick: (e) => { e.preventDefault(); onNavigate(item.id); },
        style: { ...styles.sidebarItem, ...(isActive ? styles.sidebarItemActive : {}) }
    }, React.createElement(item.icon, { size: 18 }), item.label);
}

/**
 * Devuelve el id de menu al que pertenece `currentPage`, o `null`.
 *
 * Sufijo con '-' para las subpaginas planas (tournaments-history) y con '/'
 * para las anidadas (gymnastics/presentaciones/5/resultado). Sin el caso de '/'
 * entrar a una presentacion dejaba el menu sin nada marcado.
 *
 * Gana el id MAS ESPECIFICO. Con 'teams' y 'teams-new' en el mismo grupo, la
 * comparacion suelta marcaba los dos en la pantalla de alta: basta con que
 * 'teams-new' empiece por 'teams-'. Por eso se elige el match mas largo en
 * lugar de preguntar item por item.
 */
function menuIdPara(currentPage, ids) {
    if (!currentPage) return null;
    let mejor = null;
    for (const id of ids) {
        const coincide = currentPage === id
            || currentPage.startsWith(id + '-')
            || currentPage.startsWith(id + '/');
        if (coincide && (!mejor || id.length > mejor.length)) mejor = id;
    }
    return mejor;
}

function renderMenuGroup(group, styles, currentPage, onNavigate, ids) {
    const activo = menuIdPara(currentPage, ids);
    const items = group.items.map(item =>
        renderSidebarItem(item, styles, item.id === activo, onNavigate)
    );
    return React.createElement(React.Fragment, { key: group.label },
        React.createElement('div', { style: styles.sidebarGroupLabel }, group.label),
        items
    );
}

function renderSidebar(styles, currentPage, onNavigate, user) {
    const groups = getMenuGroups(user);
    const roleLabel = user && (user.rol === 'Arbitro' || user.id_rol === 10) ? 'ARBITRO' : 'ADMIN';
    // La especificidad se resuelve contra TODOS los items, no solo los del

    const ids = groups.flatMap(g => g.items.map(i => i.id));
    return React.createElement('div', { style: styles.sidebar },
        React.createElement('div', { style: styles.sidebarLogo }, 'JEBO'),
        React.createElement('div', { style: styles.sidebarAdmin }, roleLabel),
        React.createElement('div', { style: styles.sidebarMenu },
            groups.map(group => renderMenuGroup(group, styles, currentPage, onNavigate, ids))
        ),
        React.createElement('div', { style: styles.sidebarPlaceholder }, 'Espacio para imagen')
    );
}

function renderHeader(styles, isMobile, currentItem, onLogout, onNavigate) {
    return React.createElement('div', { style: styles.header },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '24px' } },
            React.createElement('span', { style: { fontSize: '18px', fontWeight: '700', color: COLORS.textDark } }, 'JEBO 2026'),
            !isMobile && React.createElement('span', { style: { fontSize: '14px', color: COLORS.textMedium } }, currentItem.label)
        ),
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '16px' } },
            !isMobile && React.createElement('span', { style: { fontSize: '14px', color: COLORS.textMedium } },
                new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })
            ),
            React.createElement('button', {
                style: {
                    padding: '8px 16px',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: COLORS.textMedium,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                },
                onClick: () => { onLogout(); onNavigate('login'); }
            }, React.createElement(IconLogOut, { size: 14 }), 'Cerrar Sesión')
        )
    );
}

function renderMainContent(styles, isMobile, currentItem, onLogout, onNavigate, children) {
    return React.createElement('div', { style: styles.mainContent },
        renderHeader(styles, isMobile, currentItem, onLogout, onNavigate),
        React.createElement('div', { style: styles.contentArea }, children)
    );
}

export function MainLayout({ user, onLogout, currentPage, onNavigate, children }) {
    const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
    const [sidebarOpen, setSidebarOpen] = React.useState(false);

    React.useEffect(() => {
        const handleResize = createResizeHandler(setIsMobile, setSidebarOpen);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const visibleItems = getMenuGroups(user).flatMap(g => g.items);
    // Mismo criterio que el menu: el item mas especifico gana. Con

    const activoId = menuIdPara(currentPage, visibleItems.map(i => i.id));
    const currentItem = visibleItems.find(i => i.id === activoId) || visibleItems[0] || allItems[0];

    const styles = {
        ...getBaseStyles(),
        sidebar: getSidebarStyle(isMobile, sidebarOpen),
        ...getMobileToggleStyles(isMobile, sidebarOpen),
        ...getContentStyles(isMobile)
    };

    return React.createElement('div', { style: styles.appContainer },
        isMobile && renderMobileOverlay(styles, setSidebarOpen),

        isMobile && renderMobileMenuButton(styles, sidebarOpen, setSidebarOpen),

        React.createElement('div', { style: styles.layout },
            renderSidebar(styles, currentPage, onNavigate, user),

            renderMainContent(styles, isMobile, currentItem, onLogout, onNavigate, children)
        )
    );
}

export default MainLayout;