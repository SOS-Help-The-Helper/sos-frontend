'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

export function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroVisibleRef = useRef(true);

  useEffect(() => {
    const initHeroAnimations = async () => {
      const gsap = (await import('gsap')).default;

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
    };

    initHeroAnimations();
  }, []);

  return (
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
  );
}
