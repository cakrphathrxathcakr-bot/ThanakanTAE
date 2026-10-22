/* Run on a trusted administrator computer. Never include service-account keys in the website. */
'use strict';
const { createRequire } = require('node:module');
const path = require('node:path');
const requireFromFunctions = createRequire(path.join(__dirname, 'functions', 'package.json'));
const { initializeApp, applicationDefault } = requireFromFunctions('firebase-admin/app');
const { getAuth } = requireFromFunctions('firebase-admin/auth');
const { getDatabase } = requireFromFunctions('firebase-admin/database');

async function main() {
  const [email, role, accountCode] = process.argv.slice(2);
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;
  if (!email || !['admin', 'member', 'revoke'].includes(role) || !projectId || !databaseURL) {
    throw new Error('Usage: set GOOGLE_CLOUD_PROJECT and FIREBASE_DATABASE_URL; node set-admin.cjs EMAIL admin|member|revoke [6-digit accountCode]');
  }
  if (role === 'member' && !/^\d{6}$/.test(accountCode || '')) throw new Error('Member accountCode must have exactly 6 digits');
  initializeApp({ credential: applicationDefault(), projectId, databaseURL });
  const user = await getAuth().getUserByEmail(email);
  const claims = { ...(user.customClaims || {}) };
  delete claims.admin; delete claims.accountCode;
  if (role === 'admin') claims.admin = true;
  if (role === 'member') {
    const member = await getDatabase().ref('bank/members/' + accountCode).get();
    if (!member.exists()) throw new Error('No matching member in /bank/members. Create or migrate the member first.');
    claims.accountCode = accountCode;
  }
  await getAuth().setCustomUserClaims(user.uid, claims);
  // Invalidate refresh tokens so an old signed-in session cannot keep refreshing obsolete claims.
  await getAuth().revokeRefreshTokens(user.uid);
  console.log('Updated role for ' + email + ': ' + role + '. Sign out and sign in again.');
}
main().catch(cause => { console.error(cause.message); process.exitCode = 1; });
