'use client';

export function Scenario() {
  return (
    <section id="scenario" className="thesis-section">
      <div className="scenario-container">
        <div className="scenario-header">
          <p className="label text-blue">Real-Time Coordination</p>
          <h2 className="text-white">It all comes together.</h2>
          <div className="accent-line accent-line-center"></div>
        </div>

        <div className="scenario-timeline-line"></div>

        <div className="scenario-card gs-fade">
          <svg className="sos-icon sos-icon-lg sos-icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>
          <span className="sc-role">Citizen</span>
          <p className="sc-text">Maria texts: <em>&ldquo;my roof collapsed. Three kids, no car, no power.&rdquo;</em></p>
          <p className="sc-time">2:14 PM</p>
        </div>

        <div className="scenario-card gs-fade">
          <svg className="sos-icon sos-icon-lg sos-icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="6" opacity="0.6"/><circle cx="12" cy="12" r="10" opacity="0.3"/></svg>
          <span className="sc-role">SOS Intelligence</span>
          <p className="sc-text">Matched to Riverside Community Shelter (2.1 mi). Capacity confirmed. Three open beds.</p>
          <p className="sc-time">2:14 PM — instant</p>
        </div>

        <div className="scenario-card gs-fade">
          <svg className="sos-icon sos-icon-lg sos-icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17V7a2 2 0 0 1 2-2h9v12H3z"/><path d="M14 5h3l3 4v8h-6V5z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
          <span className="sc-role">Volunteer</span>
          <p className="sc-text">David — retired teacher with a truck — gets the route. ETA 12 minutes.</p>
          <p className="sc-time">2:15 PM</p>
        </div>

        <div className="scenario-card gs-fade">
          <svg className="sos-icon sos-icon-lg sos-icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4C10 2 6.5 2 4.5 4.5S4 10 12 16c8-6 8.5-9 6.5-11.5S14 2 12 4z"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
          <span className="sc-role">Nonprofit</span>
          <p className="sc-text">Red Cross case worker notified. Maria&apos;s intake pre-filled from her initial text.</p>
          <p className="sc-time">2:15 PM</p>
        </div>

        <div className="scenario-card gs-fade">
          <svg className="sos-icon sos-icon-lg sos-icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V9l7-5 7 5v12"/><line x1="9" y1="21" x2="9" y2="14"/><line x1="15" y1="21" x2="15" y2="14"/><line x1="12" y1="21" x2="12" y2="14"/></svg>
          <span className="sc-role">Government</span>
          <p className="sc-text">FEMA resource tracker updated. Maria&apos;s request no longer duplicated across 3 agencies.</p>
          <p className="sc-time">2:16 PM</p>
        </div>

        <div className="scenario-card resolution-card gs-fade">
          <svg className="sos-icon sos-icon-lg sos-icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>
          <span className="sc-role sc-role--success">Resolution</span>
          <p className="sc-text">Three kids confirmed safe. Maria connected to long-term housing pipeline.</p>
          <p className="sc-time sc-time--success">4:47 PM</p>
        </div>

        <p className="scenario-closing gs-fade">
          Everyone was a helper.<br/>The system just made sure they could find each other.
        </p>
      </div>
    </section>
  );
}
