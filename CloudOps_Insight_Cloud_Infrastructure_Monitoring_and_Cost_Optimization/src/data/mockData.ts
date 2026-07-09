// ─── Mock Data Layer ─────────────────────────────────────────────────────────
// All data is generated deterministically so numbers stay consistent per session.
// Fetch functions simulate async latency via delay().

import type {
  User, Resource, MetricPoint, CostEntry, MonthlyCostSummary,
  BudgetConfig, Recommendation, Anomaly, ReportDefinition, ReportRow,
  ResourceType, Region, ResourceStatus, MetricWindow,
} from '../types';

// ── Utility ──────────────────────────────────────────────────────────────────

export const delay = (ms = 600) => new Promise<void>(r => setTimeout(r, ms));

/** Seeded pseudo-random (mulberry32) so values are stable across renders */
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Users ─────────────────────────────────────────────────────────────────────

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Alex Morgan',
    email: 'admin@cloudops.io',
    passwordHash: 'admin123',
    role: 'admin',
    avatarInitials: 'AM',
    avatarColor: '#3b82f6',
  },
  {
    id: 'u2',
    name: 'Jamie Lee',
    email: 'viewer@cloudops.io',
    passwordHash: 'viewer123',
    role: 'viewer',
    avatarInitials: 'JL',
    avatarColor: '#8b5cf6',
  },
];

export function authenticateUser(email: string, password: string): User | null {
  return MOCK_USERS.find(u => u.email === email && u.passwordHash === password) ?? null;
}

// ── Resources ─────────────────────────────────────────────────────────────────

const rng = seededRng(42);

const RESOURCE_DEFS: Array<{
  id: string; name: string; type: ResourceType; region: Region;
  status: ResourceStatus; tier: string; costPerMonth: number;
  cpuAvg7d: number; memAvg7d: number; uptimePercent: number;
  tags: Record<string, string>;
}> = [
  { id: 'r01', name: 'prod-web-01', type: 'EC2', region: 'us-east-1', status: 'running', tier: 't3.xlarge', costPerMonth: 124.32, cpuAvg7d: 68, memAvg7d: 74, uptimePercent: 99.97, tags: { env: 'prod', team: 'platform' } },
  { id: 'r02', name: 'prod-web-02', type: 'EC2', region: 'us-east-1', status: 'running', tier: 't3.xlarge', costPerMonth: 124.32, cpuAvg7d: 71, memAvg7d: 76, uptimePercent: 99.95, tags: { env: 'prod', team: 'platform' } },
  { id: 'r03', name: 'prod-api-01', type: 'EC2', region: 'us-east-1', status: 'warning', tier: 'c5.2xlarge', costPerMonth: 248.64, cpuAvg7d: 88, memAvg7d: 82, uptimePercent: 99.81, tags: { env: 'prod', team: 'backend' } },
  { id: 'r04', name: 'staging-web-01', type: 'EC2', region: 'us-west-2', status: 'running', tier: 't3.medium', costPerMonth: 30.37, cpuAvg7d: 12, memAvg7d: 35, uptimePercent: 98.50, tags: { env: 'staging', team: 'platform' } },
  { id: 'r05', name: 'dev-worker-01', type: 'EC2', region: 'us-west-2', status: 'stopped', tier: 't3.small', costPerMonth: 0, cpuAvg7d: 0, memAvg7d: 0, uptimePercent: 0, tags: { env: 'dev', team: 'backend' } },
  { id: 'r06', name: 'prod-db-01', type: 'RDS', region: 'us-east-1', status: 'running', tier: 'db.r5.2xlarge', costPerMonth: 892.44, cpuAvg7d: 45, memAvg7d: 68, uptimePercent: 99.99, tags: { env: 'prod', team: 'data' } },
  { id: 'r07', name: 'prod-db-02', type: 'RDS', region: 'us-east-1', status: 'running', tier: 'db.r5.xlarge', costPerMonth: 446.22, cpuAvg7d: 38, memAvg7d: 61, uptimePercent: 99.99, tags: { env: 'prod', team: 'data' } },
  { id: 'r08', name: 'prod-db-03', type: 'RDS', region: 'eu-west-1', status: 'critical', tier: 'db.r5.2xlarge', costPerMonth: 892.44, cpuAvg7d: 93, memAvg7d: 91, uptimePercent: 98.20, tags: { env: 'prod', team: 'data' } },
  { id: 'r09', name: 'analytics-db', type: 'RDS', region: 'us-east-1', status: 'running', tier: 'db.r5.large', costPerMonth: 223.11, cpuAvg7d: 22, memAvg7d: 44, uptimePercent: 99.90, tags: { env: 'prod', team: 'analytics' } },
  { id: 'r10', name: 'staging-db-01', type: 'RDS', region: 'us-west-2', status: 'running', tier: 'db.t3.medium', costPerMonth: 56.16, cpuAvg7d: 8, memAvg7d: 28, uptimePercent: 99.50, tags: { env: 'staging', team: 'data' } },
];

const RESOURCE_DEFS_2: typeof RESOURCE_DEFS = [
  { id: 'r11', name: 'assets-bucket', type: 'S3', region: 'us-east-1', status: 'running', tier: 'Standard', costPerMonth: 48.72, cpuAvg7d: 0, memAvg7d: 0, uptimePercent: 100, tags: { env: 'prod', team: 'platform' } },
  { id: 'r12', name: 'logs-bucket', type: 'S3', region: 'us-east-1', status: 'running', tier: 'Standard-IA', costPerMonth: 18.90, cpuAvg7d: 0, memAvg7d: 0, uptimePercent: 100, tags: { env: 'prod', team: 'ops' } },
  { id: 'r13', name: 'backups-bucket', type: 'S3', region: 'us-west-2', status: 'running', tier: 'Glacier', costPerMonth: 9.45, cpuAvg7d: 0, memAvg7d: 0, uptimePercent: 100, tags: { env: 'prod', team: 'ops' } },
  { id: 'r14', name: 'orphan-data-bucket', type: 'S3', region: 'eu-west-1', status: 'running', tier: 'Standard', costPerMonth: 67.30, cpuAvg7d: 0, memAvg7d: 0, uptimePercent: 100, tags: {} },
  { id: 'r15', name: 'image-resize-fn', type: 'Lambda', region: 'us-east-1', status: 'running', tier: '512MB', costPerMonth: 12.44, cpuAvg7d: 18, memAvg7d: 22, uptimePercent: 100, tags: { env: 'prod', team: 'platform' } },
  { id: 'r16', name: 'email-sender-fn', type: 'Lambda', region: 'us-east-1', status: 'running', tier: '256MB', costPerMonth: 4.20, cpuAvg7d: 8, memAvg7d: 12, uptimePercent: 100, tags: { env: 'prod', team: 'backend' } },
  { id: 'r17', name: 'report-gen-fn', type: 'Lambda', region: 'us-west-2', status: 'running', tier: '1024MB', costPerMonth: 22.80, cpuAvg7d: 3, memAvg7d: 8, uptimePercent: 100, tags: { env: 'prod', team: 'analytics' } },
  { id: 'r18', name: 'nightly-etl-fn', type: 'Lambda', region: 'us-east-1', status: 'warning', tier: '2048MB', costPerMonth: 38.50, cpuAvg7d: 2, memAvg7d: 45, uptimePercent: 99.80, tags: { env: 'prod', team: 'data' } },
  { id: 'r19', name: 'prod-alb-01', type: 'LoadBalancer', region: 'us-east-1', status: 'running', tier: 'ALB', costPerMonth: 65.20, cpuAvg7d: 0, memAvg7d: 0, uptimePercent: 100, tags: { env: 'prod', team: 'platform' } },
  { id: 'r20', name: 'prod-alb-eu', type: 'LoadBalancer', region: 'eu-west-1', status: 'running', tier: 'ALB', costPerMonth: 65.20, cpuAvg7d: 0, memAvg7d: 0, uptimePercent: 100, tags: { env: 'prod', team: 'platform' } },
];

const RESOURCE_DEFS_3: typeof RESOURCE_DEFS = [
  { id: 'r21', name: 'ml-training-01', type: 'EC2', region: 'us-east-1', status: 'running', tier: 'p3.2xlarge', costPerMonth: 2189.52, cpuAvg7d: 94, memAvg7d: 88, uptimePercent: 99.60, tags: { env: 'prod', team: 'ml' } },
  { id: 'r22', name: 'ml-inference-01', type: 'EC2', region: 'ap-southeast-1', status: 'running', tier: 'g4dn.xlarge', costPerMonth: 526.32, cpuAvg7d: 55, memAvg7d: 60, uptimePercent: 99.80, tags: { env: 'prod', team: 'ml' } },
  { id: 'r23', name: 'dev-bastion', type: 'EC2', region: 'us-east-1', status: 'running', tier: 't3.nano', costPerMonth: 3.80, cpuAvg7d: 1, memAvg7d: 10, uptimePercent: 99.00, tags: { env: 'dev', team: 'ops' } },
  { id: 'r24', name: 'old-worker-01', type: 'EC2', region: 'us-east-1', status: 'stopped', tier: 'm5.large', costPerMonth: 0, cpuAvg7d: 0, memAvg7d: 0, uptimePercent: 0, tags: { env: 'prod', team: 'backend' } },
  { id: 'r25', name: 'cache-db-01', type: 'RDS', region: 'ap-southeast-1', status: 'running', tier: 'db.t3.large', costPerMonth: 112.32, cpuAvg7d: 15, memAvg7d: 42, uptimePercent: 99.95, tags: { env: 'prod', team: 'data' } },
  { id: 'r26', name: 'prod-nlb-01', type: 'LoadBalancer', region: 'us-east-1', status: 'running', tier: 'NLB', costPerMonth: 54.75, cpuAvg7d: 0, memAvg7d: 0, uptimePercent: 100, tags: { env: 'prod', team: 'platform' } },
  { id: 'r27', name: 'apac-web-01', type: 'EC2', region: 'ap-northeast-1', status: 'running', tier: 't3.large', costPerMonth: 61.18, cpuAvg7d: 42, memAvg7d: 55, uptimePercent: 99.70, tags: { env: 'prod', team: 'platform' } },
  { id: 'r28', name: 'archive-bucket', type: 'S3', region: 'ap-northeast-1', status: 'running', tier: 'Glacier', costPerMonth: 4.20, cpuAvg7d: 0, memAvg7d: 0, uptimePercent: 100, tags: { env: 'prod', team: 'ops' } },
  { id: 'r29', name: 'health-check-fn', type: 'Lambda', region: 'us-east-1', status: 'running', tier: '128MB', costPerMonth: 1.80, cpuAvg7d: 1, memAvg7d: 5, uptimePercent: 100, tags: { env: 'prod', team: 'ops' } },
  { id: 'r30', name: 'old-api-01', type: 'EC2', region: 'us-east-1', status: 'terminated', tier: 't2.medium', costPerMonth: 0, cpuAvg7d: 0, memAvg7d: 0, uptimePercent: 0, tags: { env: 'prod', team: 'backend' } },
];

const ALL_RESOURCE_DEFS = [...RESOURCE_DEFS, ...RESOURCE_DEFS_2, ...RESOURCE_DEFS_3];

export const MOCK_RESOURCES: Resource[] = ALL_RESOURCE_DEFS.map((r, i) => ({
  ...r,
  createdAt: `2024-${String(Math.floor(i / 5) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
  lastModified: `2026-06-${String((i % 28) + 1).padStart(2, '0')}`,
}));

export async function fetchResources(): Promise<Resource[]> {
  await delay();
  return MOCK_RESOURCES;
}

export async function fetchResource(id: string): Promise<Resource | null> {
  await delay(300);
  return MOCK_RESOURCES.find(r => r.id === id) ?? null;
}

// ── Metric Time-Series ────────────────────────────────────────────────────────

/**
 * Generate a realistic sine-wave + noise metric series.
 * baseline: center value, amplitude: swing, noiseAmp: jitter, spikeProbability: 0-1
 */
export function generateMetricSeries(
  resourceId: string,
  windowMs: number,
  intervalMs: number,
  baseline: number,
  amplitude: number,
  noiseAmp: number,
  spikeProbability = 0.03
): MetricPoint[] {
  const rng2 = seededRng(resourceId.charCodeAt(1) * 1000 + resourceId.charCodeAt(2));
  const now = Date.now();
  const start = now - windowMs;
  const points: MetricPoint[] = [];

  for (let t = start; t <= now; t += intervalMs) {
    const phase = (t / 3_600_000) * Math.PI * 2;
    const base = baseline + amplitude * Math.sin(phase / 12) + amplitude * 0.3 * Math.sin(phase / 4);
    const noise = (rng2() - 0.5) * noiseAmp;
    const spike = rng2() < spikeProbability ? rng2() * 30 : 0;
    const clamp = (v: number) => Math.min(100, Math.max(0, v));
    const net = (rng2() - 0.5) * 200 + 50;
    points.push({
      timestamp: t,
      cpu: clamp(base + noise + spike),
      memory: clamp(base * 0.9 + (rng2() - 0.5) * noiseAmp * 0.5),
      networkIn: Math.max(0, net + (rng2() - 0.5) * 80),
      networkOut: Math.max(0, net * 0.6 + (rng2() - 0.5) * 50),
      diskRead: Math.max(0, (rng2() * 60) + 5),
      diskWrite: Math.max(0, (rng2() * 40) + 2),
    });
  }
  return points;
}

const WINDOW_CONFIG: Record<MetricWindow, { windowMs: number; intervalMs: number }> = {
  '24h': { windowMs: 24 * 3600 * 1000, intervalMs: 5 * 60 * 1000 },
  '7d':  { windowMs:  7 * 24 * 3600 * 1000, intervalMs: 30 * 60 * 1000 },
  '30d': { windowMs: 30 * 24 * 3600 * 1000, intervalMs:  2 * 3600 * 1000 },
};

export async function fetchMetrics(resourceId: string, window: MetricWindow): Promise<MetricPoint[]> {
  await delay(500);
  const r = MOCK_RESOURCES.find(res => res.id === resourceId);
  const baseline = r ? r.cpuAvg7d : 40;
  const { windowMs, intervalMs } = WINDOW_CONFIG[window];
  return generateMetricSeries(resourceId, windowMs, intervalMs, baseline, 20, 15);
}

export function generateLivePoint(resourceId: string): MetricPoint {
  const r = MOCK_RESOURCES.find(res => res.id === resourceId);
  const baseline = r ? r.cpuAvg7d : 40;
  const liveRng = seededRng(Date.now() % 100000);
  const cpu = Math.min(100, Math.max(0, baseline + (liveRng() - 0.5) * 20));
  return {
    timestamp: Date.now(),
    cpu,
    memory: Math.min(100, Math.max(0, cpu * 0.9 + (liveRng() - 0.5) * 10)),
    networkIn: Math.max(0, liveRng() * 150 + 20),
    networkOut: Math.max(0, liveRng() * 90 + 10),
    diskRead: Math.max(0, liveRng() * 60 + 5),
    diskWrite: Math.max(0, liveRng() * 40 + 2),
  };
}

// ── Cost Data ─────────────────────────────────────────────────────────────────

/** Generate daily cost entries for the past N days for a resource */
function dailyCosts(resourceId: string, baseCostPerMonth: number, days: number): CostEntry[] {
  if (baseCostPerMonth === 0) return [];
  const r = seededRng(resourceId.charCodeAt(1) + resourceId.charCodeAt(2) * 17);
  const resource = MOCK_RESOURCES.find(res => res.id === resourceId)!;
  const entries: CostEntry[] = [];
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    // Slight daily variance +/- 15%
    const noise = 0.85 + r() * 0.30;
    // Inject a spike 2× on specific days (for anomaly detection to find)
    const spikeDay = resourceId === 'r08' && d.getDate() === 22 && d.getMonth() === 5;
    const spikeFactor = spikeDay ? 3.4 : 1;
    entries.push({
      date: dateStr,
      resourceId,
      serviceType: resource.type,
      region: resource.region,
      cost: parseFloat(((baseCostPerMonth / 30) * noise * spikeFactor).toFixed(2)),
    });
  }
  return entries;
}

// Generate 180 days of cost history for all resources
export const MOCK_COST_ENTRIES: CostEntry[] = MOCK_RESOURCES.flatMap(r =>
  dailyCosts(r.id, r.costPerMonth, 180)
);

export async function fetchCostEntries(days = 30): Promise<CostEntry[]> {
  await delay(600);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return MOCK_COST_ENTRIES.filter(e => e.date >= cutoffStr);
}

/** Aggregate daily entries into monthly summaries */
function buildMonthlySummaries(): MonthlyCostSummary[] {
  const byMonth: Record<string, MonthlyCostSummary> = {};
  for (const e of MOCK_COST_ENTRIES) {
    const month = e.date.slice(0, 7);
    if (!byMonth[month]) {
      byMonth[month] = {
        month,
        total: 0,
        byService: { EC2: 0, S3: 0, RDS: 0, Lambda: 0, LoadBalancer: 0 },
        byRegion: { 'us-east-1': 0, 'us-west-2': 0, 'eu-west-1': 0, 'ap-southeast-1': 0, 'ap-northeast-1': 0 },
      };
    }
    byMonth[month].total += e.cost;
    byMonth[month].byService[e.serviceType] += e.cost;
    byMonth[month].byRegion[e.region] += e.cost;
  }
  return Object.values(byMonth)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(m => ({
      ...m,
      total: parseFloat(m.total.toFixed(2)),
      byService: Object.fromEntries(
        Object.entries(m.byService).map(([k, v]) => [k, parseFloat(v.toFixed(2))])
      ) as MonthlyCostSummary['byService'],
      byRegion: Object.fromEntries(
        Object.entries(m.byRegion).map(([k, v]) => [k, parseFloat(v.toFixed(2))])
      ) as MonthlyCostSummary['byRegion'],
    }));
}

export const MOCK_MONTHLY_SUMMARIES = buildMonthlySummaries();

export async function fetchMonthlySummaries(): Promise<MonthlyCostSummary[]> {
  await delay(500);
  return MOCK_MONTHLY_SUMMARIES;
}

export const MOCK_BUDGET: BudgetConfig = {
  monthlyBudget: 8000,
  alertThresholdPercent: 80,
};

// ── Anomaly Detection ─────────────────────────────────────────────────────────

/**
 * Detect cost anomalies using a 14-day trailing moving average.
 * A day is anomalous if actual cost deviates > 2 std deviations from the MA.
 */
export function detectAnomalies(): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const resourceIds = [...new Set(MOCK_COST_ENTRIES.map(e => e.resourceId))];

  for (const rid of resourceIds) {
    const entries = MOCK_COST_ENTRIES
      .filter(e => e.resourceId === rid)
      .sort((a, b) => a.date.localeCompare(b.date));

    for (let i = 14; i < entries.length; i++) {
      const window14 = entries.slice(i - 14, i).map(e => e.cost);
      const mean = window14.reduce((s, v) => s + v, 0) / 14;
      const variance = window14.reduce((s, v) => s + (v - mean) ** 2, 0) / 14;
      const std = Math.sqrt(variance);
      if (std < 0.01) continue;

      const actual = entries[i].cost;
      const zScore = (actual - mean) / std;

      if (Math.abs(zScore) > 2) {
        const pct = ((actual - mean) / mean) * 100;
        const severity: Anomaly['severity'] =
          Math.abs(zScore) > 4 ? 'high' : Math.abs(zScore) > 3 ? 'medium' : 'low';
        const resource = MOCK_RESOURCES.find(r => r.id === rid);
        anomalies.push({
          id: `anom-${rid}-${entries[i].date}`,
          resourceId: rid,
          date: entries[i].date,
          actualCost: actual,
          expectedCost: parseFloat(mean.toFixed(2)),
          stdDev: parseFloat(std.toFixed(2)),
          zScore: parseFloat(zScore.toFixed(2)),
          percentChange: parseFloat(pct.toFixed(1)),
          severity,
          status: 'open',
          explanation: `Spend on \`${resource?.name ?? rid}\` ${pct > 0 ? 'jumped' : 'dropped'} ${Math.abs(pct).toFixed(0)}% ${pct > 0 ? 'above' : 'below'} its 14-day average on ${entries[i].date} — investigate recent ${resource?.type === 'RDS' ? 'query load or a scaling misconfiguration' : resource?.type === 'EC2' ? 'instance scaling events or runaway processes' : 'usage spike or misconfiguration'}.`,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  // Return at most 20, sorted by date desc
  return anomalies
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20);
}

export const MOCK_ANOMALIES: Anomaly[] = detectAnomalies();

export async function fetchAnomalies(): Promise<Anomaly[]> {
  await delay(600);
  return MOCK_ANOMALIES;
}

// ── Recommendations ───────────────────────────────────────────────────────────

function buildRecommendations(): Recommendation[] {
  const recs: Recommendation[] = [];

  // Idle resources: CPU avg < 5% for running instances
  const idle = MOCK_RESOURCES.filter(r => r.status === 'running' && r.cpuAvg7d < 5 && r.type === 'EC2');
  for (const r of idle) {
    recs.push({
      id: `rec-idle-${r.id}`,
      type: 'idle-resource',
      severity: 'medium',
      status: 'open',
      title: `Idle instance: ${r.name}`,
      description: `${r.name} has averaged ${r.cpuAvg7d}% CPU over the past 7 days. Consider stopping or terminating this instance when not needed.`,
      affectedResourceIds: [r.id],
      estimatedMonthlySavings: r.costPerMonth,
      createdAt: new Date().toISOString(),
    });
  }

  // Oversized: CPU < 20%, running, expensive tier
  const oversized = MOCK_RESOURCES.filter(r =>
    r.status === 'running' && r.cpuAvg7d > 0 && r.cpuAvg7d < 20 &&
    (r.type === 'EC2' || r.type === 'RDS') && r.costPerMonth > 50
  );
  for (const r of oversized) {
    const savings = parseFloat((r.costPerMonth * 0.45).toFixed(2));
    recs.push({
      id: `rec-size-${r.id}`,
      type: 'right-size',
      severity: r.costPerMonth > 200 ? 'high' : 'medium',
      status: 'open',
      title: `Right-size ${r.name} (${r.tier})`,
      description: `${r.name} uses only ${r.cpuAvg7d}% CPU on average. Downsizing from ${r.tier} to the next smaller tier could reduce costs by ~45%.`,
      affectedResourceIds: [r.id],
      estimatedMonthlySavings: savings,
      createdAt: new Date().toISOString(),
    });
  }

  // Unattached/orphan storage
  const orphanBuckets = MOCK_RESOURCES.filter(r => r.type === 'S3' && Object.keys(r.tags).length === 0);
  for (const r of orphanBuckets) {
    recs.push({
      id: `rec-orphan-${r.id}`,
      type: 'unattached-storage',
      severity: 'medium',
      status: 'open',
      title: `Untagged storage: ${r.name}`,
      description: `${r.name} has no resource tags and may be orphaned. Verify ownership and delete if unused.`,
      affectedResourceIds: [r.id],
      estimatedMonthlySavings: r.costPerMonth,
      createdAt: new Date().toISOString(),
    });
  }

  // Governance: stopped instances with non-zero cost entries (old EBS volumes etc.)
  const stoppedWithTags = MOCK_RESOURCES.filter(r => r.status === 'stopped' && Object.keys(r.tags).length === 0);
  for (const r of stoppedWithTags) {
    recs.push({
      id: `rec-gov-${r.id}`,
      type: 'governance',
      severity: 'low',
      status: 'open',
      title: `Untagged stopped resource: ${r.name}`,
      description: `${r.name} is stopped and untagged. Apply mandatory tags (env, team, owner) for cost allocation compliance.`,
      affectedResourceIds: [r.id],
      estimatedMonthlySavings: 0,
      createdAt: new Date().toISOString(),
    });
  }

  // Anomaly-driven recommendations for high-severity anomalies
  const highAnomalies = MOCK_ANOMALIES.filter(a => a.severity === 'high' || a.severity === 'medium');
  for (const anom of highAnomalies.slice(0, 3)) {
    const resource = MOCK_RESOURCES.find(r => r.id === anom.resourceId);
    if (!resource) continue;
    // Don't duplicate if we already have a rec for this resource
    if (recs.some(r => r.affectedResourceIds.includes(anom.resourceId) && r.type === 'anomaly-driven')) continue;
    recs.push({
      id: `rec-anom-${anom.id}`,
      type: 'anomaly-driven',
      severity: anom.severity === 'high' ? 'critical' : 'high',
      status: 'open',
      title: `Cost anomaly on ${resource.name}`,
      description: anom.explanation,
      affectedResourceIds: [anom.resourceId],
      estimatedMonthlySavings: parseFloat((anom.actualCost - anom.expectedCost).toFixed(2)) * 30,
      anomalyId: anom.id,
      createdAt: new Date().toISOString(),
    });
  }

  return recs;
}

export const MOCK_RECOMMENDATIONS: Recommendation[] = buildRecommendations();

export async function fetchRecommendations(): Promise<Recommendation[]> {
  await delay(600);
  return MOCK_RECOMMENDATIONS;
}

// ── Reports ───────────────────────────────────────────────────────────────────

export const MOCK_REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    id: 'rpt-cost-monthly',
    title: 'Monthly Cost Summary',
    description: 'Total spend by service and region over the last 6 months with trend analysis.',
    category: 'cost',
    lastGeneratedAt: '2026-07-09T06:00:00Z',
    estimatedRows: 30,
  },
  {
    id: 'rpt-utilization',
    title: 'Resource Utilization Report',
    description: 'CPU, memory, and network averages for all running resources over the past 7 days.',
    category: 'utilization',
    lastGeneratedAt: '2026-07-09T06:00:00Z',
    estimatedRows: MOCK_RESOURCES.filter(r => r.status === 'running').length,
  },
  {
    id: 'rpt-idle',
    title: 'Idle Resource Report',
    description: 'Resources with < 10% average CPU utilization — candidates for rightsizing or termination.',
    category: 'utilization',
    lastGeneratedAt: '2026-07-09T06:00:00Z',
    estimatedRows: MOCK_RESOURCES.filter(r => r.cpuAvg7d < 10 && r.status === 'running').length,
  },
  {
    id: 'rpt-governance',
    title: 'Governance & Compliance Report',
    description: 'Resources missing required tags, stopped instances, and policy violations.',
    category: 'governance',
    lastGeneratedAt: '2026-07-08T06:00:00Z',
    estimatedRows: MOCK_RESOURCES.filter(r => Object.keys(r.tags).length === 0).length,
  },
  {
    id: 'rpt-anomalies',
    title: 'Cost Anomaly Report',
    description: 'All detected cost anomalies over the past 30 days with explanations.',
    category: 'cost',
    lastGeneratedAt: '2026-07-09T06:00:00Z',
    estimatedRows: MOCK_ANOMALIES.length,
  },
];

export async function fetchReportDefinitions(): Promise<ReportDefinition[]> {
  await delay(400);
  return MOCK_REPORT_DEFINITIONS;
}

export async function fetchReportData(reportId: string): Promise<ReportRow[]> {
  await delay(800);
  switch (reportId) {
    case 'rpt-cost-monthly':
      return MOCK_MONTHLY_SUMMARIES.slice(-6).map(m => ({
        Month: m.month,
        Total: m.total,
        EC2: m.byService.EC2,
        S3: m.byService.S3,
        RDS: m.byService.RDS,
        Lambda: m.byService.Lambda,
        LoadBalancer: m.byService.LoadBalancer,
      }));
    case 'rpt-utilization':
      return MOCK_RESOURCES.filter(r => r.status === 'running').map(r => ({
        Name: r.name,
        Type: r.type,
        Region: r.region,
        'CPU Avg 7d (%)': r.cpuAvg7d,
        'Mem Avg 7d (%)': r.memAvg7d,
        'Uptime (%)': r.uptimePercent,
        'Cost/Month ($)': r.costPerMonth,
      }));
    case 'rpt-idle':
      return MOCK_RESOURCES.filter(r => r.cpuAvg7d < 10 && r.status === 'running').map(r => ({
        Name: r.name,
        Type: r.type,
        Region: r.region,
        'CPU Avg 7d (%)': r.cpuAvg7d,
        'Cost/Month ($)': r.costPerMonth,
        Tier: r.tier,
      }));
    case 'rpt-governance':
      return MOCK_RESOURCES.filter(r => Object.keys(r.tags).length === 0).map(r => ({
        Name: r.name,
        Type: r.type,
        Region: r.region,
        Status: r.status,
        'Missing Tags': 'env, team, owner',
        'Cost/Month ($)': r.costPerMonth,
      }));
    case 'rpt-anomalies':
      return MOCK_ANOMALIES.map(a => {
        const res = MOCK_RESOURCES.find(r => r.id === a.resourceId);
        return {
          Date: a.date,
          Resource: res?.name ?? a.resourceId,
          Type: res?.type ?? '',
          'Actual Cost ($)': a.actualCost,
          'Expected Cost ($)': a.expectedCost,
          'Change (%)': a.percentChange,
          'Z-Score': a.zScore,
          Severity: a.severity,
        };
      });
    default:
      return [];
  }
}

// ── CSV Export ────────────────────────────────────────────────────────────────

export function exportToCSV(rows: ReportRow[], filename: string): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = row[h];
        const str = String(val ?? '');
        // Escape values containing commas or quotes
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Dashboard summary helpers ─────────────────────────────────────────────────

export function getDashboardSummary() {
  const running = MOCK_RESOURCES.filter(r => r.status === 'running').length;
  const stopped = MOCK_RESOURCES.filter(r => r.status === 'stopped').length;
  const terminated = MOCK_RESOURCES.filter(r => r.status === 'terminated').length;
  const warning = MOCK_RESOURCES.filter(r => r.status === 'warning' || r.status === 'critical').length;
  const totalMonthlySpend = MOCK_RESOURCES.reduce((s, r) => s + r.costPerMonth, 0);
  const activeAlerts = MOCK_RESOURCES.filter(r => r.status === 'warning' || r.status === 'critical').length
    + MOCK_ANOMALIES.filter(a => a.status === 'open').length;

  return {
    totalResources: MOCK_RESOURCES.length,
    running,
    stopped,
    terminated,
    warning,
    totalMonthlySpend: parseFloat(totalMonthlySpend.toFixed(2)),
    activeAlerts,
  };
}
