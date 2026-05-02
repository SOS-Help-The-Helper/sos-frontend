'use client';

export function Coordination() {
  return (
    <section id="coordination" className="bg-light">
      <div className="narrow">
        <p className="coord-pull-quote gs-fade">&ldquo;The help always shows up. The coordination doesn&apos;t.&rdquo;</p>

        <p className="label gs-fade">The Problem</p>
        <h2 className="gs-fade">When coordination fails, help scatters.</h2>
        <div className="accent-line gs-fade"></div>

        <div className="coord-intro gs-fade">
          <p className="coord-text mb-12">After Helene, FEMA&apos;s resource system crashed under ten times its normal volume.<a href="https://www.ncdps.gov/tropical-storm-helene-after-action-review" className="cite" target="_blank" rel="noopener">³</a></p>
          <p className="coord-text mb-12">Search and rescue checked the same homes three times. Others were never checked at all.</p>
          <p className="coord-text">Facebook became the missing persons database — not by design, but because nothing else worked.</p>
        </div>

        <div className="coord-grid" id="coordParallax">
          <div className="coord-block coord-fail gs-fade">
            <h4>When coordination fails</h4>
            <p>Three organizations can help one family. Without coordination, two never hear about the need. The third shows up a week late. The family called nine hotlines. Nobody tracks what was spent.</p>
          </div>
          <div className="coord-block coord-work gs-fade">
            <h4>When coordination works</h4>
            <p>The shelter, food team, and medical transport all receive the same match simultaneously. Each knows what the other is doing. Every dollar traced. Every contribution attributed. The system learns.</p>
          </div>
        </div>

        <p className="body-lg gs-fade text-center mt-16">
          <em className="coord-highlight">The technology to make this possible didn&apos;t exist two years ago. It does now.</em>
        </p>
      </div>
    </section>
  );
}
