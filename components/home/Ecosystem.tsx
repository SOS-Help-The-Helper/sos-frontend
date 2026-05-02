'use client';

export function Ecosystem() {
  return (
    <section id="ecosystem" className="bg-white">
      <div className="narrow">
        <p className="label gs-fade">The Help Exists</p>
        <h2 className="gs-fade">Everyone responds. They just can&apos;t see each other.</h2>
        <div className="accent-line gs-fade"></div>
        <p className="body-lg gs-fade mt-24">
          The response to every disaster is bigger, faster, and more capable than any system gives it credit for. Everyone responds. They just can&apos;t see each other.
        </p>

        <div className="eco-grid">
          <div className="eco-card gs-fade">
            <svg className="sos-icon eco-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="3"/><circle cx="17" cy="7" r="3"/><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/><path d="M17 11a4 4 0 0 1 3 4v6"/></svg>
            <p className="eco-label">Citizens</p>
            <h3>The actual first responders</h3>
            <p>Three out of four people turn to neighbors before any agency.<a href="https://www.sciencedirect.com/science/article/abs/pii/S2212420921005070" className="cite" target="_blank" rel="noopener">⁶</a> People with trucks clear roads. Nurses triage on front porches.</p>
          </div>
          <div className="eco-card gs-fade">
            <svg className="sos-icon eco-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4C10 2 6.5 2 4.5 4.5S4 10 12 16c8-6 8.5-9 6.5-11.5S14 2 12 4z"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
            <p className="eco-label">Organizations</p>
            <h3>Deployed within hours</h3>
            <p>Small nonprofits manage thousands of requests on spreadsheets. Faith-based groups self-organize through group chats. Everyone responds.</p>
          </div>
          <div className="eco-card gs-fade">
            <svg className="sos-icon eco-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V9l7-5 7 5v12"/><line x1="9" y1="21" x2="9" y2="14"/><line x1="15" y1="21" x2="15" y2="14"/><line x1="12" y1="21" x2="12" y2="14"/></svg>
            <p className="eco-label">Government &amp; Emergency Services</p>
            <h3>Overwhelmed &amp; underfunded</h3>
            <p>85% of state emergency agencies cite infrastructure limitations.<a href="https://www.deloitte.com/us/en/insights/industry/government-public-sector-services/emergency-management-preparedness-response.html" className="cite" target="_blank" rel="noopener">⁷</a> Working with tools from a different era.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
