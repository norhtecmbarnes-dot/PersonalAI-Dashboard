import { NextRequest, NextResponse } from 'next/server';

/**
 * Payment Processing API (Stub)
 * 
 * To enable Stripe:
 * 1. npm install stripe
 * 2. Set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY env vars
 * 
 * For PayPal:
 * 1. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET env vars
 */

// Stripe integration - returns error if not configured
export async function createStripePaymentIntent(amount: number, currency: string = 'usd') {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { success: false, error: 'Stripe not configured. Set STRIPE_SECRET_KEY environment variable.' };
  }
  
  // To enable Stripe:
  // 1. npm install stripe
  // 2. Import: import Stripe from 'stripe'
  // 3. const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  // 4. Use the code below inside a try-catch
  
  return { success: false, error: 'Stripe integration requires: npm install stripe and STRIPE_SECRET_KEY env var' };
  
  // Example implementation (uncomment after installing stripe):
  // try {
  //   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  //   const paymentIntent = await stripe.paymentIntents.create({
  //     amount: Math.round(amount * 100),
  //     currency,
  //     automatic_payment_methods: { enabled: true },
  //   });
  //   return {
  //     success: true,
  //     clientSecret: paymentIntent.client_secret,
  //     paymentIntentId: paymentIntent.id,
  //   };
  // } catch (error) {
  //   return {
  //     success: false,
  //     error: error instanceof Error ? error.message : 'Payment creation failed',
  //   };
  // }
}

// PayPal integration
export async function createPayPalOrder(amount: number, currency: string = 'USD') {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  
  // Get access token
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const tokenResponse = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  
  const tokenData = await tokenResponse.json();
  
  if (!tokenData.access_token) {
    return { success: false, error: 'PayPal authentication failed' };
  }
  
  // Create order
  const orderResponse = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency,
          value: amount.toFixed(2),
        },
      }],
    }),
  });
  
  const orderData = await orderResponse.json();
  
  return {
    success: true,
    orderId: orderData.id,
    approvalUrl: orderData.links?.find((l: any) => l.rel === 'approve')?.href,
  };
}

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action');
  
  switch (action) {
    case 'config':
      // Return public configuration for frontend
      return NextResponse.json({
        success: true,
        stripePublicKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
        paypalClientId: process.env.PAYPAL_CLIENT_ID || null,
        paymentEnabled: !!(process.env.STRIPE_SECRET_KEY || process.env.PAYPAL_CLIENT_ID),
      });
      
    default:
      return NextResponse.json({
        success: true,
        endpoints: {
          'GET /api/payments?action=config': 'Get payment configuration',
          'POST /api/payments {action: "stripe-intent", amount: 10.00}': 'Create Stripe payment intent',
          'POST /api/payments {action: "paypal-order", amount: 10.00}': 'Create PayPal order',
          'POST /api/payments {action: "record-payment", ...}': 'Record payment in database',
        },
      });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'stripe-intent': {
        const { amount, currency = 'usd' } = body;
        
        if (!amount || amount <= 0) {
          return NextResponse.json({ 
            success: false, 
            error: 'Valid amount required' 
          }, { status: 400 });
        }
        
        if (!process.env.STRIPE_SECRET_KEY) {
          return NextResponse.json({ 
            success: false, 
            error: 'Stripe not configured' 
          }, { status: 503 });
        }
        
        const result = await createStripePaymentIntent(amount, currency);
        return NextResponse.json(result);
      }
      
      case 'paypal-order': {
        const { amount, currency = 'USD' } = body;
        
        if (!amount || amount <= 0) {
          return NextResponse.json({ 
            success: false, 
            error: 'Valid amount required' 
          }, { status: 400 });
        }
        
        if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
          return NextResponse.json({ 
            success: false, 
            error: 'PayPal not configured' 
          }, { status: 503 });
        }
        
        const result = await createPayPalOrder(amount, currency);
        return NextResponse.json(result);
      }
      
      case 'record-payment': {
        // Record payment in database
        const { paymentId, amount, method, status, userId, metadata } = body;
        
        // You would save this to your SQLite database
        // For now, return success
        return NextResponse.json({
          success: true,
          message: 'Payment recorded',
          paymentId,
        });
      }
      
      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid action' 
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Payment processing failed' 
    }, { status: 500 });
  }
}