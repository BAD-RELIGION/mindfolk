// Theme Switcher
let currentTheme = localStorage.getItem('theme') || 'modern';

function initTheme() {
  console.log('Initializing theme:', currentTheme); // Debug
  // Load theme CSS if classic
  if (currentTheme === 'classic') {
    if (!document.getElementById('theme-classic-css')) {
      const link = document.createElement('link');
      link.id = 'theme-classic-css';
      link.rel = 'stylesheet';
      link.href = 'css/theme-classic.css';
      document.head.appendChild(link);
      console.log('Theme classic CSS loaded');
    }
    document.body.classList.add('theme-classic');
    document.body.classList.remove('theme-modern');
    console.log('Body classes:', document.body.className); // Debug
  } else {
    document.body.classList.add('theme-modern');
    document.body.classList.remove('theme-classic');
  }
  
  // Update button states
  const modernBtn = document.getElementById('themeModern');
  const classicBtn = document.getElementById('themeClassic');
  if (modernBtn && classicBtn) {
    if (currentTheme === 'modern') {
      modernBtn.classList.add('active');
      classicBtn.classList.remove('active');
    } else {
      classicBtn.classList.add('active');
      modernBtn.classList.remove('active');
    }
  }
}

function switchTheme(theme) {
  currentTheme = theme;
  localStorage.setItem('theme', theme);
  initTheme();
}

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  
  // Add event listeners
  const modernBtn = document.getElementById('themeModern');
  const classicBtn = document.getElementById('themeClassic');
  
  if (modernBtn) {
    modernBtn.addEventListener('click', () => switchTheme('modern'));
  }
  if (classicBtn) {
    classicBtn.addEventListener('click', () => switchTheme('classic'));
  }
});

