(function () {
  var KEY = "addable-theme", root = document.documentElement, stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}
  function resolve(stored) {
    return stored === "light" ? "light" : "dark";
  }
  root.setAttribute("data-theme", resolve(stored));
  root.classList.add("js");
  document.addEventListener("DOMContentLoaded", function () {
    var buttons = document.querySelectorAll("[data-theme-toggle]");
    function paint() {
      var dark = root.getAttribute("data-theme") === "dark";
      for (var i = 0; i < buttons.length; i++) buttons[i].setAttribute("aria-pressed", dark ? "true" : "false");
      var meta = document.querySelector("meta[name=theme-color]");
      if (meta) meta.setAttribute("content", dark ? "#0B0E10" : "#F7F8F6");
    }
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function () {
        var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem(KEY, next); } catch (e) {}
        paint();
      });
    }
    paint();
  });
})();
