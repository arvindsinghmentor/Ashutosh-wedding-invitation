// Quick rules check as an anonymous guest (no login), against the live project.
// Usage (from repo/): node tests/rules-guest-test.mjs
// Creates one RSVP named "RULES TEST"; the organiser test page deletes it.
const KEY = 'AIzaSyDy84zlhAGC9SfkXvp6DzXZ3MaC8jGNetQ';
const DB = 'https://firestore.googleapis.com/v1/projects/ashutosh-wedding/databases/(default)/documents';

const val = v => typeof v === 'number' ? { integerValue: String(v) } : { stringValue: v };
const fields = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, val(v)]));

async function create(coll, data, serverTime = true) {
  const id = 'rt' + Math.random().toString(36).slice(2, 10);
  const write = { update: { name: `projects/ashutosh-wedding/databases/(default)/documents/${coll}/${id}`, fields: fields(data) },
    currentDocument: { exists: false } };
  if (serverTime) write.updateTransforms = [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }];
  const r = await fetch(`${DB}:commit?key=${KEY}`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ writes: [write] }) });
  return r.status;
}
const read = async path => (await fetch(`${DB}/${path}?key=${KEY}`)).status;

const ok = { n: 'RULES TEST', p: '919999999999', a: 1, ad: 2, ch: 0, v: 6 };
const cases = [
  ['guest can create a valid RSVP', () => create('rsvps', ok), true],
  ['guest cannot add unknown fields', () => create('rsvps', { ...ok, room: '422' }), false],
  ['guest cannot send a = 5', () => create('rsvps', { ...ok, a: 5 }), false],
  ['guest cannot send 99 adults', () => create('rsvps', { ...ok, ad: 99 }), false],
  ['guest cannot skip the server time', () => create('rsvps', ok, false), false],
  ['guest cannot list RSVPs', () => read('rsvps'), false],
  ['guest cannot read rooms', () => read('rooms'), false],
  ['guest cannot write rooms', () => create('rooms', { name: 'x' }, false), false],
  ['guest cannot add an organiser', () => create('organisers', { name: 'x' }, false), false],
  ['guest cannot read meta', () => read('meta/invite'), false],
];

let fails = 0;
for (const [name, fn, allowed] of cases) {
  const s = await fn(); const pass = allowed ? s === 200 : s === 403;
  if (!pass) fails++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  (HTTP ${s})`);
}
console.log(fails ? `${fails} failed` : 'All guest checks passed');
process.exit(fails ? 1 : 0);
