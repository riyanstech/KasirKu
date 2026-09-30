import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json();
    const { product_id, target_number, customer_name, customer_phone, notes } = body;

    if (!product_id || !target_number) {
      return jsonResponse({ error: "product_id & target_number wajib" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: product, error: prodErr } = await supabase
      .from("digital_products")
      .select("*")
      .eq("id", product_id)
      .eq("is_active", true)
      .single();

    if (prodErr || !product) {
      return jsonResponse({ error: "Produk tidak ditemukan atau tidak aktif" }, 404);
    }

    const orderId = crypto.randomUUID();
    // ➕ TAMBAHKAN 3 BARIS INI
    const orderCode = "DGT" + Date.now().toString(36).toUpperCase() +
                      Math.random().toString(36).slice(2, 5).toUpperCase();
    const playerUsername = "user_" + orderId.slice(0, 8);

    const npResponse = await fetch(
      "https://merchant.nasionalpay.com/api/payment/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          key: Deno.env.get("NASIONALPAY_STORE_KEY"),
          channel: "QRIS",
          amount: Math.round(product.price_sell),
          player_username: playerUsername,
        }),
      }
    );

    const npData = await npResponse.json();

    if (!npData.success) {
      console.error("[NasionalPay Error]", npData);
      return jsonResponse({ error: npData.message || "Gagal membuat QRIS" }, 500);
    }

    const { data: order, error: orderErr } = await supabase
      .from("digital_orders")
      .insert({
        id: orderId,
        seller_id: product.seller_id,
        product_id: product.id,
        product_name: product.name,
        product_category: product.category,
        product_provider: product.provider,
        denomination: product.denomination,
        customer_name: customer_name || null,
        customer_phone: customer_phone || null,
        target_number: target_number,
        target_note: notes || null,
        amount: product.price_sell,
        status: "pending",
        order_code: orderCode,   // 👈 TAMBAH BARIS INI
        np_transaction_id: npData.data.transaction_id,
        np_qris_url: npData.data.qris_image,
        np_qris_data: npData.data.qris_data,
        np_expired_at: npData.data.expired_at,
      })
      .select()
      .single();

    if (orderErr) {
      console.error("[DB Error]", orderErr);
      return jsonResponse({ error: "Gagal simpan order" }, 500);
    }

    return jsonResponse({
      success: true,
      order_id: order.id,
      order_code: order.order_code, 
      transaction_id: npData.data.transaction_id,
      qris_image: npData.data.qris_image,
      qris_data: npData.data.qris_data,
      amount: npData.data.amount,
      expired_at: npData.data.expired_at,
      instruction: npData.data.instruction,
    });
  } catch (err) {
    console.error("[create-payment]", err);
    return jsonResponse({ error: err.message || "Server error" }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
