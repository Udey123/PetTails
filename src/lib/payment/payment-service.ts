/**
 * Payment Service Abstraction
 *
 * Current provider: demo (temporary internal payment state)
 * Future provider: razorpay
 *
 * Replace this provider by:
 * 1. Installing the real payment SDK (e.g. razorpay)
 * 2. Creating a new provider class that implements PaymentProvider
 * 3. Updating getPaymentProvider() to return the real provider
 */

export interface PaymentResult {
  success: boolean;
  provider: string;
  payment_id: string;
  amount: number;
  currency: string;
  error?: string;
}

export interface PaymentProvider {
  name: string;
  processPayment(bookingId: string, amount: number): Promise<PaymentResult>;
  verifyPayment(bookingId: string, paymentData: Record<string, string>): Promise<PaymentResult>;
}

class DemoPaymentProvider implements PaymentProvider {
  name = "demo";

  async processPayment(bookingId: string, amount: number): Promise<PaymentResult> {
    const paymentId = `demo_pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return {
      success: true,
      provider: "demo",
      payment_id: paymentId,
      amount,
      currency: "INR",
    };
  }

  async verifyPayment(_bookingId: string, _paymentData: Record<string, string>): Promise<PaymentResult> {
    return {
      success: true,
      provider: "demo",
      payment_id: _paymentData.razorpay_payment_id || `demo_pay_${Date.now()}`,
      amount: 0,
      currency: "INR",
    };
  }
}

// Future: Replace with real Razorpay provider
// class RazorpayPaymentProvider implements PaymentProvider {
//   name = "razorpay";
//   private razorpay: Razorpay;
//   constructor() {
//     this.razorpay = new Razorpay({
//       key_id: process.env.RAZORPAY_KEY_ID!,
//       key_secret: process.env.RAZORPAY_KEY_SECRET!,
//     });
//   }
//   async processPayment(bookingId: string, amount: number) {
//     const order = await this.razorpay.orders.create({
//       amount: amount * 100,
//       currency: "INR",
//       receipt: bookingId,
//     });
//     return { success: true, provider: "razorpay", payment_id: order.id, amount, currency: "INR" };
//   }
//   async verifyPayment(bookingId: string, paymentData: Record<string, string>) {
//     const expectedSig = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
//       .update(`${paymentData.razorpay_order_id}|${paymentData.razorpay_payment_id}`)
//       .digest("hex");
//     if (expectedSig === paymentData.razorpay_signature) {
//       return { success: true, provider: "razorpay", payment_id: paymentData.razorpay_payment_id, amount: 0, currency: "INR" };
//     }
//     return { success: false, provider: "razorpay", payment_id: "", amount: 0, currency: "INR", error: "Invalid signature" };
//   }
// }

export function getPaymentProvider(): PaymentProvider {
  // Switch this to return RazorpayPaymentProvider() when ready
  return new DemoPaymentProvider();
}
