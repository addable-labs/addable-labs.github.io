// Scroll-linked entrance motion (REQ-018): reveal.js adds is-visible to every
// .reveal element as it enters the viewport (opacity/translate only, in CSS).
// Under prefers-reduced-motion: reduce, or without IntersectionObserver, every
// element is shown at once; without JavaScript nothing is ever hidden.
//
// A drawing that plays once (.fig-motion, the torch figure of
// src/_includes/figures/figures.mjs) gets its timed parts' moments, data-h
// and data-t, as --h and --t for base.css, is held at its first frame
// (is-ready) and plays (is-playing) once half its panel is in view, or once
// the panel's top has passed the top of the window. Under reduced motion, or
// without IntersectionObserver, it is never marked: the still drawing stands.
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

  var drawings = document.querySelectorAll(".fig-motion");
  for (var k = 0; k < drawings.length; k++) play(drawings[k]);
  function play(drawing) {
    var timed = drawing.querySelectorAll("[data-h], [data-t]");
    for (var m = 0; m < timed.length; m++) {
      var h = timed[m].getAttribute("data-h"), t = timed[m].getAttribute("data-t");
      if (h) timed[m].style.setProperty("--h", h);
      if (t) timed[m].style.setProperty("--t", t);
    }
    drawing.classList.add("is-ready");
    var watch = new IntersectionObserver(function (entries) {
      var e = entries[entries.length - 1];
      if (e.intersectionRatio >= 0.5 || (e.isIntersecting && e.boundingClientRect.top < 0)) {
        drawing.classList.add("is-playing");
        watch.disconnect();
      }
    }, { threshold: [0, 0.5] });
    watch.observe(drawing.ownerSVGElement || drawing);
  }
})();
