'use strict';
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp, getApps } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const { getAuth } = require('firebase-admin/auth');
const { randomUUID } = require('node:crypto');
const core = require('./core.cjs');

if (!getApps().length) initializeApp();
const ALLOWED_ACTIONS = new Set(['member.save', 'member.archive', 'transact', 'reverse', 'interest', 'import', 'print.confirm']);

exports.mutateBank = onCall({
  region: 'asia-southeast1',
  timeoutSeconds: 60,
  memory: '512MiB',
  maxInstances: 10,
  // Authentication + admin claims below protect writes. Enable App Check after registering the production domain.
  enforceAppCheck: false
}, async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'กรุณาเข้าสู่ระบบ');
  if (request.auth.token.admin !== true) throw new HttpsError('permission-denied', 'เฉพาะผู้ดูแลระบบเท่านั้น');
  // Check the current account as well as the ID token: demotion/disable takes effect immediately.
  const account = await getAuth().getUser(request.auth.uid);
  if (account.disabled || !account.customClaims || account.customClaims.admin !== true) {
    throw new HttpsError('permission-denied', 'สิทธิ์ผู้ดูแลถูกยกเลิก กรุณาเข้าสู่ระบบใหม่');
  }
  const command = request.data;
  if (!command || typeof command !== 'object' || Array.isArray(command) || !ALLOWED_ACTIONS.has(command.action)) {
    throw new HttpsError('invalid-argument', 'ชนิดคำสั่งไม่ถูกต้อง');
  }
  if (typeof command.idempotencyKey !== 'string' || !/^[A-Za-z0-9_-]{8,120}$/.test(command.idempotencyKey)) {
    throw new HttpsError('invalid-argument', 'รหัสคำสั่งไม่ถูกต้อง');
  }
  if (Buffer.byteLength(JSON.stringify(command), 'utf8') > 512 * 1024) {
    throw new HttpsError('invalid-argument', 'รายการใหญ่เกินไป กรุณาแบ่งไฟล์นำเข้า');
  }
  // The transaction update may run repeatedly; fixed server time + deterministic IDs make retries stable.
  const now = new Date().toISOString();
  const operationID = randomUUID();
  let capturedResult, capturedError;
  try {
    const outcome = await getDatabase().ref('bank').transaction(current => {
      capturedResult = undefined; capturedError = undefined;
      let counter = 0;
      try {
        // Realtime Database omits empty dictionaries; restore the schema's empty tables.
        const empty = { schemaVersion: 2, members: {}, transactions: {}, interestRuns: {}, importRuns: {}, printJobs: {}, requests: {}, audit: {} };
        const initial = current ? { ...empty, ...current } : empty;
        const change = core.applyMutation(initial, command, {
          now, actor: request.auth.uid,
          idFactory: () => operationID + '_' + (++counter)
        });
        capturedResult = change.result;
        return change.state;
      } catch (cause) {
        capturedError = cause;
        return undefined;
      }
    }, undefined, false);
    if (!outcome.committed) {
      if (capturedError) {
        throw new HttpsError('failed-precondition', capturedError.message || 'ไม่สามารถบันทึกรายการได้', { code: capturedError.code || 'VALIDATION' });
      }
      throw new HttpsError('aborted', 'ข้อมูลเปลี่ยนพร้อมกัน กรุณาลองใหม่ด้วยคำสั่งเดิม');
    }
    return capturedResult == null ? { ok: true } : capturedResult;
  } catch (cause) {
    if (cause instanceof HttpsError) throw cause;
    console.error('mutateBank failed', { code: cause.code || 'INTERNAL' });
    throw new HttpsError('internal', 'บันทึกไม่สำเร็จ กรุณาลองใหม่ด้วยรหัสคำสั่งเดิม');
  }
});
