import { useEffect, useMemo, useState } from 'react'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function MenuItemCard({ item, onAdd }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      <img src={item.image_url || `https://picsum.photos/seed/${encodeURIComponent(item.name)}/400/240`} alt={item.name} className="h-40 w-full object-cover" />
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">{item.name}</h3>
            {item.category && (
              <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{item.category}</span>
            )}
          </div>
          <div className="text-blue-600 font-bold">₹{Number(item.price).toFixed(2)}</div>
        </div>
        {item.description && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{item.description}</p>
        )}
        <button onClick={() => onAdd(item)} className="mt-auto w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors">Add</button>
      </div>
    </div>
  )
}

function Cart({ cart, onChangeQty, onCheckout, tableId }) {
  const total = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart])
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sticky top-4">
      <h3 className="font-semibold text-gray-900 mb-3">Your Order {tableId ? `(Table ${tableId})` : ''}</h3>
      {cart.length === 0 ? (
        <p className="text-sm text-gray-500">No items yet.</p>
      ) : (
        <div className="space-y-3">
          {cart.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-gray-800">{it.name}</p>
                <p className="text-xs text-gray-500">₹{it.price} × {it.qty}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onChangeQty(it.id, Math.max(0, it.qty - 1))} className="h-7 w-7 rounded bg-gray-100">-</button>
                <span className="w-6 text-center">{it.qty}</span>
                <button onClick={() => onChangeQty(it.id, it.qty + 1)} className="h-7 w-7 rounded bg-gray-100">+</button>
              </div>
            </div>
          ))}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between font-semibold">
              <span>Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>
          <button onClick={() => onCheckout(total)} disabled={cart.length === 0} className="w-full bg-green-600 disabled:opacity-50 hover:bg-green-700 text-white font-medium py-2 rounded-lg">Proceed to Pay</button>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [menu, setMenu] = useState([])
  const [cart, setCart] = useState([])
  const [status, setStatus] = useState('')

  // get table number from URL (?table=5)
  const tableId = useMemo(() => {
    const u = new URL(window.location.href)
    return u.searchParams.get('table') || '1'
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${BACKEND}/api/menu`)
        const data = await res.json()
        const items = Array.isArray(data) ? data : (data.items || [])
        // map _id to id for UI
        setMenu(items.map((d) => ({ id: d._id || d.id, ...d })))
      } catch (e) {
        console.error(e)
      }
    }
    load()
  }, [])

  const addToCart = (item) => {
    setCart((prev) => {
      const exists = prev.find((p) => p.id === item.id)
      if (exists) return prev.map((p) => (p.id === item.id ? { ...p, qty: p.qty + 1 } : p))
      return [...prev, { id: item.id, name: item.name, price: Number(item.price), qty: 1 }]
    })
  }

  const changeQty = (id, qty) => {
    setCart((prev) => prev
      .map((p) => (p.id === id ? { ...p, qty } : p))
      .filter((p) => p.qty > 0)
    )
  }

  const checkout = async () => {
    try {
      setStatus('Creating order...')
      const payload = {
        table_id: String(tableId),
        items: cart.map((c) => ({ item_id: c.id, quantity: c.qty })),
        payment_method: 'online'
      }
      const res = await fetch(`${BACKEND}/api/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus(data.detail || 'Failed to create order')
        return
      }
      setStatus(`Order created. Amount ₹${data.subtotal}. Processing payment (sandbox)...`)
      // Simulate payment success in sandbox
      await fetch(`${BACKEND}/api/payment/mock/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: data.order_id, status: 'succeeded' })
      })
      setStatus('Payment successful! Your order is confirmed.')
      setCart([])
    } catch (e) {
      console.error(e)
      setStatus('Error during checkout')
    }
  }

  const categories = useMemo(() => {
    const cats = {}
    menu.forEach((m) => {
      const key = m.category || 'Menu'
      cats[key] = cats[key] || []
      if (m.is_available !== false) cats[key].push(m)
    })
    return cats
  }, [menu])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Smart Restaurant</h1>
          <div className="text-sm text-gray-600">Table #{tableId}</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-8">
          {Object.keys(categories).length === 0 && (
            <div className="text-gray-600">No menu items yet. Add items from the admin panel.</div>
          )}
          {Object.keys(categories).map((cat) => (
            <div key={cat}>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">{cat}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories[cat].map((item) => (
                  <MenuItemCard key={item.id} item={item} onAdd={addToCart} />)
                )}
              </div>
            </div>
          ))}
        </div>
        <div>
          <Cart cart={cart} onChangeQty={changeQty} onCheckout={checkout} tableId={tableId} />
          {status && (
            <p className="mt-3 text-sm text-gray-700">{status}</p>
          )}
          <div className="mt-6 p-3 text-xs text-gray-500 bg-white border rounded-lg">
            Tip: Generate a QR for this table from the backend: /api/qr/{tableId}
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-gray-500">
        Scan the QR code to open this page with your table id, e.g. /?table=5
      </footer>
    </div>
  )
}
