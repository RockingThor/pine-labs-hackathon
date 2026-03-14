import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import posthog from 'posthog-js';
import { useSession } from '../SessionContext';
import { EVENT_TYPES } from '@repo/shared';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

const PRODUCTS = [
  { id: 'prod-1', name: 'Wireless Headphones' },
  { id: 'prod-2', name: 'USB-C Hub' },
  { id: 'prod-3', name: 'Desk Lamp' },
];

export function DemoFlow() {
  const { sessionId, ready } = useSession();
  const navigate = useNavigate();
  const [cart, setCart] = useState<Set<string>>(new Set());
  const [viewingProduct, setViewingProduct] = useState<typeof PRODUCTS[0] | null>(null);
  const [checkoutStarted, setCheckoutStarted] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulateResult, setSimulateResult] = useState<string | null>(null);

  const track = (event: string, props?: Record<string, unknown>) => {
    if (typeof posthog?.capture === 'function') {
      posthog.capture(event, props);
    }
  };

  const openProduct = (product: (typeof PRODUCTS)[0]) => {
    setViewingProduct(product);
    track(EVENT_TYPES.PRODUCT_VIEWED, {
      product_id: product.id,
      product_name: product.name,
      pathname: `/product/${product.id}`,
    });
  };

  const addToCart = (product: (typeof PRODUCTS)[0]) => {
    setCart((prev) => new Set(prev).add(product.id));
    track(EVENT_TYPES.ADD_TO_CART, {
      product_id: product.id,
      product_name: product.name,
    });
  };

  const startCheckout = () => {
    setCheckoutStarted(true);
    track(EVENT_TYPES.CHECKOUT_STARTED);
  };

  const simulatePaymentFailure = async () => {
    if (!sessionId) return;
    setSimulating(true);
    setSimulateResult(null);
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/simulate-payment-failure`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSimulateResult('Coupon generated and email sent (or skipped if no RESEND_API_KEY).');
        track(EVENT_TYPES.PAYMENT_FAILED, { simulated: true });
      } else {
        setSimulateResult(`Error: ${data.error ?? res.statusText}`);
      }
    } catch (e) {
      setSimulateResult(`Request failed: ${e instanceof Error ? e.message : 'Unknown'}`);
    } finally {
      setSimulating(false);
    }
  };

  if (!ready) {
    return <p>Loading session…</p>;
  }

  if (viewingProduct) {
    return (
      <div>
        <button type="button" onClick={() => setViewingProduct(null)}>
          ← Back to list
        </button>
        <h1>{viewingProduct.name}</h1>
        <p>Product ID: {viewingProduct.id}</p>
        <button type="button" onClick={() => addToCart(viewingProduct)}>
          Add to cart
        </button>
      </div>
    );
  }

  if (checkoutStarted) {
    return (
      <div>
        <h1>Checkout</h1>
        <p>Items in cart: {Array.from(cart).join(', ')}</p>
        <button type="button" onClick={() => setCheckoutStarted(false)}>
          ← Back to cart
        </button>
        <hr />
        <p>Simulate a payment failure to trigger the highest-priority coupon flow:</p>
        <button type="button" onClick={simulatePaymentFailure} disabled={simulating}>
          {simulating ? 'Simulating…' : 'Simulate payment failure'}
        </button>
        {simulateResult && <p style={{ marginTop: 8 }}>{simulateResult}</p>}
        <p style={{ marginTop: 16 }}>
          <button type="button" onClick={() => navigate('/session')}>
            View my session
          </button>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1>Demo flow</h1>
      <p>Session ID: <code style={{ fontSize: 12 }}>{sessionId ?? '—'}</code></p>
      <h2>Products</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {PRODUCTS.map((p) => (
          <li key={p.id} style={{ marginBottom: 8 }}>
            <button type="button" onClick={() => openProduct(p)}>
              View {p.name}
            </button>
            {cart.has(p.id) && <span style={{ marginLeft: 8 }}>In cart</span>}
          </li>
        ))}
      </ul>
      {cart.size > 0 && (
        <button type="button" onClick={startCheckout}>
          Go to checkout ({cart.size} item(s))
        </button>
      )}
    </div>
  );
}
