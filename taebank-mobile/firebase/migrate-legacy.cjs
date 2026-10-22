/* Offline converter: reads a Firebase export and writes a NEW file. Never contacts Firebase. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const core = require('../core.js');

function convert(source) {
  const legacy = source.bank || source;
  if (legacy.schemaVersion === 2) throw new Error('Input already uses schemaVersion 2. Restore the original backup without converting again.');
  if (!legacy.members || typeof legacy.members !== 'object') throw new Error('Input must contain the original members and transactions collections.');
  const now = new Date().toISOString();
  const state = { schemaVersion: 2, members: {}, transactions: {}, interestRuns: {}, importRuns: {}, printJobs: {}, requests: {}, audit: {} };
  function put(table, key, value) {
    if (!key || /[.#$\[\]\/]/.test(key)) throw new Error('Invalid Firebase key: ' + key);
    Object.defineProperty(table, key, { value, enumerable: true, configurable: true, writable: true });
  }
  for (const [code, member] of Object.entries(legacy.members)) {
    if (!/^\d{6}$/.test(code)) throw new Error('Member code must be 6 digits: ' + code);
    if (!member || !String(member.name || '').trim()) throw new Error('Missing full name for member ' + code);
    let page = Number(member.pbPage || 1), line = Number(member.pbLine || 1);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(line) || line < 1) throw new Error('Invalid passbook position: ' + code);
    if (line > 24) { page += Math.floor((line - 1) / 24); line = (line - 1) % 24 + 1; }
    put(state.members, code, { code, name: String(member.name).trim(), nick: String(member.nick || '').trim(),
      status: 'active', pbPage: page, pbLine: line, createdAt: now, migratedAt: now });
  }
  for (const [id, transaction] of Object.entries(legacy.transactions || {})) {
    const code = String(transaction.studentCode || '');
    if (!Object.prototype.hasOwnProperty.call(state.members, code)) throw new Error('Transaction ' + id + ' points to a missing member: ' + code);
    if (!['deposit', 'withdraw'].includes(transaction.type)) throw new Error('Unknown transaction type: ' + id);
    const timestamp = new Date(transaction.date);
    if (!transaction.date || !Number.isFinite(timestamp.getTime())) throw new Error('Invalid transaction date: ' + id);
    const tx = { id, studentCode: code, type: transaction.type, amountSatang: core.moneyToSatang(String(transaction.amount)),
      createdAt: timestamp.toISOString(), note: String(transaction.note || 'ย้ายจากระบบเดิม'), actor: 'legacy-migration', migratedAt: now };
    if (transaction.printed === true) { tx.printedAt = tx.createdAt; tx.legacyPrinted = true; }
    if (transaction.isInterest === true) {
      tx.isInterest = true;
      // Legacy code paid interest with client UTC time; conservatively reserve both UTC and Bangkok months.
      const utcPeriod = tx.createdAt.slice(0, 7);
      const localPeriod = new Date(timestamp.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 7);
      tx.period = localPeriod;
      for (const period of new Set([utcPeriod, localPeriod])) {
        if (!state.interestRuns[period]) put(state.interestRuns, period, { period, legacy: true, createdAt: now, actor: 'legacy-migration', transactionIds: [], totalSatang: 0 });
        state.interestRuns[period].transactionIds.push(id);
        state.interestRuns[period].totalSatang += tx.amountSatang;
      }
    }
    put(state.transactions, id, tx);
  }
  let totalSatang = 0;
  for (const code of Object.keys(state.members)) {
    const balance = core.balance(state, code);
    if (balance < 0) throw new Error('Negative legacy balance: ' + code + '. Reconcile the original ledger before migrating.');
    totalSatang += balance;
    if (!Number.isSafeInteger(totalSatang)) throw new Error('Total balance overflow');
  }
  put(state.audit, 'legacy_migration', { action: 'legacy.migration', createdAt: now, actor: 'offline-converter',
    memberCount: Object.keys(state.members).length, transactionCount: Object.keys(state.transactions).length, totalSatang });
  return state;
}

if (require.main === module) {
  try {
    const [input, output] = process.argv.slice(2);
    if (!input || !output) throw new Error('Usage: node migrate-legacy.cjs ORIGINAL-BACKUP.json NEW-bank-v2.json');
    if (path.resolve(input) === path.resolve(output)) throw new Error('Output must differ from the original backup');
    const state = convert(JSON.parse(fs.readFileSync(input, 'utf8')));
    fs.writeFileSync(output, JSON.stringify(state, null, 2), { flag: 'wx', encoding: 'utf8' });
    console.log('Created offline migration file. Members: ' + Object.keys(state.members).length + ', transactions: ' + Object.keys(state.transactions).length);
    console.log('Original backup was not changed. Review balances before importing into the /bank node of an empty test database.');
  } catch (cause) { console.error(cause.message); process.exitCode = 1; }
}
module.exports = { convert };
