import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '..');

const archivos = (dir) => readdirSync(dir).flatMap((nombre) => {
  const ruta = join(dir, nombre);
  if (statSync(ruta).isDirectory()) return nombre === 'tests' ? [] : archivos(ruta);
  return /\.(js|jsx)$/.test(nombre) ? [ruta] : [];
});

describe('auditoría de solo lectura', () => {
  it('ningún archivo usa métodos de escritura ni credenciales', () => {
    const ofensores = archivos(SRC).filter((ruta) => {
      const texto = readFileSync(ruta, 'utf8');
      return /method:\s*['"](POST|PUT|PATCH|DELETE)['"]/i.test(texto)
        || /credentials:\s*['"]include['"]/.test(texto)
        || /localStorage|sessionStorage|Authorization/.test(texto);
    });
    expect(ofensores).toEqual([]);
  });

  it('solo services/api.js llama a fetch', () => {
    const conFetch = archivos(SRC).filter((ruta) => /\bfetch\(/.test(readFileSync(ruta, 'utf8')));
    expect(conFetch.map((r) => r.replace(`${SRC}/`, ''))).toEqual(['services/api.js']);
  });
});
