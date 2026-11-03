const { verifyTokenDeTipo, signAccessToken, signRefreshToken, TIPO_ACCESS, TIPO_REFRESH } = require('../../src/config/jwt');

describe('Separacion de tipos de token (X-04)', () => {
  const payload = { id: 1, nombre: 'Test', id_rol: 1, rol: 'Administrador', ver: 1 };

  it('un access token no sirve como refresh', () => {
    const access = signAccessToken(payload);
    expect(() => verifyTokenDeTipo(access, TIPO_REFRESH)).toThrow();
  });

  it('un refresh token no sirve como access', () => {
    const refresh = signRefreshToken(payload);
    expect(() => verifyTokenDeTipo(refresh, TIPO_ACCESS)).toThrow();
  });

  it('el motivo del rechazo nombra el tipo, para que el 401 sea diagnosticable', () => {
    const access = signAccessToken(payload);
    expect(() => verifyTokenDeTipo(access, TIPO_REFRESH)).toThrow(/refresh/);
  });

  it('un token del tipo correcto se verifica y conserva sus claims', () => {
    const refresh = signRefreshToken(payload);
    const decoded = verifyTokenDeTipo(refresh, TIPO_REFRESH);
    expect(decoded.id).toBe(1);
    expect(decoded.rol).toBe('Administrador');
    expect(decoded.ver).toBe(1);
  });

  it('los tokens sin claim type (emitidos antes de este cambio) se rechazan', () => {
    const jwt = require('jsonwebtoken');
    const env = require('../../src/config/env');
    const sinTipo = jwt.sign(payload, env.jwt.secret, { expiresIn: '1h', algorithm: 'HS256' });
    expect(() => verifyTokenDeTipo(sinTipo, TIPO_ACCESS)).toThrow();
  });

  it('cada token lleva un jti distinto, que es lo que la denylist de logout indexa', () => {
    const a = verifyTokenDeTipo(signRefreshToken(payload), TIPO_REFRESH);
    const b = verifyTokenDeTipo(signRefreshToken(payload), TIPO_REFRESH);
    expect(a.jti).toBeTruthy();
    expect(b.jti).toBeTruthy();
    expect(a.jti).not.toBe(b.jti);
  });
});
