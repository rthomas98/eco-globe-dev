import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const require=createRequire(new URL('../packages/backend/package.json',import.meta.url));const sql=require('mssql');
assert.match(process.env.AZURE_SQL_CONNECTION_STRING??'',/^Server=127\.0\.0\.1,/);
const pool=await new sql.ConnectionPool(process.env.AZURE_SQL_CONNECTION_STRING).connect();
let phase='ownership';
try{
 const owner=(await pool.request().query('SELECT DB_NAME() db,Token FROM dbo.OrcaOwner')).recordset[0];assert.equal(owner.db,process.env.ORCA_SQL_DATABASE);assert.equal(owner.Token,process.env.ORCA_SQL_MARKER);
 const fixture=JSON.parse(await readFile(process.env.ORCA_ANA_FIXTURE,'utf8'));assert.equal(fixture.database,owner.db);
 const origin=process.env.ECOGLOBE_API_BASE_URL;assert.match(origin,/^http:\/\/127\.0\.0\.1:\d+$/);
 async function call(path,method='GET',body,token,status=200){const r=await fetch(origin+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});const b=await r.json();assert.equal(r.status,status,`${phase} ${path}: ${b.error??r.status}`);return b;}
 const login=async role=>(await call('/auth/login','POST',{email:fixture[role].email,password:fixture.password,role})).token;
 const buyer=await login('buyer'),seller=await login('seller'),admin=await login('admin');

 phase='tracker';
 await call('/api/tracker?role=buyer','GET',undefined,undefined,401);
 await call('/api/tracker?role=invalid','GET',undefined,buyer,400);
 const b=await call('/api/tracker?role=buyer','GET',undefined,buyer);
 const s=await call('/api/tracker?role=seller','GET',undefined,seller);
 assert.ok(b.listings.length);assert.ok(s.listings.length);
 for(const row of b.samples){const own=(await pool.request().input('id',sql.Int,row.id).query('SELECT BuyerCompanyId id FROM dbo.SampleRequests WHERE Id=@id')).recordset[0];assert.equal(own.id,fixture.buyer.companyId);}
 assert.ok(b.samples.some(r=>r.status==='delivered'));
 assert.ok(b.samples.some(r=>r.status==='declined'));
 const privateLabs=(await pool.request().query("SELECT Id FROM dbo.LabRequests WHERE Sharing='private'")).recordset.map(r=>r.Id);
 assert.ok(!s.labs.some(r=>privateLabs.includes(r.id)));
 assert.ok(!JSON.stringify(s).includes('buyerCompanyName'));
 phase='summary document';
 const doc=await fetch(origin+`/api/tracker/samples/${b.samples[0].id}/document`,{headers:{Authorization:`Bearer ${buyer}`}});assert.equal(doc.status,200);assert.equal(doc.headers.get('content-type'),'application/pdf');assert.ok((await doc.arrayBuffer()).byteLength>500);
 await call('/api/tracker/samples/2147483647/document','GET',undefined,buyer,404);
 console.log(JSON.stringify({passed:true,buyerListings:b.listings.length,sellerListings:s.listings.length,checks:['authentication','role validation','company sample isolation','private lab isolation','delivered and refunded state projection']}));
}catch(e){console.error(`${phase}: ${e.message}`);process.exitCode=1;}finally{await pool.close();}
