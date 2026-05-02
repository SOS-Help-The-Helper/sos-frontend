'use client';

import Link from 'next/link';

export function Nav() {
  return (
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
  );
}
