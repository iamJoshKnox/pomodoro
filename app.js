(() => {
  'use strict';

  const STORE_KEY = 'coop-focus-v1';
  // ?fast runs sessions 60x faster (a "15 minute" session takes 15 seconds) for testing.
  const SPEED = new URLSearchParams(location.search).has('fast') ? 60 : 1;
  const RING_MS = 2700;
  const BLEND_MS = 900;
  const TITLE = 'Focus · Cooptimize';

  const $ = (id) => document.getElementById(id);
  const fields = { goal: $('goal'), why: $('why'), attempt: $('attempt') };
  const attemptLabel = $('attempt-label');
  const progressPath = $('progress');
  const progressLength = progressPath.getTotalLength();
  const scale = $('scale');
  const scaleLabels = [];
  const statusEl = $('status');
  const toastEl = $('toast');
  const announcer = $('announcer');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Each inner C turns like a clock hand. Every angle reaches 0 when time runs out,
  // so the Cs line up into the logo exactly at 00:00.
  const hands = [
    { el: $('hand-lime'), period: 60, dir: 1 },
    { el: $('hand-olive'), period: 300, dir: -1 },
    { el: $('hand-forest'), period: 900, dir: 1 },
  ];

  const PHASES = ['setup', 'focusing', 'ringing', 'review'];
  const defaults = {
    phase: 'setup', goal: '', why: '', attempt: '',
    minutes: 0, speed: 1, startedAt: 0, endAt: 0, endedAt: 0, endedEarly: false,
  };
  const state = { ...defaults, ...load() };
  if (!PHASES.includes(state.phase)) state.phase = 'setup';

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY));
      return saved && typeof saved === 'object' ? saved : {};
    } catch {
      return {};
    }
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be unavailable (private mode, blocked site data); the page still works.
    }
  }

  // ---------- Time ----------

  // Seconds left in the session, in session time (so ?fast scales everything consistently).
  function remainingSeconds() {
    return Math.max(0, (state.endAt - Date.now()) * state.speed / 1000);
  }

  function formatTime(seconds) {
    const s = Math.ceil(seconds);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  let lastLabel = '';
  function updateClock() {
    const label = formatTime(remainingSeconds());
    if (label === lastLabel) return;
    lastLabel = label;
    document.title = `${label} · Focus`;
  }

  // rAF pauses in background tabs, so timers also watch for the end of the session.
  // The one-shot timeout is not a chained timer, which keeps it out of Chrome's
  // per-minute throttling of hidden tabs.
  let endTimer = 0;
  let tickTimer = 0;
  let ringTimer = 0;

  function scheduleTimers() {
    clearTimers();
    endTimer = setTimeout(checkDone, Math.max(0, state.endAt - Date.now()) + 50);
    tickTimer = setInterval(checkDone, 1000);
  }

  function clearTimers() {
    clearTimeout(endTimer);
    clearInterval(tickTimer);
  }

  function checkDone() {
    if (state.phase !== 'focusing') return;
    if (Date.now() >= state.endAt) finish(true);
    else updateClock();
  }

  // ---------- Dial rendering ----------

  let shown = { angles: [0, 0, 0], progress: 1, dial: 0 };
  let blend = null;
  let raf = 0;

  function targetVisual() {
    if (state.phase !== 'focusing') return { angles: [0, 0, 0], progress: 1, dial: 0 };
    const remaining = remainingSeconds();
    const total = state.minutes * 60;
    return {
      angles: hands.map((h) => (reduceMotion.matches ? 0 : (-h.dir * 360 * remaining / h.period) % 360)),
      progress: total ? 1 - remaining / total : 1,
      dial: remaining / 60 * 6, // egg-timer scale: 6 degrees per minute
    };
  }

  // Ease from whatever is on screen to the new target when the phase changes.
  function beginBlend() {
    blend = reduceMotion.matches
      ? null
      : { from: { angles: shown.angles.slice(), progress: shown.progress, dial: shown.dial }, t0: performance.now() };
  }

  function easeInOut(k) {
    return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  }

  function render() {
    let v = targetVisual();
    if (blend) {
      const k = (performance.now() - blend.t0) / BLEND_MS;
      if (k >= 1) {
        blend = null;
      } else {
        const e = easeInOut(k);
        const from = blend.from;
        v = {
          angles: v.angles.map((a, i) => {
            const delta = (((a - from.angles[i]) % 360) + 540) % 360 - 180; // shortest way round
            return from.angles[i] + delta * e;
          }),
          progress: from.progress + (v.progress - from.progress) * e,
          // The long way round on purpose: starting a session winds the scale up like an egg timer.
          dial: from.dial + (v.dial - from.dial) * e,
        };
      }
    }
    hands.forEach((h, i) => h.el.setAttribute('transform', `rotate(${v.angles[i].toFixed(2)})`));
    renderScale(v.dial);
    progressPath.style.strokeDasharray = v.progress >= 0.9999
      ? 'none'
      : `${(progressLength * v.progress).toFixed(1)} ${progressLength.toFixed(1)}`;
    shown = v;
  }

  // ---------- Egg-timer scale ----------

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const LABEL_RADIUS = 760;

  // Minute m sits m * 6 degrees counter-clockwise of the pointer at 12 o'clock, so turning
  // the scale clockwise by (minutes left * 6) puts the time left under the pointer.
  function polar(r, deg) {
    const rad = deg * Math.PI / 180;
    return [r * Math.sin(rad), -r * Math.cos(rad)];
  }

  function buildScale() {
    for (let m = 0; m < 60; m++) {
      const major = m % 5 === 0;
      const [x1, y1] = polar(662, -m * 6);
      const [x2, y2] = polar(major ? 712 : 690, -m * 6);
      const tick = document.createElementNS(SVG_NS, 'line');
      tick.setAttribute('class', major ? 'tick tick-major' : 'tick tick-minor');
      tick.setAttribute('x1', x1.toFixed(1));
      tick.setAttribute('y1', y1.toFixed(1));
      tick.setAttribute('x2', x2.toFixed(1));
      tick.setAttribute('y2', y2.toFixed(1));
      scale.appendChild(tick);
      if (major) {
        const label = document.createElementNS(SVG_NS, 'text');
        label.setAttribute('class', 'scale-label');
        label.setAttribute('dy', '0.35em');
        label.textContent = m;
        $('scale-labels').appendChild(label);
        scaleLabels.push({ el: label, minute: m });
      }
    }
  }

  // Ticks rotate as a group; numbers move around the ring but stay upright.
  function renderScale(dial) {
    scale.setAttribute('transform', `rotate(${dial.toFixed(2)})`);
    for (const { el, minute } of scaleLabels) {
      const [x, y] = polar(LABEL_RADIUS, dial - minute * 6);
      el.setAttribute('x', x.toFixed(1));
      el.setAttribute('y', y.toFixed(1));
    }
  }

  function frame() {
    raf = 0;
    if (state.phase === 'focusing') {
      if (Date.now() >= state.endAt) finish(true);
      else updateClock();
    }
    render();
    if ((state.phase === 'focusing' || blend) && !raf) raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  // ---------- Phases ----------

  function setPhase(phase) {
    state.phase = phase;
    document.body.className = `state-${phase}`;

    const locked = phase === 'focusing' || phase === 'ringing';
    for (const el of Object.values(fields)) {
      el.readOnly = locked;
      el.tabIndex = locked ? -1 : 0;
      el.closest('.field').classList.toggle('is-empty', !el.value.trim());
    }

    const reviewing = phase === 'review';
    attemptLabel.textContent = reviewing ? 'What I tried:' : 'What I will try:';
    fields.attempt.placeholder = reviewing
      ? 'What you did, what worked, where you got stuck'
      : 'Rebuild the date table and fix the YoY measure';

    if (phase === 'ringing') document.title = "Time's up · Focus";
    else if (phase !== 'focusing') document.title = TITLE;

    save();
    requestAnimationFrame(autosizeAll);
    beginBlend();
    kick();
  }

  function start(minutes) {
    if (!fields.goal.value.trim()) {
      nudgeGoal();
      return;
    }
    unlockAudio();
    const now = Date.now();
    Object.assign(state, {
      minutes, speed: SPEED, startedAt: now, endAt: now + minutes * 60000 / SPEED, endedAt: 0, endedEarly: false,
    });
    document.activeElement?.blur();
    lastLabel = '';
    updateClock();
    setPhase('focusing');
    scheduleTimers();
    keepAwake();
    announce(`${minutes}-minute focus session started.`);
    window.scrollTo({ top: 0 });
  }

  function finish(ring) {
    clearTimers();
    releaseWakeLock();
    state.endedAt = state.endedAt || Date.now();
    if (ring) {
      setPhase('ringing');
      announce("Time's up.");
      ding();
      clearTimeout(ringTimer);
      ringTimer = setTimeout(enterReview, RING_MS);
    } else {
      enterReview();
    }
  }

  function endEarly() {
    state.endedEarly = true;
    state.endedAt = Date.now();
    finish(false);
  }

  function enterReview() {
    statusEl.textContent = statusText();
    setPhase('review');
  }

  function restart() {
    statusEl.textContent = '';
    setPhase('setup');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function statusText() {
    if (!state.endedEarly) return `${state.minutes}-minute session complete. Nice work.`;
    const mins = Math.floor((state.endedAt - state.startedAt) * state.speed / 60000);
    return mins < 1 ? 'Session ended early.' : `Ended early after ${mins} of ${state.minutes} minutes.`;
  }

  function nudgeGoal() {
    const field = $('field-goal');
    field.classList.remove('nudge');
    void field.offsetWidth; // restart the shake animation
    field.classList.add('nudge');
    fields.goal.focus();
    announce('Add your big goal first.');
  }

  // ---------- Sound, vibration, wake lock ----------

  let audio = null;

  // Must run inside a tap or click: browsers only allow audio that a gesture unlocked.
  function unlockAudio() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    try {
      audio = audio || new Ctx();
      if (audio.state !== 'running') audio.resume();
      // iOS also wants a sound started during the gesture, so play a silent blip.
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      gain.gain.value = 0;
      osc.connect(gain).connect(audio.destination);
      osc.start();
      osc.stop(audio.currentTime + 0.01);
    } catch {
      audio = null;
    }
  }

  function ding() {
    navigator.vibrate?.([180, 120, 180]);
    if (!audio) return;
    if (audio.state !== 'running') audio.resume();
    const t = audio.currentTime + 0.05;
    strike(t, 0.2);
    strike(t + 1.3, 0.14); // in step with the second shake
  }

  // A soft bell: a sine fundamental plus two quiet inharmonic overtones, decaying out.
  function strike(t0, level) {
    const out = audio.createGain();
    out.gain.value = level;
    out.connect(audio.destination);
    [[880, 1, 2.4], [880 * 2.76, 0.28, 1.2], [880 * 5.4, 0.08, 0.5]].forEach(([freq, amp, decay]) => {
      const osc = audio.createOscillator();
      const env = audio.createGain();
      osc.frequency.value = freq;
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.exponentialRampToValueAtTime(amp, t0 + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
      osc.connect(env).connect(out);
      osc.start(t0);
      osc.stop(t0 + decay + 0.05);
    });
  }

  // Keep a phone's screen on during a session so the timer is still running to ding.
  let wakeLock = null;

  async function keepAwake() {
    if (!('wakeLock' in navigator) || wakeLock || document.visibilityState !== 'visible') return;
    try {
      const lock = await navigator.wakeLock.request('screen');
      if (state.phase === 'focusing') {
        wakeLock = lock;
        lock.addEventListener('release', () => { if (wakeLock === lock) wakeLock = null; });
      } else {
        lock.release();
      }
    } catch {
      // Not allowed (battery saver, unsupported); the timer still works.
    }
  }

  function releaseWakeLock() {
    wakeLock?.release().catch(() => {});
    wakeLock = null;
  }

  // ---------- Copy for Teams ----------

  function buildMessage(who) {
    const lines = [`@${who}`];
    const goal = fields.goal.value.trim();
    const why = fields.why.value.trim();
    const tried = fields.attempt.value.trim();
    if (goal) lines.push(`Big goal: ${goal}`);
    if (why) lines.push(`Why: ${why}`);
    if (tried) lines.push(`What I tried: ${tried}`);
    return lines.join('\n');
  }

  async function copyFor(who) {
    const text = buildMessage(who);
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = legacyCopy(text);
    }
    showToast(ok ? `Copied for ${who}. Paste in Teams.` : 'Could not copy. Please try again.');
  }

  // Fallback for browsers or pages (plain http) without the async clipboard API.
  function legacyCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }

  // ---------- Small UI helpers ----------

  let toastTimer = 0;
  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  function announce(message) {
    announcer.textContent = '';
    setTimeout(() => { announcer.textContent = message; }, 50);
  }

  function autosize(el) {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
  }

  function autosizeAll() {
    Object.values(fields).forEach(autosize);
  }

  // ---------- Wire up ----------

  buildScale();

  for (const [key, el] of Object.entries(fields)) {
    el.value = typeof state[key] === 'string' ? state[key] : '';
    el.addEventListener('input', () => {
      state[key] = el.value;
      save();
      autosize(el);
    });
  }
  fields.goal.addEventListener('input', () => $('field-goal').classList.remove('nudge'));

  document.querySelectorAll('.duration').forEach((button) => {
    button.addEventListener('click', () => start(Number(button.dataset.minutes)));
  });
  document.querySelectorAll('.ask-button').forEach((button) => {
    button.addEventListener('click', () => copyFor(button.dataset.who));
  });
  $('end-early').addEventListener('click', endEarly);
  $('restart').addEventListener('click', restart);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    checkDone();
    if (state.phase === 'focusing') keepAwake();
    kick();
  });
  window.addEventListener('resize', autosizeAll);
  document.fonts?.ready.then(autosizeAll);

  // Pick up where a refresh left off.
  if (state.phase === 'focusing') {
    if (Date.now() >= state.endAt) {
      finish(true);
    } else {
      updateClock();
      setPhase('focusing');
      scheduleTimers();
      keepAwake();
      // Audio can only be unlocked by a gesture, so grab the first one.
      document.addEventListener('pointerdown', unlockAudio, { once: true });
      document.addEventListener('keydown', unlockAudio, { once: true });
    }
  } else if (state.phase === 'ringing' || state.phase === 'review') {
    enterReview();
  } else {
    setPhase('setup');
  }
})();
