import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import crypto from "crypto";

// Razorpay webhook handler
export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    const serviceClient = await getServiceClient();

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;

      // Update payment record
      await serviceClient
        .from("payments")
        .update({ status: "paid", provider_payment_id: payment.id })
        .eq("provider_payment_id", payment.order_id);

      // Update booking
      if (payment.receipt) {
        await serviceClient
          .from("bookings")
          .update({ payment_status: "paid", status: "confirmed" })
          .eq("id", payment.receipt);
      }
    }

    if (event.event === "payment.failed") {
      const payment = event.payload.payment.entity;

      await serviceClient
        .from("payments")
        .update({ status: "failed" })
        .eq("provider_payment_id", payment.order_id);

      if (payment.receipt) {
        await serviceClient
          .from("bookings")
          .update({ payment_status: "failed" })
          .eq("id", payment.receipt);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
