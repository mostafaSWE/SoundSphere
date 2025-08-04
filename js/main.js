// Hamburger menu functionality
document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  const closeMenu = document.querySelector('.close-menu');
  
  hamburger.addEventListener('click', function() {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
  });
  
  // Close menu when clicking the close button
  closeMenu.addEventListener('click', function() {
    hamburger.classList.remove('active');
    navLinks.classList.remove('active');
  });
  
  // Close menu when clicking on a link
  navLinks.addEventListener('click', function(e) {
    if (e.target.tagName === 'A') {
      hamburger.classList.remove('active');
      navLinks.classList.remove('active');
    }
  });
});

// Scroll direction detection and continent card animations
let lastScrollTop = 0;
let scrollDirection = 'down';

document.addEventListener('DOMContentLoaded', function() {
  const observerOptions = {
    threshold: 0.3,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Determine scroll direction
        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        scrollDirection = currentScrollTop > lastScrollTop ? 'down' : 'up';
        lastScrollTop = currentScrollTop;
        
        // Add appropriate classes based on scroll direction
        if (scrollDirection === 'down') {
          entry.target.classList.remove('scroll-up');
          entry.target.classList.add('visible');
        } else {
          entry.target.classList.add('scroll-up', 'visible');
        }
      }
    });
  }, observerOptions);

  // Observe all continent cards
  const continentCards = document.querySelectorAll('.continent-card');
  continentCards.forEach(card => {
    observer.observe(card);
  });
  
  // Update scroll direction on scroll
  window.addEventListener('scroll', function() {
    const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    scrollDirection = currentScrollTop > lastScrollTop ? 'down' : 'up';
    lastScrollTop = currentScrollTop;
  });
});
