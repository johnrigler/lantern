import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
test('shared Chisel modules match recorded checksums', async () => {
  const manifest = JSON.parse(await readFile(new URL('../onboard/vendor/chisel-checksums.json', import.meta.url), 'utf8'));
  for (const [file, hash] of Object.entries(manifest)) assert.equal(createHash('sha256').update(await readFile(new URL('../onboard/vendor/' + file, import.meta.url))).digest('hex'), hash, file);
});
