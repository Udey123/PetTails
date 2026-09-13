import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!booking_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify signature server-side
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const serviceClient = await getServiceClient();

    // Update payment status
    await serviceClient
      .from("payments")
      .update({ status: "paid", provider_payment_id: razorpay_payment_id })
      .eq("booking_id", booking_id)
      .eq("provider", "razorpay");

    // Update booking payment status
    await serviceClient
      .from("bookings")
      .update({ payment_status: "paid", status: "confirmed" })
      .eq("id", booking_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
