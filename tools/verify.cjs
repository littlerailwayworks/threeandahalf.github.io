// Local source checks. Simulated DOM only: never contacts Google or GitHub.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),code=fs.readFileSync(path.join(root,'adsense.js'),'utf8');
let passes=0;
function check(name,fn){fn();passes++;console.log('PASS '+name);}
function fixture(config,privacy=false){
 class Element{
  constructor(hidden=false){this.hidden=hidden;this.attrs={};this.children=[];this.listeners={};}
  setAttribute(k,v){this.attrs[k]=v;} getAttribute(k){return this.attrs[k]||null;}
  appendChild(el){this.children.push(el);return el;} addEventListener(k,fn){this.listeners[k]=fn;}
 }
 const head=new Element(),house=new Element(),host=new Element(true),choices=new Element(true),enabled=new Element(true),disabled=new Element();
 const elements={'house-ad':house,'google-ad-host':host,'privacy-choices':choices};
 if(privacy){delete elements['house-ad'];delete elements['google-ad-host'];}
 const timers=[],observers=[];
 const window={STUDIO_ADSENSE:config,setTimeout:fn=>timers.push(fn)};
 const document={head,createElement:()=>new Element(),getElementById:id=>elements[id]||null,querySelectorAll:s=>s==='[data-ads-enabled]'?[enabled]:[disabled]};
 class MutationObserver{constructor(fn){observers.push(fn);}observe(){}}
 vm.runInNewContext(code,{window,document,MutationObserver});
 return{window,head,house,host,choices,enabled,disabled,timers,observers};
}
const valid={enabled:true,client:'ca-pub-'+'1'.repeat(16),slot:'1234567890'};
check('Disabled configuration makes no advertising requests',()=>{const f=fixture({...valid,enabled:false});assert.equal(f.head.children.length,0);assert.equal(f.house.hidden,false);});
check('Missing configuration makes no advertising requests',()=>assert.equal(fixture(undefined).head.children.length,0));
check('Invalid publisher and slot cannot load a remote script',()=>{for(const x of [{...valid,client:'bad'},{...valid,slot:'<invalid>'}])assert.equal(fixture(x).head.children.length,0);});
check('Enabled banner requests exactly one loader and one ad',()=>{const f=fixture(valid);assert.equal(f.head.children.length,1);assert.equal(f.host.children.length,1);assert.equal(f.window.adsbygoogle.length,1);assert.equal(f.host.children[0].getAttribute('data-ad-client'),valid.client);assert.equal(f.house.hidden,true);});
check('Ad load error restores house advertisement',()=>{const f=fixture(valid);f.head.children[0].onerror();assert.equal(f.house.hidden,false);assert.equal(f.host.hidden,true);});
check('Unfilled ad restores fallback, later fill replaces it without a new request',()=>{const f=fixture(valid);f.host.children[0].setAttribute('data-ad-status','unfilled');f.observers[0]();assert.equal(f.house.hidden,false);f.host.children[0].setAttribute('data-ad-status','filled');f.observers[0]();assert.equal(f.house.hidden,true);assert.equal(f.host.hidden,false);assert.equal(f.window.adsbygoogle.length,1);});
check('Stalled ad times out without re-requesting, and can accept late fill',()=>{const f=fixture(valid);assert.equal(f.timers.length,1);f.timers[0]();assert.equal(f.house.hidden,false);f.host.children[0].setAttribute('data-ad-status','filled');f.observers[0]();assert.equal(f.house.hidden,true);assert.equal(f.window.adsbygoogle.length,1);});
check('A filled ad is not hidden by the timeout',()=>{const f=fixture(valid);f.host.children[0].setAttribute('data-ad-status','filled');f.timers[0]();assert.equal(f.host.hidden,false);});
check('Google consent control stays hidden until the real API is available',()=>{const f=fixture(valid);assert.equal(f.choices.hidden,true);const ready=f.window.googlefc.callbackQueue[0].CONSENT_API_READY;ready();assert.equal(f.choices.hidden,true);let opened=0;f.window.googlefc.showRevocationMessage=()=>opened++;ready();assert.equal(f.choices.hidden,false);f.choices.listeners.click();f.window.googlefc.callbackQueue[1].CONSENT_API_READY();assert.equal(opened,1);});
check('Privacy page loads consent support but requests no display ad',()=>{const f=fixture(valid,true);assert.equal(f.head.children.length,1);assert.equal(f.window.adsbygoogle,undefined);assert.equal(f.enabled.hidden,false);assert.equal(f.disabled.hidden,true);});
const reports={adLogicChecks:passes,allPassed:true,realNetworkRequests:0,browserRenderingTested:false,liveAdSenseTested:false};
fs.writeFileSync(path.join(root,'verification.json'),JSON.stringify(reports,null,2)+'\n');
console.log(JSON.stringify(reports));
