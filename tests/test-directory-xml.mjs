import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOMParser } from '@xmldom/xmldom';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const require = createRequire(import.meta.url);
const DirectoryXml = require(join(root, 'directory-xml.js'));

global.DOMParser = DOMParser;

function load(name) {
  return readFileSync(join(root, name), 'utf8');
}

test('parses v1.0 contact-only fixture', () => {
  const doc = DirectoryXml.parseDirectoryXml(load('fixtures/sample-directory-v1.0.xml'));
  assert.equal(doc.version, '1.0');
  assert.equal(doc.contacts.length, 10);
  assert.equal(doc.resources.length, 0);
  assert.ok(doc.contacts[0].name);
});

test('parses v1.1 sample with scheduling sections', () => {
  const doc = DirectoryXml.parseDirectoryXml(load('sample-directory.xml'));
  assert.equal(doc.version, '1.1');
  assert.equal(doc.contacts.length, 10);
  assert.ok(doc.resources.length >= 7);
  assert.ok(doc.contracts.length >= 8);
  assert.ok(doc.commLinks.length >= 5);
  assert.ok(doc.reservations.length >= 4);

  const billingModels = new Set(doc.contracts.map((c) => c.billingModel));
  for (const model of ['subscription', 'owned', 'pay_per_minute', 'pay_per_mb', 'reservation', 'hybrid']) {
    assert.ok(billingModels.has(model), `missing billing model ${model}`);
  }
});

test('round-trips v1.1 sample without losing IDs', () => {
  const original = DirectoryXml.parseDirectoryXml(load('sample-directory.xml'));
  const xml = DirectoryXml.serializeDirectoryXml(original);
  const roundTripped = DirectoryXml.parseDirectoryXml(xml);

  assert.deepEqual(
    roundTripped.contacts.map((c) => c.id).sort(),
    original.contacts.map((c) => c.id).sort()
  );
  assert.deepEqual(
    roundTripped.resources.map((r) => r.id).sort(),
    original.resources.map((r) => r.id).sort()
  );
  assert.deepEqual(
    roundTripped.contracts.map((c) => c.id).sort(),
    original.contracts.map((c) => c.id).sort()
  );
  assert.deepEqual(
    roundTripped.commLinks.map((l) => l.id).sort(),
    original.commLinks.map((l) => l.id).sort()
  );
  assert.deepEqual(
    roundTripped.reservations.map((r) => r.id).sort(),
    original.reservations.map((r) => r.id).sort()
  );
});

test('v1.0 export remains contact-only when no scheduling data', () => {
  const v10 = DirectoryXml.parseDirectoryXml(load('fixtures/sample-directory-v1.0.xml'));
  const xml = DirectoryXml.serializeDirectoryXml(v10);
  assert.match(xml, /version="1\.0"/);
  assert.doesNotMatch(xml, /<Resources>/);
  const reparsed = DirectoryXml.parseDirectoryXml(xml);
  assert.equal(reparsed.contacts.length, 10);
});
