'use client';

import Link from 'next/link';

export function Invitation() {
  return (
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
  );
}
