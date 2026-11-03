const buildPagination = (page = 1, limit = 10) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (p - 1) * l;
  return { page: p, limit: l, offset };
};

const buildOrderBy = (field, direction = 'ASC', allowedFields = []) => {
  const dir = direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  if (!allowedFields.includes(field)) return 'id DESC';
  return `${field} ${dir}`;
};

module.exports = { buildPagination, buildOrderBy };
