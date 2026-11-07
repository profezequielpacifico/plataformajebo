const bcryptNativo = require('bcrypt');
const bcryptjs = require('bcryptjs');

const CASOS = [
  ['ascii', 'Contrasena2026'],
  ['acentos y simbolos', 'Contraseña-ñáé€😀'],
  ['72 bytes justos', 'a'.repeat(72)]
];

describe('bcrypt nativo es compatible con los hashes existentes de bcryptjs', () => {
  it.each(CASOS)('valida un hash $2a$ de bcryptjs: %s', async (_nombre, password) => {
    const hash = await bcryptjs.hash(password, 4);
    expect(hash.startsWith('$2a$')).toBe(true);
    await expect(bcryptNativo.compare(password, hash)).resolves.toBe(true);
    await expect(bcryptNativo.compare(`${password}x`.slice(1), hash)).resolves.toBe(false);
  });

  it.each(CASOS)('un hash nativo se valida con bcryptjs: %s', async (_nombre, password) => {
    const hash = await bcryptNativo.hash(password, 4);
    await expect(bcryptjs.compare(password, hash)).resolves.toBe(true);
  });

  it('trunca en 72 bytes igual que bcryptjs', async () => {
    const hash = await bcryptjs.hash('a'.repeat(100), 4);
    await expect(bcryptNativo.compare('a'.repeat(72), hash)).resolves.toBe(true);
  });

  it('un hash corrupto da false y una contraseña que no es string rechaza', async () => {
    await expect(bcryptNativo.compare('x', 'no-es-un-hash')).resolves.toBe(false);
    await expect(bcryptNativo.compare(123, '$2a$04$abcdefghijklmnopqrstuu')).rejects.toThrow();
  });

  it('no bloquea el event loop mientras compara', async () => {
    const hash = await bcryptjs.hash('x', 12);
    let ticks = 0;
    const intervalo = setInterval(() => { ticks += 1; }, 5);
    await bcryptNativo.compare('x', hash);
    clearInterval(intervalo);
    expect(ticks).toBeGreaterThan(5);
  });
});
