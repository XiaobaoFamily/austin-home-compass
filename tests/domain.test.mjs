import test from 'node:test';
import assert from 'node:assert/strict';
import {monthlyCost,parseBackup} from '../src/domain.mjs';
test('mortgage matches known 30-year amortization',()=>{
 const x=monthlyCost(500000,20,6,30,12000,2400,50,1);
 assert.ok(Math.abs(x.principalInterest-2398.20)<.01);
 assert.ok(Math.abs(x.total-(2398.20+1000+200+50+5000/12))<.01);
});
test('zero-interest and full-cash purchase remain finite',()=>{
 assert.equal(monthlyCost(360000,0,0,30,0,0,0,0).total,1000);
 assert.equal(monthlyCost(360000,100,6,30,0,0,0,0).principalInterest,0);
});
const item={id:'example',address:'Example',url:'https://example.com',zip:'78729',price:600000,beds:4,status:'待研究',note:''};
test('backup restores valid listings, rejects unsafe links and incompatible data',()=>{
 assert.equal(parseBackup(JSON.stringify({version:1,listings:[item]})).length,1);
 for(const bad of [{...item,url:'javascript:alert(1)'},{...item,beds:3},{...item,price:-10}])assert.throws(()=>parseBackup(JSON.stringify({version:1,listings:[bad]})));
 assert.throws(()=>parseBackup(JSON.stringify({version:1,listings:[item,item]})));
 assert.throws(()=>parseBackup(JSON.stringify({version:2,listings:[]})));
});
