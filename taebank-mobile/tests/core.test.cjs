'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../core.js');
let counter = 0;
const context = { now: '2026-10-22T11:30:00.000Z', actor: 'test-admin', idFactory: () => String(++counter) };
const run = (state, command) => core.applyMutation(state, command, context);
const command = (action, data) => ({ action, idempotencyKey: `request-${++counter}`, ...data });
const throwsCode = (fn, code) => assert.throws(fn, error => error.code === code);

test('demo has five Thai accounts and exact main balance', () => {
  const state = core.createDemo();
  assert.equal(Object.keys(state.members).length, 5);
  assert.equal(core.balance(state, '100001'), 12845075);
});

test('strict money parser accepts legal grouping and two decimals without float drift', () => {
  assert.equal(core.moneyToSatang('128,450.75'), 12845075);
  assert.equal(core.moneyToSatang(' 0.01 '), 1);
  assert.equal(core.moneyToSatang('10.1'), 1010);
  assert.equal(core.moneyToSatang(42), 4200);
  for (const value of ['0', '-1', '1.001', '1e3', '12,34', '1,000,00', 'Infinity', '', '.5', '1.', ' 1 000', '90071992547409.92', NaN, Infinity]) {
    throwsCode(() => core.moneyToSatang(value), 'INVALID_AMOUNT');
  }
});

test('overdraft and unsafe integer requests leave original untouched', () => {
  const original = core.createDemo();
  const snapshot = JSON.stringify(original);
  throwsCode(() => run(original, command('transact', { code: '100001', type: 'withdraw', amountSatang: 12845076 })), 'INSUFFICIENT_FUNDS');
  throwsCode(() => run(original, command('transact', { code: '100001', type: 'deposit', amountSatang: 10.5 })), 'INVALID_AMOUNT');
  throwsCode(() => run(original, command('transact', { code: '100001', type: 'deposit', amountSatang: Number.MAX_SAFE_INTEGER })), 'AMOUNT_OVERFLOW');
  assert.equal(JSON.stringify(original), snapshot);
});

test('idempotent retries apply once; changed payload conflicts even after other activity', () => {
  const original = core.createDemo();
  const tx = command('transact', { code: '100001', type: 'deposit', amountSatang: 25001, note: 'test' });
  const first = run(original, tx);
  const later = run(first.state, command('transact', { code: '100001', type: 'withdraw', amountSatang: 100 }));
  const retry = run(later.state, tx);
  assert.deepEqual(retry.result, first.result);
  assert.equal(core.balance(retry.state, '100001'), 12869976);
  assert.deepEqual(retry.state, later.state);
  throwsCode(() => run(retry.state, { ...tx, amountSatang: 1 }), 'IDEMPOTENCY_CONFLICT');
  assert.equal(core.balance(original, '100001'), 12845075);
});

test('imports validate entire batch before adding members and reject duplicates', () => {
  const state = core.createDemo();
  const snapshot = JSON.stringify(state);
  const row = { code: '200001', name: 'ทดสอบ ระบบ', nick: 'ทดสอบ', balanceSatang: 1000 };
  throwsCode(() => run(state, command('import', { batchId: 'a', rows: [row, { ...row }] })), 'DUPLICATE_IMPORT_CODE');
  throwsCode(() => run(state, command('import', { batchId: 'b', rows: [row, { ...row, code: '100001' }] })), 'MEMBER_ALREADY_EXISTS');
  throwsCode(() => run(state, command('import', { batchId: 'c', rows: [row, { ...row, code: '200002', balanceSatang: -1 }] })), 'INVALID_AMOUNT');
  assert.equal(JSON.stringify(state), snapshot);
  const imported = run(state, command('import', { batchId: 'valid-file-fingerprint', rows: [row, { ...row, code: '200002', balanceSatang: 0 }] }));
  assert.equal(imported.result.count, 2);
  assert.equal(core.balance(imported.state, '200001'), 1000);
  assert.equal(core.balance(imported.state, '200002'), 0);
  throwsCode(() => run(imported.state, command('import', { batchId: 'valid-file-fingerprint', rows: [{ ...row, code: '200003' }] })), 'IMPORT_ALREADY_RUN');
});

test('interest rounds half-up exactly, records the period, and cannot run twice', () => {
  let state = core.createDemo();
  state = run(state, command('import', { batchId: 'rounding', rows: [
    { code: '200001', name: 'ครึ่งสตางค์', balanceSatang: 50 },
    { code: '200002', name: 'ต่ำกว่าครึ่ง', balanceSatang: 49 }
  ] })).state;
  const cmd = command('interest', { period: '2026-10', ratePercent: '1' });
  const after = run(state, cmd);
  assert.equal(core.balance(after.state, '200001'), 51);
  assert.equal(core.balance(after.state, '200002'), 49);
  assert.equal(core.balance(after.state, '100001'), 12973526);
  assert.ok(after.state.interestRuns['2026-10']);
  assert.deepEqual(run(after.state, cmd).state, after.state);
  throwsCode(() => run(after.state, command('interest', { period: '2026-10', ratePercent: 1 })), 'INTEREST_ALREADY_RUN');
  throwsCode(() => run(state, command('interest', { period: '2026-13', ratePercent: 1 })), 'INVALID_PERIOD');
});

test('nonzero accounts cannot close; empty accounts close and reject new transactions', () => {
  const state = core.createDemo();
  throwsCode(() => run(state, command('member.archive', { code: '100001' })), 'NONZERO_BALANCE');
  const created = run(state, command('member.save', { code: '200001', name: 'บัญชีว่าง', nick: '' })).state;
  const archived = run(created, command('member.archive', { code: '200001' })).state;
  assert.equal(archived.members['200001'].status, 'archived');
  throwsCode(() => run(archived, command('transact', { code: '200001', type: 'deposit', amountSatang: 1 })), 'MEMBER_ARCHIVED');
});

test('reversal preserves original entry, cannot repeat, and still prevents overdraft', () => {
  const state = core.createDemo();
  const reversed = run(state, command('reverse', { transactionId: 'demo_003', reason: 'รายการผิด' }));
  assert.deepEqual(reversed.state.transactions.demo_003, state.transactions.demo_003);
  assert.equal(core.balance(reversed.state, '100001'), 13085075);
  assert.equal(reversed.state.transactions[reversed.result.transactionId].reversalOf, 'demo_003');
  throwsCode(() => run(reversed.state, command('reverse', { transactionId: 'demo_003', reason: 'อีกครั้ง' })), 'ALREADY_REVERSED');
  throwsCode(() => run(reversed.state, command('reverse', { transactionId: reversed.result.transactionId, reason: 'ย้อนซ้ำ' })), 'ALREADY_REVERSED');
  const drained = run(state, command('transact', { code: '100001', type: 'withdraw', amountSatang: 12845075 })).state;
  throwsCode(() => run(drained, command('reverse', { transactionId: 'demo_001', reason: 'แก้ไขยอดยกมา' })), 'INSUFFICIENT_FUNDS');
});

test('printing requires ownership, chronological order and confirmation, advances 24-row pages', () => {
  const state = core.createDemo();
  const snapshot = JSON.stringify(state);
  throwsCode(() => run(state, command('print.confirm', { code: '100001', transactionIds: ['demo_007'], page: 1, line: 1 })), 'INVALID_PRINT_OWNER');
  throwsCode(() => run(state, command('print.confirm', { code: '100001', transactionIds: ['demo_002'], page: 1, line: 1 })), 'PRINT_OUT_OF_ORDER');
  throwsCode(() => run(state, command('print.confirm', { code: '100001', transactionIds: ['demo_001', 'demo_001'], page: 1, line: 1 })), 'DUPLICATE_PRINT');
  assert.equal(JSON.stringify(state), snapshot);
  state.members['100001'].pbLine = 23;
  const first = run(state, command('print.confirm', { code: '100001', transactionIds: ['demo_001', 'demo_002', 'demo_003'], page: 1, line: 23, nextPage: 2, nextLine: 2 }));
  assert.equal(first.state.members['100001'].pbPage, 2);
  assert.equal(first.state.members['100001'].pbLine, 2);
  assert.equal(first.state.transactions.demo_003.printedPage, 2);
  assert.equal(first.state.transactions.demo_003.printedLine, 1);
  throwsCode(() => run(first.state, command('print.confirm', { code: '100001', transactionIds: ['demo_001'], page: 2, line: 2 })), 'ALREADY_PRINTED');
  throwsCode(() => run(first.state, command('print.confirm', { code: '100001', transactionIds: ['demo_004'], page: 1, line: 23 })), 'STALE_PRINT_POSITION');
});

test('untrusted names remain inert data and special request keys cannot alter prototypes', () => {
  const state = core.createDemo();
  const created = run(state, { action: 'member.save', code: '200001', name: '<img src=x onerror=alert(1)>', idempotencyKey: '__proto__' });
  assert.equal(created.state.members['200001'].name, '<img src=x onerror=alert(1)>');
  assert.ok(Object.hasOwn(created.state.requests, '__proto__'));
  assert.equal(Object.getPrototypeOf(created.state.requests), Object.prototype);
  assert.deepEqual(run(created.state, { action: 'member.save', code: '200001', name: '<img src=x onerror=alert(1)>', idempotencyKey: '__proto__' }).result, created.result);
});

function historicalState(amounts, amountSatang, spendableSatang) {
  const state = core.createDemo();
  state.transactions = {};
  const transactionIds = amounts.map((amount, index) => {
    const id = `legacy_${index}`;
    state.transactions[id] = { id, studentCode: '100001', type: 'deposit', amountSatang: amount, createdAt: '2020-01-01T00:00:00.000Z', legacyAmount: true, legacyFractionalSatang: true };
    return id;
  });
  state.legacyBaseBalances = { '100001': { amountSatang, spendableSatang, transactionIds } };
  return state;
}

test('historical baseline rounds the aggregate once and only adds newly appended cents', () => {
  // Two original deposits of 0.005 baht total 0.01 baht, although each
  // normalized row rounds to one satang for display.
  const state = historicalState([1, 1], 1, 1);
  assert.equal(core.balance(state, '100001'), 1);
  assert.equal(core.availableBalance(state, '100001'), 1);
  assert.equal(Object.values(state.transactions).reduce((total, tx) => total + tx.amountSatang, 0), 2);
  const originalRows = JSON.stringify(state.transactions);
  const deposit = run(state, command('transact', { code: '100001', type: 'deposit', amountSatang: 7 }));
  assert.equal(deposit.result.balanceSatang, 8);
  assert.equal(core.availableBalance(deposit.state, '100001'), 8);
  const withdrawal = run(deposit.state, command('transact', { code: '100001', type: 'withdraw', amountSatang: 8 }));
  assert.equal(core.balance(withdrawal.state, '100001'), 0);
  assert.equal(core.availableBalance(withdrawal.state, '100001'), 0);
  assert.equal(JSON.stringify(state.transactions), originalRows);
  assert.deepEqual(withdrawal.state.transactions.legacy_0, state.transactions.legacy_0);
  assert.deepEqual(withdrawal.state.transactions.legacy_1, state.transactions.legacy_1);
  assert.deepEqual(withdrawal.state.legacyBaseBalances, state.legacyBaseBalances);
});

test('historical subcent rows may round to zero while new zero amounts stay invalid', () => {
  const state = historicalState([0], 0, 0);
  assert.equal(core.balance(state, '100001'), 0);
  delete state.legacyBaseBalances;
  assert.equal(core.balance(state, '100001'), 0);
  throwsCode(() => run(state, command('transact', { code: '100001', type: 'deposit', amountSatang: 0, legacyAmount: true })), 'INVALID_AMOUNT');
  state.transactions.legacy_0.legacyAmount = false;
  throwsCode(() => core.balance(state, '100001'), 'INVALID_AMOUNT');
});

test('withdrawals cannot spend the fraction rounded up in the displayed historical total', () => {
  // An original 0.005 baht balance displays one satang but has no complete
  // satang available to withdraw.
  const state = historicalState([1], 1, 0);
  const snapshot = JSON.stringify(state);
  assert.equal(core.balance(state, '100001'), 1);
  assert.equal(core.availableBalance(state, '100001'), 0);
  throwsCode(() => run(state, command('transact', { code: '100001', type: 'withdraw', amountSatang: 1 })), 'INSUFFICIENT_FUNDS');
  assert.equal(JSON.stringify(state), snapshot);
  const added = run(state, command('transact', { code: '100001', type: 'deposit', amountSatang: 1 }));
  assert.equal(core.balance(added.state, '100001'), 2);
  assert.equal(core.availableBalance(added.state, '100001'), 1);
  const withdrawn = run(added.state, command('transact', { code: '100001', type: 'withdraw', amountSatang: 1 }));
  assert.equal(withdrawn.result.balanceSatang, 1);
  assert.equal(core.availableBalance(withdrawn.state, '100001'), 0);
});

test('fractional historical reversals reject without altering original precision', () => {
  const state = historicalState([1], 1, 0);
  const snapshot = JSON.stringify(state);
  assert.throws(() => run(state, command('reverse', { transactionId: 'legacy_0', reason: 'แก้ไขรายการเก่า' })), error => error.code === 'LEGACY_FRACTIONAL_AMOUNT' && error.message.includes('รายการเดิมมีเศษต่ำกว่าสตางค์'));
  assert.equal(JSON.stringify(state), snapshot);
  state.transactions.legacy_0.legacyFractionalSatang = false;
  state.legacyBaseBalances['100001'].spendableSatang = 1;
  const reversed = run(state, command('reverse', { transactionId: 'legacy_0', reason: 'แก้ไขรายการเต็มสตางค์' }));
  assert.equal(core.balance(reversed.state, '100001'), 0);
});

test('negative historical balances remain visible and accept partial repayment deposits', () => {
  const state = historicalState([101], -100, -101);
  state.transactions.legacy_0.type = 'withdraw';
  assert.equal(core.balance(state, '100001'), -100);
  assert.equal(core.availableBalance(state, '100001'), -101);
  throwsCode(() => run(state, command('transact', { code: '100001', type: 'withdraw', amountSatang: 1 })), 'INSUFFICIENT_FUNDS');
  const after = run(state, command('transact', { code: '100001', type: 'deposit', amountSatang: 40 }));
  assert.equal(after.result.balanceSatang, -60);
  assert.equal(core.availableBalance(after.state, '100001'), -61);
});

test('legacy baseline requires safe integer totals and a transaction identifier list', () => {
  for (const patch of [{ amountSatang: 0.5 }, { spendableSatang: NaN }, { transactionIds: 'legacy_0' }, { transactionIds: [1] }]) {
    const state = historicalState([1], 1, 1);
    Object.assign(state.legacyBaseBalances['100001'], patch);
    throwsCode(() => core.balance(state, '100001'), 'INVALID_STATE');
    throwsCode(() => core.availableBalance(state, '100001'), 'INVALID_STATE');
  }
  const demo = core.createDemo();
  assert.equal(core.availableBalance(demo, '100001'), core.balance(demo, '100001'));
});
