// Gaimer's game page as it was after the factory's cleanup, for a browser
// (si-y6pp). First, src/engine/sandbox.js at 166ff84 (25 Sep 2026)
// unchanged but for its one `export`, which a classic script cannot have. Then
// a stand-in for src/components/GameContainer.vue at 166ff84, which says
// what it keeps and what differs from the app.

/**
 * Creates a sandboxed iframe for executing AI-generated game code.
 * Game code runs in an isolated context with no access to the parent DOM,
 * localStorage, or network. Communication happens via postMessage only.
 *
 * @param {HTMLElement} container - DOM element to mount the iframe into. The
 *   iframe is positioned absolutely at its top left, so the container must
 *   be positioned (e.g. position: relative).
 * @param {Object} [options] - Configuration options
 * @param {number} [options.width] - Canvas/iframe width
 * @param {number} [options.height] - Canvas/iframe height
 * @returns {Object} Sandbox controller with loadGame, postMessage, onMessage, scaleToFit, destroy
 */
function createSandbox(container, options = {}) {
  const { width, height } = options
  const canvasWidth = width || 800
  const canvasHeight = height || 600
  const messageHandlers = []
  let iframe = document.createElement('iframe')

  // Security: only allow script execution, nothing else
  iframe.setAttribute('sandbox', 'allow-scripts')
  iframe.style.border = 'none'
  iframe.style.display = 'block'
  // scaleToFit() moves and scales the iframe from here
  iframe.style.position = 'absolute'
  iframe.style.left = '0'
  iframe.style.top = '0'
  iframe.style.transformOrigin = '0 0'

  iframe.width = String(canvasWidth)
  iframe.height = String(canvasHeight)

  container.appendChild(iframe)

  // Listen for messages from the sandbox
  function handleMessage(event) {
    // Only accept messages from sandboxed iframes (origin is 'null')
    if (event.source !== iframe.contentWindow) return
    for (const handler of messageHandlers) {
      handler(event.data)
    }
  }
  window.addEventListener('message', handleMessage)

  function buildSrcdoc(gameCode) {
    // The game's code runs in an IIFE, in a script of its own: a syntax error
    // stops only that script, and the harness reports it. In the try block
    // the code stays in sloppy mode, even if it starts with "use strict".
    // A line holding only ";", an empty statement, ends the code. Code cut
    // off in the middle of an expression then fails with a syntax error that
    // the parser finds after the code. Without the line, the ready call
    // would complete the expression: after "player." it would be a call of
    // player.__gaimer_sendMessage, and after "var f = () =>" the body of a
    // function that nothing calls. After code that is complete, the line
    // does nothing. The catch reports an error thrown while the game starts.
    const gameScriptStart = `(function() {
  try {
    `
    const gameScript = `${gameScriptStart}${gameCode}
    ;
    __gaimer_sendMessage('ready', {});
  } catch (e) {
    __gaimer_reportError(e, String(e));
  }
})();
`

    // Where the game's code is in its script, for the harness to give the
    // line and column of an error in the code's own numbering, or to say
    // that the error is after the code: the lines before it, the columns
    // before its first line, and its number of lines, as JavaScript counts
    // them
    const linesBefore = gameScriptStart.split('\n')
    const codeInScript = {
      linesBefore: linesBefore.length - 1,
      columnsBefore: linesBefore[linesBefore.length - 1].length,
      lines: gameCode.split(/\r\n|[\n\r\u2028\u2029]/).length,
    }

    // The harness, the page's first script, runs before the game's script
    const harness = `// Prevent default touch behaviors (scrolling, zooming) on the canvas
var __canvas = document.getElementById('game-canvas');
__canvas.addEventListener('touchstart', function(e) { e.preventDefault(); }, { passive: false });
__canvas.addEventListener('touchmove', function(e) { e.preventDefault(); }, { passive: false });
__canvas.addEventListener('touchend', function(e) { e.preventDefault(); }, { passive: false });

// Message handler for parent communication
window.addEventListener('message', function(event) {
  if (event.data && event.data.type) {
    if (typeof window.__gaimer_onMessage === 'function') {
      window.__gaimer_onMessage(event.data);
    }
  }
});

// Send a message to the parent. postMessage throws on data it cannot copy,
// such as a function or an Image in the state a game saves. Report that
// error, and if the message was the game's answer to saveState, tell the
// parent that the save failed and why, rather than let it wait for an
// answer. An error report that cannot be sent is not reported in turn,
// which could loop.
function __gaimer_sendMessage(type, data) {
  try {
    parent.postMessage({ type: type, data: data }, '*');
  } catch (error) {
    if (type === 'error') return;
    __gaimer_reportError(error, String(error));
    if (type === 'stateData') {
      __gaimer_sendMessage('saveFailed', { message: error.message });
    }
  }
}

// Tell the parent of the player's first input: the first touch, click or
// key press. A game that waits on a start screen starts to play then. The
// listeners are the window's, for the capture phase, so they run before the
// game's own: the parent learns of the input before any error that the
// game's handler throws.
function __gaimer_onFirstInput() {
  window.removeEventListener('pointerdown', __gaimer_onFirstInput, true);
  window.removeEventListener('keydown', __gaimer_onFirstInput, true);
  __gaimer_sendMessage('firstInput', {});
}
window.addEventListener('pointerdown', __gaimer_onFirstInput, true);
window.addEventListener('keydown', __gaimer_onFirstInput, true);

// Report errors to the parent: a syntax error in the game's script, which
// runs after this one, and errors the game throws later (game loop, input
// handlers, promises). Stack traces quote a script's whole data: URL in each
// of its frames: call this script harness.js and the game's game.js instead.
// The game's script wraps the game's code, so a place in game.js is given
// as its line and column in the code, and a place in the wrapper with
// neither. A place in harness.js stays as it is.
var __gaimer_harnessUrl = document.currentScript.src;
var __gaimer_code = ${JSON.stringify(codeInScript)};

// The line and column in the game's code of a place in the game's script,
// or null for a place in the wrapper. A column of 0 is not known.
function __gaimer_placeInCode(line, column) {
  line -= __gaimer_code.linesBefore;
  if (!(line >= 1 && line <= __gaimer_code.lines)) return null;
  if (line === 1 && column) column -= __gaimer_code.columnsBefore;
  return { line: line, column: column };
}

// The report gives the place of the error in the game's code: the one the
// caller knows, or else that of the innermost frame of its stack in the code.
// Or it says that the error is after the end of the code.
function __gaimer_reportError(error, fallbackMessage, place) {
  var stack = error && error.stack;
  if (typeof stack === 'string') {
    stack = stack.replace(/(data:text\\/javascript[^:]*)(?::(\\d+):(\\d+))?/g, function(match, url, line, column) {
      if (url === __gaimer_harnessUrl) return 'harness.js' + match.slice(url.length);
      var frame = line && __gaimer_placeInCode(+line, +column);
      place = place || frame;
      return frame ? 'game.js:' + frame.line + ':' + frame.column : 'game.js';
    });
  }
  var report = { message: (error && error.message) || fallbackMessage, stack: stack };
  if (place && place.afterCode) {
    report.afterCode = true;
  } else if (place) {
    report.line = place.line;
    report.column = place.column || null;
  }
  __gaimer_sendMessage('error', report);
}
// The event gives the place of the error, which is the only place a syntax
// error has: its stack names none in WebKit or Chromium. WebKit gives its
// line, but no column. When the code leaves a brace open, say, the parser
// finds the error only after the end of the code, at the wrapper's "catch":
// the report says that the error is after the code.
window.addEventListener('error', function(event) {
  var inGame = event.filename !== __gaimer_harnessUrl && /^data:text\\/javascript/.test(event.filename);
  var place = inGame ? __gaimer_placeInCode(event.lineno, event.colno) : null;
  if (inGame && event.lineno > __gaimer_code.linesBefore + __gaimer_code.lines) place = { afterCode: true };
  __gaimer_reportError(event.error, event.message, place);
});
window.addEventListener('unhandledrejection', function(event) {
  __gaimer_reportError(event.reason, String(event.reason));
});
`

    // The page loads both its scripts from data: URLs, and has no inline
    // script, for three reasons. In the built app, Tauri adds the hash of
    // each of the app's script files to the script-src of the window's
    // policy, which the page takes a copy of. A hash voids 'unsafe-inline',
    // so the page could run no inline script there. The page's origin is
    // opaque, and WebKit reports an error thrown in one of its inline scripts
    // only as "Script error.", while it reports one from a data: URL script
    // in full. And the game code stays away from the HTML parser: "<!--" and
    // then "<script" in it, even in a string, would make the parser read past
    // an inline script's end tag, and the script would never run.
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' data:; style-src 'unsafe-inline'; img-src blob: data:;">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #1a1a1a; touch-action: none; }
  canvas { display: block; touch-action: none; -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }
</style>
</head>
<body>
<canvas id="game-canvas" width="${canvasWidth}" height="${canvasHeight}"></canvas>
<script src="data:text/javascript;charset=utf-8;base64,${toBase64(harness)}"></script>
<script src="data:text/javascript;charset=utf-8;base64,${toBase64(gameScript)}"></script>
</body>
</html>`
  }

  return {
    loadGame(gameCode) {
      iframe.srcdoc = buildSrcdoc(gameCode)
    },

    postMessage(type, data) {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type, data }, '*')
      }
    },

    onMessage(handler) {
      messageHandlers.push(handler)
    },

    /**
     * Request the game to serialize its state. Resolves with state data.
     * Rejects with the reason at once if the page cannot send the game's
     * state (it holds a function, say), or after the timeout if the game
     * does not answer, as when it doesn't support save.
     */
    requestSave(timeoutMs = 2000) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          cleanup()
          reject(new Error('The game did not answer'))
        }, timeoutMs)

        function onState(msg) {
          if (msg.type === 'stateData') {
            cleanup()
            resolve(msg.data)
          } else if (msg.type === 'saveFailed') {
            cleanup()
            reject(new Error(msg.data?.message))
          }
        }

        function cleanup() {
          clearTimeout(timer)
          const idx = messageHandlers.indexOf(onState)
          if (idx !== -1) messageHandlers.splice(idx, 1)
        }

        messageHandlers.push(onState)
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'saveState', data: {} }, '*')
        } else {
          cleanup()
          reject(new Error('No iframe'))
        }
      })
    },

    /**
     * Send saved state to the game for restoration.
     */
    requestRestore(stateData) {
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'restoreState', data: stateData }, '*')
      }
    },

    /**
     * Scale the game to fit a box of the given size at the container's top
     * left, centred in it and keeping its aspect ratio. Only the iframe's
     * CSS transform changes: the game keeps running, its canvas keeps its
     * size, and input still reaches it at canvas coordinates.
     */
    scaleToFit(boxWidth, boxHeight) {
      if (!iframe) return
      const scale = Math.min(boxWidth / canvasWidth, boxHeight / canvasHeight)
      // Whole pixels, so that a game at its own size is not blurred
      const x = Math.round((boxWidth - canvasWidth * scale) / 2)
      const y = Math.round((boxHeight - canvasHeight * scale) / 2)
      iframe.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
    },

    destroy() {
      window.removeEventListener('message', handleMessage)
      messageHandlers.length = 0
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe)
      }
      iframe = null
    }
  }
}

// Base64 of the UTF-8 bytes of a string. btoa() takes only characters of a
// single byte.
function toBase64(text) {
  let bytes = ''
  for (const byte of new TextEncoder().encode(text)) {
    bytes += String.fromCharCode(byte)
  }
  return btoa(bytes)
}

// What src/components/GameContainer.vue at 166ff84 sent the game page, for a
// page of its own. It loads the game once into a sandbox the size of the game
// area, which is the whole window here. On "ready" it asks the game for a save,
// which tells whether the game supports save and restore. It pauses the game
// while the page is hidden and resumes it after. When the window changes size,
// it scales the game to fit and keeps it running. It counts the seconds in
// which an error means that the game fails as it starts. What differs from the
// app:
//   - the game loads once the page has a size (whenSized, the site's
//     addition). In the article this page is in a frame whose size can reach
//     the page after this script has run. Loaded before, the game would be
//     made at the sandbox's default size, 800 × 600, and scaled to fit;
//   - an error is logged once per message, as the app logged it, but no
//     notification shows it;
//   - an error the game fails with as it starts is logged as well. In the app
//     it went to App as startError, and App sent the game back once to be
//     fixed. The games on this page are made already;
//   - no offer to restore a saved state ever comes: this page saves nothing;
//   - there is no Save button, and no buttons for the controls and the rules;
//   - the game takes the focus while the page has it (focusGame, the site's
//     addition), so key presses reach a game that the article starts with a
//     click on Play, as they reach a game in the app once the player has
//     clicked it;
//   - a key that reaches the page goes on to the game, and gives the game
//     the focus (handOnKey and takeKey, the site's additions). WebKit lets
//     a page in a frame of another origin, as this page is in the article,
//     give the focus to a frame of its own only once the reader has used
//     the page, so there focusGame does nothing until the first key;
//   - a press of the pointer in the game gives the game the focus
//     (focusOnPress, the site's addition), also in a game that cancels the
//     press and with it the focus that a click gives;
//   - the keys that scroll a page scroll nothing, in the game's page or in
//     this one (stopScrollKeys, the site's addition), so a key the game
//     leaves alone does not scroll the article this page is in. The game
//     still gets every key;
//   - the game's frame has a title, the game's name from the page's heading
//     (the site's addition), so a screen reader names it: the app's frame has
//     none.
(() => {
    const container = document.getElementById("game");
    const game = { code: JSON.parse(document.getElementById("game-code").textContent) };

    let sandbox = null;
    let saveSupported = false;
    // The site's addition: the game's frames whose page has loaded
    const loadedFrames = new WeakSet();
    // The message of the game error logged last
    let loggedError = null;

    // A game fails as it starts when it reports an error before it is ready (a
    // syntax error, or an error its start code throws), or in its first
    // START_SECONDS seconds after that. Those seconds cover its first frames and
    // the timers and countdowns it starts with, while the player has not got far
    // yet. A game with a start screen plays only from the player's first input,
    // and an error that only play sets off (the first collision, the first
    // spawn) can come after those seconds: the START_SECONDS seconds after that
    // input count as well. Only seconds with the page visible count: a hidden
    // page runs no frames, and the game is paused. The first such error is
    // logged as such, and no later one.
    const START_SECONDS = 5;
    // Whether the game has sent ready, whether its page has reported the
    // player's first input, and whether an error has been logged as one the
    // game fails with as it starts
    let ready = false;
    let inputSeen = false;
    let startErrorSent = false;
    // The seconds left to count, from ready or from the first input
    let startSecondsLeft = 0;
    let startClock = null;

    // Counts START_SECONDS seconds from now, in which an error is still one the
    // game fails with as it starts
    function countStartSeconds() {
        stopStartClock();
        startSecondsLeft = START_SECONDS;
        startClock = setInterval(() => {
            if (!document.hidden && --startSecondsLeft === 0) stopStartClock();
        }, 1000);
    }

    function stopStartClock() {
        clearInterval(startClock);
        startClock = null;
    }

    // A line or column number from the game page, or undefined if it is not one
    function lineOrColumn(value) {
        return Number.isInteger(value) && value > 0 ? value : undefined;
    }

    async function probeSaveSupport() {
        if (!sandbox) return;
        try {
            await sandbox.requestSave();
            saveSupported = true;
        } catch {
            saveSupported = false;
        }
    }

    // The app offered to restore a state that it had saved for the game. This
    // page saves nothing, so there is never one to offer.
    async function checkAndOfferRestore() {
        if (!saveSupported) return;
    }

    // In the app, App sent the game back once to be fixed
    function startError(error) {
        console.error("Game failed as it started:", JSON.stringify(error));
    }

    // The site's addition: the game's frame takes the focus while this page
    // has it, once the game's page has loaded (see loadGameScript) and each
    // time this page gets the focus. It takes it just after this page's focus
    // event, since focus given to a frame during that event does not reach
    // the frame's page when this page is itself in a frame, as in the article.
    function focusGame() {
        const frame = container.querySelector("iframe");
        if (frame && document.hasFocus()) setTimeout(() => frame.focus(), 0);
    }

    // The site's addition: the keys that scroll a page (the arrows, Space,
    // Page Up, Page Down, Home and End, alone or with Shift) scroll nothing,
    // in this page and in the game's page. Neither page can scroll, and a
    // key the game leaves alone can scroll the page around them instead:
    // the article this page is in. Only the scroll is stopped: the key still
    // reaches the game. With Ctrl, Alt or Cmd a key keeps its use, a
    // shortcut of the browser's. The game's page gets the function as a
    // script (withSiteScript), so it may use nothing from outside it.
    function stopScrollKeys(event) {
        if (event.ctrlKey || event.altKey || event.metaKey) return;
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "PageUp", "PageDown", "Home", "End"].includes(event.key)) event.preventDefault();
    }

    // The site's addition, run in the game's page (see withSiteScript): a
    // press of the pointer in the game gives the game's frame the focus. A
    // click gives a frame the focus as the default action of its press, and
    // a game that cancels the press, as Tetris after the cleanup does,
    // cancels that too.
    function focusOnPress() {
        focus();
    }

    // The site's addition: a key that reaches this page, not the game, goes
    // on to the game (takeKey), and a key press gives the game's frame the
    // focus, so that the keys after it reach the game itself. In WebKit
    // focusGame does nothing: there a page in a frame of another origin than
    // the page around it, as this page is in the article, may give the focus
    // to a frame of its own only once the reader has used the page, by a
    // key press say. So after Play the first key reaches this page. Only
    // once the game's page has loaded: in Chrome, focus given to a frame
    // before then does not reach its page. Tab keeps its use, moving the
    // focus, and so does a key held with Ctrl, Alt or Cmd.
    function handOnKey(event) {
        const frame = container.querySelector("iframe");
        if (!frame || !loadedFrames.has(frame)) return;
        if (event.key === "Tab" || event.ctrlKey || event.altKey || event.metaKey) return;
        if (event.type === "keydown") frame.focus();
        const { type, key, code, location, repeat, shiftKey } = event;
        frame.contentWindow.postMessage({ siteKey: { type, key, code, location, repeat, shiftKey } }, "*");
    }

    // The site's addition, run in the game's page (see withSiteScript): a key
    // that the page around it hands on (handOnKey) reaches the game as a key
    // pressed or let go in this page. The message has no type, so the
    // sandbox's own listener leaves it to this one.
    function takeKey(event) {
        const key = event.source === parent && event.data && event.data.siteKey;
        if (!key) return;
        const { type, ...init } = key;
        (document.activeElement || document).dispatchEvent(new KeyboardEvent(type, { ...init, bubbles: true, cancelable: true }));
    }

    // The site's addition: the game's page runs stopScrollKeys, focusOnPress
    // and takeKey, in a script at the end of its head, before its own
    // scripts. The script goes into the page's HTML as the sandbox's loadGame
    // sets the frame's srcdoc, so the page loads once, with it.
    function withSiteScript(frame) {
        const srcdoc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "srcdoc");
        const script = `<script>addEventListener("keydown", ${stopScrollKeys}, true); addEventListener("pointerdown", ${focusOnPress}, true); addEventListener("message", ${takeKey});</script>\n`;
        Object.defineProperty(frame, "srcdoc", {
            get: () => srcdoc.get.call(frame),
            set: (html) => srcdoc.set.call(frame, html.replace("</head>", () => `${script}</head>`)),
        });
    }

    // The container's size in whole pixels
    function containerSize() {
        const rect = container.getBoundingClientRect();
        return { width: Math.floor(rect.width), height: Math.floor(rect.height) };
    }

    // The site's addition: loads the game once this page has a size. In the
    // article this page is in a frame, which Chrome runs in a process of its
    // own, and on a busy machine the frame's size can reach this page after
    // this script has run: until then the page has no size (0 × 0). The game
    // would be made at the sandbox's default size instead of the frame's.
    function whenSized(load) {
        const sized = () => {
            const { width, height } = containerSize();
            return width > 0 && height > 0;
        };
        if (sized()) return load();
        const observer = new ResizeObserver(() => {
            if (!sized()) return;
            observer.disconnect();
            load();
        });
        observer.observe(container);
    }

    // Loads the game into the container. It runs once.
    function loadGameScript() {
        if (!container || !game.code) return;

        // Create a sandboxed iframe for the game, the size of the container
        sandbox = createSandbox(container, containerSize());

        // Listen for messages from the sandbox
        sandbox.onMessage((msg) => {
            if (msg.type === "error") {
                // A game that throws on every frame sends the same error every
                // frame: log it once
                if (msg.data?.message !== loggedError) {
                    loggedError = msg.data?.message;
                    console.error("Game error:", loggedError);
                }
                if (!startErrorSent && (!ready || startSecondsLeft > 0)) {
                    startErrorSent = true;
                    stopStartClock();
                    startError({
                        message: String(msg.data?.message || "Unknown error"),
                        stack: typeof msg.data?.stack === "string" ? msg.data.stack : "",
                        // Where the error is in the game's code, when the page
                        // can tell
                        line: lineOrColumn(msg.data?.line),
                        column: lineOrColumn(msg.data?.column),
                        // Or that it is after the end of the code, when the
                        // page says so
                        afterCode: msg.data?.afterCode === true || undefined,
                    });
                }
            } else if (msg.type === "ready") {
                if (!ready) {
                    ready = true;
                    countStartSeconds();
                }
                // Probe for save/restore support, then offer restore if available
                probeSaveSupport().then(() => checkAndOfferRestore());
            } else if (msg.type === "firstInput" && !inputSeen) {
                inputSeen = true;
                countStartSeconds();
            }
        });

        // The site's additions to the game's page (withSiteScript)
        const frame = container.querySelector("iframe");
        withSiteScript(frame);

        // Load the game code into the sandbox
        sandbox.loadGame(game.code);
        // The site's additions: the game's frame is named after the game, as
        // the page's heading names it, for a screen reader; and once the
        // game's page has loaded, the frame takes the focus if this page has
        // it. Focus given to the frame before its page loads does not reach
        // that page.
        frame.title = container.querySelector("h1").textContent;
        frame.addEventListener("load", () => loadedFrames.add(frame));
        frame.addEventListener("load", focusGame);
    }

    // Handle visibility changes for pause/resume
    function handleVisibilityChange() {
        if (!sandbox) return;
        if (document.hidden) {
            sandbox.postMessage("pause", {});
        } else {
            sandbox.postMessage("resume", {});
        }
    }

    // When the container changes size (the window is resized, the device
    // rotates), scale the game to fit it. Loading the game again at the new size
    // would restart it and lose the player's progress.
    function fitGameToContainer() {
        if (!sandbox || !container) return;
        const { width, height } = containerSize();
        sandbox.scaleToFit(width, height);
    }

    whenSized(loadGameScript);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    // Watches the container rather than the window
    new ResizeObserver(fitGameToContainer).observe(container);
    window.addEventListener("focus", focusGame);
    window.addEventListener("keydown", stopScrollKeys, true);
    window.addEventListener("keydown", handOnKey, true);
    window.addEventListener("keyup", handOnKey, true);
})();
