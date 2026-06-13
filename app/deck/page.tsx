'use client';

import { useEffect, useRef } from 'react';

/**
 * /deck — scroll-based presentation page for SOS.
 *
 * Design contract (do not break):
 *  - NO blocking animation sequences. Every section's content is fully visible
 *    on scroll-into-view. GSAP only adds entrance polish (a quick fade / a
 *    counter tween). If GSAP never loads, the page is still complete and
 *    readable — nothing is hidden behind JS. A busy reader can scroll the whole
 *    deck in ~60 seconds.
 *  - Matches the homepage aesthetic: DM Serif Display + Nunito Sans, navy
 *    #0F1E2B, red #EF4E4B, blue #89CFF0, cream #F5EBD6, subtle grain overlay.
 *  - Full-viewport scroll-snap sections, keyboard nav, top progress bar.
 */
export default function DeckPage() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    // ── Progress bar (cheap, always works regardless of GSAP) ──
    const onScroll = () => {
      const max = scroller.scrollHeight - scroller.clientHeight;
      const pct = max > 0 ? (scroller.scrollTop / max) * 100 : 0;
      if (progressRef.current) progressRef.current.style.width = pct + '%';
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // ── Keyboard navigation (Arrow keys + Space) ──
    const sections = Array.from(
      scroller.querySelectorAll<HTMLElement>('.deck-section')
    );
    const goTo = (dir: 1 | -1) => {
      const cur = scroller.scrollTop;
      const tops = sections.map((s) => s.offsetTop);
      let target: number | undefined;
      if (dir > 0) target = tops.find((t) => t > cur + 12);
      else target = [...tops].reverse().find((t) => t < cur - 12);
      if (target != null) scroller.scrollTo({ top: target, behavior: 'smooth' });
    };
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        goTo(1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        goTo(-1);
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        goTo(e.shiftKey ? -1 : 1);
      }
    };
    window.addEventListener('keydown', onKey);

    // ── GSAP polish (loaded lazily; the page is complete without it) ──
    let cleanupGsap: (() => void) | undefined;
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const initGSAP = async () => {
      if (reduceMotion) return;
      try {
        const gsap = (await import('gsap')).default;
        const ScrollTrigger = (await import('gsap/ScrollTrigger')).default;
        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.defaults({ scroller });

        // Entrance fades — content starts visible in CSS, gsap.from animates IN.
        scroller.querySelectorAll<HTMLElement>('.ds-fade').forEach((el) => {
          gsap.from(el, {
            scrollTrigger: { trigger: el, start: 'top 88%' },
            opacity: 0,
            y: 24,
            duration: 0.7,
            ease: 'power2.out',
          });
        });

        // Staggered groups (stat rows, flow steps, cards, timeline)
        scroller.querySelectorAll<HTMLElement>('.ds-stagger').forEach((group) => {
          const kids = group.querySelectorAll<HTMLElement>(':scope > *');
          gsap.from(kids, {
            scrollTrigger: { trigger: group, start: 'top 85%' },
            opacity: 0,
            y: 28,
            duration: 0.6,
            stagger: 0.12,
            ease: 'power2.out',
          });
        });

        // Animated counters (0 → value). Final value is in the DOM already.
        scroller.querySelectorAll<HTMLElement>('.ds-count').forEach((el) => {
          const target = parseFloat(el.dataset.count || '0');
          const prefix = el.dataset.prefix || '';
          const suffix = el.dataset.suffix || '';
          const decimals = parseInt(el.dataset.decimals || '0', 10);
          let done = false;
          ScrollTrigger.create({
            trigger: el,
            start: 'top 85%',
            onEnter: () => {
              if (done) return;
              done = true;
              const obj = { val: 0 };
              gsap.to(obj, {
                val: target,
                duration: 1.6,
                ease: 'power2.out',
                onUpdate: () => {
                  el.textContent = prefix + obj.val.toFixed(decimals) + suffix;
                },
              });
            },
          });
        });

        ScrollTrigger.refresh();
        cleanupGsap = () => ScrollTrigger.getAll().forEach((t) => t.kill());
      } catch {
        /* GSAP unavailable — page remains fully visible & functional. */
      }
    };
    initGSAP();

    return () => {
      scroller.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKey);
      cleanupGsap?.();
    };
  }, []);

  return (
    <>
      {/* Same Google Fonts as the homepage */}
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Nunito+Sans:wght@300;400;600;700;800&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: deckCss }} />

      {/* Top scroll-progress indicator */}
      <div className="deck-progress-track">
        <div className="deck-progress-bar" ref={progressRef} />
      </div>

      <div className="deck" ref={scrollerRef}>
        {/* ── 01 · HERO ─────────────────────────────────────────── */}
        <section className="deck-section ds-navy ds-hero">
          <div className="grain-overlay" />
          <div className="ds-inner ds-center ds-fade">
            <img src="/logomark-red.svg" alt="SOS" className="ds-hero-logo" />
            <h1 className="ds-hero-title">SOS</h1>
            <p className="ds-hero-sub">Coordination infrastructure for communities.</p>
            <p className="ds-hero-url">sosconnect.org</p>
          </div>
          <div className="ds-scroll-hint" aria-hidden="true">↓</div>
        </section>

        {/* ── 02 · THE SAFETY NET IS SHRINKING ──────────────────── */}
        <section className="deck-section ds-navy">
          <div className="ds-inner">
            <p className="ds-num-label ds-fade">01</p>
            <h2 className="ds-h2 ds-fade">The Safety Net Is Shrinking</h2>
            <p className="ds-sub ds-fade">
              Federal disaster infrastructure is being deliberately dismantled.
              Communities are on their own.
            </p>

            <blockquote className="ds-quote ds-fade">
              <p>&ldquo;It is time to close the chapter on FEMA.&rdquo;</p>
              <cite>— FEMA Review Council Final Report, May 7, 2026</cite>
            </blockquote>

            <div className="ds-stat-grid ds-stagger">
              <div className="ds-stat">
                <div className="ds-stat-num ds-count" data-count="16">16</div>
                <div className="ds-stat-desc">fewer federal declarations per year</div>
              </div>
              <div className="ds-stat">
                <div
                  className="ds-stat-num ds-count"
                  data-count="54.8"
                  data-prefix="$"
                  data-suffix="B"
                  data-decimals="1"
                >
                  $54.8B
                </div>
                <div className="ds-stat-desc">stuck in unliquidated obligations</div>
              </div>
              <div className="ds-stat">
                <div
                  className="ds-stat-num ds-count"
                  data-count="25"
                  data-suffix="¢"
                >
                  25¢
                </div>
                <div className="ds-stat-desc">of every dollar goes to admin</div>
              </div>
              <div className="ds-stat">
                <div
                  className="ds-stat-num ds-count"
                  data-count="85"
                  data-suffix="%"
                >
                  85%
                </div>
                <div className="ds-stat-desc">
                  of state EM agencies cite infrastructure as a barrier
                </div>
              </div>
            </div>

            <p className="ds-footnote ds-fade">
              Sources: FEMA Review Council Final Report (2026); GAO disaster
              obligation reviews; Deloitte state emergency management survey.
            </p>
          </div>
        </section>

        {/* ── 03 · EVERYONE IS A HELPER ─────────────────────────── */}
        <section className="deck-section ds-cream">
          <div className="ds-inner">
            <p className="ds-num-label ds-fade">02</p>
            <h2 className="ds-h2 ds-fade">Everyone Is a Helper</h2>
            <p className="ds-sub ds-fade">
              The line between who needs help and who gives it doesn&apos;t exist.
            </p>

            <div className="ds-bigstat ds-fade">
              <span className="ds-bigstat-num ds-count" data-count="76" data-suffix="%">
                76%
              </span>
              <span className="ds-bigstat-desc">
                of survivors turn to neighbors before any agency
              </span>
            </div>

            <div className="ds-body ds-fade">
              <p>
                The firefighter whose own home flooded still pulls neighbors from
                the water. The contractor donating a week of labor needs a tarp by
                Friday. The church leader running a shelter is also looking for a
                ride to dialysis. People move in and out of need and capacity —
                often on the same day.
              </p>
            </div>

            <p className="ds-bold-line ds-fade">
              SOS sees the whole person. One lifetime record.
            </p>
          </div>
        </section>

        {/* ── 04 · COORDINATION AS INFRASTRUCTURE ───────────────── */}
        <section className="deck-section ds-navy">
          <div className="ds-inner">
            <p className="ds-num-label ds-fade">03</p>
            <h2 className="ds-h2 ds-fade">Coordination as Infrastructure</h2>
            <p className="ds-sub ds-fade">
              Connect the need to the help. Trace the outcome.
            </p>

            <div className="ds-flow ds-stagger">
              <div className="ds-flow-step">
                <span className="ds-flow-k">01</span>
                <span className="ds-flow-name">Intake</span>
              </div>
              <span className="ds-flow-arrow" aria-hidden="true">→</span>
              <div className="ds-flow-step">
                <span className="ds-flow-k">02</span>
                <span className="ds-flow-name">Matching</span>
              </div>
              <span className="ds-flow-arrow" aria-hidden="true">→</span>
              <div className="ds-flow-step">
                <span className="ds-flow-k">03</span>
                <span className="ds-flow-name">Fulfillment</span>
              </div>
              <span className="ds-flow-arrow" aria-hidden="true">→</span>
              <div className="ds-flow-step">
                <span className="ds-flow-k">04</span>
                <span className="ds-flow-name">Learning</span>
              </div>
              <span className="ds-flow-loop" aria-hidden="true">
                ↻ feeds back into intake
              </span>
            </div>

            <div className="ds-callout ds-callout--blue ds-fade">
              <p>
                Compliance is a byproduct, not a task. Because every match, dollar,
                and outcome is recorded as it happens, reporting writes itself —
                no one stops responding in order to document.
              </p>
            </div>

            <blockquote className="ds-quote ds-quote--blue ds-fade">
              <p>
                &ldquo;A mandatory national inventory of disaster resources is
                essential to closing the coordination gap.&rdquo;
              </p>
              <cite>— FEMA Review Council Final Report, May 7, 2026</cite>
            </blockquote>
          </div>
        </section>

        {/* ── 05 · WHY NOW ──────────────────────────────────────── */}
        <section className="deck-section ds-light">
          <div className="ds-inner">
            <p className="ds-num-label ds-fade">04</p>
            <h2 className="ds-h2 ds-fade">Why Now</h2>
            <p className="ds-sub ds-fade">
              Federal vacuum. Proven demand. AI that finally makes it possible.
            </p>

            <div className="ds-cols ds-stagger">
              <div className="ds-col">
                <h3 className="ds-col-title ds-col-title--red">The Vacuum</h3>
                <p>
                  Disaster-declaration thresholds are rising and recovery programs
                  are being defunded by executive action. The federal backstop
                  communities relied on is quietly disappearing.
                </p>
              </div>
              <div className="ds-col">
                <h3 className="ds-col-title ds-col-title--navy">The Demand</h3>
                <p>
                  19 million 211 referrals a year already route people to help by
                  hand. $9.2B in social-determinant-of-health spending is searching
                  for coordination it can&apos;t find.
                </p>
              </div>
              <div className="ds-col">
                <h3 className="ds-col-title ds-col-title--blue">The Technology</h3>
                <p>
                  AI coordination agents can now do conversational intake, real-time
                  matching, and multi-channel orchestration at scale. None of this
                  was possible two years ago.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 06 · INTELLIGENCE THAT COMPOUNDS ──────────────────── */}
        <section className="deck-section ds-navy">
          <div className="ds-inner">
            <p className="ds-num-label ds-fade">05</p>
            <h2 className="ds-h2 ds-fade">Intelligence That Compounds</h2>
            <p className="ds-sub ds-fade">
              Open the engine. Keep the learning. Every match makes the next one
              smarter.
            </p>

            <div className="ds-moat-grid ds-stagger">
              <div className="ds-moat ds-moat--red">
                <h3>Compounding intelligence</h3>
                <p>
                  Every resolved need trains the matching engine. The graph of who
                  helped whom, with what, and how well — that data can&apos;t be
                  bought or copied. It only accrues to the network that does the work.
                </p>
              </div>
              <div className="ds-moat ds-moat--blue">
                <h3>Free for citizens &amp; NGOs</h3>
                <p>
                  The people in crisis and the groups serving them never pay. Free
                  access drives adoption, and adoption is what makes the
                  intelligence compound.
                </p>
              </div>
              <div className="ds-moat ds-moat--cream">
                <h3>The connection graph</h3>
                <p>
                  Relationships between people, organizations, resources, and
                  outcomes form a living map of a community&apos;s real response
                  capacity — the asset no single agency could ever assemble alone.
                </p>
              </div>
            </div>

            <p className="ds-pullquote ds-fade">
              &ldquo;Be the protocol, not the monopoly.&rdquo;
            </p>
          </div>
        </section>

        {/* ── 07 · THE OPPORTUNITY ──────────────────────────────── */}
        <section className="deck-section ds-white">
          <div className="ds-inner">
            <p className="ds-num-label ds-fade">06</p>
            <h2 className="ds-h2 ds-fade">The Opportunity</h2>
            <p className="ds-sub ds-fade">
              $46 billion flows through disaster communities every year. Almost
              none of it funds the coordination.
            </p>

            <div className="ds-body ds-fade">
              <p>
                Today that money is extracted: out-of-town contractors, claims
                middlemen, and consultants capture the value while the local
                response runs on spreadsheets and goodwill. SOS re-routes a sliver
                of that flow back into the infrastructure that makes the whole
                system work — and uses it to keep coordination free for the people
                who need it.
              </p>
            </div>

            <ul className="ds-revenue ds-stagger">
              <li>
                <span className="ds-rev-name">Vetted contractor marketplace</span>
                <span className="ds-rev-desc">
                  — connect homeowners with insurance payouts to trusted local pros.
                </span>
              </li>
              <li>
                <span className="ds-rev-name">Partner SaaS</span>
                <span className="ds-rev-desc">
                  — coordination tooling for NGOs, agencies, and emergency managers.
                </span>
              </li>
              <li>
                <span className="ds-rev-name">Data &amp; insights</span>
                <span className="ds-rev-desc">
                  — anonymized demand signals for funders, insurers, and planners.
                </span>
              </li>
              <li>
                <span className="ds-rev-name">Logistics &amp; fulfillment</span>
                <span className="ds-rev-desc">
                  — take-rate on coordinated transport, supplies, and services.
                </span>
              </li>
              <li>
                <span className="ds-rev-name">Philanthropic &amp; public funding</span>
                <span className="ds-rev-desc">
                  — grants and contracts for the open coordination layer itself.
                </span>
              </li>
            </ul>

            <p className="ds-bold-line ds-fade">
              A dual structure: a nonprofit protocol for the commons, funded by a
              for-profit marketplace on top of it.
            </p>
          </div>
        </section>

        {/* ── 08 · BEYOND DISASTERS ─────────────────────────────── */}
        <section className="deck-section ds-navy ds-final">
          <div className="grain-overlay" />
          <div className="ds-inner">
            <p className="ds-num-label ds-fade">07</p>
            <h2 className="ds-h2 ds-fade">Beyond Disasters</h2>
            <p className="ds-sub ds-fade">
              Disaster coordination is where we start. Community infrastructure is
              where this goes.
            </p>

            <div className="ds-timeline ds-stagger">
              <div className="ds-tl-item">
                <span className="ds-tl-dot" />
                <span className="ds-tl-year">Today</span>
                <span className="ds-tl-label">Disaster response coordination</span>
              </div>
              <div className="ds-tl-item">
                <span className="ds-tl-dot" />
                <span className="ds-tl-year">Year 1</span>
                <span className="ds-tl-label">Multi-disaster, multi-region network</span>
              </div>
              <div className="ds-tl-item">
                <span className="ds-tl-dot" />
                <span className="ds-tl-year">Year 2</span>
                <span className="ds-tl-label">Year-round community resilience</span>
              </div>
              <div className="ds-tl-item">
                <span className="ds-tl-dot" />
                <span className="ds-tl-year">Year 3</span>
                <span className="ds-tl-label">Health &amp; social-services coordination</span>
              </div>
              <div className="ds-tl-item">
                <span className="ds-tl-dot" />
                <span className="ds-tl-year">Year 5</span>
                <span className="ds-tl-label">The coordination layer for communities</span>
              </div>
            </div>

            <div className="ds-closing ds-fade">
              <p className="ds-closing-line">Everyone is a helper.</p>
              <p className="ds-closing-line ds-closing-glow">We help the helpers.</p>
            </div>

            <p className="ds-hero-url ds-final-url ds-fade">sosconnect.org</p>
          </div>
        </section>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   Styles — scoped under .deck (+ progress bar). Mirrors the homepage
   palette and type. Content is visible by default; GSAP only adds
   entrance polish, so nothing here hides content behind opacity:0.
   ════════════════════════════════════════════════════════════════ */
const deckCss = `
.deck, .deck * { box-sizing: border-box; }

.deck {
  position: fixed;
  inset: 0;
  overflow-y: scroll;
  overflow-x: hidden;
  scroll-snap-type: y mandatory;
  -webkit-overflow-scrolling: touch;
  font-family: 'Nunito Sans', -apple-system, sans-serif;
  font-weight: 400;
  line-height: 1.7;
  background: #0F1E2B;
  color: #fff;
  -webkit-font-smoothing: antialiased;
}

/* ── Progress bar ── */
.deck-progress-track {
  position: fixed; top: 0; left: 0; right: 0; height: 3px;
  background: rgba(255,255,255,0.06); z-index: 9999;
}
.deck-progress-bar {
  height: 100%; width: 0%;
  background: #EF4E4B;
  box-shadow: 0 0 8px rgba(239,78,75,0.5);
  transition: width 0.1s linear;
}

/* ── Sections ── */
.deck-section {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  scroll-snap-align: start;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 32px;
  overflow: hidden;
}
.ds-inner { position: relative; z-index: 2; width: 100%; max-width: 920px; margin: 0 auto; }
.ds-center { text-align: center; }

/* ── Backgrounds ── */
.ds-navy  { background: #0F1E2B; color: #fff; }
.ds-white { background: #ffffff; color: #0F1E2B; }
.ds-light { background: #f8f9fa; color: #0F1E2B; }
.ds-cream { background: #F5EBD6; color: #0F1E2B; }

/* ── Grain overlay (same recipe as homepage) ── */
.grain-overlay {
  position: absolute; inset: 0; z-index: 1;
  opacity: 0.02; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-repeat: repeat; background-size: 256px 256px;
}

/* ── Shared typography ── */
.ds-num-label {
  font-family: 'Nunito Sans', sans-serif;
  font-size: 13px; font-weight: 800; letter-spacing: 0.25em;
  color: #EF4E4B; margin-bottom: 18px;
}
.ds-h2 {
  font-family: 'DM Serif Display', Georgia, serif;
  font-weight: 400; font-size: clamp(32px, 5vw, 48px); line-height: 1.1;
  margin-bottom: 18px;
}
.ds-sub {
  font-size: clamp(17px, 2.2vw, 21px); font-weight: 300; line-height: 1.55;
  max-width: 680px; margin-bottom: 36px;
}
.ds-navy .ds-sub { color: rgba(255,255,255,0.6); }
.ds-white .ds-sub, .ds-light .ds-sub, .ds-cream .ds-sub { color: #555; }

.ds-body { max-width: 680px; margin: 0 0 28px; }
.ds-body p { font-size: 17px; font-weight: 300; line-height: 1.8; }
.ds-navy .ds-body p { color: rgba(255,255,255,0.7); }
.ds-white .ds-body p, .ds-light .ds-body p, .ds-cream .ds-body p { color: #3d4852; }

.ds-bold-line {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: clamp(20px, 3vw, 28px); line-height: 1.4; margin-top: 8px;
}
.ds-navy .ds-bold-line { color: #fff; }
.ds-cream .ds-bold-line, .ds-white .ds-bold-line { color: #0F1E2B; }

.ds-footnote {
  margin-top: 32px; font-size: 12px; font-weight: 300;
  color: rgba(255,255,255,0.35); max-width: 680px; line-height: 1.6;
}

/* ── Hero (01) ── */
.ds-hero-logo { height: 64px; margin: 0 auto 28px; display: block; }
.ds-hero-title {
  font-family: 'DM Serif Display', Georgia, serif; font-weight: 400;
  font-size: clamp(72px, 16vw, 140px); line-height: 1; color: #fff;
  letter-spacing: 0.04em;
}
.ds-hero-sub {
  font-size: clamp(18px, 2.6vw, 24px); font-weight: 300;
  color: rgba(255,255,255,0.7); margin-top: 22px;
}
.ds-hero-url {
  font-size: 12px; font-weight: 700; letter-spacing: 0.22em;
  text-transform: uppercase; color: #89CFF0; margin-top: 28px;
}
.ds-scroll-hint {
  position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%);
  z-index: 2; font-size: 26px; color: rgba(255,255,255,0.3);
  animation: ds-bounce 1.8s ease-in-out infinite;
}
@keyframes ds-bounce { 0%,100% { transform: translate(-50%,0); } 50% { transform: translate(-50%,8px); } }

/* ── Blockquotes ── */
.ds-quote {
  border-left: 3px solid #EF4E4B; padding: 4px 0 4px 24px;
  margin: 32px 0; max-width: 680px;
}
.ds-quote p {
  font-family: 'DM Serif Display', Georgia, serif; font-style: italic;
  font-size: clamp(22px, 3.4vw, 30px); line-height: 1.35; color: #fff;
}
.ds-quote cite {
  display: block; margin-top: 14px; font-style: normal;
  font-size: 13px; font-weight: 600; letter-spacing: 0.04em;
  color: rgba(255,255,255,0.45);
}
.ds-quote--blue { border-left-color: #89CFF0; }

/* ── Stat grid (02) ── */
.ds-stat-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-top: 8px;
}
.ds-stat {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px; padding: 22px 18px;
}
.ds-stat-num {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: clamp(34px, 4.4vw, 48px); line-height: 1; color: #fff;
}
.ds-stat-desc {
  font-size: 13px; color: rgba(255,255,255,0.55); margin-top: 10px; line-height: 1.5;
}

/* ── Big stat (03) ── */
.ds-bigstat {
  display: flex; align-items: baseline; gap: 20px; flex-wrap: wrap;
  margin: 8px 0 32px;
}
.ds-bigstat-num {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: clamp(72px, 13vw, 120px); line-height: 0.95; color: #EF4E4B;
}
.ds-bigstat-desc {
  font-size: clamp(16px, 2vw, 20px); font-weight: 300; color: #555; max-width: 360px;
}

/* ── Flow diagram (04) ── */
.ds-flow {
  display: flex; align-items: center; flex-wrap: wrap; gap: 14px;
  margin: 8px 0 36px;
}
.ds-flow-step {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(137,207,240,0.25);
  border-radius: 14px; padding: 20px 22px; min-width: 120px;
}
.ds-flow-k { font-size: 11px; font-weight: 800; letter-spacing: 0.15em; color: #89CFF0; }
.ds-flow-name { font-family: 'DM Serif Display', Georgia, serif; font-size: 19px; color: #fff; }
.ds-flow-arrow { color: #89CFF0; font-size: 22px; opacity: 0.7; }
.ds-flow-loop {
  flex-basis: 100%; margin-top: 6px; font-size: 13px; font-weight: 600;
  letter-spacing: 0.08em; color: #89CFF0; opacity: 0.8;
}

/* ── Callout box ── */
.ds-callout {
  border-left: 4px solid #89CFF0; background: rgba(137,207,240,0.07);
  border-radius: 0 12px 12px 0; padding: 22px 26px; max-width: 720px; margin: 0 0 28px;
}
.ds-callout p { font-size: 16px; font-weight: 300; line-height: 1.7; color: rgba(255,255,255,0.8); }

/* ── Why now columns (05) ── */
.ds-cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; margin-top: 8px; }
.ds-col p { font-size: 15px; line-height: 1.75; color: #555; font-weight: 300; }
.ds-col-title {
  font-family: 'DM Serif Display', Georgia, serif; font-size: 24px; margin-bottom: 12px;
}
.ds-col-title--red  { color: #EF4E4B; }
.ds-col-title--navy { color: #0F1E2B; }
.ds-col-title--blue { color: #4a9fd4; }

/* ── Moat cards (06) ── */
.ds-moat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 8px 0 36px; }
.ds-moat {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px; padding: 26px 24px; border-top: 3px solid transparent;
}
.ds-moat h3 { font-family: 'DM Serif Display', Georgia, serif; font-weight: 400; font-size: 21px; color: #fff; margin-bottom: 12px; }
.ds-moat p { font-size: 14px; line-height: 1.7; color: rgba(255,255,255,0.6); font-weight: 300; }
.ds-moat--red   { border-top-color: #EF4E4B; }
.ds-moat--blue  { border-top-color: #89CFF0; }
.ds-moat--cream { border-top-color: #F5EBD6; }

.ds-pullquote {
  font-family: 'DM Serif Display', Georgia, serif; font-style: italic;
  font-size: clamp(24px, 3.6vw, 34px); color: #89CFF0; text-align: center;
  text-shadow: 0 0 30px rgba(137,207,240,0.2);
}

/* ── Revenue list (07) ── */
.ds-revenue { list-style: none; margin: 8px 0 28px; max-width: 760px; }
.ds-revenue li {
  position: relative; padding: 12px 0 12px 26px; font-size: 16px; line-height: 1.6;
  border-bottom: 1px solid rgba(15,30,43,0.08);
}
.ds-revenue li::before {
  content: ''; position: absolute; left: 4px; top: 20px;
  width: 8px; height: 8px; border-radius: 50%; background: #EF4E4B;
}
.ds-rev-name { font-weight: 700; color: #0F1E2B; }
.ds-rev-desc { color: #555; font-weight: 300; }

/* ── Timeline (08) ── */
.ds-timeline {
  display: flex; justify-content: space-between; gap: 12px;
  margin: 16px 0 48px; position: relative;
}
.ds-timeline::before {
  content: ''; position: absolute; left: 0; right: 0; top: 6px; height: 1.5px;
  background: rgba(137,207,240,0.2);
}
.ds-tl-item { display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1; position: relative; }
.ds-tl-dot {
  width: 13px; height: 13px; border-radius: 50%; background: #89CFF0;
  box-shadow: 0 0 0 4px rgba(137,207,240,0.15); margin-bottom: 14px;
}
.ds-tl-year { font-size: 13px; font-weight: 800; letter-spacing: 0.08em; color: #89CFF0; margin-bottom: 6px; }
.ds-tl-label { font-size: 12px; font-weight: 300; color: rgba(255,255,255,0.6); line-height: 1.45; }

/* ── Closing (08) ── */
.ds-closing { text-align: center; margin: 8px 0 28px; }
.ds-closing-line {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: clamp(30px, 6vw, 56px); line-height: 1.15; color: #fff;
}
.ds-closing-glow {
  color: #89CFF0;
  text-shadow: 0 0 30px rgba(137,207,240,0.5), 0 0 70px rgba(137,207,240,0.3), 0 0 120px rgba(137,207,240,0.15);
}
.ds-final-url { text-align: center; }

/* ── Mobile ── */
@media (max-width: 760px) {
  .deck-section { padding: 64px 20px; }
  .ds-stat-grid { grid-template-columns: 1fr 1fr; }
  .ds-cols { grid-template-columns: 1fr; gap: 20px; }
  .ds-moat-grid { grid-template-columns: 1fr; }
  .ds-flow { flex-direction: column; align-items: stretch; }
  .ds-flow-step { width: 100%; flex-direction: row; justify-content: space-between; }
  .ds-flow-arrow { transform: rotate(90deg); align-self: center; }
  .ds-timeline { flex-direction: column; gap: 18px; }
  .ds-timeline::before { left: 6px; right: auto; top: 0; bottom: 0; width: 1.5px; height: auto; }
  .ds-tl-item { flex-direction: row; align-items: center; gap: 12px; text-align: left; padding-left: 4px; }
  .ds-tl-dot { margin-bottom: 0; flex-shrink: 0; }
  .ds-bigstat { gap: 8px; }
}
`;
