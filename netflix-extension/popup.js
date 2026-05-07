(function () {
  'use strict';

  const toggle = document.getElementById('enabled-toggle');
  const statusEl = document.getElementById('status-msg');
  const posSection = document.getElementById('position-section');
  const posButtons = document.querySelectorAll('.pos-btn');

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

  // --- Status: listen for EN cue count from content script ---

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs.length) return;
    const tab = tabs[0];
    if (!tab.url || !tab.url.includes('netflix.com/watch')) {
      statusEl.textContent = 'Open a Netflix title to activate.';
      statusEl.className = 'status';
      return;
    }

    // Ask the content script for the current EN cue count
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
    });
  });

})();
