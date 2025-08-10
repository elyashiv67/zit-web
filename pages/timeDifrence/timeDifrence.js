(function () {
  function countDigits(str) {
    const m = str.match(/\d/g);
    return m ? m.length : 0;
  }

  function caretFromDigitPos(digitPos, withSeconds) {
    if (!withSeconds) {
      // HH:MM -> colon after 2 digits
      return digitPos <= 2 ? digitPos : digitPos + 1;
    }
    // HH:MM:SS -> colons after 2 and 4 digits
    if (digitPos <= 2) return digitPos;
    if (digitPos <= 4) return digitPos + 1;
    return digitPos + 2;
  }

  function formatTimeDigits(rawDigits, opts) {
    const withSeconds = !!opts.seconds;
    const clamp = opts.clamp !== false; // default true
    const maxDigits = withSeconds ? 6 : 4;

    let d = rawDigits.slice(0, maxDigits);

    let h = d.slice(0, 2);
    let m = d.slice(2, 4);
    let s = withSeconds ? d.slice(4, 6) : '';

    // Clamp only when the unit has both digits
    if (clamp) {
      if (h.length === 2 && +h > 23) h = '23';
      if (m.length === 2 && +m > 59) m = '59';
      if (withSeconds && s.length === 2 && +s > 59) s = '59';
    }

    // Build with auto-inserted colons based on how many digits exist
    let out = '';
    if (h.length) out += h;

    if (d.length >= 3 || m.length) {
      out += (out ? ':' : '') + m;
    }

    if (withSeconds && (d.length >= 5 || s.length)) {
      out += (m.length || d.length >= 3 ? ':' : (out ? ':' : '')) + s;
    }

    return out;
  }

  function attachTimeMask(input, options = {}) {
    const withSeconds = !!options.seconds;
    const clearIncomplete = !!options.clearIncomplete;

    // Set a helpful maxlength
    if (!input.hasAttribute('maxlength')) {
      input.maxLength = withSeconds ? 8 : 5; // "HH:MM:SS" or "HH:MM"
    }

    const onInput = (e) => {
      const el = e.target;
      const prevValue = el.value;
      const prevCaret = el.selectionStart || 0;

      // Count how many digits were to the left of the caret before formatting
      const digitsBefore = countDigits(prevValue.slice(0, prevCaret));

      // Strip non-digits and format
      const digits = prevValue.replace(/\D/g, '');
      const nextValue = formatTimeDigits(digits, { seconds: withSeconds, clamp: options.clamp });

      el.value = nextValue;

      // Reposition caret based on how many digits were before
      const totalDigitsNow = digits.length;
      const safeDigitPos = Math.min(digitsBefore, totalDigitsNow);
      const nextCaret = Math.min(
        caretFromDigitPos(safeDigitPos, withSeconds),
        el.value.length
      );

      // Avoid selection issues in some browsers
      requestAnimationFrame(() => {
        el.setSelectionRange(nextCaret, nextCaret);
      });
    };

    const onBlur = (e) => {
      if (!clearIncomplete) return;
      const el = e.target;
      const digits = el.value.replace(/\D/g, '');
      const needed = withSeconds ? 6 : 4;
      if (digits.length !== needed) {
        el.value = '';
      }
    };

    input.addEventListener('input', onInput);
    input.addEventListener('blur', onBlur);

    // Return a cleanup function
    return () => {
      input.removeEventListener('input', onInput);
      input.removeEventListener('blur', onBlur);
    };
  }

  // Helper to attach to many inputs at once
  function maskTimeInputs(selectorOrNodes, options) {
    const nodes =
      typeof selectorOrNodes === 'string'
        ? document.querySelectorAll(selectorOrNodes)
        : selectorOrNodes;

    const cleanups = [];
    nodes.forEach((el) => {
      cleanups.push(attachTimeMask(el, options));
    });
    return () => cleanups.forEach((fn) => fn());
  }

  // Expose globally
  window.attachTimeMask = attachTimeMask;
  window.maskTimeInputs = maskTimeInputs;
})();





// Parse "HH:MM" or "HH:MM:SS" -> total seconds (NaN if invalid)
function timeToSeconds(str) {
    if (!str) return NaN;
    const m = String(str).trim().match(/^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/);
    if (!m) return NaN;
    const h = +m[1], min = +m[2], s = m[3] ? +m[3] : 0;
    if (h > 23) return NaN;
    return h * 3600 + min * 60 + s;
}

// Convert total seconds -> "HH:MM[:SS]"
function secondsToTime(totalSeconds, withSeconds = true) {
    if (!Number.isFinite(totalSeconds)) return '';
    totalSeconds = Math.floor(totalSeconds);
    // Keep within 0–86399 (wraps around midnight)
    totalSeconds = ((totalSeconds % 86400) + 86400) % 86400;
    
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');
    return withSeconds ? `${h}:${m}:${s}` : `${h}:${m}`;
}

// Add a convenient numeric API to an input element:
// - input.valueSeconds -> number (get/set)
// - respects HH:MM or HH:MM:SS display based on options.seconds
function attachTimeValueAPI(input, options = { seconds: true }) {
    const withSeconds = !!options.seconds;
    Object.defineProperty(input, 'valueSeconds', {
        get() { return timeToSeconds(input.value); },
        set(sec) { input.value = secondsToTime(sec, withSeconds); },
        configurable: true
    });
    // Return cleanup to remove the property if needed
    return () => { try { delete input.valueSeconds; } catch (_) {} };
}

let check = document.getElementById("check");


let time1 = document.getElementById("time1");
let time2 = document.getElementById("time2");

attachTimeMask(time1, {
    seconds: true,      // default: false
    clamp: true,         // clamp 24h/59m; default: true
    clearIncomplete: true
  });

  // Single input, HH:MM:SS
  attachTimeMask(time2, {
    seconds: true,
    clearIncomplete: false
  });
  
  
  time1.addEventListener("input",try12);
  time2.addEventListener("input",try12);
  attachTimeValueAPI(time1,{seconds:true});
  attachTimeValueAPI(time2,{seconds:true});
  
function try12(){
    const s1 = time1.valueSeconds;
    const s2 = time2.valueSeconds;
    const diff = s1 - s2; // do your math
    check.innerHTML = secondsToTime(diff, true); // -> "HH:MM:SS"
    
}