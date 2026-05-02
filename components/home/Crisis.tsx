'use client';

export function Crisis() {
  return (
    <section id="crisis" className="bg-white">
      <div className="narrow">
        <div className="stat-row mb-48">
          <div className="stat-card gs-fade">
            <div className="num" data-count="305" data-suffix="M+" data-prefix="">0</div>
            <div className="desc">people needed humanitarian assistance globally in 2025<a href="https://www.unocha.org/publications/report/world/global-humanitarian-overview-2026-enesfr" className="cite" target="_blank" rel="noopener">¹</a></div>
          </div>
          <div className="stat-card gs-fade">
            <div className="num" data-count="68" data-suffix="%" data-prefix="">0</div>
            <div className="desc">didn&apos;t receive it<a href="https://www.unocha.org/publications/report/world/global-humanitarian-overview-2026-enesfr" className="cite" target="_blank" rel="noopener">¹</a></div>
          </div>
          <div className="stat-card gs-fade">
            <div className="num" data-count="24" data-suffix="B" data-prefix="$">0</div>
            <div className="desc">funding shortfall — the largest on record<a href="https://carnegieendowment.org/russia-eurasia/research/2025/12/the-painful-seismic-shift-in-humanitarian-aidand-whats-next" className="cite" target="_blank" rel="noopener">²</a></div>
          </div>
        </div>

        <p className="label gs-fade">The Crisis</p>
        <h2 className="gs-fade">The Great Aid Recession</h2>
        <div className="accent-line gs-fade"></div>

        <div className="crisis-grid gs-fade crisis-points">
          <div>
            <p className="crisis-label">FUNDING COLLAPSED</p>
            <p className="crisis-text">Humanitarian funding dropped 40% in a single year.<a href="https://carnegieendowment.org/russia-eurasia/research/2025/12/the-painful-seismic-shift-in-humanitarian-aidand-whats-next" className="cite" target="_blank" rel="noopener">²</a> The largest shortfall ever recorded.</p>
          </div>
          <div>
            <p className="crisis-label">FEMA IS RETREATING</p>
            <p className="crisis-text">Non-lifesaving recovery defunded. Twenty states have sued to restart preparedness grants.<a href="https://www.npr.org/2026/03/30/nx-s1-5753765/fema-trump-extreme-weather-rural-pennsylvania" className="cite" target="_blank" rel="noopener">⁴</a></p>
          </div>
          <div>
            <p className="crisis-label">DISASTERS ACCELERATING</p>
            <p className="crisis-text">The safety net is contracting at the exact moment communities need it most.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
