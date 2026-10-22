# เชื่อม TaeBank กับ Firebase

> **ฉบับแก้ไขล่าสุดตั้งค่า mode: legacy ให้ใช้ฐานข้อมูลเดิมแล้ว ไม่ต้องนำเข้า ไม่ต้องย้ายข้อมูล และไม่ต้อง deploy คู่มือนี้เป็นทางเลือกเมื่อต้องการเปลี่ยนไปใช้ Firebase Authentication แบบใหม่ในภายหลัง ดู README-เริ่มใช้งาน.md สำหรับการใช้งานปัจจุบัน**

ไฟล์ที่ส่งให้เปิดด้วยโหมด **ทดลอง** และใช้ข้อมูลสมมติในเบราว์เซอร์ ไม่แตะฐานข้อมูลเดิม ไม่ใช้ PIN ของระบบเดิม และไม่ส่งข้อมูลใดไป Firebase จนกว่าจะเปลี่ยนการตั้งค่า คู่มือนี้เตรียมโค้ดฝั่งเซิร์ฟเวอร์ไว้แล้ว แต่ยังไม่ได้ติดตั้งหรือทดสอบกับโปรเจกต์ Firebase ของคุณ

## 1. ทดลองหน้าจอก่อน

เปิดเว็บไซต์ผ่านเว็บเซิร์ฟเวอร์หรือ Hosting และเลือก “ทดลองสมาชิก” หรือ “ทดลองผู้ดูแล” ข้อมูลทดลองถูกเก็บในเบราว์เซอร์เครื่องนี้ ปุ่มรีเซ็ตล้างเฉพาะข้อมูลทดลอง การเลือกบทบาทในโหมดนี้มีไว้สาธิต จึงไม่ใช่ระบบยืนยันตัวตนสำหรับใช้กับเงินจริง

ถ้าเปิดด้วย file:// แล้วเบราว์เซอร์บล็อกการบันทึก จะมีข้อความแจ้งและเก็บข้อมูลชั่วคราวในหน้านั้น การใช้งานข้อมูลจริงต้องใช้ HTTPS

## 2. เตรียมโปรเจกต์

1. ใช้โปรเจกต์ทดสอบก่อน เปิด Firebase Console และเพิ่ม Web App
2. เปิด Authentication → Sign-in method → Email/Password
3. สร้างผู้ใช้ผู้ดูแลด้วยอีเมลและรหัสผ่านใน Authentication → Users รหัสผ่านไม่ต้องเขียนลงโค้ด
4. สร้าง Realtime Database และเก็บ Database URL หากใช้ฐานข้อมูลหลาย instance ต้องเลือก instance ให้ตรงกับ `databaseURL` และ target ของคำสั่ง deploy
5. เพิ่มโดเมนที่ใช้จริงใน Authentication → Settings → Authorized domains
6. Cloud Functions ใช้ Node.js 22 และต้องเปิดแผน Blaze ตามข้อกำหนด Firebase ตรวจสอบค่าบริการในโปรเจกต์ก่อน deploy

## 3. ติดตั้ง Functions และ Rules

ใช้ Node.js 22 บนเครื่องผู้ดูแล ติดตั้ง Firebase CLI แล้วรันในโฟลเดอร์ `taebank-mobile/firebase` โดยเปลี่ยน `YOUR_PROJECT_ID` เป็น Project ID จริง:

```powershell
npm install --global firebase-tools
firebase login
Set-Location functions
npm install
npm run check
Set-Location ..
firebase deploy --project YOUR_PROJECT_ID --only "functions:mutateBank,database"
```

ไฟล์ `functions/core.cjs` เป็นสำเนา `core.js` ของเว็บ ต้องใช้รุ่นเดียวกันเสมอ ทุกการฝาก ถอน จ่ายดอกเบี้ย นำเข้า และยืนยันการพิมพ์ผ่าน callable function `mutateBank` ฟังก์ชันตรวจทั้ง ID token และสิทธิ์ปัจจุบันใน Authentication แล้วเขียน `/bank` ด้วย transaction เดียว คำสั่งที่ retry ใช้ `idempotencyKey` เดิมเพื่อป้องกันยอดซ้ำ

Rules ที่ให้มาปิดการเขียนจากเบราว์เซอร์ทั้งหมด ผู้ดูแลอ่าน `/bank` ได้ สมาชิกอ่านได้เฉพาะ `members/เลขบัญชีของตน` และรายการที่ query `studentCode` ตรงกับ claim ของตน ผู้ใช้ที่เพียงเข้าสู่ระบบแล้วไม่ได้รับสิทธิ์ผู้ดูแลโดยอัตโนมัติ

หากฐานข้อมูลมี Rules เดิม คำสั่ง deploy จะเปลี่ยน Rules ของ instance ที่เลือก ให้ตรวจสอบการใช้งานอื่นในโปรเจกต์และสำรอง Rules เดิมก่อนใช้กับฐานข้อมูลจริง

## 4. กำหนดสิทธิ์ผู้ดูแล

สคริปต์ใช้ Admin SDK บนเครื่องที่เชื่อถือได้ผ่าน Application Default Credentials ไม่เก็บ service-account key ในเว็บ ใช้ Google Cloud CLI และบัญชีที่มีสิทธิ์จัดการ Firebase Auth:

```powershell
gcloud auth application-default login
$env:GOOGLE_CLOUD_PROJECT = 'YOUR_PROJECT_ID'
$env:FIREBASE_DATABASE_URL = 'https://YOUR_DATABASE_URL'
node set-admin.cjs admin@example.com admin
```

แทน URL ทั้งก้อนให้ตรงกับ Console ตัวอย่าง URL ข้างบนเป็น placeholder หลังเปลี่ยนสิทธิ์ให้ผู้ใช้ลงชื่อออกแล้วเข้าใหม่ สคริปต์เก็บ custom claims อื่นไว้ และแก้เฉพาะ `admin` กับ `accountCode`

สำหรับสมาชิก ให้สร้างสมาชิกเลข 6 หลักในหน้าแอดมินก่อน สร้าง Email/Password user ใน Authentication แล้วผูกบัญชีดังนี้:

```powershell
node set-admin.cjs member@example.com member 100001
```

ถอนสิทธิ์บัญชีที่ไม่ควรเข้าถึงระบบ:

```powershell
node set-admin.cjs old-admin@example.com revoke
```

สคริปต์เพิกถอน refresh tokens เมื่อเปลี่ยนสิทธิ์ด้วย ID token เดิมอาจยังอ่านข้อมูลตาม Rules ได้จนหมดอายุสูงสุดประมาณหนึ่งชั่วโมง ส่วนการเขียนผ่าน `mutateBank` ตรวจสิทธิ์ปัจจุบันทุกคำสั่ง

## 5. เปิดโหมดข้อมูลจริง

แก้ `firebase-config.js` ตาม Web App config ใน Firebase Console:

```javascript
window.TAEBANK_CONFIG = Object.freeze({
  mode: 'firebase',
  firebase: {
    apiKey: 'ค่าจาก Firebase Console',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    databaseURL: 'URL เต็มของ Realtime Database',
    projectId: 'YOUR_PROJECT_ID',
    appId: 'ค่าจาก Firebase Console'
  },
  functionsRegion: 'asia-southeast1'
});
```

Firebase web config เป็นข้อมูลเชื่อมต่อที่อยู่ในเบราว์เซอร์ได้ สิทธิ์ข้อมูลป้องกันด้วย Authentication, Rules และการตรวจสิทธิ์ฝั่งเซิร์ฟเวอร์ ห้ามนำ private key, service-account JSON หรือรหัสผ่านผู้ดูแลมาใส่ไฟล์นี้

Deploy หน้าเว็บจากโฟลเดอร์ `firebase` เดิม:

```powershell
firebase deploy --project YOUR_PROJECT_ID --only hosting
```

Hosting config ไม่เผยแพร่โฟลเดอร์ `firebase` และไฟล์คู่มือ หลังเปิดโหมดจริง ปุ่มทดลองต้องไม่แสดง และการเข้าสู่ระบบใช้ Email/Password เท่านั้น บัญชีว่างจะเริ่มจากข้อมูลว่าง โดยเพิ่มสมาชิกผ่านผู้ดูแลได้

## 6. ย้ายข้อมูลจากเว็บเดิม

รูปแบบใหม่เก็บยอดเป็น **จำนวนเต็มสตางค์** เช่น 125.50 บาท = 12550 และใช้ `createdAt` แบบ ISO แทน `date` เดิม เก็บข้อมูลภายใต้ `/bank` และ `schemaVersion: 2` จึงห้ามนำ JSON เดิมวางทับโดยตรง

1. ส่งออก JSON ฐานข้อมูลเดิม และเก็บต้นฉบับไว้อย่างน้อยอีกหนึ่งที่
2. หยุดรับรายการในระบบเดิมระหว่างสำรองชุดสุดท้ายและย้ายจริง เพื่อไม่ให้มีรายการตกหล่น
3. ใช้ตัวแปลงออฟไลน์ซึ่งอ่านไฟล์และสร้างไฟล์ใหม่เท่านั้น ไม่เชื่อมต่อ Firebase:

```powershell
node migrate-legacy.cjs ORIGINAL-BACKUP.json NEW-bank-v2.json
```

4. ตัวแปลงรับข้อมูล root ที่มี `members` และ `transactions` ตรวจเลข 6 หลัก ชื่อ วันที่ ยอดเงินและสมาชิกอ้างอิง หากผิดจะหยุดโดยไม่เขียนไฟล์ผลลัพธ์ ไม่ข้ามรายการเงียบ ๆ
5. ตรวจจำนวนบัญชี จำนวนรายการ และยอดของทุกบัญชีเทียบกับต้นฉบับ ตัวแปลงคง transaction ID เดิม แปลง `printed: true` เป็น `printedAt` พร้อม `legacyPrinted` เพื่อบอกว่าระบบเดิมเป็นผู้ระบุสถานะ
6. รอบเดือนที่มีดอกเบี้ยเดิมจะถูกจองใน `interestRuns` เพื่อป้องกันจ่ายซ้ำ รวมเดือน UTC และกรุงเทพเมื่อเป็นรายการใกล้เส้นแบ่งเดือน ตรวจรอบดอกเบี้ยเหล่านี้กับบัญชีจริงอีกครั้ง
7. นำเข้า `NEW-bank-v2.json` ที่ **node `/bank` ของฐานข้อมูลทดสอบว่าง** ผ่าน Firebase Console อย่านำเข้าที่ root ของฐานข้อมูลเดิม ตรวจข้อมูลและสิทธิ์ก่อนนำกระบวนการที่ทดสอบแล้วไปใช้กับระบบจริง
8. สมาชิกเดิมต้องสร้างบัญชี Authentication และผูก `accountCode` ใหม่ PIN และเลขบัญชีเดิมไม่ถูกย้ายเป็นรหัสผ่าน

ถ้าข้อมูลเดิมมีรายการลบสมาชิกไปแล้วแต่ยังมีธุรกรรมอ้างอิง ยอดติดลบ จำนวนเงินเกินสองทศนิยม หรือวันที่อ่านไม่ได้ ให้แก้ความไม่ตรงกันในสำเนาก่อนแปลง ห้ามเดารายการเพื่อให้ยอดผ่าน

## 7. ตรวจสอบก่อนใช้งานจริง

- ทดลองผู้ดูแลฝาก ถอนเกินยอด กลับรายการ จ่ายดอกเบี้ยรอบเดิม และส่งคำสั่งเดิมซ้ำ ผลต้องถูกปฏิเสธหรือคืนผลเดิมโดยยอดไม่เพิ่มซ้ำ
- เข้าด้วยสมาชิกสองคนและตรวจว่าไม่เห็นข้อมูลอีกบัญชี ทดสอบอ่าน `/bank` และเขียนตรงจาก client ว่าถูกปฏิเสธ
- ปิดอินเทอร์เน็ตแล้วลองบันทึก ระบบต้องแจ้งให้รอเชื่อมต่อ ไม่แสดงว่าสำเร็จ
- ตรวจการพิมพ์กับเครื่องพิมพ์จริง ระบบจะเลื่อนตำแหน่งสมุดเมื่อยืนยันว่าพิมพ์สำเร็จเท่านั้น
- ตั้งกระบวนการสำรองข้อมูลและตรวจสอบย้อนหลังตามงานจริง Callable ยังไม่ได้บังคับ App Check; สามารถลงทะเบียนโดเมนและเพิ่มการตรวจ App Check ตามคู่มือ Firebase ก่อนเปิดระบบสาธารณะ

โค้ดนี้วางโครงสร้าง transaction ทั้ง `/bank` เพื่อให้ยอดและประวัติเปลี่ยนพร้อมกัน เหมาะกับงานบัญชีสมาชิกขนาดเล็ก หากข้อมูลโตมากหรือมีผู้ดูแลบันทึกพร้อมกันจำนวนมาก ต้องประเมินประสิทธิภาพและโครงสร้างจัดเก็บใหม่ก่อนขยายระบบ

อ้างอิงทางการ: [เพิ่ม Firebase ในเว็บ](https://firebase.google.com/docs/web/setup), [Callable Functions](https://firebase.google.com/docs/functions/callable), [Rules และ query](https://firebase.google.com/docs/database/security/rules-conditions), [Custom claims](https://firebase.google.com/docs/auth/admin/custom-claims), [Node runtime](https://firebase.google.com/docs/functions/manage-functions)

รุ่นที่ระบุในชุดนี้: Firebase JS 13.1.0, firebase-functions 7.4.0, firebase-admin 14.5.0 ตรวจจากเอกสารและ release notes ทางการเมื่อ 22 ตุลาคม 2026 ฝั่ง Functions ต้องติดตั้ง dependencies ก่อน deploy
