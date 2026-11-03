import './react-shim.js';
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ROUTES, ROLE_IDS } from './config/constants.js';
import { authService } from './services/authService.js';
import { LoginPage } from './pages/auth/LoginPage.js';
import { RecoverPasswordPage } from './pages/auth/RecoverPasswordPage.js';
import { RegisterPage } from './pages/auth/RegisterPage.js';
import { MainLayout } from './layouts/MainLayout.js';
import { DashboardPage } from './pages/dashboard/DashboardPage.js';
import { TournamentPage } from './pages/tournaments/TournamentPage.js';
import { TournamentListPage } from './pages/tournaments/TournamentListPage.js';
import { TournamentFormPage } from './pages/tournaments/TournamentFormPage.js';
import { TournamentRegistrationPage } from './pages/tournaments/TournamentRegistrationPage.js';
import { CompetenciasListPage } from './pages/competencias/CompetenciasListPage.js';
import { CompetenciaFormPage } from './pages/competencias/CompetenciaFormPage.js';
import { EnrolledTeamsPage } from './pages/teams/EnrolledTeamsPage.js';
import { StagesListPage } from './pages/stages/StagesListPage.js';
import { TeamListPage } from './pages/teams/TeamListPage.js';
import { TeamFormPage } from './pages/teams/TeamFormPage.js';
import { UserListPage } from './pages/users/UserListPage.js';
import { UserFormPage } from './pages/users/UserFormPage.js';
import { MatchListPage } from './pages/matches/MatchListPage.js';
import { MatchFormPage } from './pages/matches/MatchFormPage.js';
import { MatchDetailPage } from './pages/matches/MatchDetailPage.js';
import { MatchLivePage } from './pages/matches/MatchLivePage.js';
import { MisPartidosPage } from './pages/matches/MisPartidosPage.js';
import { StandingsPage } from './pages/standings/StandingsPage.js';
import { QualifiedPage } from './pages/standings/QualifiedPage.js';
import { FinalPage } from './pages/standings/FinalPage.js';
import { RegionsPage } from './pages/configuration/RegionsPage.js';
import { LocalitiesListPage } from './pages/localities/LocalitiesListPage.js';
import { LocalitiesFormPage } from './pages/localities/LocalitiesFormPage.js';
import { DistrictsListPage } from './pages/districts/DistrictsListPage.js';
import { DistrictsFormPage } from './pages/districts/DistrictsFormPage.js';
import { RegionFormPage } from './pages/configuration/RegionFormPage.js';
import { CourtListPage } from './pages/courts/CourtListPage.js';
import { CourtFormPage } from './pages/courts/CourtFormPage.js';
import { DisciplinesListPage } from './pages/disciplines/DisciplinesListPage.js';
import { DisciplineFormPage } from './pages/disciplines/DisciplineFormPage.js';
import { InstitutionsListPage } from './pages/institutions/InstitutionsListPage.js';
import { InstitutionFormPage } from './pages/institutions/InstitutionFormPage.js';
import { InstanciasListPage } from './pages/instancias/InstanciasListPage.js';
import { AuditPage } from './pages/audit/AuditPage.js';
import { AdvancedOptionsPage } from './pages/advanced/AdvancedOptionsPage.js';
import { AutoFixturePage } from './pages/advanced/AutoFixturePage.js';
import { LockedIpsPage } from './pages/advanced/LockedIpsPage.js';
import { resolverRuta } from './routing.js';
import { GymPresentationsPage } from './pages/gymnastics/GymPresentationsPage.js';
import { GymScoringPage } from './pages/gymnastics/GymScoringPage.js';

const { createElement: h } = React;

const PUBLIC_ROUTES = [ROUTES.LOGIN, ROUTES.RECOVER_PASSWORD, ROUTES.REGISTER];

// Mapeo de ruta -> roles permitidos (por ROLE_IDS)
const ROUTE_PERMISSIONS = {
    // Admin-only: gestión de usuarios, auditoría, territorios, opciones avanzadas
    [ROUTES.USERS]: [ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.USERS_NEW]: [ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.USERS_EDIT]: [ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.AUDIT]: [ROLE_IDS.SUPERADMIN],
    [ROUTES.REGIONS]: [ROLE_IDS.SUPERADMIN],
    [ROUTES.REGIONS_NEW]: [ROLE_IDS.SUPERADMIN],
    [ROUTES.DISTRICTS]: [ROLE_IDS.SUPERADMIN],
    [ROUTES.DISTRICTS_NEW]: [ROLE_IDS.SUPERADMIN],
    [ROUTES.DISTRICTS_EDIT]: [ROLE_IDS.SUPERADMIN],
    [ROUTES.LOCALITIES]: [ROLE_IDS.SUPERADMIN],
    [ROUTES.LOCALITIES_NEW]: [ROLE_IDS.SUPERADMIN],
    [ROUTES.LOCALITIES_EDIT]: [ROLE_IDS.SUPERADMIN],
    [ROUTES.ADVANCED_OPTIONS]: [ROLE_IDS.SUPERADMIN],
    [ROUTES.AUTO_FIXTURE]: [ROLE_IDS.SUPERADMIN],
    [ROUTES.LOCKOUTS]: [ROLE_IDS.SUPERADMIN],

    // Admin + SuperAdmin: gestión de competencia (torneos legacy)
    [ROUTES.TOURNAMENTS_NEW]: [ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.TOURNAMENTS_EDIT]: [ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.TOURNAMENTS_VIEW]: [ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.STAGES]: [ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],

    // Admin + SuperAdmin: módulo de Competencias (nueva arquitectura)
    [ROUTES.COMPETENCIAS]: [ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.COMPETENCIAS_NEW]: [ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.COMPETENCIAS_EDIT]: [ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.COMPETENCIAS_VIEW]: [ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    // Equipos: el Profesor da de alta y edita (el recorte a SUS equipos lo hace
    // el backend en `gestionarEquipoPropio` y el botón en TeamListPage, no este
    // mapa — acá solo se decide quién puede ABRIR la pantalla). Sin el Profesor
    // acá, el dashboard le mostraba el botón y `renderProtectedPage` lo rebotaba
    // al dashboard: la página existía pero nunca se renderizaba.
    [ROUTES.TEAMS_NEW]: [ROLE_IDS.PROFESOR, ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.TEAMS_EDIT]: [ROLE_IDS.PROFESOR, ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.MATCHES_NEW]: [ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.MATCHES_EDIT]: [ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.COURTS]: [ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.COURTS_NEW]: [ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.COURTS_EDIT]: [ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.DISCIPLINES]: [ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.SPORTS_NEW]: [ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.SPORTS_EDIT]: [ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.SPORTS_VIEW]: [ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.INSTITUTIONS_NEW]: [ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.INSTITUTIONS_EDIT]: [ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.INSTANCIAS]: [ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],

    // Profesor + Admin + SuperAdmin: lectura de torneos/partidos/clasificaciones
    [ROUTES.TOURNAMENTS]: [ROLE_IDS.PROFESOR, ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.TOURNAMENTS_HISTORY]: [ROLE_IDS.PROFESOR, ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.TOURNAMENT_REGISTRATION]: [ROLE_IDS.PROFESOR, ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.ENROLLED_TEAMS]: [ROLE_IDS.PROFESOR, ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.TEAMS]: [ROLE_IDS.PROFESOR, ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.MATCHES]: [ROLE_IDS.PROFESOR, ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.STANDINGS]: [ROLE_IDS.PROFESOR, ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.QUALIFIED]: [ROLE_IDS.PROFESOR, ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.FINAL]: [ROLE_IDS.PROFESOR, ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],

    // Arbitro: solo mis partidos
    [ROUTES.MIS_PARTIDOS]: [ROLE_IDS.ARBITRO, ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.MATCH_LIVE]: [ROLE_IDS.ARBITRO, ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.MATCHES_DETAIL]: [ROLE_IDS.ARBITRO, ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],

    // Juez + Admin + SuperAdmin: gimnasia
    [ROUTES.GYM_PRESENTACIONES]: [ROLE_IDS.JUEZ, ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.GYM_PRESENTACIONES_NUEVA]: [ROLE_IDS.JUEZ, ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
    [ROUTES.GYM_PRESENTACIONES_DETALLE]: [ROLE_IDS.JUEZ, ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],

    // Dashboard: todos los autenticados
    [ROUTES.DASHBOARD]: [ROLE_IDS.PROFESOR, ROLE_IDS.ARBITRO, ROLE_IDS.JUEZ, ROLE_IDS.ADMINISTRADOR, ROLE_IDS.SUPERADMIN],
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

function hasRoutePermission(user, route) {
    const allowed = ROUTE_PERMISSIONS[route];
    if (!allowed) return true; // ruta sin restricción explícita = permitida
    const roleId = getRoleId(user);
    return roleId && allowed.includes(roleId);
}

function withLayout(Component, props = {}) {
    return function LayoutWrapper({ user, onLogout, currentPage, onNavigate, ...rest }) {
        return h(MainLayout, { user, onLogout, currentPage, onNavigate },
            h(Component, { user, onNavigate, ...props, ...rest })
        );
    };
}

function renderProtectedPage(ctx, Page, extraProps) {
    if (!ctx.user) {
        return ctx.navigate(ROUTES.LOGIN);
    }

    if (!hasRoutePermission(ctx.user, ctx.currentPage)) {
        return ctx.navigate(ROUTES.DASHBOARD); // o una página 403
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
    [ROUTES.LOGIN]: (ctx) => ctx.user
        ? h(withLayout(DashboardPage), {
            user: ctx.user,
            onLogout: ctx.handleLogout,
            currentPage: ctx.currentPage,
            onNavigate: ctx.navigate
        })
        : renderLoginPage(ctx),
    [ROUTES.REGISTER]: (ctx) => h(RegisterPage, { onNavigate: ctx.navigate }),
    [ROUTES.RECOVER_PASSWORD]: (ctx) => h(RecoverPasswordPage, { onNavigate: ctx.navigate }),
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

    // Módulo de Competencias (nueva arquitectura)
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

function App() {
    const [user, setUser] = useState(null);
    const [currentPage, setCurrentPage] = useState(ROUTES.LOGIN);

    useEffect(() => {
        if (authService.isAuthenticated()) {
            const savedUser = authService.getUser();
            if (savedUser) {
                setUser(savedUser);
                setCurrentPage(ROUTES.DASHBOARD);
            }
        }
    }, []);

    const handleLogin = (userData) => {
        setUser(userData);
        setCurrentPage(ROUTES.DASHBOARD);
    };

    const handleLogout = async () => {
        await authService.logout();
        setUser(null);
        setCurrentPage(ROUTES.LOGIN);
    };

    const navigate = (page) => {

        if (!user && !PUBLIC_ROUTES.includes(page)) {
            setCurrentPage(ROUTES.LOGIN);
            return;
        }

        if (user && !hasRoutePermission(user, page)) {
            return; // Silenciosamente no navega; podría mostrar toast
        }
        setCurrentPage(page);
    };

    const renderPage = () => {
        const { ruta, matchId } = resolverRuta(currentPage, PAGE_RENDERERS);
        const ctx = {
            user,
            handleLogin,
            handleLogout,
            currentPage,
            navigate,
            matchId
        };
        if (ruta) return PAGE_RENDERERS[ruta](ctx);
        return renderLoginPage(ctx);
    };

    return renderPage();
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render(h(App));