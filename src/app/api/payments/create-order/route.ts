import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/server";
import Razorpay from "razorpay";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { booking_id, amount } = body;

    if (!booking_id || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const order = await razorpay.orders.create({
      amount: amount * 100, // Razorpay uses paise
      currency: "INR",
      receipt: booking_id,
    });

    // Create payment record
    const serviceClient = await getServiceClient();
    await serviceClient.from("payments").insert({
      booking_id,
      user_id: "", // Will be updated via webhook
      amount,
      provider: "razorpay",
      provider_payment_id: order.id,
      status: "pending",
    });

    return NextResponse.json({
      razorpay_order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create payment order" },
      { status: 500 }
    );
  }
}
