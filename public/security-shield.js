// SECURITY SHIELD: Maximum protection against inspection
(function() {
  // 1. Bypass shield for developers (local environment or special flag)
  const isLocal = window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1' ||
                  window.location.hostname.startsWith('192.168.');
  
  const isDev = localStorage.getItem('xau-dev-mode') === 'true';

  // If local or dev mode is active, do not apply the shield
  if (isLocal || isDev) {
    console.log('🛡️ Security Shield: Disabled (Dev Mode Active)');
    return;
  }

  // 2. Disable Right Click
  document.addEventListener('contextmenu', e => e.preventDefault());

  // 3. Disable Keyboard Shortcuts (F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S)
  document.addEventListener('keydown', e => {
    if (
      e.keyCode === 123 || // F12
      (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) || // Ctrl+Shift+I/J/C
      (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 83)) // Ctrl+U or Ctrl+S
    ) {
      e.preventDefault();
      return false;
    }
  });

  // 4. Clear console on load and continuously
  if (typeof console !== "undefined") {
    console.clear();
    const clear = () => console.clear();
    setInterval(clear, 2000);
  }
})();
