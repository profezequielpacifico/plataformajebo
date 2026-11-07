const generateUsername = (email) => {
  return email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
};

const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

const bindAll = (instancia) => {
  for (const nombre of Object.getOwnPropertyNames(Object.getPrototypeOf(instancia))) {
    if (nombre === 'constructor') continue;
    if (typeof instancia[nombre] === 'function') {
      instancia[nombre] = instancia[nombre].bind(instancia);
    }
  }
  return instancia;
};

module.exports = { generateUsername, sanitizeString, bindAll };
