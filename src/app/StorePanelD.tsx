// StorePanelD — Flower Shop screens
import { useState } from "react";
import {
  Plus, X, TrendingUp, Users, BarChart2, Flower2, Gift, Bike, Power,
} from "lucide-react";
import { storeApi, useApi, norm, normList, showToast, KPI, Modal, F, TInput, Btn, Hdr, Empty } from "./lib";
import type { StoreData, Product } from "./lib";


// ── FlowerOrdersScreen ────────────────────────────────────────────────────────

interface FlowerItem { name: string; qty: number; price: number; productId?: string; }
interface FlowerOrder {
  id: string; orderNo: string; customer: string; customerPhone?: string;
  occasion?: string; deliveryType: "pickup" | "delivery";
  deliveryDate?: string; deliveryTime?: string;
  recipientName?: string; recipientPhone?: string;
  deliveryAddress?: string; deliveryArea?: string; deliveryFee?: number;
  cardMessage?: string; assignedTo?: string; notes?: string;
  items: FlowerItem[]; discount?: number; tax?: number; total: number;
  status: "new" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";
  createdAt: string;
}

const FLOWER_STATUSES: { id: FlowerOrder["status"]; label: string; color: string; bg: string }[] = [
  { id: "new",              label: "جديد",           color: "#2563EB", bg: "#DBEAFE" },
  { id: "preparing",       label: "قيد التحضير",    color: "#D97706", bg: "#FEF3C7" },
  { id: "ready",           label: "جاهز",           color: "#059669", bg: "#D1FAE5" },
  { id: "out_for_delivery",label: "في الطريق",      color: "#7C3AED", bg: "#EDE9FE" },
  { id: "delivered",       label: "تم التسليم",     color: "#10B981", bg: "#A7F3D0" },
  { id: "cancelled",       label: "ملغي",           color: "#DC2626", bg: "#FEE2E2" },
];

const OCCASIONS = ["عيد ميلاد","زواج","خطوبة","تخرج","اجتماع عمل","تعازي","عيد الأم","فرح عام","أخرى"];

function FlowerOrderCard({ order, onStatus, onEdit }: { order: FlowerOrder; onStatus: (id: string, s: FlowerOrder["status"]) => void; onEdit: (o: FlowerOrder) => void }) {
  const st = FLOWER_STATUSES.find(s => s.id === order.status)!;
  const nextMap: Record<FlowerOrder["status"], FlowerOrder["status"] | null> = {
    new: "preparing", preparing: "ready", ready: order.deliveryType === "delivery" ? "out_for_delivery" : "delivered",
    out_for_delivery: "delivered", delivered: null, cancelled: null,
  };
  const next = nextMap[order.status];
  const nextLabel = next ? FLOWER_STATUSES.find(s => s.id === next)?.label : null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-sm">{order.orderNo}</p>
          <p className="text-xs text-muted-foreground">{order.customer} {order.customerPhone ? `• ${order.customerPhone}` : ""}</p>
          {order.occasion && <p className="text-xs text-muted-foreground">{order.occasion}</p>}
        </div>
        <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ color: st.color, background: st.bg }}>{st.label}</span>
      </div>

      {order.deliveryType === "delivery" && (
        <div className="text-xs text-muted-foreground border border-border rounded-lg px-3 py-2 bg-muted/30 space-y-0.5">
          <p>📦 توصيل — {order.deliveryArea || "—"}</p>
          {order.recipientName && <p>المستلم: {order.recipientName} {order.recipientPhone ? `• ${order.recipientPhone}` : ""}</p>}
          {order.deliveryDate && <p>الموعد: {order.deliveryDate} {order.deliveryTime || ""}</p>}
          {order.deliveryAddress && <p>العنوان: {order.deliveryAddress}</p>}
        </div>
      )}

      {order.cardMessage && (
        <p className="text-xs italic text-muted-foreground border-r-2 border-primary/40 pr-2">"{order.cardMessage}"</p>
      )}

      <div className="border-t border-border pt-2 flex items-center justify-between gap-2">
        <span className="font-bold text-sm">{order.total.toLocaleString("ar-SA")} ر.س</span>
        <div className="flex gap-2">
          <button onClick={() => onEdit(order)} className="text-xs px-2 py-1 rounded border border-border hover:bg-muted">تعديل</button>
          {next && nextLabel && (
            <button onClick={() => onStatus(order.id, next)} className="text-xs px-3 py-1 rounded font-semibold" style={{ background: FLOWER_STATUSES.find(s => s.id === next)!.bg, color: FLOWER_STATUSES.find(s => s.id === next)!.color }}>
              → {nextLabel}
            </button>
          )}
          {order.status !== "cancelled" && order.status !== "delivered" && (
            <button onClick={() => onStatus(order.id, "cancelled")} className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">إلغاء</button>
          )}
        </div>
      </div>
    </div>
  );
}

function FlowerOrdersScreen({ store }: { store: StoreData }) {
  const { data: orders, loading, refresh } = useApi<FlowerOrder[]>("/flower-orders", []);
  const { data: products } = useApi<Product[]>("/products", []);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editOrder, setEditOrder] = useState<FlowerOrder | null>(null);

  const blank = (): Partial<FlowerOrder> => ({
    customer: "", customerPhone: "", occasion: "", deliveryType: "pickup",
    deliveryDate: "", deliveryTime: "", recipientName: "", recipientPhone: "",
    deliveryAddress: "", deliveryArea: "", deliveryFee: 0,
    cardMessage: "", notes: "", items: [], discount: 0, tax: 0, total: 0,
  });
  const [form, setForm] = useState<Partial<FlowerOrder>>(blank());
  const [saving, setSaving] = useState(false);

  const filtered = (orders || []).filter(o => statusFilter === "all" || o.status === statusFilter);

  const stats = {
    total: (orders || []).length,
    active: (orders || []).filter(o => !["delivered","cancelled"].includes(o.status)).length,
    revenue: (orders || []).filter(o => o.status === "delivered").reduce((a, o) => a + o.total, 0),
    delivery: (orders || []).filter(o => o.deliveryType === "delivery").length,
  };

  const calcTotal = (f: Partial<FlowerOrder>) => {
    const sub = (f.items || []).reduce((a, i) => a + i.qty * i.price, 0);
    const fee = f.deliveryType === "delivery" ? (f.deliveryFee || 0) : 0;
    const disc = f.discount || 0;
    const tax = f.tax || 0;
    return sub + fee - disc + (sub * tax / 100);
  };

  const openNew = () => { setForm(blank()); setEditOrder(null); setShowForm(true); };
  const openEdit = (o: FlowerOrder) => { setForm({ ...o }); setEditOrder(o); setShowForm(true); };

  const addItem = () => setForm(f => ({ ...f, items: [...(f.items || []), { name: "", qty: 1, price: 0 }] }));
  const removeItem = (i: number) => setForm(f => ({ ...f, items: (f.items || []).filter((_, idx) => idx !== i) }));
  const setItem = (i: number, field: keyof FlowerItem, val: string | number) =>
    setForm(f => {
      const items = [...(f.items || [])];
      items[i] = { ...items[i], [field]: val };
      return { ...f, items };
    });

  const pickProduct = (i: number, pid: string) => {
    const p = products.find(pr => pr.id === pid);
    if (!p) return;
    setForm(f => {
      const items = [...(f.items || [])];
      items[i] = { ...items[i], name: p.name, price: p.price, productId: p.id };
      return { ...f, items };
    });
  };

  const save = async () => {
    if (!form.customer?.trim()) return;
    setSaving(true);
    const total = calcTotal(form);
    const body = { ...form, total };
    try {
      if (editOrder) {
        await storeApi.put(`/flower-orders/${editOrder.id}`, body);
      } else {
        await storeApi.post("/flower-orders", body);
      }
      refresh();
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (id: string, status: FlowerOrder["status"]) => {
    await storeApi.patch(`/flower-orders/${id}/status`, { status });
    refresh();
  };

  return (
    <div className="p-4 space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={<Flower2 size={18} />} label="إجمالي الطلبات" value={String(stats.total)} color="#EC4899" />
        <KPI icon={<Gift size={18} />} label="طلبات نشطة" value={String(stats.active)} color="#D97706" />
        <KPI icon={<Bike size={18} />} label="توصيل" value={String(stats.delivery)} color="#7C3AED" />
        <KPI icon={<TrendingUp size={18} />} label="الإيرادات" value={`${stats.revenue.toLocaleString("ar-SA")} ر.س`} color="#10B981" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={openNew} className="bg-primary text-primary-foreground text-sm px-4 py-2 rounded-lg font-semibold flex items-center gap-1">
          <Plus size={15} /> طلب جديد
        </button>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setStatusFilter("all")} className={`text-xs px-3 py-1.5 rounded-full border ${statusFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card"}`}>الكل</button>
          {FLOWER_STATUSES.map(s => (
            <button key={s.id} onClick={() => setStatusFilter(s.id)} className={`text-xs px-3 py-1.5 rounded-full border font-medium ${statusFilter === s.id ? "" : "border-border bg-card"}`}
              style={statusFilter === s.id ? { background: s.bg, color: s.color, borderColor: s.color } : {}}>
              {s.label}
            </button>
          ))}
        </div>
        <button onClick={refresh} className="mr-auto text-xs px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted">تحديث</button>
      </div>

      {/* Orders grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <Empty icon={<Flower2 size={28} />} title="لا توجد طلبات" desc="أضف طلب زهور جديد من الزر أعلاه" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(o => (
            <FlowerOrderCard key={o.id} order={o} onStatus={changeStatus} onEdit={openEdit} />
          ))}
        </div>
      )}

      {/* Order Form Modal */}
      {showForm && (
        <Modal title={editOrder ? `تعديل ${editOrder.orderNo}` : "طلب زهور جديد"} onClose={() => setShowForm(false)} wide>
          <div className="space-y-4 text-sm">
            {/* Customer */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">اسم العميل *</label>
                <input value={form.customer || ""} onChange={e => setForm(f => ({ ...f, customer: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 bg-background" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">رقم الجوال</label>
                <input value={form.customerPhone || ""} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 bg-background" />
              </div>
            </div>

            {/* Occasion + Delivery */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">المناسبة</label>
                <select value={form.occasion || ""} onChange={e => setForm(f => ({ ...f, occasion: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 bg-background">
                  <option value="">اختر...</option>
                  {OCCASIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">نوع الاستلام</label>
                <select value={form.deliveryType || "pickup"} onChange={e => setForm(f => ({ ...f, deliveryType: e.target.value as "pickup" | "delivery" }))} className="w-full border border-border rounded-lg px-3 py-2 bg-background">
                  <option value="pickup">استلام من المتجر</option>
                  <option value="delivery">توصيل</option>
                </select>
              </div>
            </div>

            {/* Delivery details */}
            {form.deliveryType === "delivery" && (
              <div className="border border-border rounded-xl p-3 space-y-3 bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground">تفاصيل التوصيل</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">اسم المستلم</label>
                    <input value={form.recipientName || ""} onChange={e => setForm(f => ({ ...f, recipientName: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 bg-background" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">جوال المستلم</label>
                    <input value={form.recipientPhone || ""} onChange={e => setForm(f => ({ ...f, recipientPhone: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 bg-background" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">تاريخ التوصيل</label>
                    <input type="date" value={form.deliveryDate || ""} onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 bg-background" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">وقت التوصيل</label>
                    <input type="time" value={form.deliveryTime || ""} onChange={e => setForm(f => ({ ...f, deliveryTime: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 bg-background" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">الحي / المنطقة</label>
                    <input value={form.deliveryArea || ""} onChange={e => setForm(f => ({ ...f, deliveryArea: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 bg-background" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">رسوم التوصيل</label>
                    <input type="number" value={form.deliveryFee ?? 0} onChange={e => setForm(f => ({ ...f, deliveryFee: parseFloat(e.target.value) || 0 }))} className="w-full border border-border rounded-lg px-3 py-2 bg-background" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">العنوان التفصيلي</label>
                  <input value={form.deliveryAddress || ""} onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))} className="w-full border border-border rounded-lg px-3 py-2 bg-background" />
                </div>
              </div>
            )}

            {/* Card message */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">رسالة البطاقة</label>
              <textarea value={form.cardMessage || ""} onChange={e => setForm(f => ({ ...f, cardMessage: e.target.value }))} rows={2} className="w-full border border-border rounded-lg px-3 py-2 bg-background resize-none" />
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold">عناصر الطلب</p>
                <button onClick={addItem} className="text-xs text-primary flex items-center gap-1"><Plus size={12} /> إضافة عنصر</button>
              </div>
              <div className="space-y-2">
                {(form.items || []).map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select value={item.productId || ""} onChange={e => { if (e.target.value) pickProduct(i, e.target.value); }} className="border border-border rounded-lg px-2 py-1.5 bg-background text-xs w-32">
                      <option value="">من المنتجات...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input placeholder="اسم العنصر" value={item.name} onChange={e => setItem(i, "name", e.target.value)} className="flex-1 border border-border rounded-lg px-2 py-1.5 bg-background text-xs" />
                    <input type="number" placeholder="الكمية" value={item.qty} onChange={e => setItem(i, "qty", parseInt(e.target.value) || 1)} className="w-16 border border-border rounded-lg px-2 py-1.5 bg-background text-xs" />
                    <input type="number" placeholder="السعر" value={item.price} onChange={e => setItem(i, "price", parseFloat(e.target.value) || 0)} className="w-20 border border-border rounded-lg px-2 py-1.5 bg-background text-xs" />
                    <button onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700"><X size={14} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Discount / Tax */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">خصم (ر.س)</label>
                <input type="number" value={form.discount ?? 0} onChange={e => setForm(f => ({ ...f, discount: parseFloat(e.target.value) || 0 }))} className="w-full border border-border rounded-lg px-3 py-2 bg-background" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">ضريبة (%)</label>
                <input type="number" value={form.tax ?? 0} onChange={e => setForm(f => ({ ...f, tax: parseFloat(e.target.value) || 0 }))} className="w-full border border-border rounded-lg px-3 py-2 bg-background" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">ملاحظات داخلية</label>
              <textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-border rounded-lg px-3 py-2 bg-background resize-none" />
            </div>

            {/* Total preview */}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-muted-foreground text-xs">الإجمالي المتوقع</span>
              <span className="font-bold text-lg">{calcTotal(form).toLocaleString("ar-SA")} ر.س</span>
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm">إلغاء</button>
              <button onClick={save} disabled={saving || !form.customer?.trim()} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
                {saving ? "جاري الحفظ..." : editOrder ? "حفظ التعديلات" : "إنشاء الطلب"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── BouquetBuilderScreen ──────────────────────────────────────────────────────

function BouquetBuilderScreen({ store }: { store: StoreData }) {
  const { data: products } = useApi<Product[]>("/products", []);
  const [bouquet, setBouquet] = useState<{ productId: string; name: string; qty: number; price: number }[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const flowers = products.filter(p => p.category === "زهور" || !p.category);

  const add = (p: Product) => setBouquet(b => {
    const idx = b.findIndex(i => i.productId === p.id);
    if (idx >= 0) { const n = [...b]; n[idx] = { ...n[idx], qty: n[idx].qty + 1 }; return n; }
    return [...b, { productId: p.id, name: p.name, qty: 1, price: p.price }];
  });
  const setQty = (pid: string, q: number) => setBouquet(b => q <= 0 ? b.filter(i => i.productId !== pid) : b.map(i => i.productId === pid ? { ...i, qty: q } : i));
  const total = bouquet.reduce((a, i) => a + i.qty * i.price, 0);

  const submit = async () => {
    if (bouquet.length === 0) return;
    setSaving(true);
    try {
      await storeApi.post("/flower-orders", {
        customer: "باقة مخصصة", deliveryType: "pickup",
        items: bouquet, total, notes: note,
        cardMessage: note,
      });
      setBouquet([]); setNote("");
      showToast("تم حفظ الباقة كطلب جديد ✓", "success");
    } finally { setSaving(false); }
  };

  return (
    <div className="p-4 grid md:grid-cols-2 gap-4">
      {/* Flower picker */}
      <div className="space-y-3">
        <p className="font-bold text-sm">اختر الزهور والعناصر</p>
        {flowers.length === 0 ? (
          <Empty icon={<Flower2 size={24} />} title="لا توجد منتجات" desc="أضف منتجات من شاشة المنتجات" />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {flowers.map(p => (
              <button key={p.id} onClick={() => add(p)} className="border border-border rounded-xl p-3 text-right hover:bg-muted/50 active:scale-95 transition-transform">
                <p className="font-semibold text-sm">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.price.toLocaleString("ar-SA")} ر.س</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bouquet summary */}
      <div className="border border-border rounded-xl p-4 flex flex-col gap-3 bg-card">
        <p className="font-bold text-sm flex items-center gap-1"><Gift size={15} /> الباقة الحالية</p>
        {bouquet.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">انقر على الزهور لإضافتها إلى الباقة</p>
        ) : (
          <div className="space-y-2 flex-1">
            {bouquet.map(i => (
              <div key={i.productId} className="flex items-center justify-between gap-2">
                <span className="text-sm flex-1">{i.name}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setQty(i.productId, i.qty - 1)} className="w-6 h-6 rounded border border-border text-xs flex items-center justify-center">−</button>
                  <span className="w-6 text-center text-xs">{i.qty}</span>
                  <button onClick={() => setQty(i.productId, i.qty + 1)} className="w-6 h-6 rounded border border-border text-xs flex items-center justify-center">+</button>
                </div>
                <span className="text-xs text-muted-foreground w-16 text-left">{(i.qty * i.price).toLocaleString("ar-SA")}</span>
              </div>
            ))}
          </div>
        )}
        <textarea placeholder="رسالة أو ملاحظة للباقة..." value={note} onChange={e => setNote(e.target.value)} rows={2} className="w-full border border-border rounded-lg px-3 py-2 bg-background resize-none text-sm" />
        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="font-bold">{total.toLocaleString("ar-SA")} ر.س</span>
          <button onClick={submit} disabled={saving || bouquet.length === 0} className="bg-primary text-primary-foreground text-sm px-4 py-2 rounded-lg font-semibold disabled:opacity-50">
            {saving ? "جاري الحفظ..." : "حفظ كطلب"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DeliveryMgmtScreen ────────────────────────────────────────────────────────

function DeliveryMgmtScreen({ store }: { store: StoreData }) {
  const { data: orders, loading, refresh } = useApi<FlowerOrder[]>("/flower-orders?status=out_for_delivery", []);
  const { data: readyOrders, refresh: refreshReady } = useApi<FlowerOrder[]>("/flower-orders?status=ready", []);

  const dispatch = async (id: string) => {
    await storeApi.patch(`/flower-orders/${id}/status`, { status: "out_for_delivery" });
    refreshReady(); refresh();
  };
  const markDelivered = async (id: string) => {
    await storeApi.patch(`/flower-orders/${id}/status`, { status: "delivered" });
    refresh();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Ready for dispatch */}
        <div className="space-y-3">
          <p className="font-bold text-sm flex items-center gap-1"><Gift size={14} /> جاهز للتوصيل ({readyOrders.length})</p>
          {readyOrders.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-6 text-center text-xs text-muted-foreground">لا توجد طلبات جاهزة</div>
          ) : readyOrders.map(o => (
            <div key={o.id} className="border border-border rounded-xl p-3 space-y-2">
              <div className="flex justify-between">
                <p className="font-semibold text-sm">{o.orderNo}</p>
                <p className="text-xs text-muted-foreground">{o.deliveryArea || "—"}</p>
              </div>
              <p className="text-xs text-muted-foreground">{o.recipientName} • {o.recipientPhone}</p>
              {o.deliveryDate && <p className="text-xs text-muted-foreground">{o.deliveryDate} {o.deliveryTime || ""}</p>}
              <button onClick={() => dispatch(o.id)} className="w-full text-xs bg-violet-100 text-violet-700 rounded-lg py-1.5 font-semibold">إرسال للتوصيل <Bike size={12} className="inline" /></button>
            </div>
          ))}
        </div>

        {/* Out for delivery */}
        <div className="space-y-3">
          <p className="font-bold text-sm flex items-center gap-1"><Bike size={14} /> في الطريق ({loading ? "..." : orders.length})</p>
          {!loading && orders.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-6 text-center text-xs text-muted-foreground">لا يوجد توصيل حالياً</div>
          ) : orders.map(o => (
            <div key={o.id} className="border border-violet-200 bg-violet-50/50 dark:bg-violet-900/10 rounded-xl p-3 space-y-2">
              <div className="flex justify-between">
                <p className="font-semibold text-sm">{o.orderNo}</p>
                <span className="text-xs text-violet-600 font-medium">في الطريق</span>
              </div>
              <p className="text-xs text-muted-foreground">{o.recipientName} • {o.recipientPhone}</p>
              <p className="text-xs text-muted-foreground">{o.deliveryAddress}</p>
              <button onClick={() => markDelivered(o.id)} className="w-full text-xs bg-emerald-100 text-emerald-700 rounded-lg py-1.5 font-semibold">تأكيد الاستلام ✓</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { FlowerOrdersScreen, BouquetBuilderScreen, DeliveryMgmtScreen };
