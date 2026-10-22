const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const core=require('../core.js');
const {convert}=require('../firebase/migrate-legacy.cjs');
const serviceSource=fs.readFileSync(path.resolve(__dirname,'../service.js'),'utf8');
function browser(blocked=false){
 const storage=new Map();
 const window={TaeCore:core,TAEBANK_CONFIG:{mode:'demo'},crypto:require('node:crypto'),navigator:{onLine:true},console,
 localStorage:{getItem:k=>{if(blocked)throw Error('blocked');return storage.get(k)||null;},setItem:(k,v)=>{if(blocked)throw Error('blocked');storage.set(k,v);}},addEventListener(){}};
 vm.runInNewContext(serviceSource,{window,navigator:window.navigator,console});return window.TaeService;
}
(async()=>{
 const service=browser();let changes=0;service.subscribe(()=>changes++);
 assert.equal((await service.init()).mode,'demo');assert.equal(service.ready,true);assert.equal(service.getSnapshot().session,null);
 assert.equal(Object.keys(service.getSnapshot().state.members).length,0);
 await assert.rejects(service.signIn({email:'admin@example.com',password:'guess'}),/ทดลอง/);
 await service.signIn({demoRole:'member'});
 assert.equal(Object.keys(service.getSnapshot().state.members).length,1);
 assert.equal(Object.values(service.getSnapshot().state.transactions).every(tx=>tx.studentCode==='100001'),true);
 await assert.rejects(service.mutate({action:'member.save',idempotencyKey:'a'}),/ผู้ดูแล/);
 await service.signOut();await service.signIn({demoRole:'admin'});
 const before=core.balance(service.getSnapshot().state,'100001');
 const command={action:'transact',code:'100001',type:'deposit',amountSatang:12550,note:'ทดสอบ',idempotencyKey:'adapter-test-0001'};
 await Promise.all([service.mutate(command),service.mutate(command)]);
 assert.equal(core.balance(service.getSnapshot().state,'100001'),before+12550);
 const exported=JSON.parse(service.exportData());assert.equal(exported.schema,2);assert.equal(exported.bank.schemaVersion,2);
 await service.resetDemo();assert.equal(service.getSnapshot().session,null);assert.equal(changes>4,true);
 const blocked=browser(true);await blocked.init();assert.match(blocked.getSnapshot().warning,/บันทึก/);
 await blocked.signIn({demoRole:'admin'});await blocked.mutate(command);assert.equal(core.balance(blocked.getSnapshot().state,'100001'),before+12550);
 const migrated=convert({members:{100001:{name:'คนทดสอบ',nick:'ทดสอบ',pbPage:1,pbLine:25}},transactions:{old1:{studentCode:'100001',type:'deposit',amount:'125.50',date:'2025-01-01T00:00:00Z',printed:true}}});
 assert.equal(migrated.members['100001'].pbPage,2);assert.equal(migrated.members['100001'].pbLine,1);assert.equal(core.balance(migrated,'100001'),12550);assert.equal(!!migrated.transactions.old1.printedAt,true);
 assert.throws(()=>convert({members:{100001:{name:'ทดสอบ'}},transactions:{bad:{studentCode:'100001',type:'withdraw',amount:'1',date:'2025-01-01T00:00:00Z'}}}),/Negative/);
 assert.throws(()=>convert({members:{100001:{name:'ทดสอบ'}},transactions:{bad:{studentCode:'999999',type:'deposit',amount:'1',date:'2025-01-01T00:00:00Z'}}}),/missing member/);
 console.log('PASS adapter: auth gating, member privacy, admin authorization, concurrent idempotency, export/reset, storage fallback. PASS offline migration: satang, passbook, printed status, rejection checks.');
})().catch(error=>{console.error(error);process.exitCode=1;});
