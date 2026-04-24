// Theme initialization script to prevent FOUC
(function() {
  if (localStorage.getItem('xau-theme') === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }
})();
