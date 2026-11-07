const { ValidationError } = require('./errors');

const documentoValidator = (value) => {
  if (!value || !String(value).trim()) {
    throw new ValidationError('El documento es requerido');
  }
  if (!/^\d{1,8}$/.test(String(value))) {
    throw new ValidationError('El documento debe contener entre 1 y 8 dígitos');
  }
  return true;
};

const looksLikeEmail = (value) => {
  if (typeof value !== 'string' || value === '' || /\s/.test(value)) return false;

  const partes = value.split('@');
  if (partes.length !== 2) return false;

  const [local, dominio] = partes;
  if (!local || !dominio) return false;

  const etiquetas = dominio.split('.');
  return etiquetas.length >= 2 && etiquetas.every((etiqueta) => etiqueta.length > 0);
};

const passwordValidator = (value) => {
  if (!value || value.length < 8) {
    throw new ValidationError('La contraseña debe tener al menos 8 caracteres');
  }
  if (!/[A-Z]/.test(value)) {
    throw new ValidationError('La contraseña debe tener al menos una mayúscula');
  }
  if (!/[a-z]/.test(value)) {
    throw new ValidationError('La contraseña debe tener al menos una minúscula');
  }
  if (!/\d/.test(value)) {
    throw new ValidationError('La contraseña debe tener al menos un número');
  }
  return true;
};

const normalizarEmail = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const rolExisteValidator = async (value) => {
  if (value === undefined || value === null || String(value).trim() === '') return true;

  const { RolRepository } = require('../repositories');
  const rol = await RolRepository.findByDescripcion(String(value).trim());
  if (!rol) {
    const roles = await RolRepository.findAll();
    throw new ValidationError(
      `Rol inválido: "${value}". Roles disponibles: ${roles.map((r) => r.descripcion).join(', ')}`
    );
  }
  return true;
};

module.exports = {
  passwordValidator,
  documentoValidator,
  looksLikeEmail,
  normalizarEmail,
  rolExisteValidator
};
