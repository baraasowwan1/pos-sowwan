// StorePanel — Store screens
import { useState, useCallback, useRef, useEffect, createContext, useContext } from "react";
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
  Info, ChevronLeft, Grid3X3, List, Hash, Tag,
} from "lucide-react";
import { storeApi, useApi, useLS, norm, normList, dateAr, timeAr, showToast, KPI, Modal, F, TInput, SInput, Btn, Hdr, Empty, Toggle, useStoreId, PLANS, CAT, ST, printReceipt, StoreData, Product, CartItem, StoreCategory, PRODUCTS, jod, getToken, useStoreModules } from "./lib";
import type { StoreData, Product, CartItem, StoreCategory } from "./lib";

const STORE_NAV = [
  { id: "dashboard",  label: "الرئيسية",       icon: <LayoutDashboard size={15} /> },
  { id: "pos",        label: "نقطة البيع",      icon: <ShoppingCart size={15} /> },
  { id: "products",   label: "المنتجات",         icon: <Package size={15} /> },
  { id: "inventory",  label: "المخزون",          icon: <Boxes size={15} /> },
  { id: "customers",  label: "العملاء",           icon: <Users size={15} /> },
  { id: "suppliers",  label: "الموردون",          icon: <Truck size={15} /> },
  { id: "purchases",  label: "المشتريات",         icon: <Clipboard size={15} /> },
  { id: "expenses",   label: "المصروفات",         icon: <Wallet size={15} /> },
  { id: "returns",    label: "المرتجعات",         icon: <RotateCcw size={15} /> },
  { id: "reports",    label: "التقارير",          icon: <BarChart2 size={15} /> },
  { id: "employees",  label: "الموظفون",          icon: <UserCheck size={15} /> },
  { id: "branches",   label: "الفروع والأجهزة",  icon: <Building2 size={15} /> },
  { id: "loyalty",    label: "الولاء",            icon: <Star size={15} /> },
  { id: "settings",   label: "الإعدادات",         icon: <Settings size={15} /> },
];

function StoreLayout({ storeId, onLogout }: { storeId: string; onLogout: () => void }) {
  // يقرأ بيانات المتجر — أولاً من Backend JWT ثم من localStorage
  const storeFromLS: StoreData = (() => {
    try {
      // بيانات المتجر المحفوظة من JWT login
      const info = localStorage.getItem(`sowwanjo_storeinfo_${storeId}`);
      if (info) return JSON.parse(info);
      // fallback: البحث في قائمة المتاجر المكاشة
      const all = localStorage.getItem("sowwanjo_sa_stores");
      if (all) { const arr = JSON.parse(all); return arr.find((s: StoreData) => s.id === storeId) || null; }
    } catch {}
    return null;
  })();
  // تطبيع بيانات المتجر — تضمن عدم وجود قيم null تسبب crash
  const rawStore = storeFromLS || null;
  const store: StoreData = {
    id: storeId,
    nameAr:   rawStore?.nameAr   || "متجري",
    nameEn:   rawStore?.nameEn   || "My Store",
    category: (rawStore?.category || "supermarket") as StoreCategory,
    owner:    rawStore?.owner    || "",
    email:    rawStore?.email    || "",
    phone:    rawStore?.phone    || "",
    city:     rawStore?.city     || "",
    status:   (rawStore?.status  || "active") as StoreData["status"],
    plan:     rawStore?.plan     || "مبتدئ",
    taxNo:    rawStore?.taxNo    || "",
    users:    rawStore?.users    || 0,
    products: rawStore?.products || 0,
    sales:    rawStore?.sales    || 0,
    revenue:  rawStore?.revenue  || 0,
    branches: rawStore?.branches || 1,
    createdAt:rawStore?.createdAt|| new Date().toISOString().split("T")[0],
    expiresAt:rawStore?.expiresAt|| new Date(Date.now() + 365*86400000).toISOString().split("T")[0],
  };
  const [screen, setScreen] = useState(() => {
    try { return localStorage.getItem(`sowwanjo_store_screen_${storeId}`) || "dashboard"; } catch { return "dashboard"; }
  });
  const [col, setCol] = useState(false);
  const navTo = (s: string) => {
    setScreen(s);
    try { localStorage.setItem(`sowwanjo_store_screen_${storeId}`, s); } catch {}
  };
  const cat = CAT[store.category as StoreCategory] || CAT["supermarket"];
  const [storeMobileMenu, setStoreMobileMenu] = useState(false);

  // ── Announcements ────────────────────────────────────────────────────────
  type AnnItem = { _id: string; title: string; message: string; type: string; createdAt: string };
  const [announcements, setAnnouncements] = useState<AnnItem[]>([]);
  const [showAnn, setShowAnn] = useState(false);
  const [seenIds, setSeenIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(`sowwanjo_ann_seen_${storeId}`) || "[]"); } catch { return []; }
  });
  useEffect(() => {
    storeApi.get("/announcements/for-store")
      .then(d => { if (Array.isArray(d)) setAnnouncements(d as AnnItem[]); })
      .catch(() => {});
  }, []);
  const unreadCount = announcements.filter(a => !seenIds.includes(a._id)).length;
  const markAllSeen = () => {
    const ids = announcements.map(a => a._id);
    setSeenIds(ids);
    try { localStorage.setItem(`sowwanjo_ann_seen_${storeId}`, JSON.stringify(ids)); } catch {}
  };
  const ANN_TYPE_COLOR: Record<string, string> = {
    info: "bg-blue-50 border-blue-200 text-blue-700",
    warning: "bg-amber-50 border-amber-200 text-amber-700",
    success: "bg-emerald-50 border-emerald-200 text-emerald-700",
    danger: "bg-red-50 border-red-200 text-red-700",
  };

  const storeBottomNav = [
    { id: "dashboard", label: "الرئيسية", icon: <LayoutDashboard size={19} /> },
    { id: "pos",       label: "البيع",    icon: <ShoppingCart size={19} /> },
    { id: "products",  label: "المنتجات", icon: <Package size={19} /> },
    { id: "reports",   label: "التقارير", icon: <BarChart2 size={19} /> },
    { id: "settings",  label: "إعدادات",  icon: <Settings size={19} /> },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background" dir="rtl" style={{ fontFamily: "'Cairo',sans-serif" }}>

      {/* SIDEBAR: mobile=hidden, tablet=icon(52px), desktop=full(224px) */}
      <aside
        className={`hidden md:flex shrink-0 flex-col transition-all duration-300 md:w-[52px] ${col ? "lg:w-[52px]" : "lg:w-56"}`}
        style={{ background: "#0F172A" }}>
        <div className="h-14 flex items-center gap-2.5 px-2 lg:px-3 border-b border-white/7 shrink-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${cat.color}25` }}>
            <span style={{ color: cat.color }}>{cat.icon}</span>
          </div>
          <div className={`min-w-0 hidden ${col ? "lg:hidden" : "lg:block"}`}>
            <p className="text-white font-bold text-xs leading-tight truncate">{store.nameAr}</p>
            <p className="text-white/30 text-xs">{cat.label}</p>
          </div>
        </div>
        <nav className="flex-1 px-1 py-2 space-y-0.5 overflow-y-auto">
          {STORE_NAV.map(n => (
            <button key={n.id} onClick={() => navTo(n.id)}
              className={`w-full flex items-center gap-2.5 md:h-10 lg:h-9 rounded-xl text-xs font-semibold transition-all justify-center md:px-1.5 ${col ? "lg:justify-center lg:px-1.5" : "lg:justify-start lg:px-2.5"} ${screen === n.id ? "bg-white/10 text-white" : "text-white/45 hover:bg-white/5 hover:text-white/80"}`}
              title={n.label}>
              <span className="shrink-0">{n.icon}</span>
              <span className={`hidden truncate ${col ? "lg:hidden" : "lg:inline"}`}>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-1.5 border-t border-white/7 space-y-0.5">
          <div className={`px-2.5 py-2 rounded-xl bg-white/4 hidden ${col ? "lg:hidden" : "lg:block"}`}>
            <p className="text-white/40 text-xs">{store.plan}</p>
            <p className="text-white/25 text-xs">ينتهي {store.expiresAt}</p>
          </div>
          <button onClick={() => setCol(!col)} className="hidden lg:flex w-full items-center justify-center h-8 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5">
            {col ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
          </button>
          <button onClick={onLogout} className={`w-full flex items-center gap-2 md:h-10 lg:h-8 rounded-xl text-xs text-red-400/60 hover:text-red-400 hover:bg-red-500/10 justify-center ${col ? "lg:justify-center" : "lg:justify-start lg:px-2.5"}`}>
            <LogOut size={13} />
            <span className={`hidden ${col ? "lg:hidden" : "lg:inline"}`}>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Mobile slide-in menu */}
      {storeMobileMenu && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setStoreMobileMenu(false)} />
          <div className="relative mr-auto w-64 h-full flex flex-col shadow-2xl" style={{ background: "#0F172A", paddingTop: "env(safe-area-inset-top)" }}>
            <div className="h-14 flex items-center gap-2.5 px-4 border-b border-white/7 shrink-0">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${cat.color}25` }}>
                <span style={{ color: cat.color }}>{cat.icon}</span>
              </div>
              <div className="min-w-0 flex-1"><p className="text-white font-bold text-xs leading-tight truncate">{store.nameAr}</p><p className="text-white/30 text-xs">{cat.label}</p></div>
              <button onClick={() => setStoreMobileMenu(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 text-white shrink-0"><X size={14} /></button>
            </div>
            <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
              {STORE_NAV.map(n => (
                <button key={n.id} onClick={() => { navTo(n.id); setStoreMobileMenu(false); }}
                  className={`w-full flex items-center gap-2.5 h-10 rounded-xl px-3 text-sm font-semibold transition-all ${screen === n.id ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white/80"}`}>
                  <span className="shrink-0">{n.icon}</span>
                  <span className="truncate">{n.label}</span>
                </button>
              ))}
            </nav>
            <div className="p-2 border-t border-white/7 space-y-0.5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}>
              {<div className="px-3 py-2 rounded-xl bg-white/4 mb-1"><p className="text-white/40 text-xs">{store.plan}</p><p className="text-white/25 text-xs">ينتهي {store.expiresAt}</p></div>}
              <button onClick={onLogout} className="w-full flex items-center gap-2 h-9 rounded-xl text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/10 px-3">
                <LogOut size={13} />تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 bg-card border-b border-border flex items-center justify-between px-3 sm:px-4 shrink-0" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <div className="flex items-center gap-2">
            <button onClick={() => setStoreMobileMenu(true)} className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground"><Menu size={18} /></button>
            <button onClick={() => setCol(!col)} className="hidden md:flex w-8 h-8 items-center justify-center rounded-xl hover:bg-muted text-muted-foreground"><Menu size={15} /></button>
            <div><p className="text-sm font-bold">{STORE_NAV.find(n => n.id === screen)?.label}</p><p className="text-xs text-muted-foreground hidden sm:block">{dateAr()} • {timeAr()}</p></div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="hidden sm:flex items-center gap-1.5 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> نشط
            </span>
            {/* Announcements Bell */}
            <div className="relative">
              <button onClick={() => { setShowAnn(!showAnn); if (!showAnn) markAllSeen(); }}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground relative">
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-card">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {showAnn && (
                <div className="absolute left-0 top-full mt-2 w-80 max-w-[calc(100vw-1rem)] bg-card rounded-2xl border border-border shadow-2xl z-50 overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-3 border-b border-border">
                    <span className="font-bold text-sm flex items-center gap-2">
                      <Bell size={13} /> الإعلانات
                      {unreadCount > 0 && <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">{unreadCount}</span>}
                    </span>
                    <button onClick={() => setShowAnn(false)} className="text-xs text-muted-foreground hover:text-foreground"><X size={14} /></button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {announcements.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Bell size={28} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">لا توجد إعلانات</p>
                      </div>
                    ) : announcements.map(a => (
                      <div key={a._id} className={`px-4 py-3 border-b border-border/50 last:border-0 ${!seenIds.includes(a._id) ? "bg-primary/3" : ""}`}>
                        <div className={`text-xs font-bold px-2 py-0.5 rounded-full border inline-block mb-1 ${ANN_TYPE_COLOR[a.type] || ANN_TYPE_COLOR.info}`}>
                          {a.title}
                        </div>
                        <p className="text-xs text-foreground leading-relaxed">{a.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(a.createdAt).toLocaleDateString("ar-JO")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-hidden" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 3.5rem)" }}>
          {screen === "dashboard" && <StoreDash store={store} />}
          {screen === "pos"       && <POSTerm store={store} />}
          {screen === "products"  && <ProductsMgr />}
          {screen === "inventory" && <InvScreen />}
          {screen === "customers" && <CustScreen />}
          {screen === "suppliers" && <SuppScreen />}
          {screen === "purchases" && <PurchScreen />}
          {screen === "expenses"  && <ExpScreen />}
          {screen === "returns"   && <ReturnScreen />}
          {screen === "reports"   && <StoreReports />}
          {screen === "employees" && <EmpScreen />}
          {screen === "branches"  && <BranchScreen />}
          {screen === "loyalty"   && <LoyaltyScreen />}
          {screen === "settings"  && <StoreSetts store={store} />}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 flex"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {storeBottomNav.map(n => (
            <button key={n.id} onClick={() => navTo(n.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-all min-h-[56px] ${screen === n.id ? "text-primary" : "text-muted-foreground"}`}>
              <span className={`transition-transform ${screen === n.id ? "scale-110" : ""}`}>{n.icon}</span>
              <span className="text-[10px] font-bold leading-tight">{n.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
function StoreDash({ store }: { store: StoreData }) {
  type DashSummary = { today?: { total: number; count: number }; month?: { total: number; count: number }; totalProducts?: number; monthExpenses?: number; totalCustomers?: number; lowStock?: number; todayReturns?: number };
  type WeekPoint = { day: string; مبيعات: number; أرباح: number };
  type HourPoint = { h: string; v: number };
  const { data: summary, loading: sumLoading } = useApi<DashSummary>("/reports/summary", {});
  const { data: recentSales, loading: salesLoading } = useApi<{_id:string;invoiceNo:string;customerName:string;total:number;payMethod:string;createdAt:string}[]>("/sales?limit=5&sort=-createdAt", []);
  const { data: lowStockProds } = useApi<{_id:string;nameAr:string;quantity:number;minStock:number}[]>("/inventory?lowStock=true&limit=6", []);
  const { data: weekChartRaw } = useApi<WeekPoint[]>("/reports/weekly", []);
  const { data: hourChartRaw } = useApi<HourPoint[]>("/reports/hourly", []);
  const defaultWeek: WeekPoint[] = [
    { day: "السبت", مبيعات: 0, أرباح: 0 }, { day: "الأحد", مبيعات: 0, أرباح: 0 },
    { day: "الاثنين", مبيعات: 0, أرباح: 0 }, { day: "الثلاثاء", مبيعات: 0, أرباح: 0 },
    { day: "الأربعاء", مبيعات: 0, أرباح: 0 }, { day: "الخميس", مبيعات: 0, أرباح: 0 },
    { day: "الجمعة", مبيعات: 0, أرباح: 0 },
  ];
  const defaultHour: HourPoint[] = [
    { h: "8ص", v: 0 }, { h: "9ص", v: 0 }, { h: "10ص", v: 0 }, { h: "11ص", v: 0 },
    { h: "12م", v: 0 }, { h: "1م", v: 0 }, { h: "2م", v: 0 }, { h: "3م", v: 0 },
    { h: "4م", v: 0 }, { h: "5م", v: 0 }, { h: "6م", v: 0 }, { h: "7م", v: 0 },
  ];
  const weekChartData = (weekChartRaw && weekChartRaw.length > 0) ? weekChartRaw : defaultWeek;
  const hourChartData = (hourChartRaw && hourChartRaw.length > 0) ? hourChartRaw : defaultHour;

  return (
    <div className="p-3 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto h-full">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={<ShoppingCart size={18} />} label="مبيعات اليوم"
          value={sumLoading ? "..." : `${(summary.today?.total || 0).toFixed(3)} JOD`}
          sub={`${summary.today?.count || 0} فاتورة`} color="#1D4ED8" />
        <KPI icon={<DollarSign size={18} />} label="إيرادات الشهر"
          value={sumLoading ? "..." : `${(summary.month?.total || 0).toFixed(3)} JOD`}
          color="#059669" />
        <KPI icon={<Package size={18} />} label="المنتجات"
          value={sumLoading ? "..." : String(summary.totalProducts || store.products || 0)}
          sub={summary.lowStock ? `${summary.lowStock} منخفضة المخزون` : "المخزون جيد"} color="#D97706" />
        <KPI icon={<Users size={18} />} label="العملاء"
          value={sumLoading ? "..." : String(summary.totalCustomers || 0)}
          sub="إجمالي العملاء" color="#7C3AED" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { c: "bg-emerald-50 border-emerald-200", ic: <CheckCircle size={20} className="text-emerald-600" />, n: String(summary.today?.count || 0),  l: "فواتير اليوم", tc: "text-emerald-700" },
          { c: "bg-amber-50 border-amber-200",     ic: <AlertTriangle size={20} className="text-amber-600" />,  n: String(summary.lowStock || 0),       l: "مخزون منخفض",  tc: "text-amber-700" },
          { c: "bg-blue-50 border-blue-200",        ic: <RotateCcw size={20} className="text-blue-600" />,      n: String(summary.todayReturns || 0),   l: "مرتجعات اليوم",tc: "text-blue-700" },
        ].map(x => (
          <div key={x.l} className={`${x.c} border rounded-2xl p-4 flex items-center gap-3`}>
            {x.ic}<div><p className={`text-xl font-black ${x.tc}`}>{x.n}</p><p className={`text-xs ${x.tc}`}>{x.l}</p></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-4">مبيعات وأرباح الأسبوع (JOD)</p>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={weekChartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [`${v} JOD`]} />
              <Bar key="week-sales" dataKey="مبيعات" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
              <Bar key="week-prof" dataKey="أرباح" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-4">المبيعات بالساعة</p>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={hourChartData}>
              <defs>
                <linearGradient id="store-dash-hour" x1="0" y1="0" x2="0" y2="1">
                  <stop key="sdh-top" offset="5%" stopColor="#1D4ED8" stopOpacity={0.15} />
                  <stop key="sdh-bot" offset="95%" stopColor="#1D4ED8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="h" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} hide />
              <Tooltip formatter={(v: number) => [`${v} JOD`]} />
              <Area key="area-hour" type="monotone" dataKey="v" stroke="#1D4ED8" strokeWidth={2} fill="url(#store-dash-hour)" name="المبيعات" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-3">أحدث الفواتير</p>
          <div className="space-y-2">
            {salesLoading ? (
              <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-10 bg-muted animate-pulse rounded-xl"/>)}</div>
            ) : recentSales.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">لا توجد فواتير بعد — ابدأ بإصدار أول فاتورة</p>
            ) : recentSales.map(inv => (
              <div key={inv._id} className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
                <div>
                  <p className="text-sm font-bold">{inv.invoiceNo || inv._id.slice(-6).toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">{inv.customerName || "عميل نقدي"} • {new Date(inv.createdAt).toLocaleTimeString("ar-JO", {hour:"2-digit",minute:"2-digit"})}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{Number(inv.total).toFixed(3)} JOD</p>
                  <p className="text-xs font-bold text-emerald-600">{inv.payMethod}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-3">تنبيهات المخزون</p>
          <div className="space-y-2">
            {lowStockProds.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">لا توجد منتجات منخفضة المخزون 🎉</p>
            ) : lowStockProds.map(p => (
              <div key={p._id} className="flex items-center gap-3 py-2 border-b border-border/60 last:border-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${p.quantity <= p.minStock ? "bg-red-500" : "bg-amber-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{p.nameAr}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="flex-1 h-1 bg-muted rounded-full">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, p.minStock > 0 ? (p.quantity / p.minStock) * 100 : 0)}%`, backgroundColor: p.quantity <= p.minStock ? "#DC2626" : "#D97706" }} />
                    </div>
                    <span className={`text-xs font-bold shrink-0 ${p.quantity <= p.minStock ? "text-red-600" : "text-amber-600"}`}>{p.quantity}/{p.minStock}</span>
                  </div>
                </div>
                <Btn v="secondary" s="xs" onClick={() => showToast(`تم إرسال طلب توريد لـ "${p.nameAr}"`, "success")}>طلب</Btn>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POS TERMINAL (Full interactive)
// ─────────────────────────────────────────────────────────────────────────────

function POSTerm({ store }: { store: StoreData }) {
  const sid = useStoreId();
  // نفس مخزن المنتجات المشترك مع ProductsMgr وInvScreen
  // منتجات POS — من Backend مباشرة
  const { data: prodsApiRaw, refresh: refreshPosProds } = useApi<unknown[]>("/products", []);
  const [allProds, setAllProds] = useState<Product[]>([]);
  useEffect(() => { setAllProds(normList<Product>(prodsApiRaw)); }, [prodsApiRaw]);
  const [cart, setCart] = useLS<CartItem[]>(sk(sid,"pos_cart"), []);  // السلة تبقى بعد الـ refresh
  const [holds, setHolds] = useLS<CartItem[][]>(sk(sid,"pos_holds"), []); // الطلبات المعلقة
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("الكل");
  const [disc, setDisc] = useState(0);
  const [pay, setPay] = useState<"cash" | "click" | "card" | "transfer" | "check" | "split">("cash");
  const [cash, setCash] = useState("");
  const [showPay, setShowPay] = useState(false);
  const [ok, setOk] = useState(false);
  const [vm, setVm] = useLS<"grid"|"list">(sk(sid,"pos_vm"), "grid");
  // يقرأ إعداد الطابعة من إعدادات المتجر
  const paper = (() => { try { return localStorage.getItem(sk(sid,"sett_paper")) || "80mm"; } catch { return "80mm"; } })();
  const invNoRef = useRef(`INV-${new Date().getFullYear()}${String(Date.now()).slice(-6)}`);
  const invNo = invNoRef.current;
  // يقرأ نسبة الضريبة من إعدادات المتجر المحفوظة
  const savedTaxRate = (() => {
    try {
      const v = localStorage.getItem(sk(sid, "sett_tax"));
      const num = parseFloat(v || "16");
      return isNaN(num) ? 0.16 : num / 100;
    } catch { return 0.16; }
  })();
  const TAX = savedTaxRate;
  const sub = cart.reduce((a, i) => a + i.product.sellPrice * i.qty * (1 - i.discount / 100), 0);
  const da = sub * (disc / 100);
  const ta = (sub - da) * TAX;
  const total = sub - da + ta;
  const change = parseFloat(cash || "0") - total;
  const cats = ["الكل", ...Array.from(new Set(allProds.map(p => p.category)))];
  const prods = allProds.filter(p => (!q || p.nameAr.includes(q) || p.barcode.includes(q) || p.sku.toLowerCase().includes(q.toLowerCase())) && (cat === "الكل" || p.category === cat));
  const add = (p: Product) => setCart(prev => { const ex = prev.find(i => i.product.id === p.id); return ex ? prev.map(i => i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i) : [...prev, { product: p, qty: 1, discount: 0 }]; });
  const upd = (id: string, d: number) => setCart(prev => prev.map(i => i.product.id === id ? { ...i, qty: Math.max(1, i.qty + d) } : i));
  const updd = (id: string, v: number) => setCart(prev => prev.map(i => i.product.id === id ? { ...i, discount: Math.max(0, Math.min(100, v)) } : i));
  const rm = (id: string) => setCart(prev => prev.filter(i => i.product.id !== id));
  const hold = () => { if (cart.length) { setHolds(h => [...h, cart]); setCart([]); } };
  const resume = (i: number) => { setCart(holds[i]); setHolds(h => h.filter((_, idx) => idx !== i)); };

  const doPrint = () => printReceipt({
    invNo,
    storeName: store.nameAr || 'متجري',
    storePhone: store.phone || '',
    items: cart.map(i => ({ name: i.product.nameAr, qty: i.qty, price: i.product.sellPrice, discount: i.discount })),
    subtotal: sub, discountAmt: da, taxAmt: ta, taxRate: TAX, total,
    payMethod: pay === "cash" ? "نقدي" : pay === "click" ? "كليك" : pay === "card" ? "بطاقة ائتمانية" : pay === "transfer" ? "تحويل بنكي" : pay === "check" ? "شيك" : "مختلط",
    change: change > 0 ? change : undefined,
    cashIn: pay === "cash" ? parseFloat(cash || "0") : undefined,
    date: new Date().toLocaleDateString("ar-JO"),
    time: new Date().toLocaleTimeString("ar-JO", { hour: "2-digit", minute: "2-digit" }),
  }, paper);

  const doPay = async () => {
    // حفظ الفاتورة في Backend + خصم المخزون تلقائياً
    try {
      await storeApi.post("/sales", {
        invoiceNo: invNo,
        items: cart.map(i => ({
          productId: i.product.id,
          nameAr:    i.product.nameAr,
          qty:       i.qty,
          unitPrice: i.product.sellPrice,
          discount:  i.discount,
          total:     i.product.sellPrice * i.qty * (1 - i.discount / 100),
        })),
        subtotal: sub, discountAmt: da, taxAmt: ta, total,
        payMethod: pay,
        cashIn:   pay === "cash" ? parseFloat(cash || "0") : undefined,
        change:   pay === "cash" ? Math.max(0, parseFloat(cash || "0") - total) : undefined,
        status:   "completed",
      });
      // تحديث المنتجات بعد البيع لعرض المخزون الحقيقي
      setTimeout(() => refreshPosProds(), 500);
    } catch { /* نكمل بدون خطأ — سيتحدث المخزون عند الـ refresh */ }
    setOk(true);
    invNoRef.current = `INV-${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;
  };

  const handleClose = () => { setOk(false); setCart([]); setShowPay(false); setCash(""); setDisc(0); };

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "#F8FAFC" }}>
      {/* Products */}
      <div className="flex-1 flex flex-col overflow-hidden border-l border-border">
        <div className="p-3 bg-card border-b border-border space-y-2 shrink-0">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث بالاسم، الباركود، SKU..." className="w-full h-11 rounded-xl border border-border bg-background text-sm pr-9 pl-3 focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-primary" />
            </div>
            <button title="مسح الباركود" className="w-11 h-11 flex items-center justify-center rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground"><Scan size={18} /></button>
            <button onClick={() => setVm(v => v === "grid" ? "list" : "grid")} className="w-11 h-11 flex items-center justify-center rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground">
              {vm === "grid" ? <List size={18} /> : <Grid3X3 size={18} />}
            </button>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {cats.map(c => <button key={c} onClick={() => setCat(c)} className={`shrink-0 px-3 h-8 rounded-full text-xs font-bold border transition-all ${cat === c ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}>{c}</button>)}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 sm:p-3">
          {vm === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
              {prods.map(p => {
                const inCart = cart.find(i => i.product.id === p.id);
                const low = p.stock <= p.minStock;
                return (
                  <button key={p.id} onClick={() => add(p)} className={`bg-card rounded-2xl border-2 p-2.5 sm:p-3 text-right hover:shadow-md transition-all active:scale-95 ${inCart ? "border-primary shadow-md bg-primary/2" : "border-border hover:-translate-y-0.5"}`}>
                    <div className="aspect-square rounded-xl bg-muted/40 mb-2 overflow-hidden relative">
                      <img src={p.image} alt={p.nameAr} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      {low && <div className="absolute top-1 left-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">منخفض</div>}
                      {inCart && <div className="absolute top-1 right-1 w-5 h-5 bg-primary text-white text-xs font-black rounded-full flex items-center justify-center">{inCart.qty}</div>}
                    </div>
                    <p className="text-xs font-bold leading-tight line-clamp-2 mb-1.5">{p.nameAr}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-primary">{p.sellPrice.toFixed(3)}</span>
                      <span className={`text-xs font-semibold ${low ? "text-red-500" : "text-emerald-600"}`}>{p.stock}</span>
                    </div>
                    {inCart && <div className="mt-1.5 bg-primary/10 text-primary rounded-xl text-xs font-black text-center py-1">✓ في السلة</div>}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1.5">
              {prods.map(p => {
                const inCart = cart.find(i => i.product.id === p.id);
                return (
                  <button key={p.id} onClick={() => add(p)} className={`w-full flex items-center gap-3 bg-card rounded-xl border p-3 md:p-4 text-right hover:shadow-sm transition-all active:scale-[0.99] ${inCart ? "border-primary bg-primary/2" : "border-border"}`}>
                    <img src={p.image} alt={p.nameAr} className="w-12 h-12 md:w-14 md:h-14 rounded-xl object-cover bg-muted shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <div className="flex-1 min-w-0"><p className="text-sm md:text-base font-bold truncate">{p.nameAr}</p><p className="text-xs text-muted-foreground">{p.sku} • {p.category}</p></div>
                    <div className="text-right shrink-0"><p className="text-sm md:text-base font-black text-primary">{p.sellPrice.toFixed(3)} JOD</p><p className={`text-xs ${p.stock <= p.minStock ? "text-red-500" : "text-emerald-600"}`}>{p.stock}</p></div>
                    {inCart && <div className="w-7 h-7 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center shrink-0">{inCart.qty}</div>}
                  </button>
                );
              })}
            </div>
          )}
          {prods.length === 0 && <Empty icon={<Package size={24} />} title="لا توجد منتجات" desc="جرب البحث بكلمات مختلفة" />}
        </div>
        {holds.length > 0 && (
          <div className="border-t border-amber-200 bg-amber-50 p-2.5 shrink-0">
            <p className="text-xs font-bold text-amber-700 mb-1.5">طلبات معلقة ({holds.length})</p>
            <div className="flex gap-1.5 overflow-x-auto">
              {holds.map((h, i) => <button key={i} onClick={() => resume(i)} className="shrink-0 px-3 h-7 rounded-full bg-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-300">طلب {i + 1} ({h.length} صنف)</button>)}
            </div>
          </div>
        )}
      </div>

      {/* Cart */}
      <div className="w-72 md:w-80 lg:w-96 bg-card flex flex-col border-l border-border shrink-0">
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between"><p className="font-bold">سلة المشتريات</p><span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">{invNo}</span></div>
          <p className="text-xs text-muted-foreground mt-0.5">{cart.length} صنف • {cart.reduce((a, i) => a + i.qty, 0)} وحدة</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-3"><ShoppingCart size={22} className="opacity-30" /></div>
              <p className="text-sm font-semibold">السلة فارغة</p>
              <p className="text-xs opacity-60 mt-1">اضغط على منتج للإضافة</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {cart.map(item => (
                <div key={item.product.id} className="p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-1 min-w-0"><p className="text-xs font-bold leading-tight">{item.product.nameAr}</p><p className="text-xs text-muted-foreground">{item.product.sellPrice.toFixed(3)} JOD</p></div>
                    <button onClick={() => rm(item.product.id)} className="text-red-400 hover:text-red-600 shrink-0"><X size={12} /></button>
                  </div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => upd(item.product.id, -1)} className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-muted flex items-center justify-center hover:bg-red-100 hover:text-red-600 active:scale-90"><Minus size={12} /></button>
                      <span className="w-8 text-center text-sm font-black">{item.qty}</span>
                      <button onClick={() => upd(item.product.id, 1)} className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 active:scale-90"><Plus size={12} /></button>
                    </div>
                    <span className="text-sm font-black">{(item.product.sellPrice * item.qty * (1 - item.discount / 100)).toFixed(3)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground shrink-0">خصم:</span>
                    <input type="number" value={item.discount} min={0} max={100} onChange={e => updd(item.product.id, Number(e.target.value))} className="w-14 h-7 rounded-lg border border-border bg-input-background text-xs text-center focus:outline-none" />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-border p-3 space-y-3 shrink-0">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-bold text-muted-foreground">خصم الفاتورة %</label>
              <input type="number" value={disc} min={0} max={100} onChange={e => setDisc(Number(e.target.value))} className="w-full h-8 rounded-xl border border-border bg-input-background text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-ring/25" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">الدفع</label>
              <div className="flex gap-1">
                {(["cash","card","click","transfer","check","split"] as const).map(m => (
                  <button key={m} onClick={() => setPay(m)} className={`px-1.5 h-8 rounded-xl text-[10px] font-bold transition-all whitespace-nowrap ${pay === m ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}>
                    {m === "cash" ? "نقدي" : m === "click" ? "كليك" : m === "card" ? "بطاقة" : m === "transfer" ? "تحويل" : m === "check" ? "شيك" : "مختلط"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground"><span>المجموع الفرعي</span><span className="font-bold">{sub.toFixed(3)} JOD</span></div>
            {disc > 0 && <div className="flex justify-between text-emerald-600"><span>خصم {disc}%</span><span>-{da.toFixed(3)} JOD</span></div>}
            <div className="flex justify-between text-muted-foreground"><span>ضريبة المبيعات {(TAX * 100).toFixed(0)}%</span><span>{ta.toFixed(3)} JOD</span></div>
            <div className="flex justify-between items-center font-black border-t border-border pt-1.5">
              <span className="text-sm">الإجمالي</span><span className="text-xl text-primary">{total.toFixed(3)} JOD</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <Btn v="secondary" s="sm" onClick={hold} disabled={!cart.length} icon={<Archive size={12} />}>تعليق</Btn>
            <Btn v="ghost" s="sm" onClick={() => setCart([])} disabled={!cart.length} icon={<RotateCcw size={12} />}>مسح</Btn>
            <Btn v="secondary" s="sm" icon={<Printer size={12} />} onClick={() => cart.length ? doPrint() : showToast("السلة فارغة", "warning")}>طباعة</Btn>
          </div>
          <Btn full s="lg" onClick={() => setShowPay(true)} disabled={!cart.length} icon={<Banknote size={16} />}>إتمام الدفع</Btn>
        </div>
      </div>

      {/* Payment Modal */}
      {showPay && (
        <Modal title="إتمام عملية الدفع" sub={invNo} onClose={() => setShowPay(false)}>
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-primary to-blue-700 rounded-2xl p-5 text-center">
              <p className="text-blue-200 text-sm mb-1">المبلغ المستحق</p>
              <p className="text-5xl font-black text-white">{total.toFixed(3)}</p>
              <p className="text-blue-200 font-bold mt-1">دينار أردني</p>
            </div>
            <div className="grid grid-cols-3 gap-2 grid-rows-2">
              {([
                { id: "cash",     label: "💵 نقدي" },
                { id: "card",     label: "💳 بطاقة ائتمانية" },
                { id: "click",    label: "📱 كليك" },
                { id: "transfer", label: "🏦 تحويل بنكي" },
                { id: "check",    label: "📝 شيك" },
                { id: "split",    label: "🔀 مختلط" },
              ] as const).map(m => (
                <button key={m.id} onClick={() => setPay(m.id as typeof pay)}
                  className={`h-12 rounded-2xl text-sm font-black border-2 transition-all ${pay === m.id ? "border-primary bg-primary text-white" : "border-border hover:border-primary/40"}`}>
                  {m.label}
                </button>
              ))}
            </div>
            {pay === "cash" && (
              <div className="space-y-3">
                <F label="المبلغ المُستلَم (JOD)">
                  <TInput value={cash} onChange={setCash} placeholder="0.000" type="number" icon={<Banknote size={13} />} />
                </F>
                {parseFloat(cash || "0") >= total && (
                  <div className="flex justify-between items-center p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl">
                    <span className="font-bold text-emerald-700">الباقي للعميل</span>
                    <span className="text-2xl font-black text-emerald-700">{change.toFixed(3)} JOD</span>
                  </div>
                )}
                <div className="grid grid-cols-4 gap-1.5">
                  {[0.5, 1, 5, 10, 20, 50, 100].map(vv => <button key={vv} onClick={() => setCash(String(vv))} className="h-9 rounded-xl text-xs font-bold border border-border bg-muted hover:bg-primary hover:text-white hover:border-primary">{vv} JOD</button>)}
                  <button onClick={() => setCash(total.toFixed(3))} className="h-9 rounded-xl text-xs font-bold border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">المجموع</button>
                </div>
              </div>
            )}
            {pay === "click" && (
              <div className="text-center py-6 bg-blue-50 border-2 border-blue-200 rounded-2xl">
                <CreditCard size={36} className="mx-auto mb-3 text-blue-500" />
                <p className="font-bold text-blue-700">في انتظار الدفع عبر كليك</p>
                <p className="text-xs text-blue-500 mt-1">اطلب من العميل إتمام الدفع</p>
              </div>
            )}
            {pay === "card" && (
              <div className="text-center py-6 bg-indigo-50 border-2 border-indigo-200 rounded-2xl">
                <CreditCard size={36} className="mx-auto mb-3 text-indigo-500" />
                <p className="font-bold text-indigo-700">ادفع عبر بطاقة الائتمان / الخصم</p>
                <p className="text-xs text-indigo-500 mt-1">أدخل البطاقة في القارئ وأكمل الدفع</p>
              </div>
            )}
            {pay === "transfer" && (
              <div className="text-center py-6 bg-teal-50 border-2 border-teal-200 rounded-2xl">
                <Landmark size={36} className="mx-auto mb-3 text-teal-500" />
                <p className="font-bold text-teal-700">تحويل بنكي</p>
                <p className="text-xs text-teal-500 mt-1">تأكد من استلام إشعار التحويل قبل التأكيد</p>
              </div>
            )}
            {pay === "check" && (
              <div className="text-center py-6 bg-amber-50 border-2 border-amber-200 rounded-2xl">
                <FileText size={36} className="mx-auto mb-3 text-amber-500" />
                <p className="font-bold text-amber-700">دفع بالشيك</p>
                <p className="text-xs text-amber-500 mt-1">تحقق من صحة الشيك قبل التأكيد</p>
              </div>
            )}
            {pay === "split" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 border border-border rounded-xl"><span className="text-sm font-semibold">نقدي</span><TInput value={cash} onChange={setCash} placeholder="0.000" type="number" /></div>
                <div className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded-xl"><span className="text-sm font-semibold text-blue-700">كليك / بطاقة</span><span className="font-bold text-blue-700">{Math.max(0, total - parseFloat(cash || "0")).toFixed(3)} JOD</span></div>
              </div>
            )}
            <div className="flex gap-3">
              <Btn v="secondary" onClick={() => setShowPay(false)} cls="flex-1">إلغاء</Btn>
              <Btn onClick={() => { doPay(); setShowPay(false); }} cls="flex-1" v="success" icon={<CheckCircle size={15} />} disabled={pay === "cash" && parseFloat(cash || "0") < total}>تأكيد الدفع</Btn>
            </div>
          </div>
        </Modal>
      )}
      {ok && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(5,150,105,.12)", backdropFilter: "blur(8px)" }}>
          <div className="bg-card rounded-3xl shadow-2xl p-10 text-center max-w-sm w-full border border-emerald-200">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5"><CheckCircle size={48} className="text-emerald-500" /></div>
            <h3 className="text-2xl font-black mb-2">تمت العملية بنجاح!</h3>
            <p className="text-muted-foreground font-mono text-sm mb-2">{invNo}</p>
            <p className="text-4xl font-black text-primary mb-3">{total.toFixed(3)} JOD</p>
            {pay === "cash" && change > 0 && <p className="text-emerald-600 font-bold text-lg mb-4">الباقي: {change.toFixed(3)} JOD</p>}
            <div className="flex gap-2 mb-3">
              <Btn v="secondary" full icon={<Printer size={14} />} onClick={doPrint}>طباعة الإيصال</Btn>
              <Btn v="ghost" full icon={<Download size={14} />} onClick={() => { doPrint(); }}>PDF</Btn>
            </div>
            <Btn v="success" full onClick={handleClose} icon={<Plus size={14} />}>فاتورة جديدة</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS MANAGER
// ─────────────────────────────────────────────────────────────────────────────

// ── OpenFoodFacts real API types ─────────────────────────────────────────────
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

function ProductsMgr() {
  const sid = useStoreId();
  const modules = useStoreModules();
  const { data: prodsRaw, loading: prodsLoading, refresh: refreshProds } = useApi<unknown[]>("/products", []);
  const [prods, setProds] = useState<Product[]>([]);
  useEffect(() => { setProds(normList<Product>(prodsRaw)); }, [prodsRaw]);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("الكل");
  const [showAdd, setShowAdd] = useState(false);
  const [editProd, setEditProd] = useState<Product | null>(null);
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

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-48"><TInput value={q} onChange={setQ} placeholder="بحث بالاسم، الباركود، SKU..." icon={<Search size={14} />} /></div>
        <div className="flex gap-1.5 overflow-x-auto">
          {categories.map(c => <button key={c} onClick={() => setCatFilter(c)} className={`shrink-0 px-3 h-10 rounded-xl text-xs font-bold border transition-all ${catFilter === c ? "bg-primary text-white border-primary" : "border-border bg-card hover:border-primary hover:text-primary"}`}>{c}</button>)}
        </div>
      </div>

      {prods.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border">
          <Empty icon={<Package size={28} />} title="لا توجد منتجات بعد" desc='أضف منتجاً جديداً أو استخدم جلب Open Food Facts للسوبرماركت' />
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
        <Modal title="إضافة منتج جديد" sub="ادخل الباركود للجلب التلقائي من Open Food Facts أو أدخل البيانات يدوياً" onClose={() => setShowAdd(false)} size="lg">

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
            <F label="الاسم بالعربية" req><TInput value={f.nameAr} onChange={v => setF({ ...f, nameAr: v })} placeholder="أرز بسمتي" /></F>
            <F label="الاسم بالإنجليزية"><TInput value={f.nameEn} onChange={v => setF({ ...f, nameEn: v })} placeholder="Basmati Rice" /></F>
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

function PurchScreen() {
  const sid = useStoreId();
  const [orders, setOrders] = useLS<{id:string;sup:string;date:string;items:number;total:number;status:string}[]>(sk(sid, "purchases"), []);
  const SC: Record<string, string> = { مكتمل: "bg-emerald-100 text-emerald-700", "قيد الاستلام": "bg-blue-100 text-blue-700" };
  return (
    <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto h-full">
      <Hdr title="طلبات الشراء" action={<Btn s="sm" icon={<Plus size={13} />} onClick={() => showToast("فتح نموذج طلب شراء جديد", "info")}>طلب شراء جديد</Btn>} />
      <div className="grid grid-cols-3 gap-4">
        <KPI icon={<ClipboardList size={18} />} label="طلبات الشهر" value="15" color="#1D4ED8" />
        <KPI icon={<DollarSign size={18} />} label="إجمالي المشتريات" value="6,240 JOD" color="#059669" />
        <KPI icon={<Truck size={18} />} label="قيد الاستلام" value="3" color="#D97706" />
      </div>
      {orders.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border">
          <Empty icon={<Clipboard size={28} />} title="لا توجد طلبات شراء بعد" desc='أضف طلب شراء جديد من الزر أعلاه' />
        </div>
      ) : (
      <div className="bg-card rounded-2xl border border-border divide-y divide-border/60 overflow-hidden">
        {orders.map(o => (
          <div key={o.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0"><Clipboard size={16} className="text-muted-foreground" /></div>
            <div className="flex-1 min-w-0"><p className="font-bold">{o.id}</p><p className="text-xs text-muted-foreground">{o.sup} • {o.date} • {o.items} أصناف</p></div>
            <p className="font-black hidden sm:block">{o.total.toFixed(3)} JOD</p>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${SC[o.status] || "bg-gray-100 text-gray-600"}`}>{o.status}</span>
            <div className="flex gap-1"><Btn v="ghost" s="xs" icon={<Eye size={10} />} onClick={() => showToast(`${o.id}: ${o.items} أصناف، المجموع ${o.total.toFixed(3)} JOD`, "info")}>عرض</Btn><Btn v="secondary" s="xs" icon={<Printer size={10} />} onClick={() => showToast(`جاري طباعة طلب ${o.id}...`, "info")}>طباعة</Btn></div>
          </div>
        ))}
      </div>
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

function StoreReports() {
  const [period, setPeriod] = useState("week");
  type PeriodSummary = { total?: number; count?: number; profit?: number; returns?: number; discounts?: number };
  type WeekPoint = { day: string; مبيعات: number; أرباح: number };
  type TopProduct = { nameAr: string; total: number; pct?: number };
  type PayBreakdown = { method: string; total: number; pct: number };
  type TaxData = { taxableSales?: number; taxAmount?: number; exemptSales?: number };
  const { data: periodData, loading: periodLoading } = useApi<PeriodSummary>(`/reports/period?range=${period}`, {});
  const { data: weekChartRaw } = useApi<WeekPoint[]>("/reports/weekly", []);
  const { data: topProducts } = useApi<TopProduct[]>("/reports/top-products?limit=5", []);
  const { data: payBreakdown } = useApi<PayBreakdown[]>("/reports/payment-methods", []);
  const { data: taxData } = useApi<TaxData>("/reports/tax", {});
  const defaultWeek: WeekPoint[] = [
    { day: "السبت", مبيعات: 0, أرباح: 0 }, { day: "الأحد", مبيعات: 0, أرباح: 0 },
    { day: "الاثنين", مبيعات: 0, أرباح: 0 }, { day: "الثلاثاء", مبيعات: 0, أرباح: 0 },
    { day: "الأربعاء", مبيعات: 0, أرباح: 0 }, { day: "الخميس", مبيعات: 0, أرباح: 0 },
    { day: "الجمعة", مبيعات: 0, أرباح: 0 },
  ];
  const weekChartData = (weekChartRaw && weekChartRaw.length > 0) ? weekChartRaw : defaultWeek;
  const maxTopSales = topProducts.length > 0 ? Math.max(...topProducts.map(p => p.total)) : 1;
  const PAY_ICONS: Record<string, { ic: React.ReactNode; c: string }> = {
    نقدي:    { ic: <Banknote size={18} />,   c: "#059669" },
    كليك:    { ic: <CreditCard size={18} />, c: "#1D4ED8" },
    مختلط:   { ic: <Layers size={18} />,    c: "#D97706" },
    "بطاقة ائتمانية": { ic: <CreditCard size={18} />, c: "#7C3AED" },
    "تحويل بنكي":     { ic: <Banknote size={18} />,   c: "#0891B2" },
    شيك:     { ic: <FileText size={18} />,  c: "#DB2777" },
  };
  const taxable = taxData?.taxableSales || 0;
  const taxAmt  = taxData?.taxAmount    || 0;
  const exempt  = taxData?.exemptSales  || 0;
  const printTax = () => {
    const w = window.open("", "_blank", "width=500,height=700,scrollbars=yes");
    if (!w) { showToast("يُرجى السماح بالنوافذ المنبثقة للطباعة", "warning"); return; }
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>تقرير الضريبة</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;direction:rtl;text-align:right;padding:32px;color:#111}h1{text-align:center;font-size:20px;margin-bottom:4px}p.sub{text-align:center;color:#666;font-size:12px;margin-bottom:24px}.row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:14px}.row.total{font-weight:bold;font-size:15px;border-bottom:none;padding-top:14px}.footer{margin-top:24px;text-align:center;font-size:11px;color:#999}</style></head><body><h1>تقرير الضريبة</h1><p class="sub">${new Date().toLocaleDateString("ar-JO",{year:"numeric",month:"long",day:"numeric"})}</p><div class="row"><span>مبيعات خاضعة للضريبة</span><span>${taxable.toFixed(3)} JOD</span></div><div class="row"><span>ضريبة القيمة المضافة 16%</span><span>${taxAmt.toFixed(3)} JOD</span></div><div class="row"><span>مبيعات معفاة من الضريبة</span><span>${exempt.toFixed(3)} JOD</span></div><div class="row total"><span>إجمالي الضرائب المحصّلة</span><span>${taxAmt.toFixed(3)} JOD</span></div><div class="footer">Sowwanjo POS — نظام نقاط البيع</div></body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
  };
  return (
    <div className="p-3 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto h-full">
      <Hdr title="التقارير والإحصائيات" action={<><Btn v="secondary" s="sm" icon={<Download size={13} />} onClick={() => showToast("جاري إعداد تقرير PDF...", "info")}>PDF</Btn><Btn v="secondary" s="sm" icon={<Download size={13} />} onClick={() => showToast("جاري تصدير ملف Excel...", "info")}>Excel</Btn></>} />
      <div className="flex bg-muted rounded-2xl p-1 border border-border w-fit">
        {[["week","أسبوع"],["month","شهر"],["year","سنة"]].map(([vv,l]) => <button key={vv} onClick={() => setPeriod(vv)} className={`px-4 h-8 rounded-xl text-xs font-bold transition-all ${period === vv ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{l}</button>)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={<ShoppingCart size={18} />} label="المبيعات" value={periodLoading ? "..." : `${(periodData.total || 0).toFixed(3)} JOD`} sub={`${periodData.count || 0} فاتورة`} color="#1D4ED8" />
        <KPI icon={<TrendingUp size={18} />} label="الربح الصافي" value={periodLoading ? "..." : `${(periodData.profit || 0).toFixed(3)} JOD`} color="#059669" />
        <KPI icon={<RotateCcw size={18} />} label="المرتجعات" value={periodLoading ? "..." : `${(periodData.returns || 0).toFixed(3)} JOD`} color="#DC2626" />
        <KPI icon={<Percent size={18} />} label="الخصومات" value={periodLoading ? "..." : `${(periodData.discounts || 0).toFixed(3)} JOD`} color="#D97706" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-4">المبيعات والأرباح</p>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={weekChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [`${v} JOD`]} />
              <Line key="rpt-sales" type="monotone" dataKey="مبيعات" stroke="#1D4ED8" strokeWidth={2.5} dot={false} />
              <Line key="rpt-prof" type="monotone" dataKey="أرباح" stroke="#059669" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-4">أكثر المنتجات مبيعاً</p>
          {topProducts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">لا توجد مبيعات بعد</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((pp, i) => {
                const pct = Math.round((pp.total / maxTopSales) * 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-black text-muted-foreground w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1"><div className="flex justify-between mb-1"><span className="text-xs font-bold">{pp.nameAr}</span><span className="text-xs font-black">{pp.total.toFixed(3)} JOD</span></div><div className="h-1.5 bg-muted rounded-full"><div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} /></div></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-4">طرق الدفع</p>
          {payBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">لا توجد بيانات دفع بعد</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {payBreakdown.map(x => {
                const meta = PAY_ICONS[x.method] || { ic: <CreditCard size={18} />, c: "#6B7280" };
                return (
                  <div key={x.method} className="text-center p-4 rounded-2xl bg-muted/40 border border-border">
                    <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: `${meta.c}15` }}><span style={{ color: meta.c }}>{meta.ic}</span></div>
                    <p className="text-2xl font-black">{x.pct}%</p>
                    <p className="text-xs font-bold mt-0.5">{x.method}</p>
                    <p className="text-xs text-muted-foreground">{x.total.toFixed(3)} JOD</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-4">تقرير الضريبة</p>
          <div className="space-y-3">
            {[["مبيعات خاضعة للضريبة", `${taxable.toFixed(3)} JOD`], ["ضريبة القيمة المضافة 16%", `${taxAmt.toFixed(3)} JOD`], ["مبيعات معفاة من الضريبة", `${exempt.toFixed(3)} JOD`], ["إجمالي الضرائب المحصّلة", `${taxAmt.toFixed(3)} JOD`]].map(([l, vv]) => (
              <div key={l} className="flex justify-between border-b border-border/60 pb-2 last:border-0">
                <span className="text-sm text-muted-foreground">{l}</span><span className="font-bold">{vv}</span>
              </div>
            ))}
          </div>
          <Btn v="secondary" full cls="mt-4" icon={<Printer size={13} />} onClick={printTax}>طباعة تقرير الضريبة</Btn>
        </div>
      </div>
    </div>
  );
}

function EmpScreen() {
  const sid = useStoreId();
  const { data: empsRaw, refresh: refreshEmps } = useApi<unknown[]>("/users", []);
  const [emps, setEmps] = useState<{id:string;name:string;role:string;phone:string;sales:number;status:string;branch:string}[]>([]);
  useEffect(() => { setEmps(normList<{id:string;name:string;role:string;phone:string;sales:number;status:string;branch:string}>(empsRaw)); }, [empsRaw]);
  const [showNew, setShowNew] = useState(false);
  const [editEmp, setEditEmp] = useState<{id:number;name:string;role:string;phone:string;sales:number;status:string;branch:string}|null>(null);
  const [nf, setNf] = useState({ name: '', role: 'كاشير', phone: '', branch: 'الفرع الرئيسي' });
  const RC: Record<string, { c: string; b: string }> = { مدير: { c: "#1D4ED8", b: "#DBEAFE" }, كاشير: { c: "#059669", b: "#D1FAE5" }, "مسؤول مخزون": { c: "#D97706", b: "#FEF3C7" } };
  const addEmp = async () => {
    if (!nf.name || !nf.phone) return;
    try {
      await storeApi.post("/users", { name: nf.name, phone: nf.phone, role: nf.role, email: `${nf.phone.replace(/[^0-9]/g,"")}@store.jo` });
      await refreshEmps();
      showToast(`تم إضافة "${nf.name}" وحفظه في قاعدة البيانات ✅`);
    } catch (e) { showToast((e as {error?:string}).error || "خطأ في إضافة الموظف", "error"); return; }
    setShowNew(false); setNf({ name: '', role: 'كاشير', phone: '', branch: 'الفرع الرئيسي' });
  };
  const delEmp = async (id: string) => { await storeApi.delete(`/users/${id}`); await refreshEmps(); showToast("تم حذف الموظف", "warning"); };
  const saveEdit = async () => { if (!editEmp) return; await storeApi.put(`/users/${editEmp.id}`, { name: editEmp.name, role: editEmp.role, status: editEmp.status }); await refreshEmps(); showToast("تم حفظ تعديلات الموظف"); setEditEmp(null); };

  return (
    <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto h-full">
      <Hdr title="الموظفون والصلاحيات" action={<Btn s="sm" icon={<Plus size={13} />} onClick={() => setShowNew(true)}>موظف جديد</Btn>} />
      {emps.length === 0 && (
        <div className="bg-card rounded-2xl border border-border mb-4">
          <Empty icon={<UserCheck size={28} />} title="لا يوجد موظفون بعد" desc='أضف موظفاً جديداً من زر "موظف جديد"' />
        </div>
      )}
      <div className="grid grid-cols-1 gap-3">
        {emps.map(e => {
          const rc = RC[e.role] || { c: "#64748B", b: "#E2E8F0" };
          return (
            <div key={e.id} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4 hover:shadow-sm">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-black text-white text-lg" style={{ backgroundColor: rc.c }}>{e.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold">{e.name}</p>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: rc.b, color: rc.c }}>{e.role}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${e.status === "نشط" ? "text-emerald-700 bg-emerald-100" : "text-amber-700 bg-amber-100"}`}>{e.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{e.phone} • {e.branch}</p>
              </div>
              {e.sales > 0 && <div className="hidden sm:block text-right shrink-0"><p className="text-sm font-black">{e.sales.toFixed(3)} JOD</p><p className="text-xs text-muted-foreground">مبيعات الشهر</p></div>}
              <div className="flex gap-1 shrink-0">
                <button onClick={() => showToast(`صلاحيات "${e.name}" — الدور: ${e.role}`, "info")} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-primary/10 text-primary"><Shield size={13} /></button>
                <button onClick={() => setEditEmp({ ...e })} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-blue-100 text-blue-500"><Edit2 size={13} /></button>
                <button onClick={() => delEmp(e.id)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-100 text-red-500"><Trash2 size={13} /></button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="bg-card rounded-2xl border border-border p-5">
        <p className="font-bold mb-4">مصفوفة الصلاحيات</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border"><th className="text-right p-2 font-bold text-muted-foreground">الصلاحية</th>{["مالك","مدير","كاشير","مخزون","محاسب"].map(r => <th key={r} className="p-2 font-bold text-muted-foreground text-center">{r}</th>)}</tr></thead>
            <tbody className="divide-y divide-border/60">
              {[["الوصول لنقطة البيع",true,true,true,false,false],["إضافة وتعديل منتجات",true,true,false,true,false],["عرض التقارير",true,true,false,false,true],["إدارة المستخدمين",true,false,false,false,false],["تطبيق الخصومات",true,true,true,false,false],["معالجة المرتجعات",true,true,false,false,false],["تصدير البيانات",true,true,false,false,true],["تغيير إعدادات المتجر",true,false,false,false,false]].map(([p,...vs]) => (
                <tr key={String(p)} className="hover:bg-muted/20">
                  <td className="p-2 font-medium">{p}</td>
                  {(vs as boolean[]).map((vv, i) => <td key={i} className="p-2 text-center">{vv ? <CheckCircle size={12} className="text-emerald-500 mx-auto" /> : <X size={12} className="text-muted-foreground/30 mx-auto" />}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && (
        <Modal title="إضافة موظف جديد" onClose={() => setShowNew(false)} size="sm">
          <div className="space-y-4">
            <F label="الاسم الكامل" req><TInput value={nf.name} onChange={v=>setNf({...nf,name:v})} placeholder="محمد أحمد السالم" /></F>
            <F label="رقم الهاتف" req><TInput value={nf.phone} onChange={v=>setNf({...nf,phone:v})} placeholder="+962-79-XXX-XXXX" icon={<Phone size={13}/>} /></F>
            <F label="الدور الوظيفي"><SInput value={nf.role} onChange={v=>setNf({...nf,role:v})} options={["مدير","كاشير","مسؤول مخزون","محاسب"].map(r=>({value:r,label:r}))} /></F>
            <F label="الفرع"><SInput value={nf.branch} onChange={v=>setNf({...nf,branch:v})} options={["الفرع الرئيسي","فرع مرج الحمام","فرع الزرقاء"].map(b=>({value:b,label:b}))} /></F>
            <div className="flex gap-3 justify-end"><Btn v="secondary" onClick={()=>setShowNew(false)}>إلغاء</Btn><Btn onClick={addEmp} disabled={!nf.name||!nf.phone} icon={<Plus size={14}/>}>إضافة الموظف</Btn></div>
          </div>
        </Modal>
      )}
      {editEmp && (
        <Modal title="تعديل بيانات الموظف" onClose={() => setEditEmp(null)} size="sm">
          <div className="space-y-4">
            <F label="الاسم الكامل"><TInput value={editEmp.name} onChange={v=>setEditEmp({...editEmp,name:v})} /></F>
            <F label="رقم الهاتف"><TInput value={editEmp.phone} onChange={v=>setEditEmp({...editEmp,phone:v})} /></F>
            <F label="الدور الوظيفي"><SInput value={editEmp.role} onChange={v=>setEditEmp({...editEmp,role:v})} options={["مدير","كاشير","مسؤول مخزون","محاسب"].map(r=>({value:r,label:r}))} /></F>
            <F label="الحالة"><SInput value={editEmp.status} onChange={v=>setEditEmp({...editEmp,status:v})} options={["نشط","إجازة","موقوف"].map(s=>({value:s,label:s}))} /></F>
            <div className="flex gap-3 justify-end"><Btn v="secondary" onClick={()=>setEditEmp(null)}>إلغاء</Btn><Btn onClick={saveEdit} icon={<Check size={14}/>}>حفظ التعديلات</Btn></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function BranchScreen() {
  const sid = useStoreId();
  const { data: branchesRaw, refresh: refreshBranches } = useApi<unknown[]>("/branches", []);
  const [branches, setBranches] = useState<{id:string;name:string;city:string;manager:string;terminals:number;employees:number;sales:number;status:string}[]>([]);
  useEffect(() => { setBranches(normList<{id:string;name:string;city:string;manager:string;terminals:number;employees:number;sales:number;status:string}>(branchesRaw)); }, [branchesRaw]);
  const { data: termsRaw, refresh: refreshTerms } = useApi<unknown[]>("/branches/terminals", []);
  const [terms, setTerms] = useState<{id:string;name:string;cashier:string;branch:string;status:string;sales:number}[]>([]);
  useEffect(() => { setTerms(normList<{id:string;name:string;cashier:string;branch:string;status:string;sales:number}>(termsRaw)); }, [termsRaw]);
  const [showBranch, setShowBranch] = useState(false);
  const [showTerm, setShowTerm] = useState(false);
  const [viewBranch, setViewBranch] = useState<typeof branches[0] | null>(null);
  const [nb, setNb] = useState({ name: "", city: "", manager: "" });
  const [nt, setNt] = useState({ name: "", cashier: "", branch: "الفرع الرئيسي" });

  const toggleBranch = async (id: string) => { const b = branches.find(x=>x.id===id); await storeApi.put(`/branches/${id}`, { status: b?.status === "نشط" ? "غير نشط" : "نشط" }); await refreshBranches(); showToast("تم تغيير حالة الفرع"); setViewBranch(null); };
  const toggleTerm = async (id: string) => { const t = terms.find(x=>x.id===id); await storeApi.put(`/branches/terminals/${id}`, { status: t?.status === "نشط" ? "مغلق" : "نشط" }); await refreshTerms(); showToast(t?.status === "نشط" ? "تم إغلاق الجهاز" : "تم فتح الجهاز"); };
  const addBranch = async () => { if (!nb.name) return; try { await storeApi.post("/branches", { ...nb, status: "نشط" }); await refreshBranches(); showToast(`تم إنشاء فرع "${nb.name}" ✅`); } catch { showToast("خطأ في إنشاء الفرع","error"); return; } setShowBranch(false); setNb({name:"",city:"",manager:""}); };
  const addTerm = async () => { if (!nt.name) return; try { await storeApi.post("/branches/terminals", { ...nt, status: "مغلق" }); await refreshTerms(); showToast(`تم إضافة جهاز "${nt.name}" ✅`); } catch { showToast("خطأ في إضافة الجهاز","error"); return; } setShowTerm(false); setNt({name:"",cashier:"",branch:"الفرع الرئيسي"}); };

  return (
    <div className="p-3 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto h-full">
      <Hdr title="الفروع والأجهزة" action={<><Btn v="secondary" s="sm" icon={<Monitor size={13} />} onClick={() => setShowTerm(true)}>جهاز جديد</Btn><Btn s="sm" icon={<Plus size={13} />} onClick={() => setShowBranch(true)}>فرع جديد</Btn></>} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {branches.map(b => (
          <div key={b.id} className={`bg-card rounded-2xl border-2 p-5 ${b.status === "نشط" ? "border-border" : "border-border opacity-60"}`}>
            <div className="flex items-start justify-between mb-3">
              <div><p className="font-bold">{b.name}</p><p className="text-xs text-muted-foreground">{b.city}</p></div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${b.status === "نشط" ? "text-emerald-700 bg-emerald-100" : "text-gray-600 bg-gray-100"}`}>{b.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="bg-muted/60 rounded-xl p-2 text-center"><p className="font-black text-base">{b.terminals}</p><p className="text-muted-foreground">أجهزة</p></div>
              <div className="bg-muted/60 rounded-xl p-2 text-center"><p className="font-black text-base">{b.employees}</p><p className="text-muted-foreground">موظفون</p></div>
            </div>
            <p className="text-xs text-muted-foreground">المدير: {b.manager}</p>
            <p className="text-sm font-black text-primary mt-1">{b.sales.toFixed(3)} JOD</p>
            <div className="flex gap-2 mt-3">
              <Btn v="secondary" s="xs" full icon={<Eye size={10} />} onClick={() => setViewBranch(b)}>عرض</Btn>
              <Btn v={b.status === "نشط" ? "danger" : "success"} s="xs" full icon={<Power size={10}/>} onClick={() => toggleBranch(b.id)}>{b.status === "نشط" ? "إيقاف" : "تفعيل"}</Btn>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-card rounded-2xl border border-border divide-y divide-border/60 overflow-hidden">
        {terms.map(t => (
          <div key={t.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.status === "نشط" ? "bg-emerald-100" : "bg-gray-100"}`}>
              <Monitor size={16} className={t.status === "نشط" ? "text-emerald-600" : "text-gray-400"} />
            </div>
            <div className="flex-1 min-w-0"><p className="font-bold">{t.name}</p><p className="text-xs text-muted-foreground">{t.id} • {t.branch} • {t.cashier}</p></div>
            <div className="hidden sm:block text-right"><p className="text-sm font-black">{t.sales.toFixed(3)} JOD</p><p className="text-xs text-muted-foreground">مبيعات اليوم</p></div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${t.status === "نشط" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{t.status}</span>
            {t.status === "نشط" ? <Btn v="danger" s="xs" icon={<Power size={10} />} onClick={() => toggleTerm(t.id)}>إغلاق</Btn> : <Btn v="success" s="xs" icon={<Power size={10} />} onClick={() => toggleTerm(t.id)}>فتح</Btn>}
          </div>
        ))}
      </div>

      {viewBranch && (
        <Modal title={viewBranch.name} sub={viewBranch.city} onClose={() => setViewBranch(null)} size="sm">
          <div className="space-y-3 text-sm">
            {[["المدير",viewBranch.manager],["الحالة",viewBranch.status],["الأجهزة",viewBranch.terminals],["الموظفون",viewBranch.employees],["المبيعات",`${viewBranch.sales.toFixed(3)} JOD`]].map(([l,v])=>(
              <div key={String(l)} className="flex justify-between border-b border-border/60 pb-2"><span className="text-muted-foreground">{l}</span><span className="font-bold">{v}</span></div>
            ))}
            <Btn full v={viewBranch.status === "نشط" ? "danger" : "success"} onClick={() => toggleBranch(viewBranch.id)} icon={<Power size={14}/>}>
              {viewBranch.status === "نشط" ? "إيقاف الفرع" : "تفعيل الفرع"}
            </Btn>
          </div>
        </Modal>
      )}
      {showBranch && (
        <Modal title="إضافة فرع جديد" onClose={() => setShowBranch(false)} size="sm">
          <div className="space-y-4">
            <F label="اسم الفرع" req><TInput value={nb.name} onChange={v=>setNb({...nb,name:v})} placeholder="فرع..." /></F>
            <F label="المدينة"><TInput value={nb.city} onChange={v=>setNb({...nb,city:v})} placeholder="عمّان" /></F>
            <F label="مدير الفرع"><TInput value={nb.manager} onChange={v=>setNb({...nb,manager:v})} /></F>
            <div className="flex gap-3 justify-end"><Btn v="secondary" onClick={()=>setShowBranch(false)}>إلغاء</Btn><Btn onClick={addBranch} disabled={!nb.name} icon={<Plus size={14}/>}>إنشاء الفرع</Btn></div>
          </div>
        </Modal>
      )}
      {showTerm && (
        <Modal title="إضافة جهاز POS جديد" onClose={() => setShowTerm(false)} size="sm">
          <div className="space-y-4">
            <F label="اسم الجهاز" req><TInput value={nt.name} onChange={v=>setNt({...nt,name:v})} placeholder="كاشير 1" /></F>
            <F label="الكاشير المسؤول"><TInput value={nt.cashier} onChange={v=>setNt({...nt,cashier:v})} /></F>
            <F label="الفرع"><SInput value={nt.branch} onChange={v=>setNt({...nt,branch:v})} options={branches.map(b=>({value:b.name,label:b.name}))} /></F>
            <div className="flex gap-3 justify-end"><Btn v="secondary" onClick={()=>setShowTerm(false)}>إلغاء</Btn><Btn onClick={addTerm} disabled={!nt.name} icon={<Plus size={14}/>}>إضافة الجهاز</Btn></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function LoyaltyScreen() {
  const sid = useStoreId();
  const [coupons, setCoupons] = useLS<{code:string;desc:string;uses:number;exp:string;type:string}[]>(sk(sid, "coupons"), []);
  const [showNew, setShowNew] = useState(false);
  const [nf, setNf] = useState({ code: "", desc: "", exp: "", type: "نسبة" });

  const addCoupon = () => {
    if (!nf.code || !nf.desc) return;
    setCoupons(p => [...p, { ...nf, uses: 0 }]);
    showToast(`تم إضافة القسيمة ${nf.code}`);
    setShowNew(false); setNf({ code: "", desc: "", exp: "", type: "نسبة" });
  };
  const delCoupon = (code: string) => { setCoupons(p => p.filter(c => c.code !== code)); showToast("تم حذف القسيمة", "warning"); };
  const copyCoupon = (code: string) => { navigator.clipboard?.writeText(code); showToast(`تم نسخ الكود: ${code}`, "info"); };

  return (
    <div className="p-3 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto h-full">
      <Hdr title="نظام الولاء والمكافآت" action={<Btn s="sm" icon={<Plus size={13} />} onClick={() => setShowNew(true)}>قسيمة جديدة</Btn>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={<Star size={18} />} label="نقاط مُصدرة" value="48,250" color="#D97706" />
        <KPI icon={<Wallet size={18} />} label="رصيد المحافظ" value="1,240 JOD" color="#1D4ED8" />
        <KPI icon={<Tag size={18} />} label="قسائم نشطة" value={String(coupons.length)} color="#059669" />
        <KPI icon={<Users size={18} />} label="أعضاء الولاء" value="142" color="#7C3AED" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-4">مستويات العضوية</p>
          <div className="space-y-3">
            {[{ l: "عادي", min: 0, max: 199, count: 72, icon: "🥉" }, { l: "فضي", min: 200, max: 499, count: 45, icon: "🥈" }, { l: "ذهبي", min: 500, max: 999, count: 18, icon: "🥇" }, { l: "بلاتيني", min: 1000, max: 99999, count: 7, icon: "💎" }].map(m => (
              <div key={m.l} className="flex items-center gap-3 border border-border rounded-xl p-3">
                <span className="text-xl shrink-0">{m.icon}</span>
                <div className="flex-1"><div className="flex justify-between mb-0.5"><span className="font-bold text-sm">{m.l}</span><span className="text-xs text-muted-foreground">{m.count} عضو</span></div><p className="text-xs text-muted-foreground">{m.min} — {m.max === 99999 ? "∞" : m.max} نقطة</p></div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-4">القسائم النشطة</p>
          <div className="space-y-3">
            {coupons.map(c => (
              <div key={c.code} className="border border-border rounded-xl p-3 flex items-center gap-3">
                <div className="flex-1">
                  <span className="font-mono font-black text-primary">{c.code}</span>
                  <p className="text-xs text-muted-foreground">{c.desc} • {c.uses} استخدام • ينتهي {c.exp}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => copyCoupon(c.code)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-100 text-blue-500"><Copy size={11} /></button>
                  <button onClick={() => delCoupon(c.code)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-100 text-red-500"><Trash2 size={11} /></button>
                </div>
              </div>
            ))}
          </div>
          <Btn full v="secondary" cls="mt-4" icon={<Plus size={13} />} onClick={() => setShowNew(true)}>إضافة قسيمة جديدة</Btn>
        </div>
      </div>

      {showNew && (
        <Modal title="إضافة قسيمة خصم جديدة" onClose={() => setShowNew(false)} size="sm">
          <div className="space-y-4">
            <F label="كود القسيمة" req><TInput value={nf.code} onChange={v=>setNf({...nf,code:v.toUpperCase()})} placeholder="PROMO20" /></F>
            <F label="وصف القسيمة" req><TInput value={nf.desc} onChange={v=>setNf({...nf,desc:v})} placeholder="خصم 20% على المشتريات" /></F>
            <F label="نوع الخصم"><SInput value={nf.type} onChange={v=>setNf({...nf,type:v})} options={[{value:"نسبة",label:"نسبة مئوية %"},{value:"مبلغ",label:"مبلغ ثابت JOD"}]} /></F>
            <F label="تاريخ الانتهاء"><TInput value={nf.exp} onChange={v=>setNf({...nf,exp:v})} type="date" /></F>
            <div className="flex gap-3 justify-end"><Btn v="secondary" onClick={()=>setShowNew(false)}>إلغاء</Btn><Btn onClick={addCoupon} disabled={!nf.code||!nf.desc} icon={<Plus size={14}/>}>إضافة القسيمة</Btn></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StoreSetts({ store }: { store: StoreData }) {
  const sid = useStoreId();
  // يجلب الإعدادات من Backend عند الفتح
  const { data: settingsRaw, refresh: refreshSettings } = useApi<Record<string,unknown>>("/settings", {});

  const [sName,        setSName]        = useState(store.nameAr);
  const [phone,        setPhone]        = useState(store.phone);
  const [address,      setAddress]      = useState("شارع الثقافة، الجبيهة، عمّان، الأردن");
  const [lang,         setLang]         = useState("ar");
  const [rl,           setRl]           = useState("both");
  const [tax,          setTax]          = useState("16");
  const [paper,        setPaper]        = useState("80mm");
  const [printCopies,  setPrintCopies]  = useState("1");
  const [printLogo,    setPrintLogo]    = useState(true);
  const [printTax,     setPrintTax]     = useState(true);
  const [printPhone,   setPrintPhone]   = useState(true);
  const [printBarcode, setPrintBarcode] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  // White-label branding state
  const [brandColor,   setBrandColor]   = useState(() => { try { const r = localStorage.getItem(`sowwanjo_storeinfo_${sid}`); return r ? (JSON.parse(r).primaryColor || "") : ""; } catch { return ""; } });
  const [brandAppName, setBrandAppName] = useState(() => { try { const r = localStorage.getItem(`sowwanjo_storeinfo_${sid}`); return r ? (JSON.parse(r).appName || "") : ""; } catch { return ""; } });
  const [logo, setLogo] = useState<string>(() => {
    try { return localStorage.getItem(`sowwanjo_logo_${sid}`) || ""; } catch { return ""; }
  });
  const logoRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: { target: HTMLInputElement }) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800_000) { showToast("يجب أن يكون حجم الشعار أقل من 800KB", "error"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setLogo(b64);
      try { localStorage.setItem(`sowwanjo_logo_${sid}`, b64); } catch {}
      showToast("تم رفع الشعار بنجاح ✅", "success");
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogo("");
    try { localStorage.removeItem(`sowwanjo_logo_${sid}`); } catch {}
    showToast("تم حذف الشعار", "info");
  };

  // تطبيق الإعدادات المجلوبة من Backend
  useEffect(() => {
    if (!settingsRaw || Object.keys(settingsRaw).length === 0) return;
    if (settingsRaw.storeName) setSName(settingsRaw.storeName as string);
    if (settingsRaw.phone)     setPhone(settingsRaw.phone as string);
    if (settingsRaw.address)   setAddress(settingsRaw.address as string);
    if (settingsRaw.language)  setLang(settingsRaw.language as string);
    if (settingsRaw.receiptLang) setRl(settingsRaw.receiptLang as string);
    if (settingsRaw.taxRate !== undefined) {
      const t = String(settingsRaw.taxRate);
      setTax(t);
      // تحديث localStorage حتى POS يقرأ الضريبة الصحيحة فوراً
      try { localStorage.setItem(sk(sid, "sett_tax"), t); } catch {}
    }
    if (settingsRaw.paperSize)    setPaper(settingsRaw.paperSize as string);
    if (settingsRaw.printCopies)  setPrintCopies(settingsRaw.printCopies as string);
    if (settingsRaw.printLogo   !== undefined) setPrintLogo(Boolean(settingsRaw.printLogo));
    if (settingsRaw.printTax    !== undefined) setPrintTax(Boolean(settingsRaw.printTax));
    if (settingsRaw.printPhone  !== undefined) setPrintPhone(Boolean(settingsRaw.printPhone));
    if (settingsRaw.printBarcode!== undefined) setPrintBarcode(Boolean(settingsRaw.printBarcode));
  }, [settingsRaw, sid]);

  const doSave = async () => {
    try {
      await storeApi.put("/settings", {
        storeName: sName, phone, address, language: lang, receiptLang: rl,
        taxRate: parseFloat(tax) || 0,
        paperSize: paper, printCopies,
        printLogo, printTax, printPhone, printBarcode,
        // White-label branding
        appName: brandAppName, primaryColor: brandColor, logoUrl: logo,
      });
      // تحديث localStorage للـ POS
      try { localStorage.setItem(sk(sid, "sett_tax"), String(parseFloat(tax) || 0)); } catch {}
      try { localStorage.setItem(sk(sid, "sett_paper"), paper); } catch {}
      // تحديث branding في localStorage
      try {
        const r = localStorage.getItem(`sowwanjo_storeinfo_${sid}`);
        if (r) {
          const info = JSON.parse(r);
          info.appName = brandAppName;
          info.primaryColor = brandColor;
          info.logoUrl = logo;
          localStorage.setItem(`sowwanjo_storeinfo_${sid}`, JSON.stringify(info));
        }
      } catch {}
      await refreshSettings();
      showToast("تم حفظ إعدادات المتجر في قاعدة البيانات ✅", "success");
    } catch { showToast("خطأ في حفظ الإعدادات", "error"); }
  };

  return (
    <div className="p-3 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto h-full">
      <Hdr title="إعدادات المتجر" action={<Btn v="success" s="sm" icon={<Check size={13} />} onClick={doSave}>حفظ الإعدادات</Btn>} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <p className="font-bold flex items-center gap-2"><Store size={13} /> معلومات المتجر</p>
          {/* Logo upload */}
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-2">شعار المتجر</p>
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => logoRef.current?.click()}>
                {logo ? (
                  <img src={logo} alt="شعار المتجر" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center">
                    <Upload size={20} className="mx-auto mb-1 text-muted-foreground" />
                    <p className="text-[9px] text-muted-foreground">رفع شعار</p>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Btn v="secondary" s="sm" icon={<Upload size={13} />} onClick={() => logoRef.current?.click()}>
                  {logo ? "تغيير الشعار" : "رفع الشعار"}
                </Btn>
                {logo && <Btn v="ghost" s="sm" icon={<Trash2 size={13} />} onClick={removeLogo}>حذف</Btn>}
                <p className="text-[10px] text-muted-foreground">PNG, JPG — أقل من 800KB</p>
              </div>
            </div>
            <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>

          <F label="اسم المتجر بالعربية"><TInput value={sName} onChange={setSName} /></F>
          <F label="رقم الهاتف"><TInput value={phone} onChange={setPhone} icon={<Phone size={13} />} /></F>
          <F label="البريد الإلكتروني"><TInput value={store.email} readOnly /></F>
          <F label="العنوان">
            <textarea value={address} onChange={e=>setAddress(e.target.value)} rows={2} className="w-full rounded-xl border border-border bg-input-background text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring/25 resize-none" />
          </F>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <p className="font-bold flex items-center gap-2"><Globe size={13} /> اللغة والضريبة</p>
          <F label="لغة النظام"><SInput value={lang} onChange={setLang} options={[{ value: "ar", label: "العربية (RTL)" }, { value: "en", label: "English (LTR)" }]} /></F>
          <F label="لغة الإيصال"><SInput value={rl} onChange={setRl} options={[{ value: "ar", label: "عربي فقط" }, { value: "en", label: "English Only" }, { value: "both", label: "عربي + إنجليزي" }]} /></F>
          <F label="العملة"><TInput value="دينار أردني (JOD)" readOnly /></F>
          <F label="نسبة ضريبة المبيعات (%)"><TInput value={tax} onChange={setTax} type="number" /></F>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <p className="font-bold flex items-center gap-2"><Printer size={13} /> إعدادات الطباعة</p>
          <F label="حجم ورق الطابعة"><SInput value={paper} onChange={setPaper} options={[{ value: "58mm", label: "58mm حراري" }, { value: "80mm", label: "80mm حراري" }, { value: "a4", label: "A4 عادي" }]} /></F>
          <F label="عدد نسخ الإيصال"><SInput value={printCopies} onChange={setPrintCopies} options={[{value:"1",label:"نسخة واحدة"},{value:"2",label:"نسختان"},{value:"3",label:"3 نسخ"}]} /></F>
          <div className="space-y-3">
            {[
              { label: "طباعة شعار المتجر", val: printLogo, set: setPrintLogo },
              { label: "طباعة ضريبة القيمة المضافة", val: printTax, set: setPrintTax },
              { label: "طباعة رقم الهاتف", val: printPhone, set: setPrintPhone },
              { label: "طباعة الباركود على الإيصال", val: printBarcode, set: setPrintBarcode },
            ].map(opt => (
              <div key={opt.label} className="flex items-center justify-between py-1 border-b border-border/60 last:border-0">
                <span className="text-sm">{opt.label}</span>
                <Toggle on={opt.val} onChange={v => { opt.set(v); showToast(`${opt.label}: ${v ? "مفعّل" : "معطّل"}`, v ? "success" : "info"); }} />
              </div>
            ))}
          </div>
          <Btn v="secondary" full icon={<Printer size={13} />} onClick={() => showToast("جاري طباعة إيصال تجريبي...", "info")}>
            طباعة إيصال تجريبي
          </Btn>
        </div>
        {/* White-label branding */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <p className="font-bold flex items-center gap-2"><Zap size={13} /> هوية المتجر (White-Label)</p>
          <F label="اسم التطبيق عند التثبيت">
            <TInput value={brandAppName} onChange={setBrandAppName} placeholder={store.nameAr || "اسم متجرك"} />
          </F>
          <F label="اللون الرئيسي للعلامة التجارية">
            <div className="flex items-center gap-3">
              <input type="color" value={brandColor || "#0F172A"} onChange={e => setBrandColor(e.target.value)}
                className="w-11 h-11 rounded-xl border border-border cursor-pointer bg-transparent p-1" />
              <TInput value={brandColor} onChange={setBrandColor} placeholder="#0F172A" />
            </div>
          </F>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 leading-relaxed">
            <p className="font-bold mb-1 flex items-center gap-1"><Info size={11} /> ملاحظة حول الهوية البصرية</p>
            <p>سيتم استخدام اسم التطبيق كعنوان النافذة وعند تثبيت التطبيق. اللون الرئيسي يظهر في شريط الحالة على الجوال.</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <p className="font-bold flex items-center gap-2"><CreditCard size={13} /> تفاصيل الاشتراك</p>
          <div className="space-y-2.5">
            {[["الخطة الحالية", store.plan, true], ["الحالة", ST[store.status].label, false], ["تاريخ الانتهاء", store.expiresAt, false], ["عدد المستخدمين", `${store.users} / ${store.plan === "مبتدئ" ? "3" : store.plan === "احترافي" ? "10" : "∞"}`, false], ["عدد المنتجات", `${store.products} / ${store.plan === "مبتدئ" ? "500" : store.plan === "احترافي" ? "2,000" : "∞"}`, false]].map(([l, vv, bold]) => (
              <div key={String(l)} className="flex justify-between border-b border-border/60 pb-2 last:border-0">
                <span className="text-sm text-muted-foreground">{l}</span>
                <span className={`text-sm ${bold ? "font-black text-primary" : "font-bold"}`}>{vv}</span>
              </div>
            ))}
          </div>
          <Btn v="secondary" full icon={<TrendingUp size={13} />} onClick={() => setShowUpgrade(true)}>ترقية الاشتراك</Btn>
          <Btn v="ghost" full icon={<Download size={13} />} onClick={() => showToast("جاري تحضير تصدير بيانات المتجر...", "info")}>تصدير بيانات المتجر</Btn>
        </div>
      </div>

      {showUpgrade && (
        <Modal title="ترقية الاشتراك" sub="اختر الخطة المناسبة لمتجرك" onClose={() => setShowUpgrade(false)}>
          <div className="space-y-3">
            {PLANS.map(p => (
              <div key={p.id} className={`border-2 rounded-2xl p-4 cursor-pointer transition-all hover:border-primary ${p.nameAr === store.plan ? "border-primary bg-primary/5" : "border-border"}`}
                onClick={() => { showToast(`تم طلب الترقية إلى خطة "${p.nameAr}"، سيتواصل معك فريق الدعم`, "success"); setShowUpgrade(false); }}>
                <div className="flex items-center justify-between">
                  <div><p className="font-bold">{p.nameAr}</p><p className="text-xs text-muted-foreground">{p.features.slice(0,2).join(" • ")}</p></div>
                  <div className="text-right"><p className="text-xl font-black text-primary">{p.price} JOD</p><p className="text-xs text-muted-foreground">شهرياً</p></div>
                </div>
                {p.nameAr === store.plan && <span className="text-xs font-bold text-primary mt-1 block">✓ خطتك الحالية</span>}
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────


export { StoreLayout };
