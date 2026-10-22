/* TaeService: browser adapter. Real balances are written only by mutateBank. */
(function (global) {
  'use strict';
  if (global.TAEBANK_CONFIG && global.TAEBANK_CONFIG.mode === 'legacy') {
    if (!global.TaeLegacyService) throw new Error('โหลด legacy-service.js ก่อน service.js');
    global.TaeService = global.TaeLegacyService;
    return;
  }
  const STORAGE_KEY = 'taebank.mobile.demo.v3';
  const SDK_VERSION = '13.1.0';
  const subscribers = new Set();
  let config, mode, session = null, state = null, memoryState = null;
  let ready = false, initPromise, connection = 'loading', warning = '';
  let storageWorks = true, auth, database, functions, firebase;
  let detachBank = [], authGeneration = 0, authTask = Promise.resolve();
  let dataReady = false, transportConnected = null, dataFailed = false, authPending = false;
  let queue = Promise.resolve();

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  function emptyState() {
    return { schemaVersion: 2, members: {}, transactions: {}, interestRuns: {}, importRuns: {}, printJobs: {}, requests: {}, audit: {} };
  }
  function normalize(value) {
    if (!value) return emptyState();
    return { ...emptyState(), ...value };
  }
  function error(code, message) { return Object.assign(new Error(message), { code }); }
  function publicState() {
    if (!session) return emptyState();
    if (session.role === 'admin') return state || emptyState();
    const code = session.accountCode, source = state || emptyState();
    const memberState = emptyState();
    memberState.members = source.members && source.members[code] ? { [code]: source.members[code] } : {};
    memberState.transactions = Object.fromEntries(Object.entries(source.transactions || {}).filter(([, tx]) => tx.studentCode === code));
    return memberState;
  }
  function snapshot() { return clone({ state: publicState(), session, mode, connection, warning, dataReady }); }
  function emit() {
    for (const callback of subscribers) {
      try { callback(snapshot()); } catch (cause) { console.error('TaeService subscriber:', cause); }
    }
  }
  function readDemo() {
    if (!storageWorks) return clone(memoryState || global.TaeCore.createDemo());
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return global.TaeCore.createDemo();
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.members || !parsed.transactions || typeof parsed !== 'object') throw new Error('Invalid demo');
      return parsed;
    } catch (_) {
      storageWorks = false;
      warning = 'เบราว์เซอร์บันทึกข้อมูลทดลองไม่ได้ ข้อมูลจะอยู่ในหน้านี้จนกว่าจะปิด';
      return clone(memoryState || global.TaeCore.createDemo());
    }
  }
  function saveDemo(value) {
    memoryState = clone(value);
    if (!storageWorks) return;
    try { global.localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); }
    catch (_) {
      storageWorks = false;
      warning = 'พื้นที่บันทึกข้อมูลทดลองไม่พร้อม ข้อมูลจะอยู่ในหน้านี้จนกว่าจะปิด';
    }
  }
  function stopBank() { detachBank.forEach(detach => detach()); detachBank = []; }
  function updateConnection() {
    if (navigator.onLine === false || transportConnected === false || dataFailed) connection = 'offline';
    else if ((authPending || session) && (!dataReady || transportConnected !== true)) connection = 'loading';
    else connection = 'online';
  }
  function permissionError(cause) {
    warning = cause && cause.code === 'PERMISSION_DENIED' ? 'สิทธิ์อ่านข้อมูลถูกปฏิเสธ โปรดตรวจสอบบัญชีและ Database Rules' : 'เชื่อมต่อข้อมูลไม่สำเร็จ กรุณาลองใหม่';
    dataFailed = true; dataReady = false; updateConnection(); emit();
  }
  async function acceptUser(user) {
    const generation = ++authGeneration;
    stopBank(); session = null; state = emptyState(); warning = '';
    dataReady = false; dataFailed = false; authPending = !!user;
    updateConnection(); emit();
    if (!user) return;
    try {
      const token = await firebase.getIdTokenResult(user);
      if (generation !== authGeneration) return;
      const isAdmin = token.claims.admin === true;
      const code = String(token.claims.accountCode || '');
      if (!isAdmin && !/^\d{6}$/.test(code)) {
        await firebase.signOut(auth);
        throw error('permission-denied', 'บัญชีนี้ยังไม่ได้รับสิทธิ์ โปรดให้ผู้ดูแลผูกเลขสมาชิก');
      }
      session = { uid: user.uid, role: isAdmin ? 'admin' : 'member', accountCode: isAdmin ? '' : code,
        email: user.email || '', displayName: user.displayName || (isAdmin ? 'ผู้ดูแลระบบ' : 'สมาชิก') };
      authPending = false;
      const onReadError = cause => { if (generation === authGeneration) permissionError(cause); };
      if (isAdmin) {
        detachBank.push(firebase.onValue(firebase.ref(database, 'bank'), data => {
          if (generation !== authGeneration) return;
          state = normalize(data.val()); dataReady = true; dataFailed = false;
          updateConnection(); warning = ''; emit();
        }, onReadError));
      } else {
        let memberReady = false, transactionsReady = false;
        const update = () => {
          if (generation !== authGeneration) return;
          dataReady = memberReady && transactionsReady && !dataFailed; updateConnection(); emit();
        };
        detachBank.push(firebase.onValue(firebase.ref(database, 'bank/members/' + code), data => {
          if (generation !== authGeneration) return;
          state.members = data.exists() ? { [code]: data.val() } : {}; memberReady = true; update();
        }, onReadError));
        const transactions = firebase.query(firebase.ref(database, 'bank/transactions'), firebase.orderByChild('studentCode'), firebase.equalTo(code));
        detachBank.push(firebase.onValue(transactions, data => {
          if (generation !== authGeneration) return;
          state.transactions = data.val() || {}; transactionsReady = true; update();
        }, onReadError));
      }
      updateConnection(); emit();
    } catch (cause) {
      if (generation !== authGeneration) return;
      authPending = false; dataFailed = true; dataReady = false;
      warning = cause.message || 'ตรวจสอบสิทธิ์ไม่สำเร็จ'; updateConnection(); emit();
      throw cause;
    }
  }
  async function initFirebase() {
    for (const key of ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'appId']) {
      if (!config.firebase || !config.firebase[key]) throw error('setup-required', 'ตั้งค่า Firebase ไม่ครบ อ่าน SETUP-FIREBASE.md ก่อนเปิดใช้ข้อมูลจริง');
    }
    const base = 'https://www.gstatic.com/firebasejs/' + SDK_VERSION + '/';
    const [appModule, authModule, databaseModule, functionsModule] = await Promise.all([
      import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-database.js'), import(base + 'firebase-functions.js')
    ]);
    firebase = { ...authModule, ...databaseModule, ...functionsModule };
    const app = appModule.initializeApp(config.firebase);
    auth = firebase.getAuth(app); database = firebase.getDatabase(app);
    functions = firebase.getFunctions(app, config.functionsRegion || 'asia-southeast1');
    await firebase.setPersistence(auth, firebase.browserSessionPersistence);
    // This listener describes transport only. It must never mark an incomplete account snapshot ready.
    firebase.onValue(firebase.ref(database, '.info/connected'), value => {
      transportConnected = value.val() === true; updateConnection(); emit();
    });
    for (const event of ['online', 'offline']) global.addEventListener(event, () => { updateConnection(); emit(); });
    // Read the first auth state before init resolves. Every token change also refreshes claims.
    await new Promise((resolve, reject) => {
      let first = true;
      firebase.onIdTokenChanged(auth, user => {
        authTask = acceptUser(user);
        authTask.then(() => { if (first) { first = false; resolve(); } }, cause => {
          if (first) { first = false; reject(cause); }
        });
      }, reject);
    });
  }
  async function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      if (!global.TaeCore) throw error('missing-core', 'โหลด core.js ก่อน service.js');
      config = global.TAEBANK_CONFIG || { mode: 'demo' };
      mode = config.mode === 'firebase' ? 'firebase' : 'demo';
      state = emptyState(); emit();
      if (mode === 'demo') {
        state = readDemo(); saveDemo(state); dataReady = true; connection = 'online';
        global.addEventListener('storage', event => {
          if (event.key === STORAGE_KEY) { state = readDemo(); emit(); }
        });
      } else await initFirebase();
      ready = true; emit(); return { mode, session: clone(session) };
    })().catch(cause => { warning = cause.message; connection = 'offline'; emit(); throw cause; });
    return initPromise;
  }
  function waitForUser(uid) {
    if (session && session.uid === uid) return Promise.resolve();
    // Observe the matching accepted UID instead of assuming SDK promise/listener ordering.
    return new Promise((resolve, reject) => {
      const finish = cause => {
        global.clearTimeout(timer); subscribers.delete(check);
        if (cause) reject(cause); else resolve();
      };
      const check = () => {
        if (session && session.uid === uid) finish();
        else if (warning) finish(error('permission-denied', warning));
        else if (!auth.currentUser || auth.currentUser.uid !== uid) finish(error('permission-denied', 'ยังไม่ได้รับสิทธิ์บัญชี หรือการเข้าสู่ระบบถูกยกเลิก'));
      };
      const timer = global.setTimeout(() => finish(error('unavailable', 'ตรวจสอบสิทธิ์นานกว่าปกติ กรุณาลองเข้าสู่ระบบใหม่')), 20000);
      subscribers.add(check); check();
    });
  }
  async function signIn(credentials) {
    await init();
    const { email, password, demoRole } = credentials || {};
    if (mode === 'demo') {
      if (!['member', 'admin'].includes(demoRole)) throw error('demo-only', 'กดปุ่มทดลองสมาชิกหรือทดลองผู้ดูแล เพื่อใช้ข้อมูลสมมติ');
      session = { uid: 'demo-' + demoRole, role: demoRole, accountCode: demoRole === 'member' ? '100001' : '',
        email: '', displayName: demoRole === 'member' ? 'สมาชิกตัวอย่าง' : 'ผู้ดูแลตัวอย่าง' };
      state = readDemo(); emit(); return clone(session);
    }
    if (demoRole) throw error('production-mode', 'ระบบข้อมูลจริงไม่รองรับการทดลองเข้าสู่ระบบ');
    if (!email || !password) throw error('invalid-credentials', 'กรอกอีเมลและรหัสผ่าน');
    try {
      const credential = await firebase.signInWithEmailAndPassword(auth, email.trim(), password);
      await waitForUser(credential.user.uid);
      if (!session) throw error('permission-denied', 'ยังไม่ได้รับสิทธิ์บัญชี');
      return clone(session);
    } catch (cause) {
      const known = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'];
      if (known.includes(cause.code)) throw error(cause.code, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      if (cause.code === 'auth/too-many-requests') throw error(cause.code, 'ลองเข้าสู่ระบบหลายครั้ง กรุณารอสักครู่');
      throw cause;
    }
  }
  async function signOut() {
    if (mode === 'firebase' && auth) await firebase.signOut(auth);
    stopBank(); ++authGeneration; session = null;
    if (mode === 'firebase') { state = emptyState(); dataReady = false; authPending = false; dataFailed = false; updateConnection(); }
    emit();
  }
  async function mutate(command) {
    await init();
    if (!session || session.role !== 'admin') throw error('permission-denied', 'เฉพาะผู้ดูแลระบบเท่านั้นที่บันทึกรายการได้');
    if (!command || !command.idempotencyKey) throw error('invalid-argument', 'รายการต้องมีรหัสคำสั่งเพื่อป้องกันการบันทึกซ้ำ');
    if (mode === 'firebase') {
      if (connection !== 'online') throw error('unavailable', 'ยังไม่เชื่อมต่อระบบ กรุณารอออนไลน์ก่อนบันทึก');
      const callable = firebase.httpsCallable(functions, 'mutateBank');
      const response = await callable(command);
      return response.data;
    }
    const execute = async () => {
      if (!session || session.role !== 'admin') throw error('permission-denied', 'กรุณาเข้าสู่ระบบผู้ดูแลอีกครั้ง');
      const current = readDemo();
      const change = global.TaeCore.applyMutation(current, clone(command), {
        now: new Date().toISOString(), actor: session.uid,
        idFactory: () => global.crypto && global.crypto.randomUUID ? global.crypto.randomUUID() : 'demo-' + Date.now() + '-' + Math.random().toString(36).slice(2)
      });
      saveDemo(change.state); state = change.state; emit(); return clone(change.result);
    };
    const run = () => global.navigator && global.navigator.locks ? global.navigator.locks.request(STORAGE_KEY, execute) : execute();
    const task = queue.then(run, run); queue = task.catch(() => {}); return task;
  }
  async function resetDemo() {
    await init();
    if (mode !== 'demo') throw error('permission-denied', 'รีเซ็ตได้เฉพาะข้อมูลทดลอง');
    const execute = () => { state = global.TaeCore.createDemo(); saveDemo(state); session = null; emit(); };
    const run = () => global.navigator && global.navigator.locks ? global.navigator.locks.request(STORAGE_KEY, execute) : execute();
    const task = queue.then(run, run); queue = task.catch(() => {}); return task;
  }
  function exportData() {
    if (!session || session.role !== 'admin') throw error('permission-denied', 'เฉพาะผู้ดูแลระบบเท่านั้นที่สำรองข้อมูลได้');
    return JSON.stringify({ exportedAt: new Date().toISOString(), mode, schema: 2, bank: clone(state) }, null, 2);
  }
  global.TaeService = Object.freeze({ init, subscribe(callback) {
    if (typeof callback !== 'function') throw new TypeError('callback required');
    subscribers.add(callback); callback(snapshot()); return () => subscribers.delete(callback);
  }, getSnapshot: snapshot, signIn, signOut, mutate, exportData, resetDemo, get ready() { return ready; } });
})(window);
