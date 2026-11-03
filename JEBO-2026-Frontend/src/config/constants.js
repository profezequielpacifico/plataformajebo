import ENV from './env.js';

export const APP_NAME = 'JEBO 2026';
export const APP_SUBTITLE = 'Sistema Administrativo';

export const ROUTES = {
    LOGIN: 'login',
    RECOVER_PASSWORD: 'recover-password',
    REGISTER: 'register',
    DASHBOARD: 'dashboard',
    TOURNAMENT: 'tournament',
    CREATE_MATCHES: 'create-matches',
    TEAMS: 'teams',
    STANDINGS: 'standings',
    QUALIFIED: 'qualified',
    FINAL: 'final',
    USERS: 'users',
    USERS_NEW: 'users-new',
    USERS_EDIT: 'users-edit',
    TOURNAMENTS: 'tournaments',
    TOURNAMENTS_HISTORY: 'tournaments-history',
    TOURNAMENTS_NEW: 'tournaments-new',
    TOURNAMENTS_EDIT: 'tournaments-edit',
    TOURNAMENTS_VIEW: 'tournaments-view',
    TOURNAMENT_REGISTRATION: 'tournament-registration',
    ENROLLED_TEAMS: 'enrolled-teams',
    STAGES: 'stages',
    COMPETENCIAS: 'competencias',
    COMPETENCIAS_NEW: 'competencias-new',
    COMPETENCIAS_EDIT: 'competencias-edit',
    COMPETENCIAS_VIEW: 'competencias-view',
    TEAMS_NEW: 'teams-new',
    TEAMS_EDIT: 'teams-edit',
    MATCHES: 'matches',
    MIS_PARTIDOS: 'mis-partidos',
    MATCHES_NEW: 'matches-new',
    MATCHES_EDIT: 'matches-edit',
    MATCHES_DETAIL: 'matches-detail',
    // Pantalla de partido en vivo. Va aparte de MATCHES_DETAIL a proposito:
    // una es la administracion del partido (programacion, cancha, arbitros) y

    MATCH_LIVE: 'match-live',
    REGIONS: 'regions',
    LOCALITIES: 'localities',
    LOCALITIES_NEW: 'localities-new',
    LOCALITIES_EDIT: 'localities-edit',
    REGIONS_NEW: 'regions-new',
    COURTS: 'courts',
    COURTS_NEW: 'courts-new',
    COURTS_EDIT: 'courts-edit',
    DISCIPLINES: 'disciplines',
    DISTRICTS: 'districts',
    DISTRICTS_NEW: 'districts-new',
    DISTRICTS_EDIT: 'districts-edit',
    INSTITUTIONS: 'institutions',
    INSTITUTIONS_NEW: 'institutions-new',
    INSTITUTIONS_EDIT: 'institutions-edit',
    INSTANCIAS: 'instancias',
    AUDIT: 'audit',
    SPORTS: 'sports',
    SPORTS_NEW: 'sports-new',
    SPORTS_EDIT: 'sports-edit',
    SPORTS_VIEW: 'sports-view',
    ADVANCED_OPTIONS: 'advanced-options',
    AUTO_FIXTURE: 'auto-fixture',
    LOCKOUTS: 'login-lockouts',
    // Gimnasia
    GYM_PRESENTACIONES: 'gymnastics/presentaciones',
    GYM_PRESENTACIONES_NUEVA: 'gymnastics/presentaciones/nueva',
    GYM_PRESENTACIONES_DETALLE: 'gymnastics/presentaciones/:id/detalle',
    GYM_FIXTURE: 'gymnastics/fixture'

};

export const STORAGE_KEYS = {
    USER: ENV.STORAGE.USER,
    TOKEN: ENV.STORAGE.TOKEN,
    TOKEN_REFRESH: ENV.STORAGE.REFRESH,
    THEME: ENV.STORAGE.THEME
};

// IDs reales de la BD (deben coincidir con backend/src/constants/roles.js)
export const ROLE_IDS = {
    PROFESOR: 1,
    ARBITRO: 2,
    ADMINISTRADOR: 3,
    JUEZ: 4,
    SUPERADMIN: 20
};

export const USER_ROLES = {
    ADMIN: 'Administrador',
    PROFESOR: 'Profesor',
    ARBITRO: 'Arbitro',
    JUEZ: 'Juez'
};

export const STATUSES = {
    ACTIVE: 'Activo',
    INACTIVE: 'Inactivo',
    PENDING: 'Pendiente',
    IN_PROGRESS: 'En Progreso',
    FINISHED: 'Finalizado',
    SCHEDULED: 'Programado',
    IN_GAME: 'En Juego',
    CANCELED: 'Cancelado'
};

export const TORNEO_STATUSES = {
    ELIMINADO: 'Eliminado',
    ROUND_16: '16avos',
    ROUND_8: '8avos',
    ROUND_4: '4tos',
    SEMIFINAL: 'Semifinal',
    FINAL: 'Final',
    GANADOR: 'Ganador'
};

export const TORNEO_STATUS_COLORS = {
    [TORNEO_STATUSES.ELIMINADO]: 'red',
    [TORNEO_STATUSES.ROUND_16]: 'orange',
    [TORNEO_STATUSES.ROUND_8]: 'orange',
    [TORNEO_STATUSES.ROUND_4]: 'orange',
    [TORNEO_STATUSES.SEMIFINAL]: 'blue',
    [TORNEO_STATUSES.FINAL]: 'purple',
    [TORNEO_STATUSES.GANADOR]: 'green'
};

export const MATCH_STATUSES = {
    SCHEDULED: 'Programado',
    IN_PROGRESS: 'En Progreso',
    FINISHED: 'Finalizado',
    CANCELED: 'Cancelado'
};

export const API_CONFIG = {
    BASE_URL: ENV.API.BASE_URL,
    TIMEOUT: ENV.API.TIMEOUT,
    RETRIES: ENV.API.RETRIES
};

export const TEAM_SEARCH_FILTERS = [
    { value: 'nombre', label: 'Nombre' },
    { value: 'institucion', label: 'Institución' },
    { value: 'distrito', label: 'Distrito' },
    { value: 'entrenador', label: 'Profesor' }
];

export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
};
