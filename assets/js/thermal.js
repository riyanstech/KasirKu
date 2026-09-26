/* ==========================================
   KasirKu — Thermal Printer (Bluetooth ESC/POS)
   Support 58mm & 80mm via Web Bluetooth API
   ========================================== */
window.KR = window.KR || {};

KR.thermal = (function () {
  'use strict';

  const STORAGE_KEY = 'thermalSettings';
  const DEVICE_KEY = 'thermalDevice';

  const SERVICE_UUIDS = [
    '000018f0-0000-1000-8000-00805f9b34fb',
    '0000ff00-0000-1000-8000-00805f9b34fb',
    '0000ffe0-0000-1000-8000-00805f9b34fb',
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
    '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  ];
  const CHAR_UUIDS = [
    '00002af1-0000-1000-8000-00805f9b34fb',
    '0000ff01-0000-1000-8000-00805f9b34fb',
    '0000ffe1-0000-1000-8000-00805f9b34fb',
    'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
    '49535343-8841-43f4-a8d4-ecbe34729bb3',
  ];

  const ESC = 0x1B, GS = 0x1D;
  const CMD = {
    INIT: [ESC, 0x40],
    LEFT: [ESC, 0x61, 0x00],
    CENTER: [ESC, 0x61, 0x01],
    RIGHT: [ESC, 0x61, 0x02],
    BOLD_ON: [ESC, 0x45, 0x01],
    BOLD_OFF: [ESC, 0x45, 0x00],
    BIG_ON: [GS, 0x21, 0x11],
    BIG_OFF: [GS, 0x21, 0x00],
    FEED3: [ESC, 0x64, 0x03],
    CUT: [GS, 0x56, 0x00],
  };

  const state = { device: null, characteristic: null, connected: false };

  // ===== SETTINGS =====
  function getSettings() {
    return KR.store.get(STORAGE_KEY, {
      paperWidth: 58,
      autoPrint: false,
      cutAfterPrint: true,
    });
  }
  function saveSettings(s) { KR.store.set(STORAGE_KEY, { ...getSettings(), ...s }); }

  // ===== SUPPORT CHECK =====
  function isSupported() { return !!(navigator.bluetooth && navigator.bluetooth.requestDevice); }
  function isConnected() { return !!(state.connected && state.device?.gatt?.connected); }
  function getDeviceName() { return state.device?.name || null; }

  // ===== CONNECT =====
  async function connect() {
    if (!isSupported()) throw new Error('Browser tidak support Web Bluetooth. Pakai Chrome Android / Chrome Desktop.');
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: SERVICE_UUIDS,
    });
    await _setupDevice(device);
    KR.store.set(DEVICE_KEY, { id: device.id, name: device.name || 'Printer' });
    return { id: device.id, name: device.name || 'Printer' };
  }

  async function _setupDevice(device) {
    const server = await device.gatt.connect();
    let characteristic = null;

    for (const suuid of SERVICE_UUIDS) {
      try {
        const svc = await server.getPrimaryService(suuid);
        const chars = await svc.getCharacteristics();
        for (const c of chars) {
          if (c.properties.write || c.properties.writeWithoutResponse) { characteristic = c; break; }
        }
        if (characteristic) break;
      } catch (e) { /* next */ }
    }

    if (!characteristic) {
      for (const cuuid of CHAR_UUIDS) {
        try {
          const svc = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb').catch(() => null);
          if (svc) { characteristic = await svc.getCharacteristic(cuuid); if (characteristic) break; }
        } catch (e) { /* next */ }
      }
    }

    if (!characteristic) throw new Error('Printer tidak support BLE write. Coba printer lain (harus BLE, bukan Classic).');

    state.device = device;
    state.characteristic = characteristic;
    state.connected = true;

    device.addEventListener('gattserverdisconnected', () => {
      state.connected = false;
      if (KR.toast) KR.toast.warn('Printer terputus');
      if (typeof window.updateThermalStatus === 'function') window.updateThermalStatus();
    });
  }

  async function disconnect() {
    try { if (state.device?.gatt?.connected) state.device.gatt.disconnect(); } catch (e) {}
    state.device = null; state.characteristic = null; state.connected = false;
  }

  async function autoReconnect() {
    if (!isSupported() || !navigator.bluetooth.getDevices) return false;
    const saved = KR.store.get(DEVICE_KEY);
    if (!saved) return false;
    try {
      const devices = await navigator.bluetooth.getDevices();
      const found = devices.find(d => d.id === saved.id);
      if (!found) return false;
      await _setupDevice(found);
      return true;
    } catch (e) { return false; }
  }

  // ===== ENCODING =====
  function _toBytes(str) {
    const out = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c === 0x2018 || c === 0x2019) c = 0x27;
      else if (c === 0x201C || c === 0x201D) c = 0x22;
      else if (c === 0x2013 || c === 0x2014) c = 0x2D;
      else if (c > 255) c = 0x3F;
      out.push(c & 0xFF);
    }
    return out;
  }
  function _line(w) { return '-'.repeat(w); }
  function _pad(text, width, align) {
    text = String(text || '');
    if (text.length >= width) return text.slice(0, width);
    const pad = width - text.length;
    if (align === 'right') return ' '.repeat(pad) + text;
    if (align === 'center') { const l = Math.floor(pad / 2); return ' '.repeat(l) + text + ' '.repeat(pad - l); }
    return text + ' '.repeat(pad);
  }
  function _money(n) { return Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function _date(ts) {
    if (typeof formatDate === 'function') return formatDate(ts);
    const d = new Date(ts), p = n => String(n).padStart(2, '0');
    const bln = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return `${p(d.getDate())} ${bln[d.getMonth()]} ${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function _buildReceipt(trx) {
    const s = getSettings();
    const store = KR.store.getSettings();
    const W = s.paperWidth === 80 ? 48 : 32;
    const buf = [];
    const push = (...a) => a.forEach(x => buf.push(...x));
    const txt = (str) => buf.push(..._toBytes(str));

    push(CMD.INIT);
    push(CMD.CENTER, CMD.BOLD_ON, CMD.BIG_ON);
    txt((store.storeName || 'KasirKu') + '\n');
    push(CMD.BIG_OFF, CMD.BOLD_OFF);
    if (store.storeAddress) txt(store.storeAddress + '\n');
    if (store.storePhone) txt('Telp: ' + store.storePhone + '\n');
    push(CMD.LEFT);
    txt(_line(W) + '\n');

    txt('No  : ' + trx.id + '\n');
    txt('Tgl : ' + _date(trx.at) + '\n');
    txt('Byr : ' + (trx.method || 'Cash') + '\n');
    txt(_line(W) + '\n');

    (trx.items || []).forEach(it => {
      txt(it.name + '\n');
      const left = `  ${it.qty} x ${_money(it.price)}`;
      const right = _money(it.price * it.qty);
      txt(_pad(left, W - right.length) + right + '\n');
    });
    txt(_line(W) + '\n');

    const row = (l, r) => txt(_pad(l, W - String(r).length) + r + '\n');
    row('Subtotal', _money(trx.subtotal));
    if (trx.discount > 0) row('Diskon', '-' + _money(trx.discount));
    push(CMD.BOLD_ON); row('TOTAL', _money(trx.total)); push(CMD.BOLD_OFF);
    row('Bayar', _money(trx.paid));
    row('Kembali', _money(trx.change));

    txt(_line(W) + '\n');
    push(CMD.CENTER);
    txt((store.receiptFooter || 'Terima kasih') + '\n\n');
    push(CMD.FEED3);
    if (s.cutAfterPrint) push(CMD.CUT);

    return new Uint8Array(buf);
  }

  // ===== PRINT =====
  async function _writeData(data) {
    if (!isConnected()) throw new Error('Printer belum terhubung');
    const CHUNK = 100;
    for (let i = 0; i < data.length; i += CHUNK) {
      const chunk = data.slice(i, i + CHUNK);
      if (state.characteristic.properties.writeWithoutResponse) {
        await state.characteristic.writeValueWithoutResponse(chunk);
      } else {
        await state.characteristic.writeValue(chunk);
      }
      await new Promise(r => setTimeout(r, 25));
    }
  }

  async function printReceipt(trx) {
    const data = _buildReceipt(trx);
    await _writeData(data);
    return true;
  }

  async function testPrint() {
    return printReceipt({
      id: 'TEST-' + Date.now().toString(36).toUpperCase(),
      at: Date.now(), method: 'Cash',
      items: [
        { name: 'Test Item 1', qty: 2, price: 5000 },
        { name: 'Contoh Nama Produk Panjang', qty: 1, price: 12500 },
      ],
      subtotal: 22500, discount: 0, total: 22500, paid: 25000, change: 2500,
    });
  }

  return {
    isSupported, isConnected, getDeviceName,
    connect, disconnect, autoReconnect,
    printReceipt, testPrint,
    getSettings, saveSettings,
  };
})();
