const ROLES = {
  SUPERADMIN: 'SuperAdmin',
  ADMIN: 'Administrador',
  PROFESOR: 'Profesor',
  ARBITRO: 'Arbitro',
  JUEZ: 'Juez'
};

const ROLES_GLOBALES = [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.ARBITRO];

module.exports = { ROLES, ROLES_GLOBALES };