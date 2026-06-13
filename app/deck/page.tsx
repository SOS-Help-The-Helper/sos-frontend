'use client';

import { useEffect, useRef } from 'react';

export default function DeckPage() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Inject Google Fonts
  useEffect(() => {
    const existing = document.getElementById('deck-fonts');
    if (existing) return;
    const link = document.createElement('link');
    link.id = 'deck-fonts';
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Nunito+Sans:wght@300;400;600;700;800&display=swap';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    // ── Progress bar ──────────────────────────────────────────────────
    const onScroll = () => {
      const max = scroller.scrollHeight - scroller.clientHeight;
      const pct = max > 0 ? (scroller.scrollTop / max) * 100 : 0;
      if (progressRef.current) progressRef.current.style.width = pct + '%';
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // ── Keyboard nav ──────────────────────────────────────────────────
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

    // ── GSAP polish (non-blocking) ────────────────────────────────────
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

        scroller.querySelectorAll<HTMLElement>('.ds-fade').forEach((el) => {
          gsap.from(el, {
            scrollTrigger: { trigger: el, start: 'top 88%' },
            opacity: 0,
            y: 28,
            duration: 0.75,
            ease: 'power2.out',
          });
        });

        scroller.querySelectorAll<HTMLElement>('.ds-stagger').forEach((group) => {
          const kids = group.querySelectorAll<HTMLElement>(':scope > *');
          gsap.from(kids, {
            scrollTrigger: { trigger: group, start: 'top 85%' },
            opacity: 0,
            y: 32,
            duration: 0.65,
            stagger: parseFloat(group.dataset.stagger || '') || 0.15,
            ease: 'power2.out',
          });
        });

        scroller.querySelectorAll<HTMLElement>('.ds-count').forEach((el) => {
          const target = parseFloat(el.dataset.count || '0');
          const prefix = el.dataset.prefix || '';
          const suffix = el.dataset.suffix || '';
          const decimals = parseInt(el.dataset.decimals || '0', 10);
          let done = false;
          ScrollTrigger.create({
            trigger: el,
            start: 'top 88%',
            onEnter: () => {
              if (done) return;
              done = true;
              const obj = { val: 0 };
              gsap.to(obj, {
                val: target,
                duration: 1.8,
                ease: 'power2.out',
                onUpdate: () => {
                  el.textContent = prefix + obj.val.toFixed(decimals) + suffix;
                },
              });
            },
          });
        });

        scroller.querySelectorAll<HTMLElement>('.ds-tl-dot').forEach((dot, i) => {
          const parent = dot.closest('.ds-timeline');
          if (!parent) return;
          gsap.from(dot, {
            scrollTrigger: { trigger: parent, start: 'top 85%' },
            scale: 0,
            transformOrigin: 'center center',
            duration: 0.45,
            delay: i * 0.18,
            ease: 'back.out(1.7)',
          });
        });

        ScrollTrigger.refresh();
        cleanupGsap = () => ScrollTrigger.getAll().forEach((t) => t.kill());
      } catch {
        /* graceful degradation — page is fully visible without GSAP */
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
      <style dangerouslySetInnerHTML={{ __html: deckCss }} />

      {/* Thin red progress bar */}
      <div className="d-progress-track">
        <div className="d-progress-bar" ref={progressRef} />
      </div>

      <div className="deck" ref={scrollerRef}>

        {/* ──────────────────────────────────────────────────────────
            01 · HERO
        ────────────────────────────────────────────────────────── */}
        <section className="deck-section s-navy s-hero">
          <div className="grain" />
          <div className="inner center ds-fade">
            <img src="/logomark-red.svg" alt="SOS logomark" className="hero-logo" />
            <h1 className="hero-title">SOS</h1>
            <p className="hero-sub">Coordination infrastructure for communities.</p>
            <p className="hero-url">sosconnect.org</p>
          </div>
          <span className="scroll-hint" aria-hidden="true">↓</span>
        </section>

        {/* ── BRIDGE: THE PROBLEM ─────────────────────────────────── */}
        <section className="deck-section s-navy">
          <div className="grain" />
          <div className="inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <h2 className="ds-fade" style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 'clamp(28px, 5vw, 52px)', color: 'rgba(255,255,255,0.85)', textAlign: 'center' as const, lineHeight: 1.2, maxWidth: '700px' }}>
              The safety net is shrinking.
            </h2>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            02 · THE QUOTE
        ────────────────────────────────────────────────────────── */}
        <section className="deck-section s-navy">
          <div className="grain" />
          <div className="inner ds-fade">
            <div className="quote-wrap">
              <div className="quote-accent-line" />
              <blockquote className="quote-huge">
                <p>&ldquo;It is time to close the chapter on FEMA.&rdquo;</p>
                <cite>— FEMA Review Council Final Report, May 7, 2026</cite>
              </blockquote>
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            03 · THE NUMBERS
        ────────────────────────────────────────────────────────── */}
        <section className="deck-section s-navy">
          <div className="inner ds-stagger" data-stagger="0.22">
            <div className="float-stat">
              <span
                className="float-num ds-count"
                data-count="16"
              >16</span>
              <span className="float-desc">fewer federal disaster declarations per year</span>
            </div>
            <div className="float-stat">
              <span
                className="float-num ds-count"
                data-count="54.8"
                data-prefix="$"
                data-suffix="B"
                data-decimals="1"
              >$54.8B</span>
              <span className="float-desc">stuck in unliquidated obligations</span>
            </div>
            <div className="float-stat">
              <span
                className="float-num ds-count"
                data-count="25"
                data-suffix="¢"
              >25¢</span>
              <span className="float-desc">of every dollar lost to administration</span>
            </div>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            04 · THE GAP
        ────────────────────────────────────────────────────────── */}
        <section className="deck-section s-navy">
          <div className="inner center ds-fade">
            <p className="sec-label">The Gap</p>
            <div
              className="gap-num ds-count"
              data-count="85"
              data-suffix="%"
            >85%</div>
            <p className="gap-desc">
              of state emergency agencies cite infrastructure as their primary barrier.
            </p>
            <p className="gap-source">Deloitte-NEMA State Emergency Management Survey, 2025</p>
          </div>
        </section>

        {/* ── BRIDGE: THE RESPONSE ────────────────────────────────── */}
        <section className="deck-section s-navy">
          <div className="grain" />
          <div className="inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <h2 className="ds-fade" style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 'clamp(24px, 4.5vw, 46px)', color: 'rgba(255,255,255,0.85)', textAlign: 'center' as const, lineHeight: 1.3, maxWidth: '720px' }}>
              The response isn&rsquo;t disappearing.<br />
              <span style={{ color: '#89CFF0' }}>It&rsquo;s happening where the systems can&rsquo;t see.</span>
            </h2>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            05 · EVERYONE IS A HELPER
        ────────────────────────────────────────────────────────── */}
        <section className="deck-section s-cream">
          <div className="inner">
            <p className="sec-label sec-label--dark ds-fade">05</p>
            <h2 className="eyah-headline ds-fade">Everyone is a helper.</h2>
            <p className="eyah-stat ds-fade">
              <strong>76%</strong> of survivors turn to neighbors before any agency.
            </p>
            <div className="eyah-stories ds-stagger" data-stagger="0.2">
              <p>The firefighter who lost her home is both survivor and first responder.</p>
              <p>The contractor who donates his RV volunteers to install generators.</p>
              <p>The church leader running food distribution needs housing for her own family.</p>
            </div>
            <p className="eyah-close ds-fade">SOS sees the whole person.</p>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            06 · ONE RECORD
        ────────────────────────────────────────────────────────── */}
        <section className="deck-section s-white">
          <div className="inner">
            <p className="sec-label sec-label--dark ds-fade">06</p>
            <div className="one-record ds-stagger" data-stagger="0.14">
              <p style={{ paddingLeft: '0' }}>One person.</p>
              <p style={{ paddingLeft: '1.8rem' }}>One lifetime record.</p>
              <p style={{ paddingLeft: '3.6rem' }}>Every need.</p>
              <p style={{ paddingLeft: '5.4rem' }}>Every offer.</p>
              <p style={{ paddingLeft: '7.2rem' }}>Every outcome.</p>
            </div>
          </div>
        </section>

        {/* ── BRIDGE: THE INFRASTRUCTURE ──────────────────────────── */}
        <section className="deck-section s-navy">
          <div className="grain" />
          <div className="inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <h2 className="ds-fade" style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 'clamp(24px, 4.5vw, 46px)', color: 'rgba(255,255,255,0.85)', textAlign: 'center' as const, lineHeight: 1.3, maxWidth: '700px' }}>
              What if the infrastructure existed?
            </h2>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            07 · INTAKE
        ────────────────────────────────────────────────────────── */}
        <section className="deck-section s-navy">
          <div className="grain" />
          <div className="inner loop-section ds-fade">
            <p className="sec-label">Intake</p>
            <h2 className="loop-title">A citizen texts a number.</h2>
            <p className="loop-body">AI parses the need. No app. No account. Any phone.</p>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            08 · MATCHING
        ────────────────────────────────────────────────────────── */}
        <section className="deck-section s-navy-alt">
          <div className="grain" />
          <div className="inner loop-section ds-fade">
            <p className="sec-label">Matching</p>
            <h2 className="loop-title">The engine scores by capability, proximity, capacity, and trust.</h2>
            <p className="loop-body">No match exists until a human confirms.</p>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            09 · FULFILLMENT
        ────────────────────────────────────────────────────────── */}
        <section className="deck-section s-navy">
          <div className="grain" />
          <div className="inner loop-section ds-fade">
            <p className="sec-label">Fulfillment</p>
            <h2 className="loop-title">Three levels: partner delivers. Citizen confirms. Citizen rates.</h2>
            <p className="loop-body">Trust is earned from real outcomes.</p>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            10 · LEARNING
        ────────────────────────────────────────────────────────── */}
        <section className="deck-section s-navy">
          <div className="grain" />
          <div className="inner loop-section">
            <p className="sec-label ds-fade">Learning</p>
            <h2 className="loop-title ds-fade">
              Every decision traced. Every outcome recorded. Every failure rewrites the playbook.
            </h2>
            <p className="loop-body ds-fade">
              The system that coordinated Helene knows what works next time.
            </p>
            <p className="loop-compliance ds-fade">
              Compliance is a byproduct. NIMS records, audit trails, FEMA reporting —
              generated automatically at every step.
            </p>
          </div>
        </section>

        {/* ── BRIDGE: THE MOAT ────────────────────────────────────── */}
        <section className="deck-section s-navy">
          <div className="grain" />
          <div className="inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
            <h2 className="ds-fade" style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 'clamp(24px, 4.5vw, 46px)', color: 'rgba(255,255,255,0.85)', textAlign: 'center' as const, lineHeight: 1.3, maxWidth: '720px' }}>
              A system that gets smarter<br />
              <span style={{ color: '#89CFF0' }}>with every match.</span>
            </h2>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            11 · THE MOAT
        ────────────────────────────────────────────────────────── */}
        <section className="deck-section s-navy">
          <div className="inner">
            <p className="sec-label ds-fade">11</p>
            <h2 className="moat-title ds-fade">Intelligence That Compounds</h2>
            <div className="moat-lines ds-stagger" data-stagger="0.18">
              <p>Every match teaches the next match.</p>
              <p>Free for citizens and NGOs. Forever.</p>
              <p>The connection graph grows with every coordination.</p>
            </div>
            <p className="moat-protocol ds-fade">
              &ldquo;Be the protocol, not the monopoly.&rdquo;
            </p>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            12 · THE OPPORTUNITY
        ────────────────────────────────────────────────────────── */}
        <section className="deck-section s-white">
          <div className="inner">
            <p className="sec-label sec-label--dark ds-fade">12</p>
            <h2 className="opp-headline ds-fade">
              $46 billion flows through disaster communities every year.
            </h2>
            <p className="opp-sub ds-fade">
              Almost none funds the coordination that makes recovery work.
            </p>
            <ul className="rev-list ds-stagger" data-stagger="0.12">
              <li>
                <strong>Vetted contractor marketplace</strong>
                {' '}— connect homeowners with insurance payouts to trusted local pros.
              </li>
              <li>
                <strong>Partner SaaS</strong>
                {' '}— coordination tooling for NGOs, agencies, and emergency managers.
              </li>
              <li>
                <strong>Data &amp; insights</strong>
                {' '}— anonymized demand signals for funders, insurers, and planners.
              </li>
              <li>
                <strong>Logistics &amp; fulfillment</strong>
                {' '}— take-rate on coordinated transport, supplies, and services.
              </li>
              <li>
                <strong>Philanthropic &amp; public funding</strong>
                {' '}— grants and contracts for the open coordination layer itself.
              </li>
            </ul>
            <p className="opp-close ds-fade">
              The humanitarian economy should fund the communities it serves.
            </p>
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            13 · THE ARC
        ────────────────────────────────────────────────────────── */}
        <section className="deck-section s-navy">
          <div className="inner">
            <p className="sec-label ds-fade">Beyond Disasters</p>
            <h2 className="arc-title ds-fade">
              The arc of this work extends far past a single storm.
            </h2>
            <div className="ds-timeline ds-stagger" data-stagger="0.15">
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
          </div>
        </section>

        {/* ──────────────────────────────────────────────────────────
            14 · CLOSING
        ────────────────────────────────────────────────────────── */}
        <section className="deck-section s-closing">
          <div className="grain" />
          <div className="inner center ds-fade">
            <p className="closing-main">Everyone is a helper.</p>
            <p className="closing-glow">We help the helpers.</p>
            <p className="closing-url">sosconnect.org</p>
          </div>
        </section>

      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STYLES — all CSS lives here. Content is visible by default.
   GSAP only adds entrance polish; nothing is hidden behind JS.
═══════════════════════════════════════════════════════════════════ */
const deckCss = `
/* ── Reset / base ────────────────────────────────────────────── */
.deck, .deck * { box-sizing: border-box; margin: 0; padding: 0; }

.deck {
  position: fixed; inset: 0;
  overflow-y: scroll; overflow-x: hidden;
  scroll-snap-type: y mandatory;
  -webkit-overflow-scrolling: touch;
  font-family: 'Nunito Sans', -apple-system, sans-serif;
  font-weight: 400; line-height: 1.8;
  background: #0F1E2B; color: #fff;
  -webkit-font-smoothing: antialiased;
}

/* ── Progress bar ─────────────────────────────────────────────── */
.d-progress-track {
  position: fixed; top: 0; left: 0; right: 0; height: 3px;
  background: rgba(255,255,255,0.06); z-index: 9999;
}
.d-progress-bar {
  height: 100%; width: 0%;
  background: #EF4E4B;
  box-shadow: 0 0 10px rgba(239,78,75,0.55);
  transition: width 0.1s linear;
}

/* ── Sections ─────────────────────────────────────────────────── */
.deck-section {
  position: relative;
  min-height: 100vh; min-height: 100dvh;
  scroll-snap-align: start;
  display: flex; align-items: center; justify-content: center;
  padding: 100px 48px;
  overflow: hidden;
}
.inner {
  position: relative; z-index: 2;
  width: 100%; max-width: 800px; margin: 0 auto;
}
.center { text-align: center; }

/* ── Backgrounds ──────────────────────────────────────────────── */
.s-navy    { background: #0F1E2B; color: #fff; }
.s-navy-alt { background: #111f2e; color: #fff; }
.s-cream   { background: #F5EBD6; color: #0F1E2B; }
.s-white   { background: #ffffff; color: #0F1E2B; }
.s-closing { background: #08131c; color: #fff; }

/* ── Grain overlay ────────────────────────────────────────────── */
.grain {
  position: absolute; inset: 0; z-index: 1;
  opacity: 0.025; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-repeat: repeat; background-size: 256px 256px;
}

/* ── Section label ────────────────────────────────────────────── */
.sec-label {
  font-family: 'Nunito Sans', sans-serif;
  font-size: 11px; font-weight: 800;
  letter-spacing: 0.28em; text-transform: uppercase;
  color: #EF4E4B; margin-bottom: 24px; display: block;
}
.sec-label--dark { color: #EF4E4B; }

/* ══════════════════════════════════════════════════════════════
   01 · HERO
══════════════════════════════════════════════════════════════ */
.s-hero { justify-content: center; }
.hero-logo { height: 60px; margin: 0 auto 32px; display: block; }
.hero-title {
  font-family: 'DM Serif Display', Georgia, serif;
  font-weight: 400; font-size: clamp(80px, 18vw, 148px);
  line-height: 1; color: #fff; letter-spacing: 0.03em;
}
.hero-sub {
  font-size: clamp(18px, 2.4vw, 24px); font-weight: 300;
  color: rgba(255,255,255,0.65); margin-top: 24px; line-height: 1.5;
}
.hero-url {
  font-size: 11px; font-weight: 800; letter-spacing: 0.28em;
  text-transform: uppercase; color: #89CFF0; margin-top: 36px; display: block;
}
.scroll-hint {
  position: absolute; bottom: 36px; left: 50%; transform: translateX(-50%);
  z-index: 3; font-size: 28px; color: rgba(255,255,255,0.25);
  animation: bounce 2s ease-in-out infinite;
}
@keyframes bounce {
  0%, 100% { transform: translate(-50%, 0); }
  50%       { transform: translate(-50%, 9px); }
}

/* ══════════════════════════════════════════════════════════════
   02 · THE QUOTE
══════════════════════════════════════════════════════════════ */
.quote-wrap {
  display: flex; align-items: flex-start; gap: 40px;
  max-width: 780px;
}
.quote-accent-line {
  flex-shrink: 0;
  width: 4px; background: #EF4E4B;
  border-radius: 2px;
  align-self: stretch;
  min-height: 100%;
}
.quote-huge p {
  font-family: 'DM Serif Display', Georgia, serif;
  font-style: italic; font-weight: 400;
  font-size: clamp(30px, 5.5vw, 56px);
  line-height: 1.2; color: #fff;
}
.quote-huge cite {
  display: block; margin-top: 24px;
  font-style: normal; font-size: 13px; font-weight: 300;
  letter-spacing: 0.04em; color: rgba(255,255,255,0.4);
}

/* ══════════════════════════════════════════════════════════════
   03 · THE NUMBERS
══════════════════════════════════════════════════════════════ */
.float-stat {
  display: flex; align-items: baseline; gap: 28px;
  padding: 16px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.float-stat:last-child { border-bottom: none; }
.float-num {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: clamp(72px, 13vw, 120px);
  line-height: 1; color: #fff; flex-shrink: 0;
  min-width: 220px;
}
.float-desc {
  font-size: clamp(16px, 1.8vw, 20px); font-weight: 300;
  color: rgba(255,255,255,0.45); line-height: 1.5; max-width: 320px;
}

/* ══════════════════════════════════════════════════════════════
   04 · THE GAP
══════════════════════════════════════════════════════════════ */
.gap-num {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: clamp(100px, 22vw, 180px);
  line-height: 1; color: #EF4E4B;
  margin: 8px auto 0;
  display: block;
  text-shadow: 0 0 60px rgba(239,78,75,0.18);
}
.gap-desc {
  font-size: clamp(20px, 3vw, 28px); font-weight: 300;
  color: rgba(255,255,255,0.7); max-width: 640px;
  margin: 24px auto 0; line-height: 1.55;
}
.gap-source {
  font-size: 12px; font-weight: 300; letter-spacing: 0.04em;
  color: rgba(255,255,255,0.28); margin-top: 20px;
}

/* ══════════════════════════════════════════════════════════════
   05 · EVERYONE IS A HELPER
══════════════════════════════════════════════════════════════ */
.eyah-headline {
  font-family: 'DM Serif Display', Georgia, serif;
  font-weight: 400; font-size: clamp(44px, 8vw, 72px);
  line-height: 1.1; color: #0F1E2B; margin-bottom: 28px;
}
.eyah-stat {
  font-size: clamp(20px, 3vw, 28px); font-weight: 300;
  color: #3d4852; margin-bottom: 40px; line-height: 1.5;
}
.eyah-stat strong {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: 1.4em; color: #EF4E4B; font-weight: 400;
}
.eyah-stories > p {
  font-size: clamp(17px, 2vw, 20px); font-weight: 300;
  color: #555; line-height: 1.7; padding: 14px 0;
  border-bottom: 1px solid rgba(15,30,43,0.08);
}
.eyah-stories > p:first-child { border-top: 1px solid rgba(15,30,43,0.08); }
.eyah-close {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: clamp(24px, 3.5vw, 36px); font-weight: 400;
  color: #0F1E2B; margin-top: 40px;
}

/* ══════════════════════════════════════════════════════════════
   06 · ONE RECORD
══════════════════════════════════════════════════════════════ */
.one-record > p {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: clamp(32px, 5.5vw, 56px); font-weight: 400;
  line-height: 1.25; color: #0F1E2B;
}

/* ══════════════════════════════════════════════════════════════
   07 – 10 · THE LOOP SECTIONS
══════════════════════════════════════════════════════════════ */
.loop-section { max-width: 720px; }
.loop-title {
  font-family: 'DM Serif Display', Georgia, serif;
  font-weight: 400; font-size: clamp(34px, 5.5vw, 56px);
  line-height: 1.15; color: #fff; margin-bottom: 24px;
}
.loop-body {
  font-size: clamp(18px, 2.2vw, 22px); font-weight: 300;
  color: rgba(255,255,255,0.55); line-height: 1.7; max-width: 560px;
}
.loop-compliance {
  margin-top: 40px; padding: 20px 24px;
  border-left: 3px solid #89CFF0;
  background: rgba(137,207,240,0.06);
  border-radius: 0 10px 10px 0;
  font-size: 15px; font-weight: 300; line-height: 1.75;
  color: rgba(255,255,255,0.65); max-width: 640px;
}

/* ══════════════════════════════════════════════════════════════
   11 · THE MOAT
══════════════════════════════════════════════════════════════ */
.moat-title {
  font-family: 'DM Serif Display', Georgia, serif;
  font-weight: 400; font-size: clamp(36px, 5.5vw, 56px);
  line-height: 1.1; color: #fff; margin-bottom: 48px;
}
.moat-lines > p {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: clamp(22px, 3.2vw, 34px); font-weight: 400;
  color: rgba(255,255,255,0.7); line-height: 1.4;
  padding: 16px 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.moat-lines > p:first-child { border-top: 1px solid rgba(255,255,255,0.06); }
.moat-protocol {
  font-family: 'DM Serif Display', Georgia, serif;
  font-style: italic; font-size: clamp(22px, 3.2vw, 32px);
  color: #89CFF0; margin-top: 48px;
  text-shadow: 0 0 40px rgba(137,207,240,0.25);
}

/* ══════════════════════════════════════════════════════════════
   12 · THE OPPORTUNITY
══════════════════════════════════════════════════════════════ */
.opp-headline {
  font-family: 'DM Serif Display', Georgia, serif;
  font-weight: 400; font-size: clamp(32px, 5.5vw, 56px);
  line-height: 1.15; color: #0F1E2B; margin-bottom: 16px;
}
.opp-sub {
  font-size: clamp(17px, 2vw, 20px); font-weight: 300;
  color: #555; margin-bottom: 40px; line-height: 1.65;
}
.rev-list {
  list-style: none;
  margin-bottom: 40px;
}
.rev-list li {
  font-size: clamp(15px, 1.8vw, 18px); font-weight: 300;
  color: #3d4852; line-height: 1.7;
  padding: 14px 0 14px 20px; position: relative;
  border-bottom: 1px solid rgba(15,30,43,0.07);
}
.rev-list li:first-child { border-top: 1px solid rgba(15,30,43,0.07); }
.rev-list li::before {
  content: ''; position: absolute; left: 0; top: 24px;
  width: 7px; height: 7px; border-radius: 50%; background: #EF4E4B;
}
.rev-list li strong { color: #0F1E2B; font-weight: 700; }
.opp-close {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: clamp(20px, 2.8vw, 28px); color: #0F1E2B; line-height: 1.5;
}

/* ══════════════════════════════════════════════════════════════
   13 · THE ARC — timeline
══════════════════════════════════════════════════════════════ */
.arc-title {
  font-family: 'DM Serif Display', Georgia, serif;
  font-weight: 400; font-size: clamp(28px, 4vw, 44px);
  line-height: 1.2; color: #fff; margin-bottom: 56px; max-width: 680px;
}
.ds-timeline {
  display: flex; justify-content: space-between;
  gap: 16px; position: relative; margin-bottom: 12px;
}
.ds-timeline::before {
  content: ''; position: absolute;
  left: 7px; right: 7px; top: 6px; height: 2px;
  background: rgba(137,207,240,0.18);
}
.ds-tl-item {
  display: flex; flex-direction: column; align-items: center;
  text-align: center; flex: 1; position: relative;
}
.ds-tl-dot {
  width: 14px; height: 14px; border-radius: 50%;
  background: #89CFF0; flex-shrink: 0;
  box-shadow: 0 0 0 4px rgba(137,207,240,0.12);
  margin-bottom: 16px; position: relative; z-index: 1;
}
.ds-tl-item:first-child .ds-tl-dot {
  background: #EF4E4B;
  box-shadow: 0 0 0 4px rgba(239,78,75,0.15);
}
.ds-tl-year {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: 15px; color: #89CFF0; margin-bottom: 6px;
  display: block;
}
.ds-tl-label {
  font-size: 12px; font-weight: 300;
  color: rgba(255,255,255,0.5); line-height: 1.5;
}

/* ══════════════════════════════════════════════════════════════
   14 · CLOSING
══════════════════════════════════════════════════════════════ */
.closing-main {
  font-family: 'DM Serif Display', Georgia, serif;
  font-weight: 400; font-size: clamp(40px, 8vw, 80px);
  line-height: 1.1; color: #F5EBD6; margin-bottom: 16px;
}
.closing-glow {
  font-family: 'DM Serif Display', Georgia, serif;
  font-weight: 400; font-size: clamp(32px, 6vw, 60px);
  line-height: 1.1; color: #89CFF0;
  text-shadow:
    0 0 30px rgba(137,207,240,0.55),
    0 0 80px rgba(137,207,240,0.3),
    0 0 140px rgba(137,207,240,0.15);
}
.closing-url {
  font-size: 11px; font-weight: 800; letter-spacing: 0.28em;
  text-transform: uppercase; color: rgba(137,207,240,0.55);
  margin-top: 48px; display: block;
}

/* ══════════════════════════════════════════════════════════════
   MOBILE
══════════════════════════════════════════════════════════════ */
@media (max-width: 680px) {
  .deck-section { padding: 80px 24px; }

  .float-stat { flex-direction: column; gap: 6px; }
  .float-num  { min-width: unset; font-size: clamp(64px, 18vw, 96px); }
  .float-desc { max-width: 100%; font-size: 15px; }

  .one-record > p { padding-left: 0 !important; font-size: clamp(26px, 7vw, 40px); }

  .ds-timeline { flex-direction: column; gap: 20px; }
  .ds-timeline::before {
    left: 6px; right: auto; top: 0; bottom: 0;
    width: 2px; height: auto;
  }
  .ds-tl-item {
    flex-direction: row; align-items: flex-start;
    text-align: left; gap: 16px;
  }
  .ds-tl-dot { margin-bottom: 0; margin-top: 2px; flex-shrink: 0; }

  .quote-wrap { gap: 20px; }
  .quote-accent-line { display: none; }

  .loop-body { font-size: 16px; }
  .moat-lines > p { font-size: 20px; }
  .eyah-stories > p { font-size: 16px; }
}
`;
