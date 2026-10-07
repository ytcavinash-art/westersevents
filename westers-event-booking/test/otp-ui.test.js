import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../../assets/js/booking.js', import.meta.url),'utf8');
function setup() {
 const nodes=new Map();
 function element() {
  const classes=new Set();
  return {value:'',hidden:false,disabled:false,readOnly:false,textContent:'',dataset:{},handlers:{},
   classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x,on){if(on)classes.add(x);else classes.delete(x);}},
   addEventListener(event,fn){this.handlers[event]=fn;}, setAttribute(){},removeAttribute(){},focus(){},select(){},replaceChildren(){},
   querySelector:selector=>get(selector),requestSubmit(){this.handlers.submit({preventDefault(){},target:this});}
  };
 }
 const get=selector=>{if(!nodes.has(selector))nodes.set(selector,element());return nodes.get(selector);};
 get('#continueBtn').hidden=true;
 const inputs=Array.from({length:4},element);
 const root={querySelector:get,querySelectorAll:selector=>selector==='.otp-box'?inputs:[]};
 let resolve;
 const response=new Promise(r=>resolve=r);
 const context=vm.createContext({document:{querySelector:()=>root,createElement:element},matchMedia:()=>({matches:true}),setTimeout:fn=>queueMicrotask(fn),setInterval:()=>0,clearInterval(){},AbortSignal,fetch:()=>response,Date,console});
 vm.runInContext(source.replace(/^import .*\n/, 'const BOOKING_API_BASE = \"\";\n'),context);
 return {context,get,inputs,resolve};
}
const flush=async()=>{for(let i=0;i<25;i++)await Promise.resolve();};
test('fourth digit submits once; waiting stays neutral until backend approval',async()=>{
 const ui=setup();vm.runInContext("fillDigits('123',0)",ui.context);
 assert.equal(ui.get('.orbit-area').dataset.state,'idle');
 vm.runInContext("fillDigits('4',3)",ui.context);await flush();
 assert.equal(ui.get('.orbit-area').dataset.state,'waiting');
 assert.equal(ui.get('#continueBtn').hidden,true);
 assert(ui.inputs.every(x=>x.readOnly));
 ui.resolve({ok:true,headers:{get:()=> 'application/json'},json:async()=>({ok:true})});await flush();
 assert.equal(ui.get('.orbit-area').dataset.state,'verified');
 assert.equal(ui.get('#verifyBtn').hidden,true);
});
test('invalid OTP restores editable row without a verified tile',async()=>{
 const ui=setup();vm.runInContext("fillDigits('1234',0)",ui.context);
 ui.resolve({ok:false,headers:{get:()=> 'application/json'},json:async()=>({message:'Invalid OTP'})});await flush();
 assert.equal(ui.get('.orbit-area').dataset.state,'error');
 assert(ui.inputs.every(x=>!x.readOnly && x.value===''));
 assert.equal(ui.get('#statusMessage').textContent,'Invalid OTP');
});
test('paste distributes four digits from any box and submits; non-digits do not submit',async()=>{
 const ui=setup();vm.runInContext("fillDigits('abc',0)",ui.context);
 assert.equal(ui.get('.orbit-area').dataset.state,'idle');
 vm.runInContext("fillDigits('12 34',2)",ui.context);
 assert.equal(ui.inputs.map(x=>x.value).join(''),'1234');
 assert.equal(ui.get('.orbit-area').dataset.state,'curling');
 ui.resolve({ok:false,headers:{get:()=> 'application/json'},json:async()=>({message:'Test rejection'})});await flush();
});
