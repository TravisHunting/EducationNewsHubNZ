import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {claimHour,HOUR_MS} from '../collector/hourly-gate.mjs';
import {POST} from '../app/api/refresh/route';

test('hourly gate survives new handles and enforces exact rolling boundary',()=>{
 const db=new DatabaseSync(':memory:');
 // Execute immediately, like Durable Object SqlStorage, including non-read SQL.
 const adapter={exec:(query:string,...args:number[])=>{const rows=db.prepare(query).all(...args);return {toArray:()=>rows}}};
 const now=1_800_000_000_000;
 assert.equal(claimHour(adapter,now),true);
 for(let i=0;i<100;i++)assert.equal(claimHour(adapter,now+i),false);
 assert.equal(claimHour({...adapter},now+HOUR_MS-1),false);
 assert.equal(claimHour({...adapter},now+HOUR_MS),true);
 assert.equal(claimHour(adapter,now+HOUR_MS),false);
 db.close();
});
test('migration honors a recent check and cannot reset an established gate',()=>{
 const db=new DatabaseSync(':memory:');
 const sql={exec:(query:string,...args:number[])=>{const rows=db.prepare(query).all(...args);return {toArray:()=>rows}}};
 const now=1_800_000_000_000;
 assert.equal(claimHour(sql,now,now-1000),false);
 assert.equal(claimHour(sql,now+HOUR_MS-1001,0),false);
 assert.equal(claimHour(sql,now+HOUR_MS-1000,0),true);
 db.close();
});
test('public refresh never makes an outgoing request',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('Unexpected collection')};
 try{const results=await Promise.all(Array.from({length:50},()=>POST()));assert.ok(results.every(r=>r.status===405));assert.equal(calls,0)}finally{globalThis.fetch=original}
});
