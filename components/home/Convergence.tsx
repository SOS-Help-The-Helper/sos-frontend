'use client';

export function Convergence() {
  return (
    <>
      <section id="convergence" className="bg-navy">
        <div className="narrow">
          <p className="label gs-fade text-center">The Convergence</p>
          <h2 className="gs-fade text-center">Three things are converging at once</h2>
          <div className="accent-line gs-fade accent-line-center"></div>

          <div className="convergence-grid">
            <div className="convergence-card gs-fade">
              <svg className="sos-icon sos-icon-block" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              <h4>Systems Are Failing</h4>
              <p>FEMA has stopped funding non-lifesaving disaster recovery.<a href="https://www.npr.org/2026/03/30/nx-s1-5753765/fema-trump-extreme-weather-rural-pennsylvania" className="cite" target="_blank" rel="noopener">⁴</a> Twenty states have sued to restart the largest federal preparedness grant program. Humanitarian funding dropped 40% in a single year.<a href="https://carnegieendowment.org/russia-eurasia/research/2025/12/the-painful-seismic-shift-in-humanitarian-aidand-whats-next" className="cite" target="_blank" rel="noopener">²</a></p>
            </div>
            <div className="convergence-card gs-fade">
              <svg className="sos-icon sos-icon-block" viewBox="0 0 24 24" fill="none" stroke="#89CFF0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <h4>Communities Respond First</h4>
              <p>Three out of four people turn to neighbors before any agency.<a href="https://www.sciencedirect.com/science/article/abs/pii/S2212420921005070" className="cite" target="_blank" rel="noopener">⁶</a> The largest coordination network already exists — it just has no infrastructure.</p>
            </div>
            <div className="convergence-card gs-fade">
              <svg className="sos-icon sos-icon-block" viewBox="0 0 24 24" fill="none" stroke="#89CFF0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" strokeDasharray="2 3"/><circle cx="12" cy="12" r="11" opacity="0.4"/></svg>
              <h4>Coordination Is Now Possible</h4>
              <p>AI coordination — conversational intake, real-time matching, multi-channel orchestration — is feasible today. None of this was possible two years ago.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Wave: Convergence → Ecosystem */}
      <div className="wave-divider wave-divider--white">
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,0 L1440,0 L1440,30 C1200,60 960,10 720,35 C480,60 240,15 0,40 Z" fill="#0F1E2B"/>
        </svg>
      </div>
    </>
  );
}
