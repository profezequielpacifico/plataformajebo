#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const knex = require('../src/config/knex');
const logger = require('../src/config/logger');

async function main() {
  try {
    logger.info('Cargando datos demo para Gimnasia Artística...');

    // 1. Actualizar rol de jueces existentes (18,19,20)
    logger.info('1. Actualizando rol de jueces...');
    await knex('usuario').whereIn('id_usuario', [18, 19, 20]).update({ id_rol: 11 });

    // 2. Crear usuarios jueces con contraseña conocida para pruebas
    logger.info('2. Creando/actualizando jueces de prueba...');
    const passJuez = await bcrypt.hash('Juez2026', 10);
    // El documento va en digitos porque es lo que la app acepta: `POST /users` y
    // `PUT /users/:id` lo validan con /^\d{1,8}$/ y el formulario tambien. Con
    // los "DEMO-*" de la primera version, estos usuarios no se podian editar
    // desde la pantalla de Usuarios —empezando por un cambio de contraseña— y
    // el unico sintoma era un error de validacion del documento.
    const jueces = [
      { id_usuario: 500, nombre: 'Juez Demo 1', email: 'juez1@jebo2026.com', id_rol: 11, password_hash: passJuez, estado: 'Activo', documento: '900500' },
      { id_usuario: 501, nombre: 'Juez Demo 2', email: 'juez2@jebo2026.com', id_rol: 11, password_hash: passJuez, estado: 'Activo', documento: '900501' }
    ];
    for (const j of jueces) {
      const exists = await knex('usuario').where('id_usuario', j.id_usuario).first();
      if (exists) {
        await knex('usuario').where('id_usuario', j.id_usuario).update({ id_rol: j.id_rol, password_hash: j.password_hash, documento: j.documento });
      } else {
        await knex('usuario').insert(j);
      }
    }

    // 3. Crear 6 gimnastas adicionales (para equipos D y E)
    logger.info('3. Creando gimnastas adicionales...');
    const passGim = await bcrypt.hash('Gimnasta2026', 10);
    const nuevosGimnastas = [];
    for (let i = 10; i <= 15; i++) {
      nuevosGimnastas.push({
        id_usuario: 40 + i, // 50-55
        nombre: `Gimnasta ${i}`,
        email: `gimnasta${i}@test.com`,
        id_rol: 6,
        password_hash: passGim,
        estado: 'Activo',
        documento: String(900000 + i)
      });
    }
    for (const g of nuevosGimnastas) {
      const exists = await knex('usuario').where('id_usuario', g.id_usuario).first();
      if (exists) {
        // Se repara el documento de los que quedaron con el "DEMO-*" viejo, sin
        // tocar el resto de la fila: el password se deja como esta.
        if (!/^\d{1,8}$/.test(String(exists.documento))) {
          await knex('usuario').where('id_usuario', g.id_usuario).update({ documento: g.documento });
        }
        continue;
      }
      await knex('usuario').insert(g);
    }

    // 4. Crear equipos D y E (Trío D, Trío E) para disciplina 11
    logger.info('4. Creando equipos D y E...');
    const equiposNuevos = [
      { id_equipo: 42, nombre: 'Trío D - Gimnasia', id_disciplina: 11, id_institucion: 13, id_distrito: null, id_localidad: null, id_usuario: 51 },
      { id_equipo: 43, nombre: 'Trío E - Gimnasia', id_disciplina: 11, id_institucion: 13, id_distrito: null, id_localidad: null, id_usuario: 54 }
    ];
    for (const eq of equiposNuevos) {
      const exists = await knex('equipo').where('id_equipo', eq.id_equipo).first();
      if (!exists) {
        await knex('equipo').insert(eq);
      } else {
        await knex('equipo').where('id_equipo', eq.id_equipo).update({ nombre: eq.nombre, id_disciplina: eq.id_disciplina });
      }
    }

    // 5. Asignar integrantes a equipos D y E
    logger.info('5. Asignando integrantes...');
    const integrantes = [
      // Equipo 42 (D): gimnastas 10,11,12 → usuarios 50,51,52
      { id_equipo: 42, id_usuario: 50, rol: 'GIMNASTA' },
      { id_equipo: 42, id_usuario: 51, rol: 'GIMNASTA' },
      { id_equipo: 42, id_usuario: 52, rol: 'GIMNASTA' },
      // Equipo 43 (E): gimnastas 13,14,15 → usuarios 53,54,55
      { id_equipo: 43, id_usuario: 53, rol: 'GIMNASTA' },
      { id_equipo: 43, id_usuario: 54, rol: 'GIMNASTA' },
      { id_equipo: 43, id_usuario: 55, rol: 'GIMNASTA' }
    ];
    for (const i of integrantes) {
      const exists = await knex('equipo_integrante').where({ id_equipo: i.id_equipo, id_usuario: i.id_usuario }).first();
      if (!exists) {
        await knex('equipo_integrante').insert(i);
      }
    }

    // 6. Crear etapas para torneo 32
    logger.info('6. Creando etapas para torneo 32...');
    const etapas = [
      { id_etapa: 100, id_torneo: 32, nombre: 'Etapa Clasificación', orden: 1, estado: 'En Curso', fecha_inicio: '2026-09-15', fecha_fin: '2026-10-15' },
      { id_etapa: 101, id_torneo: 32, nombre: 'Etapa Final', orden: 2, estado: 'Pendiente', fecha_inicio: '2026-10-16', fecha_fin: '2026-12-15' }
    ];
    for (const e of etapas) {
      const exists = await knex('etapa').where('id_etapa', e.id_etapa).first();
      if (!exists) {
        await knex('etapa').insert(e);
      } else {
        await knex('etapa').where('id_etapa', e.id_etapa).update(e);
      }
    }

    // 7. Crear presentaciones adicionales (P2-P5). P1 ya existe (id 1)
    logger.info('7. Creando presentaciones P2-P5...');
    const presentaciones = [
      // P2: FINALIZADA, slot 33 (10-01 11:00), equipos A,B,C (39,40,41)
      { id_presentacion: 2, id_torneo: 32, id_disciplina: 11, orden: 2, estado: 'FINALIZADA', id_disponibilidad: 33, fecha_hora: '2026-10-01 11:00:00+00' },
      // P3: FINALIZADA, slot 34 (10-01 14:00), equipos A,B,C,D,E (39,40,41,42,43)
      { id_presentacion: 3, id_torneo: 32, id_disciplina: 11, orden: 3, estado: 'FINALIZADA', id_disponibilidad: 34, fecha_hora: '2026-10-01 14:00:00+00' },
      // P4: PROGRAMADA, slot 35 (10-02 14:00), equipos D,E
      { id_presentacion: 4, id_torneo: 32, id_disciplina: 11, orden: 4, estado: 'PROGRAMADA', id_disponibilidad: 35, fecha_hora: '2026-10-02 14:00:00+00' },
      // P5: CANCELADA, slot 32 (09-30 11:00), equipos B,C
      { id_presentacion: 5, id_torneo: 32, id_disciplina: 11, orden: 5, estado: 'CANCELADA', id_disponibilidad: 32, fecha_hora: '2026-10-02 11:00:00+00' }
    ];
    for (const p of presentaciones) {
      const exists = await knex('presentacion').where('id_presentacion', p.id_presentacion).first();
      if (!exists) {
        await knex('presentacion').insert(p);
      } else {
        await knex('presentacion').where('id_presentacion', p.id_presentacion).update(p);
      }
    }

    // 8. Actualizar P1 a EN_CURSO (para poder evaluar) y agregar participante D opcional
    logger.info('8. Configurando P1 (EN_CURSO)...');
    await knex('presentacion').where('id_presentacion', 1).update({ estado: 'EN_CURSO' });

    // Asegurar participantes de P1: A, B, C, D
    const partP1 = [
      { id_presentacion: 1, id_equipo: 39, rol: 'GRUPO', orden_salida: 1 },
      { id_presentacion: 1, id_equipo: 40, rol: 'GRUPO', orden_salida: 2 },
      { id_presentacion: 1, id_equipo: 41, rol: 'GRUPO', orden_salida: 3 },
      { id_presentacion: 1, id_equipo: 42, rol: 'GRUPO', orden_salida: 4 }
    ];
    for (const pr of partP1) {
      const exists = await knex('presentacion_participante').where({ id_presentacion: pr.id_presentacion, id_equipo: pr.id_equipo }).first();
      if (!exists) {
        await knex('presentacion_participante').insert(pr);
      }
    }

    // 9. Participantes P2: A, B, C
    logger.info('9. Agregando participantes...');
    const partP2 = [
      { id_presentacion: 2, id_equipo: 39, rol: 'GRUPO', orden_salida: 1 },
      { id_presentacion: 2, id_equipo: 40, rol: 'GRUPO', orden_salida: 2 },
      { id_presentacion: 2, id_equipo: 41, rol: 'GRUPO', orden_salida: 3 }
    ];
    for (const pr of partP2) {
      const exists = await knex('presentacion_participante').where({ id_presentacion: pr.id_presentacion, id_equipo: pr.id_equipo }).first();
      if (!exists) await knex('presentacion_participante').insert(pr);
    }

    // P3: A, B, C, D, E
    const partP3 = [
      { id_presentacion: 3, id_equipo: 39, rol: 'GRUPO', orden_salida: 1 },
      { id_presentacion: 3, id_equipo: 40, rol: 'GRUPO', orden_salida: 2 },
      { id_presentacion: 3, id_equipo: 41, rol: 'GRUPO', orden_salida: 3 },
      { id_presentacion: 3, id_equipo: 42, rol: 'GRUPO', orden_salida: 4 },
      { id_presentacion: 3, id_equipo: 43, rol: 'GRUPO', orden_salida: 5 }
    ];
    for (const pr of partP3) {
      const exists = await knex('presentacion_participante').where({ id_presentacion: pr.id_presentacion, id_equipo: pr.id_equipo }).first();
      if (!exists) await knex('presentacion_participante').insert(pr);
    }

    // P4: D, E
    const partP4 = [
      { id_presentacion: 4, id_equipo: 42, rol: 'GRUPO', orden_salida: 1 },
      { id_presentacion: 4, id_equipo: 43, rol: 'GRUPO', orden_salida: 2 }
    ];
    for (const pr of partP4) {
      const exists = await knex('presentacion_participante').where({ id_presentacion: pr.id_presentacion, id_equipo: pr.id_equipo }).first();
      if (!exists) await knex('presentacion_participante').insert(pr);
    }

    // P5: B, C
    const partP5 = [
      { id_presentacion: 5, id_equipo: 40, rol: 'GRUPO', orden_salida: 1 },
      { id_presentacion: 5, id_equipo: 41, rol: 'GRUPO', orden_salida: 2 }
    ];
    for (const pr of partP5) {
      const exists = await knex('presentacion_participante').where({ id_presentacion: pr.id_presentacion, id_equipo: pr.id_equipo }).first();
      if (!exists) await knex('presentacion_participante').insert(pr);
    }

    // 10. Staff (jueces) para P2-P5
    logger.info('10. Asignando jueces a presentaciones...');
    const staff = [
      // P1: el juez pendiente (501) es `juez2@jebo2026.com`, para poder entrar
      // con una contrasena conocida y llenar la hoja en vivo.
      { id_presentacion: 1, id_usuario: 500, rol: 'JUEZ_PRESIDENTE' },
      { id_presentacion: 1, id_usuario: 501, rol: 'JUEZ' },
      { id_presentacion: 1, id_usuario: 18, rol: 'JUEZ' },
      // P2
      { id_presentacion: 2, id_usuario: 18, rol: 'JUEZ_PRESIDENTE' },
      { id_presentacion: 2, id_usuario: 19, rol: 'JUEZ' },
      { id_presentacion: 2, id_usuario: 20, rol: 'JUEZ' },
      // P3
      { id_presentacion: 3, id_usuario: 18, rol: 'JUEZ_PRESIDENTE' },
      { id_presentacion: 3, id_usuario: 19, rol: 'JUEZ' },
      { id_presentacion: 3, id_usuario: 20, rol: 'JUEZ' },
      // P4
      { id_presentacion: 4, id_usuario: 18, rol: 'JUEZ_PRESIDENTE' },
      { id_presentacion: 4, id_usuario: 19, rol: 'JUEZ' },
      { id_presentacion: 4, id_usuario: 20, rol: 'JUEZ' },
      // P5
      { id_presentacion: 5, id_usuario: 18, rol: 'JUEZ_PRESIDENTE' },
      { id_presentacion: 5, id_usuario: 19, rol: 'JUEZ' },
      { id_presentacion: 5, id_usuario: 20, rol: 'JUEZ' }
    ];
    for (const s of staff) {
      const exists = await knex('staff_presentacion').where({ id_presentacion: s.id_presentacion, id_usuario: s.id_usuario }).first();
      if (!exists) await knex('staff_presentacion').insert(s);
    }

// 11. Evaluaciones
    logger.info('11. Insertando evaluaciones...');

    // Las ocho casillas van en dos listas separadas (los cuatro momentos de
    // coordinación y los cuatro de ejecución) para que se lean igual que en el
    // reglamento. Con los ocho valores de a pares c/d una corrección de un
    // puntaje se colaba en la fila equivocada sin que se notara.
    const ev = (id_presentacion, id_participante_equipo, id_juez, coord, desem, obs = '') => ({
      id_presentacion,
      id_participante_equipo,
      id_juez,
      coord_1: coord[0], coord_2: coord[1], coord_3: coord[2], coord_4: coord[3],
      desem_1: desem[0], desem_2: desem[1], desem_3: desem[2], desem_4: desem[3],
      observaciones: obs
    });

    // Upsert por la clave natural (presentación, equipo, juez).
    const guardar = async (filas) => {
      for (const e of filas) {
        const clave = {
          id_presentacion: e.id_presentacion,
          id_participante_equipo: e.id_participante_equipo,
          id_juez: e.id_juez
        };
        const existe = await knex('evaluacion').where(clave).first();
        if (existe) await knex('evaluacion').where(clave).update(e);
        else await knex('evaluacion').insert(e);
      }
    };

    // P1 (EN_CURSO): 3 jueces asignados, 2 con hoja completa y el tercero
    // pendiente. Así la pantalla muestra "2 de 3" y se puede entrar como
    // juez2@jebo2026.com para llenar y guardar la hoja de verdad.
    await guardar([
      ev(1, 39, 500, [4, 4, 4, 5], [4, 4, 4, 4]), // Trío A → 33
      ev(1, 40, 500, [5, 5, 4, 5], [4, 4, 3, 4]), // Trío B → 34
      ev(1, 41, 500, [3, 3, 3, 4], [3, 3, 3, 3]), // Trío C → 25
      ev(1, 42, 500, [2, 3, 3, 2], [3, 2, 2, 3]), // Trío D → 20
      ev(1, 39, 18, [4, 5, 4, 4], [4, 4, 5, 4]),  // Trío A → 34
      ev(1, 40, 18, [5, 4, 5, 5], [5, 4, 4, 4]),  // Trío B → 36
      ev(1, 41, 18, [3, 3, 4, 3], [3, 3, 3, 3]),  // Trío C → 25
      ev(1, 42, 18, [3, 2, 3, 3], [2, 3, 2, 2])   // Trío D → 20
    ]);
    // El juez 501 (juez2@jebo2026.com) no tiene hoja: es la que se completa en vivo.
    // Se borra explícitamente porque al probar el guardado desde la pantalla queda
    // cargada, y sin esto re-correr el script no devuelve la demo al estado de
    // "2 de 3" que es lo que se quiere ver.
    await knex('evaluacion').where('id_presentacion', 1).where('id_juez', 501).del();

    // P2 (FINALIZADA): 3 equipos, 3 jueces, todo completo.
    // A y B empatan en 36.00 y el desempate por coordinación averages se lo queda
    // B (20.00 contra 18.00). Es el caso que hace visible la regla del reglamento.
    await guardar([
      ev(2, 39, 18, [4, 5, 5, 4], [5, 4, 4, 5]), // Trío A → 36 (coord 18)
      ev(2, 39, 19, [5, 4, 5, 4], [5, 5, 4, 4]), // Trío A → 36 (coord 18)
      ev(2, 39, 20, [4, 4, 4, 5], [5, 5, 5, 4]), // Trío A → 36 (coord 17)

      ev(2, 40, 18, [5, 5, 5, 5], [4, 4, 4, 4]), // Trío B → 36 (coord 20)
      ev(2, 40, 19, [5, 5, 5, 5], [4, 4, 4, 4]), // Trío B → 36 (coord 20)
      ev(2, 40, 20, [5, 5, 5, 5], [4, 4, 4, 4]), // Trío B → 36 (coord 20)

      ev(2, 41, 18, [3, 3, 3, 3], [3, 3, 3, 3]), // Trío C → 24
      ev(2, 41, 19, [3, 3, 4, 3], [3, 3, 3, 4]), // Trío C → 26
      ev(2, 41, 20, [2, 3, 3, 3], [3, 3, 3, 3])  // Trío C → 23
    ]);

    // P3 (FINALIZADA): los 5 equipos. Promedios 39.00 / 38.33 / 36.00 / 32.00 /
    // 28.00, así que acá gana el Trío C y no hace falta llegar al desempate.
    // Sirve para ver que el ranking es por presentación y no acumulado.
    await guardar([
      ev(3, 39, 18, [5, 5, 4, 5], [5, 5, 4, 5]), // Trío A → 38
      ev(3, 39, 19, [5, 4, 5, 5], [5, 5, 4, 5]), // Trío A → 38
      ev(3, 39, 20, [5, 5, 5, 4], [5, 5, 5, 5]), // Trío A → 39

      ev(3, 40, 18, [4, 5, 4, 4], [5, 4, 5, 5]), // Trío B → 36
      ev(3, 40, 19, [4, 4, 4, 4], [5, 5, 5, 4]), // Trío B → 35
      ev(3, 40, 20, [4, 5, 5, 4], [5, 4, 5, 5]), // Trío B → 37

      ev(3, 41, 18, [5, 5, 5, 5], [5, 5, 5, 5]), // Trío C → 40
      ev(3, 41, 19, [5, 5, 5, 4], [5, 5, 5, 5]), // Trío C → 39
      ev(3, 41, 20, [5, 5, 4, 4], [5, 5, 5, 5]), // Trío C → 38

      ev(3, 42, 18, [4, 4, 4, 4], [4, 4, 4, 4]), // Trío D → 32
      ev(3, 42, 19, [4, 4, 5, 4], [4, 4, 4, 4]), // Trío D → 33
      ev(3, 42, 20, [4, 4, 3, 4], [4, 4, 4, 4]), // Trío D → 31

      ev(3, 43, 18, [3, 4, 3, 4], [3, 4, 3, 4]), // Trío E → 28
      ev(3, 43, 19, [3, 4, 4, 3], [3, 4, 4, 4]), // Trío E → 29
      ev(3, 43, 20, [3, 3, 3, 4], [3, 4, 4, 3])  // Trío E → 27
    ]);

    // 12. Alinear las secuencias con los ids explicitos.
    //
    // Este script inserta con id fijo (500, 100, 2...) en vez de dejar que las
    // columnas `serial` asignen, y eso deja las secuencias atrás del max(id). La
    //secuencia de `presentacion` llegó a estar en 2 con filas hasta la 5, así que
    // el siguiente insert desde la aplicación tomaba un id ya usado y moría con
    // presentacion_pkey: el alta desde la pantalla de admin era imposible hasta
    // que se corrigió esto.
    logger.info('12. Alineando secuencias...');
    for (const { tabla, secuencia, pk } of [
      { tabla: 'presentacion', secuencia: 'presentacion_id_presentacion_seq', pk: 'id_presentacion' },
      { tabla: 'etapa', secuencia: 'etapa_id_etapa_seq', pk: 'id_etapa' },
      { tabla: 'usuario', secuencia: 'usuario_id_usuario_seq', pk: 'id_usuario' },
      { tabla: 'equipo', secuencia: 'equipo_id_equipo_seq', pk: 'id_equipo' }
    ]) {
      await knex.raw(
        `SELECT setval(?, (SELECT COALESCE(MAX(${pk}), 1) FROM ${tabla}), true)`,
        [secuencia]
      );
    }

    logger.info('✅ Datos demo cargados correctamente');
    logger.info('📋 Credenciales de prueba:');
    logger.info('   - juez1@jebo2026.com / Juez2026 (Juez)');
    logger.info('   - juez2@jebo2026.com / Juez2026 (Juez)');
    logger.info('   - admin@jebo2026.com / Admin2026 (Admin)');
    logger.info('   - liparelli@jebo2026.com / admin123 (Admin)');
    logger.info('📊 Estado:');
    logger.info('   - P1 (id 1): EN_CURSO - 2 de 3 jueces evaluaron (juez2 pendiente)');
    logger.info('   - P2 (id 2): FINALIZADA - A,B,C evaluados (B gana por desempate)');
    logger.info('   - P3 (id 3): FINALIZADA - A,B,C,D,E evaluados (C gana)');
    logger.info('   - P4 (id 4): PROGRAMADA - D,E');
    logger.info('   - P5 (id 5): CANCELADA - B,C');

    await knex.destroy();
  } catch (err) {
    logger.error('Error al cargar datos demo:', err);
    console.error(err);
    process.exit(1);
  }
}

main();
