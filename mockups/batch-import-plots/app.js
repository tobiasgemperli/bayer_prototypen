// Drawer open/close. Shared by both pages.
// - #menuBtn opens the drawer
// - #scrim / Esc closes it
// - a nav link for the page you're already on just closes (no reload)
document.addEventListener('DOMContentLoaded', () => {
  const frame = document.getElementById('frame');
  const open = () => frame.classList.add('open');
  const close = () => frame.classList.remove('open');

  document.getElementById('menuBtn').addEventListener('click', open);
  document.getElementById('scrim').addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  // Current-page link and the not-yet-built Inbox just close the drawer.
  document.querySelectorAll('.item[data-current], .item[data-noop]').forEach(a =>
    a.addEventListener('click', e => { e.preventDefault(); close(); })
  );
});
