(function () {
  const DEFAULT_CONFIG = {
    items: [
      { id: 1, text: 'NO', color: '#f43f5e' },
      { id: 2, text: 'Yes', color: '#fb923c' }
    ],
    removeOnWin: false,
    soundEnabled: true,
    duration: 4.0,
    speed: 5,
    palette: 'vibrant',
    history: []
  };

  const PALETTES = {
    vibrant: ['#f43f5e', '#fb923c', '#fbbf24', '#34d399', '#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#2dd4bf', '#facc15'],
    pastel: ['#fca5a5', '#fdba74', '#fde047', '#86efac', '#7dd3fc', '#a5b4fc', '#e879f9', '#f472b6', '#5eead4', '#cbd5e1'],
    neon: ['#ff0055', '#ff7700', '#ffee00', '#00ff66', '#00ffff', '#7700ff', '#ff00ff', '#00ffbb', '#aaff00', '#ff00aa']
  };

  const wheelState = {
    appState: JSON.parse(JSON.stringify(DEFAULT_CONFIG)),
    currentRotation: 0,
    isSpinning: false,
    audioCtx: null
  };

  function saveConfig() {
    try {
      localStorage.setItem('decision_wheel_pro_config', JSON.stringify(wheelState.appState));
      updateStorageSizeBadge();
    } catch (error) {
      console.error('Failed to save to localStorage', error);
    }
  }

  function loadConfig() {
    try {
      const saved = localStorage.getItem('decision_wheel_pro_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        wheelState.appState = { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load localStorage', error);
      wheelState.appState = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }
  }

  function updateStorageSizeBadge() {
    const storageInfo = document.getElementById('storageSizeInfo');
    if (!storageInfo) return;

    const data = localStorage.getItem('decision_wheel_pro_config') || '';
    const bytes = new Blob([data]).size;
    storageInfo.innerText = `Storage: ${(bytes / 1024).toFixed(1)} KB`;
  }

  function resetToDefaults() {
    if (confirm('Reset all items and settings to factory defaults?')) {
      wheelState.appState = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      saveConfig();
      if (typeof window.renderAll === 'function') {
        window.renderAll();
      }
      showNotification('Reset to defaults successfully!');
    }
  }

  function initAudioContext() {
    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      wheelState.audioCtx = new AudioContext();
    } catch (error) {
      console.warn('Web Audio API not supported in this browser.');
    }
  }

  function playTickSound() {
    if (!wheelState.appState.soundEnabled || !wheelState.audioCtx) return;
    if (wheelState.audioCtx.state === 'suspended') {
      wheelState.audioCtx.resume();
    }

    try {
      const osc = wheelState.audioCtx.createOscillator();
      const gain = wheelState.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, wheelState.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, wheelState.audioCtx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.15, wheelState.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, wheelState.audioCtx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(wheelState.audioCtx.destination);

      osc.start();
      osc.stop(wheelState.audioCtx.currentTime + 0.04);
    } catch (error) {
      console.warn('Tick sound failed:', error);
    }
  }

  function playWinFanfare() {
    if (!wheelState.appState.soundEnabled || !wheelState.audioCtx) return;
    if (wheelState.audioCtx.state === 'suspended') {
      wheelState.audioCtx.resume();
    }

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, index) => {
        const osc = wheelState.audioCtx.createOscillator();
        const gain = wheelState.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, wheelState.audioCtx.currentTime + index * 0.12);

        gain.gain.setValueAtTime(0.2, wheelState.audioCtx.currentTime + index * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, wheelState.audioCtx.currentTime + index * 0.12 + 0.3);

        osc.connect(gain);
        gain.connect(wheelState.audioCtx.destination);

        osc.start(wheelState.audioCtx.currentTime + index * 0.12);
        osc.stop(wheelState.audioCtx.currentTime + index * 0.12 + 0.3);
      });
    } catch (error) {
      console.warn('Win fanfare failed:', error);
    }
  }

  function setupCanvasSize() {
    const canvas = document.getElementById('wheelCanvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;

    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    drawWheel();
  }

  function drawWheel() {
    const canvas = document.getElementById('wheelCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = window.devicePixelRatio || 1;
    const width = canvas.width / ratio;
    const height = canvas.height / ratio;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    ctx.clearRect(0, 0, width, height);

    const items = wheelState.appState.items;
    const count = items.length;

    if (count === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#334155';
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No choices added!', centerX, centerY - 70);
      return;
    }

    const arcSize = (2 * Math.PI) / count;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(wheelState.currentRotation);

    for (let i = 0; i < count; i += 1) {
      const startAngle = i * arcSize;
      const endAngle = (i + 1) * arcSize;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = items[i].color || PALETTES[wheelState.appState.palette][i % PALETTES[wheelState.appState.palette].length];
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();

      ctx.save();
      ctx.rotate(startAngle + arcSize / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Inter, sans-serif';

      let text = items[i].text;
      if (text.length > 18) {
        text = `${text.substring(0, 16)}...`;
      }

      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(text, radius - 25, 0);
      ctx.restore();
    }

    ctx.restore();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();
  }

  function spinWheel() {
    if (wheelState.isSpinning) return;
    if (wheelState.appState.items.length === 0) {
      alertUser('Please add at least one choice to the wheel!');
      if (typeof window.switchTab === 'function') {
        window.switchTab('items');
      }
      return;
    }

    const spinBtn = document.getElementById('spinBtn');
    if (spinBtn) {
      wheelState.isSpinning = true;
      spinBtn.disabled = true;
      spinBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }

    const count = wheelState.appState.items.length;
    const arcSize = (2 * Math.PI) / count;
    const winningIndex = Math.floor(Math.random() * count);
    const targetSliceCenterAngle = winningIndex * arcSize + arcSize / 2;
    const extraSpins = Math.floor(wheelState.appState.speed) * 2 * Math.PI;
    const desiredRotation = extraSpins + (3 * Math.PI / 2 - targetSliceCenterAngle);
    const totalRotation = wheelState.currentRotation + (2 * Math.PI * 5) + (desiredRotation - (wheelState.currentRotation % (2 * Math.PI)));
    const duration = parseFloat(wheelState.appState.duration) * 1000;
    const startTime = performance.now();
    const startRotation = wheelState.currentRotation;
    let lastTickSlice = -1;

    function animateSpin(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);

      wheelState.currentRotation = startRotation + (totalRotation - startRotation) * easeOutCubic;
      drawWheel();

      const normalizedAngle = (2 * Math.PI - (wheelState.currentRotation % (2 * Math.PI))) % (2 * Math.PI);
      const currentSlice = Math.floor(normalizedAngle / arcSize);
      if (currentSlice !== lastTickSlice) {
        playTickSound();
        lastTickSlice = currentSlice;
      }

      if (progress < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        wheelState.isSpinning = false;
        if (spinBtn) {
          spinBtn.disabled = false;
          spinBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }

        const winner = wheelState.appState.items[winningIndex];
        onWinnerSelected(winner);
      }
    }

    requestAnimationFrame(animateSpin);
  }

  function onWinnerSelected(winner) {
    playWinFanfare();

    const historyItem = {
      text: winner.text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toLocaleDateString()
    };

    wheelState.appState.history.unshift(historyItem);
    if (wheelState.appState.history.length > 50) {
      wheelState.appState.history.pop();
    }

    saveConfig();
    if (typeof window.renderHistory === 'function') {
      window.renderHistory();
    }

    const badge = document.getElementById('lastWinnerBadge');
    const winnerText = document.getElementById('winnerNameText');
    if (badge && winnerText) {
      winnerText.innerText = winner.text;
      badge.classList.remove('hidden');
    }

    openWinnerModal(winner.text, false);

    if (wheelState.appState.removeOnWin) {
      setTimeout(() => {
        wheelState.appState.items = wheelState.appState.items.filter((item) => item.id !== winner.id);
        saveConfig();
        if (typeof window.renderItems === 'function') {
          window.renderItems();
        }
        drawWheel();
        if (typeof window.updateCounts === 'function') {
          window.updateCounts();
        }
      }, 1000);
    }
  }

  function switchTab(tabName) {
    ['items', 'settings', 'history'].forEach((tabKey) => {
      const tab = document.getElementById(`tab-${tabKey}`);
      const tabBtn = document.getElementById(`tabBtn-${tabKey}`);
      if (tab) tab.classList.add('hidden');
      if (tabBtn) {
        tabBtn.className = 'flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition text-slate-400 hover:text-white hover:bg-slate-800/60';
      }
    });

    const activeTab = document.getElementById(`tab-${tabName}`);
    const activeBtn = document.getElementById(`tabBtn-${tabName}`);
    if (activeTab) activeTab.classList.remove('hidden');
    if (activeBtn) {
      activeBtn.className = 'flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition bg-indigo-600 text-white shadow-md shadow-indigo-600/20';
    }
  }

  function openWinnerModal(winnerName, isQuickPick) {
    const modal = document.getElementById('winnerModal');
    const nameEl = document.getElementById('modalWinnerName');
    if (!modal || !nameEl) return;

    if (isQuickPick) {
      if (wheelState.appState.items.length === 0) {
        alertUser('No items available to pick!');
        return;
      }
      const randomItem = wheelState.appState.items[Math.floor(Math.random() * wheelState.appState.items.length)];
      nameEl.innerText = randomItem.text;
      playWinFanfare();
    } else {
      nameEl.innerText = winnerName;
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
      modal.classList.remove('opacity-0');
      const dialog = modal.querySelector('div');
      if (dialog) {
        dialog.classList.remove('scale-95');
      }
    }, 10);
  }

  function closeWinnerModal(spinAgain) {
    const modal = document.getElementById('winnerModal');
    if (!modal) return;

    modal.classList.add('opacity-0');
    const dialog = modal.querySelector('div');
    if (dialog) {
      dialog.classList.add('scale-95');
    }

    setTimeout(() => {
      modal.classList.add('hidden');
      if (spinAgain) {
        spinWheel();
      }
    }, 300);
  }

  function exportConfig() {
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(wheelState.appState, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `decision_wheel_config_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  function importConfig(event) {
    const fileReader = new FileReader();
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    fileReader.readAsText(file, 'UTF-8');
    fileReader.onload = function (loadEvent) {
      try {
        const imported = JSON.parse(loadEvent.target.result);
        if (imported.items && Array.isArray(imported.items)) {
          wheelState.appState = { ...DEFAULT_CONFIG, ...imported };
          saveConfig();
          if (typeof window.renderAll === 'function') {
            window.renderAll();
          }
          showNotification('Configuration imported successfully!');
        } else {
          alertUser('Invalid configuration file format.');
        }
      } catch (error) {
        alertUser('Error parsing JSON configuration file.');
      }
    };
  }

  function getRandomColor() {
    const palette = PALETTES[wheelState.appState.palette] || PALETTES.vibrant;
    return palette[Math.floor(Math.random() * palette.length)];
  }

  function setPalette(paletteName) {
    wheelState.appState.palette = paletteName;
    wheelState.appState.items.forEach((item, index) => {
      item.color = PALETTES[paletteName][index % PALETTES[paletteName].length];
    });
    saveConfig();
    if (typeof window.renderAll === 'function') {
      window.renderAll();
    }
  }

  function alertUser(message) {
    alert(message);
  }

  function showNotification(message) {
    console.log('Notification:', message);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  const api = {
    DEFAULT_CONFIG,
    PALETTES,
    appState: wheelState.appState,
    saveConfig,
    loadConfig,
    updateStorageSizeBadge,
    resetToDefaults,
    initAudioContext,
    playTickSound,
    playWinFanfare,
    setupCanvasSize,
    drawWheel,
    spinWheel,
    onWinnerSelected,
    switchTab,
    openWinnerModal,
    closeWinnerModal,
    exportConfig,
    importConfig,
    getRandomColor,
    setPalette,
    alertUser,
    showNotification,
    escapeHtml
  };

  Object.assign(window, api);
  window.decisionWheel = { ...api, state: wheelState };
})();
