(function () {
  'use strict';

  const toggle = document.getElementById('enabled-toggle');
  const statusEl = document.getElementById('status-msg');
  const resetBtn = document.getElementById('reset-btn');
  const refetchBtn = document.getElementById('refetch-btn');
  const debugInfo = document.getElementById('debug-info');
  const debugActions = document.getElementById('debug-actions');
  const testOverlayBtn = document.getElementById('test-overlay-btn');
  const copyBtn = document.getElementById('copy-btn');
  const versionBadge = document.getElementById('version-badge');

  let testModeOn = false;
  let refreshTimer = null;

  const { version } = chrome.runtime.getManifest();
  versionBadge.textContent = `v${version}`;

  // --- Load saved preferences ---

  chrome.storage.sync.get({ enabled: true }, (prefs) => {
    toggle.checked = prefs.enabled;
  });

  // --- Enable/disable toggle ---

  toggle.addEventListener('change', () => {
    chrome.storage.sync.set({ enabled: toggle.checked });
  });

  // --- Status: query content script for EN cue count + debug info ---

  let activeTabId = null;

  function renderStatus(resp) {
    if (!resp) return;
    if (resp.enCueCount > 0) {
      statusEl.textContent = `✓ English subtitle loaded (${resp.enCueCount} cues)`;
      statusEl.className = 'status loaded';
    } else {
      statusEl.textContent = 'Waiting — play a title and select subtitles.';
      statusEl.className = 'status waiting';
    }

    testModeOn = !!resp.testMode;
    testOverlayBtn.textContent = testModeOn ? '■ Stop Test' : '▶ Test Overlay';
    testOverlayBtn.classList.toggle('active', testModeOn);

    debugInfo.style.display = 'block';
    debugActions.style.display = 'flex';
    debugInfo.textContent =
      `version:      v${version}\n` +
      `─────────────────────────────\n` +
      `cues:         ${resp.enCueCount}\n` +
      `enabled:      ${resp.enabled}\n` +
      `test mode:    ${resp.testMode}\n` +
      `overlay:      ${resp.hasOverlay}\n` +
      `poll active:  ${resp.pollActive}\n` +
      `injected.js:  ${resp.injectedSeen ? 'active' : 'NOT SEEN ⚠'}\n` +
      `last event:   ${resp.lastEvent || '(none)'}\n` +
      `video:        ${resp.videoPresent ? `yes (t=${resp.videoTime}s)` : 'NOT FOUND ⚠'}\n` +
      `current cue:  "${(resp.currentText || '').slice(0, 60)}"\n` +
      `url:          ${resp.url || ''}`;
  }

  function fetchStatus() {
    if (activeTabId === null) return;
    chrome.tabs.sendMessage(activeTabId, { type: 'GET_STATUS' }, (resp) => {
      if (chrome.runtime.lastError) return;
      renderStatus(resp);
    });
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs.length) return;
    const tab = tabs[0];
    activeTabId = tab.id;

    if (!tab.url || !tab.url.includes('netflix.com/watch')) {
      statusEl.textContent = 'Open a Netflix title to activate.';
      statusEl.className = 'status';
      return;
    }

    chrome.tabs.sendMessage(tab.id, { type: 'GET_STATUS' }, (resp) => {
      if (chrome.runtime.lastError) {
        statusEl.textContent = 'Content script not ready yet.';
        statusEl.className = 'status';
        return;
      }
      renderStatus(resp);
      // Auto-refresh every 2s while popup is open
      refreshTimer = setInterval(fetchStatus, 2000);
    });
  });

  window.addEventListener('unload', () => {
    if (refreshTimer) clearInterval(refreshTimer);
  });

  // --- Re-fetch button ---

  refetchBtn.addEventListener('click', () => {
    if (activeTabId === null) return;
    refetchBtn.textContent = '⟳ Fetching…';
    refetchBtn.disabled = true;
    chrome.tabs.sendMessage(activeTabId, { type: 'REFETCH_SUBTITLES' }, () => {
      void chrome.runtime.lastError;
      setTimeout(() => {
        refetchBtn.textContent = '⟳ Re-fetch EN';
        refetchBtn.disabled = false;
        fetchStatus();
      }, 2000);
    });
  });

  // --- Reset button ---

  resetBtn.addEventListener('click', () => {
    if (activeTabId === null) return;
    chrome.tabs.sendMessage(activeTabId, { type: 'RESET_SUBTITLES' }, () => {
      void chrome.runtime.lastError;
      statusEl.textContent = 'Reset — waiting for next subtitle load.';
      statusEl.className = 'status waiting';
      debugInfo.style.display = 'none';
      debugActions.style.display = 'none';
    });
  });

  // --- Test overlay button ---

  testOverlayBtn.addEventListener('click', () => {
    if (activeTabId === null) return;
    testModeOn = !testModeOn;
    chrome.tabs.sendMessage(activeTabId, { type: 'SET_TEST_MODE', enabled: testModeOn }, () => {
      void chrome.runtime.lastError;
      testOverlayBtn.textContent = testModeOn ? '■ Stop Test' : '▶ Test Overlay';
      testOverlayBtn.classList.toggle('active', testModeOn);
    });
  });

  // --- Copy debug text ---

  copyBtn.addEventListener('click', () => {
    const text = debugInfo.textContent;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = '✓ Copied';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = '⎘ Copy';
        copyBtn.classList.remove('copied');
      }, 1500);
    });
  });

})();
