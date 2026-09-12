const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, deps) {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module:ts.ModuleKind.CommonJS, jsx:ts.JsxEmit.React, esModuleInterop:true}}).outputText;
  const exports = {};
  new Function('require', 'exports', output)(name => { if (!(name in deps)) throw Error(name); return deps[name]; }, exports);
  return exports;
}
let states = [], index = 0, overrides = [];
const react = {
  useState(initial) { const i=index++; states[i] = i in overrides ? overrides[i] : initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }]; },
  useEffect() {}, useRef: value => ({current:value}),
  createElement: (type, props, ...children) => ({type,props:props||{},children}),
};
const storage = new Map();
global.localStorage = {getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
let confirmed = false;
let resetRequest = null;
const supabase = {
  auth:{
    getSession:async()=>({data:{session:{access_token:'test-token'}}}),
    signUp:async()=>({data:{user:{id:'alice'},session:null},error:null}),
    resetPasswordForEmail:async(email, options)=>{resetRequest={email,options};return {data:{},error:null};},
  },
  from() { const builder = {select:()=>builder,eq:()=>builder,abortSignal:()=>builder,maybeSingle:async()=>({data:{id:'alice',is_premium:false},error:null})}; return builder; },
};
async function run() {
  const {useSession} = load('./src/utils/useSession.ts', {'react':react,'./supabaseClient':{supabase}});
  storage.set('smartchess_profile_alice',JSON.stringify({is_premium:false}));
  global.fetch = async()=>({ok:true,json:async()=>({is_premium:true})});
  const hook=useSession();
  assert.equal(await hook.fetchPremiumStatus({id:'alice',user_metadata:{}}),true);
  assert.equal(states[1],true,'server paid status overrides old unpaid cache');
  global.fetch=async()=>({ok:false});
  assert.equal(await hook.fetchPremiumStatus({id:'alice',user_metadata:{}}),false);
  assert.equal(states[1],null,'unknown access is not shown as unpaid');
  assert.match(states[4],/no new payment/);
  const AuthForm=load('./src/components/AuthForm.tsx', {'react':react,'lucide-react':{},'../utils/supabaseClient':{supabase},'../utils/authRedirect':{getAuthRedirectUrl:path=>'https://example.test'+path}}).default;
  states=[]; index=0; overrides=['signup','test@example.invalid','test-password','2000'];
  const tree=AuthForm({onAuthenticated:()=>{confirmed=true;}});
  function find(node) { if (!node || typeof node !== 'object') return; if (node.props?.onSubmit) return node; for(const child of node.children||[]) {const found=find(child); if(found)return found;} }
  await find(tree).props.onSubmit({preventDefault(){}});
  assert.equal(confirmed,false,'unconfirmed signup must not open checkout');
  assert.match(states[6],/Check your email/);
  states=[]; index=0; overrides=['forgot',' Test@Example.INVALID '];
  const forgotTree=AuthForm({});
  await find(forgotTree).props.onSubmit({preventDefault(){}});
  assert.equal(resetRequest.email,'test@example.invalid');
  assert.equal(resetRequest.options.redirectTo,'https://example.test/auth/reset-password');
  assert.match(states[6],/reset link/);
  console.log('PASS: cached entitlement, profile outage, unconfirmed signup, and password-reset regressions');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
