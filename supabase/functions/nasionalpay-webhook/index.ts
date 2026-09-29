import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req) => {
  try {
    const rawBody = await req.text();
    console.log("[Webhook] Received:", rawBody);

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (!payload?.data?.transaction_id || !payload?.data?.status) {
      return new Response("Invalid payload", { status: 400 });
    }

    const { transaction_id, status } = payload.data;

    if (status !== "success") {
      console.log("[Webhook] Skip status:", status);
      return ok();
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error } = await supabase
      .from("digital_orders")
      .update({
        status: "paid",
        np_paid_at: new Date().toISOString(),
      })
      .eq("np_transaction_id", transaction_id)
      .eq("status", "pending")
      .select()
      .single();

    if (error) {
      console.warn("[Webhook] Update warning:", error.message);
    }

    if (order) {
      console.log("[Webhook] Order paid:", order.id, order.product_name);
    }

    return ok();
  } catch (err) {
    console.error("[Webhook Error]", err);
    return new Response("Error", { status: 500 });
  }
});

function ok() {
  return new Response(JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}