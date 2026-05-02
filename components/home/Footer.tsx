'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer>
      <p className="mb-12">
        <Link href="/" className="footer-brand">
          <img src="/logomark-red.svg" alt="SOS" />
          SOS GLOBAL
        </Link>
      </p>
      <p>
        <Link href="/c">Citizens</Link>&nbsp;&nbsp;·&nbsp;&nbsp;<Link href="/matching">Partners</Link>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="mailto:info@sos-help.org">Contact</a>
      </p>
      <p className="footer-copy">
        sosconnect.org &middot; © 2026 SOS Global
      </p>
    </footer>
  );
}
