'use client';
import { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import { api } from '../../lib/api';

function money(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount || 0);
}

export default function BillingPage() {
  const [credits, setCredits] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [creditData, packageData, orderData, historyData] = await Promise.all([
        api.getCredits(), api.getCreditPackages(), api.getPaymentOrders(), api.getCreditHistory(),
      ]);
      setCredits(creditData);
      setPackages(packageData);
      setOrders(orderData);
      setHistory(historyData);
    } catch (e: any) {
      setError(e.message || 'Failed to load billing data');
    }
  }

  async function checkout(packageId: string) {
    setLoading(packageId);
    setMessage('');
    setError('');
    try {
      const order = await api.createCheckout(packageId);
      await load();
      if (order.status === 'failed') {
        setError(order.error || 'Payment provider failed to create checkout');
      } else if (order.checkout_url?.startsWith('http')) {
        window.open(order.checkout_url, '_blank', 'noopener,noreferrer');
        setMessage(`Checkout opened for order ${order.order_id}`);
      } else {
        setMessage(`Mock checkout created: ${order.order_id}. Mark as paid after payment/webhook is wired.`);
      }
    } catch (e: any) {
      setError(e.message || 'Checkout failed');
    } finally {
      setLoading(null);
    }
  }

  async function markPaid(orderId: string) {
    setLoading(orderId);
    setMessage('');
    setError('');
    try {
      await api.markOrderPaid(orderId);
      setMessage(`Order ${orderId} marked paid and credits added.`);
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to mark paid');
    } finally {
      setLoading(null);
    }
  }

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Billing & Credits</h1>
        <p className="page-subtitle">Top up credits with Midtrans-ready checkout.</p>
      </div>

      {error && <div className="card" style={{ marginBottom: 16, borderColor: 'var(--error)' }}><p style={{ color: 'var(--error)' }}>{error}</p></div>}
      {message && <div className="card" style={{ marginBottom: 16, borderColor: 'var(--success)' }}><p style={{ color: 'var(--success)' }}>{message}</p></div>}

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Current Balance</h3></div>
          <div style={{ fontSize: 44, fontWeight: 800, color: 'var(--text-primary)' }}>{credits?.balance ?? '—'}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>credits available</div>
          <div style={{ display: 'flex', gap: 18, marginTop: 18, color: 'var(--text-secondary)', fontSize: 13 }}>
            <div>Earned: <strong>{credits?.total_earned ?? 0}</strong></div>
            <div>Spent: <strong>{credits?.total_spent ?? 0}</strong></div>
            <div>Free/day: <strong>{credits?.free_daily ?? 5}</strong></div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Payment Mode</h3></div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            If Midtrans server key is configured, checkout opens Snap payment. Without it, Alexa Forge creates a mock pending order for local testing and manual reconciliation.
          </p>
          <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: 'var(--bg-surface)', fontSize: 12, color: 'var(--text-secondary)' }}>
            Webhook integration can mark orders paid automatically later. For now, pending mock orders expose a manual “Mark paid” action.
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3 className="card-title">Top-Up Packages</h3></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
          {packages.map(pkg => (
            <div key={pkg.id} style={{ padding: 16, borderRadius: 14, background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{pkg.label}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)' }}>{pkg.credits}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>credits</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{money(pkg.amount_idr)}</div>
              <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading === pkg.id} onClick={() => checkout(pkg.id)}>
                {loading === pkg.id ? 'Creating...' : 'Checkout'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><h3 className="card-title">Payment Orders</h3></div>
          <div className="activity-list">
            {orders.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No orders yet.</p>}
            {orders.map(order => (
              <div key={order.id} className="activity-item" style={{ alignItems: 'flex-start' }}>
                <div className="activity-dot" style={{ background: order.status === 'paid' ? 'var(--success)' : order.status === 'failed' ? 'var(--error)' : 'var(--warning)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{order.order_id}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{order.package_id} • {order.credits} credits • {money(order.amount_idr)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{order.status} • {new Date(order.created_at).toLocaleString()}</div>
                  {order.status === 'pending' && order.checkout_url?.startsWith('/settings') && (
                    <button className="btn btn-secondary" style={{ marginTop: 8, fontSize: 12 }} disabled={loading === order.order_id} onClick={() => markPaid(order.order_id)}>
                      {loading === order.order_id ? 'Updating...' : 'Mark paid'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">Credit History</h3></div>
          <div className="activity-list">
            {history.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No credit transactions yet.</p>}
            {history.map(tx => (
              <div key={tx.id} className="activity-item">
                <div className="activity-dot" style={{ background: tx.amount >= 0 ? 'var(--success)' : 'var(--warning)' }} />
                <span className="activity-text">{tx.amount > 0 ? '+' : ''}{tx.amount} credits — {tx.reason || tx.type}</span>
                <span className="activity-time">{new Date(tx.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
