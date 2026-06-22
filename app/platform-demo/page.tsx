'use client';

import { useEffect } from 'react';

export default function CoordinationPage() {
  useEffect(() => {
    const nav = document.getElementById('siteNav');
    if (!nav) return;
    const onScroll = () => {
      // Dark page → keep nav solid for contrast at all scroll positions.
      nav.classList.add('scrolled');
    };
    onScroll();
    requestAnimationFrame(() => {
      nav.style.opacity = '1';
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        html, body { overflow-x: hidden; }
        body {
          font-family: 'Nunito Sans', -apple-system, sans-serif;
          color: #0F1E2B;
          background: #0F1E2B;
          -webkit-font-smoothing: antialiased;
          font-weight: 400;
          font-size: 15px;
          line-height: 1.7;
          overflow-x: hidden;
        }
        nav#siteNav { opacity: 0;
          position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
          transition: opacity 0.6s ease 0.3s, background 0.4s, border-color 0.4s, box-shadow 0.4s;
          background: transparent; border-bottom: 1px solid transparent;
        }
        nav#siteNav.scrolled {
          background: rgba(15,30,43,0.97);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          border-bottom-color: rgba(255,255,255,0.08);
          box-shadow: 0 4px 24px rgba(0,0,0,0.15);
        }
        .nav-inner {
          max-width: 1080px; margin: 0 auto; padding: 18px 32px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .nav-brand {
          display: flex; align-items: center; gap: 10px;
          font-weight: 700; font-size: 12px; letter-spacing: 0.15em;
          text-transform: uppercase; color: #fff; text-decoration: none;
        }
        .nav-brand img { height: 24px; }
        .nav-links { display: flex; gap: 28px; }
        .nav-links a {
          position: relative; font-size: 12px; font-weight: 600; letter-spacing: 0.04em;
          color: rgba(255,255,255,0.5); text-decoration: none; transition: color 0.2s;
          padding-bottom: 4px;
        }
        .nav-links a:hover { color: #fff; }
        .serif { font-family: 'DM Serif Display', Georgia, serif; }
        .stage {
          position: relative; min-height: 100vh; display: flex; flex-direction: column;
          align-items: center; justify-content: center; text-align: center;
          background: #0F1E2B; padding: 140px 32px 80px; overflow: hidden;
        }
        .grain-overlay {
          position: absolute; inset: 0; z-index: 1; opacity: 0.02; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat; background-size: 256px 256px;
        }
        .stage-content { position: relative; z-index: 2; width: 100%; max-width: 1000px; }
        .eyebrow {
          font-size: 13px; font-weight: 700; letter-spacing: 0.2em;
          text-transform: uppercase; color: #89CFF0; margin-bottom: 20px;
        }
        .stage h1 {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: clamp(28px, 5vw, 48px); line-height: 1.15; color: #fff;
          font-weight: 400; margin-bottom: 14px;
        }
        .stage .sub {
          font-size: 17px; font-weight: 300; color: rgba(255,255,255,0.55);
          max-width: 560px; margin: 0 auto 48px; line-height: 1.7;
        }
        .video-frame {
          position: relative; width: 100%; border-radius: 16px; overflow: hidden;
          background: #000; box-shadow: 0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06);
        }
        .video-frame video { display: block; width: 100%; height: auto; }
        .accent-line { width: 48px; height: 2px; background: #89CFF0; margin: 56px auto 0; }
        footer { background: #0F1E2B; padding: 64px 32px 48px; text-align: center; }
        @media (max-width: 720px) {
          .nav-links { gap: 16px; }
          .nav-links a.nav-hide { display: none; }
          .stage { padding: 120px 20px 64px; }
        }
      `}</style>

      <nav id="siteNav">
        <div className="nav-inner">
          <a href="/" className="nav-brand">
            <img src="/logomark-red.svg" alt="SOS" decoding="async" />
            SOS
          </a>
          <div className="nav-links">
            <a className="nav-hide" href="/#crisis">Crisis</a>
            <a className="nav-hide" href="/#ecosystem">Ecosystem</a>
            <a className="nav-hide" href="/#solution">Solution</a>
            <a href="/what-is-sos">What Is SOS</a>
            <a href="/join">Join</a>
            <a href="/donate" style={{ color: '#EF4E4B', fontWeight: 700 }}>Donate</a>
          </div>
        </div>
      </nav>

      <section className="stage">
        <div className="grain-overlay" />
        <div className="stage-content">
          <p className="eyebrow">Coordination Platform</p>
          <h1 className="serif">See it work.</h1>
          <p className="sub">
            A walkthrough of how SOS coordinates disaster relief — from the first message to help on the ground.
          </p>

          <div className="video-frame">
            <video controls playsInline preload="metadata" poster="/coordination-poster.jpg">
              <source src="/coordination-demo.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          <div className="accent-line" />
        </div>
      </section>

      <footer>
        <img
          src="/logomark-red.svg"
          alt="SOS"
          loading="lazy"
          decoding="async"
          style={{ height: 32, opacity: 0.8, marginBottom: 32 }}
        />
        <p style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 36, color: '#fff', fontWeight: 400, lineHeight: 1.2, marginBottom: 12 }}>
          Everyone is a helper.
        </p>
        <p style={{ fontSize: 18, color: '#89CFF0', fontWeight: 300, marginBottom: 36 }}>
          We help the helpers.
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
          <a href="https://sosconnect.org" style={{ color: 'inherit', textDecoration: 'none' }}>sosconnect.org</a> · © 2026 SOS Global · 501(c)(3) nonprofit · EIN 33-2797387
        </p>
      </footer>
    </>
  );
}
