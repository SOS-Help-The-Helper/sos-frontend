'use client';

export function Solution() {
  return (
    <>
      <section id="solution" className="bg-light-alt">
        <div className="wide">
          <div className="solution-grid">
            <div>
              <svg viewBox="0 0 400 420" className="flywheel-svg" id="flywheelSvg">
                <defs>
                  <marker id="fw-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#89CFF0" opacity="0.6"/>
                  </marker>
                </defs>
                <circle cx="200" cy="200" r="140" fill="none" stroke="#89CFF0" strokeWidth="1" opacity="0.15" className="flywheel-ring-anim"/>
                <path className="flywheel-arc" d="M 224 62 A 140 140 0 0 1 324 134" fill="none" stroke="#89CFF0" strokeWidth="1.5" opacity="0" markerEnd="url(#fw-arrow)"/>
                <path className="flywheel-arc" d="M 339 181 A 140 140 0 0 1 301 297" fill="none" stroke="#89CFF0" strokeWidth="1.5" opacity="0" markerEnd="url(#fw-arrow)"/>
                <path className="flywheel-arc" d="M 261 326 A 140 140 0 0 1 139 326" fill="none" stroke="#89CFF0" strokeWidth="1.5" opacity="0" markerEnd="url(#fw-arrow)"/>
                <path className="flywheel-arc" d="M 99 297 A 140 140 0 0 1 61 181" fill="none" stroke="#89CFF0" strokeWidth="1.5" opacity="0" markerEnd="url(#fw-arrow)"/>
                <path className="flywheel-arc" d="M 76 134 A 140 140 0 0 1 176 62" fill="none" stroke="#89CFF0" strokeWidth="1.5" opacity="0" markerEnd="url(#fw-arrow)"/>
                <g className="flywheel-node">
                  <circle cx="200" cy="60" r="28" fill="#f8f9fa" stroke="#89CFF0" strokeWidth="1.5"/>
                  <text x="200" y="56" textAnchor="middle" fill="#89CFF0" fontSize="10" fontWeight="700" fontFamily="'Nunito Sans', sans-serif" letterSpacing="0.05em">01</text>
                  <text x="200" y="70" textAnchor="middle" fill="#0F1E2B" fontSize="11" fontWeight="600" fontFamily="'Nunito Sans', sans-serif">Intake</text>
                </g>
                <g className="flywheel-node">
                  <circle cx="333" cy="157" r="28" fill="#f8f9fa" stroke="#89CFF0" strokeWidth="1.5"/>
                  <text x="333" y="153" textAnchor="middle" fill="#89CFF0" fontSize="10" fontWeight="700" fontFamily="'Nunito Sans', sans-serif" letterSpacing="0.05em">02</text>
                  <text x="333" y="167" textAnchor="middle" fill="#0F1E2B" fontSize="11" fontWeight="600" fontFamily="'Nunito Sans', sans-serif">Match</text>
                </g>
                <g className="flywheel-node">
                  <circle cx="282" cy="313" r="28" fill="#f8f9fa" stroke="#89CFF0" strokeWidth="1.5"/>
                  <text x="282" y="309" textAnchor="middle" fill="#89CFF0" fontSize="10" fontWeight="700" fontFamily="'Nunito Sans', sans-serif" letterSpacing="0.05em">03</text>
                  <text x="282" y="323" textAnchor="middle" fill="#0F1E2B" fontSize="11" fontWeight="600" fontFamily="'Nunito Sans', sans-serif">Coordinate</text>
                </g>
                <g className="flywheel-node">
                  <circle cx="118" cy="313" r="28" fill="#f8f9fa" stroke="#89CFF0" strokeWidth="1.5"/>
                  <text x="118" y="309" textAnchor="middle" fill="#89CFF0" fontSize="10" fontWeight="700" fontFamily="'Nunito Sans', sans-serif" letterSpacing="0.05em">04</text>
                  <text x="118" y="323" textAnchor="middle" fill="#0F1E2B" fontSize="11" fontWeight="600" fontFamily="'Nunito Sans', sans-serif">Fulfill</text>
                </g>
                <g className="flywheel-node">
                  <circle cx="67" cy="157" r="28" fill="#f8f9fa" stroke="#89CFF0" strokeWidth="1.5"/>
                  <text x="67" y="153" textAnchor="middle" fill="#89CFF0" fontSize="10" fontWeight="700" fontFamily="'Nunito Sans', sans-serif" letterSpacing="0.05em">05</text>
                  <text x="67" y="167" textAnchor="middle" fill="#0F1E2B" fontSize="11" fontWeight="600" fontFamily="'Nunito Sans', sans-serif">Learn</text>
                </g>
                <image href="/logomark-red.svg" x="172" y="172" width="56" height="56" className="flywheel-center"/>
              </svg>
            </div>
            <div>
              <p className="label gs-fade">The Solution</p>
              <h2 className="gs-fade">Relief as permaculture.</h2>
              <div className="accent-line gs-fade"></div>
              <p className="body-lg gs-fade mt-24">
                SOS is coordination infrastructure that connects citizens, nonprofits, government agencies, emergency services, and vendors — so that when someone needs help and someone else can provide it, the connection actually happens.
              </p>
            </div>
          </div>

          <div className="result-card gs-fade">
            <p>
              The system doesn&apos;t just respond to disasters — it learns from them. Revenue from connecting homeowners with vetted contractors funds coordination for people with no insurance, no savings, no safety net.
            </p>
          </div>
        </div>
      </section>

      {/* Wave: Solution → Scenario */}
      <div className="wave-divider wave-divider--navy">
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,0 L1440,0 L1440,30 C1200,60 960,10 720,35 C480,60 240,15 0,40 Z" fill="#f1f3f5"/>
        </svg>
      </div>
    </>
  );
}
