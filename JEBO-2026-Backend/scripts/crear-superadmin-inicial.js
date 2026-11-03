/**
 * Crea el SuperAdmin inicial sin limpiar ni sembrar el resto de la base.
 * Ejecutar con: node scripts/crear-superadmin-inicial.js
 * La contraseña aleatoria se muestra una sola vez en stdout.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const knex = require('../src/config/knex');
const env = require('../src/config/env');

const EMAIL = 'superadmin@jebo2026.com';
const NOMBRE = 'SuperAdmin JEBO';
const ROL = 'SuperAdmin';
// ID reservado por la migración 20261004120000_add_rol_superadmin.
const ID_ROL_SUPERADMIN = 20;

function generarContrasena(longitud = 32) {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_';
  const bytes = crypto.randomBytes(longitud);
  return Array.from(bytes, (byte) => alfabeto[byte % alfabeto.length]).join('');
}

async function main() {
  const password = generarContrasena();
  // Identificador sintético único porque documento es NOT NULL y UNIQUE.
  const documento = `SA${crypto.randomBytes(9).toString('hex')}`;
  const password_hash = await bcrypt.hash(password, env.bcrypt.rounds);

  const usuario = await knex.transaction(async (trx) => {
    const existente = await trx('usuario')
      .whereRaw('lower(email) = ?', [EMAIL])
      .first();

    if (existente) {
      throw new Error(`Ya existe una cuenta con el email ${EMAIL}; no se modificó.`);
    }

    let rol = await trx('rol').where('descripcion', ROL).first();

    if (!rol) {
      const idOcupado = await trx('rol').where('id_rol', ID_ROL_SUPERADMIN).first();

      if (idOcupado) {
        throw new Error(
          `No se puede crear el rol ${ROL}: id_rol=${ID_ROL_SUPERADMIN} ` +
          `ya pertenece a "${idOcupado.descripcion}".`
        );
      }

      [rol] = await trx('rol')
        .insert({ id_rol: ID_ROL_SUPERADMIN, descripcion: ROL })
        .returning('*');
    }

    const [creado] = await trx('usuario')
      .insert({
        id_rol: rol.id_rol,
        nombre: NOMBRE,
        email: EMAIL,
        documento,
        password_hash,
        estado: 'Activo'
      })
      .returning(['id_usuario', 'nombre', 'email', 'id_rol']);

    return creado;
  });

  console.log('\nSuperAdmin creado. Copia las credenciales ahora:');
  console.log(`Email:      ${usuario.email}`);
  console.log(`Contraseña: ${password}`);
  console.log(`ID usuario: ${usuario.id_usuario}`);
  console.log('\nGuarda la contraseña en un gestor seguro.');
}

main()
  .catch((error) => {
    console.error(`No se pudo crear el SuperAdmin: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await knex.destroy();
  });
