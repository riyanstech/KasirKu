/* ==========================================
   KasirKu — Supabase Module
   ========================================== */
window.KR = window.KR || {};

const SUPABASE_URL = 'https://tfgemkitmnuqiiclepqw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_eO-jDODnzgSKvujTRT5nZw_BJy36AA0';

if (typeof supabase === 'undefined') {
  console.error('[Supabase] SDK belum dimuat!');
}

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    storage: window.localStorage,
    storageKey: 'kasirku-auth-token',
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
window.supabaseClient = supabaseClient;

KR.sb = (function () {
  'use strict';
  const client = supabaseClient;

  /* ---------- AUTH ---------- */
  async function getSession() {
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    return session;
  }
  async function getUser() {
    const { data: { user }, error } = await client.auth.getUser();
    if (error) throw error;
    return user;
  }
  async function signUp(email, password, meta = {}) {
    const { data, error } = await client.auth.signUp({ email, password, options: { data: meta } });
    if (error) throw error;
    return data;
  }
  async function signIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }
  async function signOut() {
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  /* ---------- PROFILE ---------- */
  async function getProfile() {
    const user = await getUser();
    if (!user) return null;
    const { data, error } = await client.from('profiles').select('*').eq('id', user.id).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
  async function updateProfile(updates) {
    const user = await getUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await client
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  /* ---------- PRODUCTS ---------- */
  async function fetchProducts() {
    const { data, error } = await client.from('products').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
  async function insertProduct(p) {
    const user = await getUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await client.from('products').insert({
      user_id: user.id,
      name: p.name,
      sku: p.sku || null,
      cost: p.cost || 0,
      price: p.price || 0,
      stock: p.stock || 0,
      category: p.category || null,
      image_url: p.image || null,
      is_online: p.is_online === true,
      needs_address: p.needs_address === true,
      online_price: p.online_price != null ? Number(p.online_price) : null,
    }).select().single();
    if (error) throw error;
    return data;
  }
  async function updateProductDb(id, updates) {
    const payload = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.sku !== undefined) payload.sku = updates.sku;
    if (updates.cost !== undefined) payload.cost = updates.cost;
    if (updates.price !== undefined) payload.price = updates.price;
    if (updates.stock !== undefined) payload.stock = updates.stock;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.image !== undefined) payload.image_url = updates.image;
    if (updates.is_online !== undefined) payload.is_online = updates.is_online;
    if (updates.needs_address !== undefined) payload.needs_address = updates.needs_address;
    if (updates.online_price !== undefined) {
      payload.online_price = updates.online_price != null ? Number(updates.online_price) : null;
    }

    const { data, error } = await client.from('products').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  async function deleteProductDb(id) {
    const { error } = await client.from('products').delete().eq('id', id);
    if (error) throw error;
  }

  /* ---------- TRANSACTIONS ---------- */
  async function fetchTransactions() {
    const { data, error } = await client.from('transactions').select('*').order('created_at', { ascending: false }).limit(500);
    if (error) throw error;
    return data || [];
  }
  async function insertTransaction(trx) {
    const user = await getUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await client.from('transactions').insert({
      user_id: user.id,
      trx_code: trx.id,
      items: trx.items,
      subtotal: trx.subtotal,
      discount: trx.discount || 0,
      total: trx.total,
      paid: trx.paid,
      change_amount: trx.change,
      method: trx.method,
      item_count: trx.itemCount,
    }).select().single();
    if (error) throw error;
    return data;
  }
  async function deleteTransactionDb(id) {
    const { error } = await client.from('transactions').delete().eq('id', id);
    if (error) throw error;
  }

  /* ---------- ONLINE ORDERS ---------- */
  async function fetchOnlineOrders() {
    const user = await getUser();
    if (!user) throw new Error('Belum login');
    const { data, error } = await client
      .from('online_orders')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    return data || [];
  }
  async function updateOnlineOrderStatus(id, status) {
    const { data, error } = await client
      .from('online_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  async function archiveOnlineOrder(id, archived) {
    const { data, error } = await client
      .from('online_orders')
      .update({ archived: !!archived, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  async function deleteOnlineOrder(id) {
    const { error } = await client.from('online_orders').delete().eq('id', id);
    if (error) throw error;
  }
  async function deletePaymentProof(publicUrl) {
    if (!publicUrl) return;
    const match = publicUrl.match(/\/payment-proofs\/(.+)$/);
    if (!match) return;
    const path = decodeURIComponent(match[1]);
    const { error } = await client.storage.from('payment-proofs').remove([path]);
    if (error) console.warn('[Delete proof]', error);
  }

  /* ---------- STORAGE (PRODUCT PHOTOS) ---------- */
  async function uploadPhoto(base64DataUrl, productId) {
    const user = await getUser();
    if (!user) throw new Error('Belum login');
    const res = await fetch(base64DataUrl);
    const blob = await res.blob();
    if (!blob || blob.size === 0) throw new Error('Data foto kosong');
    const filename = `${user.id}/${productId}.jpg`;
    const { error } = await client.storage.from('product-photos').upload(filename, blob, {
      contentType: 'image/jpeg', upsert: true,
    });
    if (error) throw error;
    const { data: urlData } = client.storage.from('product-photos').getPublicUrl(filename);
    return urlData.publicUrl;
  }
  async function deletePhoto(imageUrl) {
    if (!imageUrl) return;
    const user = await getUser();
    if (!user) return;
    const match = imageUrl.match(/\/product-photos\/(.+)$/);
    if (!match) return;
    const path = decodeURIComponent(match[1]);
    if (!path.startsWith(user.id + '/')) return;
    const { error } = await client.storage.from('product-photos').remove([path]);
    if (error) console.warn('[Delete photo]', error);
  }

  return {
    client,
    getSession, getUser, signUp, signIn, signOut,
    getProfile, updateProfile,
    fetchProducts, insertProduct, updateProductDb, deleteProductDb,
    fetchTransactions, insertTransaction, deleteTransactionDb,
    fetchOnlineOrders, updateOnlineOrderStatus, archiveOnlineOrder,
    deleteOnlineOrder, deletePaymentProof,
    uploadPhoto, deletePhoto,
  };
})();

console.log('%c[Supabase] Ready', 'color:#3ecf8e;font-weight:800;');
