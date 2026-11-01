/* Runs before the page paints so the chosen theme never flashes the wrong colours. */
(function () {
  var t = null;
  try { t = JSON.parse(localStorage.getItem('vc-theme')); } catch (e) { t = null; }
  if (t !== 'light' && t !== 'dark') {
    t = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', t);
  var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', t === 'dark' ? '#141010' : '#FAF7F6');
  var h = new Date(Date.now() + (new Date().getTimezoneOffset() + 300) * 60000).getHours();
  document.documentElement.setAttribute('data-world', 'food'); void h;
})();
