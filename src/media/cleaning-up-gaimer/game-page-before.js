// Gaimer's game page as it was before the factory's cleanup, for a browser
// (si-y6pp). First, src/engine/sandbox.js at 7cef601 (21 Sep 2026)
// unchanged but for its one `export`, which a classic script cannot have. Then
// a stand-in for src/components/GameContainer.vue at 7cef601, which says
// what it keeps and what differs from the app.

/**
 * Creates a sandboxed iframe for executing AI-generated game code.
 * Game code runs in an isolated context with no access to the parent DOM,
 * localStorage, or network. Communication happens via postMessage only.
 *
 * @param {HTMLElement} container - DOM element to mount the iframe into
 * @param {Object} [options] - Configuration options
 * @param {number} [options.width] - Canvas/iframe width
 * @param {number} [options.height] - Canvas/iframe height
 * @returns {Object} Sandbox controller with loadGame, postMessage, onMessage, destroy
 */
function createSandbox(container, options = {}) {
  const { width, height } = options
  const messageHandlers = []
  let iframe = document.createElement('iframe')

  // Security: only allow script execution, nothing else
  iframe.setAttribute('sandbox', 'allow-scripts')
  iframe.style.border = 'none'
  iframe.style.display = 'block'

  if (width) iframe.width = String(width)
  if (height) iframe.height = String(height)

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
    const canvasWidth = width || 800
    const canvasHeight = height || 600

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src blob: data:;">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #1a1a1a; touch-action: none; }
  canvas { display: block; touch-action: none; -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }
</style>
</head>
<body>
<canvas id="game-canvas" width="${canvasWidth}" height="${canvasHeight}"></canvas>
<script>
// Prevent default touch behaviors (scrolling, zooming) on the canvas
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

// Notify parent when ready
function __gaimer_sendMessage(type, data) {
  parent.postMessage({ type: type, data: data }, '*');
}

// Execute game code in IIFE
(function() {
  try {
    ${gameCode}
    __gaimer_sendMessage('ready', {});
  } catch (e) {
    __gaimer_sendMessage('error', { message: e.message, stack: e.stack });
  }
})();
</script>
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
     * Request the game to serialize its state. Resolves with state data
     * or rejects after timeout if the game doesn't support save.
     */
    requestSave(timeoutMs = 2000) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          cleanup()
          reject(new Error('Save not supported'))
        }, timeoutMs)

        function onState(msg) {
          if (msg.type === 'stateData') {
            cleanup()
            resolve(msg.data)
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

// What src/components/GameContainer.vue at 7cef601 sent the game page, for a
// page of its own. It loads the game into a sandbox the size of the game area,
// which is the whole window here. On "ready" it asks the game for a save, which
// tells whether the game supports save and restore. It pauses the game while the
// page is hidden and resumes it after. It loads the game again at the new size
// 300 ms after the window stops resizing. What differs from the app:
//   - the game loads once the page has a size, and loads again only when the
//     game's area gets a new size (whenSized and handleResize, the site's
//     additions). In the article this page is in a frame whose size can
//     reach the page after this script has run. Loaded before, the game
//     would be made at no size and loaded again 300 ms after the size came;
//   - an error is logged, as the app logged it, but no notification shows it;
//   - no offer to restore a saved state ever comes: this page saves nothing;
//   - there is no Save button, and no buttons for the controls and the rules;
//   - the game takes the focus while the page has it (focusGame, the site's
//     addition), so key presses reach a game that the article starts with a
//     click on Play, as they reach a game in the app once the player has
//     clicked it;
//   - the page takes the focus back from the game's frame before the frame
//     goes, as the game loads again at a new size, and keeps it until the
//     new frame takes it (keepFocus, the site's addition), so the keys still
//     reach the game after the window changes size;
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
    // The site's addition: the size the game was loaded at
    let gameSize = null;

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

    // The site's addition: the game's frame takes the focus while this page
    // has it, once the game's page has loaded (see loadGameScript) and each
    // time this page gets the focus. It takes it just after this page's focus
    // event, since focus given to a frame during that event does not reach
    // the frame's page when this page is itself in a frame, as in the article.
    function focusGame() {
        const frame = container.querySelector("iframe");
        if (frame && document.hasFocus()) setTimeout(() => frame.focus(), 0);
    }

    // The site's addition: as the game loads again at a new size, this page
    // takes the focus back from the game's frame before the frame goes, if
    // this page has it, and keeps it while the game loads; the new frame
    // then takes it once its page has loaded, as the first one did. Removed
    // with the focus, the frame would take it out of this page and out of
    // the article this page is in, and the arrow keys would scroll the
    // article. A focus the reader has moved out of this page, into a text
    // field say, stays where it is.
    function keepFocus() {
        const frame = container.querySelector("iframe");
        if (frame && document.hasFocus()) frame.blur();
    }

    // The site's addition: the keys that scroll a page (the arrows, Space,
    // Page Up, Page Down, Home and End, alone or with Shift) scroll nothing,
    // in this page and in the game's page. Neither page can scroll, and a
    // key the game leaves alone can scroll the page around them instead:
    // the article this page is in. Only the scroll is stopped: the key still
    // reaches the game. With Ctrl, Alt or Cmd a key keeps its use, a
    // shortcut of the browser's. The game's page gets the function as a
    // script (withScrollKeysStopped), so it may use nothing from outside it.
    function stopScrollKeys(event) {
        if (event.ctrlKey || event.altKey || event.metaKey) return;
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "PageUp", "PageDown", "Home", "End"].includes(event.key)) event.preventDefault();
    }

    // The site's addition: the game's page runs stopScrollKeys as well, in a
    // script at the end of its head, before its own scripts. The script goes
    // into the page's HTML as the sandbox's loadGame sets the frame's srcdoc,
    // so the page loads once, with it.
    function withScrollKeysStopped(frame) {
        const srcdoc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "srcdoc");
        const script = `<script>addEventListener("keydown", ${stopScrollKeys}, true);</script>\n`;
        Object.defineProperty(frame, "srcdoc", {
            get: () => srcdoc.get.call(frame),
            set: (html) => srcdoc.set.call(frame, html.replace("</head>", () => `${script}</head>`)),
        });
    }

    // The site's addition: the size of the game's area in whole pixels, as
    // loadGameScript measures it
    function areaSize() {
        const rect = container.getBoundingClientRect();
        return { width: Math.floor(rect.width), height: Math.floor(rect.height) };
    }

    // The site's addition: loads the game once this page has a size. In the
    // article this page is in a frame, which Chrome runs in a process of its
    // own, and on a busy machine the frame's size can reach this page after
    // this script has run: until then the page has no size (0 × 0). The game
    // would be made at no size, and loaded again 300 ms after the size came,
    // since it comes as a resize: the reader would see it start twice, and
    // the keys pressed in between would go to the game that goes.
    function whenSized(load) {
        const sized = () => {
            const { width, height } = areaSize();
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

    function loadGameScript() {
        if (!container || !game.code) return;

        saveSupported = false;

        // Destroy previous sandbox if it exists
        if (sandbox) {
            keepFocus();
            sandbox.destroy();
            sandbox = null;
        }

        // Calculate size from the container's actual dimensions
        const rect = container.getBoundingClientRect();
        const width = Math.floor(rect.width);
        const height = Math.floor(rect.height);

        // Create a new sandboxed iframe for the game
        sandbox = createSandbox(container, { width, height });
        gameSize = { width, height };

        // Listen for messages from the sandbox
        sandbox.onMessage((msg) => {
            if (msg.type === "error") {
                console.error("Game error:", msg.data?.message);
            } else if (msg.type === "ready") {
                console.log("Game ready in sandbox");
                // Probe for save/restore support, then offer restore if available
                probeSaveSupport().then(() => checkAndOfferRestore());
            }
        });

        // The site's addition: the game's page stops the keys that scroll a
        // page, as this page does
        const frame = container.querySelector("iframe");
        withScrollKeysStopped(frame);

        // Load the game code into the sandbox
        sandbox.loadGame(game.code);
        // The site's additions: the game's frame is named after the game, as
        // the page's heading names it, for a screen reader; and once the
        // game's page has loaded, the frame takes the focus if this page has
        // it. Focus given to the frame before its page loads does not reach
        // that page.
        frame.title = container.querySelector("h1").textContent;
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

    // Handle resize for responsive canvas
    function handleResize() {
        if (!sandbox || !container) return;
        // The site's addition: only at a size, and a new one. The resize that
        // brings a frame its first size comes just as the game loads at it
        // (whenSized).
        const { width, height } = areaSize();
        if (!width || !height || (width === gameSize.width && height === gameSize.height)) return;
        loadGameScript();
    }

    let resizeTimeout = null;
    function debouncedResize() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleResize, 300);
    }

    whenSized(loadGameScript);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("resize", debouncedResize);
    window.addEventListener("focus", focusGame);
    window.addEventListener("keydown", stopScrollKeys, true);
})();
