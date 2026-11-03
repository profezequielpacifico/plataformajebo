const StageEngine = require('../../src/services/stage-engine');
const RuleRegistry = require('../../src/services/rule-registry');

describe('StageEngine', () => {
  describe('validación de contexto', () => {
    it('rechaza contexto nulo', () => {
      expect(() => StageEngine.evaluate(null)).toThrow('contexto válido');
    });

    it('rechaza participants no array', () => {
      expect(() => StageEngine.evaluate({ participants: 'no array', rules: [] }))
        .toThrow('participants como array');
    });

    it('rechaza rules no array', () => {
      expect(() => StageEngine.evaluate({ participants: [], rules: 'no array' }))
        .toThrow('rules como array');
    });
  });

  describe('participants insuficientes', () => {
    const reglasMinimo = [{
      tipo: 'PARTICIPANTES',
      configuracion: { minimo: 4, maximo: 16 }
    }];

    it('bloquea etapa con menos participantes que el mínimo', () => {
      const result = StageEngine.evaluate({
        participants: [{ id: 1 }, { id: 2 }],
        rules: reglasMinimo,
        config: {}
      });
      expect(result.viable).toBe(false);
      expect(result.motivo).toMatch(/insuficientes/);
    });

    it('permite etapa con participantes suficientes', () => {
      const result = StageEngine.evaluate({
        participants: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
        rules: reglasMinimo,
        config: {}
      });
      expect(result.viable).toBe(true);
    });
  });

  describe('clasificación por posición', () => {
    const reglas = [{
      tipo: 'CLASIFICACION',
      configuracion: { metodo: 'POSICION', cantidad: 4, unidad: 'COMPETENCIA' }
    }];

    const participantes = Array.from({ length: 16 }, (_, i) => ({
      id: i + 1,
      posicion: i + 1
    }));

    it('clasifica los primeros N por posición', () => {
      const result = StageEngine.evaluate({
        participants: participantes,
        rules: reglas,
        config: {}
      });
      expect(result.clasificados).toHaveLength(4);
      expect(result.clasificados.map(c => c.id)).toEqual([1, 2, 3, 4]);
    });

    it('es determinista con misma entrada', () => {
      const r1 = StageEngine.evaluate({ participants: participantes, rules: reglas, config: {} });
      const r2 = StageEngine.evaluate({ participants: participantes, rules: reglas, config: {} });
      expect(r1.clasificados.map(c => c.id)).toEqual(r2.clasificados.map(c => c.id));
    });
  });

  describe('clasificación por ganador', () => {
    const reglas = [{
      tipo: 'CLASIFICACION',
      configuracion: { metodo: 'GANADOR', cantidad: 2, unidad: 'REGION' }
    }];

    const regiones = Array.from({ length: 25 }, (_, i) => ({
      id: `REGION_${String(i + 1).padStart(2, '0')}`,
      puntos: Math.floor(Math.random() * 100),
      gf: Math.floor(Math.random() * 50),
      gc: Math.floor(Math.random() * 50)
    }));

    it('clasifica los N mejores por puntos', () => {
      const result = StageEngine.evaluate({
        participants: regiones,
        rules: reglas,
        config: {}
      });
      expect(result.clasificados).toHaveLength(2);
      // Verificar que son los de mayor puntaje
      const maxPuntos = Math.max(...regiones.map(r => r.puntos));
      expect(result.clasificados[0].puntos).toBe(maxPuntos);
    });
  });

  describe('formación de grupos', () => {
    const reglas = [{
      tipo: 'COMPETICION',
      configuracion: { formato: 'GRUPOS', tamano_grupo: 4 }
    }];

    const participantes16 = Array.from({ length: 16 }, (_, i) => ({ id: i + 1 }));

    it('forma grupos de 4 con 16 participantes', () => {
      const result = StageEngine.evaluate({
        participants: participantes16,
        rules: reglas,
        config: {}
      });
      expect(result.grupos).toHaveLength(4);
      expect(result.grupos[0]).toHaveLength(4);
    });

    it('distribuye participantes sobrantes', () => {
      const participantes15 = Array.from({ length: 15 }, (_, i) => ({ id: i + 1 }));
      const result = StageEngine.evaluate({
        participants: participantes15,
        rules: reglas,
        config: {}
      });
      expect(result.grupos).toHaveLength(4);
      // Último grupo tiene 3
      expect(result.grupos[3]).toHaveLength(3);
    });
  });

  describe('orden de eliminación', () => {
    const reglas = [{
      tipo: 'COMPETICION',
      configuracion: { formato: 'ELIMINACION' }
    }];

    const participantes8 = Array.from({ length: 8 }, (_, i) => ({ id: i + 1 }));

    it('empareja 1v8, 2v7, 3v6, 4v5', () => {
      const result = StageEngine.evaluate({
        participants: participantes8,
        rules: reglas,
        config: {}
      });
      expect(result.ordenEliminacion).toHaveLength(4);
      expect(result.ordenEliminacion[0]).toEqual({ llave: 1, local: 1, visitante: 8 });
      expect(result.ordenEliminacion[1]).toEqual({ llave: 2, local: 2, visitante: 7 });
      expect(result.ordenEliminacion[2]).toEqual({ llave: 3, local: 3, visitante: 6 });
      expect(result.ordenEliminacion[3]).toEqual({ llave: 4, local: 4, visitante: 5 });
    });
  });

  describe('caso 16 equipos completo', () => {
    const reglas = [
      { tipo: 'PARTICIPANTES', configuracion: { minimo: 16, maximo: 16 } },
      { tipo: 'COMPETICION', configuracion: { formato: 'GRUPOS', tamano_grupo: 4 } },
      { tipo: 'CLASIFICACION', configuracion: { metodo: 'POSICION', cantidad: 8 } }
    ];

    const participantes = Array.from({ length: 16 }, (_, i) => ({
      id: i + 1,
      posicion: i + 1
    }));

    it('16 equipos → 4 grupos → 8 clasificados', () => {
      const result = StageEngine.evaluate({ participants: participantes, rules: reglas, config: {} });
      expect(result.viable).toBe(true);
      expect(result.grupos).toHaveLength(4);
      expect(result.clasificados).toHaveLength(8);
    });
  });

  describe('caso 25 regiones completo', () => {
    const reglas = [
      { tipo: 'PARTICIPANTES', configuracion: { minimo: 25, maximo: 25 } },
      { tipo: 'CLASIFICACION', configuracion: { metodo: 'GANADOR', cantidad: 1, unidad: 'REGION' } }
    ];

    const regiones = Array.from({ length: 25 }, (_, i) => ({
      id: `REGION_${String(i + 1).padStart(2, '0')}`,
      puntos: 100 - i
    }));

    it('25 regiones → 25 ganadores → 1 campeón', () => {
      const result = StageEngine.evaluate({ participants: regiones, rules: reglas, config: {} });
      expect(result.viable).toBe(true);
      expect(result.clasificados).toHaveLength(1);
      expect(result.clasificados[0].id).toBe('REGION_01');
    });
  });
});

describe('RuleRegistry', () => {
  it('tiene reglas built-in registradas', () => {
    expect(RuleRegistry.has('PARTICIPANTES')).toBe(true);
    expect(RuleRegistry.has('COMPETICION')).toBe(true);
    expect(RuleRegistry.has('CLASIFICACION')).toBe(true);
  });

  it('ejecuta regla de participantes', () => {
    const result = RuleRegistry.execute('PARTICIPANTES', {
      participants: [{ id: 1 }, { id: 2 }],
      config: { minimo: 2, maximo: 10 }
    });
    expect(result.valido).toBe(true);
  });

  it('ejecuta regla de competición', () => {
    const result = RuleRegistry.execute('COMPETICION', {
      participants: Array.from({ length: 8 }, (_, i) => ({ id: i })),
      config: { formato: 'ELIMINACION' }
    });
    expect(result.valido).toBe(true);
    expect(result.formato).toBe('ELIMINACION');
  });

  it('ejecuta regla de clasificación', () => {
    const result = RuleRegistry.execute('CLASIFICACION', {
      participants: [{ id: 1, posicion: 1 }, { id: 2, posicion: 2 }],
      config: { metodo: 'POSICION', cantidad: 1 }
    });
    expect(result.valido).toBe(true);
    expect(result.clasificados).toEqual([1]);
  });

  it('lista tipos de reglas registradas', () => {
    const tipos = RuleRegistry.list();
    expect(tipos).toContain('PARTICIPANTES');
    expect(tipos).toContain('COMPETICION');
    expect(tipos).toContain('CLASIFICACION');
  });
});
