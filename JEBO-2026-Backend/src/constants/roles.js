const ROLES = {
  SUPERADMIN: 'SuperAdmin',
  ADMIN: 'Administrador',
  PROFESOR: 'Profesor',
  ARBITRO: 'Arbitro',
  JUEZ: 'Juez'
};

// Roles con alcance global: ven todo el sistema, no solo lo de sus

const ROLES_GLOBALES = [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.ARBITRO];

module.exports = { ROLES, ROLES_GLOBALES };