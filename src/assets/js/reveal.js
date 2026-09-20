// Scroll-linked entrance motion (REQ-018): reveal.js adds is-visible to every
// .reveal element as it enters the viewport (opacity/translate only, in CSS).
// Under prefers-reduced-motion: reduce, or without IntersectionObserver, every
// element is shown at once; without JavaScript nothing is ever hidden.
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var items = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    for (var i = 0; i < items.length; i++) items[i].classList.add("is-visible");
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
  for (var j = 0; j < items.length; j++) io.observe(items[j]);
})();
