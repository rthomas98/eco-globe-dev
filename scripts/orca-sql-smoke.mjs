/** Real local SQL/API smoke. Invoke only through orca-sql.py smoke. */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { open } from 'node:fs/promises';
import { constants } from 'node:fs';
const require = createRequire(new URL('../packages/backend/package.json', import.meta.url));
const sql = require('mssql');
const dbName = process.env.ORCA_SQL_DATABASE;
const marker = process.env.ORCA_SQL_MARKER;
const connection = process.env.AZURE_SQL_CONNECTION_STRING;
let pool;
let fixture;
let child;
let phase = 'database connection and private fixture';
try {
  assert.match(dbName ?? '', /^eco_[a-f0-9]{24}$/);
  assert.match(marker ?? '', /^[a-f0-9]{64}$/);
  assert.ok(connection?.startsWith('Server=127.0.0.1,'));
  fixture = await open(process.env.ORCA_SQL_SMOKE_RECEIPT, constants.O_RDWR | constants.O_NOFOLLOW);
  const info = await fixture.stat();
  assert.ok(info.isFile() && info.uid === process.getuid() && !(info.mode & 0o077) && info.nlink === 1);
  pool = await new sql.ConnectionPool(connection).connect();
  const identity = await pool.request().query('SELECT DB_NAME() AS db, Token FROM dbo.OrcaOwner');
  assert.equal(identity.recordset[0].db, dbName);
  assert.equal(identity.recordset[0].Token, marker);
  const privileges = await pool.request().query("SELECT IS_SRVROLEMEMBER('sysadmin') AS sa, IS_MEMBER('db_owner') AS owner, HAS_DBACCESS('model') AS modelAccess");
  assert.equal(privileges.recordset[0].sa, 0);
  assert.equal(privileges.recordset[0].owner, 0);
  assert.equal(privileges.recordset[0].modelAccess, 0);
  const name = 'Orca persistence ' + dbName + ' ' + randomBytes(8).toString('hex');
  if (process.argv.includes('--persistence')) {
    phase = 'restart persistence';
    const saved = JSON.parse(await fixture.readFile('utf8'));
    assert.equal(saved.database, dbName);
    assert.ok(Number.isSafeInteger(saved.id) && saved.id > 0);
    assert.equal(typeof saved.name, 'string');
    const result = await pool.request().input('name', sql.NVarChar, saved.name).input('id', sql.Int, saved.id).query('SELECT Id FROM dbo.Companies WHERE LegalName=@name AND Id=@id');
    assert.equal(result.recordset.length, 1);
    console.log(JSON.stringify({ persistence: true, database: dbName, companyId: result.recordset[0].Id }));
  } else {
    phase = 'existing development auth fixture';
    process.env.ECOGLOBE_DEMO_PASSWORD = 'Eg9!' + randomBytes(32).toString('hex');
    const { seedDemoAuthAccounts } = await import('../packages/backend/src/auth.ts');
    await seedDemoAuthAccounts();
    child = spawn(process.execPath, ['--import', require.resolve('tsx'), 'src/index.ts'], {
      cwd: new URL('../packages/backend', import.meta.url), env: process.env, stdio: 'ignore',
    });
    const origin = process.env.ECOGLOBE_API_BASE_URL;
    assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
    phase = 'API readiness';
    let ready = false;
    for (let i=0; i<100; i++) {
      try { ready = (await fetch(origin+'/health')).ok; } catch { /* startup */ }
      if (ready) break;
      if (child.exitCode !== null) throw new Error('API exited');
      await new Promise(resolve => setTimeout(resolve,100));
    }
    assert.ok(ready);
    async function call(path, method='GET', body, token, status=200) {
      const response = await fetch(origin+path, { method, headers: {
        'content-type':'application/json', ...(token ? {authorization:'Bearer '+token} : {}),
      }, ...(body ? {body:JSON.stringify(body)} : {}) });
      assert.equal(response.status,status, phase+' HTTP status');
      return response.json();
    }
    phase = 'auth and unauthenticated rejection';
    const admin = await call('/auth/login','POST',{email:'demo.admin@ecoglobe.com',password:process.env.ECOGLOBE_DEMO_PASSWORD,role:'admin'});
    const buyer = await call('/auth/login','POST',{email:'demo.buyer@ecoglobe.com',password:process.env.ECOGLOBE_DEMO_PASSWORD,role:'buyer'});
    assert.equal((await call('/auth/session','GET',undefined,admin.token)).user.activeRoleCode,'admin');
    await call('/api/companies','POST',{legalName:'Rejected',companyTypeCode:'seller'},undefined,401);
    phase = 'company create and direct SQL read';
    const company = (await call('/api/companies','POST',{legalName:name,companyTypeCode:'seller'},admin.token,201)).company;
    assert.equal((await pool.request().input('id',sql.Int,company.id).query('SELECT LegalName FROM dbo.Companies WHERE Id=@id')).recordset[0].LegalName,name);
    phase = 'tenant isolation';
    assert.ok(!(await call('/api/companies','GET',undefined,buyer.token)).companies.some(row=>row.id===company.id));
    await call('/api/companies/'+company.id,'PATCH',{legalName:'Forbidden'},buyer.token,403);
    phase = 'update and delete semantics';
    await call('/api/companies/'+company.id,'PATCH',{legalName:name+' updated'},admin.token);
    assert.equal((await pool.request().input('id',sql.Int,company.id).query('SELECT LegalName FROM dbo.Companies WHERE Id=@id')).recordset[0].LegalName,name+' updated');
    await call('/api/companies/'+company.id,'PATCH',{legalName:name},admin.token);
    await call('/api/companies/'+company.id,'DELETE',undefined,admin.token);
    const deleted=await pool.request().input('id',sql.Int,company.id).query('SELECT s.Code FROM dbo.Companies c JOIN dbo.AccountStatuses s ON c.VerificationStatusId=s.Id WHERE c.Id=@id');
    assert.equal(deleted.recordset[0].Code,'inactive');
    phase = 'logout revocation';
    for (const session of [admin,buyer]) {
      await call('/auth/logout','POST',undefined,session.token);
      await call('/auth/session','GET',undefined,session.token,401);
    }
    const saved = JSON.stringify({database:dbName, id:company.id, name});
    await fixture.write(saved, 0, 'utf8');
    await fixture.truncate(Buffer.byteLength(saved));
    await fixture.sync();
    console.log(JSON.stringify({apiCrud:true,auth:true,tenantIsolation:true,scopedDatabaseUser:true,database:dbName,companyId:company.id,persistenceFixtureRetained:true}));
  }
} catch {
  console.error('Local SQL smoke failed at: '+phase+'; details withheld to protect credentials');
  process.exitCode=1;
} finally {
  if (child && child.exitCode === null) {
    child.kill('SIGTERM');
    const timer=setTimeout(()=>child.kill('SIGKILL'),5000);
    await once(child,'exit');
    clearTimeout(timer);
  }
  try {
    await pool?.close();
    await sql.close();
    await fixture?.close();
  } catch {
    console.error('Local SQL smoke cleanup failed; diagnostics withheld');
    process.exitCode=1;
  }
}
