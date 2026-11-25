#!/usr/bin/env node
/*
 * Cross-platform packager (Windows, macOS, Linux), no dependencies.
 * Builds dist/ux-animation-principles.zip with the skill folder at the archive root,
 * which is the structure Claude's "Upload a skill" expects.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const SKILL_PARENT = path.join(ROOT, 'plugin', 'skills');
const SKILL_NAME = 'ux-animation-principles';
const OUT = path.join(ROOT, 'dist', SKILL_NAME + '.zip');

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function dosTime(d) {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  };
}
function walk(dir, rel) {
  let out = [{ name: rel + '/', dir: true }];
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (e.name === '.DS_Store' || e.name === 'Thumbs.db') continue;
    const full = path.join(dir, e.name), r = rel + '/' + e.name;
    if (e.isDirectory()) out = out.concat(walk(full, r));
    else out.push({ name: r, data: fs.readFileSync(full) });
  }
  return out;
}

const entries = walk(path.join(SKILL_PARENT, SKILL_NAME), SKILL_NAME);
const { time, date } = dosTime(new Date());
const locals = [], centrals = [];
let offset = 0;
for (const e of entries) {
  const name = Buffer.from(e.name, 'utf8');
  const raw = e.dir ? Buffer.alloc(0) : e.data;
  const comp = e.dir ? raw : zlib.deflateRawSync(raw, { level: 9 });
  const method = e.dir ? 0 : 8, crc = crc32(raw);
  const lh = Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(method, 8);
  lh.writeUInt16LE(time, 10); lh.writeUInt16LE(date, 12); lh.writeUInt32LE(crc, 14);
  lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
  locals.push(lh, name, comp);
  const ch = Buffer.alloc(46);
  ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(method, 10);
  ch.writeUInt16LE(time, 12); ch.writeUInt16LE(date, 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(raw.length, 24);
  ch.writeUInt16LE(name.length, 28); ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32); ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36);
  ch.writeUInt32LE(e.dir ? 0x10 : 0, 38); ch.writeUInt32LE(offset, 42);
  centrals.push(ch, name);
  offset += lh.length + name.length + comp.length;
}
const cd = Buffer.concat(centrals);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, Buffer.concat(locals.concat([cd, end])));
console.log(`Built ${path.relative(ROOT, OUT)} (${entries.filter(e => !e.dir).length} files, ${fs.statSync(OUT).size} bytes)`);
entries.forEach(e => console.log('  ' + e.name));
