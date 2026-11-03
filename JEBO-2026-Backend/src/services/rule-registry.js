/**
 * RuleRegistry - Registro de estrategias de reglas.
 * 
 * Permite registrar y obtener reglas por tipo.
 * Las reglas son funciones que reciben un contexto y devuelven un resultado.
 */

class RuleRegistry {
  constructor() {
    this.rules = new Map();
  }

  /**
   * Registra una regla para un tipo específico.
   * @param {string} tipo - Tipo de regla (PARTICIPANTES, COMPETICION, CLASIFICACION)
   * @param {Function} rule - Función que evalúa la regla
   */
  register(tipo, rule) {
    if (typeof rule !== 'function') {
      throw new Error(`Rule para ${tipo} debe ser una función`);
    }
    this.rules.set(tipo, rule);
  }

  /**
   * Obtiene una regla por tipo.
   * @param {string} tipo - Tipo de regla
   * @returns {Function|null} La función de la regla o null si no existe
   */
  get(tipo) {
    return this.rules.get(tipo) || null;
  }

  /**
   * Verifica si una regla está registrada.
   * @param {string} tipo - Tipo de regla
   * @returns {boolean}
   */
  has(tipo) {
    return this.rules.has(tipo);
  }

  /**
   * Ejecuta una regla con un contexto dado.
   * @param {string} tipo - Tipo de regla
   * @param {Object} context - Contexto de evaluación
   * @returns {Object} Resultado de la regla
   */
  execute(tipo, context) {
    const rule = this.get(tipo);
    if (!rule) {
      throw new Error(`Regla no encontrada: ${tipo}`);
    }
    return rule(context);
  }

  /**
   * Lista todos los tipos de reglas registrados.
   * @returns {string[]}
   */
  list() {
    return Array.from(this.rules.keys());
  }
}

// Crear instancia global
const registry = new RuleRegistry();

// Registrar reglas built-in
registry.register('PARTICIPANTES', require('./rules/participantes.rule'));
registry.register('COMPETICION', require('./rules/competicion.rule'));
registry.register('CLASIFICACION', require('./rules/clasificacion.rule'));

module.exports = registry;
