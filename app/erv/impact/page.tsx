import type { Metadata } from 'next';
import '../erv-impact-fonts.css';
import '../../../styles/erv-impact.css';

export const metadata: Metadata = {
  title: 'Impact Report — Emergency RV',
  description:
    'Emergency RV impact report: 5,870 people represented, 1,100 RVs sourced, 374 volunteer drivers, 221 families housed — February 2025 through May 2026.',
  openGraph: {
    title: 'Emergency RV Impact Report',
    description:
      '221 families housed. 2,251 still waiting. See our full impact from 16 months of disaster-relief operations.',
    siteName: 'Emergency RV',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Emergency RV Impact Report',
    description:
      '221 families housed. 2,251 still waiting. See 16 months of disaster-relief impact.',
  },
};

/* ─── Data ────────────────────────────────────────────────────── */

const MONTHLY_INTAKE: { month: string; count: number }[] = [
  { month: 'Feb\n\'25', count: 174 },
  { month: 'Mar', count: 264 },
  { month: 'Apr', count: 167 },
  { month: 'May', count: 238 },
  { month: 'Jun', count: 137 },
  { month: 'Jul', count: 208 },
  { month: 'Aug', count: 116 },
  { month: 'Sep', count: 99 },
  { month: 'Oct', count: 61 },
  { month: 'Nov', count: 80 },
  { month: 'Dec', count: 208 },
  { month: 'Jan\n\'26', count: 230 },
  { month: 'Feb', count: 157 },
  { month: 'Mar', count: 165 },
  { month: 'Apr', count: 146 },
  { month: 'May', count: 41 },
];

const MAX_INTAKE = Math.max(...MONTHLY_INTAKE.map((m) => m.count));

const GEO_DATA: { state: string; count: number }[] = [
  { state: 'NC', count: 331 },
  { state: 'CA', count: 281 },
  { state: 'FL', count: 113 },
  { state: 'TX', count: 110 },
  { state: 'GA', count: 67 },
  { state: 'KY', count: 67 },
  { state: 'TN', count: 49 },
  { state: 'WA', count: 38 },
];

const MAX_GEO = GEO_DATA[0].count;

/* ─── Fleet bar totals ────────────────────────────────────────── */
const FLEET = { deployed: 96, available: 417, unavailable: 270, pending: 692 };
const FLEET_TOTAL = FLEET.deployed + FLEET.available + FLEET.unavailable + FLEET.pending;

function pct(n: number) {
  return `${((n / FLEET_TOTAL) * 100).toFixed(1)}%`;
}

/* ─── Page ────────────────────────────────────────────────────── */

export default function ERVImpactPage() {
  return (
    <div className="erv-page">

      {/* ── S1: Hero ──────────────────────────────────────────── */}
      <div className="erv-hero-wrap">
        <div className="erv-hero">
          <div className="erv-topbar">
            <div>
              <h1 className="erv-hero-title">Impact Report</h1>
              <p className="erv-hero-subtitle">
                Emergency RV — February 2025 through May 2026
              </p>
            </div>
            <span className="erv-wordmark">EmergencyRV</span>
          </div>

          <div className="erv-stats-grid">
            {[
              { n: '5,870', label: 'people represented in housing requests' },
              { n: '1,100', label: 'RVs sourced for disaster survivors' },
              { n: '374',   label: 'volunteer drivers mobilized' },
              { n: '221',   label: 'families housed' },
            ].map(({ n, label }) => (
              <div key={n} className="erv-stat-card">
                <p className="erv-stat-number">{n}</p>
                <p className="erv-stat-label">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── S2: What We Do ────────────────────────────────────── */}
      <div className="erv-bg-offwhite">
        <div className="erv-section">
          <p className="erv-section-label erv-section-label--dark">What We Do</p>
          <h2 className="erv-headline erv-headline--dark">
            Temporary RV housing for disaster survivors.
          </h2>
          <div className="erv-what-grid">
            <div className="erv-what-card">
              <p className="erv-what-number">1,100</p>
              <p className="erv-what-title">RVs Sourced</p>
              <p className="erv-what-detail">561 state (FDEM) + 539 citizen-donated</p>
            </div>
            <div className="erv-what-card">
              <p className="erv-what-number">374</p>
              <p className="erv-what-title">Volunteer Drivers</p>
              <p className="erv-what-detail">delivering RVs nationwide</p>
            </div>
            <div className="erv-what-card">
              <p className="erv-what-number">2,503</p>
              <p className="erv-what-title">Families Requesting Help</p>
              <p className="erv-what-detail">avg household 2.4 · 912 with children</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── S3: Who We Serve ──────────────────────────────────── */}
      <div className="erv-bg-black">
        <div className="erv-section">
          <p className="erv-section-label">Who We Serve</p>
          <h2 className="erv-headline erv-headline--white">
            Veterans. First responders. Families in crisis.
          </h2>
          <div className="erv-serve-grid">
            {[
              { n: '146',   label: 'veterans' },
              { n: '124',   label: 'first responders' },
              { n: '912',   label: 'families with children' },
              { n: '273',   label: 'with elderly members' },
              { n: '1,321', label: 'with medical needs' },
              { n: '39%',   label: 'have medical needs' },
            ].map(({ n, label }) => (
              <div key={label} className="erv-serve-block">
                <p className="erv-serve-number">{n}</p>
                <p className="erv-serve-label">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── S4: Fleet Status ──────────────────────────────────── */}
      <div className="erv-bg-offwhite">
        <div className="erv-section">
          <p className="erv-section-label erv-section-label--dark">Fleet Status</p>
          <h2 className="erv-headline erv-headline--dark">96 RVs deployed right now.</h2>

          {/* Stacked bar */}
          <div className="erv-fleet-bar-wrap">
            <div className="erv-fleet-bar" role="img" aria-label="Fleet status breakdown">
              <div
                className="erv-fleet-seg erv-fleet-seg--deployed"
                style={{ width: pct(FLEET.deployed) }}
                title={`Deployed: ${FLEET.deployed}`}
              />
              <div
                className="erv-fleet-seg erv-fleet-seg--available"
                style={{ width: pct(FLEET.available) }}
                title={`Available: ${FLEET.available}`}
              />
              <div
                className="erv-fleet-seg erv-fleet-seg--unavailable"
                style={{ width: pct(FLEET.unavailable) }}
                title={`Unavailable: ${FLEET.unavailable}`}
              />
              <div
                className="erv-fleet-seg erv-fleet-seg--pending"
                style={{ width: pct(FLEET.pending) }}
                title={`Pending: ${FLEET.pending}`}
              />
            </div>
            <div className="erv-fleet-legend">
              {[
                { cls: 'erv-fleet-seg--deployed',    label: `${FLEET.deployed} deployed`,    color: '#34D399' },
                { cls: 'erv-fleet-seg--available',   label: `${FLEET.available} available`,   color: '#D4A843' },
                { cls: 'erv-fleet-seg--unavailable', label: `${FLEET.unavailable} unavailable`, color: '#6B7280' },
                { cls: 'erv-fleet-seg--pending',     label: `${FLEET.pending} pending`,       color: '#2e2e2e' },
              ].map(({ label, color }) => (
                <div key={label} className="erv-fleet-legend-item">
                  <div className="erv-fleet-legend-dot" style={{ background: color }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Breakdowns */}
          <div className="erv-fleet-split">
            <div className="erv-fleet-breakdown">
              <p className="erv-fleet-breakdown-title">RV Sources</p>
              <div className="erv-fleet-breakdown-row">
                <span className="erv-fleet-breakdown-label">State (FDEM)</span>
                <span className="erv-fleet-breakdown-value">561</span>
              </div>
              <div className="erv-fleet-breakdown-row">
                <span className="erv-fleet-breakdown-label">Citizen donated</span>
                <span className="erv-fleet-breakdown-value">539</span>
              </div>
            </div>
            <div className="erv-fleet-breakdown">
              <p className="erv-fleet-breakdown-title">Resource Types</p>
              <div className="erv-fleet-breakdown-row">
                <span className="erv-fleet-breakdown-label">RVs</span>
                <span className="erv-fleet-breakdown-value">1,100</span>
              </div>
              <div className="erv-fleet-breakdown-row">
                <span className="erv-fleet-breakdown-label">Drivers</span>
                <span className="erv-fleet-breakdown-value">374</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── S5: Demand Over Time ──────────────────────────────── */}
      <div className="erv-bg-black">
        <div className="erv-section">
          <p className="erv-section-label">16 Months of Operations</p>
          <h2 className="erv-headline erv-headline--white">
            Consistent demand. Never zero.
          </h2>
          <div className="erv-chart-wrap">
            <div className="erv-bar-chart" role="img" aria-label="Monthly intake chart Feb 2025 to May 2026">
              {MONTHLY_INTAKE.map(({ month, count }) => {
                const heightPct = Math.round((count / MAX_INTAKE) * 100);
                return (
                  <div key={month} className="erv-bar-col">
                    <p className="erv-bar-value">{count}</p>
                    <div
                      className="erv-bar"
                      style={{ height: `${heightPct}%` }}
                      title={`${month}: ${count}`}
                    />
                    <p className="erv-bar-label">{month}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── S6: The Gap ───────────────────────────────────────── */}
      <div className="erv-gap-wrap">
        <div className="erv-gap-section">
          <p className="erv-section-label erv-section-label--dark">The Gap</p>
          <div className="erv-gap-numbers">
            <div className="erv-gap-block">
              <p className="erv-gap-number erv-gap-number--green">221</p>
              <p className="erv-gap-sub">families housed</p>
            </div>
            <div className="erv-gap-divider">vs</div>
            <div className="erv-gap-block">
              <p className="erv-gap-number erv-gap-number--red">2,251</p>
              <p className="erv-gap-sub">families still waiting</p>
            </div>
          </div>

          <div className="erv-gap-proportion-bar" role="img" aria-label="221 housed vs 2251 waiting">
            <div className="erv-gap-proportion-green" />
            <div className="erv-gap-proportion-red" />
          </div>

          <p className="erv-gap-text">
            For every family we housed, ten more are waiting. The process works.
            The demand is proven. The bottleneck is resources.
          </p>
        </div>
      </div>

      {/* ── S7: Geographic Reach ──────────────────────────────── */}
      <div className="erv-bg-black">
        <div className="erv-section">
          <p className="erv-section-label">Geographic Reach</p>
          <h2 className="erv-headline erv-headline--white">55 states and territories.</h2>
          <div className="erv-geo-chart" role="img" aria-label="Requests by state">
            {GEO_DATA.map(({ state, count }) => {
              const widthPct = Math.round((count / MAX_GEO) * 100);
              return (
                <div key={state} className="erv-geo-row">
                  <span className="erv-geo-state">{state}</span>
                  <div className="erv-geo-bar-track">
                    <div
                      className="erv-geo-bar-fill"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="erv-geo-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── S8: The Helpers ───────────────────────────────────── */}
      <div className="erv-bg-offwhite">
        <div className="erv-section">
          <p className="erv-section-label erv-section-label--dark">Community Powered</p>
          <h2 className="erv-headline erv-headline--dark">
            874 people giving — not just receiving.
          </h2>
          <div className="erv-helpers-grid">
            <div className="erv-helper-card">
              <p className="erv-helper-number">500</p>
              <p className="erv-helper-title">RV Donors</p>
            </div>
            <div className="erv-helper-card">
              <p className="erv-helper-number">374</p>
              <p className="erv-helper-title">Volunteer Drivers</p>
            </div>
            <div className="erv-helper-card">
              <p className="erv-helper-number">14</p>
              <p className="erv-helper-title">Case Workers</p>
            </div>
          </div>
          <p className="erv-helpers-footer">
            Emergency RV runs on community. Everyone is a helper.
          </p>
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────── */}
      <div className="erv-footer-wrap">
        <div className="erv-footer">
          <div className="erv-footer-left">
            <span className="erv-footer-brand">EmergencyRV</span>
            <span className="erv-footer-url">emergencyrv.org</span>
          </div>
          <div className="erv-footer-center">
            Providing shelter. Restoring stability.
          </div>
          <div className="erv-footer-right">
            <span className="erv-footer-powered">Powered by SOS</span>
            <span className="erv-footer-sos-url">sosconnect.org</span>
          </div>
        </div>
        <div className="erv-footer-data">
          Data: February 2025 – May 2026
        </div>
      </div>

    </div>
  );
}
