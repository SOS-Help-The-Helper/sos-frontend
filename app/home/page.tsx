'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import '@/styles/home.css';

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroVisibleRef = useRef(true);

  useEffect(() => {
    // Dynamically load GSAP
    const initGSAP = async () => {
      const gsap = (await import('gsap')).default;
      const ScrollTrigger = (await import('gsap/ScrollTrigger')).default;
      gsap.registerPlugin(ScrollTrigger);

      // Canvas setup
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      function initCanvas() {
        if (!canvas || !ctx) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        ctx.fillStyle = '#0F1E2B';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      initCanvas();

      // Intersection observer for hero visibility
      const heroEl = document.getElementById('hero');
      if (heroEl) {
        const observer = new IntersectionObserver((entries) => {
          heroVisibleRef.current = entries[0].isIntersecting;
        }, { threshold: 0 });
        observer.observe(heroEl);
      }

      // Canvas animation loop
      function drawPulse() {
        if (!heroVisibleRef.current || !ctx || !canvas) {
          requestAnimationFrame(drawPulse);
          return;
        }
        ctx.fillStyle = '#0F1E2B';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        requestAnimationFrame(drawPulse);
      }
      requestAnimationFrame(drawPulse);

      // Resize handler
      let resizeTimer: NodeJS.Timeout;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(initCanvas, 200);
      });

      // Nav scroll effect
      const nav = document.getElementById('navbar');
      const navLinks = document.querySelectorAll('.nav-links a');
      const sectionIds = ['crisis', 'coordination', 'convergence', 'ecosystem', 'solution', 'scenario', 'about', 'stories', 'invitation'];

      function updateNav() {
        const scrollY = window.scrollY;
        nav?.classList.toggle('scrolled', scrollY > 60);
        let current = '';
        for (let i = sectionIds.length - 1; i >= 0; i--) {
          const el = document.getElementById(sectionIds[i]);
          if (el && el.getBoundingClientRect().top <= 140) {
            current = sectionIds[i];
            break;
          }
        }
        navLinks.forEach((link) => {
          link.classList.toggle('active', link.getAttribute('data-section') === current);
        });
      }
      window.addEventListener('scroll', updateNav, { passive: true });

      // Utility functions for hero animation
      const charPool = '0123456789.:;=+<>|/\\{}[]~^*#@!?$%&';
      const charArr = charPool.split('');
      const randBuf: string[] = [];
      for (let i = 0; i < 256; i++) randBuf[i] = charArr[Math.floor(Math.random() * charArr.length)];
      let randIdx = 0;
      function randChar() { return randBuf[randIdx++ & 255]; }

      function anim(targets: any, vars: any): Promise<void> {
        return new Promise((resolve) => {
          vars.onComplete = resolve;
          gsap.to(targets, vars);
        });
      }

      function wait(ms: number): Promise<void> {
        return new Promise((r) => setTimeout(r, ms));
      }

      function typeInto(el: HTMLElement, text: string, speed: number): Promise<void> {
        return new Promise((resolve) => {
          let i = 0;
          el.style.borderRight = '2px solid #EF4E4B';
          el.style.paddingRight = '4px';
          el.style.animation = 'blink 0.8s step-end infinite';
          function step() {
            if (i < text.length) {
              i++;
              el.textContent = text.substring(0, i);
              el.style.borderRight = '2px solid #EF4E4B';
              el.style.paddingRight = '4px';
              const delay = speed * (0.92 + Math.random() * 0.16);
              setTimeout(step, delay);
            } else {
              el.style.borderRight = 'none';
              el.style.paddingRight = '0';
              el.style.animation = 'none';
              resolve();
            }
          }
          step();
        });
      }

      function dissolveText(container: HTMLElement): Promise<void> {
        return new Promise((resolve) => {
          const text = container.textContent || '';
          container.innerHTML = '';
          const spans: HTMLSpanElement[] = [];
          for (let i = 0; i < text.length; i++) {
            const s = document.createElement('span');
            s.textContent = text[i];
            s.style.display = 'inline';
            container.appendChild(s);
            spans.push(s);
          }
          let pending = 0;
          spans.forEach((sp, idx) => {
            if (sp.textContent?.trim() === '') {
              gsap.to(sp, { opacity: 0, duration: 0.1 });
              return;
            }
            pending++;
            let sc = 0;
            const mx = 4 + Math.floor(Math.random() * 4);
            function tick() {
              sp.textContent = randChar();
              sp.style.color = 'rgba(137,207,240,0.2)';
              sp.style.filter = 'blur(1.5px)';
              sp.style.transform = 'scaleX(1.3)';
              sc++;
              if (sc >= mx) {
                gsap.to(sp, { opacity: 0, duration: 0.15 });
                pending--;
                if (pending <= 0) resolve();
              } else {
                setTimeout(tick, 30);
              }
            }
            setTimeout(tick, idx * 18);
          });
          if (pending === 0) resolve();
        });
      }

      function wipeCanvas() {
        if (!ctx || !canvas) return;
        ctx.fillStyle = '#0F1E2B';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      function makeCursor(el: HTMLElement) {
        el.style.borderRight = '2px solid #EF4E4B';
        el.style.paddingRight = '4px';
        el.style.animation = 'blink 0.8s step-end infinite';
      }

      // Hero sequence
      const stage = document.getElementById('heroTextStage');
      const mc = document.getElementById('morphContainer');
      const isMobile = window.innerWidth < 640;
      const p2FontSize = isMobile ? '28px' : '44px';

      if (stage && mc) {
        await wait(550);

        // Phase 1
        gsap.set(stage, { opacity: 1 });
        mc.style.cssText = 'display:block;text-align:center;opacity:1;';
        const typingSpan = document.createElement('span');
        typingSpan.style.display = 'inline';
        mc.appendChild(typingSpan);
        await typeInto(typingSpan, "when help doesn't show up", 65);
        await wait(420);
        await dissolveText(typingSpan);
        await wait(200);
        wipeCanvas();

        // Phase 2
        await wait(500);
        mc.innerHTML = '';
        const slamSpan = document.createElement('span');
        slamSpan.textContent = 'people do';
        slamSpan.style.cssText = `color:#EF4E4B;text-shadow:0 0 20px rgba(239,78,75,0.35),0 0 40px rgba(239,78,75,0.15);font-size:${isMobile ? '32px' : '48px'};`;
        mc.appendChild(slamSpan);
        gsap.set(slamSpan, { opacity: 0, scale: 1.4 });
        await anim(slamSpan, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2)' });
        await wait(1000);
        await anim(mc, { opacity: 0, duration: 1.2, ease: 'power2.inOut' });
        wipeCanvas();

        // Phase 3
        mc.innerHTML = '';
        mc.style.display = 'flex';
        mc.style.flexDirection = 'column';
        mc.style.alignItems = 'center';
        mc.style.textAlign = 'center';
        mc.style.opacity = '1';

        const line1 = document.createElement('div');
        line1.style.cssText = `font-family:"DM Serif Display",Georgia,serif;font-size:${p2FontSize};color:#fff;text-align:center;`;
        makeCursor(line1);
        mc.appendChild(line1);

        const line2 = document.createElement('div');
        line2.style.cssText = `font-family:"DM Serif Display",Georgia,serif;font-size:${p2FontSize};color:#fff;margin-bottom:16px;text-align:center;`;
        mc.appendChild(line2);

        const rotatingEl = document.createElement('div');
        rotatingEl.style.cssText = `font-family:"DM Serif Display",Georgia,serif;font-size:${p2FontSize};color:#89CFF0;min-height:50px;text-shadow:0 0 15px rgba(137,207,240,0.3);`;
        mc.appendChild(rotatingEl);

        await typeInto(line1, 'what if', 90);
        await wait(300);
        makeCursor(line2);
        await typeInto(line2, 'they could', 90);
        await wait(350);

        const completions = ['find each other', 'see the full picture', 'move as one'];
        for (let ci = 0; ci < completions.length; ci++) {
          rotatingEl.textContent = completions[ci];
          gsap.set(rotatingEl, { opacity: 0, y: 12 });
          await anim(rotatingEl, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
          if (ci === completions.length - 1) {
            await wait(140);
            rotatingEl.style.color = '#EF4E4B';
            rotatingEl.style.textShadow = '0 0 20px rgba(239,78,75,0.35), 0 0 40px rgba(239,78,75,0.15)';
            rotatingEl.style.transition = 'color 0.5s, text-shadow 0.5s';
            await wait(840);
          } else {
            await wait(490);
            await anim(rotatingEl, { opacity: 0, y: -12, duration: 0.25, ease: 'power2.in' });
          }
        }

        await wait(350);
        await wait(200);
        await anim(mc, { opacity: 0, duration: 1.2, ease: 'power2.inOut' });
        wipeCanvas();

        // Phase 4
        mc.innerHTML = '';
        mc.style.display = 'flex';
        mc.style.flexDirection = 'column';
        mc.style.alignItems = 'center';
        mc.style.gap = '16px';
        mc.style.opacity = '1';

        const line4a = document.createElement('div');
        line4a.style.cssText = `font-family:"DM Serif Display",Georgia,serif;font-size:${p2FontSize};color:rgba(255,255,255,0.6);opacity:0;transition:opacity 1.4s ease;`;
        mc.appendChild(line4a);
        line4a.textContent = 'everyone is a helper';

        await wait(50);
        line4a.style.opacity = '1';
        await wait(1400);
        await wait(500);

        const line4b = document.createElement('div');
        line4b.style.cssText = `font-family:"DM Serif Display",Georgia,serif;font-size:${p2FontSize};color:#89CFF0;opacity:0;transition:opacity 0.8s ease, text-shadow 1.5s ease;text-shadow:0 0 15px rgba(137,207,240,0.3);`;
        mc.appendChild(line4b);
        line4b.textContent = 'we help the helpers';

        await wait(50);
        line4b.style.opacity = '1';
        await wait(400);
        line4b.style.textShadow = '0 0 20px rgba(137,207,240,0.5), 0 0 40px rgba(137,207,240,0.3), 0 0 60px rgba(137,207,240,0.15)';
        await wait(550);
        await wait(1500);

        line4b.style.transition = 'text-shadow 0.6s ease, color 0.6s ease';
        line4b.style.textShadow = '0 0 40px rgba(137,207,240,0.8), 0 0 80px rgba(137,207,240,0.5), 0 0 120px rgba(137,207,240,0.3), 0 0 200px rgba(137,207,240,0.15)';
        line4b.style.color = '#fff';
        line4a.style.transition = 'text-shadow 0.6s ease';
        line4a.style.textShadow = '0 0 30px rgba(255,255,255,0.4), 0 0 60px rgba(255,255,255,0.2)';
        await wait(600);

        // Glow contracts into logo
        gsap.set('#heroPhase3', { opacity: 1 });
        const logoWrap = document.getElementById('heroLogoWrap');
        gsap.set(logoWrap, { opacity: 0, scale: 0.3 });

        const glowOrb = document.createElement('div');
        glowOrb.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(137,207,240,0.4) 0%,rgba(137,207,240,0.1) 40%,transparent 70%);z-index:5;pointer-events:none;';
        mc.parentElement?.appendChild(glowOrb);

        gsap.to([line4a, line4b], {
          opacity: 0, scale: 0.5, duration: 0.8, ease: 'power3.in'
        });
        gsap.to(glowOrb, {
          width: 60, height: 60, duration: 0.8, ease: 'power3.in',
          onComplete: () => {
            glowOrb.style.background = 'radial-gradient(circle, rgba(137,207,240,0.8) 0%, rgba(137,207,240,0.3) 50%, transparent 70%)';
            glowOrb.style.width = '180px';
            glowOrb.style.height = '180px';
            glowOrb.style.transition = 'all 0.6s ease-out';
            setTimeout(() => {
              glowOrb.style.opacity = '0';
              setTimeout(() => glowOrb.remove(), 600);
            }, 100);
          }
        });

        await wait(700);

        // Phase 5
        wipeCanvas();
        mc.innerHTML = '';
        gsap.set(stage, { opacity: 0 });
        gsap.set(logoWrap, { opacity: 1, scale: 1 });

        const ring1 = document.getElementById('ring1');
        if (ring1) {
          ring1.style.animation = 'radar-ping 4.5s ease-out infinite';
          gsap.to(ring1, { opacity: 1, duration: 0.3 });
        }
        await wait(600);

        const ring2 = document.getElementById('ring2');
        if (ring2) {
          ring2.style.animation = 'radar-ping 4.5s ease-out infinite';
          ring2.style.animationDelay = '1.2s';
          gsap.to(ring2, { opacity: 1, duration: 0.3 });
        }
        await wait(500);

        await anim('#heroLogoImg', { opacity: 1, duration: 1.2, ease: 'power2.out' });

        const ring3 = document.getElementById('ring3');
        if (ring3) {
          ring3.style.animation = 'radar-ping 4.5s ease-out infinite';
          ring3.style.animationDelay = '2.7s';
          gsap.to(ring3, { opacity: 1, duration: 0.3 });
        }
        await wait(400);

        const ring4 = document.getElementById('ring4');
        if (ring4) {
          ring4.style.animation = 'radar-ping 4.5s ease-out infinite';
          ring4.style.animationDelay = '3.8s';
          gsap.to(ring4, { opacity: 1, duration: 0.3 });
        }
        await wait(300);

        await anim('#heroSosText', { opacity: 0.6, duration: 0.8, ease: 'power2.out' });
        await wait(400);

        gsap.set('#heroTagline', { opacity: 1 });
        await anim('.tag-word:first-child', { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' });
        await wait(300);

        await anim('#learnMoreLink', { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
        await wait(200);
        gsap.to('#learnMoreArrow', { y: 6, duration: 1.2, ease: 'power1.inOut', yoyo: true, repeat: -1 });
      }

      // Nav: show after scrolling past hero
      ScrollTrigger.create({
        trigger: '#crisis',
        start: 'top bottom-=100',
        onEnter: () => gsap.to('nav', { opacity: 1, duration: 0.4 }),
        onLeaveBack: () => gsap.to('nav', { opacity: 0, duration: 0.3 })
      });

      // Global gs-fade elements
      document.querySelectorAll('.gs-fade').forEach((el) => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
          opacity: 0, y: 24, duration: 0.7, ease: 'power2.out'
        });
      });

      // Animated counters
      document.querySelectorAll('.stat-card .num').forEach((numEl) => {
        const target = parseInt(numEl.getAttribute('data-count') || '0');
        const suffix = numEl.getAttribute('data-suffix') || '';
        const prefix = numEl.getAttribute('data-prefix') || '';
        let triggered = false;
        ScrollTrigger.create({
          trigger: numEl, start: 'top 80%',
          onEnter: () => {
            if (triggered) return;
            triggered = true;
            const obj = { val: 0 };
            gsap.to(obj, {
              val: target, duration: 1.8, ease: 'power2.out',
              onUpdate: () => { (numEl as HTMLElement).textContent = prefix + Math.round(obj.val) + suffix; }
            });
          }
        });
      });

      // Ecosystem cards stagger
      gsap.from('.eco-card', {
        scrollTrigger: { trigger: '.eco-grid', start: 'top 80%' },
        opacity: 0, y: 30, duration: 0.6, stagger: 0.15, ease: 'power2.out'
      });

      // Parallax on coordination blocks
      gsap.to('#coordParallax', {
        scrollTrigger: { trigger: '#coordParallax', start: 'top bottom', end: 'bottom top', scrub: true },
        y: -30, ease: 'none'
      });

      // Flywheel animation
      let flywheelTriggered = false;
      ScrollTrigger.create({
        trigger: '#flywheelSvg',
        start: 'top 75%',
        onEnter: () => {
          if (flywheelTriggered) return;
          flywheelTriggered = true;

          const nodes = document.querySelectorAll('.flywheel-node');
          const arcs = document.querySelectorAll('.flywheel-arc');
          const center = document.querySelector('.flywheel-center');

          gsap.to(nodes, { opacity: 1, duration: 0.5, stagger: 0.25, ease: 'power2.out' });
          gsap.to(arcs, { opacity: 0.4, duration: 0.4, stagger: 0.25, delay: 0.15, ease: 'power2.out' });
          gsap.to(center, {
            opacity: 1, duration: 0.6, delay: 1.5, ease: 'power2.out',
            onComplete: () => {
              gsap.to(center, { opacity: 0.7, duration: 1.5, ease: 'power1.inOut', yoyo: true, repeat: -1 });
            }
          });
          gsap.to('.flywheel-ring-anim', {
            rotation: 360, duration: 60, ease: 'none', repeat: -1,
            transformOrigin: '200px 200px'
          });
        }
      });

      // Refresh ScrollTrigger
      ScrollTrigger.refresh();
    };

    initGSAP();
  }, []);

  return (
    <main>
      {/* Nav */}
      <nav id="navbar" className="home-nav">
        <div className="nav-inner">
          <Link href="/" className="nav-brand">
            <img src="/logomark-red.svg" alt="SOS" className="logo-sm" />
            SOS
          </Link>
          <div className="nav-links">
            <a href="#crisis" data-section="crisis">Crisis</a>
            <a href="#coordination" data-section="coordination">Coordination</a>
            <a href="#convergence" data-section="convergence">Convergence</a>
            <a href="#ecosystem" data-section="ecosystem">Ecosystem</a>
            <a href="#solution" data-section="solution">Solution</a>
            <a href="#scenario" data-section="scenario">Scenario</a>
            <a href="#about" data-section="about">About</a>
            <a href="#stories" data-section="stories">Stories</a>
            <a href="#invitation" data-section="invitation">Join</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero" id="hero">
        <canvas id="heroCanvas" ref={canvasRef}></canvas>
        <div className="grain-overlay"></div>
        <div className="hero-content hero-content-wrap">
          <div id="heroTextStage" className="hero-text-stage">
            <h1 className="hero-title hero-morph-container" id="morphContainer"></h1>
          </div>
          <div id="heroPhase3" className="hero-phase3">
            <div id="heroLogoWrap" className="hero-logo-wrap">
              <span className="radar-ring radar-ring-hidden" id="ring1"></span>
              <span className="radar-ring radar-ring-hidden" id="ring2"></span>
              <span className="radar-ring radar-ring-hidden" id="ring3"></span>
              <span className="radar-ring radar-ring-hidden" id="ring4"></span>
              <img id="heroLogoImg" src="/logomark-red.svg" alt="SOS" className="hero-logo-img" />
              <span id="heroSosText" className="hero-sos-text">SOS</span>
            </div>
            <div id="heroTagline" className="hero-tagline-wrap">
              <div className="tag-word hero-cta-row">
                <Link href="/c?flow=get-help" className="hero-cta hero-cta-link hero-cta-link--red">Get Help</Link>
                <span className="hero-divider"></span>
                <Link href="/c?flow=give-help" className="hero-cta hero-cta-link hero-cta-link--blue">Give Help</Link>
              </div>
              <a href="#crisis" className="tag-word hero-learn-more" id="learnMoreLink">
                <span className="hero-learn-text">Learn more</span>
                <span id="learnMoreArrow" className="hero-learn-arrow">↓</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Crisis */}
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

      {/* Coordination */}
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

      {/* Convergence */}
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

      {/* Ecosystem */}
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

      {/* Solution */}
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

      {/* Scenario */}
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

      {/* About */}
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

      {/* Stories */}
      <section id="stories" className="thesis-section">
        <div className="thesis-vertical">
          <div className="mt-64">
            <div className="vignette-card gs-fade">
              <p>A displaced family finds temporary housing in a stranger&apos;s guest room — then clears roads with their truck by morning.</p>
            </div>
            <div className="vignette-card gs-fade">
              <p>A nurse, still in scrubs, triages her neighbors on the front porch — while her own home floods behind her.</p>
            </div>
            <div className="vignette-card gs-fade">
              <p>A teenager who speaks three languages becomes the only translator for miles — because no agency thought to plan for it.</p>
            </div>
          </div>

          <p className="thesis-closing gs-fade mt-48">
            Needs and offers coexist on the same person, sometimes on the same day. The instinct is already there. What they lack isn&apos;t motivation —
            <strong className="highlight-blue"> it&apos;s infrastructure.</strong>
          </p>
        </div>
      </section>

      {/* Invitation */}
      <section id="invitation" className="invitation-section">
        <div className="grain-overlay"></div>
        <div className="narrow relative z-2">
          <h1 className="thesis-headline gs-fade mb-48">Everyone is a helper.</h1>

          <div className="gs-fade mb-48">
            <img src="/logomark-red.svg" alt="SOS" className="logo-md" />
          </div>

          <h1 className="gs-fade are-you-heading">Are you?</h1>

          <div className="gs-fade btn-row-cta btn-row mb-64">
            <Link href="/c" className="btn btn-red">I need help</Link>
            <Link href="/volunteer" className="btn btn-outline-white">I want to help</Link>
          </div>

          <p className="gs-fade invitation-tagline">
            We help the helpers.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <p className="mb-12">
          <Link href="/" className="footer-brand">
            <img src="/logomark-red.svg" alt="SOS" />
            SOS GLOBAL
          </Link>
        </p>
        <p>
          <Link href="/c">Citizens</Link>&nbsp;&nbsp;·&nbsp;&nbsp;<Link href="/app">Partners</Link>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="mailto:info@sos-help.org">Contact</a>
        </p>
        <p className="footer-copy">
          sosconnect.org &middot; © 2026 SOS Global
        </p>
      </footer>
    </main>
  );
}
