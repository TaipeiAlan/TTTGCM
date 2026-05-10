(function () {
  'use strict';

  const toggle = document.getElementById('enabled-toggle');
  const statusEl = document.getElementById('status-msg');
  const posSection = document.getElementById('position-section');
  const posButtons = document.querySelectorAll('.pos-btn');
  const resetBtn = document.getElementById('reset-btn');
  const debugInfo = document.getElementById('debug-info');
  const debugActions = document.getElementById('debug-actions');
  const testOverlayBtn = document.getElementById('test-overlay-btn');
  const copyBtn = document.getElementById('copy-btn');

  let testModeOn = false;

  // --- Load saved preferences ---

  chrome.storage.sync.get({ enabled: true, position: 'below' }, (prefs) => {
    toggle.checked = prefs.enabled;
    posSection.style.opacity = prefs.enabled ? '1' : '0.4';
    setActivePos(prefs.position);
  });

  // --- Enable/disable toggle ---

  toggle.addEventListener('change', () => {
    const enabled = toggle.checked;
    chrome.storage.sync.set({ enabled });
    posSection.style.opacity = enabled ? '1' : '0.4';
  });

  // --- Position buttons ---

  function setActivePos(pos) {
    posButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.pos === pos);
    });
  }

  posButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const pos = btn.dataset.pos;
      chrome.storage.sync.set({ position: pos });
      setActivePos(pos);
    });
  });

  // --- Status: query content script for EN cue count + debug info ---

  let activeTabId = null;

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
      if (resp && resp.enCueCount > 0) {
        statusEl.textContent = `✓ English subtitle loaded (${resp.enCueCount} cues)`;
        statusEl.className = 'status loaded';
      } else {
        statusEl.textContent = 'Waiting — play a title and select subtitles.';
        statusEl.className = 'status waiting';
      }

      if (resp) {
        testModeOn = !!resp.testMode;
        testOverlayBtn.textContent = testModeOn ? '■ Stop Test' : '▶ Test Overlay';
        testOverlayBtn.classList.toggle('active', testModeOn);

        debugInfo.style.display = 'block';
        debugActions.style.display = 'flex';
        debugInfo.textContent =
          `cues:         ${resp.enCueCount}\n` +
          `enabled:      ${resp.enabled}\n` +
          `test mode:    ${resp.testMode}\n` +
          `overlay:      ${resp.hasOverlay}\n` +
          `poll active:  ${resp.pollActive}\n` +
          `injected.js:  ${resp.injectedSeen ? 'active' : 'NOT SEEN'}\n` +
          `last event:   ${resp.lastEvent || '(none)'}\n` +
          `video:        ${resp.videoPresent ? `yes (t=${resp.videoTime}s)` : 'NOT FOUND'}\n` +
          `now:          "${(resp.currentText || '').slice(0, 40)}"\n` +
          `url:          ${resp.url || ''}`;
      }
    });
  });

  // --- Reset button ---

  resetBtn.addEventListener('click', () => {
    if (activeTabId === null) return;
    chrome.tabs.sendMessage(activeTabId, { type: 'RESET_SUBTITLES' }, () => {
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
