/* ==========================================
   KasirKu — AI Vision Module
   Kenali produk dari foto
   Provider: Gemini / Groq / OpenAI
   ========================================== */
window.KR = window.KR || {};

KR.vision = (function () {
  'use strict';

  const CACHE_KEY = 'visionCache';
  const AI_CONFIG_KEY = 'aiConfig';

  const PROVIDERS = {
   gemini: {
     name: 'Google Gemini',
     icon: '✨',
     endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
     model: 'gemini-3.6-flash',
     keyUrl: 'https://aistudio.google.com/app/apikey',
     desc: 'Gratis, akurasi tinggi, cocok untuk produk warung',
     format: 'gemini',
   },
   groq: {
     name: 'Groq (Gratis & Cepat)',
     icon: '⚡',
     endpoint: 'https://api.groq.com/openai/v1/chat/completions',
     model: 'meta-llama/llama-4-scout-17b-16e-instruct',   // ← MODEL BARU
     keyUrl: 'https://console.groq.com/keys',
     desc: 'Gratis, sangat cepat',
     format: 'openai',
   },
    openai: {
      name: 'OpenAI GPT-4o (Berbayar)',
      icon: '🤖',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o-mini',
      keyUrl: 'https://platform.openai.com/api-keys',
      desc: 'Akurasi terbaik, perlu bayar',
      format: 'openai',
    },
  };

  const SYSTEM_PROMPT = `Anda adalah sistem kasir warung Indonesia. Tugas: identifikasi produk retail dalam foto.

ATURAN:
1. Fokus produk warung: makanan instan, minuman, rokok, snack, sembako, kebersihan
2. Sebutkan MERK + VARIAN lengkap (contoh: "Indomie Goreng", bukan "mie instan")
3. Sebutkan ukuran jika terlihat (contoh: "85g", "1 liter", "12 pcs")
4. Kategori yang valid: Makanan Instan, Minuman, Rokok, Snack, Sembako, Kebersihan, Lainnya

FORMAT OUTPUT - HARUS JSON valid, tanpa teks lain di luar JSON:
{
  "identified": true,
  "products": [
    {
      "name": "Indomie Goreng",
      "brand": "Indomie",
      "variant": "Goreng",
      "size": "85g",
      "category": "Makanan Instan",
      "confidence": 95
    }
  ],
  "notes": ""
}

ATURAN OUTPUT:
- Maksimal 3 kemungkinan, urutkan dari paling yakin (confidence tertinggi)
- Jika foto tidak jelas / bukan produk retail: identified=false, products=[]
- Confidence dalam persen (0-100)
- JANGAN tambahkan penjelasan apapun di luar JSON`;

  let _config = null;
  let _cache = null;

  /* ---------- CONFIG ---------- */
  function getConfig() {
    if (!_config) {
      _config = KR.store.get(AI_CONFIG_KEY, null);
    }
    return _config || { enabled: false, provider: 'gemini', apiKey: '' };
  }
  function saveConfig(cfg) {
    _config = { ...getConfig(), ...cfg };
    KR.store.set(AI_CONFIG_KEY, _config);
  }
  function isEnabled() {
    const c = getConfig();
    return !!(c.enabled && c.apiKey && c.apiKey.length > 10);
  }

  /* ---------- CACHE ---------- */
  function getCache() {
    if (!_cache) {
      _cache = KR.store.get(CACHE_KEY, {});
    }
    return _cache;
  }
  function saveCache() {
    KR.store.set(CACHE_KEY, _cache || {});
  }
  function hashImage(base64) {
    const str = String(base64 || '').slice(0, 3000);
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return 'h' + h.toString(36);
  }
  function cacheLookup(base64) {
    const h = hashImage(base64);
    const productId = getCache()[h];
    if (!productId) return null;
    return KR.store.findProductById(productId);
  }
  function cacheSave(base64, productId) {
    const h = hashImage(base64);
    _cache = getCache();
    _cache[h] = productId;
    const keys = Object.keys(_cache);
    if (keys.length > 500) {
      keys.slice(0, 100).forEach(k => delete _cache[k]);
    }
    saveCache();
  }
  function clearCache() {
    _cache = {};
    saveCache();
  }

  /* ---------- HELPERS ---------- */
  function stripDataUrl(base64) {
    return String(base64 || '').replace(/^data:image\/\w+;base64,/, '');
  }

  function parseJsonResponse(text) {
    let cleaned = String(text || '').trim();
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first === -1 || last === -1) throw new Error('AI tidak mengembalikan JSON valid');
    return JSON.parse(cleaned.slice(first, last + 1));
  }

  /* ---------- API CALLS ---------- */
  async function callGemini(apiKey, imageBase64) {
    const provider = PROVIDERS.gemini;
    const endpoint = provider.endpoint.replace('{model}', provider.model) + '?key=' + apiKey;
    const base64 = stripDataUrl(imageBase64);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: SYSTEM_PROMPT },
            { inlineData: { mimeType: 'image/jpeg', data: base64 } },
          ],
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return parseJsonResponse(text);
  }

  async function callOpenAICompatible(apiKey, imageBase64, providerId) {
    const provider = PROVIDERS[providerId];
    const dataUrl = imageBase64.startsWith('data:')
      ? imageBase64
      : 'data:image/jpeg;base64,' + imageBase64;

    const res = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Identifikasi produk dalam foto ini.' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    return parseJsonResponse(text);
  }

  /* ---------- FUZZY MATCH ---------- */
  function normalize(str) {
    return String(str || '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function fuzzyScore(query, target) {
    const q = normalize(query);
    const t = normalize(target);
    if (!q || !t) return 0;
    if (t === q) return 1;
    if (t.includes(q) || q.includes(t)) return 0.85;
    const qTokens = new Set(q.split(' '));
    const tTokens = new Set(t.split(' '));
    let overlap = 0;
    qTokens.forEach(tok => { if (tTokens.has(tok)) overlap++; });
    if (!overlap) return 0;
    return (overlap / Math.max(qTokens.size, tTokens.size)) * 0.7;
  }
  function findProductMatches(aiCandidate) {
    const products = KR.store.getProducts();
    const queries = [
      aiCandidate.name,
      (aiCandidate.brand || '') + ' ' + (aiCandidate.variant || ''),
      aiCandidate.brand,
    ].filter(Boolean);

    const scored = products.map(p => {
      let best = 0;
      queries.forEach(q => {
        best = Math.max(best, fuzzyScore(q, p.name));
        best = Math.max(best, fuzzyScore(q, p.sku));
      });
      return { product: p, score: best };
    }).filter(x => x.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return scored;
  }

  /* ---------- PUBLIC ---------- */
  async function identify(imageBase64) {
    const cfg = getConfig();
    if (!cfg.apiKey) throw new Error('API Key belum diatur');
    if (cfg.provider === 'gemini') return callGemini(cfg.apiKey, imageBase64);
    return callOpenAICompatible(cfg.apiKey, imageBase64, cfg.provider);
  }

  async function testConnection() {
    const cfg = getConfig();
    if (!cfg.apiKey) throw new Error('API Key belum diatur');
    const dummy = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    return identify(dummy);
  }

  return {
    PROVIDERS,
    getConfig, saveConfig, isEnabled,
    identify, testConnection,
    cacheLookup, cacheSave, clearCache,
    findProductMatches, fuzzyScore,
  };
})();
