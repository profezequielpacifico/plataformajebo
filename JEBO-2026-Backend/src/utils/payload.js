const soloCampos = (req, campos) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};

  const permitidos = new Set(campos);
  return Object.fromEntries(
    Object.entries(body).filter(([k]) => permitidos.has(k))
  );
};

module.exports = { soloCampos };
