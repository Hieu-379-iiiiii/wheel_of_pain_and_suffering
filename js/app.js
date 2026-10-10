(function () {
  function renderItems() {
    const container = document.getElementById('itemsListContainer');
    if (!container) return;

    container.innerHTML = '';

    const items = window.decisionWheel.state.appState.items;
    if (items.length === 0) {
      container.innerHTML = '<div class="text-center py-8 text-xs text-slate-500">No items in wheel. Add some above!</div>';
      return;
    }

    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-2 bg-slate-950 border border-slate-800/80 p-2 rounded-xl group hover:border-slate-700 transition';
      row.innerHTML = `
        <input type="color" value="${item.color || '#6366f1'}" onchange="updateItemColor(${item.id}, this.value)" class="w-7 h-7 rounded-lg bg-transparent cursor-pointer border-0">
        <input type="text" value="${window.escapeHtml(item.text)}" onblur="updateItemText(${item.id}, this.value)" class="flex-1 bg-transparent text-xs text-slate-200 focus:outline-none px-1 border-b border-transparent focus:border-indigo-500 transition">
        <button onclick="deleteItem(${item.id})" class="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-900 transition text-xs" title="Delete item">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;
      container.appendChild(row);
    });
  }

  function renderHistory() {
    const container = document.getElementById('historyListContainer');
    if (!container) return;

    container.innerHTML = '';
    const history = window.decisionWheel.state.appState.history;

    if (history.length === 0) {
      container.innerHTML = '<div class="text-center py-8 text-xs text-slate-500">No spin history yet. Spin the wheel!</div>';
      return;
    }

    history.forEach((entry, index) => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between bg-slate-950 border border-slate-800/80 px-3 py-2.5 rounded-xl text-xs';
      row.innerHTML = `
        <div class="flex items-center gap-2.5">
          <span class="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">${history.length - index}</span>
          <span class="font-semibold text-white">${window.escapeHtml(entry.text)}</span>
        </div>
        <span class="text-[10px] text-slate-500">${entry.time}</span>
      `;
      container.appendChild(row);
    });
  }

  function renderAll() {
    renderItems();
    renderHistory();
    syncSettingsUI();
    updateCounts();
    window.decisionWheel.drawWheel();
    window.decisionWheel.updateStorageSizeBadge();
  }

  function updateCounts() {
    const count = window.decisionWheel.state.appState.items.length;
    const activeCount = document.getElementById('activeCount');
    const tabItemCount = document.getElementById('tabItemCount');
    if (activeCount) activeCount.innerText = count;
    if (tabItemCount) tabItemCount.innerText = count;
  }

  function syncSettingsUI() {
    const toggleRemoveOnWin = document.getElementById('toggleRemoveOnWin');
    const toggleSound = document.getElementById('toggleSound');
    const spinDurationRange = document.getElementById('spinDurationRange');
    const spinSpeedRange = document.getElementById('spinSpeedRange');
    const durationVal = document.getElementById('durationVal');
    const speedVal = document.getElementById('speedVal');
    const statusRemoveOnWin = document.getElementById('statusRemoveOnWin');

    if (!toggleRemoveOnWin || !toggleSound || !spinDurationRange || !spinSpeedRange) return;

    toggleRemoveOnWin.checked = window.decisionWheel.state.appState.removeOnWin;
    toggleSound.checked = window.decisionWheel.state.appState.soundEnabled;
    spinDurationRange.value = window.decisionWheel.state.appState.duration;
    spinSpeedRange.value = window.decisionWheel.state.appState.speed;

    if (durationVal) durationVal.innerText = `${window.decisionWheel.state.appState.duration.toFixed(1)}s`;
    if (speedVal) speedVal.innerText = `${window.decisionWheel.state.appState.speed}x`;
    if (statusRemoveOnWin) statusRemoveOnWin.innerText = window.decisionWheel.state.appState.removeOnWin ? 'On' : 'Off';
  }

  function updateSettings() {
    const appState = window.decisionWheel.state.appState;
    const toggleRemoveOnWin = document.getElementById('toggleRemoveOnWin');
    const toggleSound = document.getElementById('toggleSound');
    const spinDurationRange = document.getElementById('spinDurationRange');
    const spinSpeedRange = document.getElementById('spinSpeedRange');

    if (toggleRemoveOnWin) appState.removeOnWin = toggleRemoveOnWin.checked;
    if (toggleSound) appState.soundEnabled = toggleSound.checked;
    if (spinDurationRange) appState.duration = parseFloat(spinDurationRange.value);
    if (spinSpeedRange) appState.speed = parseInt(spinSpeedRange.value, 10);

    const durationVal = document.getElementById('durationVal');
    const speedVal = document.getElementById('speedVal');
    const statusRemoveOnWin = document.getElementById('statusRemoveOnWin');
    if (durationVal) durationVal.innerText = `${appState.duration.toFixed(1)}s`;
    if (speedVal) speedVal.innerText = `${appState.speed}x`;
    if (statusRemoveOnWin) statusRemoveOnWin.innerText = appState.removeOnWin ? 'On' : 'Off';

    window.decisionWheel.saveConfig();
  }

  function addItem() {
    const input = document.getElementById('newItemInput');
    if (!input) return;

    const value = input.value.trim();
    if (!value) return;

    window.decisionWheel.state.appState.items.push({
      id: Date.now(),
      text: value,
      color: window.decisionWheel.getRandomColor()
    });

    input.value = '';
    window.decisionWheel.saveConfig();
    renderAll();
  }

  function deleteItem(id) {
    window.decisionWheel.state.appState.items = window.decisionWheel.state.appState.items.filter((item) => item.id !== id);
    window.decisionWheel.saveConfig();
    renderAll();
  }

  function updateItemText(id, newText) {
    const item = window.decisionWheel.state.appState.items.find((entry) => entry.id === id);
    if (!item) return;

    item.text = newText.trim() || 'Untitled';
    window.decisionWheel.saveConfig();
    window.decisionWheel.drawWheel();
  }

  function updateItemColor(id, newColor) {
    const item = window.decisionWheel.state.appState.items.find((entry) => entry.id === id);
    if (!item) return;

    item.color = newColor;
    window.decisionWheel.saveConfig();
    window.decisionWheel.drawWheel();
  }

  function shuffleItems() {
    const items = window.decisionWheel.state.appState.items;
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    window.decisionWheel.saveConfig();
    renderAll();
  }

  function clearAllItems() {
    if (confirm('Remove all items from the wheel?')) {
      window.decisionWheel.state.appState.items = [];
      window.decisionWheel.saveConfig();
      renderAll();
    }
  }

  function bulkAddItems() {
    const textarea = document.getElementById('bulkInput');
    if (!textarea) return;

    const text = textarea.value.trim();
    if (!text) return;

    const lines = text.split(/[\n,]+/).map((entry) => entry.trim()).filter((entry) => entry.length > 0);
    lines.forEach((line) => {
      window.decisionWheel.state.appState.items.push({
        id: Date.now() + Math.random(),
        text: line,
        color: window.decisionWheel.getRandomColor()
      });
    });

    textarea.value = '';
    window.decisionWheel.saveConfig();
    renderAll();
    window.decisionWheel.showNotification(`Imported ${lines.length} items successfully!`);
  }

  function clearHistory() {
    window.decisionWheel.state.appState.history = [];
    window.decisionWheel.saveConfig();
    renderHistory();
  }

  function initializeDecisionWheel() {
    window.decisionWheel.loadConfig();
    window.decisionWheel.initAudioContext();
    window.decisionWheel.setupCanvasSize();
    renderAll();

    window.addEventListener('resize', () => {
      window.decisionWheel.setupCanvasSize();
      window.decisionWheel.drawWheel();
    });
  }

  window.renderAll = renderAll;
  window.renderItems = renderItems;
  window.renderHistory = renderHistory;
  window.updateCounts = updateCounts;
  window.syncSettingsUI = syncSettingsUI;
  window.updateSettings = updateSettings;
  window.addItem = addItem;
  window.deleteItem = deleteItem;
  window.updateItemText = updateItemText;
  window.updateItemColor = updateItemColor;
  window.shuffleItems = shuffleItems;
  window.clearAllItems = clearAllItems;
  window.bulkAddItems = bulkAddItems;
  window.clearHistory = clearHistory;
  window.switchTab = window.switchTab || window.decisionWheel.switchTab;
  window.initDecisionWheel = initializeDecisionWheel;
})();
