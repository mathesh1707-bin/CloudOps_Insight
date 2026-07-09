/**
 * seed.js — populate cloudops.db
 * Run: node seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db     = require('./db'); // initialises schema

function seededRng(seed) {
  let s = seed;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const RESOURCE_DEFS = [
  { id:'r01', name:'prod-web-01',        type:'EC2',          region:'us-east-1',      status:'running',    tier:'t3.xlarge',    cost:124.32, cpu:68, mem:74, up:99.97, tags:{env:'prod',team:'platform'} },
  { id:'r02', name:'prod-web-02',        type:'EC2',          region:'us-east-1',      status:'running',    tier:'t3.xlarge',    cost:124.32, cpu:71, mem:76, up:99.95, tags:{env:'prod',team:'platform'} },
  { id:'r03', name:'prod-api-01',        type:'EC2',          region:'us-east-1',      status:'warning',    tier:'c5.2xlarge',   cost:248.64, cpu:88, mem:82, up:99.81, tags:{env:'prod',team:'backend'}  },
  { id:'r04', name:'staging-web-01',     type:'EC2',          region:'us-west-2',      status:'running',    tier:'t3.medium',    cost:30.37,  cpu:12, mem:35, up:98.50, tags:{env:'staging',team:'platform'} },
  { id:'r05', name:'dev-worker-01',      type:'EC2',          region:'us-west-2',      status:'stopped',    tier:'t3.small',     cost:0,      cpu:0,  mem:0,  up:0,     tags:{env:'dev',team:'backend'}  },
  { id:'r06', name:'prod-db-01',         type:'RDS',          region:'us-east-1',      status:'running',    tier:'db.r5.2xlarge',cost:892.44, cpu:45, mem:68, up:99.99, tags:{env:'prod',team:'data'}    },
  { id:'r07', name:'prod-db-02',         type:'RDS',          region:'us-east-1',      status:'running',    tier:'db.r5.xlarge', cost:446.22, cpu:38, mem:61, up:99.99, tags:{env:'prod',team:'data'}    },
  { id:'r08', name:'prod-db-03',         type:'RDS',          region:'eu-west-1',      status:'critical',   tier:'db.r5.2xlarge',cost:892.44, cpu:93, mem:91, up:98.20, tags:{env:'prod',team:'data'}    },
  { id:'r09', name:'analytics-db',       type:'RDS',          region:'us-east-1',      status:'running',    tier:'db.r5.large',  cost:223.11, cpu:22, mem:44, up:99.90, tags:{env:'prod',team:'analytics'} },
  { id:'r10', name:'staging-db-01',      type:'RDS',          region:'us-west-2',      status:'running',    tier:'db.t3.medium', cost:56.16,  cpu:8,  mem:28, up:99.50, tags:{env:'staging',team:'data'} },
  { id:'r11', name:'assets-bucket',      type:'S3',           region:'us-east-1',      status:'running',    tier:'Standard',     cost:48.72,  cpu:0,  mem:0,  up:100,   tags:{env:'prod',team:'platform'} },
  { id:'r12', name:'logs-bucket',        type:'S3',           region:'us-east-1',      status:'running',    tier:'Standard-IA',  cost:18.90,  cpu:0,  mem:0,  up:100,   tags:{env:'prod',team:'ops'}     },
  { id:'r13', name:'backups-bucket',     type:'S3',           region:'us-west-2',      status:'running',    tier:'Glacier',      cost:9.45,   cpu:0,  mem:0,  up:100,   tags:{env:'prod',team:'ops'}     },
  { id:'r14', name:'orphan-data-bucket', type:'S3',           region:'eu-west-1',      status:'running',    tier:'Standard',     cost:67.30,  cpu:0,  mem:0,  up:100,   tags:{}                          },
  { id:'r15', name:'image-resize-fn',    type:'Lambda',       region:'us-east-1',      status:'running',    tier:'512MB',        cost:12.44,  cpu:18, mem:22, up:100,   tags:{env:'prod',team:'platform'} },
  { id:'r16', name:'email-sender-fn',    type:'Lambda',       region:'us-east-1',      status:'running',    tier:'256MB',        cost:4.20,   cpu:8,  mem:12, up:100,   tags:{env:'prod',team:'backend'}  },
  { id:'r17', name:'report-gen-fn',      type:'Lambda',       region:'us-west-2',      status:'running',    tier:'1024MB',       cost:22.80,  cpu:3,  mem:8,  up:100,   tags:{env:'prod',team:'analytics'} },
  { id:'r18', name:'nightly-etl-fn',     type:'Lambda',       region:'us-east-1',      status:'warning',    tier:'2048MB',       cost:38.50,  cpu:2,  mem:45, up:99.80, tags:{env:'prod',team:'data'}    },
  { id:'r19', name:'prod-alb-01',        type:'LoadBalancer', region:'us-east-1',      status:'running',    tier:'ALB',          cost:65.20,  cpu:0,  mem:0,  up:100,   tags:{env:'prod',team:'platform'} },
  { id:'r20', name:'prod-alb-eu',        type:'LoadBalancer', region:'eu-west-1',      status:'running',    tier:'ALB',          cost:65.20,  cpu:0,  mem:0,  up:100,   tags:{env:'prod',team:'platform'} },
  { id:'r21', name:'ml-training-01',     type:'EC2',          region:'us-east-1',      status:'running',    tier:'p3.2xlarge',   cost:2189.52,cpu:94, mem:88, up:99.60, tags:{env:'prod',team:'ml'}      },
  { id:'r22', name:'ml-inference-01',    type:'EC2',          region:'ap-southeast-1', status:'running',    tier:'g4dn.xlarge',  cost:526.32, cpu:55, mem:60, up:99.80, tags:{env:'prod',team:'ml'}      },
  { id:'r23', name:'dev-bastion',        type:'EC2',          region:'us-east-1',      status:'running',    tier:'t3.nano',      cost:3.80,   cpu:1,  mem:10, up:99.00, tags:{env:'dev',team:'ops'}      },
  { id:'r24', name:'old-worker-01',      type:'EC2',          region:'us-east-1',      status:'stopped',    tier:'m5.large',     cost:0,      cpu:0,  mem:0,  up:0,     tags:{env:'prod',team:'backend'}  },
  { id:'r25', name:'cache-db-01',        type:'RDS',          region:'ap-southeast-1', status:'running',    tier:'db.t3.large',  cost:112.32, cpu:15, mem:42, up:99.95, tags:{env:'prod',team:'data'}    },
  { id:'r26', name:'prod-nlb-01',        type:'LoadBalancer', region:'us-east-1',      status:'running',    tier:'NLB',          cost:54.75,  cpu:0,  mem:0,  up:100,   tags:{env:'prod',team:'platform'} },
  { id:'r27', name:'apac-web-01',        type:'EC2',          region:'ap-northeast-1', status:'running',    tier:'t3.large',     cost:61.18,  cpu:42, mem:55, up:99.70, tags:{env:'prod',team:'platform'} },
  { id:'r28', name:'archive-bucket',     type:'S3',           region:'ap-northeast-1', status:'running',    tier:'Glacier',      cost:4.20,   cpu:0,  mem:0,  up:100,   tags:{env:'prod',team:'ops'}     },
  { id:'r29', name:'health-check-fn',    type:'Lambda',       region:'us-east-1',      status:'running',    tier:'128MB',        cost:1.80,   cpu:1,  mem:5,  up:100,   tags:{env:'prod',team:'ops'}     },
  { id:'r30', name:'old-api-01',         type:'EC2',          region:'us-east-1',      status:'terminated', tier:'t2.medium',    cost:0,      cpu:0,  mem:0,  up:0,     tags:{env:'prod',team:'backend'}  },
];

const NOW = new Date().toISOString();

async function seed() {
  console.log('🌱  Seeding CloudOps Insight database…');

  // Give db.serialize time to finish schema creation
  await new Promise(r => setTimeout(r, 200));

  // ── Clear ────────────────────────────────────────────────────────────────────
  for (const t of ['recommendations','anomalies','cost_entries','resources','users','reports']) {
    await db.runAsync(`DELETE FROM ${t}`);
  }

  // ── Users ────────────────────────────────────────────────────────────────────
  const SALT = 10;
  for (const u of [
    { id:'u1', name:'Alex Morgan', email:'admin@cloudops.io',  pw:'admin123',  role:'admin',  init:'AM', color:'#EF5350' },
    { id:'u2', name:'Jamie Lee',   email:'viewer@cloudops.io', pw:'viewer123', role:'viewer', init:'JL', color:'#8B5CF6' },
  ]) {
    await db.runAsync(
      'INSERT INTO users (id, name, email, password_hash, role, avatar_initials, avatar_color) VALUES (?,?,?,?,?,?,?)',
      [u.id, u.name, u.email, bcrypt.hashSync(u.pw, SALT), u.role, u.init, u.color]
    );
  }
  console.log('  ✓ users');

  // ── Resources ────────────────────────────────────────────────────────────────
  for (const [i, r] of RESOURCE_DEFS.entries()) {
    await db.runAsync(
      'INSERT INTO resources (id,name,type,region,status,uptime_percent,cost_per_month,cpu_avg_7d,mem_avg_7d,tier,tags,created_at,last_modified) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [r.id, r.name, r.type, r.region, r.status, r.up, r.cost, r.cpu, r.mem, r.tier, JSON.stringify(r.tags),
       `2024-${String(Math.floor(i/5)+1).padStart(2,'0')}-${String((i%28)+1).padStart(2,'0')}`,
       `2026-06-${String((i%28)+1).padStart(2,'0')}`]
    );
  }
  console.log('  ✓ resources (30)');

  // ── Cost entries (180 days) ──────────────────────────────────────────────────
  const costStmt = 'INSERT INTO cost_entries (date, resource_id, service_type, region, cost) VALUES (?,?,?,?,?)';
  for (const r of RESOURCE_DEFS) {
    if (r.cost === 0) continue;
    const rng = seededRng(r.id.charCodeAt(1) + r.id.charCodeAt(2) * 17);
    for (let i = 180; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const noise   = 0.85 + rng() * 0.30;
      const spike   = (r.id === 'r08' && d.getDate() === 22 && d.getMonth() === 5) ? 3.4 : 1;
      await db.runAsync(costStmt, [dateStr, r.id, r.type, r.region, parseFloat(((r.cost/30)*noise*spike).toFixed(2))]);
    }
  }
  console.log('  ✓ cost entries (180 days)');

  // ── Recommendations ──────────────────────────────────────────────────────────
  const recStmt = 'INSERT INTO recommendations (id,type,severity,status,title,description,affected_resource_ids,estimated_monthly_savings,created_at,anomaly_id) VALUES (?,?,?,?,?,?,?,?,?,?)';
  let recCount = 0;

  // Idle EC2
  for (const r of RESOURCE_DEFS.filter(r => r.status==='running' && r.cpu<5 && r.type==='EC2')) {
    await db.runAsync(recStmt, [`rec-idle-${r.id}`,'idle-resource','medium','open',`Idle instance: ${r.name}`,`${r.name} averaged ${r.cpu}% CPU. Consider stopping.`,JSON.stringify([r.id]),r.cost,NOW,null]);
    recCount++;
  }
  // Right-size
  for (const r of RESOURCE_DEFS.filter(r => r.status==='running' && r.cpu>0 && r.cpu<20 && (r.type==='EC2'||r.type==='RDS') && r.cost>50)) {
    await db.runAsync(recStmt, [`rec-size-${r.id}`,'right-size',r.cost>200?'high':'medium','open',`Right-size ${r.name} (${r.tier})`,`Uses only ${r.cpu}% CPU. Downsizing could reduce costs ~45%.`,JSON.stringify([r.id]),parseFloat((r.cost*0.45).toFixed(2)),NOW,null]);
    recCount++;
  }
  // Orphan storage
  for (const r of RESOURCE_DEFS.filter(r => r.type==='S3' && Object.keys(r.tags).length===0)) {
    await db.runAsync(recStmt, [`rec-orphan-${r.id}`,'unattached-storage','medium','open',`Untagged storage: ${r.name}`,`${r.name} has no tags and may be orphaned.`,JSON.stringify([r.id]),r.cost,NOW,null]);
    recCount++;
  }
  // Governance
  for (const r of RESOURCE_DEFS.filter(r => r.status==='stopped' && Object.keys(r.tags).length===0)) {
    await db.runAsync(recStmt, [`rec-gov-${r.id}`,'governance','low','open',`Untagged stopped resource: ${r.name}`,`Apply mandatory tags for cost allocation compliance.`,JSON.stringify([r.id]),0,NOW,null]);
    recCount++;
  }
  console.log(`  ✓ recommendations (${recCount})`);

  // ── Anomaly detection ────────────────────────────────────────────────────────
  const anomStmt = 'INSERT INTO anomalies (id,resource_id,date,actual_cost,expected_cost,std_dev,z_score,percent_change,severity,status,explanation,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)';
  const detected = [];

  for (const r of RESOURCE_DEFS) {
    if (r.cost === 0) continue;
    const entries = await db.allAsync('SELECT date, cost FROM cost_entries WHERE resource_id = ? ORDER BY date', [r.id]);
    for (let i = 14; i < entries.length; i++) {
      const win  = entries.slice(i-14, i).map(e => e.cost);
      const mean = win.reduce((s,v)=>s+v,0)/14;
      const std  = Math.sqrt(win.reduce((s,v)=>s+(v-mean)**2,0)/14);
      if (std < 0.01) continue;
      const z = (entries[i].cost - mean) / std;
      if (Math.abs(z) <= 2) continue;
      const pct = ((entries[i].cost - mean)/mean)*100;
      detected.push({ id:`anom-${r.id}-${entries[i].date}`, resource_id:r.id, date:entries[i].date, actual_cost:entries[i].cost, expected_cost:parseFloat(mean.toFixed(2)), std_dev:parseFloat(std.toFixed(2)), z_score:parseFloat(z.toFixed(2)), percent_change:parseFloat(pct.toFixed(1)), severity:Math.abs(z)>4?'high':Math.abs(z)>3?'medium':'low', explanation:`Spend on \`${r.name}\` ${pct>0?'jumped':'dropped'} ${Math.abs(pct).toFixed(0)}% ${pct>0?'above':'below'} its 14-day average on ${entries[i].date}.` });
    }
  }

  const top20 = detected.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20);
  for (const a of top20) {
    await db.runAsync(anomStmt, [a.id,a.resource_id,a.date,a.actual_cost,a.expected_cost,a.std_dev,a.z_score,a.percent_change,a.severity,'open',a.explanation,NOW]);
  }
  // Anomaly-driven recs
  for (const a of top20.filter(x=>x.severity!=='low').slice(0,3)) {
    await db.runAsync(recStmt, [`rec-anom-${a.id}`,'anomaly-driven',a.severity==='high'?'critical':'high','open',`Cost anomaly on ${a.resource_id}`,a.explanation,JSON.stringify([a.resource_id]),parseFloat(((a.actual_cost-a.expected_cost)*30).toFixed(2)),NOW,a.id]);
  }
  console.log(`  ✓ anomalies (${top20.length})`);

  // ── Reports ──────────────────────────────────────────────────────────────────
  for (const r of [
    { id:'rpt-cost-monthly',  title:'Monthly Cost Summary',         description:'Total spend by service and region over the last 6 months.',  category:'cost',        rows:6  },
    { id:'rpt-utilization',   title:'Resource Utilization Report',  description:'CPU, memory, and network averages for all running resources.',category:'utilization', rows:RESOURCE_DEFS.filter(r=>r.status==='running').length },
    { id:'rpt-idle',          title:'Idle Resource Report',         description:'Resources with <10% CPU — candidates for rightsizing.',      category:'utilization', rows:RESOURCE_DEFS.filter(r=>r.cpu<10&&r.status==='running').length },
    { id:'rpt-governance',    title:'Governance & Compliance Report',description:'Resources missing required tags and policy violations.',     category:'governance',  rows:RESOURCE_DEFS.filter(r=>Object.keys(r.tags).length===0).length },
    { id:'rpt-anomalies',     title:'Cost Anomaly Report',          description:'All detected cost anomalies over the past 30 days.',         category:'cost',        rows:top20.length },
  ]) {
    await db.runAsync('INSERT INTO reports (id,title,description,category,last_generated_at,estimated_rows) VALUES (?,?,?,?,?,?)', [r.id,r.title,r.description,r.category,NOW,r.rows]);
  }
  console.log('  ✓ reports (5)');

  console.log('\n✅  Seed complete — cloudops.db is ready.');
  db.close();
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
