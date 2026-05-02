'use client';

import { useEffect } from 'react';
import { Nav } from '@/components/home/Nav';
import { Hero } from '@/components/home/Hero';
import { Crisis } from '@/components/home/Crisis';
import { Coordination } from '@/components/home/Coordination';
import { Convergence } from '@/components/home/Convergence';
import { Ecosystem } from '@/components/home/Ecosystem';
import { Solution } from '@/components/home/Solution';
import { Scenario } from '@/components/home/Scenario';
import { About } from '@/components/home/About';
import { Stories } from '@/components/home/Stories';
import { Invitation } from '@/components/home/Invitation';
import { Footer } from '@/components/home/Footer';
import '@/styles/home.css';

export default function HomePage() {
  useEffect(() => {
    // Initialize GSAP ScrollTrigger and global animations
    const initGlobalAnimations = async () => {
      const gsap = (await import('gsap')).default;
      const ScrollTrigger = (await import('gsap/ScrollTrigger')).default;
      gsap.registerPlugin(ScrollTrigger);

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

    initGlobalAnimations();
  }, []);

  return (
    <main>
      <Nav />
      <Hero />
      <Crisis />
      <Coordination />
      <Convergence />
      <Ecosystem />
      <Solution />
      <Scenario />
      <About />
      <Stories />
      <Invitation />
      <Footer />
    </main>
  );
}
