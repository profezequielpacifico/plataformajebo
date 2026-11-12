import './react-shim.js';
import './styles/components.css';
import React, { Suspense, useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { ROUTES } from './config/constants.js';
import { authService } from './services/authService.js';
import { LoginPage } from './pages/auth/LoginPage.js';
import { MainLayout } from './layouts/MainLayout.js';
import { resolverRuta } from './routing.js';
import { PUBLIC_ROUTES, canAccess } from './permissions.js';
import { getRoleId } from './services/roles.js';
import { paginaDesdeUrl, urlDePagina } from './navigation.js';
import { lazyPage } from './lazyPage.js';

const { createElement: h } = React;

const RecoverPasswordPage = lazyPage(() => import('./pages/auth/RecoverPasswordPage.js'), 'RecoverPasswordPage');
const RegisterPage = lazyPage(() => import('./pages/auth/RegisterPage.js'), 'RegisterPage');
const DashboardPage = lazyPage(() => import('./pages/dashboard/DashboardPage.js'), 'DashboardPage');
const TournamentPage = lazyPage(() => import('./pages/tournaments/TournamentPage.js'), 'TournamentPage');
const TournamentListPage = lazyPage(() => import('./pages/tournaments/TournamentListPage.js'), 'TournamentListPage');
const TournamentFormPage = lazyPage(() => import('./pages/tournaments/TournamentFormPage.js'), 'TournamentFormPage');
const TournamentRegistrationPage = lazyPage(() => import('./pages/tournaments/TournamentRegistrationPage.js'), 'TournamentRegistrationPage');
const CompetenciasListPage = lazyPage(() => import('./pages/competencias/CompetenciasListPage.js'), 'CompetenciasListPage');
const CompetenciaFormPage = lazyPage(() => import('./pages/competencias/CompetenciaFormPage.js'), 'CompetenciaFormPage');
const EnrolledTeamsPage = lazyPage(() => import('./pages/teams/EnrolledTeamsPage.js'), 'EnrolledTeamsPage');
const StagesListPage = lazyPage(() => import('./pages/stages/StagesListPage.js'), 'StagesListPage');
const TournamentStagesPage = lazyPage(() => import('./pages/tournaments/TournamentStagesPage.js'), 'TournamentStagesPage');
const TeamListPage = lazyPage(() => import('./pages/teams/TeamListPage.js'), 'TeamListPage');
const TeamFormPage = lazyPage(() => import('./pages/teams/TeamFormPage.js'), 'TeamFormPage');
const UserListPage = lazyPage(() => import('./pages/users/UserListPage.js'), 'UserListPage');
const UserFormPage = lazyPage(() => import('./pages/users/UserFormPage.js'), 'UserFormPage');
const MatchListPage = lazyPage(() => import('./pages/matches/MatchListPage.js'), 'MatchListPage');
const MatchFormPage = lazyPage(() => import('./pages/matches/MatchFormPage.js'), 'MatchFormPage');
const MatchDetailPage = lazyPage(() => import('./pages/matches/MatchDetailPage.js'), 'MatchDetailPage');
const MatchLivePage = lazyPage(() => import('./pages/matches/MatchLivePage.js'), 'MatchLivePage');
const MisPartidosPage = lazyPage(() => import('./pages/matches/MisPartidosPage.js'), 'MisPartidosPage');
const StandingsPage = lazyPage(() => import('./pages/standings/StandingsPage.js'), 'StandingsPage');
const QualifiedPage = lazyPage(() => import('./pages/standings/QualifiedPage.js'), 'QualifiedPage');
const FinalPage = lazyPage(() => import('./pages/standings/FinalPage.js'), 'FinalPage');
const RegionsPage = lazyPage(() => import('./pages/configuration/RegionsPage.js'), 'RegionsPage');
const LocalitiesListPage = lazyPage(() => import('./pages/localities/LocalitiesListPage.js'), 'LocalitiesListPage');
const LocalitiesFormPage = lazyPage(() => import('./pages/localities/LocalitiesFormPage.js'), 'LocalitiesFormPage');
const DistrictsListPage = lazyPage(() => import('./pages/districts/DistrictsListPage.js'), 'DistrictsListPage');
const DistrictsFormPage = lazyPage(() => import('./pages/districts/DistrictsFormPage.js'), 'DistrictsFormPage');
const RegionFormPage = lazyPage(() => import('./pages/configuration/RegionFormPage.js'), 'RegionFormPage');
const CourtListPage = lazyPage(() => import('./pages/courts/CourtListPage.js'), 'CourtListPage');
const CourtFormPage = lazyPage(() => import('./pages/courts/CourtFormPage.js'), 'CourtFormPage');
const DisciplinesListPage = lazyPage(() => import('./pages/disciplines/DisciplinesListPage.js'), 'DisciplinesListPage');
const DisciplineFormPage = lazyPage(() => import('./pages/disciplines/DisciplineFormPage.js'), 'DisciplineFormPage');
const InstitutionsListPage = lazyPage(() => import('./pages/institutions/InstitutionsListPage.js'), 'InstitutionsListPage');
const InstitutionFormPage = lazyPage(() => import('./pages/institutions/InstitutionFormPage.js'), 'InstitutionFormPage');
const InstanciasListPage = lazyPage(() => import('./pages/instancias/InstanciasListPage.js'), 'InstanciasListPage');
const AuditPage = lazyPage(() => import('./pages/audit/AuditPage.js'), 'AuditPage');
const AdvancedOptionsPage = lazyPage(() => import('./pages/advanced/AdvancedOptionsPage.js'), 'AdvancedOptionsPage');
const AutoFixturePage = lazyPage(() => import('./pages/advanced/AutoFixturePage.js'), 'AutoFixturePage');
const LockedIpsPage = lazyPage(() => import('./pages/advanced/LockedIpsPage.js'), 'LockedIpsPage');
const GymPresentationsPage = lazyPage(() => import('./pages/gymnastics/GymPresentationsPage.js'), 'GymPresentationsPage');
const GymScoringPage = lazyPage(() => import('./pages/gymnastics/GymScoringPage.js'), 'GymScoringPage');

const pageFallback = h('div', { role: 'status', 'aria-live': 'polite', style: { padding: '32px', textAlign: 'center' } }, 'Cargando…');

function withLayout(Component, props = {}) {
    return function LayoutWrapper({ user, onLogout, currentPage, onNavigate, ...rest }) {
        return h(MainLayout, { user, onLogout, currentPage, onNavigate },
            h(Suspense, { fallback: pageFallback },
                h(Component, { user, onNavigate, ...props, ...rest })
            )
        );
    };
}

function Redirect({ to, onRedirect }) {
    useEffect(() => {
        onRedirect(to);
    }, [to]);
    return null;
}

function renderRedirect(ctx, to) {
    return h(Redirect, { to, onRedirect: ctx.redirect });
}

function renderSinRol(ctx) {
    return h('div', { role: 'alert', style: { padding: '48px 24px', textAlign: 'center', fontFamily: 'inherit' } },
        h('p', { style: { fontSize: '16px', marginBottom: '16px' } }, 'Tu usuario no tiene un rol válido asignado. Pedile a un administrador que lo revise.'),
        h('button', { type: 'button', className: 'btn btn-primary', onClick: ctx.handleLogout }, 'Cerrar sesión')
    );
}

function renderProtectedPage(ctx, Page, extraProps) {
    if (!ctx.user) {
        return renderRedirect(ctx, ROUTES.LOGIN);
    }
    if (getRoleId(ctx.user) === null) {
        return renderSinRol(ctx);
    }
    if (!canAccess(ctx.user, ctx.currentPage)) {
        return renderRedirect(ctx, ROUTES.DASHBOARD);
    }
    return h(withLayout(Page), {
        user: ctx.user,
        onLogout: ctx.handleLogout,
        currentPage: ctx.currentPage,
        onNavigate: ctx.navigate,
        ...extraProps
    });
}

function renderLoginPage(ctx) {
    return h(LoginPage, { onLogin: ctx.handleLogin, onNavigate: ctx.navigate });
}

const PAGE_RENDERERS = {
    [ROUTES.LOGIN]: (ctx) => ctx.user ? renderRedirect(ctx, ROUTES.DASHBOARD) : renderLoginPage(ctx),
    [ROUTES.REGISTER]: (ctx) => h(Suspense, { fallback: pageFallback }, h(RegisterPage, { onNavigate: ctx.navigate })),
    [ROUTES.RECOVER_PASSWORD]: (ctx) => h(Suspense, { fallback: pageFallback }, h(RecoverPasswordPage, { onNavigate: ctx.navigate })),
    [ROUTES.DASHBOARD]: (ctx) => renderProtectedPage(ctx, DashboardPage),
    [ROUTES.TOURNAMENT]: (ctx) => renderProtectedPage(ctx, TournamentPage),
    [ROUTES.CREATE_MATCHES]: (ctx) => renderProtectedPage(ctx, MatchFormPage),
    [ROUTES.QUALIFIED]: (ctx) => renderProtectedPage(ctx, QualifiedPage),
    [ROUTES.FINAL]: (ctx) => renderProtectedPage(ctx, FinalPage),
    [ROUTES.USERS]: (ctx) => renderProtectedPage(ctx, UserListPage),
    [ROUTES.USERS_NEW]: (ctx) => renderProtectedPage(ctx, UserFormPage),
    [ROUTES.USERS_EDIT]: (ctx) => renderProtectedPage(ctx, UserFormPage, { userId: ctx.matchId }),
    [ROUTES.TOURNAMENTS]: (ctx) => renderProtectedPage(ctx, TournamentPage),
    [ROUTES.TOURNAMENTS_HISTORY]: (ctx) => renderProtectedPage(ctx, TournamentListPage),
    [ROUTES.TOURNAMENTS_NEW]: (ctx) => renderProtectedPage(ctx, TournamentFormPage),
    [ROUTES.TOURNAMENTS_EDIT]: (ctx) => renderProtectedPage(ctx, TournamentFormPage, { pageParams: { id: ctx.matchId } }),
    [ROUTES.TOURNAMENTS_VIEW]: (ctx) => renderProtectedPage(ctx, TournamentFormPage, { pageParams: { id: ctx.matchId }, readOnly: true }),
    [ROUTES.TOURNAMENT_REGISTRATION]: (ctx) => renderProtectedPage(ctx, TournamentRegistrationPage),
    [ROUTES.ENROLLED_TEAMS]: (ctx) => renderProtectedPage(ctx, EnrolledTeamsPage),
    [ROUTES.STAGES]: (ctx) => renderProtectedPage(ctx, StagesListPage),
    [ROUTES.TOURNAMENT_STAGES]: (ctx) => renderProtectedPage(ctx, TournamentStagesPage, { pageParams: { id: ctx.matchId } }),

    [ROUTES.COMPETENCIAS]: (ctx) => renderProtectedPage(ctx, CompetenciasListPage),
    [ROUTES.COMPETENCIAS_NEW]: (ctx) => renderProtectedPage(ctx, CompetenciaFormPage),
    [ROUTES.COMPETENCIAS_EDIT]: (ctx) => renderProtectedPage(ctx, CompetenciaFormPage, { pageParams: { id: ctx.matchId } }),
    [ROUTES.COMPETENCIAS_VIEW]: (ctx) => renderProtectedPage(ctx, CompetenciaFormPage, { pageParams: { id: ctx.matchId }, readOnly: true }),
    [ROUTES.TEAMS]: (ctx) => renderProtectedPage(ctx, TeamListPage),
    [ROUTES.TEAMS_NEW]: (ctx) => renderProtectedPage(ctx, TeamFormPage),
    [ROUTES.TEAMS_EDIT]: (ctx) => renderProtectedPage(ctx, TeamFormPage, { pageParams: { id: ctx.matchId } }),
    [ROUTES.MATCHES]: (ctx) => renderProtectedPage(ctx, MatchListPage),
    [ROUTES.MIS_PARTIDOS]: (ctx) => renderProtectedPage(ctx, MisPartidosPage),
    [ROUTES.MATCHES_NEW]: (ctx) => renderProtectedPage(ctx, MatchFormPage, { matchId: ctx.matchId }),
    [ROUTES.MATCHES_EDIT]: (ctx) => renderProtectedPage(ctx, MatchFormPage, { matchId: ctx.matchId }),
    [ROUTES.MATCHES_DETAIL]: (ctx) => renderProtectedPage(ctx, MatchDetailPage, { matchId: ctx.matchId }),
    [ROUTES.MATCH_LIVE]: (ctx) => renderProtectedPage(ctx, MatchLivePage, { matchId: ctx.matchId }),
    [ROUTES.STANDINGS]: (ctx) => renderProtectedPage(ctx, StandingsPage),
    [ROUTES.REGIONS]: (ctx) => renderProtectedPage(ctx, RegionsPage),
    [ROUTES.LOCALITIES]: (ctx) => renderProtectedPage(ctx, LocalitiesListPage),
    [ROUTES.LOCALITIES_NEW]: (ctx) => renderProtectedPage(ctx, LocalitiesFormPage),
    [ROUTES.LOCALITIES_EDIT]: (ctx) => renderProtectedPage(ctx, LocalitiesFormPage, { pageParams: { id: ctx.matchId } }),
    [ROUTES.DISTRICTS]: (ctx) => renderProtectedPage(ctx, DistrictsListPage),
    [ROUTES.DISTRICTS_NEW]: (ctx) => renderProtectedPage(ctx, DistrictsFormPage),
    [ROUTES.DISTRICTS_EDIT]: (ctx) => renderProtectedPage(ctx, DistrictsFormPage, { pageParams: { id: ctx.matchId } }),
    [ROUTES.REGIONS_NEW]: (ctx) => renderProtectedPage(ctx, RegionFormPage),
    [ROUTES.COURTS]: (ctx) => renderProtectedPage(ctx, CourtListPage),
    [ROUTES.COURTS_NEW]: (ctx) => renderProtectedPage(ctx, CourtFormPage),
    [ROUTES.COURTS_EDIT]: (ctx) => renderProtectedPage(ctx, CourtFormPage, { pageParams: { id: ctx.matchId } }),
    [ROUTES.DISCIPLINES]: (ctx) => renderProtectedPage(ctx, DisciplinesListPage),
    [ROUTES.INSTITUTIONS]: (ctx) => renderProtectedPage(ctx, InstitutionsListPage),
    [ROUTES.INSTITUTIONS_NEW]: (ctx) => renderProtectedPage(ctx, InstitutionFormPage),
    [ROUTES.INSTITUTIONS_EDIT]: (ctx) => renderProtectedPage(ctx, InstitutionFormPage, { pageParams: { id: ctx.matchId } }),
    [ROUTES.INSTANCIAS]: (ctx) => renderProtectedPage(ctx, InstanciasListPage),
    [ROUTES.AUDIT]: (ctx) => renderProtectedPage(ctx, AuditPage),
    [ROUTES.ADVANCED_OPTIONS]: (ctx) => renderProtectedPage(ctx, AdvancedOptionsPage),
    [ROUTES.AUTO_FIXTURE]: (ctx) => renderProtectedPage(ctx, AutoFixturePage),
    [ROUTES.LOCKOUTS]: (ctx) => renderProtectedPage(ctx, LockedIpsPage),
    [ROUTES.SPORTS]: (ctx) => renderProtectedPage(ctx, DisciplinesListPage),
    [ROUTES.SPORTS_NEW]: (ctx) => renderProtectedPage(ctx, DisciplineFormPage),
    [ROUTES.SPORTS_EDIT]: (ctx) => renderProtectedPage(ctx, DisciplineFormPage, { disciplineId: ctx.matchId }),
    [ROUTES.SPORTS_VIEW]: (ctx) => renderProtectedPage(ctx, DisciplineFormPage, { disciplineId: ctx.matchId, readOnly: true }),
    [ROUTES.GYM_PRESENTACIONES]: (ctx) => renderProtectedPage(ctx, GymPresentationsPage),
    [ROUTES.GYM_PRESENTACIONES_NUEVA]: (ctx) => renderProtectedPage(ctx, GymPresentationsPage, { isNew: true }),
    [ROUTES.GYM_PRESENTACIONES_DETALLE]: (ctx) => renderProtectedPage(ctx, GymScoringPage, { match: ctx.matchId })
};

function usuarioGuardado() {
    if (!authService.isAuthenticated()) return null;
    return authService.getUser();
}

function paginaInicial(user) {
    const pagina = paginaDesdeUrl(window.location.pathname);
    if (!pagina) return user ? ROUTES.DASHBOARD : ROUTES.LOGIN;
    if (user && PUBLIC_ROUTES.includes(pagina)) return ROUTES.DASHBOARD;
    return pagina;
}

function actualizarUrl(page, replace) {
    const url = urlDePagina(page);
    if (window.location.pathname === url) return;
    if (replace) {
        window.history.replaceState(null, '', url);
    } else {
        window.history.pushState(null, '', url);
    }
}

function App() {
    const [user, setUser] = useState(usuarioGuardado);
    const [currentPage, setCurrentPage] = useState(() => {
        const pagina = paginaInicial(user);
        actualizarUrl(pagina, true);
        return pagina;
    });
    const destinoTrasLogin = useRef(null);

    const irA = (page, replace = false) => {
        actualizarUrl(page, replace);
        setCurrentPage(page);
    };

    useEffect(() => {
        const alVolver = () => setCurrentPage(paginaDesdeUrl(window.location.pathname) || ROUTES.LOGIN);
        window.addEventListener('popstate', alVolver);
        return () => window.removeEventListener('popstate', alVolver);
    }, []);

    const handleLogin = (userData) => {
        const destino = destinoTrasLogin.current;
        destinoTrasLogin.current = null;
        setUser(userData);
        irA(destino && canAccess(userData, destino) ? destino : ROUTES.DASHBOARD, true);
    };

    const handleLogout = async () => {
        try {
            await authService.logout();
        } finally {
            destinoTrasLogin.current = null;
            setUser(null);
            irA(ROUTES.LOGIN, true);
        }
    };

    const navigate = (page) => {
        if (!user && !PUBLIC_ROUTES.includes(page)) {
            irA(ROUTES.LOGIN);
            return;
        }
        irA(page);
    };

    const redirect = (page) => {
        if (page === ROUTES.LOGIN && !user && !PUBLIC_ROUTES.includes(currentPage)) {
            destinoTrasLogin.current = currentPage;
        }
        irA(page, true);
    };

    const renderPage = () => {
        const { ruta, matchId } = resolverRuta(currentPage, PAGE_RENDERERS);
        const ctx = {
            user,
            handleLogin,
            handleLogout,
            currentPage,
            navigate,
            redirect,
            matchId
        };
        if (ruta) return PAGE_RENDERERS[ruta](ctx);
        return renderRedirect(ctx, user ? ROUTES.DASHBOARD : ROUTES.LOGIN);
    };

    return renderPage();
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(h(App));