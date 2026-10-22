/* Direct adapter for the original TaeBank database. Loading this file never writes data. */
(function (global) {
  'use strict';
  const TABLES = ['interestRuns', 'importRuns', 'printJobs', 'requests', 'audit'];
  const subscribers = new Set();
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
  const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const put = (object, key, value) => Object.defineProperty(object, key, { value, enumerable: true, writable: true, configurable: true });
  const error = (code, message) => Object.assign(new Error(message), { code });
  const safeKey = value => typeof value === 'string' && value.length > 0 && !/[.#$\[\]\/\u0000-\u001f\u007f]/.test(value);
  const validCode = value => /^\d{6}$/.test(String(value == null ? '' : value));
  const isoDate = value => {
    if (value == null || value === '') return '';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  };
  const FALLBACK_DATE = '1970-01-01T00:00:00.000Z';
  function bangkokPeriod(value) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit' }).formatToParts(new Date(value));
    return parts.find(part => part.type === 'year').value + '-' + parts.find(part => part.type === 'month').value;
  }
  function empty() {
    const value = { schemaVersion: 2, members: {}, transactions: {}, legacyBaseBalances: {} };
    TABLES.forEach(table => { value[table] = {}; });
    return value;
  }
  // Keep the original decimal amount as an integer plus decimal scale. No historical amount is rewritten.
  function decimalAmount(value) {
    const source = String(value == null ? '' : value).trim();
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(source) || !Number.isFinite(Number(source)) || Number(source) < 0) {
      throw error('LEGACY_INVALID_AMOUNT', 'พบจำนวนเงินเดิมที่อ่านไม่ได้ กรุณาตรวจสอบข้อมูลต้นฉบับ');
    }
    const [mantissa, power = '0'] = source.toLowerCase().split('e');
    const parts = mantissa.split('.');
    let units = BigInt((parts[0] || '0') + (parts[1] || ''));
    let scale = (parts[1] || '').length - Number(power);
    if (!Number.isSafeInteger(scale) || Math.abs(scale) > 400) throw error('LEGACY_INVALID_AMOUNT', 'ทศนิยมจำนวนเงินเดิมเกินขอบเขตที่รองรับ');
    if (scale < 0) { units *= 10n ** BigInt(-scale); scale = 0; }
    return { units, scale };
  }
  function scaleUnits(part, scale) { return part.units * (10n ** BigInt(scale - part.scale)); }
  function toSatang(units, scale, floorOnly) {
    const numerator = units * 100n, denominator = 10n ** BigInt(scale);
    let quotient = numerator / denominator, remainder = numerator % denominator;
    if (remainder < 0n) { quotient -= 1n; remainder += denominator; }
    if (!floorOnly && remainder * 2n >= denominator) quotient += 1n;
    const value = Number(quotient);
    if (!Number.isSafeInteger(value)) throw error('LEGACY_AMOUNT_OVERFLOW', 'ยอดเงินเดิมเกินขอบเขตที่ระบบรองรับ');
    return value;
  }
  function convertLegacy(input) {
    const raw = record(input), rawMembers = record(raw.members), rawTransactions = record(raw.transactions);
    const state = empty(), memberKeys = {}, exactZeroBalances = {}, aliases = new Map(), partsById = new Map();
    const issues = [], notices = [], meta = record(raw.taebankMeta);
    TABLES.forEach(table => { state[table] = clone(record(meta[table])); });
    function alias(key, code) {
      const text = String(key);
      if (aliases.has(text) && aliases.get(text) !== code) issues.push('มีเลขบัญชีเดิมอ้างอิงซ้ำกัน');
      else aliases.set(text, code);
    }
    Object.entries(rawMembers).forEach(([key, source]) => {
      const member = record(source), code = validCode(key) ? String(key) : validCode(member.code) ? String(member.code) : '';
      if (!code || own(memberKeys, code)) { issues.push('มีบัญชีเดิมที่ไม่มีเลข 6 หลักหรือมีเลขบัญชีซ้ำ'); return; }
      memberKeys[code] = key; alias(key, code);
      exactZeroBalances[code] = true;
      if (member.code != null && member.code !== '') alias(member.code, code);
      let page = Math.max(1, Math.floor(Number(member.pbPage)) || 1);
      let line = Math.max(1, Math.floor(Number(member.pbLine)) || 1);
      if (!Number.isSafeInteger(page) || !Number.isSafeInteger(line)) { page = 1; line = 1; issues.push('มีตำแหน่งสมุดเดิมที่อ่านไม่ได้'); }
      page += Math.floor((line - 1) / 24); line = (line - 1) % 24 + 1;
      state.members[code] = { code, nick: String(member.nick || ''), name: String(member.name || member.nick || code),
        status: member.status === 'archived' ? 'archived' : 'active', pbPage: page, pbLine: line,
        createdAt: isoDate(member.createdAt) || '' };
      if (member.archivedAt) state.members[code].archivedAt = isoDate(member.archivedAt) || FALLBACK_DATE;
    });
    let fractionalCount = 0, unrelatedCount = 0;
    Object.entries(rawTransactions).forEach(([id, source]) => {
      const tx = record(source), sourceCode = String(tx.studentCode == null ? '' : tx.studentCode);
      const code = aliases.get(sourceCode);
      // Other applications also use this collection. The old UI never included records without a matching studentCode.
      if (!sourceCode || !code || !state.members[code]) { unrelatedCount++; return; }
      if (!['deposit', 'withdraw'].includes(tx.type)) { issues.push('มีรายการบัญชีเดิมที่ประเภทไม่ถูกต้อง'); return; }
      try {
        const part = decimalAmount(tx.amount), amountSatang = toSatang(part.units, part.scale);
        const fractional = (part.units * 100n) % (10n ** BigInt(part.scale)) !== 0n;
        if (fractional) fractionalCount++;
        const createdAt = isoDate(tx.date) || isoDate(tx.createdAt) || FALLBACK_DATE;
        const value = { id, studentCode: code, type: tx.type, amountSatang, createdAt,
          note: String(tx.note || tx.memo || ''), actor: String(tx.actor || 'ระบบเดิม'), legacyAmount: true };
        if (fractional) value.legacyFractionalSatang = true;
        if (tx.isInterest) {
          value.isInterest = true;
          const explicitPeriod = /^\d{4}-(0[1-9]|1[0-2])$/.test(tx.period || '');
          value.period = explicitPeriod ? tx.period : bangkokPeriod(createdAt);
          if (!explicitPeriod) value.legacyPeriodInferred = true;
        }
        for (const field of ['reversalOf', 'batchId', 'printJobId', 'printedPage', 'printedLine']) if (tx[field] != null) value[field] = clone(tx[field]);
        // The old boolean is authoritative for old records; a deterministic timestamp supports the new UI.
        if (tx.printed === true || (tx.printed == null && tx.printedAt)) value.printedAt = isoDate(tx.printedAt) || createdAt;
        put(state.transactions, id, value); partsById.set(id, part);
      } catch (cause) { issues.push(cause.message); }
    });
    const byCode = new Map();
    Object.values(state.transactions).forEach(tx => {
      if (!byCode.has(tx.studentCode)) byCode.set(tx.studentCode, []);
      byCode.get(tx.studentCode).push(tx);
    });
    byCode.forEach((transactions, code) => {
      transactions.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
      const scale = transactions.reduce((maximum, tx) => Math.max(maximum, partsById.get(tx.id).scale), 0);
      let units = 0n;
      transactions.forEach(tx => {
        const part = partsById.get(tx.id);
        units += scaleUnits(part, scale) * (tx.type === 'deposit' ? 1n : -1n);
        tx.legacyRunningBalanceSatang = toSatang(units, scale);
      });
      state.legacyBaseBalances[code] = { amountSatang: toSatang(units, scale), spendableSatang: toSatang(units, scale, true), transactionIds: transactions.map(tx => tx.id) };
      exactZeroBalances[code] = units === 0n;
      if (state.members[code] && !state.members[code].createdAt) state.members[code].createdAt = transactions[0].createdAt;
    });
    Object.values(state.members).forEach(member => { if (!member.createdAt) member.createdAt = FALLBACK_DATE; });
    // The original app has no interest-run table. Recognize its dated interest entries before allowing a new monthly run.
    const oldInterest = new Map();
    Object.values(state.transactions).filter(tx => tx.isInterest).forEach(tx => {
      if (!oldInterest.has(tx.period)) oldInterest.set(tx.period, []);
      oldInterest.get(tx.period).push(tx);
    });
    oldInterest.forEach((transactions, period) => {
      if (own(state.interestRuns, period)) return;
      const scale = transactions.reduce((maximum, tx) => Math.max(maximum, partsById.get(tx.id).scale), 0);
      const sum = transactions.reduce((total, tx) => total + scaleUnits(partsById.get(tx.id), scale), 0n);
      put(state.interestRuns, period, { period, legacy: true, inferred: true, periodLabel: 'อ้างอิงวันที่บันทึก', createdAt: transactions.map(tx => tx.createdAt).sort()[0],
        transactionIds: transactions.map(tx => tx.id), totalSatang: toSatang(sum, scale) });
    });
    if (unrelatedCount) notices.push('เก็บข้อมูลรูปแบบอื่น ' + unrelatedCount + ' รายการไว้ตามเดิม โดยไม่นำมารวมยอดบัญชี');
    if (fractionalCount) notices.push('ข้อมูลเดิมมีทศนิยมต่ำกว่าสตางค์ ยอดรวมคำนวณจากจำนวนเดิมและแสดงผล 2 ตำแหน่ง');
    if (issues.length) notices.unshift('ข้อมูลเดิมบางรายการอ่านไม่ครบ จึงระงับการบันทึกเพื่อป้องกันยอดผิด (' + issues.length + ' รายการ)');
    return { state, memberKeys, exactZeroBalances, aliases, issues, warning: notices.join(' · ') };
  }
  function mergeMutation(originalRoot, before, after) {
    const output = clone(record(originalRoot));
    const members = clone(record(output.members)), transactions = clone(record(output.transactions)), meta = clone(record(output.taebankMeta));
    Object.entries(after.members).forEach(([code, member]) => {
      const old = before.state.members[code], key = before.memberKeys[code] || code;
      if (!old) {
        put(members, key, { code, nick: member.nick, name: member.name, pbPage: member.pbPage, pbLine: member.pbLine,
          status: member.status, createdAt: member.createdAt });
        return;
      }
      const changed = {};
      for (const field of ['name', 'nick', 'status', 'archivedAt', 'pbPage', 'pbLine']) {
        if (member[field] !== old[field] && member[field] !== undefined) changed[field] = clone(member[field]);
      }
      if (Object.keys(changed).length) put(members, key, { ...record(members[key]), ...changed });
    });
    Object.entries(after.transactions).forEach(([id, tx]) => {
      const old = before.state.transactions[id];
      if (!old) {
        const value = { studentCode: before.memberKeys[tx.studentCode] || tx.studentCode, type: tx.type,
          amount: tx.amountSatang / 100, date: tx.createdAt, printed: false, note: tx.note || '', actor: tx.actor || '' };
        for (const field of ['isInterest', 'period', 'reversalOf', 'batchId']) if (tx[field] != null) value[field] = clone(tx[field]);
        put(transactions, id, value);
      } else {
        const changed = {};
        for (const field of ['printedAt', 'printJobId', 'printedPage', 'printedLine']) {
          if (tx[field] !== old[field] && tx[field] !== undefined) changed[field] = clone(tx[field]);
        }
        if (Object.keys(changed).length) put(transactions, id, { ...record(transactions[id]), ...changed, printed: true });
      }
    });
    TABLES.forEach(table => {
      const values = clone(record(meta[table]));
      Object.entries(after[table] || {}).forEach(([key, value]) => {
        if (JSON.stringify(value) !== JSON.stringify(before.state[table][key])) put(values, key, clone(value));
      });
      // Runtime-inferred old interest runs are never written back by an unrelated operation.
      if (Object.keys(values).length || own(meta, table)) put(meta, table, values);
    });
    if (Object.keys(members).length || own(output, 'members')) output.members = members;
    if (Object.keys(transactions).length || own(output, 'transactions')) output.transactions = transactions;
    if (Object.keys(meta).length || own(output, 'taebankMeta')) output.taebankMeta = meta;
    return output;
  }

  let config, firebase, database, initPromise, ready = false, session = null;
  let raw = { members: {}, transactions: {}, taebankMeta: {} }, converted = convertLegacy(raw);
  let membersReady = false, transactionsReady = false, metadataReady = false;
  let dataFailed = false, transportConnected = null, queue = Promise.resolve();
  const readFailures = new Set();
  let baseWarning = '', metadataWarning = '';
  function dataReady() { return membersReady && transactionsReady && metadataReady && !dataFailed; }
  function connection() {
    if ((global.navigator && global.navigator.onLine === false) || transportConnected === false || dataFailed) return 'offline';
    if (!dataReady() || transportConnected !== true) return 'loading';
    return 'online';
  }
  function publicState() {
    if (!session) return empty();
    if (session.role === 'admin') return converted.state;
    const code = session.accountCode, state = empty();
    if (converted.state.members[code]) state.members[code] = converted.state.members[code];
    state.transactions = Object.fromEntries(Object.entries(converted.state.transactions).filter(([, tx]) => tx.studentCode === code));
    if (converted.state.legacyBaseBalances[code]) state.legacyBaseBalances[code] = converted.state.legacyBaseBalances[code];
    return state;
  }
  function snapshot() { return clone({ mode: 'legacy', state: publicState(), session, connection: connection(),
    dataReady: dataReady(), warning: [baseWarning, converted.warning, session && session.role === 'admin' ? metadataWarning : ''].filter(Boolean).join(' · ') }); }
  function emit() { subscribers.forEach(callback => { try { callback(snapshot()); } catch (cause) { console.error('TaeLegacyService subscriber:', cause); } }); }
  function refresh() {
    try {
      converted = convertLegacy(raw); readFailures.delete('legacy-data'); dataFailed = readFailures.size > 0;
      if (!dataFailed) baseWarning = '';
    } catch (cause) {
      readFailures.add('legacy-data'); dataFailed = true;
      baseWarning = cause.message || 'ข้อมูลเดิมมีรูปแบบที่อ่านไม่ได้ จึงยังไม่แสดงยอดบัญชี';
    }
    emit();
  }
  function readFailed(path, cause) {
    readFailures.add(path); dataFailed = true;
    baseWarning = /permission/i.test(String(cause && cause.code)) ? 'ฐานข้อมูลเดิมปฏิเสธสิทธิ์อ่านข้อมูล กรุณาตรวจสอบสิทธิ์ของลิงก์เดิม' : 'เชื่อมต่อฐานข้อมูลเดิมไม่สำเร็จ กรุณาลองใหม่';
    emit();
  }
  async function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      if (!global.TaeCore) throw error('missing-core', 'โหลด core.js ก่อนเชื่อมต่อข้อมูล');
      config = global.TAEBANK_CONFIG || {};
      for (const key of ['apiKey', 'databaseURL', 'projectId', 'appId']) if (!config.firebase || !config.firebase[key]) throw error('setup-required', 'ไม่พบค่าฐานข้อมูลเดิม');
      const base = 'https://www.gstatic.com/firebasejs/11.0.2/';
      const [appModule, databaseModule] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-database.js')]);
      firebase = databaseModule;
      const existing = appModule.getApps ? appModule.getApps().find(app => app.name === 'taebank-legacy-mobile') : null;
      const app = existing || appModule.initializeApp(config.firebase, 'taebank-legacy-mobile');
      database = firebase.getDatabase(app);
      firebase.onValue(firebase.ref(database, '.info/connected'), value => { transportConnected = value.val() === true; emit(); });
      firebase.onValue(firebase.ref(database, 'members'), value => {
        raw.members = value.val() || {}; membersReady = true; readFailures.delete('members'); dataFailed = readFailures.size > 0;
        if (!dataFailed) baseWarning = ''; refresh();
      }, cause => readFailed('members', cause));
      firebase.onValue(firebase.ref(database, 'transactions'), value => {
        raw.transactions = value.val() || {}; transactionsReady = true; readFailures.delete('transactions'); dataFailed = readFailures.size > 0;
        if (!dataFailed) baseWarning = ''; refresh();
      }, cause => readFailed('transactions', cause));
      firebase.onValue(firebase.ref(database, 'taebankMeta'), value => {
        raw.taebankMeta = value.val() || {}; metadataReady = true; metadataWarning = ''; refresh();
      }, () => {
        raw.taebankMeta = {}; metadataReady = true;
        metadataWarning = 'อ่านประวัติระบบส่วนเสริมไม่ได้ ยังแสดงข้อมูลบัญชีเดิมได้'; refresh();
      });
      for (const event of ['online', 'offline']) global.addEventListener(event, emit);
      ready = true; emit(); return { mode: 'legacy', session: clone(session) };
    })().catch(cause => { dataFailed = true; baseWarning = cause.message || 'เชื่อมต่อข้อมูลเดิมไม่สำเร็จ'; emit(); throw cause; });
    return initPromise;
  }
  function awaitData() {
    if (dataReady()) return Promise.resolve();
    if (dataFailed) return Promise.reject(error('unavailable', baseWarning));
    return new Promise((resolve, reject) => {
      const finish = cause => { global.clearTimeout(timer); subscribers.delete(check); cause ? reject(cause) : resolve(); };
      const check = () => { if (dataFailed) finish(error('unavailable', baseWarning)); else if (dataReady()) finish(); };
      const timer = global.setTimeout(() => finish(error('unavailable', 'ยังโหลดข้อมูลเดิมไม่ครบ กรุณารอสักครู่แล้วลองใหม่')), 20000);
      subscribers.add(check); check();
    });
  }
  async function signIn(credentials) {
    await init(); await awaitData();
    credentials = credentials || {};
    if (credentials.adminPin != null || credentials.adminMasterKey != null) {
      const legacy = config.legacy || {};
      if (!legacy.adminPin || !legacy.adminMasterKey || String(credentials.adminPin || '') !== String(legacy.adminPin) || String(credentials.adminMasterKey || '') !== String(legacy.adminMasterKey)) {
        throw error('invalid-credentials', 'รหัสผู้ดูแลหรือรหัสยืนยันไม่ถูกต้อง');
      }
      session = { uid: 'legacy-admin', role: 'admin', accountCode: '', displayName: 'ผู้ดูแลระบบ', email: '' };
    } else {
      const input = String(credentials.accountCode || '').trim();
      if (!/^\d{6}$/.test(input)) throw error('invalid-credentials', 'กรอกเลขบัญชีเดิม 6 หลัก');
      const code = converted.aliases.get(input);
      if (!code || !converted.state.members[code]) throw error('member-not-found', 'ไม่พบเลขบัญชีนี้ในข้อมูลเดิม');
      const member = converted.state.members[code];
      session = { uid: 'legacy-member-' + code, role: 'member', accountCode: code, displayName: member.nick || member.name, email: '' };
    }
    emit(); return clone(session);
  }
  async function signOut() { session = null; emit(); }
  async function mutate(command) {
    await init(); await awaitData();
    if (!session || session.role !== 'admin') throw error('permission-denied', 'เฉพาะผู้ดูแลระบบเท่านั้นที่บันทึกรายการได้');
    if (!command || !safeKey(command.idempotencyKey)) throw error('invalid-argument', 'รหัสคำขอไม่ถูกต้อง กรุณาเปิดรายการใหม่');
    if (connection() !== 'online') throw error('unavailable', 'ยังไม่เชื่อมต่อฐานข้อมูลเดิม กรุณารอออนไลน์ก่อนบันทึก');
    const request = clone(command), actor = session.uid;
    const execute = async () => {
      if (!session || session.role !== 'admin') throw error('permission-denied', 'กรุณาเข้าสู่ระบบผู้ดูแลอีกครั้ง');
      let result;
      const now = new Date().toISOString();
      try {
        // Seed a complete root before the transaction's first local callback, and check permission before any write.
        await firebase.get(firebase.ref(database));
        const committed = await firebase.runTransaction(firebase.ref(database), serverValue => {
          const original = record(serverValue), before = convertLegacy(original);
          if (before.issues.length) throw error('legacy-invalid-data', 'ข้อมูลเดิมบางรายการอ่านไม่ได้ จึงยังไม่บันทึกเพื่อป้องกันยอดผิด');
          if (request.action === 'member.archive' && before.exactZeroBalances[request.code] === false) {
            throw error('NONZERO_BALANCE', 'บัญชีเดิมยังมียอดเงินคงเหลือ รวมเศษต่ำกว่าสตางค์ จึงยังปิดบัญชีไม่ได้');
          }
          const change = global.TaeCore.applyMutation(before.state, request, { now, actor,
            idFactory: () => global.crypto && global.crypto.randomUUID ? global.crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2) });
          result = clone(change.result);
          return mergeMutation(original, before, change.state);
        }, { applyLocally: false });
        if (!committed.committed) throw error('not-committed', 'รายการยังไม่ถูกบันทึก กรุณาลองใหม่');
        const committedRoot = record(committed.snapshot.val());
        raw = { members: clone(record(committedRoot.members)), transactions: clone(record(committedRoot.transactions)), taebankMeta: clone(record(committedRoot.taebankMeta)) };
        refresh(); return result;
      } catch (cause) {
        if (/permission/i.test(String(cause && cause.code))) throw error('permission-denied', 'ฐานข้อมูลเดิมไม่อนุญาตให้ตรวจสอบและบันทึกรายการแบบครบชุด รายการยังไม่ถูกบันทึก');
        throw cause;
      }
    };
    const task = queue.then(execute, execute); queue = task.catch(() => {}); return task;
  }
  function exportData() {
    if (!session || session.role !== 'admin') throw error('permission-denied', 'เฉพาะผู้ดูแลระบบเท่านั้นที่สำรองข้อมูลได้');
    return JSON.stringify({ exportedAt: new Date().toISOString(), mode: 'legacy', databaseURL: config.firebase.databaseURL,
      members: clone(raw.members), transactions: clone(raw.transactions), taebankMeta: clone(raw.taebankMeta) }, null, 2);
  }
  async function resetDemo() { throw error('permission-denied', 'ข้อมูลนี้เป็นฐานข้อมูลเดิม จึงไม่สามารถรีเซ็ตข้อมูลทดลองได้'); }
  global.TaeLegacyService = Object.freeze({ init, subscribe(callback) {
    if (typeof callback !== 'function') throw new TypeError('callback required');
    subscribers.add(callback); callback(snapshot()); return () => subscribers.delete(callback);
  }, getSnapshot: snapshot, signIn, signOut, mutate, exportData, resetDemo, get ready() { return ready; } });
  if (typeof module !== 'undefined' && module.exports) module.exports = { convertLegacy, mergeMutation, decimalAmount, toSatang };
})(typeof window !== 'undefined' ? window : globalThis);
