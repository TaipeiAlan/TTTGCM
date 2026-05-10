/**
 * content.js — runs in Chrome's isolated world.
 * Injects injected.js into the page, manages the English subtitle overlay,
 * and handles SPA navigation.
 */
(function () {
  'use strict';

  const LOG = '[DualSub]';
  const OVERLAY_ID = 'netflix-dual-sub-overlay';
  const MSG_TYPE = 'NETFLIX_DUAL_SUB_DATA';

  console.log(LOG, 'content.js active', location.href.slice(0, 60));

  // --- State ---

  const state = {
    enabled: true,
    position: 'below',   // 'below' | 'above'
    enCues: [],
    overlay: null,
    pollInterval: null,
    lastUrl: location.href,
    currentText: '',
  };

  // --- Load settings from storage ---

  chrome.storage.sync.get({ enabled: true, position: 'below' }, (prefs) => {
    state.enabled = prefs.enabled;
    state.position = prefs.position;
    applyPosition();
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled !== undefined) {
      state.enabled = changes.enabled.newValue;
      if (state.overlay) {
        if (!state.enabled) {
          state.overlay.style.display = 'none';
        } else {
          // Force re-render on next poll cycle; without this the overlay stays
          // hidden when re-enabled while the same cue is still showing.
          state.currentText = '';
        }
      }
    }
    if (changes.position !== undefined) {
      state.position = changes.position.newValue;
      applyPosition();
    }
  });

  // --- Overlay management ---

  function applyPosition() {
    if (!state.overlay) return;
    if (state.position === 'above') {
      state.overlay.style.bottom = '20%';
    } else {
      state.overlay.style.bottom = '5%';
    }
  }

  function ensureOverlay() {
    if (state.overlay && document.body.contains(state.overlay)) return;
    const div = document.createElement('div');
    div.id = OVERLAY_ID;
    // Inline bottom to allow position changes without toggling CSS classes
    div.style.bottom = state.position === 'above' ? '20%' : '5%';
    document.body.appendChild(div);
    state.overlay = div;
    console.log(LOG, 'overlay created');
    startPolling();
  }

  function destroyOverlay() {
    stopPolling();
    if (state.overlay) {
      state.overlay.remove();
      state.overlay = null;
    }
    state.currentText = '';
  }

  // --- Binary search for current cue ---

  function binarySearchCue(cues, t) {
    let lo = 0, hi = cues.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const c = cues[mid];
      if (t < c.start) {
        hi = mid - 1;
      } else if (t >= c.end) {
        lo = mid + 1;
      } else {
        return c;
      }
    }
    return null;
  }

  // --- Polling loop ---

  function startPolling() {
    if (state.pollInterval) return;
    state.pollInterval = setInterval(onPoll, 100);
  }

  function stopPolling() {
    if (state.pollInterval) {
      clearInterval(state.pollInterval);
      state.pollInterval = null;
    }
  }

  function onPoll() {
    if (!state.overlay) return;
    if (!state.enabled) {
      if (state.overlay.style.display !== 'none') state.overlay.style.display = 'none';
      return;
    }

    const video = document.querySelector('video');
    if (!video) return;

    const t = video.currentTime;
    const cue = binarySearchCue(state.enCues, t);
    const text = cue ? cue.text : '';

    if (text !== state.currentText) {
      state.currentText = text;
      state.overlay.textContent = text;
      state.overlay.style.display = text ? 'block' : 'none';
    }
  }

  // --- Message listener from injected.js ---

  window.addEventListener('message', (e) => {
    if (e.data?.type === MSG_TYPE) console.log(LOG, 'msg received, source match:', e.source === window);
    if (e.source !== window) return;
    if (!e.data || e.data.type !== MSG_TYPE) return;

    const { lang, cues } = e.data.payload;
    if (!Array.isArray(cues) || !cues.length) return;

    if (/^en/i.test(lang)) {
      state.enCues = cues;
      console.log(LOG, 'EN cues loaded:', cues.length);

      // Notify popup about loaded cue count
      chrome.runtime.sendMessage({ type: 'EN_CUES_LOADED', count: cues.length }).catch(() => {});

      ensureOverlay();
    }
  });

  // --- Handle messages from popup ---

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'GET_STATUS') {
      sendResponse({
        enCueCount: state.enCues.length,
        enabled: state.enabled,
        hasOverlay: !!state.overlay,
        currentText: state.currentText,
        url: location.href.slice(0, 80),
      });
    } else if (msg.type === 'RESET_SUBTITLES') {
      state.enCues = [];
      state.currentText = '';
      if (state.overlay) {
        state.overlay.textContent = '';
        state.overlay.style.display = 'none';
      }
      console.log(LOG, 'subtitle state reset by popup');
      sendResponse({ ok: true });
    }
    return false;
  });

  // --- SPA navigation (Netflix is a React SPA) ---
  // 'nf-locationchange' is dispatched from injected.js (MAIN world) which is the
  // only place that can intercept Netflix's own pushState/replaceState calls.

  function extractWatchId(url) {
    const m = url.match(/\/watch\/(\d+)/i);
    return m ? m[1] : null;
  }

  window.addEventListener('nf-locationchange', () => {
    const newUrl = location.href;
    if (newUrl === state.lastUrl) return;

    const oldId = extractWatchId(state.lastUrl);
    const newId = extractWatchId(newUrl);
    state.lastUrl = newUrl;

    // Netflix updates query params (trackId, tctx, etc.) during playback via
    // replaceState — if the watch ID hasn't changed, this is not a real navigation.
    if (newId && newId === oldId) return;

    if (/\/watch\//i.test(newUrl)) {
      // New title — reset subtitle data, keep overlay structure
      state.enCues = [];
      state.currentText = '';
      if (state.overlay) {
        state.overlay.textContent = '';
        state.overlay.style.display = 'none';
      }
      console.log(LOG, 'navigated to new watch page, state reset');
    } else {
      // Left the player
      destroyOverlay();
      console.log(LOG, 'left player, overlay destroyed');
    }
  });

})();
