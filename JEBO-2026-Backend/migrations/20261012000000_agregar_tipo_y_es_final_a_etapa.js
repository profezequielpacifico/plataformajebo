/**
 * Agrega los campos `tipo` y `es_final` a la tabla `etapa` para soportar
 * la misma mecánica que el módulo de Competencias.
 * Idempotente: no falla si las columnas ya existen.
 */

exports.up = function (knex) {
  return knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'etapa' AND column_name = 'tipo'
      ) THEN
        ALTER TABLE etapa ADD COLUMN tipo VARCHAR(50);
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'etapa' AND column_name = 'es_final'
      ) THEN
        ALTER TABLE etapa ADD COLUMN es_final BOOLEAN NOT NULL DEFAULT FALSE;
      END IF;
    END $$;
  `);
};

exports.down = function (knex) {
  return knex.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'etapa' AND column_name = 'tipo'
      ) THEN
        ALTER TABLE etapa DROP COLUMN tipo;
      END IF;
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'etapa' AND column_name = 'es_final'
      ) THEN
        ALTER TABLE etapa DROP COLUMN es_final;
      END IF;
    END $$;
  `);
};
