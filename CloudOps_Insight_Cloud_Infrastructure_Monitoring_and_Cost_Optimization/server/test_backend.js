/**
 * test_backend.js — full end-to-end test suite for CloudOps Insight API
 * Run: node test_backend.js
 */
const http = require('http');

const BASE = 'http://localhost:3001';
let passed = 0;
let failed = 0;
let adminToken = '';
let viewerToken = '';

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url  = new URL(BASE + path);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname,
      port:     url.port || 80,
      path:     url.pathname + url.search,
      method,
      headers: {
        'Content-Type':  'application/json',
        'Content-Length': data ? Buffer.byteLength(data) : 0,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    const req = http.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const GET   = (path, token)       => request('GET',   path, null, token);
const POST  = (path, body, token) => request('POST',  path, body, token);
const PATCH = (path, body, token) => request('PATCH', path, body, token);

// ── Assertion helpers ─────────────────────────────────────────────────────────

function ok(label) {
  console.log(`  ✓ ${label}`);
  passed++;
}
function fail(label, detail) {
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  failed++;
}
function assert(label, condition, detail) {
  condition ? ok(label) : fail(label, detail);
}
function assertEq(label, actual, expected) {
  actual === expected
    ? ok(label)
    : fail(label, `got "${actual}", expected "${expected}"`);
}

// ── Test sections ─────────────────────────────────────────────────────────────

async function testHealth() {
  console.log('\n[1] Health');
  const r = await GET('/health');
  assertEq('GET /health → ok', r.body.status, 'ok');
}

async function testAuth() {
  console.log('\n[2] Auth');

  // Admin login
  const r1 = await POST('/api/auth/login', { email: 'admin@cloudops.io', password: 'admin123' });
  assertEq('Admin login HTTP 200',    r1.status, 200);
  assertEq('Admin role is admin',     r1.body.user?.role, 'admin');
  assertEq('Admin name',              r1.body.user?.name, 'Alex Morgan');
  assert('Admin token issued',        r1.body.token?.length > 20, 'no token');
  adminToken = r1.body.token;

  // Viewer login
  const r2 = await POST('/api/auth/login', { email: 'viewer@cloudops.io', password: 'viewer123' });
  assertEq('Viewer login HTTP 200',   r2.status, 200);
  assertEq('Viewer role is viewer',   r2.body.user?.role, 'viewer');
  viewerToken = r2.body.token;

  // Wrong password
  const r3 = await POST('/api/auth/login', { email: 'admin@cloudops.io', password: 'wrong' });
  assertEq('Wrong password → 401',    r3.status, 401);

  // Unknown user
  const r4 = await POST('/api/auth/login', { email: 'nobody@x.com', password: 'abc' });
  assertEq('Unknown user → 401',      r4.status, 401);

  // Auth guard
  const r5 = await GET('/api/resources');
  assertEq('No token → 401',          r5.status, 401);

  // Signup
  const ts  = Date.now();
  const r6  = await POST('/api/auth/signup', { name: 'Test User', email: `test${ts}@cloudops.io`, password: 'test123' });
  assertEq('Signup HTTP 201',         r6.status, 201);
  assertEq('Signup role is viewer',   r6.body.user?.role, 'viewer');
  assert('Signup token issued',       r6.body.token?.length > 20, 'no token');

  // Duplicate email
  const r7 = await POST('/api/auth/signup', { name: 'Dup', email: 'admin@cloudops.io', password: 'test123' });
  assertEq('Duplicate email → 409',   r7.status, 409);

  // Too-short password
  const r8 = await POST('/api/auth/signup', { name: 'Short', email: `short${ts}@x.com`, password: '12' });
  assertEq('Short password → 400',    r8.status, 400);
}

async function testResources() {
  console.log('\n[3] Resources');
  const t = adminToken;

  const r1 = await GET('/api/resources', t);
  assertEq('GET /api/resources HTTP 200',  r1.status, 200);
  assertEq('Returns 30 resources',         r1.body.length, 30);

  const r2 = await GET('/api/resources?type=EC2', t);
  assertEq('Filter type=EC2',              r2.status, 200);
  assert('EC2 results > 0',               r2.body.length > 0, `got ${r2.body.length}`);
  assert('All results are EC2',           r2.body.every(x => x.type === 'EC2'), 'type mismatch');

  const r3 = await GET('/api/resources?status=stopped', t);
  assert('Filter status=stopped > 0',     r3.body.length > 0, `got ${r3.body.length}`);

  const r4 = await GET('/api/resources?region=eu-west-1', t);
  assert('Filter region eu-west-1 > 0',   r4.body.length > 0, `got ${r4.body.length}`);

  const r5 = await GET('/api/resources?search=prod-db', t);
  assert('Search prod-db returns results', r5.body.length > 0, `got ${r5.body.length}`);

  const r6 = await GET('/api/resources/r01', t);
  assertEq('GET /api/resources/r01',      r6.body.name, 'prod-web-01');
  assert('Resource has tags object',      typeof r6.body.tags === 'object', 'no tags');

  const r7 = await GET('/api/resources/nonexistent', t);
  assertEq('Missing resource → 404',      r7.status, 404);
}

async function testMetrics() {
  console.log('\n[4] Metrics');
  const t = adminToken;

  const r1 = await GET('/api/metrics/r01?window=24h', t);
  assertEq('Metrics 24h HTTP 200',       r1.status, 200);
  assert('Metrics 24h has points',       r1.body.length > 0, `got ${r1.body.length}`);
  const pt = r1.body[0];
  assert('Point has cpu',                pt.cpu    !== undefined, 'no cpu');
  assert('Point has memory',             pt.memory !== undefined, 'no memory');
  assert('Point has networkIn',          pt.networkIn !== undefined, 'no networkIn');
  assert('Point has timestamp',          pt.timestamp > 0, 'bad timestamp');

  const r2 = await GET('/api/metrics/r06?window=7d', t);
  assert('Metrics 7d has points',        r2.body.length > 0, `got ${r2.body.length}`);

  const r3 = await GET('/api/metrics/r08?window=30d', t);
  assert('Metrics 30d has points',       r3.body.length > 0, `got ${r3.body.length}`);

  const r4 = await GET('/api/metrics/r01?window=bad', t);
  assertEq('Bad window → 400',           r4.status, 400);

  const r5 = await GET('/api/metrics/nonexistent?window=24h', t);
  assertEq('Missing resource metrics → 404', r5.status, 404);
}

async function testCosts() {
  console.log('\n[5] Costs');
  const t = adminToken;

  const r1 = await GET('/api/costs?days=30', t);
  assertEq('Costs 30d HTTP 200',         r1.status, 200);
  assert('Costs has entries',            r1.body.length > 0, `got ${r1.body.length}`);
  const e = r1.body[0];
  assert('Entry has date',               !!e.date, 'no date');
  assert('Entry has resourceId',         !!e.resourceId, 'no resourceId');
  assert('Entry has serviceType',        !!e.serviceType, 'no serviceType');
  assert('Entry has cost',               e.cost >= 0, 'no cost');

  const r2 = await GET('/api/costs/monthly', t);
  assertEq('Monthly HTTP 200',           r2.status, 200);
  assert('Monthly has entries',          r2.body.length > 0, `got ${r2.body.length}`);
  const m = r2.body[r2.body.length - 1];
  assert('Monthly has byService',        !!m.byService, 'no byService');
  assert('Monthly has byRegion',         !!m.byRegion, 'no byRegion');
  assert('Monthly total > 0',            m.total > 0, `total=${m.total}`);
  assert('Monthly EC2 exists',           m.byService.EC2 !== undefined, 'no EC2');
  console.log(`       Latest: ${m.month} total=$${m.total} EC2=$${m.byService.EC2} RDS=$${m.byService.RDS}`);
}

async function testRecommendations() {
  console.log('\n[6] Recommendations');
  const t = adminToken;

  const r1 = await GET('/api/recommendations', t);
  assertEq('Recommendations HTTP 200',   r1.status, 200);
  assert('Has recommendations',          r1.body.length > 0, `got ${r1.body.length}`);
  const rec = r1.body[0];
  assert('Rec has affectedResourceIds',  Array.isArray(rec.affectedResourceIds), 'no affectedResourceIds');
  assert('Rec has estimatedMonthlySavings', rec.estimatedMonthlySavings !== undefined, 'no savings');

  const open       = r1.body.filter(x => x.status === 'open');
  const totalSaved = open.reduce((s, x) => s + (x.estimatedMonthlySavings || 0), 0);
  assert('Some open recommendations',   open.length > 0, `got ${open.length}`);
  assert('Total savings > 0',           totalSaved > 0, `savings=${totalSaved}`);
  console.log(`       Open: ${open.length}  Total potential savings: $${totalSaved.toFixed(2)}`);

  const openRec = open[0];
  const r2 = await PATCH(`/api/recommendations/${openRec.id}`, { status: 'dismissed' }, t);
  assertEq('PATCH rec → dismissed',     r2.body.status, 'dismissed');

  const r3 = await PATCH(`/api/recommendations/${openRec.id}`, { status: 'resolved' }, t);
  assertEq('PATCH rec → resolved',      r3.body.status, 'resolved');
  assert('resolvedAt is set',           !!r3.body.resolvedAt, 'no resolvedAt');

  await PATCH(`/api/recommendations/${openRec.id}`, { status: 'open' }, t);

  const r4 = await PATCH(`/api/recommendations/${openRec.id}`, { status: 'INVALID' }, t);
  assertEq('Invalid PATCH status → 400', r4.status, 400);

  const r5 = await PATCH('/api/recommendations/nope', { status: 'open' }, t);
  assertEq('Missing rec PATCH → 404',   r5.status, 404);
}

async function testAnomalies() {
  console.log('\n[7] Anomalies');
  const t = adminToken;

  const r1 = await GET('/api/anomalies', t);
  assertEq('Anomalies HTTP 200',        r1.status, 200);
  assert('Has anomalies',               r1.body.length > 0, `got ${r1.body.length}`);
  const a = r1.body[0];
  assert('Anomaly has zScore',          a.zScore !== undefined, 'no zScore');
  assert('Anomaly has explanation',     a.explanation?.length > 0, 'no explanation');
  assert('Anomaly has percentChange',   a.percentChange !== undefined, 'no percentChange');

  const openAnoms = r1.body.filter(x => x.status === 'open');
  assert('Some open anomalies',         openAnoms.length > 0, `got ${openAnoms.length}`);
  console.log(`       Total: ${r1.body.length}  Open: ${openAnoms.length}`);

  const anom = openAnoms[0];
  const r2 = await PATCH(`/api/anomalies/${anom.id}`, { status: 'acknowledged' }, t);
  assertEq('PATCH anomaly → acknowledged', r2.body.status, 'acknowledged');

  const r3 = await PATCH(`/api/anomalies/${anom.id}`, { status: 'resolved' }, t);
  assertEq('PATCH anomaly → resolved',  r3.body.status, 'resolved');

  await PATCH(`/api/anomalies/${anom.id}`, { status: 'open' }, t);

  const r4 = await PATCH(`/api/anomalies/${anom.id}`, { status: 'BAD' }, t);
  assertEq('Invalid anomaly status → 400', r4.status, 400);
}

async function testReports() {
  console.log('\n[8] Reports');
  const t = adminToken;

  const r1 = await GET('/api/reports', t);
  assertEq('Reports HTTP 200',         r1.status, 200);
  assertEq('Exactly 5 reports',        r1.body.length, 5);

  const expectedIds = ['rpt-cost-monthly','rpt-utilization','rpt-idle','rpt-governance','rpt-anomalies'];
  for (const id of expectedIds) {
    const rd = await GET(`/api/reports/${id}/data`, t);
    assertEq(`Report ${id} HTTP 200`,  rd.status, 200);
    assert(`Report ${id} has rows`,    rd.body.length > 0, `got ${rd.body.length}`);
    console.log(`       ${id}: ${rd.body.length} rows`);
  }

  const r2 = await GET('/api/reports/nonexistent/data', t);
  assertEq('Missing report → 404',     r2.status, 404);
}

// ── Run all tests ─────────────────────────────────────────────────────────────

async function main() {
  console.log('\n==========================================');
  console.log(' CloudOps Insight — Backend Test Suite');
  console.log('==========================================');

  try {
    await testHealth();
    await testAuth();
    await testResources();
    await testMetrics();
    await testCosts();
    await testRecommendations();
    await testAnomalies();
    await testReports();
  } catch (err) {
    console.error('\nUnexpected error:', err.message);
    failed++;
  }

  console.log('\n==========================================');
  if (failed === 0) {
    console.log(` ✅  ALL ${passed} TESTS PASSED`);
  } else {
    console.log(` ❌  ${passed} passed, ${failed} FAILED`);
  }
  console.log('==========================================\n');
  process.exit(failed === 0 ? 0 : 1);
}

main();
