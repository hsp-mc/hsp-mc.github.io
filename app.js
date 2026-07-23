/**
 * SPHERE: Mission Control - Telemetry & Simulation Suite
 * Core Application Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================================================
  // 1. Core State Definition
  // ==========================================================================
  const state = {
    selectedModel: 'bare',
    modelConstants: {
      bare: { name: 'Bare Capsule (Control)', k: 0.150, color: '#0284c7' },
      cotton: { name: 'Cotton Layer (Conduction Shield)', k: 0.080, color: '#4facfe' },
      mylar: { name: 'Mylar Layer (Radiation Shield)', k: 0.040, color: '#ff9f43' },
      mli: { name: 'Full MLI (Cotton + Bubble Wrap + Mylar)', k: 0.015, color: '#10b981' },
      custom: { name: 'Custom Sandbox Layer', k: 0.050, color: '#a55eea' }
    },
    predictionCurve: [], // Cached prediction data points [{x: time, y: temp}]
    telemetryPoints: [],  // User logged physical points [{time: number, temp: number}]
    isAuthorized: false,
    
    // Mission Timer State
    timer: {
      duration: 15 * 60, // 15 minutes in seconds
      secondsRemaining: 15 * 60,
      intervalId: null,
      isRunning: false
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
    btnAutofill: document.getElementById('btn-autofill'),
    btnClearTelemetry: document.getElementById('btn-clear-telemetry'),
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

  // Audio Toggle — this is the ONLY place we call unlockAndStart
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

  // Custom K Sandbox Slider Event Listener
  if (elements.customKSlider) {
    elements.customKSlider.addEventListener('input', (e) => {
      const kVal = parseFloat(e.target.value);
      state.modelConstants.custom.k = kVal;
      
      if (elements.customKVal) {
        elements.customKVal.textContent = `k = ${kVal.toFixed(3)}`;
      }
      
      updatePredictionStats();
      if (elements.insulationSelect.value === 'custom') {
        elements.simKVal.textContent = kVal.toFixed(3);
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
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      playClickSound();
      const target = tab.getAttribute('data-target');
      
      // Update Tab state
      elements.tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
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
    const selected = elements.insulationSelect.value;
    const material = state.modelConstants[selected];
    
    const durationInput = elements.simTime ? parseInt(elements.simTime.value) : 15;
    const duration = isNaN(durationInput) || durationInput <= 0 ? 15 : durationInput;
    
    if (elements.simT15Title) {
      elements.simT15Title.textContent = `PREDICTED T(${duration})`;
    }
    
    const predictedFinal = calculateNewtonTemperature(duration, material.k);
    elements.simT15Val.textContent = `${predictedFinal.toFixed(1)}°C`;
  };

  elements.simT0.addEventListener('input', updatePredictionStats);
  elements.simTenv.addEventListener('input', updatePredictionStats);
  
  if (elements.simTime) {
    elements.simTime.addEventListener('input', () => {
      updatePredictionStats();
      resetTimer();
    });
  }

  // Handle material parameters selection to update UI readouts immediately
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
    elements.simKVal.textContent = material.k.toFixed(3);
  });

  // Action: Compile Mathematical Curve
  elements.btnRunSim.addEventListener('click', () => {
    const selected = elements.insulationSelect.value;
    state.selectedModel = selected;
    const material = state.modelConstants[selected];
    
    const durationInput = elements.simTime ? parseInt(elements.simTime.value) : 15;
    const duration = isNaN(durationInput) || durationInput <= 0 ? 15 : durationInput;
    
    // Clear and build predicted dataset over custom duration (t=0 to duration, step=1)
    state.predictionCurve = [];
    for (let t = 0; t <= duration; t++) {
      const temp = calculateNewtonTemperature(t, material.k);
      state.predictionCurve.push({ x: t, y: parseFloat(temp.toFixed(2)) });
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
    
    // Update system notifications
    elements.systemStatusDot.className = 'ticker-status-dot simulating';
    elements.systemStatusText.textContent = 'MODEL RUNNING';
    
    logToConsole(`SYS: Prediction generated for ${material.name} (k=${material.k.toFixed(3)}). Predicted T(15)=${calculateNewtonTemperature(15, material.k).toFixed(2)}°C.`, 'success');
    showNotification(`Simulation Curve Active: k=${material.k.toFixed(3)}`, 'success');
    playSuccessSound();
    
    // Save state
    saveToLocalStorage();
  });

  // Chart.js Prediction Render
  function renderSimulationChart(label, color) {
    const ctx = document.getElementById('simulationChart').getContext('2d');
    
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
              color: '#94a3b8',
              font: { family: 'Orbitron', size: 10 }
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b', font: { family: 'Roboto Mono' } }
          },
          y: {
            min: 0,
            max: 90,
            title: {
              display: true,
              text: 'TEMPERATURE (°C)',
              color: '#94a3b8',
              font: { family: 'Orbitron', size: 10 }
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b', font: { family: 'Roboto Mono' } }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#e2e8f0',
              font: { family: 'Inter', size: 11 }
            }
          },
          tooltip: {
            backgroundColor: '#101830',
            borderColor: 'rgba(0, 242, 254, 0.3)',
            borderWidth: 1,
            titleFont: { family: 'Orbitron' },
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
  // 5. Live Telemetry Logbook Cockpit (Module 4)
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
        
        // 60-Second Logging Epoch Prompts (Pedagogical Prompts)
        const elapsedSeconds = state.timer.duration - state.timer.secondsRemaining;
        if (elapsedSeconds > 0 && elapsedSeconds % 60 === 0 && state.timer.secondsRemaining >= 0) {
          const minsElapsed = elapsedSeconds / 60;
          logToConsole(`MISSION TIME [${String(minsElapsed).padStart(2, '0')}:00]: Epoch checkpoint! Transmit actual thermometer telemetry.`, 'warn');
          showNotification(`Transmit physical telemetry for Minute ${minsElapsed}!`, 'info');
          playEpochSound();
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
    const ctx = document.getElementById('telemetryChart').getContext('2d');
    
    telemetryChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Newton Prediction Model (Dashed)',
            data: state.predictionCurve,
            borderColor: 'rgba(0, 242, 254, 0.45)',
            borderDash: [6, 6],
            borderWidth: 2,
            pointRadius: 0, // Hide points for clear aesthetic
            tension: 0.25,
            fill: false
          },
          {
            label: 'Physical Telemetry (Actual)',
            data: [], // populated dynamically
            borderColor: '#ff9f43',
            backgroundColor: 'rgba(255, 159, 67, 0.1)',
            borderWidth: 3,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointBackgroundColor: '#ff9f43',
            pointBorderColor: '#fff',
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
              color: '#94a3b8',
              font: { family: 'Orbitron', size: 10 }
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b', font: { family: 'Roboto Mono' } }
          },
          y: {
            min: 0,
            max: 90,
            title: {
              display: true,
              text: 'TEMPERATURE (°C)',
              color: '#94a3b8',
              font: { family: 'Orbitron', size: 10 }
            },
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b', font: { family: 'Roboto Mono' } }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#e2e8f0',
              font: { family: 'Inter', size: 11 }
            }
          },
          tooltip: {
            backgroundColor: '#101830',
            borderColor: 'rgba(255, 159, 67, 0.4)',
            borderWidth: 1,
            titleFont: { family: 'Orbitron' },
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
    telemetryChartInstance.data.datasets[0].borderColor = `${material.color}80`;
    
    telemetryChartInstance.data.datasets[1].data = sortedPhysical;
    
    telemetryChartInstance.update();
    
    // Sync statistics
    elements.acquiredCountBadge.textContent = `${state.telemetryPoints.length} / ${duration + 1}`;
  }

  // Transmit and log manual packet
  document.getElementById('telemetry-entry-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const timeVal = parseFloat(elements.logTimeInput.value);
    const tempVal = parseFloat(elements.logTempInput.value);
    
    const durationInput = elements.simTime ? parseInt(elements.simTime.value) : 15;
    const duration = isNaN(durationInput) || durationInput <= 0 ? 15 : durationInput;
    
    // Check validation constraints
    if (isNaN(timeVal) || timeVal < 0 || timeVal > duration) {
      showNotification(`Invalid entry: Time must be between 0 and ${duration} mins`, "error");
      playWarningSound();
      return;
    }
    if (isNaN(tempVal) || tempVal < 0 || tempVal > 100) {
      showNotification("Invalid entry: Temp must be between 0 and 100°C", "error");
      playWarningSound();
      return;
    }
    
    // Check duplicate timestamps
    const existsIndex = state.telemetryPoints.findIndex(pt => Math.abs(pt.time - timeVal) < 0.01);
    if (existsIndex !== -1) {
      showNotification(`Warning: Timestamp ${timeVal} min already registered. Removing old packet first.`, "error");
      state.telemetryPoints.splice(existsIndex, 1);
    }
    
    // Add point to array
    state.telemetryPoints.push({ time: timeVal, temp: tempVal });
    
    // Clean inputs
    elements.logTimeInput.value = '';
    elements.logTempInput.value = '';
    
    // Sync elements
    updateTelemetryTable();
    updateTelemetryChart();
    saveToLocalStorage();
    
    logToConsole(`LAB: Telemetry packet transmitted. Time: ${timeVal.toFixed(1)}m, Temp: ${tempVal.toFixed(1)}°C.`, 'success');
    showNotification("Telemetry Logged", "success");
    playSuccessSound();
  });

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
        elements.telemetryCorrelationGrade.textContent = 'NO DATA PACKETS';
        elements.telemetryCorrelationGrade.className = 'glow-orange';
      }
      return;
    }
    
    if (elements.emptyTableMsg) elements.emptyTableMsg.style.display = 'none';
    
    // Calculate Thermal Correlation Score & Grade
    let sumAbsError = 0;
    const activeMaterial = state.modelConstants[state.selectedModel];
    
    state.telemetryPoints.forEach(pt => {
      const predT = calculateNewtonTemperature(pt.time, activeMaterial.k);
      sumAbsError += Math.abs(pt.temp - predT);
    });
    
    const avgAbsError = sumAbsError / state.telemetryPoints.length;
    // Map absolute error to a 0-100% score (1°C error = 95%, 5°C error = 75%, 10°C error = 50%)
    const rawScore = 100 - (avgAbsError * 5.0);
    const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));
    
    if (elements.telemetryCorrelationScore) elements.telemetryCorrelationScore.textContent = `${finalScore}%`;
    
    let grade = '';
    let gradeClass = '';
    if (finalScore >= 95) {
      grade = 'EXCELLENT SEAL [A+]';
      gradeClass = 'glow-green';
    } else if (finalScore >= 90) {
      grade = 'HIGH STABILITY [A]';
      gradeClass = 'glow-green';
    } else if (finalScore >= 80) {
      grade = 'MODERATE ISOLATION [B]';
      gradeClass = 'glow-orange';
    } else if (finalScore >= 70) {
      grade = 'THERMAL DECAY DETECTED [C]';
      gradeClass = 'glow-orange';
    } else {
      grade = 'CONVECTIVE LEAKAGE [F]';
      gradeClass = 'glow-red';
    }
    
    if (elements.telemetryCorrelationGrade) {
      elements.telemetryCorrelationGrade.textContent = grade;
      elements.telemetryCorrelationGrade.className = gradeClass;
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
    logToConsole(`LAB: Telemetry packet erased for timestamp: ${timeValue.toFixed(1)}m.`, 'warn');
    showNotification("Data Packet Erased", "error");
  }

  // Clear telemetry completely
  elements.btnClearTelemetry.addEventListener('click', () => {
    playClickSound();
    if (confirm("Are you sure you want to wipe all physical telemetry data? This cannot be undone.")) {
      state.telemetryPoints = [];
      updateTelemetryTable();
      updateTelemetryChart();
      saveToLocalStorage();
      logToConsole("WARN: Entire physical telemetry log wiped by manual directive.", "warn");
      showNotification("Logs Wiped", "error");
      playWarningSound();
    }
  });

  // Mock autofill generator with authentic thermodynamic noise
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
    
    logToConsole("LAB: Cybernetic simulation complete. Real-world sensor variance dataset mounted.", "success");
    showNotification("Sample Telemetry Mounted", "success");
    playSuccessSound();
  });

  // ==========================================================================
  // 6. Teacher Portal Authentication Gate (Module 5)
  // ==========================================================================
  elements.adminLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    playClickSound();
    const pw = elements.adminPasswordInput.value;
    
    if (pw === 'SPHERE2026') {
      state.isAuthorized = true;
      elements.adminLoginGate.style.display = 'none';
      elements.adminAuthorizedDashboard.style.display = 'grid';
      elements.adminPasswordInput.value = '';
      
      logToConsole("SYS: Instructor access validated. Key decrypted.", "success");
      showNotification("Teacher Portal Unlocked", "success");
      playSuccessSound();
      
      sessionStorage.setItem('sphere_admin_auth', 'true');
      lucide.createIcons();
    } else {
      showNotification("Access Denied: Invalid Decryption Key", "error");
      logToConsole("WARN: Unauthorized access attempt registered on teacher portal.", "warn");
      playWarningSound();
      elements.adminPasswordInput.value = '';
    }
  });

  elements.btnAdminLogout.addEventListener('click', () => {
    playClickSound();
    state.isAuthorized = false;
    elements.adminAuthorizedDashboard.style.display = 'none';
    elements.adminLoginGate.style.display = 'block';
    
    logToConsole("SYS: Instructor session locked.");
    showNotification("Teacher Portal Secured", "error");
    playWarningSound();
    
    sessionStorage.removeItem('sphere_admin_auth');
    lucide.createIcons();
  });

  // Pre-Flight Certification Quiz Evaluation
  function evaluateQuiz() {
    playClickSound();
    const q1 = document.querySelector('input[name="q1"]:checked')?.value;
    const q2 = document.querySelector('input[name="q2"]:checked')?.value;
    const q3 = document.querySelector('input[name="q3"]:checked')?.value;
    
    if (!q1 || !q2 || !q3) {
      showNotification("Error: Answer all quiz questions first!", "error");
      logToConsole("WARN: Certification attempt rejected. Missing answer fields.", "warn");
      playWarningSound();
      return;
    }
    
    const isCorrect1 = q1 === 'radiation';
    const isCorrect2 = q2 === 'conduction';
    const isCorrect3 = q3 === 'convection';
    
    if (isCorrect1 && isCorrect2 && isCorrect3) {
      elements.quizStatusBadge.textContent = "STATUS: CERTIFIED ENGINEER [ACTIVE]";
      elements.quizStatusBadge.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
      elements.quizStatusBadge.style.borderColor = "var(--green)";
      elements.quizStatusBadge.style.color = "var(--green)";
      elements.quizStatusBadge.classList.add('glow-green');
      
      logToConsole("SYS: Pre-flight quiz certified: 3/3 CORRECT. Credential card SPHERE-ENG-ACTIVE issued.", "success");
      showNotification("Assessment Passed! Credentials Issued.", "success");
      playSuccessSound();
      
      localStorage.setItem('sphere_quiz_certified', 'true');
    } else {
      elements.quizStatusBadge.textContent = "STATUS: ACCESS DENIED";
      elements.quizStatusBadge.style.backgroundColor = "rgba(244, 63, 94, 0.1)";
      elements.quizStatusBadge.style.borderColor = "var(--red)";
      elements.quizStatusBadge.style.color = "var(--red)";
      elements.quizStatusBadge.classList.remove('glow-green');
      
      let incorrectCount = 0;
      if (!isCorrect1) incorrectCount++;
      if (!isCorrect2) incorrectCount++;
      if (!isCorrect3) incorrectCount++;
      
      logToConsole(`WARN: Certification failed. ${incorrectCount} incorrect heat transfer answers detected. Re-evaluating mechanical layers...`, "warn");
      showNotification(`Failed: ${incorrectCount} incorrect answers. Try again!`, "error");
      playWarningSound();
    }
  }
  
  elements.btnSubmitQuiz.addEventListener('click', evaluateQuiz);

  // Restore pre-flight quiz certification status on load
  function restoreQuizStatus() {
    const cachedQuiz = localStorage.getItem('sphere_quiz_certified');
    if (cachedQuiz === 'true') {
      elements.quizStatusBadge.textContent = "STATUS: CERTIFIED ENGINEER [ACTIVE]";
      elements.quizStatusBadge.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
      elements.quizStatusBadge.style.borderColor = "var(--green)";
      elements.quizStatusBadge.style.color = "var(--green)";
      elements.quizStatusBadge.classList.add('glow-green');
      
      // Auto check correct answers for pedagogical reinforcement
      const q1El = document.querySelector('input[name="q1"][value="radiation"]');
      const q2El = document.querySelector('input[name="q2"][value="conduction"]');
      const q3El = document.querySelector('input[name="q3"][value="convection"]');
      if (q1El) q1El.checked = true;
      if (q2El) q2El.checked = true;
      if (q3El) q3El.checked = true;
    }
  }

  // Check existing session auth
  if (sessionStorage.getItem('sphere_admin_auth') === 'true') {
    state.isAuthorized = true;
    elements.adminLoginGate.style.display = 'none';
    elements.adminAuthorizedDashboard.style.display = 'grid';
    lucide.createIcons();
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

      const t0 = parseFloat(calcT0.value) || 80;
      const tenv = parseFloat(calcTenv.value) || 0;
      const tt = parseFloat(calcTt.value) || 20;
      const time = parseFloat(calcTime.value) || 15;

      const num = tt - tenv;
      const den = t0 - tenv;

      if (den <= 0 || num <= 0 || time <= 0) {
        if (calcStep1) calcStep1.textContent = '1. Invalid parameters (Check temperatures and time)';
        if (calcStep2) calcStep2.textContent = '2. Natural Log = N/A';
        if (calcStep3) calcStep3.textContent = '3. DERIVED k-VALUE = N/A';
        return;
      }

      const ratio = num / den;
      const lnRatio = Math.log(ratio);
      const kVal = -lnRatio / time;

      if (calcStep1) calcStep1.textContent = `1. Temp Ratio = (${tt.toFixed(1)} - ${tenv.toFixed(1)}) / (${t0.toFixed(1)} - ${tenv.toFixed(1)}) = ${ratio.toFixed(4)}`;
      if (calcStep2) calcStep2.textContent = `2. Natural Log ln(${ratio.toFixed(4)}) = ${lnRatio.toFixed(4)}`;
      if (calcStep3) calcStep3.textContent = `3. DERIVED k-VALUE = ${kVal.toFixed(3)} min⁻¹`;

      // Match insulation grade
      let material = "CUSTOM INSULATION SHIELD";
      let badgeBg = "#e0f2fe";
      let badgeColor = "#0369a1";

      if (kVal <= 0.025) {
        material = "FULL MLI SPACESUIT (k ≈ 0.015 min⁻¹)";
        badgeBg = "#dcfce7";
        badgeColor = "#15803d";
      } else if (kVal <= 0.060) {
        material = "MYLAR RADIATION SHIELD (k ≈ 0.040 min⁻¹)";
        badgeBg = "#fef3c7";
        badgeColor = "#b45309";
      } else if (kVal <= 0.110) {
        material = "COTTON CONDUCTION SHIELD (k ≈ 0.080 min⁻¹)";
        badgeBg = "#e0f2fe";
        badgeColor = "#0369a1";
      } else {
        material = "BARE UNINSULATED CORE (k ≈ 0.150 min⁻¹)";
        badgeBg = "#fee2e2";
        badgeColor = "#b91c1c";
      }

      if (calcMatchBadge) {
        calcMatchBadge.textContent = `MATCHING MATERIAL: ${material}`;
        calcMatchBadge.style.background = badgeBg;
        calcMatchBadge.style.color = badgeColor;
      }
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
    const scoreBanner = document.getElementById('quiz-score-banner');
    const scorePercentEl = document.getElementById('quiz-score-percent');
    const scoreBadgeEl = document.getElementById('quiz-score-badge');
    const scoreSummaryEl = document.getElementById('quiz-score-summary');

    if (!btnGradeQuiz) return;

    const answerKey = {
      q1: 'B',
      q2: 'B',
      q3: 'A',
      q5: 'B',
      q6: 'A',
      q7: 'A',
      q8: 'A',
      q9: 'B',
      q10: 'A'
    };

    btnGradeQuiz.addEventListener('click', () => {
      let correctCount = 0;
      const totalQuestions = 10;

      // Q1 Check
      const q1Selected = document.querySelector('input[name="q1"]:checked');
      const q1Feedback = document.getElementById('q1-feedback');
      if (q1Selected && q1Selected.value === answerKey.q1) {
        correctCount++;
        q1Feedback.className = 'quiz-feedback correct';
        q1Feedback.innerHTML = '✓ CORRECT! Space is a vacuum (radiation dominant), whereas ice bath heat loss occurs via conduction.';
      } else {
        q1Feedback.className = 'quiz-feedback incorrect';
        q1Feedback.innerHTML = '✗ INCORRECT! Correct answer is B: Liquid ice water transfers heat primarily via direct conduction.';
      }

      // Q2 Check
      const q2Selected = document.querySelector('input[name="q2"]:checked');
      const q2Feedback = document.getElementById('q2-feedback');
      if (q2Selected && q2Selected.value === answerKey.q2) {
        correctCount++;
        q2Feedback.className = 'quiz-feedback correct';
        q2Feedback.innerHTML = '✓ CORRECT! A lower k constant represents a slower rate of cooling (superior insulation).';
      } else {
        q2Feedback.className = 'quiz-feedback incorrect';
        q2Feedback.innerHTML = '✗ INCORRECT! Correct answer is B: Smaller k values mean heat is retained much longer.';
      }

      // Q3 Check
      const q3Selected = document.querySelector('input[name="q3"]:checked');
      const q3Feedback = document.getElementById('q3-feedback');
      if (q3Selected && q3Selected.value === answerKey.q3) {
        correctCount++;
        q3Feedback.className = 'quiz-feedback correct';
        q3Feedback.innerHTML = '✓ CORRECT! Multi-layer insulation combines cotton (conduction), bubble wrap (convection), and Mylar (radiation).';
      } else {
        q3Feedback.className = 'quiz-feedback incorrect';
        q3Feedback.innerHTML = '✗ INCORRECT! Correct answer is A: MLI targets all three distinct heat transfer pathways.';
      }

      // Q4 Check (Text Area)
      const q4Text = document.getElementById('q4-text');
      const q4Feedback = document.getElementById('q4-feedback');
      if (q4Text && q4Text.value.trim().length >= 10) {
        correctCount++;
        q4Feedback.className = 'quiz-feedback correct';
        q4Feedback.innerHTML = '✓ EXPLANATION VERIFIED! Excellent physical reasoning on telemetry error sources.';
      } else {
        q4Feedback.className = 'quiz-feedback incorrect';
        q4Feedback.innerHTML = '✗ INCOMPLETE! Please provide a written explanation (e.g., sensor placement near wall, ice melting, non-uniform water mixing).';
      }

      // Q5 Check
      const q5Selected = document.querySelector('input[name="q5"]:checked');
      const q5Feedback = document.getElementById('q5-feedback');
      if (q5Selected && q5Selected.value === answerKey.q5) {
        correctCount++;
        q5Feedback.className = 'quiz-feedback correct';
        q5Feedback.innerHTML = '✓ CORRECT! Adjusting T_env to 4.5°C recalibrates the Digital Twin mathematical model.';
      } else {
        q5Feedback.className = 'quiz-feedback incorrect';
        q5Feedback.innerHTML = '✗ INCORRECT! Correct answer is B: Update T_env parameter in the simulator.';
      }

      // Q6 Check
      const q6Selected = document.querySelector('input[name="q6"]:checked');
      const q6Feedback = document.getElementById('q6-feedback');
      if (q6Selected && q6Selected.value === answerKey.q6) {
        correctCount++;
        q6Feedback.className = 'quiz-feedback correct';
        q6Feedback.innerHTML = '✓ CORRECT! Thermal Conductivity (k) governs the conduction heat flux density across solid layers.';
      } else {
        q6Feedback.className = 'quiz-feedback incorrect';
        q6Feedback.innerHTML = '✗ INCORRECT! Correct answer is A: Thermal Conductivity Coefficient (k).';
      }

      // Q7 Check
      const q7Selected = document.querySelector('input[name="q7"]:checked');
      const q7Feedback = document.getElementById('q7-feedback');
      if (q7Selected && q7Selected.value === answerKey.q7) {
        correctCount++;
        q7Feedback.className = 'quiz-feedback correct';
        q7Feedback.innerHTML = '✓ CORRECT! Vacuum lacks fluid mass, rendering natural and forced convection impossible.';
      } else {
        q7Feedback.className = 'quiz-feedback incorrect';
        q7Feedback.innerHTML = '✗ INCORRECT! Correct answer is A: Deep space lacks fluid matter to form convective currents.';
      }

      // Q8 Check
      const q8Selected = document.querySelector('input[name="q8"]:checked');
      const q8Feedback = document.getElementById('q8-feedback');
      if (q8Selected && q8Selected.value === answerKey.q8) {
        correctCount++;
        q8Feedback.className = 'quiz-feedback correct';
        q8Feedback.innerHTML = '✓ CORRECT! Ethanol holds less heat per gram, causing temperature to plunge much faster.';
      } else {
        q8Feedback.className = 'quiz-feedback incorrect';
        q8Feedback.innerHTML = '✗ INCORRECT! Correct answer is A: Lower heat capacity means faster temperature drop.';
      }

      // Q9 Check
      const q9Selected = document.querySelector('input[name="q9"]:checked');
      const q9Feedback = document.getElementById('q9-feedback');
      if (q9Selected && q9Selected.value === answerKey.q9) {
        correctCount++;
        q9Feedback.className = 'quiz-feedback correct';
        q9Feedback.innerHTML = '✓ CORRECT! Over time, the capsule approaches environmental equilibrium (T_env).';
      } else {
        q9Feedback.className = 'quiz-feedback incorrect';
        q9Feedback.innerHTML = '✗ INCORRECT! Correct answer is B: The temperature approaches T_env asymptotically.';
      }

      // Q10 Check
      const q10Selected = document.querySelector('input[name="q10"]:checked');
      const q10Feedback = document.getElementById('q10-feedback');
      if (q10Selected && q10Selected.value === answerKey.q10) {
        correctCount++;
        q10Feedback.className = 'quiz-feedback correct';
        q10Feedback.innerHTML = '✓ CORRECT! Water leakage or active stirring accelerates forced convective heat loss beyond theoretical predictions.';
      } else {
        q10Feedback.className = 'quiz-feedback incorrect';
        q10Feedback.innerHTML = '✗ INCORRECT! Correct answer is A: Capsule leakage or excess fluid turbulence.';
      }

      // Calculate Percent
      const percentage = Math.round((correctCount / totalQuestions) * 100);
      scorePercentEl.textContent = `${percentage}%`;

      // Grade Badge
      let grade = 'F';
      if (percentage >= 95) grade = 'A+';
      else if (percentage >= 85) grade = 'A';
      else if (percentage >= 75) grade = 'B';
      else if (percentage >= 60) grade = 'C';

      scoreBadgeEl.textContent = `GRADE: ${grade}`;

      if (percentage >= 80) {
        scoreSummaryEl.textContent = `Outstanding mission performance, Astronaut! Your crew scored ${correctCount}/${totalQuestions} questions correctly. You have mastered space thermal protection systems.`;
        playSuccessSound();
      } else {
        scoreSummaryEl.textContent = `Evaluation complete. You answered ${correctCount}/${totalQuestions} questions correctly. Review the flashcard deck and re-test your thermal knowledge!`;
        playWarningSound();
      }

      scoreBanner.classList.add('show');
      showNotification(`EVALUATION GRADED: ${percentage}% (GRADE: ${grade})`, percentage >= 80 ? 'success' : 'error');
    });

    if (btnResetQuiz) {
      btnResetQuiz.addEventListener('click', () => {
        document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
        const q4Text = document.getElementById('q4-text');
        if (q4Text) q4Text.value = '';
        document.querySelectorAll('.quiz-feedback').forEach(f => {
          f.className = 'quiz-feedback';
          f.innerHTML = '';
        });
        scoreBanner.classList.remove('show');
        showNotification("QUIZ RESET: All answers cleared.", "info");
      });
    }
  }

  // Boot chart setups & new hubs
  initTelemetryChart();
  initFlashcardsHub();
  initQuizEngine();
  
  // Load cached settings
  loadFromLocalStorage();
  
  logToConsole("SYS: Navigation systems aligned. Mission Control fully active.");
});

