import React from 'react';
import { IconHome, IconTrophy, IconGamepad, IconShield, IconBarChart, IconStar, IconMap, IconMapPin, IconUsers, IconLogOut, IconActivity, IconSport, IconDistrict, IconSettings, IconPlus, IconMenu, IconClose } from '../components/icons/index.js';
import { COLORS } from '../styles/theme/index.js';
import { calcUiScale } from '../hooks/useResponsive.js';

const MOBILE_BELOW = 1024;
const LOGOUT_ICON_BELOW = 360;

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

const ROLE_IDS = {
    PROFESOR: 1,
    ARBITRO: 2,
    ADMINISTRADOR: 3,
    JUEZ: 4,
    SUPERADMIN: 20
};

function getRoleId(user) {
    if (!user) return null;
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

function createResizeHandler(setIsMobile, setSidebarOpen, setUiScale, setLogoutSoloIcono) {
    return () => {
        const mobile = window.innerWidth < MOBILE_BELOW;
        setIsMobile(mobile);
        setUiScale(calcUiScale());
        setLogoutSoloIcono(window.innerWidth < LOGOUT_ICON_BELOW);
        if (!mobile) setSidebarOpen(false);
    };
}

function getBaseStyles(alto, uiScale) {
    return {
        appContainer: {
            minHeight: alto,
            height: alto,
            backgroundColor: '#f3f4f6',
            display: 'flex',
            overflow: 'hidden',
            maxWidth: '100%',
            ...(uiScale > 1 ? { zoom: uiScale } : {})
        },
        layout: {
            display: 'flex',
            width: '100%',
            height: alto,
            backgroundColor: '#ffffff',
            overflow: 'hidden'
        },
        sidebarLogo: {
            marginBottom: '8px',
            flexShrink: 0
        },
        sidebarFooter: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '24px',
            flexShrink: 0
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
            flex: '1 0 auto',
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
        mainContent: {
            flex: 1,
            backgroundColor: COLORS.bgLight,
            minHeight: alto,
            minWidth: 0,
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

function getSidebarStyle(isMobile, sidebarOpen, alto) {
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
        height: alto,
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            width: '44px',
            height: '44px',
            backgroundColor: '#eff6ff',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            color: COLORS.primary
        },
        mobileCloseButton: {
            display: isMobile && sidebarOpen ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '40px',
            height: '40px',
            backgroundColor: '#eff6ff',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            color: COLORS.primary
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
            padding: isMobile ? '0 12px' : '20px 32px',
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
            overflowX: 'auto',
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

function renderMobileMenuButton(styles, setSidebarOpen) {
    return React.createElement('button', {
        type: 'button',
        'aria-label': 'Abrir menú',
        style: styles.mobileMenuButton,
        onClick: () => setSidebarOpen(true)
    }, React.createElement(IconMenu, { size: 24, strokeWidth: 2.5 }));
}

function renderMobileCloseButton(styles, setSidebarOpen) {
    return React.createElement('button', {
        type: 'button',
        'aria-label': 'Cerrar menú',
        style: styles.mobileCloseButton,
        onClick: () => setSidebarOpen(false)
    }, React.createElement(IconClose, { size: 22, strokeWidth: 2.5 }));
}

function renderSidebarItem(item, styles, isActive, onNavigate) {
    return React.createElement('a', {
        key: item.id,
        href: '#',
        onClick: (e) => { e.preventDefault(); onNavigate(item.id); },
        style: { ...styles.sidebarItem, ...(isActive ? styles.sidebarItemActive : {}) }
    }, React.createElement(item.icon, { size: 18 }), item.label);
}

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

function renderSidebar(styles, currentPage, onNavigate, user, setSidebarOpen) {
    const groups = getMenuGroups(user);
    const roleLabel = user && (user.rol === 'Arbitro' || user.id_rol === 10) ? 'ARBITRO' : 'ADMIN';

    const ids = groups.flatMap(g => g.items.map(i => i.id));
    return React.createElement('div', { style: styles.sidebar },
        renderMobileCloseButton(styles, setSidebarOpen),
        React.createElement('div', { style: styles.sidebarLogo },
            React.createElement('img', {
                src: '/login-assets/logo-jebo.webp',
                alt: 'JEBO',
                style: { display: 'block', width: '132px', height: 'auto' }
            })
        ),
        React.createElement('div', { style: styles.sidebarAdmin }, roleLabel),
        React.createElement('div', { style: styles.sidebarMenu },
            groups.map(group => renderMenuGroup(group, styles, currentPage, onNavigate, ids))
        ),
        React.createElement('div', { style: styles.sidebarFooter },
            React.createElement('img', {
                src: '/branding/escudo-eest2.svg',
                alt: 'E.E.S.T. N° 2 Manuel Mateo, San Vicente',
                style: { display: 'block', width: '96px', height: 'auto' }
            })
        )
    );
}

function renderHeader(styles, isMobile, currentItem, onLogout, onNavigate, setSidebarOpen) {
    return React.createElement('div', { style: styles.header },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '24px', minWidth: 0 } },
            isMobile && renderMobileMenuButton(styles, setSidebarOpen),
            React.createElement('img', {
                src: '/login-assets/logo-jebo.webp',
                alt: 'JEBO 2026',
                style: { display: 'block', height: isMobile ? '34px' : '40px', width: 'auto', flexShrink: 0 }
            }),
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
                'aria-label': 'Cerrar Sesión',
                onClick: () => { onLogout(); onNavigate('login'); }
            }, React.createElement(IconLogOut, { size: 14 }), !styles.logoutSoloIcono && 'Cerrar Sesión')
        )
    );
}

function renderMainContent(styles, isMobile, currentItem, onLogout, onNavigate, setSidebarOpen, children) {
    return React.createElement('div', { style: styles.mainContent },
        renderHeader(styles, isMobile, currentItem, onLogout, onNavigate, setSidebarOpen),
        React.createElement('div', { style: styles.contentArea },
            React.createElement('div', { style: { width: '100%', maxWidth: '1760px', margin: '0 auto' } }, children)
        )
    );
}

export function MainLayout({ user, onLogout, currentPage, onNavigate, children }) {
    const [isMobile, setIsMobile] = React.useState(window.innerWidth < MOBILE_BELOW);
    const [sidebarOpen, setSidebarOpen] = React.useState(false);
    const [uiScale, setUiScale] = React.useState(() => calcUiScale());
    const [logoutSoloIcono, setLogoutSoloIcono] = React.useState(window.innerWidth < LOGOUT_ICON_BELOW);

    React.useEffect(() => {
        const handleResize = createResizeHandler(setIsMobile, setSidebarOpen, setUiScale, setLogoutSoloIcono);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const visibleItems = getMenuGroups(user).flatMap(g => g.items);

    const activoId = menuIdPara(currentPage, visibleItems.map(i => i.id));
    const currentItem = visibleItems.find(i => i.id === activoId) || visibleItems[0] || allItems[0];

    const navegarDesdeMenu = (id) => {
        setSidebarOpen(false);
        onNavigate(id);
    };

    const alto = uiScale > 1 ? `calc(100vh / ${uiScale})` : '100vh';
    const styles = {
        ...getBaseStyles(alto, uiScale),
        sidebar: getSidebarStyle(isMobile, sidebarOpen, alto),
        ...getMobileToggleStyles(isMobile, sidebarOpen),
        ...getContentStyles(isMobile),
        logoutSoloIcono
    };

    return React.createElement('div', { style: styles.appContainer },
        isMobile && renderMobileOverlay(styles, setSidebarOpen),

        React.createElement('div', { style: styles.layout },
            renderSidebar(styles, currentPage, navegarDesdeMenu, user, setSidebarOpen),

            renderMainContent(styles, isMobile, currentItem, onLogout, onNavigate, setSidebarOpen, children)
        )
    );
}

export default MainLayout;