/**
 * injected.js — runs in the PAGE's JavaScript world (not isolated content script world).
 * Intercepts XHR and fetch to capture Netflix subtitle files and the player manifest.
 * Communicates results to content.js via window.postMessage.
 */
(function () {
  'use strict';

  const LOG = '[DualSub]';
  const MSG_TYPE = 'NETFLIX_DUAL_SUB_DATA';

  // --- URL detection ---

  const SUBTITLE_URL_RE = /\.(ttml|xml|vtt)(\?|$)/i;
  const NETFLIX_CDN_RE = /nflxvideo\.net|nflxext\.com|netflix\.net/i;
  const MANIFEST_URL_RE = /\/cadmium\/(manifest|playerConfig|licensedManifest)/i;

  function isSubtitleUrl(url) {
    return SUBTITLE_URL_RE.test(url) && NETFLIX_CDN_RE.test(url);
  }

  function isManifestUrl(url) {
    return MANIFEST_URL_RE.test(url);
  }

  // --- Language detection ---

  function detectLangFromUrl(url) {
    const m = url.match(/[_\-\/](zh[-_][A-Za-z]+|zh|en[-_][A-Za-z]*|en)[_\-\/\.&?]/i);
    return m ? m[1].toLowerCase() : null;
  }

  // --- Time parsing ---

  function parseTime(timeStr) {
    if (!timeStr) return null;
    // HH:MM:SS.mmm or HH:MM:SS,mmm
    const hms = timeStr.match(/^(\d+):(\d{2}):(\d{2})[.,](\d+)/);
    if (hms) {
      const ms = hms[4].padEnd(3, '0').slice(0, 3);
      return parseInt(hms[1]) * 3600 + parseInt(hms[2]) * 60 + parseInt(hms[3]) + parseInt(ms) / 1000;
    }
    // MM:SS.mmm
    const ms2 = timeStr.match(/^(\d+):(\d{2})[.,](\d+)/);
    if (ms2) {
      return parseInt(ms2[1]) * 60 + parseInt(ms2[2]) + parseInt(ms2[3].padEnd(3, '0').slice(0, 3)) / 1000;
    }
    // Plain seconds
    const plain = parseFloat(timeStr);
    if (!isNaN(plain)) return plain;
    return null;
  }

  function parseVttTime(t) {
    const parts = t.split(':');
    if (parts.length === 3) {
      return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    }
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }

  // --- TTML parser ---

  function parseTTML(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    if (doc.querySelector('parsererror')) {
      // Try text/html fallback
      const doc2 = parser.parseFromString(xmlText, 'text/html');
      return parseTTMLDoc(doc2);
    }
    return parseTTMLDoc(doc);
  }

  function parseTTMLDoc(doc) {
    const tt = doc.querySelector('tt') || doc.querySelector('TT');
    const lang = tt ? (tt.getAttribute('xml:lang') || tt.getAttribute('lang') || '') : '';

    // Check for tick-based timing
    let tickRate = null;
    if (tt) {
      const tr = tt.getAttribute('ttp:tickRate') || tt.getAttribute('tickRate');
      if (tr) tickRate = parseInt(tr);
    }

    const cues = [];
    const paragraphs = doc.querySelectorAll('p');
    paragraphs.forEach(p => {
      let beginAttr = p.getAttribute('begin');
      let endAttr = p.getAttribute('end');
      if (!beginAttr || !endAttr) return;

      let start, end;
      // Tick-based timing: no colon, no dot → pure integer ticks
      if (tickRate && !/[:.]/.test(beginAttr)) {
        start = parseInt(beginAttr) / tickRate;
        end = parseInt(endAttr) / tickRate;
      } else {
        start = parseTime(beginAttr);
        end = parseTime(endAttr);
      }

      if (start === null || end === null) return;

      // Extract text content, preserving <br/> as newline
      let text = extractTTMLText(p);
      text = text.trim();
      if (text) {
        cues.push({ start, end, text });
      }
    });

    return { lang, cues };
  }

  function extractTTMLText(node) {
    let result = '';
    node.childNodes.forEach(child => {
      const name = child.nodeName.toLowerCase();
      if (child.nodeType === Node.TEXT_NODE) {
        result += child.textContent;
      } else if (name === 'br') {
        result += '\n';
      } else if (name === 'span') {
        result += extractTTMLText(child);
      }
    });
    return result;
  }

  // --- WebVTT parser ---

  function parseVTT(vttText) {
    const cues = [];
    const blocks = vttText.split(/\n\s*\n/);
    for (const block of blocks) {
      const lines = block.trim().split('\n');
      const timingIdx = lines.findIndex(l => l.includes('-->'));
      if (timingIdx === -1) continue;
      const tm = lines[timingIdx].match(/(\S+)\s+-->\s+(\S+)/);
      if (!tm) continue;
      const start = parseVttTime(tm[1]);
      const end = parseVttTime(tm[2]);
      // Strip VTT cue tags like <c.colorFFFFFF>, </c>, <00:00:00.000>
      const text = lines.slice(timingIdx + 1).join('\n').replace(/<[^>]+>/g, '').trim();
      if (text && !isNaN(start) && !isNaN(end)) {
        cues.push({ start, end, text });
      }
    }
    return { lang: '', cues };
  }

  // --- Handle subtitle response ---

  const processedUrls = new Set();

  function handleSubtitleResponse(url, text) {
    if (!text || processedUrls.has(url)) return;
    processedUrls.add(url);

    let result = null;
    try {
      if (/\.vtt(\?|$)/i.test(url)) {
        result = parseVTT(text);
      } else {
        result = parseTTML(text);
      }
    } catch (e) {
      console.warn(LOG, 'parse error:', e);
      return;
    }

    if (!result || !result.cues.length) return;

    const lang = detectLangFromUrl(url) || result.lang || '';
    console.log(LOG, 'subtitle loaded:', lang, result.cues.length, 'cues', url.slice(0, 80));

    window.postMessage({
      type: MSG_TYPE,
      payload: { lang: lang.toLowerCase(), cues: result.cues, url }
    }, '*');
  }

  // --- Manifest interception: auto-fetch English track ---

  const fetchedEnUrls = new Set();

  function getFirstSubtitleUrl(ttDownloadables) {
    if (!ttDownloadables) return null;
    // Prefer webvtt or ttml formats
    const preferredFormats = [
      'webvtt-lssdh-ios8', 'webvtt-lssdh', 'webvtt',
      'simplesdh', 'nflx-cmiaf', 'dfxp-ls-sdh'
    ];
    for (const fmt of preferredFormats) {
      const entry = ttDownloadables[fmt];
      if (entry && entry.urls && entry.urls.length) {
        return entry.urls[0].url || entry.urls[0];
      }
    }
    // Fallback: first available
    for (const fmt of Object.keys(ttDownloadables)) {
      const entry = ttDownloadables[fmt];
      if (entry && entry.urls && entry.urls.length) {
        return entry.urls[0].url || entry.urls[0];
      }
    }
    return null;
  }

  function extractTracksFromManifest(json) {
    // Try multiple known JSON shapes
    const candidates = [
      json?.result?.timedtexttracks,
      json?.timedtexttracks,
      json?.result?.timeline?.timedtexttracks,
    ].filter(Array.isArray);

    if (!candidates.length) return;

    const tracks = candidates[0];
    // Find English track; skip CC/SDH if a plain EN exists
    let enTrack = tracks.find(t => t.bcp47 === 'en' && !t.isForcedNarrative);
    if (!enTrack) enTrack = tracks.find(t => /^en/i.test(t.bcp47) && !t.isForcedNarrative);
    if (!enTrack) enTrack = tracks.find(t => /^en/i.test(t.bcp47));

    if (!enTrack) {
      console.log(LOG, 'No EN track found in manifest');
      return;
    }

    const url = getFirstSubtitleUrl(enTrack.ttDownloadables);
    if (!url || fetchedEnUrls.has(url)) return;
    fetchedEnUrls.add(url);

    console.log(LOG, 'Auto-fetching EN subtitle:', url.slice(0, 80));
    fetch(url)
      .then(r => r.text())
      .then(text => handleSubtitleResponse(url, text))
      .catch(e => console.warn(LOG, 'EN fetch error:', e));
  }

  function handleManifestResponse(url, text) {
    try {
      const json = JSON.parse(text);
      extractTracksFromManifest(json);
    } catch (e) {
      // Not JSON or parse error — ignore
    }
  }

  // --- XHR interception ---

  const OrigXHR = window.XMLHttpRequest;

  function PatchedXHR() {
    const xhr = new OrigXHR();
    let _url = '';

    const origOpen = xhr.open.bind(xhr);
    xhr.open = function (method, url, ...rest) {
      _url = typeof url === 'string' ? url : String(url);
      return origOpen(method, url, ...rest);
    };

    xhr.addEventListener('load', function () {
      try {
        if (isManifestUrl(_url)) {
          handleManifestResponse(_url, xhr.responseText);
        } else if (isSubtitleUrl(_url)) {
          handleSubtitleResponse(_url, xhr.responseText);
        }
      } catch (e) {
        // Never crash the page
      }
    });

    return xhr;
  }

  // Preserve instanceof checks from Netflix's player
  PatchedXHR.prototype = OrigXHR.prototype;
  Object.defineProperty(PatchedXHR, 'name', { value: 'XMLHttpRequest' });
  window.XMLHttpRequest = PatchedXHR;

  // --- Fetch interception ---

  const origFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url = (input instanceof Request) ? input.url : String(input);
    const response = await origFetch.call(window, input, init);

    try {
      if (isManifestUrl(url) || isSubtitleUrl(url)) {
        const clone = response.clone();
        clone.text().then(text => {
          if (isManifestUrl(url)) {
            handleManifestResponse(url, text);
          } else {
            handleSubtitleResponse(url, text);
          }
        }).catch(() => {});
      }
    } catch (e) {
      // Never crash the page
    }

    return response;
  };

  console.log(LOG, 'injected.js active — XHR/fetch patched');
})();
