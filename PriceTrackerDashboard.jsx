import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) => n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—";
const uid = () => `item_${Date.now().toString(36)}`;

const PLATFORM_COLORS = { amazon: "#f97316", flipkart: "#3b82f6" };
const getPlatform = (url = "") =>
  url.includes("amazon") ? "amazon" : url.includes("flipkart") ? "flipkart" : "other";

function getPlatformLabel(url) {
  const p = getPlatform(url);
  return p === "amazon" ? "Amazon.in" : p === "flipkart" ? "Flipkart" : "Other";
}

// ── Sub-components ───────────────────────────────────────────────────────────

function PriceChart({ prices, targetPrice }) {
  if (!prices || prices.length < 2) {
    return (
      <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563", fontSize: 13 }}>
        Waiting for more data points…
      </div>
    );
  }
  const min = Math.min(...prices.map((p) => p.price)) * 0.95;
  const max = Math.max(...prices.map((p) => p.price)) * 1.05;

  return (
    <ResponsiveContainer width="100%" height={110}>
      <LineChart data={prices} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={(d) => d.slice(5)} />
        <YAxis domain={[min, max]} tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#9ca3af" }}
          formatter={(v) => [fmt(v), "Price"]}
        />
        {targetPrice && (
          <ReferenceLine y={targetPrice} stroke="#10b981" strokeDasharray="4 2" label={{ value: "Target", fill: "#10b981", fontSize: 10 }} />
        )}
        <Line type="monotone" dataKey="price" stroke="#60a5fa" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ItemCard({ item, historyEntry, onRemove }) {
  const prices = historyEntry?.prices || [];
  const latest = prices.at(-1)?.price;
  const prev = prices.at(-2)?.price;
  const dropPct = latest && prev ? ((prev - latest) / prev * 100).toFixed(1) : null;
  const isDown = dropPct && parseFloat(dropPct) > 0;
  const targetHit = item.target_price && latest && latest <= item.target_price;
  const platform = getPlatform(item.url);

  return (
    <div style={{
      background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 20,
      display: "flex", flexDirection: "column", gap: 12, position: "relative",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              background: PLATFORM_COLORS[platform] + "22",
              color: PLATFORM_COLORS[platform],
              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, letterSpacing: "0.05em"
            }}>
              {getPlatformLabel(item.url)}
            </span>
            {targetHit && (
              <span style={{ background: "#10b98122", color: "#10b981", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4 }}>
                🎯 TARGET HIT
              </span>
            )}
          </div>
          <div style={{ marginTop: 6, fontSize: 15, fontWeight: 600, color: "#f9fafb", lineHeight: 1.3 }}>{item.name}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: isDown ? "#34d399" : "#f9fafb", fontVariantNumeric: "tabular-nums" }}>
            {fmt(latest)}
          </div>
          {isDown && (
            <div style={{ fontSize: 12, color: "#34d399" }}>▼ {dropPct}% from {fmt(prev)}</div>
          )}
          {item.target_price && (
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Target: {fmt(item.target_price)}</div>
          )}
        </div>
      </div>

      {/* Chart */}
      <PriceChart prices={prices} targetPrice={item.target_price} />

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <a href={item.url} target="_blank" rel="noreferrer"
          style={{ fontSize: 12, color: "#3b82f6", textDecoration: "none" }}>
          View listing →
        </a>
        <button onClick={() => onRemove(item.id)}
          style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 12 }}>
          Remove
        </button>
      </div>
    </div>
  );
}

function AddItemModal({ onAdd, onClose }) {
  const [form, setForm] = useState({ name: "", url: "", target_price: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16,
    }}>
      <div style={{ background: "#111827", border: "1px solid #374151", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480 }}>
        <h2 style={{ margin: "0 0 20px", color: "#f9fafb", fontSize: 18 }}>Add Item to Track</h2>
        {[
          { key: "name", label: "Product Name", placeholder: "Sony WH-1000XM5", type: "text" },
          { key: "url", label: "Amazon.in or Flipkart URL", placeholder: "https://amazon.in/dp/...", type: "url" },
          { key: "target_price", label: "Target Price (₹) — optional", placeholder: "20000", type: "number" },
        ].map(({ key, label, placeholder, type }) => (
          <div key={key} style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "#9ca3af", display: "block", marginBottom: 6 }}>{label}</label>
            <input
              type={type}
              value={form[key]}
              onChange={set(key)}
              placeholder={placeholder}
              style={{
                width: "100%", background: "#1f2937", border: "1px solid #374151", borderRadius: 8,
                padding: "10px 12px", color: "#f9fafb", fontSize: 14, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
        ))}
        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
          <button onClick={onClose}
            style={{ flex: 1, background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: "10px", color: "#d1d5db", cursor: "pointer", fontSize: 14 }}>
            Cancel
          </button>
          <button
            onClick={() => {
              if (!form.name || !form.url) return;
              onAdd({ id: uid(), name: form.name, url: form.url, target_price: form.target_price ? parseFloat(form.target_price) : null });
              onClose();
            }}
            style={{ flex: 2, background: "#3b82f6", border: "none", borderRadius: 8, padding: "10px", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
            Add Item
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────

export default function PriceTracker() {
  const [repoUrl, setRepoUrl] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(null);

  const toRawUrl = (url, file) => {
    // Convert github.com URL to raw.githubusercontent.com
    return url
      .replace("github.com", "raw.githubusercontent.com")
      .replace("/blob/", "/")
      .replace(/\/$/, "") + `/main/data/${file}`;
  };

  const fetchData = useCallback(async (url) => {
    setLoading(true);
    setError("");
    try {
      const [itemsRes, histRes] = await Promise.all([
        fetch(toRawUrl(url, "items.json")),
        fetch(toRawUrl(url, "price_history.json")),
      ]);
      if (!itemsRes.ok) throw new Error(`Could not fetch items.json (${itemsRes.status})`);
      const [itemsData, histData] = await Promise.all([itemsRes.json(), histRes.ok ? histRes.json() : {}]);
      setItems(itemsData);
      setHistory(histData);
      setRepoUrl(url);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  const handleRemove = (id) => setItems((prev) => prev.filter((i) => i.id !== id));

  const handleAdd = (item) => setItems((prev) => [...prev, item]);

  const copyJson = (key) => {
    const json = JSON.stringify(key === "items" ? items : history, null, 2);
    navigator.clipboard.writeText(json);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  // ── No repo connected yet ──
  if (!repoUrl) {
    return (
      <div style={{
        minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center",
        justifyContent: "center", padding: 24, fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      }}>
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📉</div>
          <h1 style={{ color: "#f9fafb", fontSize: 28, fontWeight: 700, margin: "0 0 8px" }}>Price Tracker</h1>
          <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 32px" }}>
            Connect your GitHub repo to load tracked items and price history.
          </p>
          <input
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="https://github.com/yourname/price-tracker"
            style={{
              width: "100%", background: "#111827", border: "1px solid #374151", borderRadius: 10,
              padding: "12px 16px", color: "#f9fafb", fontSize: 14, outline: "none",
              boxSizing: "border-box", marginBottom: 12,
            }}
          />
          {error && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button
            onClick={() => inputUrl && fetchData(inputUrl)}
            disabled={loading}
            style={{
              width: "100%", background: "#3b82f6", border: "none", borderRadius: 10, padding: "12px",
              color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}>
            {loading ? "Loading…" : "Connect Repo →"}
          </button>
          <p style={{ color: "#374151", fontSize: 12, marginTop: 20 }}>
            Repo must be public · Reads <code style={{ color: "#6b7280" }}>data/items.json</code> and <code style={{ color: "#6b7280" }}>data/price_history.json</code>
          </p>
        </div>
      </div>
    );
  }

  // ── Dashboard ──
  const totalDrops = Object.values(history).filter((h) => {
    const p = h.prices; return p.length >= 2 && p.at(-1).price < p.at(-2).price;
  }).length;

  return (
    <div style={{ minHeight: "100vh", background: "#030712", color: "#f9fafb", fontFamily: "'IBM Plex Mono', 'Courier New', monospace" }}>
      {showModal && <AddItemModal onAdd={handleAdd} onClose={() => setShowModal(false)} />}

      {/* Header */}
      <div style={{ borderBottom: "1px solid #111827", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>📉</span>
          <span style={{ fontWeight: 700, fontSize: 18 }}>Price Tracker</span>
          <span style={{ fontSize: 12, color: "#4b5563", marginTop: 2 }}>{repoUrl.split("/").slice(-1)[0]}</span>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => fetchData(repoUrl)}
            style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: "8px 14px", color: "#d1d5db", cursor: "pointer", fontSize: 13 }}>
            ↻ Refresh
          </button>
          <button onClick={() => setShowModal(true)}
            style={{ background: "#3b82f6", border: "none", borderRadius: 8, padding: "8px 16px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            + Add Item
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display: "flex", gap: 1, background: "#111827", borderBottom: "1px solid #1f2937" }}>
        {[
          { label: "Tracked", value: items.length },
          { label: "Price Drops Today", value: totalDrops, color: "#34d399" },
          { label: "Data Points", value: Object.values(history).reduce((s, h) => s + h.prices.length, 0) },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ flex: 1, padding: "14px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: color || "#f9fafb" }}>{value}</div>
            <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Items grid */}
      <div style={{ padding: 24, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {items.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", color: "#4b5563", padding: 60 }}>
            No items tracked yet. Add one above.
          </div>
        )}
        {items.map((item) => (
          <ItemCard key={item.id} item={item} historyEntry={history[item.id]} onRemove={handleRemove} />
        ))}
      </div>

      {/* Export section */}
      <div style={{ padding: "0 24px 32px", display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          { key: "items", label: "Copy items.json", desc: "Commit to data/items.json in your repo" },
        ].map(({ key, label, desc }) => (
          <div key={key} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 10, padding: 16, flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#d1d5db", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 11, color: "#4b5563", marginBottom: 12 }}>{desc}</div>
            <button onClick={() => copyJson(key)}
              style={{
                background: copied === key ? "#10b981" : "#1f2937", border: "1px solid #374151",
                borderRadius: 6, padding: "8px 16px", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600,
              }}>
              {copied === key ? "✓ Copied!" : "Copy JSON"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
