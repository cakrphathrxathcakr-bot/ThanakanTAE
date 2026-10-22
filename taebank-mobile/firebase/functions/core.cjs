/* TaeBank ledger: shared by the browser demo and the trusted server. */
(function (root) {
  'use strict';

  const TABLES = ['members', 'transactions', 'interestRuns', 'importRuns', 'printJobs', 'requests', 'audit'];
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
  const clone = value => JSON.parse(JSON.stringify(value));
  function put(object, key, value) {
    Object.defineProperty(object, key, { value, enumerable: true, configurable: true, writable: true });
    return value;
  }
  function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
  function requireThat(condition, code, message) { if (!condition) fail(code, message); }
  function text(value, max, label, optional) {
    requireThat(value == null || typeof value === 'string', 'INVALID_TEXT', `${label}ต้องเป็นข้อความ`);
    const result = (value || '').trim();
    requireThat((optional || result.length > 0) && result.length <= max, 'INVALID_TEXT', `${label}ไม่ถูกต้อง (ไม่เกิน ${max} ตัวอักษร)`);
    return result;
  }
  function accountCode(value) {
    const code = typeof value === 'number' ? String(value) : value;
    requireThat(typeof code === 'string' && /^\d{6}$/.test(code), 'INVALID_CODE', 'เลขบัญชีต้องเป็นตัวเลข 6 หลัก');
    return code;
  }
  function satang(value, allowZero) {
    requireThat(Number.isSafeInteger(value) && (allowZero ? value >= 0 : value > 0), 'INVALID_AMOUNT', allowZero ? 'จำนวนเงินต้องเป็นจำนวนเต็มสตางค์ตั้งแต่ 0 ขึ้นไป' : 'จำนวนเงินต้องเป็นจำนวนเต็มสตางค์และมากกว่า 0');
    return value;
  }
  function safeAdd(a, b) {
    const result = a + b;
    requireThat(Number.isSafeInteger(result), 'AMOUNT_OVERFLOW', 'ยอดเงินเกินขอบเขตที่ระบบรองรับ');
    return result;
  }
  function moneyToSatang(raw) {
    requireThat(typeof raw === 'string' || typeof raw === 'number', 'INVALID_AMOUNT', 'กรุณาระบุจำนวนเงินให้ถูกต้อง');
    const value = String(raw).trim();
    requireThat(/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(value), 'INVALID_AMOUNT', 'ระบุจำนวนเงินมากกว่า 0 และทศนิยมไม่เกิน 2 ตำแหน่ง');
    const parts = value.replace(/,/g, '').split('.');
    const result = BigInt(parts[0]) * 100n + BigInt((parts[1] || '').padEnd(2, '0'));
    requireThat(result > 0n && result <= BigInt(Number.MAX_SAFE_INTEGER), 'INVALID_AMOUNT', 'จำนวนเงินต้องมากกว่า 0 และอยู่ในขอบเขตที่ระบบรองรับ');
    return Number(result);
  }
  function empty() {
    const state = { schemaVersion: 2 };
    TABLES.forEach(table => { state[table] = {}; });
    return state;
  }
  function assertState(state) {
    requireThat(state && state.schemaVersion === 2, 'INVALID_STATE', 'รูปแบบข้อมูลไม่รองรับ กรุณาสำรองข้อมูลก่อนย้ายระบบ');
    TABLES.forEach(table => requireThat(state[table] && typeof state[table] === 'object' && !Array.isArray(state[table]), 'INVALID_STATE', `ข้อมูล ${table} ไม่ถูกต้อง`));
  }
  function ledgerBalance(state, inputCode, baselineField) {
    const code = accountCode(inputCode);
    let total = 0;
    let originalIds;
    if (own(state.legacyBaseBalances, code)) {
      // Runtime-only totals preserve the precision of old ledger amounts. Summing
      // rounded historical rows can otherwise change the original account total.
      const baseline = state.legacyBaseBalances[code];
      requireThat(baseline && Number.isSafeInteger(baseline.amountSatang) && Number.isSafeInteger(baseline.spendableSatang) && Array.isArray(baseline.transactionIds) && baseline.transactionIds.every(id => typeof id === 'string'), 'INVALID_STATE', 'ยอดยกมาจากระบบเดิมไม่ถูกต้อง');
      total = baseline[baselineField];
      originalIds = new Set(baseline.transactionIds);
    }
    Object.entries(state.transactions || {}).forEach(([transactionId, tx]) => {
      if (tx.studentCode !== code) return;
      satang(tx.amountSatang, tx.legacyAmount === true);
      requireThat(tx.type === 'deposit' || tx.type === 'withdraw', 'INVALID_STATE', 'ประเภทรายการบัญชีไม่ถูกต้อง');
      if (originalIds && originalIds.has(transactionId)) return;
      total = safeAdd(total, tx.type === 'deposit' ? tx.amountSatang : -tx.amountSatang);
    });
    return total;
  }
  function balance(state, inputCode) { return ledgerBalance(state, inputCode, 'amountSatang'); }
  function availableBalance(state, inputCode) { return ledgerBalance(state, inputCode, 'spendableSatang'); }
  function stable(value) {
    if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
    return JSON.stringify(value);
  }
  function nextPosition(page, line, count) {
    requireThat(Number.isSafeInteger(page) && page >= 1 && Number.isSafeInteger(line) && line >= 1 && line <= 24, 'INVALID_PRINT_POSITION', 'ตำแหน่งสมุดต้องเป็นหน้าตั้งแต่ 1 และบรรทัด 1–24');
    const offset = safeAdd(line - 1, count);
    const nextPage = safeAdd(page, Math.floor(offset / 24));
    return { page: nextPage, line: offset % 24 + 1 };
  }

  function applyMutation(original, command, context) {
    assertState(original);
    context = context || {};
    requireThat(command && typeof command === 'object' && !Array.isArray(command), 'INVALID_COMMAND', 'คำสั่งไม่ถูกต้อง');
    const key = text(command.idempotencyKey, 200, 'รหัสคำขอ');
    const payload = stable(command);
    if (own(original.requests, key)) {
      requireThat(original.requests[key].payload === payload, 'IDEMPOTENCY_CONFLICT', 'รหัสคำขอนี้ถูกใช้กับข้อมูลอื่นแล้ว');
      return { state: clone(original), result: clone(original.requests[key].result) };
    }
    const state = clone(original);
    const now = context.now || new Date().toISOString();
    requireThat(typeof now === 'string' && /^\d{4}-\d\d-\d\dT/.test(now) && Number.isFinite(Date.parse(now)), 'INVALID_DATE', 'วันเวลารายการไม่ถูกต้อง');
    const actor = text(context.actor || 'demo', 200, 'ผู้ทำรายการ');
    let sequence = 0;
    function id(prefix, table) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const raw = context.idFactory ? context.idFactory() : (root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
        const generated = prefix + '_' + String(raw) + '_' + (++sequence);
        requireThat(generated.length < 250 && !/[.#$\[\]\/]/.test(generated), 'INVALID_ID', 'รหัสรายการไม่ถูกต้อง');
        if (!own(state[table], generated)) return generated;
      }
      fail('ID_COLLISION', 'ไม่สามารถสร้างรหัสรายการ กรุณาลองใหม่');
    }
    function member(code, active) {
      requireThat(own(state.members, code), 'MEMBER_NOT_FOUND', 'ไม่พบบัญชีนี้');
      const value = state.members[code];
      requireThat(!active || value.status === 'active', 'MEMBER_ARCHIVED', 'บัญชีนี้ถูกปิดแล้ว');
      return value;
    }
    function append(code, type, amount, note, extra) {
      satang(amount, false);
      const before = balance(state, code);
      if (type === 'withdraw') requireThat(availableBalance(state, code) >= amount, 'INSUFFICIENT_FUNDS', 'ยอดเงินไม่เพียงพอสำหรับรายการนี้');
      const after = safeAdd(before, type === 'deposit' ? amount : -amount);
      if (type === 'withdraw') requireThat(after >= 0, 'INSUFFICIENT_FUNDS', 'ยอดเงินไม่เพียงพอสำหรับรายการนี้');
      const transactionId = id('tx', 'transactions');
      put(state.transactions, transactionId, Object.assign({ id: transactionId, studentCode: code, type, amountSatang: amount, createdAt: now, note, actor }, extra || {}));
      return transactionId;
    }
    function makeMember(data) {
      const code = accountCode(data.code);
      const nick = text(data.nick, 48, 'ชื่อเล่น', true);
      const name = text(data.name, 120, 'ชื่อสมาชิก');
      return { code, nick, name, status: 'active', pbPage: 1, pbLine: 1, createdAt: now };
    }
    const action = command.action;
    let result;
    if (action === 'member.save') {
      const incoming = makeMember(command);
      const exists = own(state.members, incoming.code);
      if (exists) Object.assign(state.members[incoming.code], { name: incoming.name, nick: incoming.nick });
      else put(state.members, incoming.code, incoming);
      result = { action, code: incoming.code, created: !exists };
    } else if (action === 'member.archive') {
      const code = accountCode(command.code);
      const existing = member(code, true);
      requireThat(balance(state, code) === 0, 'NONZERO_BALANCE', 'ปิดบัญชีได้เมื่อยอดเงินคงเหลือเป็น 0 เท่านั้น');
      existing.status = 'archived';
      existing.archivedAt = now;
      result = { action, code };
    } else if (action === 'transact') {
      const code = accountCode(command.code);
      member(code, true);
      requireThat(command.type === 'deposit' || command.type === 'withdraw', 'INVALID_TYPE', 'เลือกฝากเงินหรือถอนเงิน');
      const transactionId = append(code, command.type, command.amountSatang, text(command.note, 240, 'หมายเหตุ', true));
      result = { action, code, transactionId, amountSatang: command.amountSatang, balanceSatang: balance(state, code) };
    } else if (action === 'reverse') {
      requireThat(typeof command.transactionId === 'string' && own(state.transactions, command.transactionId), 'TRANSACTION_NOT_FOUND', 'ไม่พบรายการต้นฉบับ');
      const source = state.transactions[command.transactionId];
      member(source.studentCode, true);
      requireThat(!source.reversalOf && !Object.values(state.transactions).some(tx => tx.reversalOf === source.id), 'ALREADY_REVERSED', 'รายการนี้กลับรายการแล้ว หรือเป็นรายการแก้ไข');
      requireThat(source.legacyFractionalSatang !== true, 'LEGACY_FRACTIONAL_AMOUNT', 'รายการเดิมมีเศษต่ำกว่าสตางค์ จึงไม่สามารถกลับรายการโดยไม่เปลี่ยนยอดเดิมได้');
      const reason = text(command.reason, 240, 'เหตุผลการกลับรายการ');
      const transactionId = append(source.studentCode, source.type === 'deposit' ? 'withdraw' : 'deposit', source.amountSatang, reason, { reversalOf: source.id });
      result = { action, code: source.studentCode, transactionId, reversalOf: source.id, balanceSatang: balance(state, source.studentCode) };
    } else if (action === 'interest') {
      requireThat(typeof command.period === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(command.period), 'INVALID_PERIOD', 'รอบดอกเบี้ยต้องเป็น YYYY-MM');
      requireThat(!own(state.interestRuns, command.period), 'INTEREST_ALREADY_RUN', 'รอบเดือนนี้จ่ายดอกเบี้ยแล้ว');
      const rateText = String(command.ratePercent == null ? '' : command.ratePercent).trim();
      requireThat(/^\d+(?:\.\d{1,6})?$/.test(rateText), 'INVALID_RATE', 'อัตราดอกเบี้ยไม่ถูกต้อง (ทศนิยมไม่เกิน 6 ตำแหน่ง)');
      const rate = Number(rateText);
      requireThat(Number.isFinite(rate) && rate > 0 && rate <= 100, 'INVALID_RATE', 'อัตราดอกเบี้ยต้องมากกว่า 0 และไม่เกิน 100%');
      const parts = rateText.split('.');
      const decimals = (parts[1] || '').length;
      const numerator = BigInt(parts[0] + (parts[1] || ''));
      const denominator = 100n * (10n ** BigInt(decimals));
      const note = text(command.note || `ดอกเบี้ยรอบ ${command.period}`, 240, 'หมายเหตุ', true);
      const transactionIds = [];
      let totalSatang = 0;
      Object.values(state.members).filter(value => value.status === 'active').forEach(value => {
        const current = balance(state, value.code);
        if (current <= 0) return;
        // Exact half-up rounding matches Math.round for positive values, without floating-point drift.
        const rounded = (BigInt(current) * numerator * 2n + denominator) / (2n * denominator);
        requireThat(rounded <= BigInt(Number.MAX_SAFE_INTEGER), 'AMOUNT_OVERFLOW', 'ดอกเบี้ยเกินขอบเขตที่ระบบรองรับ');
        const amount = Number(rounded);
        if (!amount) return;
        totalSatang = safeAdd(totalSatang, amount);
        transactionIds.push(append(value.code, 'deposit', amount, note, { isInterest: true, period: command.period }));
      });
      put(state.interestRuns, command.period, { period: command.period, ratePercent: rate, createdAt: now, actor, transactionIds, totalSatang });
      result = { action, period: command.period, ratePercent: rate, count: transactionIds.length, totalSatang, transactionIds };
    } else if (action === 'import') {
      const batchId = text(command.batchId, 200, 'รหัสไฟล์นำเข้า');
      requireThat(!own(state.importRuns, batchId), 'IMPORT_ALREADY_RUN', 'ไฟล์ชุดนี้ถูกนำเข้าแล้ว');
      requireThat(Array.isArray(command.rows) && command.rows.length > 0 && command.rows.length <= 10000, 'INVALID_IMPORT', 'ไฟล์นำเข้าต้องมีข้อมูล 1–10,000 บัญชี');
      const seen = new Set();
      const incoming = command.rows.map(row => {
        requireThat(row && typeof row === 'object', 'INVALID_IMPORT', 'ข้อมูลนำเข้าไม่ถูกต้อง');
        const value = makeMember(row);
        satang(row.balanceSatang, true);
        requireThat(!seen.has(value.code), 'DUPLICATE_IMPORT_CODE', `เลขบัญชี ${value.code} ซ้ำในไฟล์`);
        requireThat(!own(state.members, value.code), 'MEMBER_ALREADY_EXISTS', `เลขบัญชี ${value.code} มีอยู่แล้ว นำเข้าได้เฉพาะบัญชีใหม่`);
        seen.add(value.code);
        return { member: value, amount: row.balanceSatang };
      });
      const transactionIds = [];
      let totalSatang = 0;
      incoming.forEach(row => {
        put(state.members, row.member.code, row.member);
        totalSatang = safeAdd(totalSatang, row.amount);
        if (row.amount > 0) transactionIds.push(append(row.member.code, 'deposit', row.amount, 'ยอดยกมาจากการนำเข้า', { batchId }));
      });
      put(state.importRuns, batchId, { batchId, createdAt: now, actor, count: incoming.length, totalSatang, transactionIds });
      result = { action, batchId, count: incoming.length, totalSatang, transactionIds };
    } else if (action === 'print.confirm') {
      const code = accountCode(command.code);
      const existing = member(code, false);
      requireThat(Array.isArray(command.transactionIds) && command.transactionIds.length > 0, 'INVALID_PRINT', 'เลือกรายการที่พิมพ์สำเร็จ');
      requireThat(new Set(command.transactionIds).size === command.transactionIds.length, 'DUPLICATE_PRINT', 'มีรายการพิมพ์ซ้ำ');
      requireThat(command.page === existing.pbPage && command.line === existing.pbLine, 'STALE_PRINT_POSITION', 'ตำแหน่งสมุดเปลี่ยนไปแล้ว กรุณาเปิดตัวอย่างพิมพ์ใหม่');
      const sortedPending = Object.values(state.transactions).filter(tx => tx.studentCode === code && !tx.printedAt).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
      command.transactionIds.forEach((transactionId, index) => {
        requireThat(typeof transactionId === 'string' && own(state.transactions, transactionId), 'TRANSACTION_NOT_FOUND', 'ไม่พบรายการที่ต้องการพิมพ์');
        const tx = state.transactions[transactionId];
        requireThat(tx.studentCode === code, 'INVALID_PRINT_OWNER', 'รายการพิมพ์ไม่ตรงกับบัญชี');
        requireThat(!tx.printedAt, 'ALREADY_PRINTED', 'รายการนี้ได้รับการยืนยันพิมพ์แล้ว');
        requireThat(sortedPending[index] && sortedPending[index].id === transactionId, 'PRINT_OUT_OF_ORDER', 'ต้องพิมพ์รายการตามลำดับจากรายการเก่าสุด');
      });
      const next = nextPosition(command.page, command.line, command.transactionIds.length);
      requireThat(command.nextPage == null || command.nextPage === next.page, 'INVALID_PRINT_POSITION', 'หน้าถัดไปไม่ตรงกับจำนวนรายการ');
      requireThat(command.nextLine == null || command.nextLine === next.line, 'INVALID_PRINT_POSITION', 'บรรทัดถัดไปไม่ตรงกับจำนวนรายการ');
      const printJobId = id('print', 'printJobs');
      command.transactionIds.forEach((transactionId, index) => {
        const position = nextPosition(command.page, command.line, index);
        Object.assign(state.transactions[transactionId], { printedAt: now, printJobId, printedPage: position.page, printedLine: position.line });
      });
      existing.pbPage = next.page;
      existing.pbLine = next.line;
      put(state.printJobs, printJobId, { id: printJobId, code, transactionIds: command.transactionIds.slice(), page: command.page, line: command.line, nextPage: next.page, nextLine: next.line, confirmedAt: now, actor });
      result = { action, code, printJobId, count: command.transactionIds.length, nextPage: next.page, nextLine: next.line };
    } else fail('INVALID_ACTION', 'ไม่รู้จักคำสั่งนี้');

    const auditId = id('audit', 'audit');
    put(state.audit, auditId, { id: auditId, action, createdAt: now, actor, requestId: key, result: clone(result) });
    put(state.requests, key, { payload, result: clone(result), createdAt: now, actor });
    return { state, result };
  }

  function createDemo() {
    const state = empty();
    const people = [
      ['100001', 'พิม', 'พิมพ์ชนก แสงสวัสดิ์'],
      ['100002', 'ต้น', 'ธนกร ศรีสุข'],
      ['100003', 'มิน', 'มินตรา วัฒนกุล'],
      ['100004', 'ภูมิ', 'ภูมินทร์ ใจดี'],
      ['100005', 'น้ำ', 'ณัฐธิดา รุ่งเรือง']
    ];
    people.forEach(([code, nick, name]) => { state.members[code] = { code, nick, name, status: 'active', pbPage: 1, pbLine: 1, createdAt: '2026-01-05T02:00:00.000Z' }; });
    const rows = [
      ['100001', 'deposit', 12000000, '2026-09-01T02:00:00.000Z', 'เงินออมเริ่มต้น'],
      ['100001', 'deposit', 500000, '2026-10-03T03:15:00.000Z', 'เงินออมประจำเดือน'],
      ['100001', 'withdraw', 240000, '2026-10-08T06:30:00.000Z', 'ซื้ออุปกรณ์การเรียน'],
      ['100001', 'deposit', 85000, '2026-10-12T01:45:00.000Z', 'รายได้เสริม'],
      ['100001', 'deposit', 500000, '2026-10-21T08:20:00.000Z', 'เงินออมรายสัปดาห์'],
      ['100001', 'deposit', 75, '2026-10-22T02:00:00.000Z', 'เงินออมเพิ่ม'],
      ['100002', 'deposit', 8620000, '2026-10-05T02:00:00.000Z', 'เงินออมเริ่มต้น'],
      ['100002', 'withdraw', 400000, '2026-10-20T05:00:00.000Z', 'ค่าใช้จ่ายส่วนตัว'],
      ['100003', 'deposit', 4520750, '2026-10-10T03:00:00.000Z', 'เงินออมเริ่มต้น'],
      ['100004', 'deposit', 3750000, '2026-10-14T04:00:00.000Z', 'เงินออมเริ่มต้น'],
      ['100005', 'deposit', 2140500, '2026-10-18T02:30:00.000Z', 'เงินออมเริ่มต้น'],
      ['100005', 'deposit', 200000, '2026-10-21T07:00:00.000Z', 'เงินออมรายสัปดาห์']
    ];
    rows.forEach(([studentCode, type, amountSatang, createdAt, note], index) => {
      const id = 'demo_' + String(index + 1).padStart(3, '0');
      state.transactions[id] = { id, studentCode, type, amountSatang, createdAt, note, actor: 'บัญชีตัวอย่าง' };
    });
    return state;
  }

  const api = { createDemo, moneyToSatang, balance, availableBalance, applyMutation, nextPosition };
  root.TaeCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
