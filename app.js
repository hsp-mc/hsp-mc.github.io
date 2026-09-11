/**
 * Spacesuit Thermal Shielding Kit application
 * Interactive model, measurement log and assessment logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================================================
  // 1. Core State Definition
  // ==========================================================================
  const state = {
    selectedModel: 'bare',
    modelConstants: {
      bare: { name: 'Bare capsule (control)', k: 0.150, color: '#0284c7' },
      bubble: { name: 'Bubble-wrap layer', k: 0.040, color: '#10b981' },
      mylar: { name: 'Reflective-film layer', k: 0.121, color: '#ff9f43' },
      mli: { name: 'Multilayer test assembly', k: 0.015, color: '#10b981' },
      custom: { name: 'Custom cooling constant', k: 0.050, color: '#a55eea' }
    },
    predictionCurve: [], // Cached prediction data points [{x: time, y: temp}]
    telemetryPoints: [],  // User logged physical points [{time: number, temp: number}]
    isAuthorized: false,
    
    // Mission Timer State
    timer: {
      duration: 15 * 60, // 15 minutes in seconds
      secondsRemaining: 15 * 60,
      intervalId: null,
      isRunning: false,
      lastTriggeredMinute: 0
    },
    
    // Audio Sound FX State
    audio: {
      isEnabled: true
    }
  };

  // UI Element Caches
  const elements = {
    tabs: document.querySelectorAll('.nav-tab'),
    sections: document.querySelectorAll('.view-section'),
    mobileMenuToggle: document.getElementById('mobile-menu-toggle'),
    mobileMenuCurrent: document.getElementById('mobile-menu-current'),
    hudNav: document.getElementById('hud-nav-tabs'),
    liveWallClock: document.getElementById('live-wall-clock'),
    systemStatusDot: document.getElementById('system-status-dot'),
    systemStatusText: document.getElementById('system-status-text'),
    sysConsole: document.getElementById('sys-terminal-console'),
    
    // Audio Elements
    btnToggleAudio: document.getElementById('btn-toggle-audio'),
    audioIcon: document.getElementById('audio-icon'),
    audioStatusText: document.getElementById('audio-status-text'),
    
    // Simulator Elements
    insulationSelect: document.getElementById('insulation-select'),
    customSandboxTuner: document.getElementById('custom-sandbox-tuner'),
    customKSlider: document.getElementById('custom-k-slider'),
    customKInput: document.getElementById('custom-k-input'),
    customKVal: document.getElementById('custom-k-val'),
    simT0: document.getElementById('sim-t0'),
    simTenv: document.getElementById('sim-tenv'),
    simTime: document.getElementById('sim-time'),
    btnRunSim: document.getElementById('btn-run-simulation'),
    simKVal: document.getElementById('sim-k-val'),
    simT15Title: document.getElementById('sim-t15-title'),
    simT15Val: document.getElementById('sim-t15-val'),
    simBadge: document.getElementById('sim-selected-badge'),
    
    // Telemetry Elements
    timerDisplay: document.getElementById('timer-display'),
    btnTimerToggle: document.getElementById('btn-timer-toggle'),
    btnTimerReset: document.getElementById('btn-timer-reset'),
    logTimeInput: document.getElementById('log-time'),
    logTempInput: document.getElementById('log-temp'),
    btnLogTelemetry: document.getElementById('btn-log-telemetry'),
    measurementCollapseToggle: document.getElementById('measurement-collapse-toggle'),
    measurementEntryContent: document.getElementById('measurement-entry-content'),
    btnAutofill: document.getElementById('btn-autofill'),
    btnClearTelemetry: document.getElementById('btn-clear-telemetry'),
    btnPrintTelemetry: document.getElementById('btn-print-telemetry'),
    telemetryTbody: document.getElementById('telemetry-tbody'),
    emptyTableMsg: document.getElementById('empty-table-message'),
    telemetryModelBadge: document.getElementById('current-telemetry-model-badge'),
    acquiredCountBadge: document.getElementById('acquired-points-count'),
    telemetryCorrelationScore: document.getElementById('telemetry-correlation-score'),
    telemetryCorrelationGrade: document.getElementById('telemetry-correlation-grade'),
    btnSubmitQuiz: document.getElementById('btn-submit-quiz'),
    quizStatusBadge: document.getElementById('quiz-status-badge'),
    
    // Admin Elements
    adminLoginGate: document.getElementById('admin-login-gate'),
    adminAuthorizedDashboard: document.getElementById('admin-authorized-dashboard'),
    adminLoginForm: document.getElementById('admin-login-form'),
    adminPasswordInput: document.getElementById('admin-password'),
    btnAdminLogout: document.getElementById('btn-admin-logout'),
    
    // Notification Toast
    notification: document.getElementById('hud-notification'),
    notifIcon: document.getElementById('notif-icon-box'),
    notifText: document.getElementById('notif-message-text')
  };

  // Globals for Chart.js Instances
  let simulationChartInstance = null;
  let telemetryChartInstance = null;

  function closeMobileMenu() {
    if (!elements.mobileMenuToggle || !elements.hudNav) return;
    elements.mobileMenuToggle.setAttribute('aria-expanded', 'false');
    elements.hudNav.classList.remove('is-open');
  }

  if (elements.mobileMenuToggle && elements.hudNav) {
    elements.mobileMenuToggle.addEventListener('click', () => {
      const willOpen = elements.mobileMenuToggle.getAttribute('aria-expanded') !== 'true';
      elements.mobileMenuToggle.setAttribute('aria-expanded', String(willOpen));
      elements.hudNav.classList.toggle('is-open', willOpen);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeMobileMenu();
        elements.mobileMenuToggle.focus();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) closeMobileMenu();
    });
  }

  // Initialize Lucide Icons
  lucide.createIcons();

  // ==========================================================================
  // Web Audio API Synthesizer (Space Mission UI Sound FX Engine)
  // ==========================================================================
  let audioCtx = null;
  let ambientHumOsc1 = null;
  let ambientHumOsc2 = null;
  let ambientHumGain = null;

  // Returns a READY AudioContext or null. Never triggers side effects (no hum start).
  function getCtx() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      return audioCtx;
    } catch (e) {
      console.warn('AudioContext unavailable:', e);
      return null;
    }
  }

  // Call ONLY inside a user-gesture handler to unlock the context.
  function unlockAndStart() {
    const ctx = getCtx();
    if (!ctx) return;
    const resume = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
    resume.then(() => startAmbientHum()).catch(e => console.warn('AudioContext resume failed:', e));
  }

  function startAmbientHum() {
    if (!state.audio.isEnabled) return;
    if (ambientHumOsc1) return; // already running

    const ctx = getCtx();
    if (!ctx || ctx.state !== 'running') return;

    try {
      ambientHumGain = ctx.createGain();
      ambientHumGain.gain.setValueAtTime(0, ctx.currentTime);
      ambientHumGain.connect(ctx.destination);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(80, ctx.currentTime);
      filter.connect(ambientHumGain);

      // 55 Hz sine + 55.5 Hz triangle = 0.5 Hz binaural beating (deep spacecraft hum)
      ambientHumOsc1 = ctx.createOscillator();
      ambientHumOsc1.type = 'sine';
      ambientHumOsc1.frequency.value = 55.0;
      ambientHumOsc1.connect(filter);
      ambientHumOsc1.start();

      ambientHumOsc2 = ctx.createOscillator();
      ambientHumOsc2.type = 'triangle';
      ambientHumOsc2.frequency.value = 55.5;
      ambientHumOsc2.connect(filter);
      ambientHumOsc2.start();

      // Fade in over 2 s — no click/pop
      ambientHumGain.gain.linearRampToValueAtTime(0.018, ctx.currentTime + 2.0);
    } catch (e) {
      console.warn('Ambient hum start failed:', e);
    }
  }

  function stopAmbientHum() {
    if (!ambientHumGain || !audioCtx) return;
    try {
      ambientHumGain.gain.cancelScheduledValues(audioCtx.currentTime);
      ambientHumGain.gain.setValueAtTime(ambientHumGain.gain.value, audioCtx.currentTime);
      ambientHumGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.4);

      const o1 = ambientHumOsc1, o2 = ambientHumOsc2;
      ambientHumOsc1 = ambientHumOsc2 = ambientHumGain = null;

      setTimeout(() => {
        try { o1 && o1.stop(); } catch(e) {}
        try { o2 && o2.stop(); } catch(e) {}
      }, 450);
    } catch (e) {
      console.warn('Ambient hum stop failed:', e);
    }
  }

  // Low-level tone synthesizer — does NOT call unlockAndStart (no recursion)
  function playTone(freq, type, duration, gainStart) {
    if (!state.audio.isEnabled) return;
    const ctx = getCtx();
    if (!ctx || ctx.state !== 'running') return;
    try {
      const osc = ctx.createOscillator();
      const g   = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(gainStart, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('playTone failed:', e);
    }
  }

  function playClickSound()   { playTone(1200, 'sine',     0.08, 0.05); }
  function playSuccessSound() {
    playTone(523.25, 'triangle', 0.14, 0.08);
    setTimeout(() => playTone(659.25, 'triangle', 0.22, 0.08), 90);
  }
  function playEpochSound() {
    playTone(800, 'sawtooth', 0.15, 0.04);
    setTimeout(() => playTone(800, 'sawtooth', 0.15, 0.04), 180);
  }
  function playWarningSound() {
    playTone(380, 'triangle', 0.25, 0.10);
    setTimeout(() => playTone(280, 'triangle', 0.25, 0.10), 130);
  }
  function playLeaderboardSound() {
    playTone(440, 'triangle', 0.12, 0.07);
    setTimeout(() => playTone(660, 'triangle', 0.18, 0.07), 90);
  }
  function playCountdownSound(isFinalBeat = false) {
    playTone(isFinalBeat ? 980 : 720, 'sine', isFinalBeat ? 0.18 : 0.08, 0.06);
  }
  function playQuestionTransitionSound() {
    playTone(560, 'sine', 0.08, 0.05);
    setTimeout(() => playTone(760, 'sine', 0.12, 0.05), 70);
  }

  // Sync button visuals to the current state.audio.isEnabled value
  function syncAudioButton() {
    const on = state.audio.isEnabled;
    elements.btnToggleAudio.style.borderColor = on ? 'rgba(0, 242, 254, 0.3)' : 'rgba(255, 255, 255, 0.1)';
    elements.btnToggleAudio.style.color       = on ? 'var(--cyan)'            : 'var(--text-dimmed)';
    elements.btnToggleAudio.style.background  = on ? 'rgba(0, 242, 254, 0.05)': 'transparent';
    elements.audioIcon.innerHTML = on
      ? `<i data-lucide="volume-2" style="width:12px;height:12px;"></i>`
      : `<i data-lucide="volume-x" style="width:12px;height:12px;"></i>`;
    elements.audioStatusText.textContent = on ? 'AUDIO: ACTIVE' : 'AUDIO: MUTED';
    lucide.createIcons();
  }

  // Audio toggle is one of the user gestures that can unlock the sound engine.
  if (elements.btnToggleAudio) {
    elements.btnToggleAudio.addEventListener('click', () => {
      state.audio.isEnabled = !state.audio.isEnabled;
      syncAudioButton();

      if (state.audio.isEnabled) {
        unlockAndStart();                                   // create ctx + resume inside user gesture
        setTimeout(() => playTone(1500, 'sine', 0.12, 0.07), 50); // startup chime after ctx ready
        logToConsole('SYS: Mission cockpit audio telemetry channel enabled.', 'success');
      } else {
        stopAmbientHum();
        logToConsole('SYS: Mission cockpit audio telemetry channel muted.');
      }
    });
  }

  // Custom K Sandbox Slider & Direct Numerical Input Listeners
  const syncCustomK = (rawVal, source) => {
    let kVal = parseFloat(rawVal);
    if (isNaN(kVal) || kVal <= 0) return;

    state.modelConstants.custom.k = kVal;

    if (source !== 'slider' && elements.customKSlider) {
      elements.customKSlider.value = Math.max(0.005, Math.min(0.200, kVal));
    }

    if (source !== 'input' && elements.customKInput) {
      elements.customKInput.value = kVal.toFixed(3);
    }

    if (elements.customKVal) {
      elements.customKVal.textContent = `k = ${kVal.toFixed(3)}`;
    }

    updatePredictionStats();
    if (elements.insulationSelect && elements.insulationSelect.value === 'custom') {
      elements.simKVal.textContent = kVal.toFixed(3);
    }
  };

  if (elements.customKSlider) {
    elements.customKSlider.addEventListener('input', (e) => {
      syncCustomK(e.target.value, 'slider');
    });
  }

  if (elements.customKInput) {
    elements.customKInput.addEventListener('input', (e) => {
      syncCustomK(e.target.value, 'input');
    });

    elements.customKInput.addEventListener('change', (e) => {
      let val = parseFloat(e.target.value);
      if (isNaN(val) || val <= 0) {
        val = state.modelConstants.custom.k || 0.050;
      }
      syncCustomK(val, 'change');
      if (elements.customKInput) {
        elements.customKInput.value = val.toFixed(3);
      }
    });
  }

  // ==========================================================================
  // 2. Global Utilities & Notifications
  // ==========================================================================
  
  // Custom futuristic clock updater
  function updateWallClock() {
    const now = new Date();
    const hrs = String(now.getUTCHours()).padStart(2, '0');
    const mins = String(now.getUTCMinutes()).padStart(2, '0');
    const secs = String(now.getUTCSeconds()).padStart(2, '0');
    elements.liveWallClock.textContent = `${hrs}:${mins}:${secs} UTC`;
  }
  setInterval(updateWallClock, 1000);
  updateWallClock();

  // Log events in terminal console style
  function logToConsole(message, type = 'sys') {
    if (!elements.sysConsole) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = 'terminal-line';
    
    const tsSpan = document.createElement('span');
    tsSpan.className = 'timestamp';
    tsSpan.textContent = `[${timestamp}]`;
    
    const msgSpan = document.createElement('span');
    if (type === 'sys') msgSpan.className = 'sys';
    else if (type === 'warn') msgSpan.className = 'warn';
    else if (type === 'success') msgSpan.className = 'glow-green';
    msgSpan.textContent = ` ${message}`;
    
    line.appendChild(tsSpan);
    line.appendChild(msgSpan);
    elements.sysConsole.appendChild(line);
    
    // Auto scroll to bottom
    elements.sysConsole.scrollTop = elements.sysConsole.scrollHeight;
  }

  // Display customized aerospace notification banner
  function showNotification(message, type = 'success') {
    if (!elements.notification) return;
    elements.notification.className = `hud-notification ${type}`;
    if (elements.notifText) elements.notifText.textContent = message.toUpperCase();
    
    // Configure matching icon
    if (elements.notifIcon) {
      if (type === 'success') {
        elements.notifIcon.innerHTML = `<i data-lucide="check-circle" style="color: var(--green);"></i>`;
      } else if (type === 'error') {
        elements.notifIcon.innerHTML = `<i data-lucide="alert-triangle" style="color: var(--red);"></i>`;
      } else {
        elements.notifIcon.innerHTML = `<i data-lucide="info" style="color: var(--cyan);"></i>`;
      }
    }
    lucide.createIcons();
    
    // Toggle active animations
    elements.notification.classList.add('show');
    setTimeout(() => {
      if (elements.notification) elements.notification.classList.remove('show');
    }, 3500);
  }

  // ==========================================================================
  // 3. Tab Routing / Views Manipulation
  // ==========================================================================
  function switchTab(target) {
    if (!target) return;
    
    // Update Tab state
    elements.tabs.forEach(t => {
      if (t.getAttribute('data-target') === target) {
        t.classList.add('active');
        if (elements.mobileMenuCurrent) {
          elements.mobileMenuCurrent.textContent = t.textContent.trim();
        }
      } else {
        t.classList.remove('active');
      }
    });

    closeMobileMenu();
    
    // Toggle views visibility
    elements.sections.forEach(sec => {
      if (sec.id === target) {
        sec.classList.add('active');
      } else {
        sec.classList.remove('active');
      }
    });
    
    logToConsole(`SYS: Navigating to terminal panel: [${target.toUpperCase()}]`);
    
    // Refresh Chart sizing if loaded in background
    if (target === 'simulator' && simulationChartInstance) {
      simulationChartInstance.resize();
    }
    if (target === 'telemetry' && telemetryChartInstance) {
      telemetryChartInstance.resize();
    }
    
    // Reset icons
    lucide.createIcons();
    
    // Refresh math rendering
    refreshMath();

    // Smooth scroll to top of view
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      playClickSound();
      const target = tab.getAttribute('data-target');
      switchTab(target);
    });
  });

  // Keep the manual-entry tools available without permanently occupying the
  // mobile screen when the user is primarily reviewing the chart and table.
  if (elements.measurementCollapseToggle && elements.measurementEntryContent) {
    const mobileMeasurementPanel = window.matchMedia('(max-width: 768px)');

    const syncMeasurementCollapseAvailability = () => {
      const isMobile = mobileMeasurementPanel.matches;
      elements.measurementCollapseToggle.setAttribute('aria-disabled', String(!isMobile));
      elements.measurementCollapseToggle.tabIndex = isMobile ? 0 : -1;

      if (!isMobile) {
        elements.measurementCollapseToggle.setAttribute('aria-expanded', 'true');
        elements.measurementEntryContent.hidden = false;
      }
    };

    elements.measurementCollapseToggle.addEventListener('click', () => {
      if (!mobileMeasurementPanel.matches) return;
      const isExpanded = elements.measurementCollapseToggle.getAttribute('aria-expanded') === 'true';
      elements.measurementCollapseToggle.setAttribute('aria-expanded', String(!isExpanded));
      elements.measurementEntryContent.hidden = isExpanded;
      playClickSound();
      lucide.createIcons();
    });

    mobileMeasurementPanel.addEventListener('change', syncMeasurementCollapseAvailability);
    syncMeasurementCollapseAvailability();
  }

  // Support direct links to a specific application section.
  const initialTarget = window.location.hash.replace('#', '');
  if (initialTarget && Array.from(elements.sections).some(section => section.id === initialTarget)) {
    switchTab(initialTarget);
  }

  window.addEventListener('hashchange', () => {
    const target = window.location.hash.replace('#', '');
    if (Array.from(elements.sections).some(section => section.id === target)) {
      switchTab(target);
    }
  });

  // Attach workflow pipeline buttons
  document.querySelectorAll('.workflow-nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      playClickSound();
      const target = btn.getAttribute('data-target');
      switchTab(target);
    });
  });

  // ==========================================================================
  // 4. Thermodynamic Mathematical Prediction Engine (Module 3)
  // ==========================================================================
  
  // Newton's Law of Cooling formula resolver: T(t) = T_env + (T_0 - T_env) * e^(-k*t)
  function calculateNewtonTemperature(time, k) {
    const t0Input = elements.simT0 ? parseFloat(elements.simT0.value) : 80.0;
    const tenvInput = elements.simTenv ? parseFloat(elements.simTenv.value) : 0.0;
    const t0 = isNaN(t0Input) ? 80.0 : t0Input;
    const tenv = isNaN(tenvInput) ? 0.0 : tenvInput;
    return tenv + (t0 - tenv) * Math.exp(-k * time);
  }

  // Handle start and environmental temp inputs to update predicted temperature dynamically
  const updatePredictionStats = () => {
    const selected = elements.insulationSelect ? elements.insulationSelect.value : state.selectedModel;
    const material = state.modelConstants[selected] || state.modelConstants.bare;
    
    const durationInput = elements.simTime ? parseInt(elements.simTime.value) : 15;
    const duration = isNaN(durationInput) || durationInput <= 0 ? 15 : durationInput;
    
    if (elements.simT15Title) {
      elements.simT15Title.textContent = `PREDICTED T(${duration})`;
    }
    
    const predictedFinal = calculateNewtonTemperature(duration, material.k);
    if (elements.simT15Val) {
      elements.simT15Val.textContent = `${predictedFinal.toFixed(1)}°C`;
    }
  };

  if (elements.simT0) elements.simT0.addEventListener('input', updatePredictionStats);
  if (elements.simTenv) elements.simTenv.addEventListener('input', updatePredictionStats);
  
  if (elements.simTime) {
    elements.simTime.addEventListener('input', () => {
      updatePredictionStats();
      resetTimer();
    });
  }

  // Handle material parameters selection to update UI readouts immediately
  if (elements.insulationSelect) {
    elements.insulationSelect.addEventListener('change', (e) => {
      playClickSound();
      const selected = e.target.value;
      
      // Toggle Sandbox card visibility
      if (selected === 'custom') {
        if (elements.customSandboxTuner) {
          elements.customSandboxTuner.style.display = 'block';
        }
      } else {
        if (elements.customSandboxTuner) {
          elements.customSandboxTuner.style.display = 'none';
        }
      }
      
      updatePredictionStats();
      const material = state.modelConstants[selected];
      if (elements.simKVal && material) {
        elements.simKVal.textContent = material.k.toFixed(3);
      }
    });
  }

  // Action: Compile Mathematical Curve
  if (elements.btnRunSim) {
    elements.btnRunSim.addEventListener('click', () => {
      const selected = elements.insulationSelect ? elements.insulationSelect.value : state.selectedModel;
      state.selectedModel = selected;
      const material = state.modelConstants[selected] || state.modelConstants.bare;
    
    const durationInput = elements.simTime ? parseInt(elements.simTime.value) : 15;
    const duration = isNaN(durationInput) || durationInput <= 0 ? 15 : durationInput;
    
    // Clear and build predicted dataset over custom duration (t=0 to duration, step=1)
    state.predictionCurve = [];
    for (let t = 0; t <= duration; t++) {
      const temp = calculateNewtonTemperature(t, material.k);
      state.predictionCurve.push({ x: t, y: parseFloat(temp.toFixed(2)) });
    }

    // Establish the configured start temperature as the first measurement.
    // Re-running the model updates the t=0 entry instead of creating a duplicate.
    const initialTemp = calculateNewtonTemperature(0, material.k);
    const initialPointIndex = state.telemetryPoints.findIndex(point => Math.abs(point.time) < 0.01);
    const initialPoint = { time: 0, temp: parseFloat(initialTemp.toFixed(2)) };
    if (initialPointIndex === -1) {
      state.telemetryPoints.push(initialPoint);
    } else {
      state.telemetryPoints[initialPointIndex] = initialPoint;
    }
    
    // Update active badges
    elements.simBadge.textContent = `PREDICTION DEPLOYED: ${material.name.toUpperCase()}`;
    elements.telemetryModelBadge.textContent = material.name.toUpperCase();
    elements.telemetryModelBadge.style.color = material.color;
    
    // Draw the simulation chart
    renderSimulationChart(material.name, material.color);
    
    // Sync telemetry graph prediction background
    if (telemetryChartInstance) {
      updateTelemetryChart();
    }
    updateTelemetryTable();
    
    // Update system notifications
    elements.systemStatusDot.className = 'ticker-status-dot simulating';
    elements.systemStatusText.textContent = 'MODEL RUNNING';
    
    logToConsole(`SYS: Prediction generated for ${material.name} (k=${material.k.toFixed(3)}). Predicted T(15)=${calculateNewtonTemperature(15, material.k).toFixed(2)}°C.`, 'success');
    showNotification(`Simulation Curve Active: k=${material.k.toFixed(3)}`, 'success');
    playSuccessSound();
    
    // Save state
    saveToLocalStorage();
  });
}

  // Chart.js Prediction Render
  function renderSimulationChart(label, color) {
    const canvas = document.getElementById('simulationChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (simulationChartInstance) {
      simulationChartInstance.destroy();
    }

    const dataPoints = state.predictionCurve;
    
    simulationChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: `${label} (Prediction Model)`,
          data: dataPoints,
          borderColor: color,
          backgroundColor: `${color}15`,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: color,
          tension: 0.25,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'linear',
            min: 0,
            max: state.predictionCurve.length > 0 ? state.predictionCurve[state.predictionCurve.length - 1].x : 15,
            title: {
              display: true,
              text: 'TIME (MINUTES)',
              color: '#334155',
              font: { family: 'Inter', size: 12, weight: '700' }
            },
            grid: { color: 'rgba(15, 23, 42, 0.10)' },
            ticks: { color: '#334155', font: { family: 'Roboto Mono', size: 11, weight: '600' } }
          },
          y: {
            min: 0,
            max: 90,
            title: {
              display: true,
              text: 'TEMPERATURE (°C)',
              color: '#334155',
              font: { family: 'Inter', size: 12, weight: '700' }
            },
            grid: { color: 'rgba(15, 23, 42, 0.10)' },
            ticks: { color: '#334155', font: { family: 'Roboto Mono', size: 11, weight: '600' } }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#0f172a',
              font: { family: 'Inter', size: 12, weight: '700' },
              padding: 14
            }
          },
          tooltip: {
            backgroundColor: '#101830',
            borderColor: 'rgba(0, 242, 254, 0.3)',
            borderWidth: 1,
            titleFont: { family: 'Inter', weight: 'bold' },
            bodyFont: { family: 'Roboto Mono' },
            callbacks: {
              label: function(context) {
                return ` Predicted: ${context.parsed.y}°C at ${context.parsed.x} min`;
              }
            }
          }
        }
      }
    });
  }

  // ==========================================================================
  // 5. Experimental measurement log (Module 4)
  // ==========================================================================

  // CountDown Timer Clock Implementation
  function toggleTimer() {
    if (state.timer.isRunning) {
      // Pause
      clearInterval(state.timer.intervalId);
      state.timer.isRunning = false;
      if (elements.btnTimerToggle) {
        elements.btnTimerToggle.innerHTML = `<i data-lucide="play"></i> START`;
        elements.btnTimerToggle.className = "btn-hud btn-orange";
      }
      logToConsole("WARN: Countdown clock suspended.");
      showNotification("Timer Suspended", "error");
    } else {
      // Start
      const durationInput = elements.simTime ? parseInt(elements.simTime.value) : 15;
      const duration = isNaN(durationInput) || durationInput <= 0 ? 15 : durationInput;
      
      if (state.timer.secondsRemaining <= 0) {
        state.timer.duration = duration * 60;
        state.timer.secondsRemaining = state.timer.duration;
        state.timer.lastTriggeredMinute = 0;
      }

      state.timer.isRunning = true;
      if (elements.btnTimerToggle) {
        elements.btnTimerToggle.innerHTML = `<i data-lucide="pause"></i> PAUSE`;
        elements.btnTimerToggle.className = "btn-hud btn-orange btn-outline";
      }
      logToConsole("SYS: Re-entry thermal clock sequence initiated.");
      showNotification("Timer Initiated", "success");
      
      state.timer.intervalId = setInterval(() => {
        state.timer.secondsRemaining--;
        updateTimerDisplay();
        
        // Reliable Minute Epoch Auto-Popup Check
        const elapsedSeconds = state.timer.duration - state.timer.secondsRemaining;
        const currentMinute = Math.floor(elapsedSeconds / 60);

        if (currentMinute > 0 && currentMinute > (state.timer.lastTriggeredMinute || 0) && state.timer.secondsRemaining >= 0) {
          state.timer.lastTriggeredMinute = currentMinute;
          logToConsole(`TIMER [${String(currentMinute).padStart(2, '0')}:00]: Record the thermometer reading.`, 'warn');
          showNotification(`Minute ${currentMinute}: Record Temperature`, 'info');
          playEpochSound();
          openEpochModal(currentMinute);
        }
        
        if (state.timer.secondsRemaining <= 0) {
          clearInterval(state.timer.intervalId);
          state.timer.isRunning = false;
          if (elements.btnTimerToggle) {
            elements.btnTimerToggle.innerHTML = `<i data-lucide="play"></i> START`;
            elements.btnTimerToggle.className = "btn-hud btn-orange";
          }
          logToConsole(`WARN: mission capsule time frame exhausted! ${duration} minute limit reached.`, "warn");
          showNotification("Mission Complete!", "error");
          playWarningSound();
        }
      }, 1000);
    }
    lucide.createIcons();
  }

  function resetTimer() {
    clearInterval(state.timer.intervalId);
    state.timer.isRunning = false;
    state.timer.lastTriggeredMinute = 0;
    
    const durationInput = elements.simTime ? parseInt(elements.simTime.value) : 15;
    const duration = isNaN(durationInput) || durationInput <= 0 ? 15 : durationInput;
    
    state.timer.duration = duration * 60;
    state.timer.secondsRemaining = state.timer.duration;
    
    updateTimerDisplay();
    if (elements.btnTimerToggle) {
      elements.btnTimerToggle.innerHTML = `<i data-lucide="play"></i> START`;
      elements.btnTimerToggle.className = "btn-hud btn-orange";
    }
    logToConsole(`SYS: Mission clock reset to ${duration}:00.`);
    lucide.createIcons();
  }

  function updateTimerDisplay() {
    if (!elements.timerDisplay) return;
    const mins = Math.floor(state.timer.secondsRemaining / 60);
    const secs = state.timer.secondsRemaining % 60;
    elements.timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    
    // Auto-calculate and sync elapsed time into log input if not being actively edited
    if (elements.logTimeInput && document.activeElement !== elements.logTimeInput) {
      const elapsedSeconds = state.timer.duration ? (state.timer.duration - state.timer.secondsRemaining) : 0;
      const elapsedMins = (elapsedSeconds / 60).toFixed(1);
      elements.logTimeInput.value = elapsedMins;
    }
  }

  if (elements.btnTimerToggle) {
    elements.btnTimerToggle.addEventListener('click', () => {
      playClickSound();
      toggleTimer();
    });
  }
  if (elements.btnTimerReset) {
    elements.btnTimerReset.addEventListener('click', () => {
      playClickSound();
      resetTimer();
    });
  }

  // Dynamic overlay Chart rendering
  function initTelemetryChart() {
    const canvas = document.getElementById('telemetryChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    telemetryChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Newton Prediction Model (Dashed)',
            data: state.predictionCurve,
            borderColor: '#0284c7',
            borderDash: [6, 6],
            borderWidth: 2.5,
            pointRadius: 0, // Hide points for clear aesthetic
            tension: 0.25,
            fill: false
          },
          {
            label: 'Physical Telemetry (Actual)',
            data: [], // populated dynamically
            borderColor: '#ea580c',
            backgroundColor: 'rgba(234, 88, 12, 0.12)',
            borderWidth: 3,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: '#ea580c',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            tension: 0.1,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'linear',
            min: 0,
            max: state.predictionCurve.length > 0 ? state.predictionCurve[state.predictionCurve.length - 1].x : 15,
            title: {
              display: true,
              text: 'TIME (MINUTES)',
              color: '#334155',
              font: { family: 'Inter', size: 11, weight: '700' }
            },
            grid: { color: 'rgba(0, 0, 0, 0.07)' },
            ticks: { color: '#475569', font: { family: 'Roboto Mono', weight: '600' } }
          },
          y: {
            min: 0,
            max: 90,
            title: {
              display: true,
              text: 'TEMPERATURE (°C)',
              color: '#334155',
              font: { family: 'Inter', size: 11, weight: '700' }
            },
            grid: { color: 'rgba(0, 0, 0, 0.07)' },
            ticks: { color: '#475569', font: { family: 'Roboto Mono', weight: '600' } }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#0f172a',
              font: { family: 'Inter', size: 12, weight: '700' },
              padding: 16,
              usePointStyle: false,
              boxWidth: 28,
              boxHeight: 12
            }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            borderColor: '#cbd5e1',
            borderWidth: 1,
            titleFont: { family: 'Inter', weight: 'bold' },
            bodyFont: { family: 'Roboto Mono' }
          }
        }
      }
    });
  }

  function updateTelemetryChart() {
    if (!telemetryChartInstance) return;
    
    const durationInput = elements.simTime ? parseInt(elements.simTime.value) : 15;
    const duration = isNaN(durationInput) || durationInput <= 0 ? 15 : durationInput;
    
    // Dynamically adjust scale limit
    telemetryChartInstance.options.scales.x.max = duration;
    
    // Dynamically update max attribute of the log time input for UX guidance
    if (elements.logTimeInput) {
      elements.logTimeInput.max = duration;
    }
    
    // Format logged values appropriately sorted by time ascending
    const sortedPhysical = [...state.telemetryPoints].sort((a, b) => a.time - b.time).map(pt => ({
      x: pt.time,
      y: pt.temp
    }));
    
    // Update datasets
    telemetryChartInstance.data.datasets[0].data = state.predictionCurve;
    
    // Assign prediction label dynamically based on active constant model
    const material = state.modelConstants[state.selectedModel];
    telemetryChartInstance.data.datasets[0].label = `${material.name} (Predicted)`;
    telemetryChartInstance.data.datasets[0].borderColor = material.color;
    
    telemetryChartInstance.data.datasets[1].data = sortedPhysical;
    
    telemetryChartInstance.update();
    
    // Sync statistics
    elements.acquiredCountBadge.textContent = `${state.telemetryPoints.length} / ${duration + 1}`;
  }

  // Helper to record a temperature measurement
  function addTelemetryPoint(timeVal, tempVal) {
    const durationInput = elements.simTime ? parseInt(elements.simTime.value) : 15;
    const duration = isNaN(durationInput) || durationInput <= 0 ? 15 : durationInput;
    
    // Check validation constraints
    if (isNaN(timeVal) || timeVal < 0 || timeVal > duration) {
      showNotification(`Invalid entry: Time must be between 0 and ${duration} mins`, "error");
      playWarningSound();
      return false;
    }
    if (isNaN(tempVal) || tempVal < 0 || tempVal > 100) {
      showNotification("Invalid entry: Temp must be between 0 and 100°C", "error");
      playWarningSound();
      return false;
    }
    
    // Check duplicate timestamps
    const existsIndex = state.telemetryPoints.findIndex(pt => Math.abs(pt.time - timeVal) < 0.01);
    if (existsIndex !== -1) {
      showNotification(`Timestamp ${timeVal} min updated with new temperature.`, "info");
      state.telemetryPoints.splice(existsIndex, 1);
    }
    
    // Add point to array
    state.telemetryPoints.push({ time: timeVal, temp: tempVal });
    
    // Clean temp input
    if (elements.logTempInput) elements.logTempInput.value = '';
    
    // Sync elements
    updateTelemetryTable();
    updateTelemetryChart();
    saveToLocalStorage();
    
    logToConsole(`LAB: Measurement recorded. Time: ${timeVal.toFixed(1)} min, temperature: ${tempVal.toFixed(1)} °C.`, 'success');
    showNotification(`Logged ${tempVal.toFixed(1)}°C at t=${timeVal.toFixed(1)} min`, "success");
    playSuccessSound();
    return true;
  }

  // Validate and record a manual measurement from the main form
  if (document.getElementById('telemetry-entry-form')) {
    document.getElementById('telemetry-entry-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const timeVal = parseFloat(elements.logTimeInput.value);
      const tempVal = parseFloat(elements.logTempInput.value);
      addTelemetryPoint(timeVal, tempVal);
    });
  }

  // ==========================================================================
  // Centered Screen Telemetry Epoch Modal Controller
  // ==========================================================================
  let activeModalTargetTime = null;

  const epochModalElements = {
    overlay: document.getElementById('epoch-modal-overlay'),
    minBadge: document.getElementById('modal-epoch-min'),
    elapsedDisplay: document.getElementById('modal-elapsed-time-display'),
    tempInput: document.getElementById('modal-log-temp'),
    form: document.getElementById('epoch-modal-form'),
    btnClose: document.getElementById('btn-close-epoch-modal'),
    btnSkip: document.getElementById('btn-modal-skip')
  };

  function openEpochModal(minsElapsed) {
    if (!epochModalElements.overlay) return;
    
    const elapsedSecs = state.timer.duration ? (state.timer.duration - state.timer.secondsRemaining) : 0;
    const currentMins = minsElapsed !== undefined ? minsElapsed : parseFloat((elapsedSecs / 60).toFixed(1));
    activeModalTargetTime = typeof currentMins === 'number' ? currentMins : parseFloat(currentMins);

    if (epochModalElements.minBadge) {
      epochModalElements.minBadge.textContent = Math.round(activeModalTargetTime);
    }
    if (epochModalElements.elapsedDisplay) {
      epochModalElements.elapsedDisplay.textContent = `${activeModalTargetTime.toFixed(1)} MIN`;
    }
    if (epochModalElements.tempInput) {
      epochModalElements.tempInput.value = '';
    }
    
    epochModalElements.overlay.style.display = 'flex';
    lucide.createIcons();

    if (epochModalElements.tempInput) {
      setTimeout(() => epochModalElements.tempInput.focus(), 60);
    }
  }

  function closeEpochModal() {
    if (epochModalElements.overlay) {
      epochModalElements.overlay.style.display = 'none';
    }
  }

  if (epochModalElements.overlay) {
    epochModalElements.overlay.addEventListener('click', (e) => {
      if (e.target === epochModalElements.overlay) {
        closeEpochModal();
      }
    });
  }

  if (epochModalElements.btnClose) {
    epochModalElements.btnClose.addEventListener('click', closeEpochModal);
  }
  if (epochModalElements.btnSkip) {
    epochModalElements.btnSkip.addEventListener('click', closeEpochModal);
  }
  // Close modal on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && epochModalElements.overlay && epochModalElements.overlay.style.display === 'flex') {
      closeEpochModal();
    }
  });

  if (epochModalElements.form) {
    epochModalElements.form.addEventListener('submit', (e) => {
      e.preventDefault();
      let timeVal = activeModalTargetTime;
      if (timeVal === null || timeVal === undefined || isNaN(timeVal)) {
        const elapsedSecs = state.timer.duration ? (state.timer.duration - state.timer.secondsRemaining) : 0;
        timeVal = parseFloat((elapsedSecs / 60).toFixed(1));
      }
      const tempVal = parseFloat(epochModalElements.tempInput.value);

      const success = addTelemetryPoint(timeVal, tempVal);
      if (success) {
        closeEpochModal();
      }
    });
  }

  // Table synchronization
  function updateTelemetryTable() {
    if (!elements.telemetryTbody) return;

    // Clear dynamic rows
    const rows = elements.telemetryTbody.querySelectorAll('tr:not(#empty-table-message)');
    rows.forEach(r => r.remove());
    
    if (state.telemetryPoints.length === 0) {
      if (elements.emptyTableMsg) elements.emptyTableMsg.style.display = 'table-row';
      if (elements.telemetryCorrelationScore) elements.telemetryCorrelationScore.textContent = 'N/A';
      if (elements.telemetryCorrelationGrade) {
        elements.telemetryCorrelationGrade.textContent = 'NO MEASUREMENTS';
        elements.telemetryCorrelationGrade.className = 'glow-orange';
      }
      return;
    }
    
    if (elements.emptyTableMsg) elements.emptyTableMsg.style.display = 'none';
    
    // Calculate the mean absolute error between observations and the reference model.
    let sumAbsError = 0;
    const activeMaterial = state.modelConstants[state.selectedModel];
    
    state.telemetryPoints.forEach(pt => {
      const predT = calculateNewtonTemperature(pt.time, activeMaterial.k);
      sumAbsError += Math.abs(pt.temp - predT);
    });
    
    const meanAbsoluteError = sumAbsError / state.telemetryPoints.length;
    if (elements.telemetryCorrelationScore) {
      elements.telemetryCorrelationScore.textContent = `${meanAbsoluteError.toFixed(2)} °C`;
    }
    
    // Sort array by time ascending
    const sorted = [...state.telemetryPoints].sort((a, b) => a.time - b.time);
    
    sorted.forEach((pt, index) => {
      const tr = document.createElement('tr');
      
      // Index column
      const tdIndex = document.createElement('td');
      tdIndex.textContent = String(index + 1).padStart(2, '0');
      
      // Timestamp column
      const tdTime = document.createElement('td');
      tdTime.textContent = `${pt.time.toFixed(1)} min`;
      
      // Observed Temp
      const tdObserved = document.createElement('td');
      tdObserved.className = 'glow-orange';
      tdObserved.textContent = `${pt.temp.toFixed(2)}°C`;
      
      // Predicted Temp
      const tdPredicted = document.createElement('td');
      const material = state.modelConstants[state.selectedModel];
      const predTemp = calculateNewtonTemperature(pt.time, material.k);
      tdPredicted.textContent = `${predTemp.toFixed(2)}°C`;
      
      // Variance calculation
      const tdVariance = document.createElement('td');
      const diff = pt.temp - predTemp;
      const sign = diff >= 0 ? '+' : '';
      tdVariance.textContent = `${sign}${diff.toFixed(2)}°C`;
      if (Math.abs(diff) < 2.0) {
        tdVariance.className = 'glow-green';
      } else if (Math.abs(diff) > 5.0) {
        tdVariance.className = 'glow-red';
      } else {
        tdVariance.className = 'glow-orange';
      }
      
      // Delete column button
      const tdAction = document.createElement('td');
      const btnDel = document.createElement('button');
      btnDel.className = 'btn-table-delete';
      btnDel.title = "Delete Point";
      btnDel.innerHTML = `<i data-lucide="trash"></i>`;
      btnDel.onclick = () => deleteDataPoint(pt.time);
      tdAction.appendChild(btnDel);
      
      tr.appendChild(tdIndex);
      tr.appendChild(tdTime);
      tr.appendChild(tdObserved);
      tr.appendChild(tdPredicted);
      tr.appendChild(tdVariance);
      tr.appendChild(tdAction);
      
      elements.telemetryTbody.appendChild(tr);
    });
    
    lucide.createIcons();
  }

  function deleteDataPoint(timeValue) {
    state.telemetryPoints = state.telemetryPoints.filter(pt => Math.abs(pt.time - timeValue) > 0.01);
    updateTelemetryTable();
    updateTelemetryChart();
    saveToLocalStorage();
    logToConsole(`LAB: Measurement deleted at ${timeValue.toFixed(1)} min.`, 'warn');
    showNotification("Measurement Deleted", "info");
  }

  // Clear telemetry completely
  if (elements.btnClearTelemetry) {
    elements.btnClearTelemetry.addEventListener('click', () => {
      playClickSound();
      if (confirm("Are you sure you want to wipe all physical telemetry data? This cannot be undone.")) {
        state.telemetryPoints = [];
        updateTelemetryTable();
        updateTelemetryChart();
        saveToLocalStorage();
        playWarningSound();
      }
    });
  }

  // Print a clean report document instead of printing the Mission Control UI.
  function printTelemetryLogbook() {
    playClickSound();

    const model = state.modelConstants[state.selectedModel] || { name: 'Unselected', k: 0 };
    const initialTemp = elements.simT0 ? parseFloat(elements.simT0.value) : 80;
    const environmentTemp = elements.simTenv ? parseFloat(elements.simTenv.value) : 0;
    const safeInitialTemp = Number.isFinite(initialTemp) ? initialTemp : 80;
    const safeEnvironmentTemp = Number.isFinite(environmentTemp) ? environmentTemp : 0;
    const reportDate = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date());

    const rows = state.telemetryPoints.length > 0
      ? state.telemetryPoints.map((point, index) => {
          const predicted = calculateNewtonTemperature(point.time, model.k);
          const difference = point.temp - predicted;
          const differenceText = `${difference >= 0 ? '+' : ''}${difference.toFixed(2)}`;
          return `<tr>
            <td>${index + 1}</td>
            <td>${point.time.toFixed(1)}</td>
            <td>${point.temp.toFixed(2)}</td>
            <td>${predicted.toFixed(2)}</td>
            <td>${differenceText}</td>
          </tr>`;
        }).join('')
      : '<tr><td colspan="5" class="empty">No telemetry measurements recorded.</td></tr>';

    let chartMarkup = '';
    const chartCanvas = document.getElementById('telemetryChart');
    if (chartCanvas) {
      try {
        const chartImage = chartCanvas.toDataURL('image/png');
        chartMarkup = `<section class="chart"><h2>Model vs Measurement</h2><img src="${chartImage}" alt="Telemetry comparison graph"></section>`;
      } catch (error) {
        console.warn('Telemetry chart could not be added to the printout:', error);
      }
    }

    // Print from the current document so iPad Safari keeps the button tap's user
    // activation. Printing a hidden iframe after a timeout is ignored on iOS.
    const existingReport = document.getElementById('telemetry-print-report');
    if (existingReport) existingReport.remove();

    const printReport = document.createElement('div');
    printReport.id = 'telemetry-print-report';
    printReport.setAttribute('aria-hidden', 'true');
    printReport.innerHTML = `
        <style>
          #telemetry-print-report { display: none; }
          @media print {
            body.telemetry-printing > *:not(#telemetry-print-report) { display: none !important; }
            #telemetry-print-report { display: block !important; }
          }
          @page { size: A4 portrait; margin: 14mm; }
          #telemetry-print-report { color: #0f172a; font-family: Arial, sans-serif; font-size: 10pt; }
          #telemetry-print-report * { box-sizing: border-box; }
          #telemetry-print-report header { border-bottom: 3px solid #0284c7; padding-bottom: 10px; margin-bottom: 14px; }
          #telemetry-print-report h1 { margin: 0 0 4px; color: #0369a1; font-size: 20pt; letter-spacing: .04em; }
          #telemetry-print-report .subtitle { color: #475569; font-size: 9pt; }
          #telemetry-print-report .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 14px; }
          #telemetry-print-report .meta div { border: 1px solid #cbd5e1; border-radius: 5px; padding: 8px 10px; }
          #telemetry-print-report .meta strong { display: block; color: #64748b; font-size: 7.5pt; letter-spacing: .06em; text-transform: uppercase; }
          #telemetry-print-report .meta span { display: block; margin-top: 3px; font-weight: 700; }
          #telemetry-print-report h2 { margin: 0 0 7px; color: #0f172a; font-size: 11pt; text-transform: uppercase; letter-spacing: .04em; }
          #telemetry-print-report .chart { break-inside: avoid; margin-bottom: 14px; }
          #telemetry-print-report .chart img { display: block; width: 100%; max-height: 90mm; object-fit: contain; border: 1px solid #cbd5e1; }
          #telemetry-print-report table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
          #telemetry-print-report thead { display: table-header-group; }
          #telemetry-print-report th { background: #e0f2fe; color: #075985; text-align: left; font-size: 7.5pt; }
          #telemetry-print-report th, #telemetry-print-report td { border: 1px solid #cbd5e1; padding: 6px 7px; }
          #telemetry-print-report tbody tr:nth-child(even) { background: #f8fafc; }
          #telemetry-print-report tr { break-inside: avoid; }
          #telemetry-print-report .empty { padding: 18px; color: #64748b; text-align: center; font-style: italic; }
          #telemetry-print-report footer { margin-top: 10px; color: #64748b; font-size: 7.5pt; text-align: right; }
          @media print { #telemetry-print-report { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
        <header>
          <h1>SPHERE TELEMETRY LOGBOOK</h1>
          <div class="subtitle">Spacesuit Thermal Shielding Kit · Model and Measurement Report</div>
        </header>
        <section class="meta">
          <div><strong>Selected model</strong><span>${model.name}</span></div>
          <div><strong>Cooling constant</strong><span>k = ${model.k.toFixed(3)}</span></div>
          <div><strong>Initial temperature</strong><span>${safeInitialTemp.toFixed(1)} °C</span></div>
          <div><strong>Environment temperature</strong><span>${safeEnvironmentTemp.toFixed(1)} °C</span></div>
          <div><strong>Data points</strong><span>${state.telemetryPoints.length}</span></div>
          <div><strong>Mean absolute error</strong><span>${elements.telemetryCorrelationScore ? elements.telemetryCorrelationScore.textContent : 'N/A'}</span></div>
        </section>
        ${chartMarkup}
        <section>
          <h2>Measurement Table</h2>
          <table>
            <thead><tr><th>#</th><th>Time (min)</th><th>Measured (°C)</th><th>Predicted (°C)</th><th>Difference (ΔT)</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </section>
        <footer>Generated ${reportDate}</footer>`;
    document.body.appendChild(printReport);
    document.body.classList.add('telemetry-printing');

    let cleanedUp = false;
    const removePrintReport = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      document.body.classList.remove('telemetry-printing');
      printReport.remove();
      window.removeEventListener('afterprint', removePrintReport);
    };
    window.addEventListener('afterprint', removePrintReport, { once: true });

    // Keep this synchronous with the click handler. That is required for iPadOS.
    window.print();
    window.setTimeout(removePrintReport, 60000);
  }

  if (elements.btnPrintTelemetry) {
    elements.btnPrintTelemetry.addEventListener('click', printTelemetryLogbook);
  }

  // Mock autofill generator with authentic thermodynamic noise
  if (elements.btnAutofill) {
    elements.btnAutofill.addEventListener('click', () => {
      playClickSound();
      const material = state.modelConstants[state.selectedModel];
      state.telemetryPoints = [];
      
      logToConsole(`SYS: Simulating real-world TVAC drop telemetry for model: ${material.name.toUpperCase()}`);
      
      const durationInput = elements.simTime ? parseInt(elements.simTime.value) : 15;
      const duration = isNaN(durationInput) || durationInput <= 0 ? 15 : durationInput;
      
      for (let t = 0; t <= duration; t += 1.0) {
        if (t === 0) {
          const t0Input = elements.simT0 ? parseFloat(elements.simT0.value) : 80.0;
          const startT = isNaN(t0Input) ? 80.0 : t0Input;
          state.telemetryPoints.push({ time: 0, temp: startT });
          continue;
        }
        
        // Base math predicted curve
        const baseTemp = calculateNewtonTemperature(t, material.k);
        
        // Inject slight experimental noise (convective swings, sensor noise)
        // noise range roughly +/- 0.5 to +/- 1.8 C depending on elapsed time
        const noiseScalar = 0.5 + Math.sin(t) * 0.4;
        const noise = (Math.random() - 0.5) * 2.5 * noiseScalar;
        const finalTemp = Math.max(0, parseFloat((baseTemp + noise).toFixed(2)));
        
        state.telemetryPoints.push({ time: t, temp: finalTemp });
      }
      
      updateTelemetryTable();
      updateTelemetryChart();
      saveToLocalStorage();
      
      logToConsole("LAB: Example measurement data loaded for demonstration.", "success");
      showNotification("Example Measurements Loaded", "success");
      playSuccessSound();
    });
  }

  // ==========================================================================
  // 6. Teacher Laboratory Deliverables (Instructor Guide in Teacher Manual)
  // ==========================================================================

  // Pre-Flight Certification Quiz Evaluation
  function evaluateQuiz() {
    playClickSound();
    const q1 = document.querySelector('input[name="preflight-q1"]:checked')?.value;
    const q2 = document.querySelector('input[name="preflight-q2"]:checked')?.value;
    const q3 = document.querySelector('input[name="preflight-q3"]:checked')?.value;
    
    if (!q1 || !q2 || !q3) {
      showNotification("Error: Answer all quiz questions first!", "error");
      logToConsole("WARN: Certification attempt rejected. Missing answer fields.", "warn");
      playWarningSound();
      return;
    }
    
    const isCorrect1 = q1 === 'radiation';
    const isCorrect2 = q2 === 'convection';
    const isCorrect3 = q3 === 'convection';
    
    if (isCorrect1 && isCorrect2 && isCorrect3) {
      elements.quizStatusBadge.textContent = "STATUS: CONCEPT CHECK PASSED";
      elements.quizStatusBadge.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
      elements.quizStatusBadge.style.borderColor = "var(--green)";
      elements.quizStatusBadge.style.color = "var(--green)";
      elements.quizStatusBadge.classList.add('glow-green');
      
      logToConsole("SYS: Preliminary assessment completed with 3/3 correct answers.", "success");
      showNotification("Preliminary Assessment Passed", "success");
      playSuccessSound();
      
      localStorage.setItem('sphere_quiz_certified', 'true');
    } else {
      elements.quizStatusBadge.textContent = "STATUS: REVIEW REQUIRED";
      elements.quizStatusBadge.style.backgroundColor = "rgba(244, 63, 94, 0.1)";
      elements.quizStatusBadge.style.borderColor = "var(--red)";
      elements.quizStatusBadge.style.color = "var(--red)";
      elements.quizStatusBadge.classList.remove('glow-green');
      
      let incorrectCount = 0;
      if (!isCorrect1) incorrectCount++;
      if (!isCorrect2) incorrectCount++;
      if (!isCorrect3) incorrectCount++;
      
      logToConsole(`ASSESSMENT: ${incorrectCount} answer(s) require review.`, "warn");
      showNotification(`${incorrectCount} Answer(s) Require Review`, "error");
      playWarningSound();
    }
  }
  
  if (elements.btnSubmitQuiz) {
    elements.btnSubmitQuiz.addEventListener('click', evaluateQuiz);
  }

  // Restore pre-flight quiz certification status on load
  function restoreQuizStatus() {
    // A certification result may persist between visits, but the quiz must
    // always open unanswered so students make a fresh attempt themselves.
    document.querySelectorAll('input[name^="preflight-q"]').forEach((input) => {
      input.checked = false;
    });

    const cachedQuiz = localStorage.getItem('sphere_quiz_certified');
    if (cachedQuiz === 'true' && elements.quizStatusBadge) {
      elements.quizStatusBadge.textContent = "STATUS: CONCEPT CHECK PASSED";
      elements.quizStatusBadge.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
      elements.quizStatusBadge.style.borderColor = "var(--green)";
      elements.quizStatusBadge.style.color = "var(--green)";
      elements.quizStatusBadge.classList.add('glow-green');
    }
  }



  // ==========================================================================
  // 7. Local Storage Persistence Caching
  // ==========================================================================
  function saveToLocalStorage() {
    localStorage.setItem('sphere_selected_model', state.selectedModel);
    localStorage.setItem('sphere_prediction_curve', JSON.stringify(state.predictionCurve));
    localStorage.setItem('sphere_telemetry_points', JSON.stringify(state.telemetryPoints));
  }

  function loadFromLocalStorage() {
    const cachedModel = localStorage.getItem('sphere_selected_model');
    const cachedPrediction = localStorage.getItem('sphere_prediction_curve');
    const cachedTelemetry = localStorage.getItem('sphere_telemetry_points');
    
    if (cachedModel) {
      state.selectedModel = cachedModel;
      elements.insulationSelect.value = cachedModel;
      // Trigger select change event to update text readouts
      elements.insulationSelect.dispatchEvent(new Event('change'));
    }
    
    if (cachedPrediction) {
      state.predictionCurve = JSON.parse(cachedPrediction);
      const material = state.modelConstants[state.selectedModel];

      // Recalculate cached points so updated/calibrated model constants are
      // applied after deployment instead of displaying a stale saved curve.
      state.predictionCurve = state.predictionCurve.map((point) => ({
        x: point.x,
        y: parseFloat(calculateNewtonTemperature(point.x, material.k).toFixed(2))
      }));
      
      elements.simBadge.textContent = `PREDICTION DEPLOYED: ${material.name.toUpperCase()}`;
      elements.telemetryModelBadge.textContent = material.name.toUpperCase();
      elements.telemetryModelBadge.style.color = material.color;
      
      renderSimulationChart(material.name, material.color);
    } else {
      // Run control as default
      elements.btnRunSim.click();
    }
    
    if (cachedTelemetry) {
      state.telemetryPoints = JSON.parse(cachedTelemetry);
      updateTelemetryTable();
    }
    
    resetTimer();
    updateTelemetryChart();
    restoreQuizStatus();
  }

  // ==========================================================================
  // 8. Interactive 3D Flashcard Study Hub Engine
  // ==========================================================================
  function initFlashcardsHub() {
    const cards = document.querySelectorAll('.flashcard');
    const filterBtns = document.querySelectorAll('#flashcard-filter-group .btn-filter');
    const flippedBadge = document.getElementById('flipped-count-badge');
    const btnFlipAll = document.getElementById('btn-flip-all');
    const btnResetFlashcards = document.getElementById('btn-reset-flashcards');

    if (!cards.length) return;

    function updateFlippedCount() {
      const flippedCount = document.querySelectorAll('.flashcard.flipped').length;
      if (flippedBadge) {
        flippedBadge.textContent = `FLIPPED: ${flippedCount} / ${cards.length}`;
      }
    }

    // Toggle card flip on click
    cards.forEach(card => {
      card.addEventListener('click', () => {
        card.classList.toggle('flipped');
        updateFlippedCount();
        playClickSound();
      });
    });

    // Category Filtering
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.getAttribute('data-filter');

        cards.forEach(card => {
          if (filter === 'all' || card.getAttribute('data-category') === filter) {
            card.style.display = 'block';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });

    // Flip All
    if (btnFlipAll) {
      btnFlipAll.addEventListener('click', () => {
        cards.forEach(card => card.classList.add('flipped'));
        updateFlippedCount();
        playSuccessSound();
      });
    }

    // Reset Deck
    if (btnResetFlashcards) {
      btnResetFlashcards.addEventListener('click', () => {
        cards.forEach(card => {
          card.classList.remove('flipped');
          card.style.display = 'block';
        });
        filterBtns.forEach(b => b.classList.remove('active'));
        if (filterBtns[0]) filterBtns[0].classList.add('active');
        updateFlippedCount();
        playClickSound();
      });
    }

    // ==========================================================================
    // Interactive K-Value Calculator Logic
    // ==========================================================================
    const calcT0 = document.getElementById('calc-t0');
    const calcTenv = document.getElementById('calc-tenv');
    const calcTt = document.getElementById('calc-tt');
    const calcTime = document.getElementById('calc-time');
    const calcStep1 = document.getElementById('calc-step-1');
    const calcStep2 = document.getElementById('calc-step-2');
    const calcStep3 = document.getElementById('calc-step-3');
    const calcMatchBadge = document.getElementById('calc-match-badge');

    function updateKCalculator() {
      if (!calcT0 || !calcTenv || !calcTt || !calcTime) return;

      const t0 = parseFloat(calcT0.value);
      const tenv = parseFloat(calcTenv.value);
      const tt = parseFloat(calcTt.value);
      const time = parseFloat(calcTime.value);

      const num = tt - tenv;
      const den = t0 - tenv;
      const ratio = num / den;

      if (![t0, tenv, tt, time].every(Number.isFinite) || den <= 0 || num <= 0 || ratio > 1 || time <= 0) {
        if (calcStep1) calcStep1.innerHTML = '1. Invalid cooling data: require $T_{\\text{env}} < T(t) \\le T_0$ and $t > 0$';
        if (calcStep2) calcStep2.innerHTML = '2. Natural Log = N/A';
        if (calcStep3) calcStep3.innerHTML = '3. DERIVED k-VALUE = N/A';
        if (calcMatchBadge) calcMatchBadge.textContent = 'REFERENCE COMPARISON UNAVAILABLE';
        const calcOutputBox = document.getElementById('calc-output-box');
        if (calcOutputBox) refreshMath(calcOutputBox);
        return;
      }

      const lnRatio = Math.log(ratio);
      const kVal = -lnRatio / time;

      if (calcStep1) calcStep1.innerHTML = `$$\\text{Temp Ratio} = \\frac{${tt.toFixed(1)} - ${tenv.toFixed(1)}}{${t0.toFixed(1)} - ${tenv.toFixed(1)}} = ${ratio.toFixed(4)}$$`;
      if (calcStep2) calcStep2.innerHTML = `$$\\ln(${ratio.toFixed(4)}) = ${lnRatio.toFixed(4)}$$`;
      if (calcStep3) calcStep3.innerHTML = `$$k = -\\frac{${lnRatio.toFixed(4)}}{${time}} = ${kVal.toFixed(3)}\\text{ min}^{-1}$$`;

      // Match insulation grade
      let material = "CUSTOM INSULATION SHIELD";
      let badgeBg = "#e0f2fe";
      let badgeColor = "#0369a1";

      if (kVal <= 0.0275) {
        material = "MULTILAYER TEST ASSEMBLY ($k \\approx 0.015\\text{ min}^{-1}$)";
        badgeBg = "#dcfce7";
        badgeColor = "#15803d";
      } else if (kVal <= 0.0915) {
        material = "BUBBLE-WRAP TEST ASSEMBLY ($k \\approx 0.040\\text{ min}^{-1}$)";
        badgeBg = "#dcfce7";
        badgeColor = "#15803d";
      } else if (kVal <= 0.1465) {
        material = "REFLECTIVE-FILM TEST ASSEMBLY ($k \\approx 0.121\\text{ min}^{-1}$)";
        badgeBg = "#fef3c7";
        badgeColor = "#b45309";
      } else {
        material = "BARE CAPSULE CONTROL ($k \\approx 0.150\\text{ min}^{-1}$)";
        badgeBg = "#fee2e2";
        badgeColor = "#b91c1c";
      }

      if (calcMatchBadge) {
        calcMatchBadge.innerHTML = `CLOSEST ASSUMED REFERENCE: ${material}`;
        calcMatchBadge.style.background = badgeBg;
        calcMatchBadge.style.color = badgeColor;
      }

      const calcOutputBox = document.getElementById('calc-output-box');
      if (calcOutputBox) refreshMath(calcOutputBox);
    }

    [calcT0, calcTenv, calcTt, calcTime].forEach(input => {
      if (input) input.addEventListener('input', updateKCalculator);
    });
    updateKCalculator();

    // Problem Hint & Solution Toggles
    document.querySelectorAll('.btn-hint-toggle, .btn-solution-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          const isHidden = targetEl.style.display === 'none' || targetEl.style.display === '';
          targetEl.style.display = isHidden ? 'block' : 'none';
          playClickSound();
        }
      });
    });
  }

  // ==========================================================================
  // 9. Interactive Student Question Sheet Evaluation Engine
  // ==========================================================================
  function initQuizEngine() {
    const btnGradeQuiz = document.getElementById('btn-grade-quiz');
    const btnResetQuiz = document.getElementById('btn-reset-quiz');
    const btnStartQuiz = document.getElementById('btn-start-quiz');
    const labDateInput = document.getElementById('quiz-date');
    const quizLobby = document.getElementById('quiz-lobby');
    const quizPlayHud = document.getElementById('quiz-play-hud');
    const quizGameBoard = document.getElementById('student-quiz-form');
    const quizGameActions = document.getElementById('quiz-game-actions');
    const quizCards = Array.from(document.querySelectorAll('#student-quiz-form .quiz-card'));
    const quizProgressLabel = document.getElementById('quiz-progress-label');
    const quizProgressFill = document.getElementById('quiz-progress-fill');
    const quizLivePoints = document.getElementById('quiz-live-points');
    const quizTimer = document.getElementById('quiz-timer');
    const scoreBanner = document.getElementById('quiz-score-banner');
    const finalPodium = document.getElementById('quiz-final-podium');
    const finalLeaderboardRows = document.getElementById('quiz-final-leaderboard-rows');
    const finalLeaderboardEmpty = document.getElementById('quiz-final-leaderboard-empty');
    const quizAnswerReview = document.getElementById('quiz-answer-review');
    const btnFinalRestart = document.getElementById('btn-final-restart');
    const btnOpenLeaderboard = document.getElementById('btn-open-leaderboard');
    const leaderboardOverlay = document.getElementById('leaderboard-modal-overlay');
    const btnCloseLeaderboard = document.getElementById('btn-close-leaderboard');
    const btnLeaderboardContinue = document.getElementById('btn-leaderboard-continue');
    const leaderboardTitle = document.getElementById('leaderboard-modal-title');
    const leaderboardRows = document.getElementById('leaderboard-rows');
    const leaderboardEmpty = document.getElementById('leaderboard-empty');
    const leaderboardStatus = document.getElementById('leaderboard-status');
    const leaderboardStorageKey = 'sphereQuizLeaderboard';
    const leaderboardConfig = window.SPHERE_LEADERBOARD_CONFIG || {};
    const supabaseUrl = String(leaderboardConfig.supabaseUrl || '').replace(/\/$/, '');
    const supabasePublicKey = String(
      leaderboardConfig.supabasePublishableKey || leaderboardConfig.supabaseAnonKey || ''
    );
    const sharedLeaderboardEnabled = Boolean(
      supabaseUrl &&
      supabasePublicKey &&
      !supabaseUrl.includes('YOUR_') &&
      !supabasePublicKey.includes('YOUR_')
    );

    // Pre-fill the laboratory date using the visitor's local calendar date.
    if (labDateInput && !labDateInput.value) {
      const now = new Date();
      const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
      labDateInput.value = localDate.toISOString().slice(0, 10);
    }

    function supabaseHeaders(extraHeaders = {}) {
      const headers = { apikey: supabasePublicKey, ...extraHeaders };
      // Legacy JWT anon keys use a Bearer header; current publishable keys do not.
      if (supabasePublicKey.startsWith('eyJ')) {
        headers.Authorization = `Bearer ${supabasePublicKey}`;
      }
      return headers;
    }

    if (!btnGradeQuiz) return;

    const answerKey = {
      q1: 'B',
      q2: 'B',
      q3: 'A',
      q4: 'A',
      q5: 'B',
      q6: 'A',
      q7: 'A',
      q8: 'A',
      q9: 'B',
      q10: 'A'
    };

    function getLeaderboard() {
      try {
        const saved = JSON.parse(localStorage.getItem(leaderboardStorageKey) || '[]');
        if (!Array.isArray(saved)) return [];
        return saved.map(entry => {
          const groupName = entry.groupName || entry.student || 'Unnamed Team';
          const labDate = entry.labDate || entry.lab_date || '';
          return {
            ...entry,
            identity: `${groupName.toLowerCase()}|${labDate}`,
            groupName,
            labDate
          };
        });
      } catch (error) {
        return [];
      }
    }

    function getRankedEntries(entries) {
      return [...entries]
        .sort((a, b) => (b.points || 0) - (a.points || 0) || b.percentage - a.percentage || b.savedAt - a.savedAt)
        .slice(0, 20);
    }

    function renderPodium(rankedEntries, targetPodium) {
      if (!targetPodium) return;
      targetPodium.replaceChildren();
      const podiumOrder = [rankedEntries[1], rankedEntries[0], rankedEntries[2]];
      podiumOrder.forEach((entry, podiumIndex) => {
        if (!entry) return;
        const rank = podiumIndex === 0 ? 2 : podiumIndex === 1 ? 1 : 3;
        const card = document.createElement('div');
        card.className = `leaderboard-podium-card rank-${rank}`;

        const stars = document.createElement('div');
        stars.className = 'leaderboard-podium-stars';
        stars.setAttribute('aria-hidden', 'true');
        stars.textContent = rank === 1 ? '★ ★ ★' : rank === 2 ? '★ ★' : '★';

        const medal = document.createElement('div');
        medal.className = 'leaderboard-podium-medal';
        medal.textContent = String(rank);

        const name = document.createElement('strong');
        name.textContent = entry.groupName;

        const score = document.createElement('span');
        score.textContent = entry.points
          ? `${entry.points.toLocaleString()} pts`
          : `${entry.correct}/10 (${entry.percentage}%)`;

        card.append(stars, medal, name, score);
        targetPodium.appendChild(card);
      });
    }

    function renderLeaderboardEntries(entries, targets = {}) {
      const targetRows = targets.rows || leaderboardRows;
      const targetEmpty = targets.empty || leaderboardEmpty;
      if (!targetRows || !targetEmpty) return [];

      const rankedEntries = getRankedEntries(entries);

      targetRows.replaceChildren();
      targetEmpty.style.display = rankedEntries.length ? 'none' : 'block';
      renderPodium(rankedEntries, targets.podium);

      rankedEntries.forEach((entry, index) => {
        const row = document.createElement('tr');
        const rank = index + 1;
        const rankLabel = rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`;
        [rankLabel, entry.groupName, entry.points ? `${entry.points.toLocaleString()} pts` : `${entry.correct}/10 (${entry.percentage}%)`]
          .forEach(value => {
            const cell = document.createElement('td');
            cell.textContent = value;
            row.appendChild(cell);
          });
        targetRows.appendChild(row);
      });

      return rankedEntries;
    }

    async function renderLeaderboard(targets = {}) {
      if (!sharedLeaderboardEnabled) {
        if (leaderboardStatus) leaderboardStatus.textContent = 'Local mode: add the Supabase details to enable multi-device sync.';
        return renderLeaderboardEntries(getLeaderboard(), targets);
      }

      if (leaderboardStatus) leaderboardStatus.textContent = 'Loading shared scores…';

      try {
        const response = await fetch(
          `${supabaseUrl}/rest/v1/quiz_scores?select=student,team,lab_date,correct,percentage,created_at&order=percentage.desc,created_at.desc&limit=100`,
          {
            headers: supabaseHeaders()
          }
        );

        if (!response.ok) throw new Error(`Leaderboard request failed (${response.status})`);

        const sharedEntries = await response.json();
        const uniqueEntries = [];
        const identities = new Set();

        sharedEntries.forEach(entry => {
          const identity = `${entry.student.toLowerCase()}|${entry.lab_date || ''}`;
          if (identities.has(identity)) return;
          identities.add(identity);
          uniqueEntries.push({
            groupName: entry.student,
            labDate: entry.lab_date || '',
            correct: entry.correct,
            percentage: entry.percentage,
            points: Number.parseInt(entry.team, 10) || entry.correct * 1000,
            savedAt: Date.parse(entry.created_at) || 0
          });
        });

        if (leaderboardStatus) leaderboardStatus.textContent = 'Live scores synced across classroom devices.';
        return renderLeaderboardEntries(uniqueEntries, targets);
      } catch (error) {
        console.warn('Unable to load shared leaderboard:', error);
        if (leaderboardStatus) leaderboardStatus.textContent = 'Sync unavailable. Showing scores saved on this device.';
        return renderLeaderboardEntries(getLeaderboard(), targets);
      }
    }

    function openLeaderboard(roundMode = false) {
      if (!leaderboardOverlay) return;
      renderLeaderboard();
      roundLeaderboardActive = roundMode;
      if (leaderboardTitle) {
        leaderboardTitle.querySelector('span').textContent = roundMode
          ? `ROUND ${currentQuestion + 1} STANDINGS`
          : 'QUIZ LEADERBOARD';
      }
      if (btnLeaderboardContinue) {
        btnLeaderboardContinue.hidden = !roundMode;
      }
      leaderboardOverlay.style.display = 'flex';
      if (typeof lucide !== 'undefined') lucide.createIcons();
      btnCloseLeaderboard?.focus({ preventScroll: true });
      playLeaderboardSound();
      if (roundMode) startLeaderboardCountdown();
      else clearLeaderboardCountdown();
    }

    function closeLeaderboard() {
      clearLeaderboardCountdown();
      roundLeaderboardActive = false;
      if (leaderboardOverlay) leaderboardOverlay.style.display = 'none';
    }

    async function saveLeaderboardEntry(correct, percentage, points) {
      const groupName = document.getElementById('quiz-group-name')?.value.trim() || '';
      const labDate = document.getElementById('quiz-date')?.value.trim() || '';
      const identity = `${groupName.toLowerCase()}|${labDate}`;
      const entries = getLeaderboard().filter(entry => entry.identity !== identity);

      entries.push({
        identity,
        groupName,
        labDate,
        correct,
        percentage,
        points,
        savedAt: Date.now()
      });

      try {
        localStorage.setItem(leaderboardStorageKey, JSON.stringify(entries.slice(-100)));
      } catch (error) {
        console.warn('Unable to save leaderboard result:', error);
      }

      if (!sharedLeaderboardEnabled) return;

      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/quiz_scores`, {
          method: 'POST',
          headers: supabaseHeaders({
            'Content-Type': 'application/json',
            Prefer: 'return=minimal'
          }),
          body: JSON.stringify({
            // The existing database field name is retained for compatibility.
            student: groupName,
            // The legacy team field carries game points without requiring a database migration.
            team: String(points),
            lab_date: labDate,
            correct,
            percentage
          })
        });

        if (!response.ok) throw new Error(`Leaderboard submission failed (${response.status})`);
      } catch (error) {
        console.warn('Unable to sync leaderboard result:', error);
        showNotification('Score saved locally; leaderboard sync is unavailable.', 'error');
      }
    }

    if (btnOpenLeaderboard) btnOpenLeaderboard.addEventListener('click', () => openLeaderboard(false));
    if (btnCloseLeaderboard) btnCloseLeaderboard.addEventListener('click', closeLeaderboard);
    if (leaderboardOverlay) {
      leaderboardOverlay.addEventListener('click', event => {
        if (event.target === leaderboardOverlay) closeLeaderboard();
      });
    }
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && leaderboardOverlay?.style.display === 'flex') closeLeaderboard();
    });

    let currentQuestion = 0;
    let correctCount = 0;
    let gamePoints = 0;
    let secondsRemaining = 30;
    let questionTimerId = null;
    let answerLocked = false;
    let gameFinished = false;
    let answerResults = [];
    let leaderboardCountdownId = null;
    let roundLeaderboardActive = false;

    function clearLeaderboardCountdown() {
      if (leaderboardCountdownId) window.clearInterval(leaderboardCountdownId);
      leaderboardCountdownId = null;
    }

    function updateLeaderboardCountdown(seconds) {
      if (!btnLeaderboardContinue) return;
      btnLeaderboardContinue.innerHTML = `NEXT QUESTION IN <strong>${seconds}</strong> <i data-lucide="arrow-right"></i>`;
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function advanceFromLeaderboard() {
      clearLeaderboardCountdown();
      closeLeaderboard();
      playQuestionTransitionSound();
      showQuestion(currentQuestion + 1);
    }

    function startLeaderboardCountdown() {
      clearLeaderboardCountdown();
      let seconds = 4;
      updateLeaderboardCountdown(seconds);
      leaderboardCountdownId = window.setInterval(() => {
        seconds -= 1;
        updateLeaderboardCountdown(Math.max(seconds, 0));
        if (seconds > 0 && seconds <= 3) playCountdownSound(false);
        if (seconds <= 0) {
          playCountdownSound(true);
          advanceFromLeaderboard();
        }
      }, 1000);
    }

    function setGameButton(label, icon) {
      btnGradeQuiz.innerHTML = `<i data-lucide="${icon}"></i> ${label}`;
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function stopQuestionTimer() {
      if (questionTimerId) window.clearInterval(questionTimerId);
      questionTimerId = null;
    }

    function updateGameHud() {
      quizProgressLabel.textContent = `${currentQuestion + 1} / ${quizCards.length}`;
      quizProgressFill.style.width = `${((currentQuestion + 1) / quizCards.length) * 100}%`;
      quizLivePoints.textContent = gamePoints.toLocaleString();
      quizTimer.textContent = secondsRemaining;
      quizTimer.classList.toggle('is-urgent', secondsRemaining <= 8);
    }

    function startQuestionTimer() {
      stopQuestionTimer();
      secondsRemaining = 30;
      updateGameHud();
      questionTimerId = window.setInterval(() => {
        secondsRemaining -= 1;
        updateGameHud();
        if (secondsRemaining <= 0) lockCurrentAnswer(true);
      }, 1000);
    }

    function showQuestion(index) {
      currentQuestion = index;
      answerLocked = false;
      quizCards.forEach((card, cardIndex) => card.classList.toggle('is-active', cardIndex === index));
      setGameButton('LOCK IN ANSWER', 'lock');
      btnGradeQuiz.disabled = false;
      startQuestionTimer();
      refreshMath(quizCards[index]);
      quizCards[index].querySelector('input, textarea')?.focus({ preventScroll: true });
    }

    function currentAnswerIsCorrect() {
      const questionNumber = currentQuestion + 1;
      const selected = document.querySelector(`input[name="worksheet-q${questionNumber}"]:checked`);
      return Boolean(selected && selected.value === answerKey[`q${questionNumber}`]);
    }

    function revealAnswer(card, wasCorrect, timedOut) {
      const questionNumber = currentQuestion + 1;
      const feedback = document.getElementById(`q${questionNumber}-feedback`);
      const labels = card.querySelectorAll('.quiz-option-label');
      labels.forEach(label => {
        const input = label.querySelector('input');
        input.disabled = true;
        if (input.checked) label.classList.add(wasCorrect ? 'is-correct' : 'is-wrong');
      });
      const textarea = card.querySelector('textarea');
      if (textarea) textarea.disabled = true;
      feedback.className = `quiz-feedback ${wasCorrect ? 'correct' : 'incorrect'}`;
      feedback.textContent = timedOut
        ? 'Time is up — the correct answer will be shown in the final review.'
        : wasCorrect
          ? 'Answer locked — speed bonus added!'
          : 'Answer locked — check the correct answer in the final review.';
    }

    async function lockCurrentAnswer(timedOut = false) {
      if (answerLocked) return;
      const card = quizCards[currentQuestion];
      const questionNumber = currentQuestion + 1;
      const hasResponse = Boolean(document.querySelector(`input[name="worksheet-q${questionNumber}"]:checked`));
      if (!hasResponse && !timedOut) {
        showNotification('Choose an answer before locking it in.', 'error');
        return;
      }

      answerLocked = true;
      stopQuestionTimer();
      const wasCorrect = !timedOut && currentAnswerIsCorrect();
      const correctInput = card.querySelector(`input[value="${answerKey[`q${questionNumber}`]}"]`);
      const selectedInput = card.querySelector('input:checked');
      answerResults[currentQuestion] = {
        questionNumber,
        wasCorrect,
        questionText: card.querySelector('.quiz-question-text')?.textContent.replace(/\s+/g, ' ').trim() || '',
        selectedValue: selectedInput?.value || '',
        correctValue: answerKey[`q${questionNumber}`],
        correctText: correctInput?.closest('.quiz-option-label')?.querySelector('span')?.textContent.trim() || ''
      };
      if (wasCorrect) {
        correctCount += 1;
        gamePoints += 600 + Math.round((secondsRemaining / 30) * 400);
        playSuccessSound();
      } else {
        playWarningSound();
      }
      revealAnswer(card, wasCorrect, timedOut);
      updateGameHud();
      setGameButton('VIEW ROUND STANDINGS', 'trophy');
      const roundPercentage = correctCount * 10;
      await saveLeaderboardEntry(correctCount, roundPercentage, gamePoints);
      if (currentQuestion === quizCards.length - 1) finishQuiz();
      else openLeaderboard(true);
    }

    function renderAnswerReview(target = quizAnswerReview) {
      if (!target) return;
      target.replaceChildren();
      const heading = document.createElement('h3');
      heading.textContent = 'Correct answer review';
      target.appendChild(heading);

      const list = document.createElement('ol');
      answerResults.forEach(result => {
        const item = document.createElement('li');
        item.className = result.wasCorrect ? 'is-correct' : 'is-missed';
        const status = document.createElement('span');
        status.className = 'quiz-review-status';
        status.textContent = result.wasCorrect ? '✓' : '→';
        const content = document.createElement('div');
        content.className = 'quiz-review-content';
        const question = document.createElement('strong');
        question.textContent = `Question ${result.questionNumber}: ${result.questionText}`;
        const answer = document.createElement('span');
        answer.textContent = `Correct answer: ${result.correctText}`;
        content.append(question, answer);
        item.append(status, content);
        list.appendChild(item);
      });
      target.appendChild(list);
    }

    function setWinnerEffects(isWinner) {
      if (!scoreBanner) return;
      scoreBanner.classList.toggle('is-winner', isWinner);
      scoreBanner.querySelector('.quiz-winner-effects')?.remove();
      if (!isWinner) return;

      const effects = document.createElement('div');
      effects.className = 'quiz-winner-effects';
      effects.setAttribute('aria-hidden', 'true');
      const colors = ['#ffd43b', '#22d3ee', '#fb7185', '#a3e635', '#c084fc'];
      for (let index = 0; index < 36; index += 1) {
        const particle = document.createElement('i');
        particle.style.setProperty('--winner-left', `${(index * 37) % 101}%`);
        particle.style.setProperty('--winner-delay', `${(index % 9) * 0.12}s`);
        particle.style.setProperty('--winner-duration', `${2.4 + (index % 5) * 0.28}s`);
        particle.style.setProperty('--winner-color', colors[index % colors.length]);
        particle.style.setProperty('--winner-spin', `${180 + (index % 4) * 90}deg`);
        effects.appendChild(particle);
      }
      scoreBanner.prepend(effects);
    }

    async function finishQuiz() {
      stopQuestionTimer();
      clearLeaderboardCountdown();
      gameFinished = true;
      quizGameBoard.hidden = true;
      quizPlayHud.hidden = true;
      quizGameActions.hidden = true;
      scoreBanner.classList.add('show');
      renderAnswerReview(quizAnswerReview);

      const rankedEntries = await renderLeaderboard({
        rows: finalLeaderboardRows,
        empty: finalLeaderboardEmpty,
        podium: finalPodium
      });
      const groupName = document.getElementById('quiz-group-name')?.value.trim() || '';
      const labDate = document.getElementById('quiz-date')?.value.trim() || '';
      const winner = rankedEntries?.[0];
      const isWinner = Boolean(
        winner &&
        winner.groupName.toLowerCase() === groupName.toLowerCase() &&
        (!winner.labDate || winner.labDate === labDate)
      );
      setWinnerEffects(isWinner);
      if (typeof lucide !== 'undefined') lucide.createIcons();
      scoreBanner.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start'
      });
      playSuccessSound();
      setTimeout(playLeaderboardSound, 180);
      showNotification(
        isWinner ? `${groupName} takes 1st place!` : `${groupName}: ${gamePoints.toLocaleString()} points!`,
        isWinner ? 'success' : 'info'
      );
    }

    function resetQuiz(showLobby = true) {
      stopQuestionTimer();
      currentQuestion = 0;
      correctCount = 0;
      gamePoints = 0;
      answerLocked = false;
      gameFinished = false;
      answerResults = [];
      document.querySelectorAll('#student-quiz-form input[type="radio"]').forEach(input => {
        input.checked = false;
        input.disabled = false;
      });
      const q4Text = document.getElementById('q4-text');
      if (q4Text) {
        q4Text.value = '';
        q4Text.disabled = false;
      }
      document.querySelectorAll('.quiz-option-label').forEach(label => label.classList.remove('is-correct', 'is-wrong'));
      document.querySelectorAll('.quiz-feedback').forEach(feedback => {
        feedback.className = 'quiz-feedback';
        feedback.textContent = '';
      });
      scoreBanner.classList.remove('show');
      setWinnerEffects(false);
      quizLobby.hidden = !showLobby;
      quizPlayHud.hidden = showLobby;
      quizGameBoard.hidden = showLobby;
      quizGameActions.hidden = showLobby;
    }

    if (btnStartQuiz) {
      btnStartQuiz.addEventListener('click', () => {
        const groupNameInput = document.getElementById('quiz-group-name');
        if (!groupNameInput.value.trim()) {
          showNotification('Enter a team name to join the challenge.', 'error');
          groupNameInput.focus();
          return;
        }
        resetQuiz(false);
        quizLobby.hidden = true;
        quizPlayHud.hidden = false;
        quizGameBoard.hidden = false;
        quizGameActions.hidden = false;
        unlockAndStart();
        showQuestion(0);
        setTimeout(playEpochSound, 60);
      });
    }

    btnGradeQuiz.addEventListener('click', () => {
      if (gameFinished) {
        resetQuiz(true);
        return;
      }
      if (!answerLocked) {
        lockCurrentAnswer(false);
        return;
      }
      openLeaderboard(true);
    });

    if (btnLeaderboardContinue) {
      btnLeaderboardContinue.addEventListener('click', advanceFromLeaderboard);
    }

    if (btnFinalRestart) btnFinalRestart.addEventListener('click', () => resetQuiz(true));
    if (btnResetQuiz) btnResetQuiz.addEventListener('click', () => resetQuiz(true));
  }

  function refreshMath(targetEl) {
    if (typeof renderMathInElement === 'function') {
      try {
        renderMathInElement(targetEl || document.body, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false}
          ],
          ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "annotation", "annotation-xml", "svg"],
          throwOnError: false
        });
      } catch (err) {
        console.warn("KaTeX render error:", err);
      }
    }
  }

  // Boot chart setups & new hubs
  initTelemetryChart();
  initFlashcardsHub();
  initQuizEngine();
  
  // Refresh math rendering
  setTimeout(refreshMath, 150);
  
  // Load cached settings
  loadFromLocalStorage();
  
  logToConsole("SYS: Spacesuit Thermal Shielding Kit interface ready.");
});
