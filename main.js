// Mobile nav toggle
const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('nav');

toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  nav.classList.toggle('open', !open);
});

// Close nav on link click (mobile)
nav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('open');
  });
});

// Section scroll-reveal
if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
  const sections = document.querySelectorAll('.section');
  const observer = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } }),
    { threshold: 0.08 }
  );
  sections.forEach(s => observer.observe(s));
}
