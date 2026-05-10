(function () {
  'use strict';

  const toggle = document.getElementById('enabled-toggle');
  const statusEl = document.getElementById('status-msg');
  const posSection = document.getElementById('position-section');
  const posButtons = document.querySelectorAll('.pos-btn');
  const resetBtn = document.getElementById('reset-btn');
  const debugInfo = document.getElementById('debug-info');

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
        debugInfo.style.display = 'block';
        debugInfo.textContent =
          `cues: ${resp.enCueCount}\n` +
          `enabled: ${resp.enabled}\n` +
          `overlay: ${resp.hasOverlay}\n` +
          `now: "${(resp.currentText || '').slice(0, 40)}"\n` +
          `url: ${(resp.url || '').slice(0, 60)}`;
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
    });
  });

})();
