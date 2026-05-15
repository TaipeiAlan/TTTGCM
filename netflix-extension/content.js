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
    hideAnnotations: true,
    enCues: [],
    overlay: null,
    pollInterval: null,
    lastUrl: location.href,
    currentText: '',
    testMode: false,
    injectedSeen: false,
    lastEvent: '',
  };

  // --- Load settings from storage ---

  chrome.storage.sync.get({ enabled: true, hideAnnotations: true }, (prefs) => {
    state.enabled = prefs.enabled;
    state.hideAnnotations = prefs.hideAnnotations;
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled !== undefined) {
      state.enabled = changes.enabled.newValue;
      if (state.overlay) {
        if (!state.enabled) {
          state.overlay.style.display = 'none';
        } else {
          state.currentText = '';
        }
      }
    }
    if (changes.hideAnnotations !== undefined) {
      state.hideAnnotations = changes.hideAnnotations.newValue;
      state.currentText = ''; // force re-render
    }
  });

  // --- Overlay management ---

  function ensureOverlay() {
    if (state.overlay && document.body.contains(state.overlay)) return;
    const div = document.createElement('div');
    div.id = OVERLAY_ID;
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

  // --- Annotation filter ---
  // Returns true when every non-empty line is a bracket annotation, e.g. [Music].

  function isAnnotationOnly(text) {
    if (!text) return false;
    return text.trim().split('\n')
      .filter(l => l.trim())
      .every(l => /^\[.*\]$/i.test(l.trim()));
  }

  function visibleCues() {
    if (!state.hideAnnotations) return state.enCues;
    return state.enCues.filter(c => !isAnnotationOnly(c.text));
  }

  // --- Sliding subtitle window ---
  // Returns up to 3 entries: the cue just before t (within 2s), the active cue,
  // and the cue coming up next (within 2s). Each entry is { cue, type }.

  function getContextCues(cues, t) {
    if (!cues.length) return [];
    const WINDOW = 2;

    // Binary search: leftmost cue whose end > t - WINDOW
    let lo = 0, hi = cues.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cues[mid].end <= t - WINDOW) lo = mid + 1;
      else hi = mid;
    }

    const prev = [], curr = [], next = [];
    for (let i = lo; i < cues.length; i++) {
      const c = cues[i];
      if (c.start >= t + WINDOW) break;
      if (c.end <= t)       prev.push(c);
      else if (c.start <= t) curr.push(c);
      else                   next.push(c);
    }

    const result = [];
    if (prev.length)  result.push({ cue: prev[prev.length - 1], type: 'prev' });
    if (curr.length)  result.push({ cue: curr[0],               type: 'current' });
    if (next.length)  result.push({ cue: next[0],               type: 'next' });
    return result;
  }

  function renderOverlay(contextCues) {
    if (!contextCues.length) {
      if (state.overlay.style.display !== 'none') {
        state.overlay.style.display = 'none';
        state.overlay.textContent = '';
        state.currentText = '';
      }
      return;
    }

    // Use a render key to skip DOM work when nothing changed
    const key = contextCues.map(x => `${x.type}:${x.cue.start}`).join('|');
    if (key === state.currentText) return;
    state.currentText = key;

    state.overlay.textContent = ''; // clear old children
    for (const { cue, type } of contextCues) {
      const div = document.createElement('div');
      div.className = `sub-line sub-${type}`;
      div.appendChild(document.createTextNode(cue.text));
      state.overlay.appendChild(div);
    }
    state.overlay.style.display = 'block';
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

    if (state.testMode) {
      const now = new Date();
      const hms = now.toTimeString().slice(0, 8);
      const video = document.querySelector('video');
      const vt = video ? video.currentTime.toFixed(2) + 's' : 'no video';
      const text = `TEST ${hms}  video=${vt}  cues=${state.enCues.length}`;
      state.overlay.textContent = text;
      state.overlay.style.display = 'block';
      return;
    }

    if (!state.enabled) {
      if (state.overlay.style.display !== 'none') state.overlay.style.display = 'none';
      return;
    }

    const video = document.querySelector('video');
    if (!video) return;

    renderOverlay(getContextCues(visibleCues(), video.currentTime));
  }

  // --- Message listener from injected.js ---

  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    if (!e.data) return;

    if (e.data.type === 'NETFLIX_DUAL_SUB_INIT') {
      state.injectedSeen = true;
      return;
    }

    if (e.data.type === 'NETFLIX_DUAL_SUB_STATUS') {
      state.lastEvent = e.data.event || '';
      return;
    }

    if (e.data.type !== MSG_TYPE) return;

    console.log(LOG, 'msg received, source match:', e.source === window);
    const { lang, cues } = e.data.payload;
    if (!Array.isArray(cues) || !cues.length) return;

    if (/^en/i.test(lang)) {
      state.enCues = cues;
      console.log(LOG, 'EN cues loaded:', cues.length);
      ensureOverlay();
    }
  });

  // --- Handle messages from popup ---

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'GET_STATUS') {
      const video = document.querySelector('video');
      sendResponse({
        enCueCount: state.enCues.length,
        enabled: state.enabled,
        hasOverlay: !!state.overlay,
        pollActive: !!state.pollInterval,
        testMode: state.testMode,
        injectedSeen: state.injectedSeen,
        lastEvent: state.lastEvent,
        videoPresent: !!video,
        videoTime: video ? video.currentTime.toFixed(2) : null,
        currentText: state.currentText,
        url: location.href,
      });
    } else if (msg.type === 'REFETCH_SUBTITLES') {
      // Cross isolated-world boundary: dispatch a DOM event that injected.js listens for
      window.dispatchEvent(new Event('nf-refetch-request'));
      sendResponse({ ok: true });
    } else if (msg.type === 'SET_TEST_MODE') {
      state.testMode = !!msg.enabled;
      if (state.testMode) {
        ensureOverlay();
        startPolling();
      }
      sendResponse({ ok: true });
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

    if (newId) {
      if (oldId && oldId !== newId) {
        state.enCues = [];
        state.currentText = '';
        if (state.overlay) {
          state.overlay.textContent = '';
          state.overlay.style.display = 'none';
        }
        console.log(LOG, 'navigated to new title, cues reset');
      }
    } else {
      destroyOverlay();
      console.log(LOG, 'left player, overlay destroyed');
    }
  });

})();
