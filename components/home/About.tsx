'use client';

export function About() {
  return (
    <section id="about" className="about-section">
      <div className="narrow relative z-2">
        <div className="about-timeline">
          <div className="about-timeline-item gs-fade">
            <p className="about-timeline-year">2024</p>
            <p>SOS started during Hurricane Helene. Our founder&apos;s farmhouse was damaged. He lived in a donated RV for three months.</p>
          </div>
          <div className="about-timeline-item gs-fade">
            <p className="about-timeline-year">2025</p>
            <p>Since Helene, SOS has activated for every major disaster — including the Blizzard of 2026,<a href="https://www.foxweather.com/watch/fmc-pc525bwm58bnkvy1" className="cite" target="_blank" rel="noopener">¹⁰</a> coordinating hundreds of resources across 12 states.</p>
          </div>
          <div className="about-timeline-item gs-fade">
            <p className="about-timeline-year">2026</p>
            <p>The values are structural, not aspirational. Partners keep their data. Citizens control their privacy. No profiles. No surveillance. Communities deserve infrastructure that works for them, not on them.</p>
          </div>
        </div>

        <div className="gs-fade mt-48">
          <img src="/logomark-red.svg" alt="SOS" id="invitationLogo" className="logo-md" />
        </div>
      </div>
    </section>
  );
}
