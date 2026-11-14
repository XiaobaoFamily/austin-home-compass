import test from 'node:test';
import assert from 'node:assert/strict';
import { signInWithUsername, usernameToAuthEmail, USERNAME_PATTERN } from '../src/auth.ts';

test('username normalization yields one stable Supabase identity',()=>{
 assert.equal(usernameToAuthEmail(' ZhenWei_01 '),'zhenwei_01@accounts.home-compass.invalid');
 assert.equal(usernameToAuthEmail('ZhenWei_01'),usernameToAuthEmail('zhenwei_01'));
});

test('reject email addresses, invalid characters and out-of-range usernames',()=>{
 for(const username of ['ab','a'.repeat(33),'user@example.com','with space','../admin','_admin','中文用户名','user\nname']){
  assert.throws(()=>usernameToAuthEmail(username));
 }
});

test('Supabase receives the internal identity and exact unmodified password',async()=>{
 let credentials;
 const password='  A 密码 with spaces!  ';
 const auth={signInWithPassword:async input=>{credentials=input;return {data:{session:null},error:null}}};
 await signInWithUsername(auth,'ZhenWei',password);
 assert.deepEqual(credentials,{email:'zhenwei@accounts.home-compass.invalid',password});
 assert.throws(()=>signInWithUsername(auth,'bad@name',password));
});

test('browser pattern accepts supported usernames under HTML UnicodeSets rules',()=>{
 const pattern=new RegExp(`^${USERNAME_PATTERN}$`,'v');
 assert.ok(pattern.test('abc'));
 assert.ok(pattern.test('a'.repeat(32)));
 assert.ok(pattern.test('ZhenWei-01_test'));
 assert.ok(!pattern.test('user@example.com'));
});
