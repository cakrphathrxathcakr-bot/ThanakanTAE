/* Offline fixtures only: no SDK downloads and no real Firebase reads/writes. */
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const core = require('../core.js');
const { convertLegacy, mergeMutation } = require('../legacy-service.js');
const clone = value => JSON.parse(JSON.stringify(value));
const fixture = {
  anotherApp: { untouched: [1, 2, 3] },
  members: {
    'old-member-key': { code: '100001', nick: 'One', name: 'First Member', pbPage: 3, pbLine: 25, balance: 999, custom: { retain: true } },
    '100002': { code: '200002', nick: 'Two', name: 'Second Member', pbPage: 1, pbLine: 1 }
  },
  transactions: {
    a: { studentCode: 'old-member-key', type: 'deposit', amount: 100, date: '2026-01-01T00:00:00Z', printed: true, custom: 'retain' },
    b: { studentCode: '100001', type: 'deposit', amount: 0.005, date: '2026-01-02T00:00:00Z', printed: false },
    c: { studentCode: 'old-member-key', type: 'deposit', amount: 0.005, date: '2026-01-03T00:00:00Z', printed: false, isInterest: true },
    d: { studentCode: '200002', type: 'deposit', amount: 10, date: '2026-01-04T00:00:00Z', printed: false }
  }
};
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS', name); }
test('Original paths, aliases, deterministic dates, passbook line25 and printed flag', () => {
  const parsed = convertLegacy(fixture);
  assert.equal(parsed.issues.length, 0);
  assert.equal(parsed.memberKeys['100001'], 'old-member-key');
  assert.equal(parsed.aliases.get('200002'), '100002');
  assert.equal(parsed.state.members['100001'].pbPage, 4);
  assert.equal(parsed.state.members['100001'].pbLine, 1);
  assert.equal(parsed.state.members['100001'].createdAt, '2026-01-01T00:00:00.000Z');
  assert.equal(parsed.state.transactions.a.printedAt, parsed.state.transactions.a.createdAt);
  assert.equal(parsed.state.transactions.b.printedAt, undefined);
  assert.equal(parsed.state.transactions.d.studentCode, '100002');
  assert.equal(parsed.state.interestRuns['2026-01'].legacy, true);
});
test('Historical fractional satang aggregate once and running balances preserve original total', () => {
  const { state } = convertLegacy(fixture);
  assert.equal(state.transactions.b.amountSatang, 1);
  assert.equal(state.transactions.c.amountSatang, 1);
  assert.equal(core.balance(state, '100001'), 10001);
  assert.equal(core.availableBalance(state, '100001'), 10001);
  assert.equal(state.transactions.c.legacyRunningBalanceSatang, 10001);
  assert.throws(() => core.applyMutation(state, { action: 'reverse', idempotencyKey: 'reverse-fraction', transactionId: 'b', reason: 'test' }), /สตางค์/);
});
test('Historical sub-half-cent remains visible as zero while raw balance guards closure', () => {
  const source = { members: { '100001': { code: '100001', name: 'A' } }, transactions: { tiny: { studentCode: '100001', type: 'deposit', amount: 0.004, date: '2026-01-01' } } };
  const parsed = convertLegacy(source);
  assert.equal(parsed.state.transactions.tiny.amountSatang, 0);
  assert.equal(core.balance(parsed.state, '100001'), 0);
  assert.equal(parsed.exactZeroBalances['100001'], false);
});
test('New deposits use original member key and retain all existing root fields and original amounts', () => {
  const original = clone(fixture), before = convertLegacy(original);
  const change = core.applyMutation(before.state, { action: 'transact', idempotencyKey: 'deposit-1', code: '100001', type: 'deposit', amountSatang: 1234, note: 'new' }, { actor: 'admin', now: '2026-10-22T00:00:00.000Z', idFactory: () => 'fixed' });
  const after = mergeMutation(original, before, change.state);
  assert.deepEqual(after.anotherApp, original.anotherApp);
  Object.keys(original.transactions).forEach(id => assert.deepEqual(after.transactions[id], original.transactions[id]));
  assert.deepEqual(after.members, original.members);
  const tx = after.transactions[change.result.transactionId];
  assert.equal(tx.studentCode, 'old-member-key'); assert.equal(tx.amount, 12.34); assert.equal(tx.printed, false);
  assert.equal(tx.date, '2026-10-22T00:00:00.000Z');
  assert.equal(after.taebankMeta.requests['deposit-1'].result.transactionId, change.result.transactionId);
  assert.equal(after.taebankMeta.interestRuns, undefined);
  const replay = core.applyMutation(convertLegacy(after).state, { action: 'transact', idempotencyKey: 'deposit-1', code: '100001', type: 'deposit', amountSatang: 1234, note: 'new' });
  assert.deepEqual(mergeMutation(after, convertLegacy(after), replay.state), after);
  assert.deepEqual(original, fixture);
});
test('Member edits preserve unknown fields and do not rewrite normalized historical print position', () => {
  const before = convertLegacy(fixture);
  const change = core.applyMutation(before.state, { action: 'member.save', idempotencyKey: 'member-edit', code: '100001', nick: 'Updated', name: 'Updated Name' });
  const after = mergeMutation(fixture, before, change.state);
  assert.equal(after.members['old-member-key'].name, 'Updated Name');
  assert.equal(after.members['old-member-key'].pbPage, 3); assert.equal(after.members['old-member-key'].pbLine, 25);
  assert.equal(after.members['old-member-key'].balance, 999);
  assert.deepEqual(after.members['old-member-key'].custom, { retain: true });
  assert.equal(after.members['old-member-key'].createdAt, undefined);
  assert.deepEqual(after.transactions, fixture.transactions);
});
test('Print confirmation only marks confirmed records and preserves raw amounts', () => {
  const before = convertLegacy(fixture);
  const change = core.applyMutation(before.state, { action: 'print.confirm', idempotencyKey: 'print-1', code: '100001', transactionIds: ['b', 'c'], page: 4, line: 1 }, { now: '2026-10-22T00:00:00.000Z', actor: 'admin', idFactory: () => 'print' });
  const after = mergeMutation(fixture, before, change.state);
  assert.deepEqual(after.transactions.a, fixture.transactions.a);
  assert.equal(after.transactions.b.amount, 0.005); assert.equal(after.transactions.b.printed, true);
  assert.equal(after.members['old-member-key'].pbLine, 3);
});
test('Decimal scientific notation, negative balances, invalid and ambiguous records', () => {
  const source = { members: { '100001': { code: '100001', name: 'A' } }, transactions: {
    tiny: { studentCode: '100001', type: 'deposit', amount: 5e-3, date: '2026-01-01' },
    withdrawal: { studentCode: '100001', type: 'withdraw', amount: 1, date: '2026-01-02' }
  } };
  const parsed = convertLegacy(source);
  assert.equal(core.balance(parsed.state, '100001'), -99); assert.equal(core.availableBalance(parsed.state, '100001'), -100);
  source.transactions.bad = { studentCode: '100001', type: 'deposit', amount: 'invalid' };
  assert.equal(convertLegacy(source).issues.length, 1);
});
test('Unrelated schema without studentCode stays ignored and is preserved through member edits', () => {
  const source = clone(fixture);
  source.transactions.other = { amount: 98765, category: 'other', createdAt: '2026-01-01', date: '2026-01-01', memberId: '100001', name: 'Other app', note: 'retain', type: 'deposit' };
  const before = convertLegacy(source);
  assert.equal(before.issues.length, 0);
  assert.equal(before.state.transactions.other, undefined);
  assert.equal(core.balance(before.state, '100001'), core.balance(convertLegacy(fixture).state, '100001'));
  const change = core.applyMutation(before.state, { action: 'member.save', idempotencyKey: 'unrelated-edit', code: '100001', nick: 'Updated', name: 'Updated Name' });
  assert.deepEqual(mergeMutation(source, before, change.state).transactions.other, source.transactions.other);
  source.transactions.malformed = { studentCode: '100001', type: 'deposit', amount: 'invalid' };
  assert.equal(convertLegacy(source).issues.length, 1);
});
test('Old interest month uses Bangkok date and is explicitly an inferred recording month', () => {
  const source = clone(fixture);
  source.transactions.c.date = '2026-01-31T18:00:00.000Z';
  const { state } = convertLegacy(source);
  assert.equal(state.transactions.c.period, '2026-02');
  assert.equal(state.interestRuns['2026-02'].inferred, true);
  assert.equal(state.interestRuns['2026-02'].periodLabel, 'อ้างอิงวันที่บันทึก');
});

async function browserChecks() {
  const listeners = new Map(); let serverRoot = clone(fixture), transactionCalls = 0, getCalls = 0, denied = false;
  const source = fs.readFileSync(require('node:path').resolve(__dirname,'../legacy-service.js'), 'utf8').replaceAll('import(base +', 'testImport(base +');
  const snap = value => ({ val: () => clone(value) });
  const sdk = {
    initializeApp: () => ({}), getDatabase: () => ({}), ref: (db, path = '') => path,
    onValue: (path, cb, reject) => { listeners.set(path, { cb, reject }); return () => listeners.delete(path); },
    get: async path => { getCalls++; assert.equal(path, ''); if (denied) throw Object.assign(new Error('denied'), { code: 'PERMISSION_DENIED' }); return snap(serverRoot); },
    runTransaction: async (path, updater, options) => {
      transactionCalls++; assert.equal(path, ''); assert.equal(options.applyLocally, false);
      serverRoot = updater(clone(serverRoot));
      return { committed: true, snapshot: snap(serverRoot) };
    }
  };
  const window = { TaeCore: core, TAEBANK_CONFIG: { mode: 'legacy', firebase: { apiKey: 'fixture', projectId: 'fixture', databaseURL: 'fixture', appId: 'fixture' }, legacy: { adminPin: 'fixture-pin', adminMasterKey: 'fixture-key' } },
    navigator: { onLine: true }, crypto, console, setTimeout, clearTimeout, addEventListener() {} };
  vm.runInNewContext(source, { window, console, testImport: async () => sdk });
  const service = window.TaeLegacyService;
  const emit = (path, value) => listeners.get(path).cb(snap(value));
  await service.init();
  assert.equal(transactionCalls, 0); assert.equal(getCalls, 0);
  assert.deepEqual([...listeners.keys()].sort(), ['.info/connected', 'members', 'taebankMeta', 'transactions']);
  emit('.info/connected', true); emit('members', fixture.members);
  let loginDone = false;
  const memberLogin = service.signIn({ accountCode: '100001' }).then(value => { loginDone = true; return value; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(loginDone, false); assert.equal(service.getSnapshot().dataReady, false);
  emit('transactions', fixture.transactions); await new Promise(resolve => setImmediate(resolve));
  assert.equal(loginDone, false);
  listeners.get('taebankMeta').reject({ code: 'PERMISSION_DENIED' });
  const member = await memberLogin;
  assert.equal(member.accountCode, '100001'); assert.equal(service.getSnapshot().connection, 'online');
  assert.equal(service.getSnapshot().dataReady, true);
  assert.deepEqual(Object.keys(service.getSnapshot().state.members), ['100001']);
  assert.deepEqual(Object.keys(service.getSnapshot().state.transactions), ['a', 'b', 'c']);
  assert.deepEqual(Object.keys(service.getSnapshot().state.legacyBaseBalances), ['100001']);
  assert.equal(transactionCalls, 0); assert.equal(getCalls, 0);
  passed++; console.log('PASS SDK read-only startup, both base snapshots plus optional metadata readiness, filtered member snapshot');
  await service.signOut();
  await service.signIn({ accountCode: '200002' }); assert.equal(service.getSnapshot().session.accountCode, '100002');
  await service.signOut(); await assert.rejects(service.signIn({ adminPin: 'fixture-pin', adminMasterKey: 'wrong' }), /ไม่ถูกต้อง/);
  await service.signIn({ adminPin: 'fixture-pin', adminMasterKey: 'fixture-key' });
  assert.equal(service.getSnapshot().session.role, 'admin');
  const exported = JSON.parse(service.exportData()); assert.deepEqual(exported.transactions, fixture.transactions);
  assert.equal(exported.members['old-member-key'].pbLine, 25);
  await assert.rejects(service.resetDemo(), /ไม่สามารถรีเซ็ต/);
  passed++; console.log('PASS Existing member-code alias, two admin codes, lossless raw export, no real-data reset');
  const command = { action: 'transact', idempotencyKey: 'live-fixture-only', code: '100001', type: 'withdraw', amountSatang: 100, note: 'fixture' };
  denied = true; await assert.rejects(service.mutate(command), /ยังไม่ถูกบันทึก/);
  assert.equal(transactionCalls, 0); assert.deepEqual(serverRoot, fixture);
  denied = false; const result = await service.mutate(command);
  assert.equal(result.balanceSatang, 9901); assert.equal(getCalls, 2); assert.equal(transactionCalls, 1);
  assert.deepEqual(clone(serverRoot.anotherApp), fixture.anotherApp);
  assert.equal(serverRoot.transactions[result.transactionId].studentCode, 'old-member-key');
  const repeat = await service.mutate(command); assert.equal(repeat.transactionId, result.transactionId);
  assert.equal(Object.keys(serverRoot.transactions).length, 5);
  passed++; console.log('PASS Complete-root permission read before atomic transaction, no unsafe fallback, original keys, idempotent retry');
  emit('.info/connected', false); await assert.rejects(service.mutate({ ...command, idempotencyKey: 'offline' }), /ออนไลน์/);
  emit('.info/connected', true);
  listeners.get('members').reject({ code: 'PERMISSION_DENIED' }); emit('transactions', serverRoot.transactions);
  assert.equal(service.getSnapshot().dataReady, false); assert.equal(service.getSnapshot().connection, 'offline');
  emit('members', serverRoot.members); assert.equal(service.getSnapshot().dataReady, true);
  await service.signOut(); assert.equal(Object.keys(service.getSnapshot().state.members).length, 0);
  passed++; console.log('PASS Offline mutation rejection, independent read failure recovery, sign-out privacy');
  console.log('PASS', passed, 'legacy adapter checks; all SDK operations used offline mocks');
}
browserChecks().catch(cause => { console.error(cause); process.exitCode = 1; });
