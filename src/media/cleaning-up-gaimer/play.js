// Plays a game of the article in the page (si-y6pp). A click on a game's Play
// button puts the game's page where its start screen was, in a frame served
// from the site's own origin, sandboxed without allow-same-origin, that may
// run scripts and nothing else (sandbox="allow-scripts"), gives that frame the
// focus, so key presses reach the game and the keys it uses do not scroll the
// page, and turns the button into Stop. Only one game runs: Stop, or Play on
// another game, puts back the start screen of the game that ran, which ends
// it. Nothing of a game loads before its button is clicked, so no game plays a
// sound before that. Without JavaScript the buttons are hidden (base.css), and
// the screenshots and the links to each game's page and code still work.
let running = null;

function label(button, state) {
  button.querySelector(".game-play-label").textContent = button.dataset[state];
}

function stop() {
  if (!running) return;
  running.frame.replaceWith(running.shot);
  label(running.button, "play");
  running = null;
}

function play(button) {
  const shot = button.closest(".game").querySelector(".game-screen .game-shot");
  const frame = document.createElement("iframe");
  frame.className = "game-frame";
  frame.src = button.dataset.gamePage;
  frame.title = button.dataset.gameTitle;
  frame.setAttribute("sandbox", "allow-scripts");
  frame.width = shot.getAttribute("width");
  frame.height = shot.getAttribute("height");
  // The frame takes the focus once its page has loaded. Focus given to it
  // before then does not reach the page, and the frame, focused already,
  // could not take it again.
  frame.addEventListener("load", () => frame.focus());
  shot.replaceWith(frame);
  label(button, "stop");
  running = { button, shot, frame };
}

for (const button of document.querySelectorAll(".game-play")) {
  button.addEventListener("click", () => {
    const wasRunning = running?.button === button;
    stop();
    if (!wasRunning) play(button);
  });
}
