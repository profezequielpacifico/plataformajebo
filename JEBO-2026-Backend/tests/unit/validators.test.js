const { passwordValidator, documentoValidator, looksLikeEmail } = require('../../src/utils/validators');

describe('passwordValidator', () => {
  it('rechaza contraseña corta', () => {
    expect(() => passwordValidator('Ab1')).toThrow('8 caracteres');
  });

  it('rechaza sin mayúscula', () => {
    expect(() => passwordValidator('abcdefgh1')).toThrow('mayúscula');
  });

  it('rechaza sin minúscula', () => {
    expect(() => passwordValidator('ABCDEFGH1')).toThrow('minúscula');
  });

  it('rechaza sin número', () => {
    expect(() => passwordValidator('Abcdefghi')).toThrow('número');
  });

  it('acepta contraseña válida', () => {
    expect(passwordValidator('Admin1234')).toBe(true);
  });
});

describe('documentoValidator', () => {
  it('acepta documento de 1 dígito', () => {
    expect(documentoValidator('1')).toBe(true);
  });

  it('acepta documento de 7 dígitos', () => {
    expect(documentoValidator('1234567')).toBe(true);
  });

  it('acepta documento de 8 dígitos', () => {
    expect(documentoValidator('12345678')).toBe(true);
  });

  it('rechaza documento vacío', () => {
    expect(() => documentoValidator('')).toThrow('requerido');
  });

  it('rechaza documento con letras', () => {
    expect(() => documentoValidator('ABC12345')).toThrow('dígitos');
  });

  it('rechaza documento con puntos', () => {
    expect(() => documentoValidator('12.345.678')).toThrow('dígitos');
  });

  it('rechaza documento con espacios', () => {
    expect(() => documentoValidator('123 456')).toThrow('dígitos');
  });

  it('rechaza documento con más de 8 dígitos', () => {
    expect(() => documentoValidator('123456789')).toThrow('dígitos');
  });

  describe('looksLikeEmail', () => {
    // Devuelve booleano y no lanza: se usa como guarda antes de tocar la base,
    // asi que un valor raro tiene que ser un "no" y no una excepcion.
    it('acepta formas normales', () => {
      for (const v of ['a@b.co', 'usuario@example.com', 'nombres.apellido@sub.dominio.ar',
        'user+tag@example.com', 'u@d.io']) {
        expect(looksLikeEmail(v)).toBe(true);
      }
    });

    it('rechaza lo que no es string o esta vacio', () => {
      for (const v of ['', null, undefined, 42, {}, [], true, 'a@b.com ']) {
        expect(looksLikeEmail(v)).toBe(false);
      }
    });

    it('rechaza cualquier tipo de espacio en cualquier posicion', () => {
      for (const v of ['a b@c.com', 'a@b c.com', 'a@bc.com ', ' a@b.com', 'a@b.com\n', 'a\tb@c.com']) {
        expect(looksLikeEmail(v)).toBe(false);
      }
    });

    it('exige exactamente un arroba', () => {
      expect(looksLikeEmail('ab.com')).toBe(false);
      expect(looksLikeEmail('a@b@c.com')).toBe(false);
    });

    it('exige que no falte ninguna de las dos mitades', () => {
      expect(looksLikeEmail('@dominio.com')).toBe(false);
      expect(looksLikeEmail('usuario@')).toBe(false);
    });

    it('exige al menos un punto en el dominio', () => {
      expect(looksLikeEmail('usuario@localhost')).toBe(false);
      expect(looksLikeEmail('usuario@dominio')).toBe(false);
    });

    it('rechaza etiquetas de dominio vacias', () => {
      expect(looksLikeEmail('usuario@dominio..com')).toBe(false);
      expect(looksLikeEmail('usuario@.com')).toBe(false);
      expect(looksLikeEmail('usuario@dominio.')).toBe(false);
    });

    it('no se degrasa con muchos arrobas', () => {
      // La razon de ser de esta implementacion: una regex con cuantificador sin
      // limite hace que el motor pruebe muchos split points y el tiempo crezca
      // de forma cuadratica (S5852). Con split + conteo es lineal. Muchos @ es
      // justo la entrada que mas split points genera.
      const adversario = 'a'.repeat(10000) + Array(10000).fill('@b').join('');
      const inicio = process.hrtime.bigint();
      const r = looksLikeEmail(adversario);
      const ms = Number(process.hrtime.bigint() - inicio) / 1e6;

      expect(r).toBe(false);
      expect(ms).toBeLessThan(50);
    });

    it('no se degrasa con muchas etiquetas de dominio', () => {
      const adversario = 'a@b' + '.c'.repeat(10000);
      const inicio = process.hrtime.bigint();
      const r = looksLikeEmail(adversario);
      const ms = Number(process.hrtime.bigint() - inicio) / 1e6;

      expect(r).toBe(true);
      expect(ms).toBeLessThan(50);
    });

    it('aguenta una entrada larga bien formada sin degradarse', () => {
      const largo = 'a'.repeat(20000) + '@dominio.com';
      const inicio = process.hrtime.bigint();
      expect(looksLikeEmail(largo)).toBe(true);
      expect(Number(process.hrtime.bigint() - inicio) / 1e6).toBeLessThan(50);
    });
  });

});
