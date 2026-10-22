const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const core=require('../core.js');
const source=fs.readFileSync(require('node:path').resolve(__dirname,'../service.js'),'utf8').replaceAll('import(base +','testImport(base +');
const events=new Map();let authCallback;const auth={currentUser:null};let role='member';
const modules={
 initializeApp:()=>({}),getAuth:()=>auth,getDatabase:()=>({}),getFunctions:()=>({}),setPersistence:async()=>{},browserSessionPersistence:{},
 onIdTokenChanged:(a,cb)=>{authCallback=cb;queueMicrotask(()=>cb(null));},
 getIdTokenResult:async()=>({claims:role==='admin'?{admin:true}:{accountCode:'100001'}}),
 ref:(db,path)=>path,query:(ref,...parts)=>ref,orderByChild:()=>null,equalTo:()=>null,
 onValue:(ref,cb,error)=>{const listener={cb,error};events.set(ref,listener);if(ref==='.info/connected')queueMicrotask(()=>cb({val:()=>true}));return()=>{};},
 signInWithEmailAndPassword:async()=>{auth.currentUser={uid:'real-'+role,email:'user@example.test'};const user=auth.currentUser;setTimeout(()=>authCallback(user),15);return{user};},
 signOut:async()=>{auth.currentUser=null;authCallback(null);}
};
const window={TaeCore:core,TAEBANK_CONFIG:{mode:'firebase',firebase:{apiKey:'x',authDomain:'x',databaseURL:'x',projectId:'x',appId:'x'}},navigator:{onLine:true},crypto:require('node:crypto'),console,setTimeout,clearTimeout,addEventListener(){}};
vm.runInNewContext(source,{window,navigator:window.navigator,console,testImport:async()=>modules});
const service=window.TaeService;
function emit(path,value){events.get(path).cb({val:()=>value,exists:()=>value!=null});}
(async()=>{
 await service.init();
 const signIn=await service.signIn({email:'user@example.test',password:'fixture'});
 assert.equal(signIn.uid,'real-member');assert.equal(service.getSnapshot().connection,'loading');assert.equal(service.getSnapshot().dataReady,false);
 const oldMember=events.get('bank/members/100001'),oldTx=events.get('bank/transactions');
 emit('bank/members/100001',{code:'100001',name:'Test'});assert.equal(service.getSnapshot().connection,'loading');
 emit('.info/connected',true);assert.equal(service.getSnapshot().connection,'loading');assert.equal(service.getSnapshot().dataReady,false);
 emit('bank/transactions',{});assert.equal(service.getSnapshot().connection,'online');assert.equal(service.getSnapshot().dataReady,true);
 emit('.info/connected',false);assert.equal(service.getSnapshot().connection,'offline');
 emit('.info/connected',true);assert.equal(service.getSnapshot().connection,'online');
 await service.signOut();oldMember.cb({val:()=>({code:'100001'}),exists:()=>true});oldTx.error({code:'PERMISSION_DENIED'});
 assert.equal(service.getSnapshot().session,null);assert.equal(service.getSnapshot().warning,'');assert.equal(service.getSnapshot().dataReady,false);
 role='admin';await service.signIn({email:'admin@example.test',password:'fixture'});assert.equal(service.getSnapshot().connection,'loading');
 emit('.info/connected',true);assert.equal(service.getSnapshot().connection,'loading');
 emit('.info/connected',false);emit('bank',null);assert.equal(service.getSnapshot().connection,'offline');assert.equal(service.getSnapshot().dataReady,true);
 emit('.info/connected',true);assert.equal(service.getSnapshot().connection,'online');
 console.log('PASS Firebase mocked timing: delayed Auth event UID wait; member+transactions readiness; transport cannot release loading; disconnect/reconnect; stale generation callbacks; admin empty DB normalization.');
})().catch(cause=>{console.error(cause);process.exitCode=1;});
