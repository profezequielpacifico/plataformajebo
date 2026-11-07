class RuleRegistry {
  constructor() {
    this.rules = new Map();
  }

  register(tipo, rule) {
    if (typeof rule !== 'function') {
      throw new Error(`Rule para ${tipo} debe ser una función`);
    }
    this.rules.set(tipo, rule);
  }

  get(tipo) {
    return this.rules.get(tipo) || null;
  }

  has(tipo) {
    return this.rules.has(tipo);
  }

  execute(tipo, context) {
    const rule = this.get(tipo);
    if (!rule) {
      throw new Error(`Regla no encontrada: ${tipo}`);
    }
    return rule(context);
  }

  list() {
    return Array.from(this.rules.keys());
  }
}

const registry = new RuleRegistry();

registry.register('PARTICIPANTES', require('./rules/participantes.rule'));
registry.register('COMPETICION', require('./rules/competicion.rule'));
registry.register('CLASIFICACION', require('./rules/clasificacion.rule'));

module.exports = registry;
