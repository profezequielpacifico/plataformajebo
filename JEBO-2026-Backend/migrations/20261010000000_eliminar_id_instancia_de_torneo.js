/**
 * Elimina la columna id_instancia de la tabla torneo.
 * El campo ya no se usa en el frontend ni es necesario para la lógica de negocio.
 */

exports.up = function (knex) {
  return knex.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'torneo_id_instancia_fkey'
          AND conrelid = 'torneo'::regclass
      ) THEN
        ALTER TABLE torneo DROP CONSTRAINT torneo_id_instancia_fkey;
      END IF;
    END $$;
  `).then(function() {
    return knex.raw(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'torneo' AND column_name = 'id_instancia'
        ) THEN
          ALTER TABLE torneo DROP COLUMN id_instancia;
        END IF;
      END $$;
    `);
  });
};

exports.down = function (knex) {
  return knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'torneo' AND column_name = 'id_instancia'
      ) THEN
        ALTER TABLE torneo ADD COLUMN id_instancia INTEGER NOT NULL;
      END IF;
    END $$;
  `).then(function() {
    return knex.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'torneo_id_instancia_fkey'
            AND conrelid = 'torneo'::regclass
        ) THEN
          ALTER TABLE torneo ADD CONSTRAINT torneo_id_instancia_fkey
            FOREIGN KEY (id_instancia) REFERENCES instancia(id_instancia);
        END IF;
      END $$;
    `);
  });
};
