// StorePanelB — Sales, Products, Inventory, Customers, Suppliers, Purchases, Expenses, Returns
import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Store, ShoppingCart, Package, Users, BarChart2, Settings, LogOut, Plus,
  Search, Bell, CreditCard, FileText, TrendingUp, TrendingDown, AlertCircle,
  Check, X, Edit2, Trash2, Eye, EyeOff, ArrowLeft, Lock, Unlock, RefreshCw,
  Download, Upload, Printer, Minus, Percent, DollarSign, ChevronRight,
  Layers, Shield, Activity, Phone, Mail, Star, CheckCircle,
  XCircle, AlertTriangle, Menu, Zap, Coffee, Scissors,
  Cpu, ShoppingBag, Send, Archive, RotateCcw, Scan, Wallet,
  Building2, Boxes, Truck, LayoutDashboard, UserCheck, ClipboardList,
  Banknote, Landmark, Handshake, Globe, MapPin, Key, User,
  ArrowUpRight, ArrowDownRight, Clipboard, Copy, Power, Monitor,
  Info, ChevronLeft, Grid3X3, List, Hash, Tag, Ruler, Calculator, FlipHorizontal,
  Flower2, Gift, Bike,
} from "lucide-react";
import { storeApi, useApi, useLS, norm, normList, dateAr, timeAr, showToast, KPI, Modal, F, TInput, SInput, Btn, Hdr, Empty, Toggle, useStoreId, sk, PLANS, CAT, ST, printReceipt, PRODUCTS, jod, getToken, useStoreModules } from "./lib";
import type { StoreData, Product, CartItem, StoreCategory } from "./lib";

interface OFFProduct {
  code: string;
  product_name?: string;
  product_name_ar?: string;
  product_name_en?: string;
  brands?: string;
  categories?: string;
  image_front_url?: string;
  image_url?: string;
  quantity?: string;
  nutriments?: { energy_100g?: number; proteins_100g?: number; carbohydrates_100g?: number; fat_100g?: number };
}

async function fetchOpenFoodFacts(barcode: string): Promise<OFFProduct | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=code,product_name,product_name_ar,product_name_en,brands,categories,image_front_url,image_url,quantity,nutriments`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    return data.product as OFFProduct;
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// SALES / INVOICES SCREEN — شاشة المبيعات والفواتير
// ─────────────────────────────────────────────────────────────────────────────

interface SaleRecord {
  id: string; invoiceNo: string; createdAt: string;
  items: { nameAr: string; qty: number; unitPrice: number; discount: number; total: number }[];
  subtotal: number; discountAmt: number; taxAmt: number; total: number;
  payMethod: string; cashIn?: number; change?: number; status: string;
  customerName?: string;
}

interface SalesStats { today: { total: number; count: number }; month: { total: number; count: number }; totalSales: number; }

function SalesScreen({ store }: { store: StoreData }) {
  const { data: salesRaw, loading, refresh } = useApi<unknown[]>("/sales?limit=200", []);
  const { data: stats } = useApi<SalesStats>("/sales/stats", { today: { total: 0, count: 0 }, month: { total: 0, count: 0 }, totalSales: 0 });
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [payFilter, setPayFilter] = useState("الكل");
  const [viewSale, setViewSale] = useState<SaleRecord | null>(null);

  useEffect(() => { setSales(normList<SaleRecord>(salesRaw)); }, [salesRaw]);

  const PAY_OPTS = ["الكل", "نقدي", "بطاقة", "كليك", "مختلط"];

  const filtered = sales.filter(s => {
    const q = search.toLowerCase();
    const matchQ = !q || s.invoiceNo?.toLowerCase().includes(q) || s.customerName?.toLowerCase().includes(q);
    const matchPay = payFilter === "الكل" || s.payMethod === payFilter;
    const d = s.createdAt ? new Date(s.createdAt) : null;
    const matchFrom = !fromDate || (d && d >= new Date(fromDate));
    const matchTo   = !toDate   || (d && d <= new Date(toDate + "T23:59:59"));
    return matchQ && matchPay && matchFrom && matchTo;
  });

  const PM: Record<string, string> = { نقدي: "bg-emerald-100 text-emerald-700", بطاقة: "bg-blue-100 text-blue-700", كليك: "bg-purple-100 text-purple-700", مختلط: "bg-orange-100 text-orange-700" };

  const reprintSale = (s: SaleRecord) => {
    const tax  = Number(localStorage.getItem(`sowwanjo_sett_tax_${store.id}`) || 16);
    const paper = localStorage.getItem(`sowwanjo_sett_paper_${store.id}`) || "80mm";
    printReceipt({
      invNo: s.invoiceNo, storeName: store.nameAr, storePhone: store.phone,
      items: s.items.map(i => ({ name: i.nameAr, qty: i.qty, price: i.unitPrice, discount: i.discount || 0 })),
      subtotal: s.subtotal, discountAmt: s.discountAmt || 0, taxAmt: s.taxAmt || 0, taxRate: tax,
      total: s.total, payMethod: s.payMethod,
      cashIn: s.cashIn, change: s.change,
      date: s.createdAt ? new Date(s.createdAt).toLocaleDateString("ar-JO") : "",
      time: s.createdAt ? new Date(s.createdAt).toLocaleTimeString("ar-JO", { hour: "2-digit", minute: "2-digit" }) : "",
    }, paper);
  };

  return (
    <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto h-full">
      <Hdr title="المبيعات والفواتير" action={
        <Btn v="secondary" s="sm" icon={<RefreshCw size={13} />} onClick={refresh}>تحديث</Btn>
      } />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPI icon={<ShoppingCart size={18} />} label="مبيعات اليوم" value={`${(stats.today.total || 0).toFixed(3)} JOD`} sub={`${stats.today.count || 0} فاتورة`} color="#1D4ED8" />
        <KPI icon={<TrendingUp size={18} />} label="مبيعات الشهر" value={`${(stats.month.total || 0).toFixed(3)} JOD`} sub={`${stats.month.count || 0} فاتورة`} color="#059669" />
        <KPI icon={<FileText size={18} />} label="إجمالي الفواتير" value={String(stats.totalSales || 0)} color="#7C3AED" />
        <KPI icon={<DollarSign size={18} />} label="متوسط الفاتورة" value={stats.month.count ? `${((stats.month.total || 0) / stats.month.count).toFixed(3)} JOD` : "0.000 JOD"} color="#D97706" />
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative lg:col-span-1">
            <Search size={13} className="absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث برقم الفاتورة..." className="w-full h-10 rounded-xl border border-border bg-input-background text-sm pr-8 pl-3 focus:outline-none focus:ring-2 focus:ring-ring/25" />
          </div>
          <TInput value={fromDate} onChange={setFromDate} type="date" placeholder="من تاريخ" />
          <TInput value={toDate} onChange={setToDate} type="date" placeholder="إلى تاريخ" />
          <SInput value={payFilter} onChange={setPayFilter} options={PAY_OPTS.map(p => ({ value: p, label: p }))} />
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {loading && <p className="text-center text-muted-foreground py-6 text-sm">جاري التحميل...</p>}
        {!loading && filtered.length === 0 && (
          <div className="bg-card rounded-2xl border border-border">
            <Empty icon={<FileText size={28} />} title="لا توجد فواتير" desc="ستظهر هنا جميع عمليات البيع بعد إنجازها من نقطة البيع" />
          </div>
        )}
        {filtered.map(s => (
          <div key={s.id} className="bg-card rounded-2xl border border-border p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-black text-primary text-sm">{s.invoiceNo}</p>
                <p className="text-xs text-muted-foreground">{s.createdAt ? new Date(s.createdAt).toLocaleDateString("ar-JO", { year: "numeric", month: "short", day: "numeric" }) : ""}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${PM[s.payMethod] || "bg-gray-100 text-gray-600"}`}>{s.payMethod}</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{s.items?.length || 0} أصناف</p>
              <p className="font-black text-base">{s.total?.toFixed(3)} JOD</p>
            </div>
            <div className="flex gap-2 mt-3">
              <Btn v="secondary" s="xs" full icon={<Eye size={11} />} onClick={() => setViewSale(s)}>عرض</Btn>
              <Btn v="ghost" s="xs" full icon={<Printer size={11} />} onClick={() => reprintSale(s)}>طباعة</Btn>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <p className="text-center text-muted-foreground py-10 text-sm">جاري تحميل الفواتير...</p>
        ) : filtered.length === 0 ? (
          <Empty icon={<FileText size={28} />} title="لا توجد فواتير" desc="ستظهر هنا جميع عمليات البيع بعد إنجازها من نقطة البيع" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {["رقم الفاتورة","التاريخ","الأصناف","المجموع الفرعي","الضريبة","الإجمالي","طريقة الدفع",""].map(h => (
                    <th key={h} className="text-right font-bold text-muted-foreground text-xs px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-black text-primary">{s.invoiceNo}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{s.createdAt ? new Date(s.createdAt).toLocaleDateString("ar-JO", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                    <td className="px-4 py-3">{s.items?.length || 0} صنف</td>
                    <td className="px-4 py-3">{(s.subtotal || 0).toFixed(3)}</td>
                    <td className="px-4 py-3">{(s.taxAmt || 0).toFixed(3)}</td>
                    <td className="px-4 py-3 font-black">{(s.total || 0).toFixed(3)} JOD</td>
                    <td className="px-4 py-3"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PM[s.payMethod] || "bg-gray-100 text-gray-600"}`}>{s.payMethod}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Btn v="ghost" s="xs" icon={<Eye size={10} />} onClick={() => setViewSale(s)}>عرض</Btn>
                        <Btn v="secondary" s="xs" icon={<Printer size={10} />} onClick={() => reprintSale(s)}>طباعة</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice detail modal */}
      {viewSale && (
        <Modal title={`فاتورة ${viewSale.invoiceNo}`} sub={viewSale.createdAt ? new Date(viewSale.createdAt).toLocaleString("ar-JO") : ""} onClose={() => setViewSale(null)}>
          <div className="space-y-4">
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {["المنتج","الكمية","السعر","الخصم","المجموع"].map(h => <th key={h} className="text-right px-3 py-2 text-xs font-bold text-muted-foreground">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(viewSale.items || []).map((it, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-bold">{it.nameAr}</td>
                      <td className="px-3 py-2">{it.qty}</td>
                      <td className="px-3 py-2">{(it.unitPrice || 0).toFixed(3)}</td>
                      <td className="px-3 py-2">{(it.discount || 0).toFixed(3)}</td>
                      <td className="px-3 py-2 font-black">{(it.total || 0).toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 border-t border-border pt-3">
              {[["المجموع الفرعي", `${(viewSale.subtotal||0).toFixed(3)} JOD`], ["الخصم", `${(viewSale.discountAmt||0).toFixed(3)} JOD`], ["الضريبة", `${(viewSale.taxAmt||0).toFixed(3)} JOD`], ["الإجمالي", `${(viewSale.total||0).toFixed(3)} JOD`], ["طريقة الدفع", viewSale.payMethod]].map(([l, v]) => (
                <div key={l} className="flex justify-between text-sm"><span className="text-muted-foreground">{l}</span><span className="font-bold">{v}</span></div>
              ))}
            </div>
            <Btn full icon={<Printer size={14} />} onClick={() => { reprintSale(viewSale); setViewSale(null); }}>إعادة طباعة الفاتورة</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ProductsMgr() {
  const sid = useStoreId();
  const modules = useStoreModules();
  const storeCategory = (() => {
    try { return JSON.parse(localStorage.getItem(`sowwanjo_storeinfo_${sid}`) || "{}").category || "supermarket"; } catch { return "supermarket"; }
  })();
  const { data: prodsRaw, loading: prodsLoading, refresh: refreshProds } = useApi<unknown[]>("/products", []);
  const [prods, setProds] = useState<Product[]>([]);
  useEffect(() => { setProds(normList<Product>(prodsRaw)); }, [prodsRaw]);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("الكل");
  const [showAdd, setShowAdd] = useState(false);
  const [editProd, setEditProd] = useState<Product | null>(null);
  const [labelProd, setLabelProd] = useState<Product | null>(null);
  const [labelOpts, setLabelOpts] = useState({ qty: 10, size: "md" as "sm"|"md"|"lg", showQr: true, showPrice: true, showName: true, perRow: 4 });
  const [ofoLoading, setOfoLoading] = useState(false);
  const [ofoResult, setOfoResult] = useState<OFFProduct | null>(null);
  const [ofoError, setOfoError] = useState("");
  const emptyF = { nameAr: "", nameEn: "", barcode: "", sku: "", category: "", costPrice: "", sellPrice: "", stock: "", minStock: "", unit: "قطعة", image: "" };
  const [f, setF] = useState(emptyF);

  const categories = ["الكل", ...Array.from(new Set(prods.map(p => p.category)))];
  const filtered = prods.filter(p =>
    (catFilter === "الكل" || p.category === catFilter) &&
    (!q || p.nameAr.includes(q) || p.barcode.includes(q) || p.sku.toLowerCase().includes(q.toLowerCase()))
  );

  // ── Real OpenFoodFacts API call ────────────────────────────────────────────
  const fetchOFF = async () => {
    if (!f.barcode.trim()) return;
    setOfoLoading(true); setOfoError(""); setOfoResult(null);
    const prod = await fetchOpenFoodFacts(f.barcode.trim());
    setOfoLoading(false);
    if (!prod) { setOfoError("لم يتم العثور على المنتج في قاعدة بيانات Open Food Facts — يمكنك إدخال البيانات يدوياً"); return; }
    setOfoResult(prod);
    const nameEn = prod.product_name_en || prod.product_name || "";
    const nameAr = prod.product_name_ar || nameEn;
    const category = prod.categories?.split(",")[0]?.trim() || "";
    const image = prod.image_front_url || prod.image_url || "";
    setF(prev => ({ ...prev, nameEn, nameAr: nameAr || prev.nameAr, category, image }));
    showToast(`تم جلب بيانات "${nameEn || prod.code}" بنجاح من Open Food Facts ✓`, "success");
  };

  const save = async () => {
    if (!f.nameAr || !f.sellPrice) return;
    const payload = {
      ...f,
      costPrice: parseFloat(f.costPrice) || 0,
      sellPrice: parseFloat(f.sellPrice) || 0,
      stock: parseInt(f.stock) || 0,
      minStock: parseInt(f.minStock) || 5,
      image: f.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&h=100&fit=crop",
    };
    try {
      await storeApi.post("/products", payload);
      await refreshProds();
      showToast(`تم إضافة "${f.nameAr}" وحفظه في قاعدة البيانات ✅`);
    } catch { showToast("خطأ في الحفظ", "error"); return; }
    setShowAdd(false); setF(emptyF); setOfoResult(null); setOfoError("");
  };

  const saveEdit = async () => {
    if (!editProd) return;
    try {
      await storeApi.put(`/products/${editProd.id}`, editProd);
      await refreshProds();
      showToast(`تم تحديث "${editProd.nameAr}"`);
    } catch { showToast("خطأ في التحديث", "error"); }
    setEditProd(null);
  };

  const exportCSV = () => {
    const rows = [["الاسم","Barcode","SKU","الفئة","سعر التكلفة","سعر البيع","المخزون","الحد الأدنى","الوحدة"].join(","),
      ...prods.map(p => [p.nameAr,p.barcode,p.sku,p.category,p.costPrice,p.sellPrice,p.stock,p.minStock,p.unit].join(","))
    ].join("\n");
    const blob = new Blob(["﻿"+rows], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "products.csv"; a.click();
    showToast("تم تصدير المنتجات إلى CSV بنجاح");
  };

  return (
    <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto h-full">
      <Hdr title="إدارة المنتجات" sub={`${prods.length} منتج • ${categories.length - 1} فئة`}
        action={<>
          <Btn v="secondary" s="sm" icon={<Upload size={13} />} onClick={() => showToast("ميزة استيراد CSV تتطلب الـ Backend — راجع دليل الإعداد", "info")}>استيراد CSV</Btn>
          <Btn v="secondary" s="sm" icon={<Download size={13} />} onClick={exportCSV}>تصدير CSV</Btn>
          <Btn s="sm" icon={<Plus size={13} />} onClick={() => { setShowAdd(true); setF(emptyF); setOfoResult(null); setOfoError(""); }}>منتج جديد</Btn>
        </>} />

      {/* ── Barcode / QR quick print bar ── */}
      {filtered.length > 0 && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
              <Tag size={15} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-purple-900">طباعة ملصقات الباركود / QR Code</p>
              <p className="text-xs text-purple-600">اضغط على أيقونة <Tag size={10} className="inline" /> بجانب أي منتج، أو اختر منتجاً من القائمة أدناه</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              className="h-9 rounded-xl border border-purple-300 bg-white text-sm font-semibold px-3 text-purple-800 focus:outline-none"
              onChange={e => {
                const p = filtered.find(x => x.id === e.target.value);
                if (p) setLabelProd({ ...p });
                e.target.value = "";
              }}
              defaultValue=""
            >
              <option value="" disabled>اختر منتجاً...</option>
              {filtered.map(p => <option key={p.id} value={p.id}>{p.nameAr}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-48"><TInput value={q} onChange={setQ} placeholder="بحث بالاسم، الباركود، SKU..." icon={<Search size={14} />} /></div>
        <div className="flex gap-1.5 overflow-x-auto">
          {categories.map(c => <button key={c} onClick={() => setCatFilter(c)} className={`shrink-0 px-3 h-10 rounded-xl text-xs font-bold border transition-all ${catFilter === c ? "bg-primary text-white border-primary" : "border-border bg-card hover:border-primary hover:text-primary"}`}>{c}</button>)}
        </div>
      </div>

      {prods.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border">
          <Empty icon={<Package size={28} />} title="لا توجد منتجات بعد" desc={storeCategory === "supermarket" ? "أضف منتجاً جديداً أو استخدم جلب Open Food Facts للسوبرماركت" : "أضف منتجاً جديداً للبدء"} />
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-border/60">
            {filtered.map(p => {
              const mg = p.costPrice > 0 ? ((p.sellPrice - p.costPrice) / p.costPrice * 100) : 0;
              const low = p.stock <= p.minStock;
              return (
                <div key={p.id} className={`p-4 ${p.stock === 0 ? "bg-red-50/20" : ""}`}>
                  <div className="flex items-start gap-3 mb-3">
                    {p.image ? <img src={p.image} alt={p.nameAr} className="w-12 h-12 rounded-xl object-cover bg-muted shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} /> : <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0"><Package size={18} className="text-muted-foreground/40" /></div>}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{p.nameAr}</p>
                      <p className="text-xs text-muted-foreground">{p.sku || p.nameEn}</p>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full mt-1 inline-block">{p.category}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button title="طباعة ملصق" onClick={() => setLabelProd({ ...p })} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-purple-100 text-purple-500 active:scale-90"><Tag size={14} /></button>
                      <button onClick={() => setEditProd({ ...p })} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-blue-100 text-blue-500 active:scale-90"><Edit2 size={14} /></button>
                      <button onClick={async () => { await storeApi.delete(`/products/${p.id}`); await refreshProds(); showToast(`تم حذف "${p.nameAr}"`, "warning"); }} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-red-100 text-red-500 active:scale-90"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-muted/50 rounded-xl p-2 text-center"><p className="font-black">{p.sellPrice.toFixed(3)}</p><p className="text-muted-foreground">سعر البيع</p></div>
                    <div className={`rounded-xl p-2 text-center ${low ? "bg-red-50" : "bg-muted/50"}`}><p className={`font-black ${low ? "text-red-600" : ""}`}>{p.stock}</p><p className="text-muted-foreground">المخزون</p></div>
                    <div className="bg-muted/50 rounded-xl p-2 text-center"><p className={`font-black ${mg > 30 ? "text-emerald-600" : mg > 10 ? "text-amber-600" : "text-red-500"}`}>{mg.toFixed(0)}%</p><p className="text-muted-foreground">الربح</p></div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/40">
                {["المنتج","الباركود","الفئة","تكلفة","بيع","مخزون","ربح","الحالة","إجراءات"].map(h => <th key={h} className="text-right p-3.5 font-bold text-muted-foreground text-xs">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map(p => {
                  const mg = p.costPrice > 0 ? ((p.sellPrice - p.costPrice) / p.costPrice * 100) : 0;
                  const low = p.stock <= p.minStock;
                  return (
                    <tr key={p.id} className={`hover:bg-muted/20 ${p.stock === 0 ? "bg-red-50/30" : ""}`}>
                      <td className="p-3.5"><div className="flex items-center gap-3">
                        {p.image ? <img src={p.image} alt={p.nameAr} className="w-10 h-10 rounded-xl object-cover bg-muted shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} /> : <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0"><Package size={16} className="text-muted-foreground/40" /></div>}
                        <div><p className="font-bold">{p.nameAr}</p><p className="text-xs text-muted-foreground">{p.sku || p.nameEn}</p></div>
                      </div></td>
                      <td className="p-3.5 font-mono text-xs text-muted-foreground">{p.barcode}</td>
                      <td className="p-3.5"><span className="text-xs bg-muted px-2 py-0.5 rounded-full">{p.category}</span></td>
                      <td className="p-3.5 text-muted-foreground text-xs">{p.costPrice.toFixed(3)}</td>
                      <td className="p-3.5 font-bold">{p.sellPrice.toFixed(3)} JOD</td>
                      <td className="p-3.5"><div className="flex items-center gap-1"><span className={`font-black ${low ? "text-red-600" : ""}`}>{p.stock}</span>{low && <AlertTriangle size={11} className="text-red-500" />}</div></td>
                      <td className="p-3.5"><span className={`font-bold text-xs ${mg > 30 ? "text-emerald-600" : mg > 10 ? "text-amber-600" : "text-red-500"}`}>{mg.toFixed(1)}%</span></td>
                      <td className="p-3.5">{p.stock === 0 ? <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">نفد</span> : low ? <span className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">منخفض</span> : <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">مناسب</span>}</td>
                      <td className="p-3.5"><div className="flex gap-0.5">
                        <button title="طباعة ملصق باركود/QR" onClick={() => setLabelProd({ ...p })} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-purple-100 text-purple-500"><Tag size={11} /></button>
                        <button onClick={() => setEditProd({ ...p })} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-100 text-blue-500"><Edit2 size={11} /></button>
                        <button onClick={async () => { await storeApi.delete(`/products/${p.id}`); await refreshProds(); showToast(`تم حذف "${p.nameAr}"`, "warning"); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-100 text-red-500"><Trash2 size={11} /></button>
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add Product Modal ── */}
      {showAdd && (
        <Modal title="إضافة منتج جديد" sub={storeCategory === "supermarket" ? "ادخل الباركود للجلب التلقائي من Open Food Facts أو أدخل البيانات يدوياً" : "أدخل بيانات المنتج الجديد"} onClose={() => setShowAdd(false)} size="lg">

          {/* Open Food Facts Section — supermarket only */}
          {modules.openFoodFacts && <div className="mb-5 p-4 bg-gradient-to-l from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center"><Scan size={14} className="text-blue-600" /></div>
              <div>
                <p className="text-sm font-bold text-blue-800">جلب تلقائي من Open Food Facts API</p>
                <p className="text-xs text-blue-600">قاعدة بيانات عالمية مجانية تحتوي على ملايين منتج السوبرماركت</p>
              </div>
            </div>
            <div className="flex gap-2">
              <TInput value={f.barcode} onChange={v => setF({ ...f, barcode: v })} placeholder="أدخل الباركود (مثل: 3017620422003)" icon={<Hash size={13} />} />
              <Btn v="primary" onClick={fetchOFF} disabled={ofoLoading || !f.barcode.trim()} icon={ofoLoading ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}>
                {ofoLoading ? "جاري الجلب..." : "جلب البيانات"}
              </Btn>
            </div>

            {ofoError && (
              <div className="mt-3 flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" />{ofoError}
              </div>
            )}

            {ofoResult && (
              <div className="mt-3 p-3 bg-white border border-blue-200 rounded-xl flex items-start gap-3">
                {(ofoResult.image_front_url || ofoResult.image_url) && (
                  <img src={ofoResult.image_front_url || ofoResult.image_url} alt="" className="w-16 h-16 rounded-xl object-contain bg-gray-50 shrink-0 border border-gray-100" />
                )}
                <div className="flex-1 min-w-0 text-xs">
                  <p className="font-bold text-foreground text-sm">{ofoResult.product_name_en || ofoResult.product_name}</p>
                  {ofoResult.brands && <p className="text-muted-foreground">العلامة التجارية: <strong>{ofoResult.brands}</strong></p>}
                  {ofoResult.quantity && <p className="text-muted-foreground">الكمية: <strong>{ofoResult.quantity}</strong></p>}
                  {ofoResult.categories && <p className="text-muted-foreground truncate">الفئات: {ofoResult.categories.split(",").slice(0,3).join(", ")}</p>}
                  {ofoResult.nutriments && (
                    <div className="flex gap-3 mt-1.5 text-xs">
                      {ofoResult.nutriments.energy_100g !== undefined && <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">طاقة: {ofoResult.nutriments.energy_100g} kJ</span>}
                      {ofoResult.nutriments.proteins_100g !== undefined && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">بروتين: {ofoResult.nutriments.proteins_100g}g</span>}
                      {ofoResult.nutriments.fat_100g !== undefined && <span className="bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded">دهون: {ofoResult.nutriments.fat_100g}g</span>}
                    </div>
                  )}
                  <p className="text-emerald-600 font-bold mt-1">✓ تم ملء بيانات المنتج تلقائياً — أدخل السعر والمخزون فقط</p>
                </div>
              </div>
            )}
          </div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="الاسم بالعربية" req><TInput value={f.nameAr} onChange={v => setF({ ...f, nameAr: v })} placeholder="مثال: كوكا كولا" /></F>
            <F label="الاسم بالإنجليزية"><TInput value={f.nameEn} onChange={v => setF({ ...f, nameEn: v })} placeholder="Example: Coca Cola" /></F>
            <F label="الباركود"><TInput value={f.barcode} onChange={v => setF({ ...f, barcode: v })} placeholder="6291003XXXXXX" icon={<Scan size={13} />} /></F>
            <F label="الـ SKU"><TInput value={f.sku} onChange={v => setF({ ...f, sku: v })} placeholder="RICE-BAS-5KG" /></F>
            <F label="الفئة" req><TInput value={f.category} onChange={v => setF({ ...f, category: v })} placeholder="حبوب وأرز" /></F>
            <F label="وحدة القياس"><SInput value={f.unit} onChange={v => setF({ ...f, unit: v })} options={["قطعة","كيس","كغ","غرام","لتر","مل","علبة","كرتون","قارورة","كرتونة"].map(u => ({ value: u, label: u }))} /></F>
            <F label="سعر التكلفة (JOD)" req><TInput value={f.costPrice} onChange={v => setF({ ...f, costPrice: v })} type="number" placeholder="3.500" /></F>
            <F label="سعر البيع (JOD)" req><TInput value={f.sellPrice} onChange={v => setF({ ...f, sellPrice: v })} type="number" placeholder="4.750" /></F>
            <F label="الكمية في المخزون" req><TInput value={f.stock} onChange={v => setF({ ...f, stock: v })} type="number" placeholder="100" /></F>
            <F label="الحد الأدنى للتنبيه"><TInput value={f.minStock} onChange={v => setF({ ...f, minStock: v })} type="number" placeholder="20" /></F>
            <div className="sm:col-span-2">
              <F label="رابط صورة المنتج (URL)"><TInput value={f.image} onChange={v => setF({ ...f, image: v })} placeholder="https://..." /></F>
            </div>
          </div>

          {f.sellPrice && f.costPrice && parseFloat(f.costPrice) > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-lg font-black text-emerald-700">{(((parseFloat(f.sellPrice) - parseFloat(f.costPrice)) / parseFloat(f.costPrice)) * 100).toFixed(1)}%</p>
                <p className="text-xs text-emerald-600">هامش الربح</p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-lg font-black text-blue-700">{(parseFloat(f.sellPrice) - parseFloat(f.costPrice)).toFixed(3)}</p>
                <p className="text-xs text-blue-600">ربح الوحدة (JOD)</p>
              </div>
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                <p className="text-lg font-black text-purple-700">{f.stock ? (parseFloat(f.stock) * parseFloat(f.costPrice)).toFixed(3) : "0.000"}</p>
                <p className="text-xs text-purple-600">قيمة المخزون (JOD)</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-5 justify-end">
            <Btn v="secondary" onClick={() => { setShowAdd(false); setOfoResult(null); setOfoError(""); }}>إلغاء</Btn>
            <Btn icon={<Plus size={14} />} onClick={save} disabled={!f.nameAr || !f.sellPrice}>حفظ المنتج</Btn>
          </div>
        </Modal>
      )}

      {/* ── Edit Product Modal ── */}
      {editProd && (
        <Modal title={`تعديل: ${editProd.nameAr}`} onClose={() => setEditProd(null)} size="lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="الاسم بالعربية"><TInput value={editProd.nameAr} onChange={v => setEditProd({...editProd, nameAr: v})} /></F>
            <F label="الاسم بالإنجليزية"><TInput value={editProd.nameEn} onChange={v => setEditProd({...editProd, nameEn: v})} /></F>
            <F label="الباركود"><TInput value={editProd.barcode} onChange={v => setEditProd({...editProd, barcode: v})} /></F>
            <F label="الفئة"><TInput value={editProd.category} onChange={v => setEditProd({...editProd, category: v})} /></F>
            <F label="سعر التكلفة (JOD)"><TInput value={String(editProd.costPrice)} onChange={v => setEditProd({...editProd, costPrice: parseFloat(v)||0})} type="number" /></F>
            <F label="سعر البيع (JOD)"><TInput value={String(editProd.sellPrice)} onChange={v => setEditProd({...editProd, sellPrice: parseFloat(v)||0})} type="number" /></F>
            <F label="المخزون الحالي"><TInput value={String(editProd.stock)} onChange={v => setEditProd({...editProd, stock: parseInt(v)||0})} type="number" /></F>
            <F label="الحد الأدنى للتنبيه"><TInput value={String(editProd.minStock)} onChange={v => setEditProd({...editProd, minStock: parseInt(v)||0})} type="number" /></F>
          </div>
          <div className="flex gap-3 mt-5 justify-end">
            <Btn v="secondary" onClick={() => setEditProd(null)}>إلغاء</Btn>
            <Btn onClick={saveEdit} icon={<Check size={14} />}>حفظ التعديلات</Btn>
          </div>
        </Modal>
      )}

      {/* ── Label Print Modal ── */}
      {labelProd && (
        <Modal title={`طباعة ملصقات — ${labelProd.nameAr}`} onClose={() => setLabelProd(null)} size="sm">
          <div className="space-y-4">
            {/* Preview card */}
            <div className="rounded-2xl border-2 border-purple-200 bg-purple-50 p-4 text-center">
              <p className="text-xs font-bold text-purple-700 mb-1">{labelProd.nameAr}</p>
              <p className="text-xs font-mono text-purple-500 mb-1">{labelProd.barcode || labelProd.sku}</p>
              {labelOpts.showPrice && <p className="text-sm font-black text-purple-800">{labelProd.sellPrice.toFixed(3)} JOD</p>}
            </div>
            {/* Options */}
            <div className="grid grid-cols-2 gap-4">
              <F label="عدد الملصقات">
                <TInput value={String(labelOpts.qty)} onChange={v => setLabelOpts({ ...labelOpts, qty: Math.max(1, Math.min(200, parseInt(v)||1)) })} type="number" />
              </F>
              <F label="حجم الملصق">
                <SInput value={labelOpts.size} onChange={v => setLabelOpts({ ...labelOpts, size: v as "sm"|"md"|"lg" })} options={[
                  { value: "sm", label: "صغير (3×1.5 سم)" },
                  { value: "md", label: "متوسط (5×2.5 سم)" },
                  { value: "lg", label: "كبير (6×4 سم)" },
                ]} />
              </F>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                <input type="checkbox" checked={labelOpts.showName} onChange={e => setLabelOpts({ ...labelOpts, showName: e.target.checked })} className="rounded" />
                اسم المنتج
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                <input type="checkbox" checked={labelOpts.showPrice} onChange={e => setLabelOpts({ ...labelOpts, showPrice: e.target.checked })} className="rounded" />
                السعر
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                <input type="checkbox" checked={labelOpts.showQr} onChange={e => setLabelOpts({ ...labelOpts, showQr: e.target.checked })} className="rounded" />
                رمز QR
              </label>
            </div>
            <div className="flex gap-3 justify-end">
              <Btn v="secondary" onClick={() => setLabelProd(null)}>إلغاء</Btn>
              <Btn icon={<Printer size={14} />} onClick={async () => {
                const { printBarcodeLabels } = await import("./printLabel");
                await printBarcodeLabels(labelProd, labelOpts);
              }}>طباعة {labelOpts.qty} ملصق</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REMAINING STORE SCREENS
// ─────────────────────────────────────────────────────────────────────────────

function InvScreen() {
  // نفس مخزن المنتجات — تغييرات الجرد تنعكس على POS مباشرة
  const sid = useStoreId();
  const { data: invRaw, refresh: refreshInv } = useApi<unknown[]>("/products", []);
  const [invProds, setInvProds] = useState<Product[]>([]);
  useEffect(() => { setInvProds(normList<Product>(invRaw)); }, [invRaw]);
  const [adjProd, setAdjProd] = useState<Product | null>(null);
  const [adjQty, setAdjQty] = useState("");
  const [adjType, setAdjType] = useState<"add"|"set"|"remove">("add");
  const [adjNote, setAdjNote] = useState("");
  const [showJard, setShowJard] = useState(false);
  const [jardCounts, setJardCounts] = useState<Record<string,string>>({});

  const openAdj = (p: Product) => { setAdjProd(p); setAdjQty(""); setAdjNote(""); setAdjType("add"); };

  const doAdj = async () => {
    if (!adjProd || !adjQty) return;
    const qty = parseInt(adjQty) || 0;
    try {
      await storeApi.patch(`/products/${adjProd.id}/stock`, { qty, type: adjType });
      await refreshInv();
      showToast(`تم تعديل مخزون "${adjProd.nameAr}" ✅`, "success");
    } catch { showToast("خطأ في تعديل المخزون", "error"); }
    setAdjProd(null);
  };

  const startJard = () => {
    const counts: Record<string,string> = {};
    invProds.forEach(p => { counts[p.id] = ""; });
    setJardCounts(counts);
    setShowJard(true);
  };

  const saveJard = async () => {
    const counts = Object.entries(jardCounts)
      .filter(([, v]) => v !== "" && v !== undefined)
      .map(([productId, actualQty]) => ({ productId, actualQty: parseInt(actualQty) || 0 }));
    try {
      await storeApi.post("/inventory/count", { counts });
      await refreshInv();
      showToast("تم حفظ نتائج الجرد وتحديث المخزون في قاعدة البيانات ✓", "success");
    } catch { showToast("خطأ في حفظ الجرد", "error"); }
    setShowJard(false);
  };

  const printJard = () => {
    const rows = invProds.map(p => `<tr><td>${p.nameAr}</td><td>${p.sku}</td><td>${p.stock} ${p.unit}</td><td style="border:1px solid #ccc;min-width:60px;"></td><td style="border:1px solid #ccc;min-width:80px;"></td></tr>`).join("");
    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"/><style>body{font-family:Arial,sans-serif;font-size:11px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:4px 6px;text-align:right;}th{background:#f5f5f5;font-weight:bold;}@media print{@page{margin:10mm;}}</style></head><body><h2 style="text-align:center">ورقة جرد المخزون</h2><p style="text-align:center">التاريخ: ${new Date().toLocaleDateString("ar-JO")}</p><br/><table><thead><tr><th>المنتج</th><th>SKU</th><th>الكمية في النظام</th><th>الكمية الفعلية</th><th>الفارق</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const win = window.open("","_blank","width=900,height=600");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 400);
  };

  const lowStock = invProds.filter(p => p.stock <= p.minStock).length;
  const outStock = invProds.filter(p => p.stock === 0).length;
  const totalVal = invProds.reduce((a, p) => a + p.costPrice * p.stock, 0);

  return (
    <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto h-full">
      <Hdr title="إدارة المخزون والجرد" action={
        <div className="flex gap-2">
          <Btn v="secondary" s="sm" icon={<Printer size={13} />} onClick={printJard}>طباعة ورقة الجرد</Btn>
          <Btn v="secondary" s="sm" icon={<RefreshCw size={13} />} onClick={startJard}>بدء الجرد</Btn>
          <Btn s="sm" icon={<Plus size={13} />} onClick={() => invProds.length ? openAdj(invProds[0]) : showToast("أضف منتجات أولاً", "warning")}>تعديل المخزون</Btn>
        </div>
      } />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={<Boxes size={18} />} label="إجمالي الأصناف" value={invProds.length.toLocaleString()} color="#1D4ED8" />
        <KPI icon={<AlertTriangle size={18} />} label="منخفض المخزون" value={String(lowStock)} color="#D97706" />
        <KPI icon={<XCircle size={18} />} label="نفد المخزون" value={String(outStock)} color="#DC2626" />
        <KPI icon={<DollarSign size={18} />} label="قيمة المخزون" value={`${totalVal.toFixed(3)} JOD`} color="#059669" />
      </div>

      {invProds.length === 0 ? (
        <Empty icon={<Boxes size={28} />} title="لا توجد منتجات في المخزون" desc="أضف منتجات من شاشة إدارة المنتجات" />
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-border/60">
            {invProds.map(p => {
              const val = p.costPrice * p.stock;
              const sc = p.stock === 0
                ? { l: "نفد", c: "text-red-700 bg-red-50 border-red-200" }
                : p.stock <= p.minStock
                ? { l: "منخفض", c: "text-orange-700 bg-orange-50 border-orange-200" }
                : { l: "مناسب", c: "text-emerald-700 bg-emerald-50 border-emerald-200" };
              return (
                <div key={p.id} className={`p-4 ${p.stock === 0 ? "bg-red-50/20" : ""}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div><p className="font-bold text-sm">{p.nameAr}</p><p className="text-xs text-muted-foreground">{p.category} • {p.sku}</p></div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${sc.c}`}>{sc.l}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div className="bg-muted/50 rounded-xl p-2 text-center"><p className="font-black text-lg">{p.stock}</p><p className="text-muted-foreground">{p.unit}</p></div>
                    <div className="bg-muted/50 rounded-xl p-2 text-center"><p className="font-black">{p.minStock}</p><p className="text-muted-foreground">الحد الأدنى</p></div>
                    <div className="bg-muted/50 rounded-xl p-2 text-center"><p className="font-black">{val.toFixed(3)}</p><p className="text-muted-foreground">القيمة JOD</p></div>
                  </div>
                  <Btn v="secondary" s="sm" full icon={<Edit2 size={12} />} onClick={() => openAdj(p)}>تعديل الكمية</Btn>
                </div>
              );
            })}
          </div>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/40">
                {["المنتج","SKU","الكمية","الحد الأدنى","قيمة المخزون","الحالة","إجراءات"].map(h =>
                  <th key={h} className="text-right p-3.5 font-bold text-muted-foreground text-xs">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-border/60">
                {invProds.map(p => {
                  const val = p.costPrice * p.stock;
                  const sc = p.stock === 0
                    ? { l: "نفد", c: "text-red-700 bg-red-100 border border-red-200" }
                    : p.stock <= p.minStock
                    ? { l: "منخفض", c: "text-orange-700 bg-orange-100 border border-orange-200" }
                    : { l: "مناسب", c: "text-emerald-700 bg-emerald-100 border border-emerald-200" };
                  return (
                    <tr key={p.id} className={`hover:bg-muted/20 ${p.stock === 0 ? "bg-red-50/30" : ""}`}>
                      <td className="p-3.5 font-bold">{p.nameAr}<br /><span className="text-xs text-muted-foreground font-normal">{p.category}</span></td>
                      <td className="p-3.5 font-mono text-xs text-muted-foreground">{p.sku}</td>
                      <td className="p-3.5 font-black text-lg">{p.stock} <span className="text-xs font-normal text-muted-foreground">{p.unit}</span></td>
                      <td className="p-3.5 text-muted-foreground">{p.minStock}</td>
                      <td className="p-3.5 font-bold">{val.toFixed(3)} JOD</td>
                      <td className="p-3.5"><span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${sc.c}`}>{sc.l}</span></td>
                      <td className="p-3.5"><Btn v="secondary" s="xs" icon={<Edit2 size={10} />} onClick={() => openAdj(p)}>تعديل</Btn></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjProd && (
        <Modal title={`تعديل مخزون: ${adjProd.nameAr}`} sub={`المخزون الحالي: ${adjProd.stock} ${adjProd.unit}`} onClose={() => setAdjProd(null)} size="sm">
          <div className="space-y-4">
            <F label="نوع التعديل">
              <SInput value={adjType} onChange={v => setAdjType(v as "add"|"set"|"remove")} options={[
                { value: "add", label: "➕ إضافة كمية" },
                { value: "remove", label: "➖ خصم كمية" },
                { value: "set", label: "✏️ تعيين كمية محددة" },
              ]} />
            </F>
            <F label="الكمية" req>
              <TInput value={adjQty} onChange={setAdjQty} type="number" placeholder="0" />
            </F>
            {adjQty && (
              <div className={`p-3 rounded-xl text-sm font-bold ${adjType === "add" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : adjType === "remove" ? "bg-red-50 border border-red-200 text-red-700" : "bg-blue-50 border border-blue-200 text-blue-700"}`}>
                المخزون الجديد سيكون:{" "}
                {adjType === "add" ? adjProd.stock + (parseInt(adjQty)||0) : adjType === "remove" ? Math.max(0, adjProd.stock - (parseInt(adjQty)||0)) : parseInt(adjQty)||0}{" "}
                {adjProd.unit}
              </div>
            )}
            <F label="ملاحظة (اختياري)">
              <TInput value={adjNote} onChange={setAdjNote} placeholder="سبب التعديل..." />
            </F>
            <div className="flex gap-3 justify-end">
              <Btn v="secondary" onClick={() => setAdjProd(null)}>إلغاء</Btn>
              <Btn onClick={doAdj} disabled={!adjQty} icon={<Check size={14} />}>حفظ التعديل</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Inventory Count (جرد) Modal */}
      {showJard && (
        <Modal title="جرد المخزون الفعلي" sub="أدخل الكميات الفعلية التي عددتها — اتركها فارغة إذا لم تعدّها" onClose={() => setShowJard(false)} size="lg">
          <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
            {invProds.map(p => (
              <div key={p.id} className="flex items-center gap-4 py-2 border-b border-border/60">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{p.nameAr}</p>
                  <p className="text-xs text-muted-foreground">في النظام: <strong>{p.stock}</strong> {p.unit}</p>
                </div>
                <div className="w-32">
                  <input
                    type="number"
                    value={jardCounts[p.id] ?? ""}
                    onChange={e => setJardCounts(prev => ({ ...prev, [p.id]: e.target.value }))}
                    placeholder="الكمية الفعلية"
                    className="w-full h-9 rounded-xl border border-border bg-input-background text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring/25"
                  />
                </div>
                {jardCounts[p.id] !== "" && jardCounts[p.id] !== undefined && (
                  <span className={`text-xs font-bold shrink-0 ${parseInt(jardCounts[p.id]||"0") < p.stock ? "text-red-600" : parseInt(jardCounts[p.id]||"0") > p.stock ? "text-emerald-600" : "text-muted-foreground"}`}>
                    {parseInt(jardCounts[p.id]||"0") > p.stock ? `+${parseInt(jardCounts[p.id]||"0") - p.stock}` : parseInt(jardCounts[p.id]||"0") < p.stock ? `${parseInt(jardCounts[p.id]||"0") - p.stock}` : "✓"}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 mb-4">
            ⚠️ الحقول الفارغة لن تُحدَّث. سيتم تحديث الحقول التي أدخلت فيها قيمة فقط.
          </div>
          <div className="flex gap-3 justify-end">
            <Btn v="secondary" icon={<Printer size={13} />} onClick={printJard}>طباعة ورقة الجرد</Btn>
            <Btn v="secondary" onClick={() => setShowJard(false)}>إلغاء</Btn>
            <Btn v="success" onClick={saveJard} icon={<Check size={14} />}>حفظ نتائج الجرد</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CustScreen() {
  type Cust = { id: number; name: string; phone: string; purchases: number; total: number; points: number; level: string; lastVisit: string };
  const sid = useStoreId();
  const { data: custsRaw, refresh: refreshCusts } = useApi<unknown[]>("/customers", []);
  const [custs, setCusts] = useState<Cust[]>([]);
  useEffect(() => { setCusts(normList<Cust>(custsRaw)); }, [custsRaw]);
  const [showNewC, setShowNewC] = useState(false);
  const [nc, setNc] = useState({ name: "", phone: "", level: "عادي" });
  const LV: Record<string, string> = { عادي: "bg-gray-100 text-gray-700", فضي: "bg-slate-200 text-slate-600", ذهبي: "bg-amber-100 text-amber-700", بلاتيني: "bg-purple-100 text-purple-700" };
  const addCust = async () => {
    if (!nc.name) return;
    try {
      await storeApi.post("/customers", { name: nc.name, phone: nc.phone, level: nc.level, loyaltyPoints: 0, totalPurchases: 0 });
      await refreshCusts();
      showToast(`تم إضافة "${nc.name}" وحفظه في قاعدة البيانات ✅`);
    } catch { showToast("خطأ في إضافة العميل", "error"); return; }
    setShowNewC(false); setNc({ name: "", phone: "", level: "عادي" });
  };
  return (
    <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto h-full">
      <Hdr title="إدارة العملاء" action={<><Btn v="secondary" s="sm" icon={<Upload size={13} />} onClick={() => showToast("اسحب ملف CSV لاستيراد العملاء", "info")}>استيراد</Btn><Btn s="sm" icon={<Plus size={13} />} onClick={() => setShowNewC(true)}>عميل جديد</Btn></>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={<Users size={18} />} label="إجمالي العملاء" value={custs.length.toLocaleString()} color="#1D4ED8" />
        <KPI icon={<Star size={18} />} label="عملاء مميزون" value={String(custs.filter(c => c.level !== "عادي").length)} color="#D97706" />
        <KPI icon={<DollarSign size={18} />} label="إجمالي المشتريات" value={`${custs.reduce((a,c)=>a+c.total,0).toFixed(3)} JOD`} color="#059669" />
        <KPI icon={<Wallet size={18} />} label="نقاط الولاء" value={custs.reduce((a,c)=>a+c.points,0).toLocaleString()} color="#7C3AED" />
      </div>
      {custs.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border">
          <Empty icon={<Users size={28} />} title="لا يوجد عملاء بعد" desc="أضف عميلاً جديداً من الزر أعلاه أو استورد من ملف CSV" />
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-border/60">
            {custs.map(c => (
              <div key={c.id} className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary shrink-0 text-lg">{c.name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${LV[c.level]}`}>{c.level}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div className="bg-muted/50 rounded-xl p-2 text-center"><p className="font-black">{c.purchases}</p><p className="text-muted-foreground">فاتورة</p></div>
                  <div className="bg-muted/50 rounded-xl p-2 text-center"><p className="font-black">{c.total.toFixed(3)}</p><p className="text-muted-foreground">JOD</p></div>
                  <div className="bg-amber-50 rounded-xl p-2 text-center"><p className="font-black text-amber-600">⭐ {c.points}</p><p className="text-amber-600">نقاط</p></div>
                </div>
                <div className="flex gap-2">
                  <Btn v="secondary" s="sm" full icon={<Eye size={12} />} onClick={() => showToast(`${c.name}: ${c.purchases} فاتورة، ${c.points} نقطة`, "info")}>تفاصيل</Btn>
                  <button onClick={async () => { await storeApi.delete(`/customers/${c.id}`); await refreshCusts(); showToast("تم حذف العميل","warning"); }} className="w-10 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 active:scale-90"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/40">{["العميل","المشتريات","الإجمالي","نقاط الولاء","المستوى","آخر زيارة","إجراءات"].map(h => <th key={h} className="text-right p-3.5 font-bold text-muted-foreground text-xs">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-border/60">
                {custs.map(c => (
                  <tr key={c.id} className="hover:bg-muted/20">
                    <td className="p-3.5"><div className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary shrink-0">{c.name[0]}</div><div><p className="font-bold">{c.name}</p><p className="text-xs text-muted-foreground">{c.phone}</p></div></div></td>
                    <td className="p-3.5 text-muted-foreground">{c.purchases} فاتورة</td>
                    <td className="p-3.5 font-bold">{c.total.toFixed(3)} JOD</td>
                    <td className="p-3.5"><span className="text-amber-600 font-bold">⭐ {c.points}</span></td>
                    <td className="p-3.5"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${LV[c.level]}`}>{c.level}</span></td>
                    <td className="p-3.5 text-xs text-muted-foreground">{c.lastVisit}</td>
                    <td className="p-3.5"><div className="flex gap-1">
                      <Btn v="ghost" s="xs" icon={<Eye size={10} />} onClick={() => showToast(`${c.name}: ${c.purchases} فاتورة، ${c.points} نقطة`, "info")}>تفاصيل</Btn>
                      <Btn v="ghost" s="xs" icon={<Trash2 size={10} />} onClick={async () => { await storeApi.delete(`/customers/${c.id}`); await refreshCusts(); showToast("تم حذف العميل","warning"); }}>حذف</Btn>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {showNewC && (
        <Modal title="إضافة عميل جديد" onClose={() => setShowNewC(false)} size="sm">
          <div className="space-y-4">
            <F label="الاسم الكامل" req><TInput value={nc.name} onChange={v=>setNc({...nc,name:v})} placeholder="محمد أحمد" /></F>
            <F label="رقم الهاتف"><TInput value={nc.phone} onChange={v=>setNc({...nc,phone:v})} placeholder="+962-79-XXX-XXXX" icon={<Phone size={13}/>} /></F>
            <F label="مستوى العضوية"><SInput value={nc.level} onChange={v=>setNc({...nc,level:v})} options={["عادي","فضي","ذهبي","بلاتيني"].map(l=>({value:l,label:l}))} /></F>
            <div className="flex gap-3 justify-end"><Btn v="secondary" onClick={()=>setShowNewC(false)}>إلغاء</Btn><Btn onClick={addCust} disabled={!nc.name} icon={<Plus size={14}/>}>إضافة العميل</Btn></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SuppScreen() {
  const sid = useStoreId();
  const { data: supsRaw, refresh: refreshSups } = useApi<unknown[]>("/suppliers", []);
  const [sups, setSups] = useState<{id:string;name:string;phone:string;products:number;lastOrder:string;balance:number}[]>([]);
  useEffect(() => { setSups(normList<{id:string;name:string;phone:string;products:number;lastOrder:string;balance:number}>(supsRaw)); }, [supsRaw]);
  return (
    <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto h-full">
      <Hdr title="إدارة الموردين" action={<Btn s="sm" icon={<Plus size={13} />} onClick={() => showToast("فتح نموذج إضافة مورد جديد", "info")}>مورد جديد</Btn>} />
      {sups.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border">
          <Empty icon={<Truck size={28} />} title="لا يوجد موردون بعد" desc='أضف مورداً جديداً من زر "مورد جديد"' />
        </div>
      ) : (
        <div className="space-y-3">
          {sups.map(s => (
            <div key={s.id} className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4 hover:shadow-sm transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0"><Truck size={20} className="text-primary" /></div>
              <div className="flex-1 min-w-0"><p className="font-bold">{s.name}</p><p className="text-xs text-muted-foreground">{s.phone} • {s.products} منتج • آخر طلب: {s.lastOrder}</p></div>
              <div className="hidden sm:block text-right shrink-0"><p className="text-sm font-black text-red-600">{s.balance.toFixed(3)} JOD</p><p className="text-xs text-muted-foreground">رصيد مستحق</p></div>
              <div className="flex gap-2"><Btn v="secondary" s="sm" icon={<ClipboardList size={12} />} onClick={() => showToast(`تم إنشاء طلب شراء من "${s.name}"`, "success")}>طلب شراء</Btn><Btn v="ghost" s="sm" icon={<Eye size={12} />} onClick={() => showToast(`${s.name}: ${s.products} منتج، رصيد مستحق ${s.balance.toFixed(3)} JOD`, "info")}>تفاصيل</Btn></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface PurchLine { productId?: string; nameAr: string; barcode?: string; sku?: string; qty: number; unitCost: number; discount: number; tax: number; total: number; }
interface PurchOrder {
  id: string; sup: string; orderNo?: string; orderDate?: string; deliveryDate?: string;
  lines?: PurchLine[]; items: number; subtotal?: number; taxAmt?: number; discountAmt?: number;
  total: number; status: string; notes?: string; createdAt?: string;
}

const PO_STATUSES: { id: string; label: string; color: string }[] = [
  { id: "draft",             label: "مسودة",           color: "bg-gray-100 text-gray-700" },
  { id: "sent",              label: "مُرسَل",           color: "bg-blue-100 text-blue-700" },
  { id: "partial",           label: "استلام جزئي",     color: "bg-amber-100 text-amber-700" },
  { id: "received",          label: "مكتمل",           color: "bg-emerald-100 text-emerald-700" },
  { id: "cancelled",         label: "ملغي",            color: "bg-red-100 text-red-700" },
  // legacy Arabic statuses for existing records
  { id: "قيد الاستلام",      label: "قيد الاستلام",    color: "bg-blue-100 text-blue-700" },
  { id: "مكتمل",             label: "مكتمل",           color: "bg-emerald-100 text-emerald-700" },
  { id: "ملغي",              label: "ملغي",            color: "bg-red-100 text-red-700" },
];

function poStatusColor(s: string) { return PO_STATUSES.find(x => x.id === s)?.color || "bg-gray-100 text-gray-600"; }
function poStatusLabel(s: string) { return PO_STATUSES.find(x => x.id === s)?.label || s; }

function PurchScreen() {
  const { data: ordersRaw, loading, refresh } = useApi<unknown[]>("/purchases", []);
  const { data: prodsRaw } = useApi<unknown[]>("/products", []);
  const { data: suppliersRaw } = useApi<unknown[]>("/suppliers", []);
  const [orders, setOrders] = useState<PurchOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<{id:string;name:string}[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [viewOrder, setViewOrder] = useState<PurchOrder | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setOrders(normList<PurchOrder>(ordersRaw)); }, [ordersRaw]);
  useEffect(() => { setProducts(normList<Product>(prodsRaw)); }, [prodsRaw]);
  useEffect(() => { setSuppliers(normList<{id:string;name:string}>(suppliersRaw)); }, [suppliersRaw]);

  const blankForm = () => ({ sup: "", orderDate: new Date().toISOString().split("T")[0], deliveryDate: "", notes: "", status: "draft" });
  const [hdr, setHdr] = useState(blankForm());
  const [lines, setLines] = useState<PurchLine[]>([]);
  const [lineQ, setLineQ] = useState("");
  const [showLineSearch, setShowLineSearch] = useState(false);

  const lineSubtotal = lines.reduce((a, l) => a + l.total, 0);
  const lineTax = lines.reduce((a, l) => a + (l.total * l.tax / 100), 0);
  const lineDiscount = lines.reduce((a, l) => a + (l.unitCost * l.qty * l.discount / 100), 0);
  const lineTotal = lineSubtotal + lineTax;

  const addLine = (p?: Product) => {
    const newLine: PurchLine = {
      productId: p?.id, nameAr: p?.nameAr || "", barcode: p?.barcode || "", sku: p?.sku || "",
      qty: 1, unitCost: p?.costPrice || 0, discount: 0, tax: 0, total: p?.costPrice || 0,
    };
    setLines(ls => [...ls, newLine]);
    setShowLineSearch(false); setLineQ("");
  };
  const updLine = (i: number, field: keyof PurchLine, val: string | number) =>
    setLines(ls => {
      const updated = [...ls];
      const l = { ...updated[i], [field]: val };
      l.total = Math.max(0, l.qty * l.unitCost * (1 - l.discount/100));
      updated[i] = l;
      return updated;
    });
  const rmLine = (i: number) => setLines(ls => ls.filter((_, idx) => idx !== i));

  const pickProduct = (p: Product) => {
    const exists = lines.findIndex(l => l.productId === p.id);
    if (exists >= 0) { updLine(exists, "qty", lines[exists].qty + 1); setShowLineSearch(false); setLineQ(""); return; }
    addLine(p);
  };

  const saveOrder = async () => {
    if (!hdr.sup) { showToast("يجب تحديد المورد", "warning"); return; }
    if (lines.length === 0) { showToast("أضف منتجاً واحداً على الأقل", "warning"); return; }
    setSaving(true);
    try {
      await storeApi.post("/purchases", {
        sup: hdr.sup, orderDate: hdr.orderDate, deliveryDate: hdr.deliveryDate, notes: hdr.notes, status: hdr.status,
        lines, items: lines.length, subtotal: lineSubtotal, taxAmt: lineTax, discountAmt: lineDiscount, total: lineTotal,
      });
      await refresh();
      showToast("تم حفظ طلب الشراء ✅", "success");
      setShowAdd(false); setHdr(blankForm()); setLines([]);
    } catch { showToast("خطأ في حفظ طلب الشراء", "error"); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await storeApi.put(`/purchases/${id}`, { status });
      await refresh();
      showToast(`تم تحديث الحالة: ${poStatusLabel(status)}`, "success");
    } catch { showToast("خطأ في تحديث الحالة", "error"); }
  };

  const printOrder = (o: PurchOrder) => {
    const w = window.open("", "_blank", "width=600,height=700");
    if (!w) { showToast("يُرجى السماح بالنوافذ المنبثقة", "warning"); return; }
    const linesHtml = (o.lines || []).map(l => `<tr><td>${l.nameAr}</td><td>${l.barcode||"—"}</td><td>${l.qty}</td><td>${l.unitCost.toFixed(3)}</td><td>${l.discount}%</td><td>${l.total.toFixed(3)}</td></tr>`).join("");
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>طلب شراء</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Cairo',Arial,sans-serif;direction:rtl;padding:32px;color:#111;font-size:13px}h1{text-align:center;font-size:18px;margin-bottom:4px}p.sub{text-align:center;color:#666;font-size:11px;margin-bottom:20px}.info{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e5e7eb}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#f3f4f6;text-align:right;padding:8px 6px;font-size:12px}td{padding:7px 6px;border-bottom:1px solid #e5e7eb;font-size:12px}.total{margin-top:12px;text-align:left;font-weight:bold;font-size:15px}.footer{margin-top:24px;text-align:center;font-size:10px;color:#999}</style></head><body><h1>طلب شراء</h1><p class="sub">${o.orderNo || o.id}</p><div class="info"><span>المورد</span><span>${o.sup}</span></div><div class="info"><span>تاريخ الطلب</span><span>${o.orderDate||o.createdAt ? new Date(o.orderDate||o.createdAt||Date.now()).toLocaleDateString("ar-JO") : "—"}</span></div><div class="info"><span>الحالة</span><span>${poStatusLabel(o.status)}</span></div>${o.notes ? `<div class="info"><span>ملاحظات</span><span>${o.notes}</span></div>` : ""}<table><thead><tr><th>المنتج</th><th>الباركود</th><th>الكمية</th><th>سعر الوحدة</th><th>الخصم</th><th>الإجمالي</th></tr></thead><tbody>${linesHtml}</tbody></table><p class="total">الإجمالي الكلي: ${(o.total||0).toFixed(3)} JOD</p><div class="footer">Sowwanjo POS</div></body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
  };

  const totalAll = orders.reduce((a, o) => a + (o.total || 0), 0);
  const pending = orders.filter(o => ["draft","sent","partial","قيد الاستلام"].includes(o.status)).length;
  const thisMonth = orders.filter(o => { if (!o.createdAt) return false; const d = new Date(o.createdAt); const n = new Date(); return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear(); });
  const filteredProds = products.filter(p => !lineQ || p.nameAr.includes(lineQ) || (p.barcode||"").includes(lineQ) || (p.sku||"").toLowerCase().includes(lineQ.toLowerCase()));

  return (
    <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto h-full">
      <Hdr title="طلبات الشراء" action={<Btn s="sm" icon={<Plus size={13} />} onClick={() => { setHdr(blankForm()); setLines([]); setShowAdd(true); }}>طلب شراء جديد</Btn>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPI icon={<ClipboardList size={18} />} label="طلبات الشهر" value={String(thisMonth.length)} color="#1D4ED8" />
        <KPI icon={<DollarSign size={18} />} label="إجمالي المشتريات" value={`${totalAll.toFixed(3)} JOD`} color="#059669" />
        <KPI icon={<Truck size={18} />} label="قيد الاستلام" value={String(pending)} color="#D97706" />
        <KPI icon={<Check size={18} />} label="مكتملة" value={String(orders.filter(o => ["received","مكتمل"].includes(o.status)).length)} color="#7C3AED" />
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {loading ? <p className="text-center py-10 text-muted-foreground text-sm">جاري التحميل...</p>
        : orders.length === 0 ? <Empty icon={<Clipboard size={28} />} title="لا توجد طلبات شراء بعد" desc="أضف طلب شراء جديد من الزر أعلاه" />
        : (
          <>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-border/60">
              {orders.map(o => (
                <div key={o.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold">{o.sup}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${poStatusColor(o.status)}`}>{poStatusLabel(o.status)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{o.lines?.length || o.items} أصناف • {o.createdAt ? new Date(o.createdAt).toLocaleDateString("ar-JO") : ""}</p>
                  <div className="flex items-center justify-between">
                    <p className="font-black">{(o.total||0).toFixed(3)} JOD</p>
                    <div className="flex gap-1">
                      <Btn v="ghost" s="xs" icon={<Eye size={10} />} onClick={() => setViewOrder(o)}>عرض</Btn>
                      <Btn v="secondary" s="xs" icon={<Printer size={10} />} onClick={() => printOrder(o)}>طباعة</Btn>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>{["رقم الطلب","المورد","التاريخ","الأصناف","الإجمالي","الحالة",""].map(h => <th key={h} className="text-right font-bold text-muted-foreground text-xs px-4 py-3">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{o.orderNo || o.id.slice(-6).toUpperCase()}</td>
                      <td className="px-4 py-3 font-bold">{o.sup}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("ar-JO") : "—"}</td>
                      <td className="px-4 py-3">{o.lines?.length || o.items}</td>
                      <td className="px-4 py-3 font-black">{(o.total||0).toFixed(3)} JOD</td>
                      <td className="px-4 py-3">
                        <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-full border-0 cursor-pointer ${poStatusColor(o.status)}`}>
                          {PO_STATUSES.filter(s => !["قيد الاستلام","مكتمل","ملغي"].includes(s.id)).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Btn v="ghost" s="xs" icon={<Eye size={10} />} onClick={() => setViewOrder(o)}>عرض</Btn>
                          <Btn v="secondary" s="xs" icon={<Printer size={10} />} onClick={() => printOrder(o)}>طباعة</Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* New Order Modal */}
      {showAdd && (
        <Modal title="طلب شراء جديد" onClose={() => setShowAdd(false)} wide>
          <div className="space-y-5 text-sm">
            {/* Header */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="col-span-2 md:col-span-1">
                <F label="المورد" req>
                  <select value={hdr.sup} onChange={e => setHdr(h => ({...h, sup: e.target.value}))}
                    className="w-full border border-border rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">اختر المورد...</option>
                    {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    <option value="__custom__">مورد آخر (كتابة يدوية)</option>
                  </select>
                </F>
                {hdr.sup === "__custom__" && (
                  <input className="mt-1 w-full border border-border rounded-xl px-3 py-2 bg-background text-sm" placeholder="اسم المورد" onChange={e => setHdr(h => ({...h, sup: e.target.value}))} autoFocus />
                )}
              </div>
              <F label="تاريخ الطلب"><input type="date" value={hdr.orderDate} onChange={e => setHdr(h => ({...h, orderDate: e.target.value}))} className="w-full border border-border rounded-xl px-3 py-2.5 bg-background" /></F>
              <F label="تاريخ التسليم المتوقع"><input type="date" value={hdr.deliveryDate} onChange={e => setHdr(h => ({...h, deliveryDate: e.target.value}))} className="w-full border border-border rounded-xl px-3 py-2.5 bg-background" /></F>
              <div className="col-span-2 md:col-span-2">
                <F label="ملاحظات"><input value={hdr.notes} onChange={e => setHdr(h => ({...h, notes: e.target.value}))} placeholder="ملاحظات اختيارية..." className="w-full border border-border rounded-xl px-3 py-2.5 bg-background" /></F>
              </div>
            </div>

            {/* Product search + lines */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold">المنتجات</p>
                <button onClick={() => setShowLineSearch(s => !s)} className="flex items-center gap-1 text-xs text-primary font-bold px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20">
                  <Plus size={12} /> إضافة منتج
                </button>
              </div>

              {showLineSearch && (
                <div className="border border-border rounded-xl p-3 mb-3 space-y-2 bg-muted/20">
                  <input autoFocus value={lineQ} onChange={e => setLineQ(e.target.value)} placeholder="ابحث بالاسم أو الباركود أو SKU..." className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredProds.slice(0, 8).map(p => (
                      <button key={p.id} onClick={() => pickProduct(p)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-right">
                        <div className="flex-1"><p className="text-xs font-bold">{p.nameAr}</p><p className="text-[10px] text-muted-foreground">{p.barcode} • {p.sku}</p></div>
                        <span className="text-xs font-bold">{p.costPrice?.toFixed(3) || "—"} JOD</span>
                      </button>
                    ))}
                    {filteredProds.length === 0 && <p className="text-xs text-center text-muted-foreground py-2">لا توجد منتجات مطابقة</p>}
                    <button onClick={() => addLine()} className="w-full flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/5 text-primary text-xs font-bold hover:bg-primary/10 border border-primary/20">
                      <Plus size={11} /> إضافة صنف بدون منتج موجود
                    </button>
                  </div>
                </div>
              )}

              {lines.length === 0 ? (
                <div className="border border-dashed border-border rounded-xl p-6 text-center text-xs text-muted-foreground">اضغط "إضافة منتج" لإضافة أصناف للطلب</div>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          {["المنتج","الباركود","الكمية","سعر الوحدة (JOD)","خصم %","ضريبة %","الإجمالي",""].map(h => (
                            <th key={h} className="text-right px-3 py-2 font-bold text-muted-foreground whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {lines.map((l, i) => (
                          <tr key={i} className="hover:bg-muted/10">
                            <td className="px-3 py-2">
                              <input value={l.nameAr} onChange={e => updLine(i, "nameAr", e.target.value)} className="w-28 border border-border rounded-lg px-2 py-1 bg-background focus:outline-none text-xs" placeholder="اسم المنتج" />
                            </td>
                            <td className="px-3 py-2">
                              <input value={l.barcode || ""} onChange={e => updLine(i, "barcode", e.target.value)} className="w-24 border border-border rounded-lg px-2 py-1 bg-background focus:outline-none text-xs" placeholder="الباركود" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="number" min="1" value={l.qty} onChange={e => updLine(i, "qty", parseFloat(e.target.value) || 1)} className="w-14 border border-border rounded-lg px-2 py-1 bg-background focus:outline-none text-xs text-center" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="number" min="0" value={l.unitCost} onChange={e => updLine(i, "unitCost", parseFloat(e.target.value) || 0)} className="w-20 border border-border rounded-lg px-2 py-1 bg-background focus:outline-none text-xs text-center" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="number" min="0" max="100" value={l.discount} onChange={e => updLine(i, "discount", parseFloat(e.target.value) || 0)} className="w-14 border border-border rounded-lg px-2 py-1 bg-background focus:outline-none text-xs text-center" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="number" min="0" max="100" value={l.tax} onChange={e => updLine(i, "tax", parseFloat(e.target.value) || 0)} className="w-14 border border-border rounded-lg px-2 py-1 bg-background focus:outline-none text-xs text-center" />
                            </td>
                            <td className="px-3 py-2 font-bold">{l.total.toFixed(3)}</td>
                            <td className="px-3 py-2"><button onClick={() => rmLine(i)} className="text-red-400 hover:text-red-600"><X size={13} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-3 bg-muted/20 border-t border-border flex justify-end gap-4 text-xs">
                    <span className="text-muted-foreground">المجموع الفرعي: <span className="font-bold text-foreground">{lineSubtotal.toFixed(3)} JOD</span></span>
                    {lineDiscount > 0 && <span className="text-emerald-600">خصم: -{lineDiscount.toFixed(3)} JOD</span>}
                    {lineTax > 0 && <span className="text-muted-foreground">ضريبة: {lineTax.toFixed(3)} JOD</span>}
                    <span className="font-black text-base">الإجمالي: {lineTotal.toFixed(3)} JOD</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <Btn v="secondary" onClick={() => setShowAdd(false)}>إلغاء</Btn>
              <Btn onClick={saveOrder} disabled={saving || !hdr.sup || lines.length === 0} icon={<Plus size={14} />}>
                {saving ? "جاري الحفظ..." : "حفظ الطلب"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* View order modal */}
      {viewOrder && (
        <Modal title={`طلب شراء — ${viewOrder.sup}`} sub={viewOrder.orderNo || ""} onClose={() => setViewOrder(null)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              {[["المورد", viewOrder.sup], ["الحالة", poStatusLabel(viewOrder.status)], ["تاريخ الطلب", viewOrder.createdAt ? new Date(viewOrder.createdAt).toLocaleDateString("ar-JO") : "—"], ...(viewOrder.notes ? [["ملاحظات", viewOrder.notes]] : [])].map(([l,v]) => (
                <div key={l} className="bg-muted/30 rounded-xl p-3"><p className="text-xs text-muted-foreground mb-1">{l}</p><p className="font-bold">{v}</p></div>
              ))}
            </div>
            {(viewOrder.lines || []).length > 0 && (
              <div className="border border-border rounded-xl overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50"><tr>{["المنتج","الكمية","سعر الوحدة","الإجمالي"].map(h => <th key={h} className="text-right px-3 py-2 font-bold text-muted-foreground">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-border/60">
                    {viewOrder.lines!.map((l, i) => (
                      <tr key={i}><td className="px-3 py-2 font-bold">{l.nameAr}</td><td className="px-3 py-2">{l.qty}</td><td className="px-3 py-2">{l.unitCost.toFixed(3)} JOD</td><td className="px-3 py-2 font-bold">{l.total.toFixed(3)} JOD</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-muted-foreground text-sm">الإجمالي الكلي</span>
              <span className="font-black text-xl">{(viewOrder.total||0).toFixed(3)} JOD</span>
            </div>
            <Btn full icon={<Printer size={14} />} onClick={() => { printOrder(viewOrder); setViewOrder(null); }}>طباعة الطلب</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ExpScreen() {
  const sid = useStoreId();
  const { data: expsRaw, refresh: refreshExps } = useApi<unknown[]>("/expenses", []);
  const [exps, setExps] = useState<{id:string;desc:string;amount:number;cat:string;date:string;method:string}[]>([]);
  useEffect(() => { setExps(normList<{id:string;desc:string;amount:number;cat:string;date:string;method:string}>(expsRaw)); }, [expsRaw]);
  const [showAdd, setShowAdd] = useState(false);
  const [editExp, setEditExp] = useState<typeof exps[0] | null>(null);
  const [nf, setNf] = useState({ desc: "", amount: "", cat: "ثابت", method: "نقدي" });
  const CE: Record<string, string> = { ثابت: "text-blue-700 bg-blue-100", متغير: "text-purple-700 bg-purple-100", تشغيل: "text-emerald-700 bg-emerald-100", طارئ: "text-red-700 bg-red-100" };
  const total = exps.reduce((a, e) => a + e.amount, 0);

  const addExp = async () => {
    if (!nf.desc || !nf.amount) return;
    try {
      await storeApi.post("/expenses", { desc: nf.desc, amount: parseFloat(nf.amount), cat: nf.cat, method: nf.method });
      await refreshExps();
      showToast("تم إضافة المصروف وحفظه في قاعدة البيانات ✅");
    } catch { showToast("خطأ في إضافة المصروف", "error"); return; }
    setShowAdd(false); setNf({ desc: "", amount: "", cat: "ثابت", method: "نقدي" });
  };
  const delExp = async (id: string) => { await storeApi.delete(`/expenses/${id}`); await refreshExps(); showToast("تم حذف المصروف", "warning"); };
  const saveEdit = async () => { if (!editExp) return; await storeApi.put(`/expenses/${editExp.id}`, editExp); await refreshExps(); showToast("تم تعديل المصروف"); setEditExp(null); };

  return (
    <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto h-full">
      <Hdr title="إدارة المصروفات" action={<Btn s="sm" icon={<Plus size={13} />} onClick={() => setShowAdd(true)}>مصروف جديد</Btn>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={<Wallet size={18} />} label="مصروفات الشهر" value={`${total.toFixed(3)} JOD`} color="#DC2626" />
        <KPI icon={<Landmark size={18} />} label="ثابتة" value={`${exps.filter(e=>e.cat==="ثابت").reduce((a,e)=>a+e.amount,0).toFixed(3)} JOD`} color="#D97706" />
        <KPI icon={<Activity size={18} />} label="متغيرة ومتنوعة" value={`${exps.filter(e=>e.cat!=="ثابت").reduce((a,e)=>a+e.amount,0).toFixed(3)} JOD`} color="#7C3AED" />
        <KPI icon={<Percent size={18} />} label="عدد المصروفات" value={String(exps.length)} color="#1D4ED8" />
      </div>
      <div className="bg-card rounded-2xl border border-border divide-y divide-border/60 overflow-hidden">
        {exps.map(e => (
          <div key={e.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20">
            <div className="flex-1 min-w-0"><p className="font-bold">{e.desc}</p><div className="flex items-center gap-2 mt-0.5"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CE[e.cat]}`}>{e.cat}</span><span className="text-xs text-muted-foreground">{e.date} • {e.method}</span></div></div>
            <p className="font-black text-red-600 text-lg shrink-0">{e.amount.toFixed(3)} JOD</p>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => setEditExp({ ...e })} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-100 text-blue-500"><Edit2 size={11} /></button>
              <button onClick={() => delExp(e.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-100 text-red-500"><Trash2 size={11} /></button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <Modal title="إضافة مصروف جديد" onClose={() => setShowAdd(false)} size="sm">
          <div className="space-y-4">
            <F label="وصف المصروف" req><TInput value={nf.desc} onChange={v => setNf({...nf, desc: v})} placeholder="إيجار، رواتب، فواتير..." /></F>
            <F label="المبلغ (JOD)" req><TInput value={nf.amount} onChange={v => setNf({...nf, amount: v})} type="number" placeholder="0.000" /></F>
            <F label="التصنيف"><SInput value={nf.cat} onChange={v => setNf({...nf, cat: v})} options={["ثابت","متغير","تشغيل","طارئ"].map(c=>({value:c,label:c}))} /></F>
            <F label="طريقة الدفع"><SInput value={nf.method} onChange={v => setNf({...nf, method: v})} options={["نقدي","تحويل بنكي","شيك"].map(m=>({value:m,label:m}))} /></F>
            <div className="flex gap-3 justify-end"><Btn v="secondary" onClick={() => setShowAdd(false)}>إلغاء</Btn><Btn onClick={addExp} disabled={!nf.desc||!nf.amount} icon={<Plus size={14}/>}>حفظ</Btn></div>
          </div>
        </Modal>
      )}
      {editExp && (
        <Modal title="تعديل المصروف" onClose={() => setEditExp(null)} size="sm">
          <div className="space-y-4">
            <F label="وصف المصروف"><TInput value={editExp.desc} onChange={v => setEditExp({...editExp, desc: v})} /></F>
            <F label="المبلغ (JOD)"><TInput value={String(editExp.amount)} onChange={v => setEditExp({...editExp, amount: parseFloat(v)||0})} type="number" /></F>
            <F label="التصنيف"><SInput value={editExp.cat} onChange={v => setEditExp({...editExp, cat: v})} options={["ثابت","متغير","تشغيل","طارئ"].map(c=>({value:c,label:c}))} /></F>
            <div className="flex gap-3 justify-end"><Btn v="secondary" onClick={() => setEditExp(null)}>إلغاء</Btn><Btn onClick={saveEdit} icon={<Check size={14}/>}>حفظ</Btn></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ReturnScreen() {
  const sid = useStoreId();
  const { data: retsRaw, refresh: refreshRets } = useApi<unknown[]>("/returns", []);
  const [rets, setRets] = useState<{id:string;inv:string;cust:string;amount:number;reason:string;date:string;status:string}[]>([]);
  useEffect(() => { setRets(normList<{id:string;inv:string;cust:string;amount:number;reason:string;date:string;status:string}>(retsRaw)); }, [retsRaw]);
  const [viewRet, setViewRet] = useState<typeof rets[0] | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [nf, setNf] = useState({ inv: "", cust: "", amount: "", reason: "" });
  const SC: Record<string, string> = { معتمد: "bg-emerald-100 text-emerald-700", "قيد المراجعة": "bg-amber-100 text-amber-700", مرفوض: "bg-red-100 text-red-700" };

  const approve = async (id: string) => { await storeApi.put(`/returns/${id}`, { status: "معتمد" }); await refreshRets(); showToast("تم اعتماد المرتجع"); setViewRet(null); };
  const reject = async (id: string) => { await storeApi.put(`/returns/${id}`, { status: "مرفوض" }); await refreshRets(); showToast("تم رفض المرتجع", "warning"); setViewRet(null); };
  const addReturn = async () => {
    if (!nf.inv || !nf.amount) return;
    try {
      await storeApi.post("/returns", { inv: nf.inv, cust: nf.cust, amount: parseFloat(nf.amount)||0, reason: nf.reason, status: "قيد المراجعة" });
      await refreshRets();
      showToast("تم إنشاء طلب المرتجع في قاعدة البيانات ✅");
    } catch { showToast("خطأ في إنشاء المرتجع", "error"); return; }
    setShowNew(false); setNf({ inv: "", cust: "", amount: "", reason: "" });
  };

  const total = rets.filter(r=>r.status==="معتمد").reduce((a,r)=>a+r.amount,0);
  return (
    <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto h-full">
      <Hdr title="المرتجعات والاسترداد" action={<Btn s="sm" icon={<Plus size={13} />} onClick={() => setShowNew(true)}>مرتجع جديد</Btn>} />
      <div className="grid grid-cols-3 gap-4">
        <KPI icon={<RotateCcw size={18} />} label="مرتجعات الشهر" value={String(rets.length)} color="#DC2626" />
        <KPI icon={<DollarSign size={18} />} label="قيمة المرتجعات المعتمدة" value={`${total.toFixed(3)} JOD`} color="#D97706" />
        <KPI icon={<Percent size={18} />} label="قيد المراجعة" value={String(rets.filter(r=>r.status==="قيد المراجعة").length)} color="#059669" />
      </div>
      <div className="bg-card rounded-2xl border border-border divide-y divide-border/60 overflow-hidden">
        {rets.map(r => (
          <div key={r.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0"><RotateCcw size={16} className="text-red-500" /></div>
            <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><p className="font-bold">{r.id}</p><span className="text-xs text-muted-foreground">← {r.inv}</span></div><p className="text-xs text-muted-foreground">{r.cust} • {r.reason} • {r.date}</p></div>
            <p className="font-black text-red-600 shrink-0">{r.amount.toFixed(3)} JOD</p>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${SC[r.status] || "bg-gray-100 text-gray-600"}`}>{r.status}</span>
            <Btn v="ghost" s="xs" icon={<Eye size={10} />} onClick={() => setViewRet(r)}>تفاصيل</Btn>
          </div>
        ))}
      </div>

      {viewRet && (
        <Modal title={`تفاصيل المرتجع: ${viewRet.id}`} onClose={() => setViewRet(null)} size="sm">
          <div className="space-y-3 text-sm">
            {[["رقم الفاتورة", viewRet.inv],["العميل", viewRet.cust],["السبب", viewRet.reason],["المبلغ", `${viewRet.amount.toFixed(3)} JOD`],["التاريخ", viewRet.date],["الحالة", viewRet.status]].map(([l,v]) => (
              <div key={l} className="flex justify-between border-b border-border/60 pb-2"><span className="text-muted-foreground">{l}</span><span className="font-bold">{v}</span></div>
            ))}
            {viewRet.status === "قيد المراجعة" && (
              <div className="flex gap-3 pt-2">
                <Btn v="danger" full onClick={() => reject(viewRet.id)} icon={<X size={14}/>}>رفض المرتجع</Btn>
                <Btn v="success" full onClick={() => approve(viewRet.id)} icon={<Check size={14}/>}>اعتماد المرتجع</Btn>
              </div>
            )}
          </div>
        </Modal>
      )}
      {showNew && (
        <Modal title="طلب مرتجع جديد" onClose={() => setShowNew(false)} size="sm">
          <div className="space-y-4">
            <F label="رقم الفاتورة" req><TInput value={nf.inv} onChange={v=>setNf({...nf,inv:v})} placeholder="INV-XXXX" /></F>
            <F label="اسم العميل"><TInput value={nf.cust} onChange={v=>setNf({...nf,cust:v})} /></F>
            <F label="المبلغ (JOD)" req><TInput value={nf.amount} onChange={v=>setNf({...nf,amount:v})} type="number" placeholder="0.000" /></F>
            <F label="سبب الإرجاع"><TInput value={nf.reason} onChange={v=>setNf({...nf,reason:v})} placeholder="منتج تالف، خطأ في الطلب..." /></F>
            <div className="flex gap-3 justify-end"><Btn v="secondary" onClick={()=>setShowNew(false)}>إلغاء</Btn><Btn onClick={addReturn} disabled={!nf.inv||!nf.amount} icon={<Plus size={14}/>}>إنشاء طلب</Btn></div>
          </div>
        </Modal>
      )}
    </div>
  );
}


export { SalesScreen, ProductsMgr, InvScreen, CustScreen, SuppScreen, PurchScreen, ExpScreen, ReturnScreen };
