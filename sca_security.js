(function () {
  'use strict';

  // ── 1. Bloquear clique direito ───────────────────────────────
  document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
  });

  // ── 2. Bloquear teclas de inspeção ──────────────────────────
  document.addEventListener('keydown', function (e) {
    // F12
    if (e.key === 'F12') { e.preventDefault(); return false; }
    // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C (DevTools)
    if (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key.toUpperCase())) {
      e.preventDefault(); return false;
    }
    // Ctrl+U (ver código fonte)
    if (e.ctrlKey && e.key.toUpperCase() === 'U') {
      e.preventDefault(); return false;
    }
    // Ctrl+S (salvar página)
    if (e.ctrlKey && e.key.toUpperCase() === 'S') {
      e.preventDefault(); return false;
    }
  });

  // ── 3. Detectar DevTools aberto e travar tela ────────────────
  var _devtools = { open: false };
  var _threshold = 160;
  setInterval(function () {
    if (
      window.outerWidth - window.innerWidth > _threshold ||
      window.outerHeight - window.innerHeight > _threshold
    ) {
      if (!_devtools.open) {
        _devtools.open = true;
        if (window.registrarLogSeguranca) {
          window.registrarLogSeguranca('devtools', 'DevTools detectado no navegador', window.SCA_EMAIL || 'desconhecido');
        }
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#1a5c38;color:#fff;font-family:sans-serif;font-size:1.2rem;font-weight:700;">🔒 Acesso restrito.</div>';
      }
    } else {
      _devtools.open = false;
    }
  }, 1000);

  console.clear();
  console.log('%c🔒 SCA — Sistema Protegido', 'color:#1a5c38;font-size:1.2rem;font-weight:bold;');

})();
