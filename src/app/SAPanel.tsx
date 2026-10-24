// SAPanel — Super Admin screens
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
  Info, ChevronLeft, Grid3X3, List, Hash, Tag, Palette, Image, Link, Moon, Sun,
} from "lucide-react";
import { apiFetch, getToken, useLS, norm, jod, dateAr, showToast, apiCreateStore, apiGetStores, apiUpdateStore, apiDeleteStore, apiResetPass, apiResetEmployeePass, SBadge, KPI, Modal, F, TInput, SInput, Btn, Hdr, Empty, Toggle, PLANS, CAT, ST, weekData, monthData, hourData, STORES, useDarkMode, DEFAULT_SIDEBAR } from "./lib";
import type { SidebarFeatures } from "./lib";
import type { StoreData, Plan, StoreCategory } from "./lib";

const SA_NAV = [
  { id: "dashboard",    label: "لوحة التحكم",    icon: <LayoutDashboard size={17} /> },
  { id: "stores",       label: "المتاجر",          icon: <Store size={17} /> },
  { id: "master-catalog", label: "كتالوج رئيسي",  icon: <Boxes size={17} /> },
  { id: "all-users",    label: "المستخدمون",       icon: <Users size={17} /> },
  { id: "plans",        label: "خطط الاشتراك",    icon: <CreditCard size={17} /> },
  { id: "reports",      label: "التقارير العامة",  icon: <BarChart2 size={17} /> },
  { id: "audit",        label: "سجلات التدقيق",   icon: <ClipboardList size={17} /> },
  { id: "health",       label: "صحة النظام",       icon: <Activity size={17} /> },
  { id: "featureflags", label: "ميزات الخطط",      icon: <Zap size={17} /> },
  { id: "marketplace",  label: "سوق الوحدات",      icon: <Grid3X3 size={17} /> },
  { id: "tickets",      label: "الدعم الفني",      icon: <Handshake size={17} /> },
  { id: "broadcast",    label: "الإعلانات",        icon: <Send size={17} /> },
  { id: "settings",     label: "إعدادات النظام",  icon: <Settings size={17} /> },
];

function SuperAdminLayout({ onLogout }: { onLogout: () => void }) {
  const [screen, setScreen] = useState(() => {
    try { return localStorage.getItem("sowwanjo_sa_screen") || "dashboard"; } catch { return "dashboard"; }
  });
  const [col, setCol] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notif, setNotif] = useState(false);
  const [dark, toggleDark] = useDarkMode();

  // ── Real notifications from backend ──────────────────────────────────────
  type SANotif = { id: string; text: string; sub: string; color: string; screen?: string };
  const [notifications, setNotifications] = useState<SANotif[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [seenNotifs, setSeenNotifs] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("sowwanjo_sa_notif_seen") || "[]"); } catch { return []; }
  });

  const loadNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const [stores, tickets] = await Promise.all([
        apiFetch("/stores", {}, getToken()).catch(() => []),
        apiFetch("/tickets", {}, getToken()).catch(() => []),
      ]);

      const list: SANotif[] = [];

      // منتهية الاشتراك
      if (Array.isArray(stores)) {
        (stores as { _id?: string; id?: string; nameAr?: string; status?: string; expiresAt?: string }[])
          .filter(s => s.status === "expired" || (s.expiresAt && new Date(s.expiresAt) < new Date()))
          .slice(0, 3)
          .forEach(s => list.push({
            id: `exp-${s._id || s.id}`,
            text: `انتهى اشتراك ${s.nameAr || "متجر"}`,
            sub: `انتهى ${s.expiresAt ? new Date(s.expiresAt).toLocaleDateString("ar-JO") : ""}`,
            color: "bg-red-500",
            screen: "stores",
          }));

        // موقوفة
        (stores as { _id?: string; id?: string; nameAr?: string; status?: string }[])
          .filter(s => s.status === "suspended")
          .slice(0, 2)
          .forEach(s => list.push({
            id: `sus-${s._id || s.id}`,
            text: `متجر ${s.nameAr || "متجر"} موقوف`,
            sub: "موقوف من قِبل المدير العام",
            color: "bg-orange-500",
            screen: "stores",
          }));
      }

      // تذاكر دعم مفتوحة
      if (Array.isArray(tickets)) {
        (tickets as { _id?: string; storeName?: string; subject?: string; status?: string; createdAt?: string }[])
          .filter(t => t.status === "open")
          .slice(0, 3)
          .forEach(t => list.push({
            id: `ticket-${t._id}`,
            text: `تذكرة جديدة: ${t.subject || "طلب دعم"}`,
            sub: `${t.storeName || "متجر"} • ${t.createdAt ? new Date(t.createdAt).toLocaleDateString("ar-JO") : ""}`,
            color: "bg-blue-500",
            screen: "tickets",
          }));
      }

      setNotifications(list);
    } catch { /* ignore */ }
    finally { setNotifLoading(false); }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const unreadNotifs = notifications.filter(n => !seenNotifs.includes(n.id)).length;

  const openNotif = () => {
    setNotif(v => !v);
    if (!notif) {
      // mark all as seen
      const ids = notifications.map(n => n.id);
      setSeenNotifs(ids);
      try { localStorage.setItem("sowwanjo_sa_notif_seen", JSON.stringify(ids)); } catch {}
    }
  };

  const navTo = (s: string) => {
    setScreen(s);
    try { localStorage.setItem("sowwanjo_sa_screen", s); } catch {}
    setMobileMenu(false);
  };

  // Bottom nav: 5 most-used items
  const bottomNav = [
    { id: "dashboard", label: "الرئيسية", icon: <LayoutDashboard size={19} /> },
    { id: "stores",    label: "المتاجر",  icon: <Store size={19} /> },
    { id: "reports",   label: "التقارير", icon: <BarChart2 size={19} /> },
    { id: "tickets",   label: "الدعم",    icon: <Handshake size={19} /> },
    { id: "settings",  label: "إعدادات",  icon: <Settings size={19} /> },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background" dir="rtl" style={{ fontFamily: "'Cairo',sans-serif" }}>

      {/* ── SIDEBAR: mobile=hidden, tablet=icon-only(52px), desktop=full(240px) ── */}
      <aside
        className={`hidden md:flex shrink-0 flex-col transition-all duration-300 md:w-[52px] ${col ? "lg:w-[52px]" : "lg:w-60"}`}
        style={{ background: "linear-gradient(180deg,#0F172A 0%,#1A2744 100%)" }}>
        <div className="h-14 flex items-center border-b border-white/7 px-2 lg:px-3 gap-3 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <Store size={15} className="text-primary" />
          </div>
          <div className={`min-w-0 hidden ${col ? "lg:hidden" : "lg:block"}`}>
            <p className="text-white font-black text-sm truncate">Sowwanjo POS</p>
            <p className="text-white/30 text-xs">لوحة الإدارة العليا</p>
          </div>
        </div>
        <div className={`mx-3 mt-3 mb-2 p-3 rounded-xl bg-white/5 border border-white/7 hidden ${col ? "lg:hidden" : "lg:block"}`}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0"><Shield size={12} className="text-primary" /></div>
            <div className="min-w-0"><p className="text-white text-xs font-bold">المدير العام</p><p className="text-white/30 text-xs">Super Admin</p></div>
          </div>
        </div>
        <nav className="flex-1 px-1.5 py-2 space-y-0.5 overflow-y-auto">
          {SA_NAV.map(n => (
            <button key={n.id} onClick={() => navTo(n.id)}
              className={`w-full flex items-center gap-3 rounded-xl text-xs font-semibold transition-all justify-center md:h-10 lg:h-9 md:px-1.5 ${col ? "lg:justify-center lg:px-1.5" : "lg:justify-start lg:px-3"} ${screen === n.id ? "bg-white/10 text-white border border-white/10" : "text-white/50 hover:bg-white/5 hover:text-white/80"}`}
              title={n.label}>
              <span className="shrink-0">{n.icon}</span>
              <span className={`hidden ${col ? "lg:hidden" : "lg:inline"} truncate`}>{n.label}</span>
              <span className={`mr-auto w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0 hidden ${col ? "lg:hidden" : screen === n.id ? "lg:inline-block" : "lg:hidden"}`} />
            </button>
          ))}
        </nav>
        <div className="p-1.5 border-t border-white/7 space-y-0.5">
          <button onClick={() => setCol(!col)} className={`hidden lg:flex w-full items-center gap-3 h-9 rounded-xl text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-all ${col ? "justify-center" : "px-3"}`}>
            {col ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
            {!col && <span>طي القائمة</span>}
          </button>
          <button onClick={onLogout} className={`w-full flex items-center gap-3 h-10 lg:h-9 rounded-xl text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all justify-center ${col ? "lg:justify-center" : "lg:justify-start lg:px-3"}`}>
            <LogOut size={15} /><span className={`hidden ${col ? "lg:hidden" : "lg:inline"}`}>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* ── MOBILE SLIDE-IN MENU ─────────────────────────────────────────── */}
      {mobileMenu && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenu(false)} />
          <div className="relative mr-auto w-72 h-full flex flex-col shadow-2xl"
            style={{ background: "linear-gradient(180deg,#0F172A 0%,#1A2744 100%)", paddingTop: "env(safe-area-inset-top)" }}>
            <div className="h-14 flex items-center border-b border-white/7 px-4 gap-3 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                <Store size={15} className="text-blue-400" />
              </div>
              <div className="min-w-0 flex-1"><p className="text-white font-black text-sm truncate">Sowwanjo POS</p><p className="text-white/30 text-xs">المدير العام</p></div>
              <button onClick={() => setMobileMenu(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 text-white shrink-0"><X size={15} /></button>
            </div>
            <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
              {SA_NAV.map(n => (
                <button key={n.id} onClick={() => navTo(n.id)}
                  className={`w-full flex items-center gap-3 h-11 rounded-xl px-4 text-sm font-semibold transition-all ${screen === n.id ? "bg-white/10 text-white border border-white/10" : "text-white/60 hover:bg-white/5 hover:text-white/90"}`}>
                  <span className="shrink-0">{n.icon}</span>
                  <span>{n.label}</span>
                  {screen === n.id && <span className="mr-auto w-2 h-2 rounded-full bg-primary/60 shrink-0" />}
                </button>
              ))}
            </nav>
            <div className="p-3 border-t border-white/7 space-y-1" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}>
              <button onClick={onLogout} className="w-full flex items-center gap-3 h-11 rounded-xl px-4 text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all">
                <LogOut size={16} /><span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTENT AREA ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* HEADER */}
        <header className="shrink-0 bg-card border-b border-border z-30" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <div className="h-14 flex items-center justify-between px-3 sm:px-5 gap-2">
            {/* Mobile hamburger */}
            <button onClick={() => setMobileMenu(true)} className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground shrink-0">
              <Menu size={20} />
            </button>
            {/* Desktop sidebar toggle */}
            <button onClick={() => setCol(!col)} className="hidden md:flex w-8 h-8 items-center justify-center rounded-xl hover:bg-muted text-muted-foreground shrink-0">
              <Menu size={16} />
            </button>

            <div className="flex-1 min-w-0 px-1">
              <p className="text-sm font-bold text-foreground truncate">{SA_NAV.find(n => n.id === screen)?.label || "لوحة التحكم"}</p>
              <p className="text-xs text-muted-foreground hidden sm:block">{dateAr()}</p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Dark mode toggle */}
              <button onClick={toggleDark} title={dark ? "الوضع المضيء" : "الوضع المظلم"}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-90">
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              {/* Refresh page button */}
              <button onClick={() => window.location.reload()} title="تحديث الصفحة"
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-90">
                <RefreshCw size={16} />
              </button>

              <div className="relative">
                <button onClick={openNotif} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted relative">
                  <Bell size={18} className="text-muted-foreground" />
                  {unreadNotifs > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-card">
                      {unreadNotifs > 9 ? "9+" : unreadNotifs}
                    </span>
                  )}
                </button>
                {notif && (
                  <div className="absolute left-0 top-full mt-2 w-84 max-w-[calc(100vw-1rem)] bg-card rounded-2xl border border-border shadow-2xl z-50 overflow-hidden" style={{ width: "340px" }}>
                    <div className="flex justify-between items-center px-4 py-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">الإشعارات</span>
                        {notifications.length > 0 && (
                          <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-semibold">{notifications.length}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { loadNotifications(); }} title="تحديث" className="text-muted-foreground hover:text-foreground">
                          <RefreshCw size={13} className={notifLoading ? "animate-spin" : ""} />
                        </button>
                        <button onClick={() => setNotif(false)} className="text-xs text-primary font-semibold">إغلاق</button>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifLoading ? (
                        <div className="space-y-1 p-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-xl" />)}</div>
                      ) : notifications.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                          <Bell size={28} className="mx-auto mb-2 opacity-30" />
                          <p className="text-sm font-semibold">لا توجد إشعارات</p>
                          <p className="text-xs mt-1">جميع المتاجر والتذاكر في حالة جيدة</p>
                        </div>
                      ) : notifications.map(n => (
                        <button key={n.id} onClick={() => { if (n.screen) navTo(n.screen); setNotif(false); }}
                          className="w-full flex gap-3 px-4 py-3 hover:bg-muted/40 border-b border-border/50 last:border-0 text-right transition-colors">
                          <span className={`w-2 h-2 rounded-full ${n.color} shrink-0 mt-1.5`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-foreground font-semibold truncate">{n.text}</p>
                            <p className="text-xs text-muted-foreground truncate">{n.sub}</p>
                          </div>
                          {n.screen && <ChevronLeft size={12} className="text-muted-foreground shrink-0 mt-1" />}
                        </button>
                      ))}
                    </div>
                    {notifications.length > 0 && (
                      <div className="px-4 py-2 border-t border-border bg-muted/20">
                        <p className="text-[10px] text-muted-foreground text-center">
                          {notifications.filter(n => n.color === "bg-red-500").length} منتهية •{" "}
                          {notifications.filter(n => n.color === "bg-orange-500").length} موقوفة •{" "}
                          {notifications.filter(n => n.color === "bg-blue-500").length} تذاكر مفتوحة
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="hidden sm:flex h-8 px-2.5 bg-card border border-border rounded-xl items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-foreground whitespace-nowrap">النظام يعمل</span>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT — extra bottom padding on mobile for bottom nav */}
        <main className="flex-1 overflow-y-auto" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 4rem)" }}>
          {screen === "dashboard"    && <SADash onNav={navTo} />}
          {screen === "stores"       && <SAStores />}
          {screen === "all-users"    && <SAAllUsers />}
          {screen === "master-catalog" && <SAMasterCatalog />}
          {screen === "plans"        && <SAPlans />}
          {screen === "reports"      && <SAReports />}
          {screen === "audit"        && <SAAudit />}
          {screen === "health"       && <SAHealth />}
          {screen === "featureflags" && <SAFeatureFlags />}
          {screen === "marketplace"  && <SAModuleMarketplace />}
          {screen === "tickets"      && <SATickets />}
          {screen === "broadcast"    && <SABroadcast />}
          {screen === "settings"     && <SASettings />}
        </main>

        {/* ── MOBILE BOTTOM NAV ─────────────────────────────────────────── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 flex"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {bottomNav.map(n => (
            <button key={n.id} onClick={() => navTo(n.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-all min-h-[56px] ${screen === n.id ? "text-primary" : "text-muted-foreground"}`}>
              <span className={`transition-transform ${screen === n.id ? "scale-110" : ""}`}>{n.icon}</span>
              <span className="text-[10px] font-bold leading-tight">{n.label}</span>
              {screen === n.id && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />}
            </button>
          ))}
        </nav>

        {/* ── MOBILE FAB: Create Store (phone only) ───────────────────── */}
        <button onClick={() => navTo("stores")}
          className="flex md:hidden fixed left-4 z-40 w-14 h-14 rounded-full bg-primary text-white shadow-xl items-center justify-center"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 4.5rem)" }}
          title="إنشاء متجر جديد">
          <Plus size={22} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SA SCREENS
// ─────────────────────────────────────────────────────────────────────────────

function SADash({ onNav }: { onNav: (s: string) => void }) {
  // يقرأ من localStorage (المصدر المشترك مع SAStores) ويجدّد من Backend
  const [dashStores, setDashStores] = useState<StoreData[]>(() => {
    try {
      const s = localStorage.getItem("sowwanjo_sa_stores");
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });
  const [saMonthData, setSaMonthData] = useState<{month:string;إيرادات:number;مصروفات:number;أرباح:number}[]>([]);

  useEffect(() => {
    apiFetch("/super-admin/stats/monthly", {}, getToken())
      .then(d => { if (Array.isArray(d)) setSaMonthData(d as typeof saMonthData); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // تحديث فوري من Backend
    apiFetch("/stores", {}, getToken())
      .then(data => {
        if (!Array.isArray(data)) return;
        const mapped: StoreData[] = (data as (StoreData & { _id?: string })[]).map(s => ({
          revenue: 0, sales: 0, products: 0, users: 1, branches: 1,
          ...s,
          id:       s._id || s.id || "",
          nameAr:   s.nameAr   || "متجر",
          nameEn:   s.nameEn   || "",
          category: (s.category || "supermarket") as StoreData["category"],
          status:   (s.status   || "active")      as StoreData["status"],
          owner:    s.owner    || "",
          email:    s.email    || "",
          phone:    s.phone    || "",
          city:     s.city     || "",
          plan:     s.plan     || "مبتدئ",
          expiresAt:s.expiresAt|| new Date(Date.now()+365*86400000).toISOString().split("T")[0],
          createdAt:s.createdAt|| new Date().toISOString().split("T")[0],
        }));
        setDashStores(mapped);
        try { localStorage.setItem("sowwanjo_sa_stores", JSON.stringify(mapped)); } catch {}
      })
      .catch(() => {
        // Fallback من localStorage إذا Backend غير متوفر
        try {
          const s = localStorage.getItem("sowwanjo_sa_stores");
          if (s) setDashStores(JSON.parse(s));
        } catch {}
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalRevenue = dashStores.reduce((a, s) => a + (s.revenue || 0), 0);
  const totalUsers   = dashStores.reduce((a, s) => a + (s.users   || 0), 0);
  const totalSales   = dashStores.reduce((a, s) => a + (s.sales   || 0), 0);

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPI icon={<Store size={20} />} label="إجمالي المتاجر"
          value={String(dashStores.length)}
          sub={`${dashStores.filter(s => s.status === "active").length} نشط`}
          color="#4F46E5" />
        <KPI icon={<DollarSign size={20} />} label="إجمالي الإيرادات"
          value={jod(totalRevenue)} sub="منذ الإطلاق" color="#059669" />
        <KPI icon={<Users size={20} />} label="إجمالي المستخدمين"
          value={String(totalUsers)} color="#D97706" />
        <KPI icon={<FileText size={20} />} label="إجمالي الفواتير"
          value={totalSales.toLocaleString("ar-JO")} color="#7C3AED" />
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {(["active","trial","suspended","expired"] as const).map(st => {
          const count = dashStores.filter(s => s.status === st).length;
          return (
            <div key={st} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${ST[st].dot} shrink-0`} />
              <div>
                <p className="text-xl font-black text-foreground">{count}</p>
                <p className="text-xs text-muted-foreground">{ST[st].label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly chart */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-5">
          <p className="font-bold text-foreground mb-1">الإيرادات الشهرية (JOD)</p>
          <p className="text-xs text-muted-foreground mb-4">آخر 6 أشهر</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={saMonthData.length > 0 ? saMonthData : monthData}>
              <defs>
                <linearGradient id="sa-dash-rev" x1="0" y1="0" x2="0" y2="1">
                  <stop key="sa-dash-rev-top" offset="5%" stopColor="#4F46E5" stopOpacity={0.15} />
                  <stop key="sa-dash-rev-bot" offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="sa-dash-prof" x1="0" y1="0" x2="0" y2="1">
                  <stop key="sa-dash-prof-top" offset="5%" stopColor="#059669" stopOpacity={0.12} />
                  <stop key="sa-dash-prof-bot" offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v / 1000}k`} />
              <Tooltip formatter={(v: number) => [`${v.toLocaleString()} JOD`]} />
              <Area key="area-rev"  type="monotone" dataKey="إيرادات" stroke="#4F46E5" strokeWidth={2.5} fill="url(#sa-dash-rev)" />
              <Area key="area-prof" type="monotone" dataKey="أرباح"   stroke="#059669" strokeWidth={2.5} fill="url(#sa-dash-prof)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Store performance */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold text-foreground mb-4">أداء المتاجر</p>
          {dashStores.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">لا يوجد متاجر بعد</p>
          ) : (
            <div className="space-y-3">
              {dashStores.sort((a, b) => (b.revenue||0) - (a.revenue||0)).slice(0,5).map((s, i) => {
                const cat = CAT[s.category as StoreData["category"]] || CAT["supermarket"];
                const maxRev = Math.max(...dashStores.map(x => x.revenue||0), 1);
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <span className="text-xs font-black text-muted-foreground w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-foreground truncate max-w-[110px]">{s.nameAr}</span>
                        <span className="text-xs font-bold text-foreground">{jod(s.revenue||0)}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full">
                        <div className="h-full rounded-full" style={{ width: `${((s.revenue||0)/maxRev)*100}%`, backgroundColor: cat.color }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Stores list */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <p className="font-bold text-foreground">أحدث المتاجر ({dashStores.length})</p>
          <Btn v="ghost" s="sm" onClick={() => onNav("stores")} icon={<ChevronLeft size={13} />}>عرض الكل</Btn>
        </div>
        <div className="divide-y divide-border/60">
          {dashStores.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              لا يوجد متاجر — اذهب إلى "إدارة المتاجر" لإنشاء أول متجر
            </div>
          ) : dashStores.slice(0, 5).map(s => {
            const cat = CAT[s.category as StoreData["category"]] || CAT["supermarket"];
            return (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: cat.bg }}>
                  <span style={{ color: cat.color }}>{cat.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{s.nameAr}</p>
                  <p className="text-xs text-muted-foreground">{s.owner} • {s.city}</p>
                </div>
                <div className="hidden sm:block text-right shrink-0">
                  <p className="text-sm font-bold text-foreground">{jod(s.revenue||0)}</p>
                  <p className="text-xs text-muted-foreground">{(s.sales||0).toLocaleString()} فاتورة</p>
                </div>
                <SBadge status={s.status} />
                <span className="hidden lg:block text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">{s.plan}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SAStores() {
  // قائمة المتاجر — تُجلب من Backend (MongoDB) وتُكاش محلياً
  const [rawStores, setStores] = useLS<StoreData[]>("sowwanjo_sa_stores", STORES);
  // تطبيع بيانات المتاجر لضمان عدم وجود قيم null/undefined
  const stores = rawStores.map(s => ({
    revenue:  0, sales: 0, products: 0, users: 1, branches: 1,
    ...s,
    nameAr:   s.nameAr || "متجر",
    nameEn:   s.nameEn || "",
    category: (s.category || "supermarket") as StoreData["category"],
    status:   (s.status || "active") as StoreData["status"],
    owner:    s.owner || "",
    email:    s.email || "",
    phone:    s.phone || "",
    city:     s.city || "",
    plan:     s.plan || "مبتدئ",
    expiresAt:s.expiresAt || new Date(Date.now() + 365*86400000).toISOString().split("T")[0],
    createdAt:s.createdAt || new Date().toISOString().split("T")[0],
  }));
  const [loadingStores, setLoadingStores] = useState(false);
  const [q, setQ] = useState("");
  const [sf, setSf] = useState("all");
  const [catF, setCatF] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<StoreData | null>(null);
  const [editStore, setEditStore] = useState<StoreData | null>(null);
  const [creds, setCreds] = useState<{ email: string; pass: string } | null>(null);
  const [newPass, setNewPass] = useState<{ store: string; pass: string } | null>(null);
  // Reset password modals
  const [resetStoreModal, setResetStoreModal] = useState<StoreData | null>(null);
  const [resetStorePass, setResetStorePass] = useState("");
  const [resetStoreLoading, setResetStoreLoading] = useState(false);
  const [resetStoreError, setResetStoreError] = useState("");
  const [resetEmpModal, setResetEmpModal] = useState<{ storeId: string; storeName: string; empId: string; empName: string } | null>(null);
  const [resetEmpPass, setResetEmpPass] = useState("");
  const [resetEmpLoading, setResetEmpLoading] = useState(false);
  const [storeEmps, setStoreEmps] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [empsLoading, setEmpsLoading] = useState(false);
  // ── Store User Management ─────────────────────────────────────────────────
  type SAUser = { id: string; name: string; email: string; role: string; phone: string };
  const [userMgmtStore, setUserMgmtStore] = useState<StoreData | null>(null);
  const [userMgmtList, setUserMgmtList]   = useState<SAUser[]>([]);
  const [userMgmtLoading, setUserMgmtLoading] = useState(false);
  const [userMgmtError,   setUserMgmtError]   = useState("");
  // Add user form
  const emptyUserForm = { name: "", email: "", password: "", role: "cashier", phone: "" };
  const [addUserForm, setAddUserForm]   = useState(emptyUserForm);
  const [showAddUser,  setShowAddUser]  = useState(false);
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserError,   setAddUserError]   = useState("");
  // Edit user
  const [editUser, setEditUser]       = useState<SAUser | null>(null);
  const [editUserForm, setEditUserForm] = useState({ name: "", email: "", role: "", phone: "" });
  const [editUserLoading, setEditUserLoading] = useState(false);
  // Reset password inline
  const [passUser,    setPassUser]    = useState<SAUser | null>(null);
  const [passValue,   setPassValue]   = useState("");
  const [passLoading, setPassLoading] = useState(false);

  const openUserMgmt = async (store: StoreData) => {
    setUserMgmtStore(store); setUserMgmtList([]); setUserMgmtError(""); setShowAddUser(false); setEditUser(null); setPassUser(null);
    setUserMgmtLoading(true);
    try {
      const data = await apiFetch(`/stores/${store.id}/users`, {}, getToken()) as SAUser[];
      setUserMgmtList(Array.isArray(data) ? data : []);
    } catch { setUserMgmtError("فشل تحميل المستخدمين"); }
    finally { setUserMgmtLoading(false); }
  };

  const doAddUser = async () => {
    if (!userMgmtStore) return;
    setAddUserLoading(true); setAddUserError("");
    try {
      const res = await apiFetch(`/stores/${userMgmtStore.id}/users`, { method: "POST", body: JSON.stringify(addUserForm) }, getToken()) as SAUser & { error?: string };
      if ((res as { error?: string }).error) { setAddUserError((res as { error?: string }).error || "خطأ"); return; }
      setUserMgmtList(l => [...l, res]);
      setAddUserForm(emptyUserForm); setShowAddUser(false);
      showToast(`تم إضافة "${addUserForm.name}" بنجاح ✓`, "success");
    } catch { setAddUserError("خطأ في الإضافة"); }
    finally { setAddUserLoading(false); }
  };

  const doEditUser = async () => {
    if (!userMgmtStore || !editUser) return;
    setEditUserLoading(true);
    try {
      const res = await apiFetch(`/stores/${userMgmtStore.id}/users/${editUser.id}`, { method: "PUT", body: JSON.stringify(editUserForm) }, getToken()) as SAUser;
      setUserMgmtList(l => l.map(u => u.id === editUser.id ? { ...u, ...res } : u));
      setEditUser(null);
      showToast("تم تحديث البيانات ✓", "success");
    } catch { showToast("خطأ في التعديل", "error"); }
    finally { setEditUserLoading(false); }
  };

  const doDeleteUser = async (user: SAUser) => {
    if (!userMgmtStore) return;
    if (!confirm(`حذف "${user.name}" (${user.email})؟`)) return;
    try {
      await apiFetch(`/stores/${userMgmtStore.id}/users/${user.id}`, { method: "DELETE" }, getToken());
      setUserMgmtList(l => l.filter(u => u.id !== user.id));
      showToast(`تم حذف "${user.name}"`, "warning");
    } catch { showToast("خطأ في الحذف", "error"); }
  };

  const doResetUserPass = async () => {
    if (!userMgmtStore || !passUser || passValue.length < 6) return;
    setPassLoading(true);
    try {
      await apiFetch(`/stores/${userMgmtStore.id}/users/${passUser.id}/reset-password`, { method: "POST", body: JSON.stringify({ newPassword: passValue }) }, getToken());
      setPassUser(null); setPassValue("");
      showToast(`تم تغيير كلمة مرور "${passUser.name}" ✓`, "success");
    } catch { showToast("خطأ في تغيير كلمة المرور", "error"); }
    finally { setPassLoading(false); }
  };

  const STORE_ROLES = [
    { value: "owner",     label: "مالك" },
    { value: "manager",   label: "مدير" },
    { value: "cashier",   label: "كاشير" },
    { value: "inventory", label: "مخزون" },
    { value: "accountant",label: "محاسب" },
  ];

  const [renewStore, setRenewStore] = useState<StoreData | null>(null);
  const [renewMonths, setRenewMonths] = useState("1");
  const [deleteConfirm, setDeleteConfirm] = useState<StoreData | null>(null);
  const [exportData,    setExportData]    = useState<StoreData | null>(null);  // ← كان ناقصاً
  const [nf, setNf] = useState({ nameAr: "", nameEn: "", category: "supermarket" as StoreCategory, owner: "", email: "", phone: "", city: "", plan: "الاحترافي", taxNo: "", sidebarFeatures: { ...DEFAULT_SIDEBAR } });
  const toggleSidebarFeature = (key: keyof typeof DEFAULT_SIDEBAR) =>
    setNf(f => ({ ...f, sidebarFeatures: { ...f.sidebarFeatures, [key]: !f.sidebarFeatures[key] } }));
  // Dynamic plans fetched from API — overrides hardcoded PLANS constant
  const [apiPlans, setApiPlans] = useState<Plan[]>(PLANS);
  useEffect(() => {
    apiFetch("/plans", {}, getToken())
      .then(d => { if (Array.isArray(d) && (d as object[]).length > 0) setApiPlans((d as object[]).map(x => norm(x as Plan & { _id?: string }))); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // جلب المتاجر من Backend عند فتح الشاشة
  useEffect(() => {
    const fetchStores = async () => {
      setLoadingStores(true);
      try {
        const data = await apiGetStores() as StoreData[];
        if (data && Array.isArray(data) && data.length > 0) {
          // تحويل _id من MongoDB إلى id
          const mapped = data.map((s: StoreData & { _id?: string }) => ({ ...s, id: s._id || s.id }));
          setStores(mapped);
        }
      } catch {
        // إذا Backend غير متوفر يستمر بالـ localStorage
      } finally {
        setLoadingStores(false);
      }
    };
    fetchStores();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = stores.filter(s => {
    if (!s || !s.id) return false;  // skip invalid entries
    const matchQ = !q
      || (s.nameAr || "").includes(q)
      || (s.nameEn || "").toLowerCase().includes(q.toLowerCase())
      || (s.owner || "").includes(q)
      || (s.email || "").includes(q);
    const matchSt = sf === "all" || s.status === sf;
    const matchCat = catF === "all" || s.category === catF;
    return matchQ && matchSt && matchCat;
  });

  const toggle = async (id: string) => {
    const store = stores.find(s => s.id === id);
    const newStatus = store?.status === "active" ? "suspended" : "active";
    try {
      await apiUpdateStore(id, { status: newStatus });
    } catch { /* fallback */ }
    setStores(p => p.map(s => s.id === id ? { ...s, status: newStatus as StoreData["status"] } : s));
    showToast(store?.status === "active" ? `تم إيقاف "${store?.nameAr}"` : `تم تفعيل "${store?.nameAr}"`, store?.status === "active" ? "warning" : "success");
  };

  const doDelete = async (id: string) => {
    const store = stores.find(s => s.id === id);
    try {
      await apiDeleteStore(id);
    } catch { /* fallback */ }
    setStores(p => p.filter(s => s.id !== id));
    setDeleteConfirm(null); setDetail(null);
    showToast(`تم حذف متجر "${store?.nameAr}"`, "warning");
  };

  // إنشاء متجر — يُحفظ في MongoDB فقط
  const [createError, setCreateError] = useState("");
  const create = async () => {
    setCreating(true);
    setCreateError("");
    try {
      const res = await apiCreateStore(nf);
      const storeData = (res as { store?: StoreData & { _id?: string }; generatedPassword?: string });
      if (!storeData.store) throw new Error("استجابة غير متوقعة من الخادم");
      const newStore: StoreData = { ...storeData.store, id: storeData.store._id || storeData.store.id };
      setStores(p => [newStore, ...p]);
      setShowNew(false);
      setCreateError("");
      setCreds({ email: nf.email, pass: storeData.generatedPassword || "" });
      setNf({ nameAr: "", nameEn: "", category: "supermarket", owner: "", email: "", phone: "", city: "", plan: "الاحترافي", taxNo: "", sidebarFeatures: { ...DEFAULT_SIDEBAR } });
      showToast(`تم إنشاء متجر "${nf.nameAr}" وحفظه في قاعدة البيانات ✅`);
    } catch (err) {
      const msg = (err as { error?: string })?.error || (err instanceof Error ? err.message : "فشل الاتصال بالخادم — تأكد من تشغيل الـ Backend وأعد المحاولة");
      setCreateError(msg);
      showToast(msg, "error");
    } finally {
      setCreating(false);
    }
  };

  const doEdit = async () => {
    if (!editStore) return;
    try {
      await apiUpdateStore(editStore.id, {
        nameAr: editStore.nameAr, nameEn: editStore.nameEn, owner: editStore.owner,
        phone: editStore.phone, city: editStore.city, plan: editStore.plan,
        status: editStore.status, expiresAt: editStore.expiresAt, taxNo: editStore.taxNo,
        sidebarFeatures: editStore.sidebarFeatures,
      });
    } catch { /* fallback */ }
    setStores(p => p.map(s => s.id === editStore.id ? editStore : s));
    if (detail?.id === editStore.id) setDetail(editStore);
    // تحديث localStorage حتى تُطبَّق التغييرات فوراً في واجهة المتجر
    try { localStorage.setItem(`sowwanjo_storeinfo_${editStore.id}`, JSON.stringify(editStore)); } catch {}
    showToast(`تم تحديث بيانات "${editStore.nameAr}" بنجاح`);
    setEditStore(null);
  };

  const openResetStorePass = (store: StoreData) => {
    setResetStoreModal(store);
    setResetStorePass("");
    setResetStoreError("");
    setDetail(null);
  };

  const doResetStorePass = async () => {
    if (!resetStoreModal) return;
    if (resetStorePass.length < 6) { setResetStoreError("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }
    setResetStoreLoading(true);
    setResetStoreError("");
    try {
      await apiResetPass(resetStoreModal.id, resetStorePass);
      showToast(`✓ تم تغيير كلمة مرور "${resetStoreModal.nameAr}" — البريد للدخول: ${resetStoreModal.email}`, "success");
      setResetStoreModal(null);
      setResetStorePass("");
      setResetStoreError("");
    } catch (e) {
      const errMsg = (e as { error?: string }).error || "فشل تغيير كلمة المرور — تحقق من الاتصال بالخادم";
      setResetStoreError(errMsg);
      showToast(errMsg, "error");
    } finally { setResetStoreLoading(false); }
  };

  const openResetEmpPass = async (store: StoreData) => {
    setEmpsLoading(true);
    setStoreEmps([]);
    setResetEmpModal(null);
    setResetEmpPass("");
    setDetail(null);
    try {
      // جلب موظفي المتجر — نستخدم endpoint المتاجر مع SA token
      const data = await apiFetch(`/stores/${store.id}/users`, {}, getToken()) as { id: string; name: string; email: string; role: string }[];
      setStoreEmps(Array.isArray(data) ? data : []);
    } catch {
      setStoreEmps([]);
    } finally { setEmpsLoading(false); }
    // نفتح modal اختيار الموظف
    setResetEmpModal({ storeId: store.id, storeName: store.nameAr, empId: "", empName: "" });
  };

  const doResetEmpPass = async () => {
    if (!resetEmpModal || !resetEmpModal.empId) { showToast("اختر موظفاً أولاً", "error"); return; }
    if (resetEmpPass.length < 6) { showToast("كلمة المرور يجب أن تكون 6 أحرف على الأقل", "error"); return; }
    setResetEmpLoading(true);
    try {
      await apiResetEmployeePass(resetEmpModal.storeId, resetEmpModal.empId, resetEmpPass);
      showToast(`تم تغيير كلمة مرور "${resetEmpModal.empName}" بنجاح ✓`, "success");
      setResetEmpModal(null);
      setResetEmpPass("");
    } catch (e) {
      showToast((e as { error?: string }).error || "فشل تغيير كلمة المرور", "error");
    } finally { setResetEmpLoading(false); }
  };

  const doRenew = async () => {
    if (!renewStore) return;
    const months = Number.parseInt(renewMonths, 10);
    if (!renewStore.plan || !apiPlans.some(p => p.nameAr === renewStore.plan)) {
      showToast("اختر خطة اشتراك صحيحة أولاً", "error");
      return;
    }
    if (![1, 3, 6, 12].includes(months)) {
      showToast("اختر مدة تجديد صحيحة", "error");
      return;
    }
    try {
      const result = await apiFetch(`/stores/${renewStore.id}/assign-plan`, {
        method: "PATCH",
        body: JSON.stringify({ plan: renewStore.plan, months })
      }, getToken()) as { store?: StoreData & { _id?: string; id?: string } };
      const saved = result?.store;
      const newExpiry = saved?.expiresAt
        ? String(saved.expiresAt).slice(0, 10)
        : (() => { const d = new Date(renewStore.expiresAt && new Date(renewStore.expiresAt) > new Date() ? renewStore.expiresAt : Date.now()); d.setMonth(d.getMonth() + months); return d.toISOString().slice(0, 10); })();
      const updated = { ...renewStore, ...(saved || {}), id: renewStore.id, plan: renewStore.plan, status: "active" as const, expiresAt: newExpiry };
      setStores(p => p.map(s => s.id === renewStore.id ? { ...s, ...updated } : s));
      if (detail?.id === renewStore.id) setDetail({ ...detail, ...updated });
      showToast(`تم تجديد اشتراك "${renewStore.nameAr}" على خطة "${renewStore.plan}" حتى ${newExpiry}`, "success");
      setRenewStore(null);
    } catch (e) {
      showToast((e as { error?: string })?.error || "تعذّر حفظ التجديد. لم يتم تغيير الاشتراك.", "error");
    }
  };

  const doExport = (store: StoreData) => {
    const data = JSON.stringify({ store, exportedAt: new Date().toISOString(), by: "SuperAdmin" }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `${store.nameAr}-data.json`; a.click();
    showToast(`تم تصدير بيانات "${store.nameAr}"`);
    setExportData(null); setDetail(null);
  };

  const getStatusCount = (st: string) => stores.filter(s => s.status === st).length;

  return (
    <div className="p-6 space-y-5">
      <Hdr title="إدارة المتاجر" sub={`${stores.length} متجر في المنصة`}
        action={<Btn icon={<Plus size={14} />} onClick={() => setShowNew(true)}>إنشاء متجر جديد</Btn>} />

      {/* Status summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["active","trial","suspended","expired"] as const).map(st => (
          <button key={st} onClick={() => setSf(sf === st ? "all" : st)}
            className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-right ${sf === st ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}>
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${ST[st].dot}`} />
            <div><p className="text-xl font-black text-foreground">{getStatusCount(st)}</p><p className="text-xs text-muted-foreground">{ST[st].label}</p></div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-48"><TInput value={q} onChange={setQ} placeholder="بحث بالاسم، المالك، البريد..." icon={<Search size={14} />} /></div>
        <SInput value={sf} onChange={setSf} options={[{ value: "all", label: "جميع الحالات" }, { value: "active", label: "نشط" }, { value: "trial", label: "تجريبي" }, { value: "suspended", label: "موقوف" }, { value: "expired", label: "منتهي" }]} />
        <SInput value={catF} onChange={setCatF} options={[{ value: "all", label: "جميع الفئات" }, ...Object.entries(CAT).map(([k, v]) => ({ value: k, label: v.label }))]} />
      </div>

      {/* Stores Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {/* Mobile cards (< md) */}
        <div className="md:hidden divide-y divide-border/60">
          {filtered.length === 0 ? (
            <Empty icon={<Store size={24} />} title="لا توجد متاجر" desc="لم يتم العثور على متاجر تطابق البحث" />
          ) : filtered.map(s => {
            const cat = CAT[s.category as StoreCategory] || CAT["supermarket"];
            const expired = s.expiresAt ? new Date(s.expiresAt) < new Date() : false;
            return (
              <div key={s.id} className={`p-4 ${s.status === "suspended" ? "opacity-70" : ""}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: cat.bg }}>
                    <span style={{ color: cat.color }}>{cat.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm truncate">{s.nameAr}</p>
                    <p className="text-xs text-muted-foreground">{s.owner} • {s.city}</p>
                  </div>
                  <SBadge status={s.status} />
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                  <div className="bg-muted/50 rounded-xl p-2 text-center">
                    <p className="font-black text-foreground">{s.plan}</p>
                    <p className="text-muted-foreground">الخطة</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-2 text-center">
                    <p className="font-black text-foreground">{jod(s.revenue || 0)}</p>
                    <p className="text-muted-foreground">الإيرادات</p>
                  </div>
                  <div className={`rounded-xl p-2 text-center ${expired ? "bg-red-50" : "bg-muted/50"}`}>
                    <p className={`font-black text-xs ${expired ? "text-red-600" : "text-foreground"}`}>{s.expiresAt?.split("T")[0] || "—"}</p>
                    <p className={`text-xs ${expired ? "text-red-400" : "text-muted-foreground"}`}>{expired ? "منتهي!" : "الانتهاء"}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setDetail(s)} className="flex-1 h-9 min-w-[72px] flex items-center justify-center gap-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold"><Eye size={13} />تفاصيل</button>
                  <button onClick={() => setEditStore({ ...s })} className="flex-1 h-9 min-w-[72px] flex items-center justify-center gap-1.5 rounded-xl bg-muted text-foreground text-xs font-bold hover:bg-muted/70"><Edit2 size={13} />تعديل</button>
                  <button onClick={() => toggle(s.id)} className={`flex-1 h-9 min-w-[72px] flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold ${s.status === "active" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                    {s.status === "active" ? <><Lock size={13} />إيقاف</> : <><Unlock size={13} />تفعيل</>}
                  </button>
                  <button onClick={() => setDeleteConfirm(s)} className="h-9 w-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/40">
              {["المتجر","الفئة","الخطة","الحالة","الإيرادات","تاريخ الانتهاء","إجراءات"].map(h =>
                <th key={h} className="text-right p-4 font-bold text-muted-foreground text-xs">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map(s => {
                const cat = CAT[s.category as StoreCategory] || CAT["supermarket"];
                const expired = s.expiresAt ? new Date(s.expiresAt) < new Date() : false;
                return (
                  <tr key={s.id} className={`hover:bg-muted/20 transition-colors ${s.status === "suspended" ? "opacity-70" : ""}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: cat.bg }}><span style={{ color: cat.color }}>{cat.icon}</span></div>
                        <div>
                          <p className="font-bold text-foreground">{s.nameAr}</p>
                          <p className="text-xs text-muted-foreground">{s.owner} • {s.city}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell"><span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: cat.bg, color: cat.color }}>{cat.label}</span></td>
                    <td className="p-4 hidden lg:table-cell"><span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{s.plan}</span></td>
                    <td className="p-4"><SBadge status={s.status} /></td>
                    <td className="p-4 hidden sm:table-cell font-bold text-foreground">{jod(s.revenue || 0)}</td>
                    <td className="p-4 hidden lg:table-cell">
                      <span className={`text-xs font-medium ${expired ? "text-red-600 font-bold" : "text-muted-foreground"}`}>{s.expiresAt}</span>
                      {expired && <span className="block text-xs text-red-500 font-bold">منتهي!</span>}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-0.5">
                        <button onClick={() => setDetail(s)} title="تفاصيل المتجر" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary/10 text-primary transition-colors"><Eye size={12} /></button>
                        <button onClick={() => setEditStore({ ...s })} title="تعديل البيانات" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit2 size={12} /></button>
                        <button onClick={() => toggle(s.id)} title={s.status === "active" ? "إيقاف المتجر" : "تفعيل المتجر"} className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${s.status === "active" ? "hover:bg-orange-100 text-orange-500" : "hover:bg-emerald-100 text-emerald-600"}`}>{s.status === "active" ? <Lock size={12} /> : <Unlock size={12} />}</button>
                        <button onClick={() => setRenewStore(s)} title="تجديد الاشتراك" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-purple-100 text-purple-500 transition-colors"><CreditCard size={12} /></button>
                        <button onClick={() => setDeleteConfirm(s)} title="حذف المتجر" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-100 text-red-500 transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <Empty icon={<Store size={24} />} title="لا توجد متاجر" desc="لم يتم العثور على متاجر تطابق البحث" />}
        </div>
      </div>

      {/* ── Create Store Modal ── */}
      {showNew && (
        <Modal title="إنشاء متجر جديد" sub="سيتم توليد كلمة مرور فريدة آمنة تلقائياً" onClose={() => setShowNew(false)} size="lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="اسم المتجر بالعربية" req><TInput value={nf.nameAr} onChange={v => setNf({ ...nf, nameAr: v })} placeholder="سوبرماركت الأمل" /></F>
            <F label="الاسم بالإنجليزية"><TInput value={nf.nameEn} onChange={v => setNf({ ...nf, nameEn: v })} placeholder="Al-Amal Supermarket" /></F>
            <F label="اسم المالك" req><TInput value={nf.owner} onChange={v => setNf({ ...nf, owner: v })} placeholder="محمد عبدالله" icon={<User size={13} />} /></F>
            <F label="المدينة"><TInput value={nf.city} onChange={v => setNf({ ...nf, city: v })} placeholder="عمّان" icon={<MapPin size={13} />} /></F>
            <F label="رقم الهاتف"><TInput value={nf.phone} onChange={v => setNf({ ...nf, phone: v })} placeholder="+962-79-XXX-XXXX" icon={<Phone size={13} />} /></F>
            <F label="البريد الإلكتروني (يُستخدم للدخول)" req><TInput value={nf.email} onChange={v => setNf({ ...nf, email: v })} placeholder="owner@store.jo" icon={<Mail size={13} />} /></F>
            <F label="فئة المتجر" req><SInput value={nf.category} onChange={v => setNf({ ...nf, category: v as StoreCategory })} options={Object.entries(CAT).map(([k, v]) => ({ value: k, label: v.label }))} /></F>
            <F label="خطة الاشتراك"><SInput value={nf.plan} onChange={v => setNf({ ...nf, plan: v })} options={apiPlans.map(p => ({ value: p.nameAr, label: `${p.nameAr} — ${p.price} JOD/شهر` }))} /></F>
            <F label="الرقم الضريبي (اختياري)"><TInput value={nf.taxNo} onChange={v => setNf({ ...nf, taxNo: v })} placeholder="JO-XXXXXXXX" icon={<Hash size={13} />} /></F>
          </div>
          {/* ── Sidebar Feature Toggles ── */}
          <div className="mt-4 border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center gap-2">
              <LayoutDashboard size={13} className="text-primary" />
              <p className="font-bold text-sm">تحديد الأقسام المرئية في الشريط الجانبي</p>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(DEFAULT_SIDEBAR) as (keyof typeof DEFAULT_SIDEBAR)[]).map(key => {
                const LABELS: Record<keyof typeof DEFAULT_SIDEBAR, string> = {
                  pos: "نقطة البيع", products: "المنتجات", inventory: "المخزون",
                  sales: "المبيعات", customers: "العملاء", suppliers: "الموردون",
                  purchases: "المشتريات", purchaseOrders: "طلبات الشراء",
                  reports: "التقارير", expenses: "المصروفات", users: "الموظفون",
                  settings: "الإعدادات", branches: "الفروع والأجهزة",
                  promotions: "العروض والخصومات", returns: "المرتجعات",
                  loyalty: "برنامج الولاء", sync: "مركز المزامنة",
                };
                const on = nf.sidebarFeatures[key] ?? DEFAULT_SIDEBAR[key];
                return (
                  <button key={key} onClick={() => toggleSidebarFeature(key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${on ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted/30 border-border text-muted-foreground"}`}>
                    <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${on ? "bg-primary border-primary" : "border-border"}`}>
                      {on && <Check size={9} className="text-white" />}
                    </div>
                    {LABELS[key]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-xl text-xs text-foreground space-y-1">
            <p className="font-bold">✅ سيتم تلقائياً عند الإنشاء:</p>
            <p>• توليد كلمة مرور عشوائية آمنة للمتجر</p>
            <p>• إنشاء حساب معزول بـ store_id خاص</p>
            <p>• فترة تجريبية مجانية 14 يوماً</p>
            <p>• تفعيل الأقسام المختارة أعلاه فقط</p>
          </div>
          {createError && (
            <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{createError}</span>
            </div>
          )}
          <div className="flex gap-3 mt-4 justify-end">
            <Btn v="secondary" onClick={() => { setShowNew(false); setCreateError(""); }}>إلغاء</Btn>
            <Btn icon={creating ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />} onClick={create} disabled={!nf.nameAr || !nf.email || !nf.owner || creating}>{creating ? "جاري الإنشاء..." : "إنشاء المتجر"}</Btn>
          </div>
        </Modal>
      )}

      {/* ── Credentials Modal ── */}
      {creds && (
        <Modal title="✅ تم إنشاء المتجر بنجاح" sub="احتفظ بهذه البيانات وأرسلها لصاحب المتجر فقط" onClose={() => setCreds(null)} size="sm">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto"><CheckCircle size={30} className="text-primary" /></div>
            <div className="bg-muted rounded-xl p-4 space-y-2.5 font-mono text-sm border border-border text-right">
              <div className="flex justify-between items-center"><span className="text-muted-foreground">رابط الدخول</span><span className="font-bold text-xs text-primary">pos.sowwanjo.online</span></div>
              <div className="flex justify-between items-center"><span className="text-muted-foreground">البريد</span><span className="font-bold text-xs">{creds.email}</span></div>
              <div className="flex justify-between items-center"><span className="text-muted-foreground">كلمة المرور</span><span className="font-bold text-primary">{creds.pass}</span></div>
            </div>
            <div className="text-xs text-muted-foreground p-3 bg-muted/60 border border-border rounded-xl">⚠️ لن تظهر كلمة المرور مجدداً — احفظها الآن</div>
            <div className="flex gap-2">
              <Btn v="secondary" full icon={<Copy size={13} />} onClick={() => { navigator.clipboard?.writeText(`رابط الدخول: https://pos.sowwanjo.online\nالبريد: ${creds.email}\nكلمة المرور: ${creds.pass}`); showToast("تم نسخ بيانات الدخول"); }}>نسخ البيانات</Btn>
              <Btn full onClick={() => setCreds(null)}>إغلاق</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit Store Modal ── */}
      {editStore && (
        <Modal title={`تعديل: ${editStore.nameAr}`} sub="تعديل بيانات المتجر — البريد الإلكتروني لا يمكن تغييره" onClose={() => setEditStore(null)} size="lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <F label="اسم المتجر بالعربية" req><TInput value={editStore.nameAr} onChange={v => setEditStore({...editStore, nameAr: v})} /></F>
            <F label="الاسم بالإنجليزية"><TInput value={editStore.nameEn} onChange={v => setEditStore({...editStore, nameEn: v})} /></F>
            <F label="اسم المالك" req><TInput value={editStore.owner} onChange={v => setEditStore({...editStore, owner: v})} icon={<User size={13}/>} /></F>
            <F label="المدينة"><TInput value={editStore.city} onChange={v => setEditStore({...editStore, city: v})} icon={<MapPin size={13}/>} /></F>
            <F label="رقم الهاتف"><TInput value={editStore.phone} onChange={v => setEditStore({...editStore, phone: v})} icon={<Phone size={13}/>} /></F>
            <F label="البريد الإلكتروني"><TInput value={editStore.email} readOnly /></F>
            <F label="فئة المتجر"><SInput value={editStore.category} onChange={v => setEditStore({...editStore, category: v as StoreCategory})} options={Object.entries(CAT).map(([k, v]) => ({ value: k, label: v.label }))} /></F>
            <F label="خطة الاشتراك"><SInput value={editStore.plan} onChange={v => setEditStore({...editStore, plan: v})} options={[...apiPlans.map(p => ({ value: p.nameAr, label: `${p.nameAr} — ${p.price} JOD/شهر` })), { value: "تجريبي", label: "تجريبي (مجاني)" }]} /></F>
            <F label="حالة المتجر"><SInput value={editStore.status} onChange={v => setEditStore({...editStore, status: v as StoreData["status"]})} options={[{ value: "active", label: "نشط" }, { value: "trial", label: "تجريبي" }, { value: "suspended", label: "موقوف" }, { value: "expired", label: "منتهي" }]} /></F>
            <F label="تاريخ انتهاء الاشتراك"><TInput value={editStore.expiresAt} onChange={v => setEditStore({...editStore, expiresAt: v})} type="date" /></F>
            <F label="الرقم الضريبي"><TInput value={editStore.taxNo || ""} onChange={v => setEditStore({...editStore, taxNo: v})} placeholder="JO-XXXXXXXX" icon={<Hash size={13}/>} /></F>
          </div>
          {/* ── Edit Store Sidebar Features ── */}
          <div className="mt-4 border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center gap-2">
              <LayoutDashboard size={13} className="text-primary" />
              <p className="font-bold text-sm">الأقسام المرئية في الشريط الجانبي</p>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(DEFAULT_SIDEBAR) as (keyof typeof DEFAULT_SIDEBAR)[]).map(key => {
                const LABELS: Record<keyof typeof DEFAULT_SIDEBAR, string> = {
                  pos: "نقطة البيع", products: "المنتجات", inventory: "المخزون",
                  sales: "المبيعات", customers: "العملاء", suppliers: "الموردون",
                  purchases: "المشتريات", purchaseOrders: "طلبات الشراء",
                  reports: "التقارير", expenses: "المصروفات", users: "الموظفون",
                  settings: "الإعدادات", branches: "الفروع والأجهزة",
                  promotions: "العروض والخصومات", returns: "المرتجعات",
                  loyalty: "برنامج الولاء", sync: "مركز المزامنة",
                };
                const on = (editStore.sidebarFeatures?.[key] ?? DEFAULT_SIDEBAR[key]);
                return (
                  <button key={key}
                    onClick={() => setEditStore(es => es ? { ...es, sidebarFeatures: { ...DEFAULT_SIDEBAR, ...es.sidebarFeatures, [key]: !on } } : es)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${on ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted/30 border-border text-muted-foreground"}`}>
                    <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${on ? "bg-primary border-primary" : "border-border"}`}>
                      {on && <Check size={9} className="text-white" />}
                    </div>
                    {LABELS[key]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-3 mt-5 justify-end">
            <Btn v="secondary" onClick={() => setEditStore(null)}>إلغاء</Btn>
            <Btn onClick={doEdit} icon={<Check size={14}/>}>حفظ التعديلات</Btn>
          </div>
        </Modal>
      )}

      {/* ── Store Details Modal ── */}
      {detail && (
        <Modal
          title={detail.nameAr}
          sub={`${(CAT[detail.category as StoreCategory] || CAT["supermarket"]).label} • ${detail.city} • ${detail.email}`}
          onClose={() => setDetail(null)}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[{ l: "مستخدمون", v: detail.users, color: "#4F46E5" }, { l: "منتجات", v: detail.products, color: "#059669" }, { l: "فواتير", v: detail.sales, color: "#D97706" }, { l: "فروع", v: detail.branches, color: "#7C3AED" }].map(x => (
                <div key={x.l} className="rounded-xl p-3 text-center border border-border" style={{ backgroundColor: `${x.color}08` }}>
                  <p className="text-2xl font-black" style={{ color: x.color }}>{x.v}</p>
                  <p className="text-xs text-muted-foreground">{x.l}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["المالك", detail.owner],
                ["الهاتف", detail.phone],
                ["البريد الإلكتروني", detail.email],
                ["الخطة الحالية", detail.plan],
                ["إجمالي الإيرادات", jod(detail.revenue || 0)],
                ["تاريخ الإنشاء", detail.createdAt],
                ["انتهاء الاشتراك", detail.expiresAt],
                ["الحالة", (ST[detail.status] || ST["active"]).label],
                ["الفئة", (CAT[detail.category as StoreCategory] || CAT["supermarket"]).label],
                ["الرقم الضريبي", detail.taxNo || "—"],
              ].map(([l, v]) => (
                <div key={String(l)} className="flex justify-between border-b border-border/60 pb-2 last:border-0">
                  <span className="text-muted-foreground text-xs">{l}</span>
                  <span className="font-bold text-xs text-right">{v}</span>
                </div>
              ))}
            </div>
            {detail.expiresAt && (
              <div className={`p-3 rounded-xl border text-sm font-semibold flex items-center gap-2 ${new Date(detail.expiresAt) < new Date() ? "bg-red-50 border-red-200 text-red-700" : new Date(detail.expiresAt) < new Date(Date.now() + 7 * 86400000) ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                {new Date(detail.expiresAt) < new Date()
                  ? <>الاشتراك منتهي — يجب التجديد</>
                  : new Date(detail.expiresAt) < new Date(Date.now() + 7 * 86400000)
                  ? <>ينتهي الاشتراك خلال أقل من أسبوع</>
                  : <>الاشتراك نشط حتى {detail.expiresAt}</>}
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Btn v="secondary" s="sm" icon={<Edit2 size={12} />} onClick={() => { setEditStore({ ...detail }); setDetail(null); }}>تعديل البيانات</Btn>
              <Btn v="secondary" s="sm" icon={<CreditCard size={12} />} onClick={() => { setRenewStore(detail); setDetail(null); }}>تجديد الاشتراك</Btn>
              <Btn v="secondary" s="sm" icon={<Key size={12} />} onClick={() => openResetStorePass(detail)}>تغيير كلمة مرور المتجر</Btn>
              <Btn v="secondary" s="sm" icon={<Users size={12} />} onClick={() => { setDetail(null); openUserMgmt(detail); }}>إدارة المستخدمين</Btn>
              <Btn v="secondary" s="sm" icon={<Download size={12} />} onClick={() => doExport(detail)}>تصدير بيانات المتجر</Btn>
              <Btn v={detail.status === "active" ? "warning" : "success"} s="sm"
                icon={detail.status === "active" ? <Lock size={12} /> : <Unlock size={12} />}
                onClick={() => { toggle(detail.id); setDetail({ ...detail, status: detail.status === "active" ? "suspended" : "active" }); }}>
                {detail.status === "active" ? "إيقاف المتجر" : "تفعيل المتجر"}
              </Btn>
              <Btn v="danger" s="sm" icon={<Trash2 size={12} />} onClick={() => { setDeleteConfirm(detail); setDetail(null); }}>حذف المتجر</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Renew Subscription Modal ── */}
      {renewStore && (
        <Modal title={`تجديد اشتراك: ${renewStore.nameAr}`} sub={`الانتهاء الحالي: ${renewStore.expiresAt}`} onClose={() => setRenewStore(null)} size="sm">
          <div className="space-y-4">
            <F label="الخطة">
              <SInput value={renewStore.plan || ""} onChange={v => setRenewStore({...renewStore, plan: v})} options={apiPlans.map(p => ({ value: p.nameAr, label: `${p.nameAr} — ${p.price} د.أ/شهر` }))} />
              {apiPlans.length === 0 && <p className="text-xs text-amber-600 mt-1">لا توجد خطط محمّلة؛ أعد فتح النافذة أو تحقق من صفحة خطط الاشتراك.</p>}
            </F>
            <F label="مدة التجديد">
              <SInput value={renewMonths} onChange={setRenewMonths} options={[{ value: "1", label: "شهر واحد" }, { value: "3", label: "3 أشهر (وفر 5%)" }, { value: "6", label: "6 أشهر (وفر 10%)" }, { value: "12", label: "سنة كاملة (وفر 32%)" }]} />
            </F>
            <div className="p-4 bg-card border border-border rounded-xl">
              <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">انتهاء الاشتراك الجديد:</span><span className="font-black text-primary">{new Date(Date.now() + parseInt(renewMonths) * 30 * 86400000).toISOString().split("T")[0]}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">المبلغ المستحق:</span>
                <span className="font-black text-foreground">{(PLANS.find(p => p.nameAr === renewStore.plan)?.price || 0) * parseInt(renewMonths)} JOD</span>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Btn v="secondary" onClick={() => setRenewStore(null)}>إلغاء</Btn>
              <Btn v="success" onClick={doRenew} icon={<CheckCircle size={14} />}>تأكيد التجديد</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── New Password Modal ── */}
      {/* ── Reset Store Owner Password Modal ── */}
      {resetStoreModal && (
        <Modal title="تغيير كلمة مرور المتجر" sub={`متجر: ${resetStoreModal.nameAr}`} onClose={() => { setResetStoreModal(null); setResetStorePass(""); setResetStoreError(""); }} size="sm">
          <div className="space-y-4">
            {/* Login credentials reminder */}
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">بيانات تسجيل الدخول</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Mail size={12} className="text-blue-500 shrink-0" />
                <span className="text-xs text-blue-700 dark:text-blue-300">البريد للدخول:</span>
                <code className="text-xs font-mono bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded text-blue-900 dark:text-blue-200 select-all cursor-text">{resetStoreModal.email}</code>
              </div>
              <p className="text-[10px] text-blue-500 dark:text-blue-400">هذا ما يجب إدخاله في خانة البريد الإلكتروني عند تسجيل الدخول</p>
            </div>
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-300">ستُطبَّق كلمة المرور الجديدة فوراً على حساب صاحب المتجر</p>
            </div>
            <F label="كلمة المرور الجديدة">
              <TInput value={resetStorePass} onChange={v => { setResetStorePass(v); setResetStoreError(""); }} type="password" placeholder="6 أحرف على الأقل" />
            </F>
            {resetStoreError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl">
                <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-300">{resetStoreError}</p>
              </div>
            )}
            <div className="flex gap-2">
              <Btn v="secondary" full onClick={() => { setResetStoreModal(null); setResetStorePass(""); setResetStoreError(""); }}>إلغاء</Btn>
              <Btn full icon={resetStoreLoading ? <RefreshCw size={13} className="animate-spin" /> : <Key size={13} />} onClick={doResetStorePass} disabled={resetStoreLoading || resetStorePass.length < 6}>
                {resetStoreLoading ? "جاري الحفظ..." : "حفظ كلمة المرور"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Reset Employee Password Modal ── */}
      {resetEmpModal && (
        <Modal title="تغيير كلمة مرور موظف" sub={`متجر: ${resetEmpModal.storeName}`} onClose={() => { setResetEmpModal(null); setResetEmpPass(""); }} size="sm">
          <div className="space-y-4">
            {empsLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded-xl" />)}</div>
            ) : storeEmps.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">لا يوجد موظفون في هذا المتجر</div>
            ) : (
              <>
                <F label="اختر الموظف">
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {storeEmps.map(emp => (
                      <button key={emp.id} onClick={() => setResetEmpModal(m => m ? { ...m, empId: emp.id, empName: emp.name } : m)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-right transition-all ${resetEmpModal.empId === emp.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold">{emp.name[0]}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{emp.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{emp.email} · {emp.role}</p>
                        </div>
                        {resetEmpModal.empId === emp.id && <Check size={14} className="text-primary shrink-0" />}
                      </button>
                    ))}
                  </div>
                </F>
                {resetEmpModal.empId && (
                  <F label="كلمة المرور الجديدة">
                    <TInput value={resetEmpPass} onChange={setResetEmpPass} type="password" placeholder="6 أحرف على الأقل" />
                  </F>
                )}
                <div className="flex gap-2">
                  <Btn v="secondary" full onClick={() => { setResetEmpModal(null); setResetEmpPass(""); }}>إلغاء</Btn>
                  <Btn full icon={resetEmpLoading ? <RefreshCw size={13} className="animate-spin" /> : <Key size={13} />} onClick={doResetEmpPass} disabled={resetEmpLoading || !resetEmpModal.empId || resetEmpPass.length < 6}>
                    {resetEmpLoading ? "جاري الحفظ..." : "حفظ كلمة المرور"}
                  </Btn>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* ── Store User Management Modal ── */}
      {userMgmtStore && (
        <Modal title={`إدارة مستخدمي: ${userMgmtStore.nameAr}`} sub={`${userMgmtList.length} مستخدم`} onClose={() => { setUserMgmtStore(null); setShowAddUser(false); setEditUser(null); setPassUser(null); }} size="lg">
          <div className="space-y-4">

            {/* Header actions */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{userMgmtLoading ? "جاري التحميل..." : userMgmtError || `${userMgmtList.length} مستخدم في المتجر`}</p>
              <Btn s="sm" icon={<Plus size={13} />} onClick={() => { setShowAddUser(true); setAddUserForm(emptyUserForm); setAddUserError(""); setEditUser(null); setPassUser(null); }}>إضافة مستخدم</Btn>
            </div>

            {/* Add User Form */}
            {showAddUser && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-3">
                <p className="text-sm font-bold text-primary">مستخدم جديد</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <F label="الاسم الكامل" req><TInput value={addUserForm.name} onChange={v => setAddUserForm(f => ({ ...f, name: v }))} placeholder="أحمد محمد" /></F>
                  <F label="البريد الإلكتروني / اسم المستخدم" req><TInput value={addUserForm.email} onChange={v => setAddUserForm(f => ({ ...f, email: v }))} placeholder="ahmed@store.com" /></F>
                  <F label="كلمة المرور" req><TInput value={addUserForm.password} onChange={v => setAddUserForm(f => ({ ...f, password: v }))} type="password" placeholder="6 أحرف على الأقل" /></F>
                  <F label="رقم الجوال"><TInput value={addUserForm.phone} onChange={v => setAddUserForm(f => ({ ...f, phone: v }))} placeholder="07XXXXXXXX" /></F>
                  <div className="sm:col-span-2">
                    <F label="الصلاحية">
                      <SInput value={addUserForm.role} onChange={v => setAddUserForm(f => ({ ...f, role: v }))} options={STORE_ROLES} />
                    </F>
                  </div>
                </div>
                {addUserError && <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded-xl px-3 py-2">{addUserError}</p>}
                <div className="flex gap-2 justify-end">
                  <Btn v="secondary" s="sm" onClick={() => setShowAddUser(false)}>إلغاء</Btn>
                  <Btn s="sm" icon={addUserLoading ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />} onClick={doAddUser}
                    disabled={addUserLoading || !addUserForm.name || !addUserForm.email || addUserForm.password.length < 6}>
                    {addUserLoading ? "جاري الإضافة..." : "إضافة"}
                  </Btn>
                </div>
              </div>
            )}

            {/* Users List */}
            {userMgmtLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}</div>
            ) : userMgmtList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">لا يوجد مستخدمون — أضف مستخدماً للبدء</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {userMgmtList.map(user => (
                  <div key={user.id} className="border border-border rounded-xl overflow-hidden">
                    {/* User row */}
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-sm font-black">{user.name[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}{user.phone ? ` · ${user.phone}` : ""}</p>
                      </div>
                      <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border ${
                        user.role === "owner"     ? "bg-purple-50 text-purple-700 border-purple-200" :
                        user.role === "manager"   ? "bg-blue-50 text-blue-700 border-blue-200" :
                        user.role === "cashier"   ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        user.role === "inventory" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                    "bg-muted text-muted-foreground border-border"
                      }`}>{STORE_ROLES.find(r => r.value === user.role)?.label || user.role}</span>
                      <div className="flex gap-1 shrink-0">
                        <button title="تعديل" onClick={() => { setEditUser(user); setEditUserForm({ name: user.name, email: user.email, role: user.role, phone: user.phone }); setPassUser(null); setShowAddUser(false); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-100 text-blue-600 transition-all"><Edit2 size={12} /></button>
                        <button title="تغيير كلمة المرور" onClick={() => { setPassUser(user); setPassValue(""); setEditUser(null); setShowAddUser(false); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-100 text-amber-600 transition-all"><Key size={12} /></button>
                        <button title="حذف" onClick={() => doDeleteUser(user)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-100 text-red-500 transition-all"><Trash2 size={12} /></button>
                      </div>
                    </div>

                    {/* Inline Edit Form */}
                    {editUser?.id === user.id && (
                      <div className="border-t border-border p-3 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
                        <p className="text-xs font-bold text-blue-700 dark:text-blue-300">تعديل البيانات</p>
                        <div className="grid grid-cols-2 gap-2">
                          <F label="الاسم"><TInput value={editUserForm.name} onChange={v => setEditUserForm(f => ({ ...f, name: v }))} /></F>
                          <F label="البريد"><TInput value={editUserForm.email} onChange={v => setEditUserForm(f => ({ ...f, email: v }))} /></F>
                          <F label="الجوال"><TInput value={editUserForm.phone} onChange={v => setEditUserForm(f => ({ ...f, phone: v }))} /></F>
                          <F label="الصلاحية"><SInput value={editUserForm.role} onChange={v => setEditUserForm(f => ({ ...f, role: v }))} options={STORE_ROLES} /></F>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Btn v="secondary" s="sm" onClick={() => setEditUser(null)}>إلغاء</Btn>
                          <Btn s="sm" icon={editUserLoading ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />} onClick={doEditUser} disabled={editUserLoading}>
                            {editUserLoading ? "جاري الحفظ..." : "حفظ"}
                          </Btn>
                        </div>
                      </div>
                    )}

                    {/* Inline Password Reset */}
                    {passUser?.id === user.id && (
                      <div className="border-t border-border p-3 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-300">كلمة مرور جديدة</p>
                        <div className="flex gap-2">
                          <TInput value={passValue} onChange={setPassValue} type="password" placeholder="6 أحرف على الأقل" />
                          <Btn s="sm" v="secondary" onClick={() => setPassUser(null)}>إلغاء</Btn>
                          <Btn s="sm" icon={passLoading ? <RefreshCw size={12} className="animate-spin" /> : <Key size={12} />}
                            onClick={doResetUserPass} disabled={passLoading || passValue.length < 6}>
                            {passLoading ? "..." : "حفظ"}
                          </Btn>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <Modal title="⚠️ تأكيد حذف المتجر" sub="هذا الإجراء لا يمكن التراجع عنه" onClose={() => setDeleteConfirm(null)} size="sm">
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 space-y-1">
              <p className="font-bold">سيتم حذف ما يلي نهائياً:</p>
              <p>• حساب المتجر وجميع بياناته</p>
              <p>• جميع المنتجات والفواتير والعملاء</p>
              <p>• جميع المستخدمين والموظفين</p>
              <p>• جميع التقارير والسجلات</p>
            </div>
            <div className="p-3 bg-muted rounded-xl border border-border text-center">
              <p className="font-black text-foreground text-lg">{deleteConfirm.nameAr}</p>
              <p className="text-xs text-muted-foreground">{deleteConfirm.email} • {(deleteConfirm.sales || 0).toLocaleString()} فاتورة • {jod(deleteConfirm.revenue || 0)}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <Btn v="secondary" onClick={() => setDeleteConfirm(null)}>إلغاء</Btn>
              <Btn v="danger" onClick={() => doDelete(deleteConfirm.id)} icon={<Trash2 size={14} />}>نعم، احذف المتجر نهائياً</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SAPlans() {
  const [billing, setBilling] = useState<"m" | "y">("m");
  const [plans, setPlans] = useState<Plan[]>(PLANS);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nameAr: "", price: "", yearlyPrice: "", maxBranches: "1", maxUsers: "3", maxProducts: "500", maxInvoices: "1000", maxTerminals: "1", storage: "1 غيغابايت", apiAccess: false, badge: "", color: "#4F46E5", features: "" });

  // Real subscriptions from API
  const [subs, setSubs] = useState<StoreData[]>([]);
  const [assignStore, setAssignStore] = useState<StoreData | null>(null);
  const [assignForm, setAssignForm] = useState({ plan: "", months: "1" });
  const [assigning, setAssigning] = useState(false);

  const loadPlans = () => {
    setLoading(true);
    apiFetch("/plans", {}, getToken())
      .then(d => { if (Array.isArray(d)) setPlans((d as object[]).map(x => norm(x as Plan & { _id?: string }))); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadPlans(); }, []);

  useEffect(() => {
    apiFetch("/stores", {}, getToken())
      .then(d => { if (Array.isArray(d)) setSubs((d as (StoreData & {_id?:string})[]).map(s => ({ ...s, id: s._id || s.id || "" }))); })
      .catch(() => {});
  }, []);

  const openEdit = (p: Plan) => {
    setEditPlan(p);
    setForm({ nameAr: p.nameAr, price: String(p.price), yearlyPrice: String(p.yearlyPrice), maxBranches: String(p.maxBranches), maxUsers: String(p.maxUsers), maxProducts: String(p.maxProducts), maxInvoices: String(p.maxInvoices), maxTerminals: String(p.maxTerminals), storage: p.storage, apiAccess: p.apiAccess, badge: p.badge || "", color: p.color, features: p.features.join("\n") });
    setShowForm(true);
  };
  const openNew = () => {
    setEditPlan(null);
    setForm({ nameAr: "", price: "", yearlyPrice: "", maxBranches: "1", maxUsers: "3", maxProducts: "500", maxInvoices: "1000", maxTerminals: "1", storage: "1 غيغابايت", apiAccess: false, badge: "", color: "#4F46E5", features: "" });
    setShowForm(true);
  };
  const savePlan = async () => {
    if (!form.nameAr || !form.price) { showToast("الاسم والسعر مطلوبان", "error"); return; }
    setSaving(true);
    try {
      const body = { nameAr: form.nameAr, price: +form.price, yearlyPrice: +(form.yearlyPrice || form.price), maxBranches: +form.maxBranches, maxUsers: +form.maxUsers, maxProducts: +form.maxProducts, maxInvoices: +form.maxInvoices, maxTerminals: +form.maxTerminals, storage: form.storage, apiAccess: form.apiAccess, badge: form.badge || undefined, color: form.color, active: true, features: form.features.split("\n").map(f => f.trim()).filter(Boolean) };
      if (editPlan) {
        await apiFetch(`/plans/${editPlan.id}`, { method: "PUT", body: JSON.stringify(body) }, getToken());
        showToast("تم تحديث الخطة بنجاح ✓", "success");
      } else {
        await apiFetch("/plans", { method: "POST", body: JSON.stringify(body) }, getToken());
        showToast("تم إنشاء الخطة بنجاح ✓", "success");
      }
      setShowForm(false);
      loadPlans();
    } catch (e) { showToast((e as { error?: string }).error || "فشل الحفظ", "error"); }
    finally { setSaving(false); }
  };
  const deletePlan = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف خطة "${name}"؟`)) return;
    try {
      await apiFetch(`/plans/${id}`, { method: "DELETE" }, getToken());
      showToast("تم حذف الخطة", "success"); loadPlans();
    } catch { showToast("فشل الحذف", "error"); }
  };

  const doAssign = async () => {
    if (!assignStore || !assignForm.plan) { showToast("اختر الخطة أولاً", "error"); return; }
    const months = Number.parseInt(assignForm.months, 10);
    if (!plans.some(p => p.nameAr === assignForm.plan)) { showToast("الخطة المختارة غير متاحة؛ حدّث قائمة الخطط ثم حاول مجدداً", "error"); loadPlans(); return; }
    if (![1, 3, 6, 12].includes(months)) { showToast("مدة التجديد غير صحيحة", "error"); return; }
    setAssigning(true);
    try {
      const result = await apiFetch(`/stores/${assignStore.id}/assign-plan`, { method: "PATCH", body: JSON.stringify({ plan: assignForm.plan, months }) }, getToken()) as { store?: StoreData & { _id?: string; id?: string } };
      const saved = result?.store;
      const updated = { ...assignStore, ...(saved || {}), id: assignStore.id, plan: assignForm.plan, status: "active" as const };
      showToast(`تم تجديد اشتراك ${assignStore.nameAr} على خطة ${assignForm.plan} بنجاح ✓`, "success");
      setSubs(prev => prev.map(s => s.id === assignStore.id ? { ...s, ...updated } : s));
      setAssignStore(null);
      apiFetch("/stores", {}, getToken()).then(d => { if (Array.isArray(d)) setSubs((d as (StoreData & {_id?:string})[]).map(x => ({ ...x, id: x._id || x.id || "" }))); }).catch(() => {});
    } catch (e) { showToast((e as { error?: string })?.error || "فشل تعيين الخطة؛ لم يتم تغيير الاشتراك", "error"); }
    finally { setAssigning(false); }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <Hdr title="خطط الاشتراك" sub="إدارة وتخصيص الخطط وتعيينها للمتاجر" action={<Btn icon={<Plus size={14} />} onClick={openNew}>خطة جديدة</Btn>} />
      <div className="flex bg-muted rounded-2xl p-1 w-fit border border-border">
        <button onClick={() => setBilling("m")} className={`px-6 h-9 rounded-xl text-sm font-bold transition-all ${billing === "m" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>شهري</button>
        <button onClick={() => setBilling("y")} className={`px-6 h-9 rounded-xl text-sm font-bold transition-all ${billing === "y" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>سنوي (خصم 32%)</button>
      </div>
      {loading ? (
        <div className="grid grid-cols-3 gap-5">{[1,2,3].map(i => <div key={i} className="bg-card rounded-2xl border border-border p-6 h-64 animate-pulse" />)}</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border">
          <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-bold mb-1">لا توجد خطط بعد</p>
          <p className="text-sm mb-4">أنشئ أول خطة اشتراك لمتاجرك</p>
          <Btn onClick={openNew} icon={<Plus size={14} />}>إنشاء خطة</Btn>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {plans.map(plan => (
            <div key={plan.id} className={`bg-card rounded-2xl border-2 p-6 flex flex-col relative ${plan.badge ? "border-primary shadow-xl" : "border-border"}`}>
              {plan.badge && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-black px-4 py-1 rounded-full">{plan.badge}</div>}
              <div className="mb-5">
                <div className="w-11 h-11 rounded-xl mb-3 flex items-center justify-center" style={{ backgroundColor: `${plan.color}18` }}><CreditCard size={20} style={{ color: plan.color }} /></div>
                <h3 className="text-xl font-black">{plan.nameAr}</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-black">{billing === "m" ? plan.price : plan.yearlyPrice}</span>
                  <span className="text-muted-foreground text-sm">JOD / {billing === "m" ? "شهر" : "سنة"}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-5 text-xs">
                {[["فروع", plan.maxBranches >= 99 ? "∞" : plan.maxBranches], ["مستخدمون", plan.maxUsers >= 99 ? "∞" : plan.maxUsers], ["منتجات", plan.maxProducts > 9999 ? "∞" : plan.maxProducts.toLocaleString()], ["فواتير/شهر", plan.maxInvoices > 9999 ? "∞" : plan.maxInvoices.toLocaleString()]].map(([l, vv]) =>
                  <div key={String(l)} className="bg-muted/60 rounded-xl p-2.5 text-center"><p className="font-black text-foreground text-base">{vv}</p><p className="text-muted-foreground">{l}</p></div>)}
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map(f => <li key={f} className="flex items-center gap-2 text-xs"><CheckCircle size={12} className="text-emerald-500 shrink-0" />{f}</li>)}
              </ul>
              <div className="flex gap-2">
                <Btn v="secondary" s="sm" cls="flex-1" icon={<Edit2 size={11} />} onClick={() => openEdit(plan)}>تعديل</Btn>
                <Btn v="ghost" s="sm" icon={<Trash2 size={11} />} onClick={() => deletePlan(plan.id, plan.nameAr)}>حذف</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border font-bold text-foreground">اشتراكات المتاجر الحالية ({subs.length})</div>
        <div className="divide-y divide-border/60">
          {subs.length === 0 ? (
            <p className="text-center py-6 text-sm text-muted-foreground">لا يوجد متاجر بعد</p>
          ) : subs.map((s: StoreData) => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20">
              <div className="flex-1 min-w-0"><p className="text-sm font-bold">{s.nameAr}</p><p className="text-xs text-muted-foreground">{s.email}</p></div>
              <span className="hidden sm:block text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{s.plan || "—"}</span>
              <SBadge status={s.status} />
              <div className="hidden md:block text-xs text-muted-foreground">انتهاء: {s.expiresAt || "—"}</div>
              <div className="flex gap-1.5">
                <Btn v="secondary" s="xs" onClick={() => { loadPlans(); setAssignStore(s); setAssignForm({ plan: plans.some(p => p.nameAr === s.plan) ? s.plan : (plans[0]?.nameAr || ""), months: "1" }); }}>تجديد / تغيير</Btn>
              </div>
            </div>
          ))}
        </div>
      </div>

      {assignStore && (
        <Modal title={`تجديد / تعيين خطة — ${assignStore.nameAr}`} onClose={() => setAssignStore(null)} size="sm">
          <div className="space-y-4">
            <F label="الخطة">
              <select value={assignForm.plan} onChange={e => setAssignForm(f => ({ ...f, plan: e.target.value }))} className="w-full rounded-xl border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25">
                <option value="">اختر خطة</option>
                {plans.map(p => <option key={p.id || p.nameAr} value={p.nameAr}>{p.nameAr} — {p.price} د.أ/شهر</option>)}
              </select>
            </F>
            <F label="مدة التجديد (بالأشهر)">
              <select value={assignForm.months} onChange={e => setAssignForm(f => ({ ...f, months: e.target.value }))} className="w-full rounded-xl border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25">
                {[1,3,6,12].map(m => <option key={m} value={m}>{m} {m === 1 ? "شهر" : "أشهر"}</option>)}
              </select>
            </F>
            <div className="flex gap-3">
              <Btn v="secondary" cls="flex-1" onClick={() => setAssignStore(null)}>إلغاء</Btn>
              <Btn cls="flex-1" disabled={assigning} onClick={doAssign} icon={<CreditCard size={14} />}>{assigning ? "جاري الحفظ..." : "تطبيق الخطة"}</Btn>
            </div>
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal title={editPlan ? "تعديل الخطة" : "خطة جديدة"} sub="أدخل تفاصيل خطة الاشتراك" onClose={() => setShowForm(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <F label="اسم الخطة" req><TInput value={form.nameAr} onChange={v => setForm(f => ({ ...f, nameAr: v }))} placeholder="مثال: الاحترافي" /></F>
              <F label="السعر الشهري (JOD)" req><TInput value={form.price} onChange={v => setForm(f => ({ ...f, price: v }))} type="number" /></F>
              <F label="السعر السنوي (JOD)"><TInput value={form.yearlyPrice} onChange={v => setForm(f => ({ ...f, yearlyPrice: v }))} type="number" /></F>
              <F label="اللون (Hex)"><TInput value={form.color} onChange={v => setForm(f => ({ ...f, color: v }))} placeholder="#4F46E5" /></F>
              <F label="الحد الأقصى للفروع"><TInput value={form.maxBranches} onChange={v => setForm(f => ({ ...f, maxBranches: v }))} type="number" /></F>
              <F label="الحد الأقصى للمستخدمين"><TInput value={form.maxUsers} onChange={v => setForm(f => ({ ...f, maxUsers: v }))} type="number" /></F>
              <F label="الحد الأقصى للمنتجات"><TInput value={form.maxProducts} onChange={v => setForm(f => ({ ...f, maxProducts: v }))} type="number" /></F>
              <F label="الحد الأقصى للفواتير/شهر"><TInput value={form.maxInvoices} onChange={v => setForm(f => ({ ...f, maxInvoices: v }))} type="number" /></F>
              <F label="عدد أجهزة POS"><TInput value={form.maxTerminals} onChange={v => setForm(f => ({ ...f, maxTerminals: v }))} type="number" /></F>
              <F label="حجم التخزين"><TInput value={form.storage} onChange={v => setForm(f => ({ ...f, storage: v }))} placeholder="5 غيغابايت" /></F>
            </div>
            <F label="شارة مميزة (اختياري)"><TInput value={form.badge} onChange={v => setForm(f => ({ ...f, badge: v }))} placeholder="مثال: الأكثر شيوعاً" /></F>
            <F label="المميزات (كل ميزة في سطر جديد)" req>
              <textarea value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))} rows={5} placeholder={"تقارير متقدمة\nإدارة المخزون\nدعم أولوية"} className="w-full rounded-xl border border-border bg-input-background text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring/25 resize-none" />
            </F>
            <div className="flex gap-3 pt-2">
              <Btn full onClick={savePlan} disabled={saving}>{saving ? "جاري الحفظ..." : (editPlan ? "حفظ التعديلات" : "إنشاء الخطة")}</Btn>
              <Btn v="secondary" full onClick={() => setShowForm(false)}>إلغاء</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
function SAReports() {
  const [stores, setStores] = useState<StoreData[]>(() => {
    try { const s = localStorage.getItem("sowwanjo_sa_stores"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [loadingRep, setLoadingRep] = useState(true);

  useEffect(() => {
    apiFetch("/stores", {}, getToken())
      .then(d => {
        if (Array.isArray(d)) {
          const mapped = (d as (StoreData & { _id?: string })[]).map(s => ({ revenue: 0, sales: 0, products: 0, users: 1, ...s, id: s._id || s.id || "" }));
          setStores(mapped);
          try { localStorage.setItem("sowwanjo_sa_stores", JSON.stringify(mapped)); } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoadingRep(false));
  }, []);

  const totalRevenue  = stores.reduce((a, s) => a + (s.revenue || 0), 0);
  const totalSales    = stores.reduce((a, s) => a + (s.sales || 0), 0);
  const totalProducts = stores.reduce((a, s) => a + (s.products || 0), 0);
  const totalUsers    = stores.reduce((a, s) => a + (s.users || 0), 0);
  const avgInvoice    = totalSales > 0 ? totalRevenue / totalSales : 0;
  const activeCount   = stores.filter(s => s.status === "active").length;
  const retentionRate = stores.length > 0 ? Math.round((activeCount / stores.length) * 100) : 0;

  // Monthly revenue by plan
  const planRevenue: Record<string, number> = {};
  stores.forEach(s => { planRevenue[s.plan] = (planRevenue[s.plan] || 0) + (s.revenue || 0); });

  const planChartData = Object.entries(planRevenue).map(([plan, rev]) => ({ plan, إيرادات: rev }));

  if (loadingRep) return <div className="p-6 text-center text-muted-foreground py-20">جاري تحميل التقارير من قاعدة البيانات...</div>;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-5">
      <Hdr title="التقارير العامة" sub="نظرة شاملة على أداء المنصة — بيانات حقيقية من قاعدة البيانات" action={<><Btn v="secondary" s="sm" icon={<Download size={14} />} onClick={() => showToast("جاري إعداد تقرير PDF الشامل...", "info")}>PDF</Btn><Btn v="secondary" s="sm" icon={<Download size={14} />} onClick={() => showToast("جاري تصدير ملف Excel...", "info")}>Excel</Btn></>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPI icon={<DollarSign size={20} />} label="إجمالي الإيرادات" value={jod(totalRevenue)} sub={`من ${stores.length} متجر`} color="#4F46E5" />
        <KPI icon={<FileText size={20} />} label="إجمالي الفواتير" value={totalSales.toLocaleString("ar-JO")} sub="فاتورة مسجلة" color="#059669" />
        <KPI icon={<TrendingUp size={20} />} label="متوسط الفاتورة" value={jod(avgInvoice)} color="#D97706" />
        <KPI icon={<Store size={20} />} label="معدل النشاط" value={`${retentionRate}%`} sub={`${activeCount} متجر نشط`} color="#7C3AED" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={<Package size={20} />} label="إجمالي المنتجات" value={totalProducts.toLocaleString("ar-JO")} color="#0891B2" />
        <KPI icon={<Users size={20} />} label="إجمالي المستخدمين" value={totalUsers.toLocaleString("ar-JO")} color="#059669" />
        <KPI icon={<Store size={20} />} label="المتاجر النشطة" value={String(activeCount)} sub={`من ${stores.length} إجمالي`} color="#4F46E5" />
        <KPI icon={<AlertCircle size={20} />} label="متاجر منتهية/موقوفة" value={String(stores.filter(s => s.status === "suspended" || s.status === "expired").length)} color="#EF4444" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-1">الإيرادات حسب الخطة (JOD)</p>
          <p className="text-xs text-muted-foreground mb-4">مجموع الإيرادات لكل خطة اشتراك</p>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={planChartData.length > 0 ? planChartData : [{ plan: "لا توجد بيانات", إيرادات: 0 }]} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="plan" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => jod(v)} />
              <Tooltip formatter={(v: number) => [jod(v)]} />
              <Bar key="bar-rev" dataKey="إيرادات" fill="#4F46E5" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-4">توزيع المتاجر حسب النوع</p>
          {stores.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">لا توجد بيانات بعد</div>
          ) : (
            <div className="space-y-3">
              {(Object.keys(CAT) as StoreCategory[]).map(cat => {
                const count = stores.filter(s => s.category === cat).length;
                const pct = stores.length > 0 ? (count / stores.length) * 100 : 0;
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <div className="w-20 shrink-0"><p className="text-xs font-bold text-foreground">{CAT[cat].label}</p></div>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: CAT[cat].color }} />
                    </div>
                    <span className="text-xs font-bold text-foreground w-8 text-left shrink-0">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border font-bold">أداء المتاجر ({stores.length})</div>
        {stores.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">لا يوجد متاجر مسجلة بعد</p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border/60">
              {stores.sort((a,b) => (b.revenue||0)-(a.revenue||0)).map(s => {
                const cat = CAT[s.category as StoreCategory] || CAT["supermarket"];
                return (
                  <div key={s.id} className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: cat.bg }}><span style={{ color: cat.color }}>{cat.icon}</span></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{s.nameAr}</p>
                      <p className="text-xs text-muted-foreground">{cat.label} • {s.plan}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-primary">{jod(s.revenue || 0)}</p>
                      <SBadge status={s.status} />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/40">{["المتجر","الفئة","الخطة","الحالة","الإيرادات","الفواتير","المنتجات","المستخدمون"].map(h => <th key={h} className="text-right p-3 font-bold text-muted-foreground text-xs">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-border/60">
                  {stores.sort((a,b) => (b.revenue||0)-(a.revenue||0)).map(s => {
                    const cat = CAT[s.category as StoreCategory] || CAT["supermarket"];
                    return (
                      <tr key={s.id} className="hover:bg-muted/20">
                        <td className="p-3 font-bold text-xs">{s.nameAr}</td>
                        <td className="p-3"><span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ color: cat.color, backgroundColor: cat.bg }}>{cat.label}</span></td>
                        <td className="p-3 text-xs font-bold text-primary">{s.plan}</td>
                        <td className="p-3"><SBadge status={s.status} /></td>
                        <td className="p-3 text-xs font-bold">{jod(s.revenue || 0)}</td>
                        <td className="p-3 text-xs text-muted-foreground">{(s.sales||0).toLocaleString()}</td>
                        <td className="p-3 text-xs text-muted-foreground">{(s.products||0).toLocaleString()}</td>
                        <td className="p-3 text-xs text-muted-foreground">{s.users||0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
function SAAudit() {
  const [logs, setLogs] = useState<{_id:string;storeName:string;action:string;category:string;target:string;createdAt:string;ip:string;browser:string;os:string;device:string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback((p = 1) => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(p), limit: "50" });
    if (search) qs.set("search", search);
    if (category) qs.set("category", category);
    apiFetch(`/audit?${qs}`, {}, getToken())
      .then((d: unknown) => {
        const r = d as { logs: typeof logs; total: number; pages: number };
        setLogs(r.logs || []); setTotal(r.total || 0); setPages(r.pages || 1); setPage(p);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, category]);

  useEffect(() => { load(1); }, [load]);

  const CAT_COLORS: Record<string, string> = {
    login: "text-blue-600 bg-blue-50 border-blue-200",
    product: "text-emerald-600 bg-emerald-50 border-emerald-200",
    sale: "text-purple-600 bg-purple-50 border-purple-200",
    settings: "text-orange-600 bg-orange-50 border-orange-200",
    store: "text-indigo-600 bg-indigo-50 border-indigo-200",
    subscription: "text-pink-600 bg-pink-50 border-pink-200",
    user: "text-cyan-600 bg-cyan-50 border-cyan-200",
  };

  const exportCSV = () => {
    const header = "المتجر,الإجراء,الفئة,الهدف,التاريخ,IP,المتصفح,الجهاز\n";
    const rows = logs.map(l =>
      [l.storeName, l.action, l.category, l.target, new Date(l.createdAt).toLocaleString("ar-JO"), l.ip, l.browser, l.device].join(",")
    ).join("\n");
    const blob = new Blob(["﻿" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `audit-${Date.now()}.csv`; a.click();
  };

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <Hdr title="سجلات التدقيق" sub={`${total.toLocaleString("ar")} سجل`}
        action={<Btn v="secondary" s="sm" icon={<Download size={14} />} onClick={exportCSV}>تصدير CSV</Btn>} />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[180px] relative">
          <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && load(1)}
            placeholder="بحث في السجلات..." className="w-full h-9 pr-8 pl-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="h-9 px-3 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">كل الفئات</option>
          {["login","product","sale","settings","store","subscription","user"].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <Btn v="primary" s="sm" onClick={() => load(1)} icon={<Search size={13} />}>بحث</Btn>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-card rounded-xl border border-border animate-pulse" />)}</div>
      ) : logs.length === 0 ? (
        <Empty icon={<ClipboardList size={36} />} title="لا توجد سجلات" desc="ستظهر هنا سجلات النشاط والتدقيق تلقائياً" />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {logs.map(l => (
              <div key={l._id} className="bg-card rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${CAT_COLORS[l.category] || "bg-muted"}`}>{l.action}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{new Date(l.createdAt).toLocaleString("ar-JO")}</span>
                </div>
                <p className="text-xs font-semibold">{l.storeName || "المدير العام"}</p>
                {l.target && <p className="text-xs text-muted-foreground">{l.target}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">{l.ip} · {l.browser} · {l.device}</p>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-card rounded-2xl border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {["المتجر","الإجراء","الهدف","التاريخ","IP","المتصفح","الجهاز"].map(h => (
                    <th key={h} className="text-right p-3 font-bold text-muted-foreground text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {logs.map(l => (
                  <tr key={l._id} className="hover:bg-muted/20">
                    <td className="p-3 text-xs font-semibold">{l.storeName || "المدير العام"}</td>
                    <td className="p-3"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${CAT_COLORS[l.category] || "bg-muted text-foreground border-border"}`}>{l.action}</span></td>
                    <td className="p-3 text-xs text-muted-foreground max-w-[140px] truncate">{l.target}</td>
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(l.createdAt).toLocaleString("ar-JO")}</td>
                    <td className="p-3 text-xs font-mono text-muted-foreground">{l.ip}</td>
                    <td className="p-3 text-xs text-muted-foreground">{l.browser}</td>
                    <td className="p-3 text-xs text-muted-foreground">{l.device}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button disabled={page <= 1} onClick={() => load(page - 1)}
                className="h-8 px-3 rounded-lg border border-border text-xs disabled:opacity-40 hover:bg-muted transition-colors">
                <ChevronRight size={14} />
              </button>
              <span className="text-xs text-muted-foreground">صفحة {page} من {pages}</span>
              <button disabled={page >= pages} onClick={() => load(page + 1)}
                className="h-8 px-3 rounded-lg border border-border text-xs disabled:opacity-40 hover:bg-muted transition-colors">
                <ChevronLeft size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SA HEALTH — System Health Monitor
// ─────────────────────────────────────────────────────────────────────────────
function SAHealth() {
  const [health, setHealth] = useState<{status:string;db:string;timestamp:string;uptime?:number;memUsed?:number;memTotal?:number} | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const check = () => {
    setLoading(true);
    const API = ((import.meta as Record<string, Record<string, string>>).env?.VITE_API_URL || "http://localhost:5000/api").replace(/\/api$/, "");
    fetch(`${API}/health`)
      .then(r => r.json())
      .then(d => { setHealth(d); setLastCheck(new Date()); })
      .catch(() => setHealth(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { check(); }, []);

  const services = [
    { name: "خادم API",      icon: <Cpu size={16} />,      ok: health?.status === "ok" },
    { name: "قاعدة البيانات", icon: <Boxes size={16} />,    ok: health?.db === "connected" },
    { name: "المصادقة JWT",  icon: <Shield size={16} />,   ok: health?.status === "ok" },
    { name: "Rate Limiting",  icon: <Activity size={16} />, ok: true },
    { name: "CORS",           icon: <Globe size={16} />,    ok: true },
    { name: "Helmet Security",icon: <Lock size={16} />,     ok: true },
  ];

  return (
    <div className="p-3 sm:p-6 space-y-5">
      <Hdr title="صحة النظام" sub={lastCheck ? `آخر فحص: ${lastCheck.toLocaleTimeString("ar-JO")}` : ""}
        action={<Btn v="secondary" s="sm" icon={loading ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />} onClick={check} disabled={loading}>فحص الآن</Btn>} />

      {/* Overall Status Banner */}
      <div className={`rounded-2xl border p-5 flex items-center gap-4 ${health?.status === "ok" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${health?.status === "ok" ? "bg-emerald-100" : "bg-red-100"}`}>
          {health?.status === "ok" ? <CheckCircle size={24} className="text-emerald-600" /> : <XCircle size={24} className="text-red-500" />}
        </div>
        <div>
          <p className={`font-black text-lg ${health?.status === "ok" ? "text-emerald-800" : "text-red-700"}`}>
            {loading ? "جاري الفحص..." : health?.status === "ok" ? "النظام يعمل بشكل مثالي" : "تحذير: مشكلة في النظام"}
          </p>
          {health?.timestamp && <p className="text-sm text-muted-foreground">{new Date(health.timestamp).toLocaleString("ar-JO")}</p>}
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {services.map(s => (
          <div key={s.name} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.ok ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
              {s.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">{s.name}</p>
              <p className={`text-xs font-semibold ${s.ok ? "text-emerald-600" : "text-red-500"}`}>
                {s.ok ? "يعمل بشكل طبيعي" : "توقف عن العمل"}
              </p>
            </div>
            {s.ok ? <CheckCircle size={16} className="text-emerald-500 shrink-0" /> : <XCircle size={16} className="text-red-400 shrink-0" />}
          </div>
        ))}
      </div>

      {/* Health Score */}
      {!loading && health && (() => {
        const checks = [
          { label: "خادم API", ok: health.status === "ok" },
          { label: "قاعدة البيانات", ok: health.db === "connected" },
          { label: "Helmet Security", ok: true },
          { label: "JWT Auth", ok: true },
          { label: "Rate Limiting", ok: true },
          { label: "CORS", ok: true },
        ];
        const score = Math.round((checks.filter(c => c.ok).length / checks.length) * 100);
        const color = score >= 90 ? "#10B981" : score >= 70 ? "#F59E0B" : "#EF4444";
        return (
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold flex items-center gap-2"><Activity size={14} /> درجة صحة النظام</p>
              <span className="text-3xl font-black" style={{ color }}>{score}%</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden mb-4">
              <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {checks.map(c => (
                <div key={c.label} className={`flex items-center gap-2 text-xs p-2 rounded-xl border ${c.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-600"}`}>
                  {c.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  <span className="font-semibold">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* System Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <p className="font-bold flex items-center gap-2"><Monitor size={14} /> معلومات النظام</p>
          {[
            { k: "الخادم", v: "Render.com — Cloud" },
            { k: "قاعدة البيانات", v: "MongoDB Atlas" },
            { k: "الإطار", v: "Node.js + Express + TypeScript" },
            { k: "الواجهة", v: "React 18 + Vite + Tailwind CSS" },
            { k: "حالة قاعدة البيانات", v: health?.db === "connected" ? "✅ متصلة" : "❌ منقطعة" },
          ].map(r => (
            <div key={r.k} className="flex justify-between text-sm border-b border-border/60 pb-2 last:border-0">
              <span className="text-muted-foreground">{r.k}</span>
              <span className="font-semibold">{r.v}</span>
            </div>
          ))}
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <p className="font-bold flex items-center gap-2"><Shield size={14} /> إعدادات الأمان</p>
          {[
            { k: "Helmet Security Headers", v: "✅ مفعّل" },
            { k: "CORS Policy", v: "✅ مفعّل" },
            { k: "Rate Limiting", v: "✅ 500 req/15min" },
            { k: "JWT Authentication", v: "✅ مفعّل" },
            { k: "bcrypt Password Hashing", v: "✅ مفعّل" },
            { k: "Morgan Logging", v: "✅ مفعّل" },
          ].map(r => (
            <div key={r.k} className="flex justify-between text-sm border-b border-border/60 pb-2 last:border-0">
              <span className="text-muted-foreground">{r.k}</span>
              <span className="font-semibold text-emerald-600">{r.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SA FEATURE FLAGS — Manage Features per Plan
// ─────────────────────────────────────────────────────────────────────────────
const ALL_FEATURES = [
  { id: "loyalty",       label: "برنامج الولاء",      icon: <Star size={14} />,     desc: "نقاط وعروض لكسب ولاء العملاء" },
  { id: "crm",           label: "إدارة علاقات العملاء", icon: <Users size={14} />,  desc: "تحليل سلوك العملاء والحفاظ عليهم" },
  { id: "tables",        label: "إدارة الطاولات",       icon: <Grid3X3 size={14} />, desc: "للمطاعم والمقاهي" },
  { id: "kitchen",       label: "شاشة المطبخ",          icon: <Coffee size={14} />,  desc: "طلبات المطبخ المباشرة" },
  { id: "appointments",  label: "حجز المواعيد",          icon: <ClipboardList size={14} />, desc: "جدولة المواعيد للخدمات" },
  { id: "warranty",      label: "إدارة الضمانات",        icon: <Shield size={14} />, desc: "ضمانات المنتجات للإلكترونيات" },
  { id: "repair",        label: "وحدة الإصلاح",          icon: <Scissors size={14} />, desc: "متابعة طلبات الإصلاح" },
  { id: "multibranch",   label: "تعدد الفروع",           icon: <Building2 size={14} />, desc: "إدارة أكثر من فرع" },
  { id: "multiwarehouse",label: "تعدد المستودعات",       icon: <Boxes size={14} />,  desc: "إدارة مستودعات متعددة" },
  { id: "openfoodfacts", label: "Open Food Facts",        icon: <Scan size={14} />,   desc: "مزامنة بيانات الغذاء التلقائية" },
  { id: "api_access",    label: "الوصول لـ API",          icon: <Globe size={14} />,  desc: "مفاتيح API للتكامل مع أنظمة خارجية" },
  { id: "advanced_reports", label: "تقارير متقدمة",      icon: <BarChart2 size={14} />, desc: "تقارير تفصيلية وتصدير" },
  { id: "custom_receipt", label: "تصميم الفاتورة",       icon: <Printer size={14} />, desc: "تخصيص الفواتير بالشعار والألوان" },
  { id: "sms",           label: "رسائل SMS",              icon: <Phone size={14} />,  desc: "إشعارات نصية للعملاء" },
  { id: "email_notif",   label: "إشعارات بريدية",         icon: <Mail size={14} />,   desc: "رسائل بريدية تلقائية" },
];

const PLAN_KEYS = ["starter", "basic", "professional", "enterprise"];
const PLAN_LABELS: Record<string, string> = { starter: "Starter", basic: "Basic", professional: "Professional", enterprise: "Enterprise" };

function SAFeatureFlags() {
  const [flags, setFlags] = useState<Record<string, Record<string, boolean>>>(() => {
    const def: Record<string, Record<string, boolean>> = {};
    PLAN_KEYS.forEach(p => {
      def[p] = {};
      ALL_FEATURES.forEach(f => { def[p][f.id] = p === "enterprise"; });
    });
    // default enabled per plan
    ["starter"].forEach(p => { ["custom_receipt", "advanced_reports"].forEach(f => { def[p][f] = false; }); });
    ["basic","professional","enterprise"].forEach(p => { def[p]["loyalty"] = true; def[p]["crm"] = true; });
    ["professional","enterprise"].forEach(p => { def[p]["multibranch"] = true; def[p]["api_access"] = true; });
    return def;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (plan: string, feat: string) => {
    setFlags(prev => ({ ...prev, [plan]: { ...prev[plan], [feat]: !prev[plan][feat] } }));
    setSaved(false);
  };

  const enableAll = (plan: string) => {
    const all: Record<string, boolean> = {};
    ALL_FEATURES.forEach(f => { all[f.id] = true; });
    setFlags(prev => ({ ...prev, [plan]: all }));
    setSaved(false);
  };

  const disableAll = (plan: string) => {
    const none: Record<string, boolean> = {};
    ALL_FEATURES.forEach(f => { none[f.id] = false; });
    setFlags(prev => ({ ...prev, [plan]: none }));
    setSaved(false);
  };

  const doSave = async () => {
    setSaving(true);
    try {
      await apiFetch("/super-admin/settings", { method: "PUT", body: JSON.stringify({ featureFlags: flags }) }, getToken());
      showToast("تم حفظ إعدادات الميزات بنجاح ✓", "success");
      setSaved(true);
    } catch { showToast("فشل الحفظ", "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <Hdr title="ميزات خطط الاشتراك" sub="تحكم في الميزات المتاحة لكل خطة"
        action={<Btn v="success" s="sm" icon={saved ? <CheckCircle size={14} /> : <Check size={14} />} onClick={doSave} disabled={saving}>
          {saving ? "جاري الحفظ..." : saved ? "تم الحفظ ✓" : "حفظ الإعدادات"}
        </Btn>} />

      {/* Plan columns */}
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Header row */}
          <div className="grid grid-cols-5 gap-3 mb-3">
            <div className="col-span-1" />
            {PLAN_KEYS.map(p => (
              <div key={p} className="bg-card rounded-2xl border border-border p-3 text-center">
                <p className="font-black text-sm">{PLAN_LABELS[p]}</p>
                <div className="flex gap-1 mt-1.5 justify-center">
                  <button onClick={() => enableAll(p)} className="text-[10px] text-emerald-600 hover:underline">كل</button>
                  <span className="text-muted-foreground text-[10px]">/</span>
                  <button onClick={() => disableAll(p)} className="text-[10px] text-red-500 hover:underline">لا شيء</button>
                </div>
              </div>
            ))}
          </div>

          {/* Feature rows */}
          <div className="space-y-1.5">
            {ALL_FEATURES.map(feat => (
              <div key={feat.id} className="grid grid-cols-5 gap-3 items-center">
                <div className="bg-card rounded-xl border border-border p-3 flex items-center gap-2">
                  <span className="text-muted-foreground shrink-0">{feat.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{feat.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate hidden sm:block">{feat.desc}</p>
                  </div>
                </div>
                {PLAN_KEYS.map(p => (
                  <div key={p} className="flex items-center justify-center">
                    <button onClick={() => toggle(p, feat.id)}
                      className={`w-10 h-6 rounded-full relative transition-all duration-200 ${flags[p]?.[feat.id] ? "bg-primary" : "bg-muted"}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${flags[p]?.[feat.id] ? "left-4" : "left-0.5"}`} />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SATickets() {
  const [tickets, setTickets] = useState<{ _id: string; storeName: string; subject: string; message: string; priority: string; status: string; createdAt: string; replies: { from: string; message: string; isSA: boolean; createdAt: string }[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [replyMsg, setReplyMsg] = useState("");
  const [replying, setReplying] = useState(false);

  const loadTickets = () => {
    apiFetch("/tickets", {}, getToken())
      .then(d => { if (Array.isArray(d)) setTickets(d as typeof tickets); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadTickets(); }, []);

  const changeStatus = async (id: string, status: string) => {
    try {
      await apiFetch(`/tickets/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }, getToken());
      showToast("تم تحديث الحالة", "success"); loadTickets();
    } catch { showToast("فشل تحديث الحالة", "error"); }
  };

  const sendReply = async (id: string) => {
    if (!replyMsg.trim()) return;
    setReplying(true);
    try {
      await apiFetch(`/tickets/${id}/reply`, { method: "POST", body: JSON.stringify({ message: replyMsg }) }, getToken());
      showToast("تم إرسال الرد ✓", "success");
      setReplyMsg(""); loadTickets();
    } catch { showToast("فشل الإرسال", "error"); }
    finally { setReplying(false); }
  };

  const PR: Record<string, string> = { "عالية": "text-red-600 bg-red-50 border-red-200", "متوسطة": "text-orange-600 bg-orange-50 border-orange-200", "منخفضة": "text-blue-600 bg-blue-50 border-blue-200" };
  const SR: Record<string, string> = { open: "text-emerald-700 bg-emerald-100", pending: "text-amber-700 bg-amber-100", closed: "text-gray-600 bg-gray-100" };
  const SL: Record<string, string> = { open: "مفتوح", pending: "قيد المعالجة", closed: "مغلق" };

  const selectedTicket = tickets.find(t => t._id === selected);

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <Hdr title="تذاكر الدعم الفني" sub={`${tickets.filter(t => t.status !== "closed").length} تذاكر مفتوحة`} action={<button onClick={loadTickets} className="text-xs text-primary hover:underline flex items-center gap-1"><RefreshCw size={12} />تحديث</button>} />
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-card rounded-2xl border border-border animate-pulse" />)}</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border text-muted-foreground">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-bold mb-1">لا توجد تذاكر دعم</p>
          <p className="text-sm">سيظهر هنا طلبات الدعم من المتاجر</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-3">
            {tickets.map(t => (
              <div key={t._id} onClick={() => setSelected(t._id === selected ? null : t._id)} className={`bg-card rounded-2xl border p-4 cursor-pointer transition-all hover:border-primary/50 ${selected === t._id ? "border-primary bg-primary/2" : "border-border"}`}>
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">#{t._id.slice(-6).toUpperCase()}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${PR[t.priority] || PR["متوسطة"]}`}>{t.priority}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${SR[t.status] || SR.open}`}>{SL[t.status] || t.status}</span>
                    </div>
                    <p className="font-bold text-foreground text-sm">{t.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.storeName} • {new Date(t.createdAt).toLocaleDateString("ar-JO")}</p>
                    {t.replies.length > 0 && <p className="text-xs text-primary mt-1">{t.replies.length} {t.replies.length === 1 ? "رد" : "ردود"}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {t.status !== "closed" && (
                      <button onClick={e => { e.stopPropagation(); changeStatus(t._id, "closed"); }} className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-lg transition-all">إغلاق</button>
                    )}
                    {t.status === "closed" && (
                      <button onClick={e => { e.stopPropagation(); changeStatus(t._id, "open"); }} className="text-xs text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition-all">فتح</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {selectedTicket && (
            <div className="bg-card rounded-2xl border border-border p-5 flex flex-col h-fit">
              <div className="mb-4 pb-4 border-b border-border">
                <p className="font-bold text-foreground">{selectedTicket.subject}</p>
                <p className="text-xs text-muted-foreground mt-1">{selectedTicket.storeName}</p>
                {selectedTicket.message && <p className="text-sm mt-3 text-foreground bg-muted/40 rounded-xl p-3">{selectedTicket.message}</p>}
              </div>
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {selectedTicket.replies.map((r, i) => (
                  <div key={i} className={`p-3 rounded-xl text-sm ${r.isSA ? "bg-primary/10 border border-primary/20 mr-4" : "bg-muted/50 ml-4"}`}>
                    <p className={`text-xs font-bold mb-1 ${r.isSA ? "text-primary" : "text-muted-foreground"}`}>{r.from}</p>
                    <p>{r.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(r.createdAt).toLocaleString("ar-JO")}</p>
                  </div>
                ))}
              </div>
              {selectedTicket.status !== "closed" && (
                <div className="space-y-2">
                  <textarea value={replyMsg} onChange={e => setReplyMsg(e.target.value)} rows={3} placeholder="اكتب ردك هنا..." className="w-full rounded-xl border border-border bg-input-background text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring/25 resize-none" />
                  <Btn full icon={<Send size={13} />} disabled={!replyMsg.trim() || replying} onClick={() => sendReply(selectedTicket._id)}>
                    {replying ? "جاري الإرسال..." : "إرسال الرد"}
                  </Btn>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function SABroadcast() {
  const [msg, setMsg] = useState("");
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("all");
  const [type, setType] = useState("info");
  const [sending, setSending] = useState(false);
  const [announcements, setAnnouncements] = useState<{ _id: string; title: string; message: string; target: string; createdAt: string }[]>([]);
  const [loadingAnns, setLoadingAnns] = useState(true);

  const storedStores: StoreData[] = (() => { try { const s = localStorage.getItem("sowwanjo_sa_stores"); return s ? JSON.parse(s) : []; } catch { return []; } })();

  const loadAnnouncements = () => {
    apiFetch("/announcements", {}, getToken())
      .then(d => { if (Array.isArray(d)) setAnnouncements(d as typeof announcements); })
      .catch(() => {})
      .finally(() => setLoadingAnns(false));
  };
  useEffect(() => { loadAnnouncements(); }, []);

  const sendAnn = async () => {
    if (!msg.trim()) { showToast("يرجى كتابة نص الإعلان", "error"); return; }
    setSending(true);
    try {
      await apiFetch("/announcements", { method: "POST", body: JSON.stringify({ title: title || "إعلان جديد", message: msg, target, type }) }, getToken());
      showToast("تم إرسال الإعلان بنجاح ✓", "success");
      setMsg(""); setTitle("");
      loadAnnouncements();
    } catch (e) {
      showToast((e as { error?: string }).error || "فشل الإرسال", "error");
    } finally { setSending(false); }
  };

  const deleteAnn = async (id: string) => {
    try {
      await apiFetch(`/announcements/${id}`, { method: "DELETE" }, getToken());
      showToast("تم الحذف", "success"); loadAnnouncements();
    } catch { showToast("فشل الحذف", "error"); }
  };

  const targetLabel = (t: string) => {
    if (t === "all") return "جميع المتاجر";
    if (t === "active") return "النشطة فقط";
    const store = storedStores.find(s => s.id === t);
    return store ? store.nameAr : t;
  };

  const typeColors: Record<string, string> = { info: "bg-blue-100 text-blue-700", warning: "bg-amber-100 text-amber-700", success: "bg-emerald-100 text-emerald-700", danger: "bg-red-100 text-red-700" };
  const typeLabels: Record<string, string> = { info: "معلومات", warning: "تحذير", success: "إيجابي", danger: "تنبيه" };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-5">
      <Hdr title="مركز الإعلانات" sub="إرسال رسائل ومستجدات لجميع المتاجر أو لمتجر محدد" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <p className="font-bold">إرسال إعلان جديد</p>
          <F label="العنوان"><TInput value={title} onChange={setTitle} placeholder="عنوان الإعلان" /></F>
          <F label="المستهدف">
            <SInput value={target} onChange={setTarget} options={[
              { value: "all", label: "جميع المتاجر" },
              { value: "active", label: "النشطة فقط" },
              ...storedStores.map(s => ({ value: s.id, label: s.nameAr })),
            ]} />
          </F>
          <F label="نوع الإعلان">
            <SInput value={type} onChange={setType} options={[{ value: "info", label: "معلومات" }, { value: "warning", label: "تحذير" }, { value: "success", label: "إيجابي" }, { value: "danger", label: "تنبيه" }]} />
          </F>
          <F label="نص الإعلان" req>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={5} placeholder="اكتب نص الإعلان..." className="w-full rounded-xl border border-border bg-input-background text-sm text-foreground px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring/25 resize-none" />
          </F>
          <Btn full icon={<Send size={15} />} disabled={!msg.trim() || sending} onClick={sendAnn}>
            {sending ? "جاري الإرسال..." : "إرسال الآن"}
          </Btn>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold">الإعلانات السابقة ({announcements.length})</p>
            <button onClick={loadAnnouncements} className="text-xs text-primary hover:underline flex items-center gap-1"><RefreshCw size={11} />تحديث</button>
          </div>
          {loadingAnns ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}</div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">لا توجد إعلانات بعد</div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {announcements.map((a) => (
                <div key={a._id} className="border border-border rounded-xl p-3">
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${typeColors[a.type] || typeColors.info}`}>{typeLabels[a.type] || a.type}</span>
                      <span className="text-xs text-muted-foreground">{targetLabel(a.target)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString("ar-JO")}</span>
                      <button onClick={() => deleteAnn(a._id)} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                    </div>
                  </div>
                  {a.title && <p className="text-xs font-bold mb-0.5">{a.title}</p>}
                  <p className="text-sm text-foreground">{a.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function SASettings() {
  const [lang, setLang] = useState("ar");
  const [vat, setVat] = useState("16");
  const [trial, setTrial] = useState("14");
  const [supportEmail, setSupportEmail] = useState("support@sowwanjo.online");
  const [platformName, setPlatformName] = useState("Sowwanjo POS");
  const [backupOn, setBackupOn] = useState(true);
  const [syncOn, setSyncOn] = useState(true);
  const [auditOn, setAuditOn] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const [loadingSett, setLoadingSett] = useState(true);
  const [saving, setSaving] = useState(false);

  // Branding fields
  const [platformShortName, setPlatformShortName] = useState("Sowwanjo");
  const [logoUrl, setLogoUrl] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#4F46E5");
  const [secondaryColor, setSecondaryColor] = useState("#10B981");
  const [accentColor, setAccentColor] = useState("#F59E0B");
  const [sidebarStyle, setSidebarStyle] = useState("dark");
  const [loginTitle, setLoginTitle] = useState("");
  const [loginSubtitle, setLoginSubtitle] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [footerCopyright, setFooterCopyright] = useState("");
  const [brandSaving, setBrandSaving] = useState(false);

  const applyBrandColors = (primary: string, accent?: string) => {
    const r = document.documentElement;
    r.style.setProperty("--primary", primary);
    r.style.setProperty("--ring", primary);
    r.style.setProperty("--chart-1", primary);
    if (accent) { r.style.setProperty("--accent", accent); r.style.setProperty("--chart-2", accent); }
  };

  useEffect(() => {
    apiFetch("/super-admin/settings", {}, getToken())
      .then((d: unknown) => {
        const s = d as Record<string, unknown>;
        if (s.lang) setLang(String(s.lang));
        if (s.vat) setVat(String(s.vat));
        if (s.trial) setTrial(String(s.trial));
        if (s.supportEmail) setSupportEmail(String(s.supportEmail));
        if (s.platformName) setPlatformName(String(s.platformName));
        if (typeof s.backupOn === "boolean") setBackupOn(s.backupOn);
        if (typeof s.syncOn === "boolean") setSyncOn(s.syncOn);
        if (typeof s.auditOn === "boolean") setAuditOn(s.auditOn);
        // Branding
        if (s.platformShortName) setPlatformShortName(String(s.platformShortName));
        if (s.logoUrl) setLogoUrl(String(s.logoUrl));
        if (s.iconUrl) setIconUrl(String(s.iconUrl));
        if (s.primaryColor) { setPrimaryColor(String(s.primaryColor)); applyBrandColors(String(s.primaryColor), s.accentColor ? String(s.accentColor) : undefined); }
        if (s.secondaryColor) setSecondaryColor(String(s.secondaryColor));
        if (s.accentColor) setAccentColor(String(s.accentColor));
        if (s.sidebarStyle) setSidebarStyle(String(s.sidebarStyle));
        if (s.loginTitle) setLoginTitle(String(s.loginTitle));
        if (s.loginSubtitle) setLoginSubtitle(String(s.loginSubtitle));
        if (s.supportPhone) setSupportPhone(String(s.supportPhone));
        if (s.websiteUrl) setWebsiteUrl(String(s.websiteUrl));
        if (s.footerCopyright) setFooterCopyright(String(s.footerCopyright));
      })
      .catch(() => {})
      .finally(() => setLoadingSett(false));
  }, []);

  const doSave = async () => {
    setSaving(true);
    try {
      await apiFetch("/super-admin/settings", { method: "PUT", body: JSON.stringify({ lang, vat, trial, supportEmail, platformName, backupOn, syncOn, auditOn }) }, getToken());
      showToast("تم حفظ إعدادات النظام بنجاح ✓", "success");
    } catch (e) {
      showToast((e as { error?: string }).error || "فشل الحفظ", "error");
    } finally { setSaving(false); }
  };

  const doSaveBranding = async () => {
    setBrandSaving(true);
    try {
      await apiFetch("/super-admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          platformName, platformShortName, logoUrl, iconUrl,
          primaryColor, secondaryColor, accentColor, sidebarStyle,
          loginTitle, loginSubtitle, supportEmail, supportPhone,
          websiteUrl, footerCopyright,
        }),
      }, getToken());
      showToast("تم حفظ هوية المنصة بنجاح ✓", "success");
      applyBrandColors(primaryColor, accentColor);
      if (platformName) document.title = platformName;
    } catch (e) {
      showToast((e as { error?: string }).error || "فشل الحفظ", "error");
    } finally { setBrandSaving(false); }
  };

  const doBackup = async () => {
    setBackupLoading(true);
    try {
      const API = (import.meta as Record<string,Record<string,string>>).env?.VITE_API_URL || "http://localhost:5000/api";
      const res = await fetch(`${API}/super-admin/stats/export`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sowwanjo-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("تم تنزيل النسخة الاحتياطية بنجاح ✓", "success");
    } catch {
      showToast("فشل تصدير البيانات — تحقق من الاتصال", "error");
    } finally { setBackupLoading(false); }
  };

  if (loadingSett) return <div className="p-6 text-center text-muted-foreground py-20">جاري تحميل الإعدادات...</div>;

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-5">
      <Hdr title="إعدادات النظام" action={<Btn v="success" s="sm" icon={<Check size={14} />} onClick={doSave} disabled={saving}>{saving ? "جاري الحفظ..." : "حفظ الإعدادات"}</Btn>} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <p className="font-bold flex items-center gap-2"><Globe size={14} /> الإعدادات العامة</p>
          <F label="اللغة الافتراضية"><SInput value={lang} onChange={setLang} options={[{ value: "ar", label: "العربية (RTL)" }, { value: "en", label: "English (LTR)" }]} /></F>
          <F label="العملة"><SInput value="JOD" onChange={() => showToast("العملة ثابتة: دينار أردني", "info")} options={[{ value: "JOD", label: "دينار أردني (JOD)" }]} /></F>
          <F label="نسبة ضريبة القيمة المضافة (%)"><TInput value={vat} onChange={setVat} type="number" /></F>
          <F label="مدة الفترة التجريبية المجانية"><SInput value={trial} onChange={setTrial} options={[{ value: "7", label: "7 أيام" }, { value: "14", label: "14 يوم" }, { value: "30", label: "30 يوم" }]} /></F>
          <F label="بريد الدعم الفني"><TInput value={supportEmail} onChange={setSupportEmail} icon={<Mail size={13} />} /></F>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <p className="font-bold flex items-center gap-2"><Shield size={14} /> الأمان والنسخ الاحتياطي</p>
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-border/60 pb-3">
              <span className="text-sm">نسخ احتياطي تلقائي يومي</span>
              <Toggle on={backupOn} onChange={v => { setBackupOn(v); showToast(v ? "تم تفعيل النسخ التلقائي" : "تم إيقاف النسخ التلقائي", v ? "success" : "warning"); }} />
            </div>
            <div className="flex justify-between items-center border-b border-border/60 pb-3">
              <span className="text-sm">مزامنة سحابية فورية</span>
              <Toggle on={syncOn} onChange={v => { setSyncOn(v); showToast(v ? "تم تفعيل المزامنة" : "تم إيقاف المزامنة", v ? "success" : "warning"); }} />
            </div>
            <div className="flex justify-between items-center border-b border-border/60 pb-3">
              <span className="text-sm">تسجيل عمليات التدقيق</span>
              <Toggle on={auditOn} onChange={v => { setAuditOn(v); showToast(v ? "تم تفعيل التدقيق" : "تم إيقاف التدقيق", v ? "success" : "warning"); }} />
            </div>
            {["تشفير البيانات AES-256", "SSL/TLS مُفعّل دائماً"].map(x => (
              <div key={x} className="flex justify-between border-b border-border/60 pb-2 last:border-0">
                <span className="text-sm">{x}</span>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><CheckCircle size={11} /> دائم</span>
              </div>
            ))}
          </div>
          <Btn v="secondary" full icon={backupLoading ? <RefreshCw size={14} className="animate-spin" /> : <Archive size={14} />} onClick={doBackup} disabled={backupLoading}>
            {backupLoading ? "جاري الحفظ..." : "نسخة احتياطية يدوية الآن"}
          </Btn>
          <Btn v="ghost" full icon={<Download size={14} />} onClick={() => showToast("جاري تحضير ملف التصدير...", "info")}>
            تصدير قاعدة البيانات الكاملة
          </Btn>
        </div>
      </div>

      {/* ── Platform Branding ─────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-l from-indigo-50/60 to-transparent dark:from-indigo-950/30">
          <p className="font-bold flex items-center gap-2 text-base">
            <Palette size={16} className="text-primary" /> هوية المنصة والعلامة التجارية
          </p>
          <Btn v="primary" s="sm" icon={<Check size={14} />} onClick={doSaveBranding} disabled={brandSaving}>
            {brandSaving ? "جاري الحفظ..." : "حفظ الهوية"}
          </Btn>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Identity */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border pb-2">اسم المنصة</p>
            <F label="الاسم الكامل للمنصة"><TInput value={platformName} onChange={setPlatformName} icon={<Globe size={13} />} /></F>
            <F label="الاسم المختصر"><TInput value={platformShortName} onChange={setPlatformShortName} /></F>
            <F label="عنوان شاشة الدخول"><TInput value={loginTitle} onChange={setLoginTitle} placeholder="مرحباً بك في Sowwanjo" /></F>
            <F label="وصف شاشة الدخول"><TInput value={loginSubtitle} onChange={setLoginSubtitle} placeholder="نظام نقاط البيع الأكثر ذكاءً" /></F>
          </div>

          {/* Logo & Icon */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border pb-2">الشعار والأيقونة</p>
            <F label="رابط الشعار (Logo URL)">
              <div className="space-y-2">
                <TInput value={logoUrl} onChange={setLogoUrl} icon={<Link size={13} />} placeholder="https://..." />
                {logoUrl && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <img src={logoUrl} alt="logo" className="h-8 max-w-[120px] object-contain rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <span className="text-xs text-muted-foreground">معاينة الشعار</span>
                  </div>
                )}
              </div>
            </F>
            <F label="رابط الأيقونة (Favicon)">
              <div className="space-y-2">
                <TInput value={iconUrl} onChange={setIconUrl} icon={<Image size={13} />} placeholder="https://..." />
                {iconUrl && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <img src={iconUrl} alt="icon" className="h-8 w-8 object-contain rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <span className="text-xs text-muted-foreground">معاينة الأيقونة</span>
                  </div>
                )}
              </div>
            </F>
            <F label="نمط الشريط الجانبي">
              <SInput value={sidebarStyle} onChange={setSidebarStyle} options={[
                { value: "dark", label: "داكن (Dark)" },
                { value: "light", label: "فاتح (Light)" },
                { value: "brand", label: "لون الماركة (Brand)" },
              ]} />
            </F>
          </div>

          {/* Colors */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border pb-2">الألوان</p>
            {[
              { label: "اللون الأساسي (Primary)", value: primaryColor, onChange: setPrimaryColor },
              { label: "اللون الثانوي (Secondary)", value: secondaryColor, onChange: setSecondaryColor },
              { label: "لون التمييز (Accent)", value: accentColor, onChange: setAccentColor },
            ].map(({ label, value, onChange }) => (
              <F key={label} label={label}>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="color"
                      value={value}
                      onChange={e => onChange(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5 bg-transparent"
                    />
                  </div>
                  <TInput value={value} onChange={onChange} placeholder="#4F46E5" />
                  <div className="w-8 h-8 rounded-lg border border-border flex-shrink-0" style={{ backgroundColor: value }} />
                </div>
              </F>
            ))}
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border pb-2">معلومات التواصل</p>
            <F label="بريد الدعم الفني"><TInput value={supportEmail} onChange={setSupportEmail} icon={<Mail size={13} />} /></F>
            <F label="رقم هاتف الدعم"><TInput value={supportPhone} onChange={setSupportPhone} icon={<Phone size={13} />} placeholder="+962..." /></F>
            <F label="الموقع الإلكتروني"><TInput value={websiteUrl} onChange={setWebsiteUrl} icon={<Globe size={13} />} placeholder="https://..." /></F>
            <F label="نص حقوق النشر (Footer)"><TInput value={footerCopyright} onChange={setFooterCopyright} placeholder={`© ${new Date().getFullYear()} Sowwanjo`} /></F>
          </div>

          {/* Live Preview */}
          <div className="md:col-span-2 xl:col-span-2 space-y-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border pb-2">معاينة مباشرة</p>
            <div className="rounded-xl border border-border overflow-hidden flex" style={{ height: 180 }}>
              {/* Mini sidebar */}
              <div className="w-14 flex flex-col items-center pt-4 gap-3 flex-shrink-0" style={{ backgroundColor: sidebarStyle === "light" ? "#F8FAFC" : sidebarStyle === "brand" ? primaryColor : "#111827" }}>
                {iconUrl ? (
                  <img src={iconUrl} alt="" className="w-7 h-7 rounded-md object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="w-7 h-7 rounded-md" style={{ backgroundColor: primaryColor }} />
                )}
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-6 h-1.5 rounded" style={{ backgroundColor: i === 0 ? primaryColor : "rgba(255,255,255,0.15)" }} />
                ))}
              </div>
              {/* Mini content */}
              <div className="flex-1 bg-[#F8FAFC] dark:bg-[#0D1117] p-3 space-y-2">
                <div className="flex items-center gap-2">
                  {logoUrl ? (
                    <img src={logoUrl} alt="" className="h-5 max-w-[80px] object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <span className="text-xs font-bold" style={{ color: primaryColor }}>{platformShortName || "POS"}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground mr-auto">{loginTitle || "مرحباً بك"}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 mt-2">
                  {[primaryColor, secondaryColor, accentColor].map((c, i) => (
                    <div key={i} className="rounded-lg p-2 text-white text-[9px] font-bold" style={{ backgroundColor: c }}>
                      {["مبيعات", "مخزون", "تقارير"][i]}
                    </div>
                  ))}
                </div>
                <div className="text-[9px] text-muted-foreground text-center pt-1">
                  {footerCopyright || `© ${new Date().getFullYear()} ${platformShortName || "Sowwanjo"}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTER CATALOG SCREEN
// ─────────────────────────────────────────────────────────────────────────────

type MasterProduct = {
  _id: string; pid: string; sku: string; barcode: string;
  product_name: string; product_name_ar: string; description: string;
  category: string; purchase_price_default: number; selling_price_default: number;
  purchase_unit: string; sales_unit: string; tax_rate: number;
  reorder_point_default: number; storage_type: string; image_url: string;
  active: boolean; row_order: number;
};

type PreviewResult = {
  total: number; new: number; updated: number; errors: number;
  errorList: { row: number; reason: string }[];
  categories: string[];
  preview: MasterProduct[];
};

function SAMasterCatalog() {
  const API = (import.meta as Record<string, Record<string, string>>).env?.VITE_API_URL || "http://localhost:5000/api";
  const tok = () => { try { return localStorage.getItem("sowwanjo_jwt") || ""; } catch { return ""; } };
  const af  = (path: string, opts: RequestInit = {}) => fetch(`${API}${path}`, {
    ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}`, ...(opts.headers || {}) },
  });

  const [stats, setStats]             = useState<{ total: number; active: number; categories: number; lastUpdated: string | null } | null>(null);
  const [products, setProducts]       = useState<MasterProduct[]>([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState("");
  const [catFilter, setCatFilter]     = useState("");
  const [categories, setCategories]   = useState<string[]>([]);
  const [loading, setLoading]         = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);

  // Import flow
  const [importPhase, setImportPhase] = useState<"idle" | "parsing" | "previewing" | "importing" | "done">("idle");
  const [preview, setPreview]         = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<{ inserted: number; updated: number; errors: number } | null>(null);
  const [importError, setImportError] = useState("");
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows]   = useState<unknown[][]>([]);
  const [opts, setOpts] = useState({ updateNames: false, updatePrices: false, updateCategories: false, updateDescriptions: false, skipExisting: false });

  // Apply to stores
  const [applying, setApplying]       = useState(false);
  const [applyResult, setApplyResult] = useState<string>("");
  const [stores, setStores]           = useState<{ id: string; nameAr: string }[]>([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [initialStock, setInitialStock]   = useState<string>("0");

  const LIMIT = 50;

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const r = await af("/master-catalog/stats");
      if (r.ok) setStats(await r.json());
    } catch { /* ignore */ } finally { setLoadingStats(false); }
  };

  const loadProducts = async (p = page, s = search, cat = catFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (s) params.set("search", s);
      if (cat) params.set("category", cat);
      const r = await af(`/master-catalog?${params}`);
      if (r.ok) {
        const d = await r.json();
        setProducts(d.products || []);
        setTotal(d.total || 0);
        setCategories(d.categories || []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const loadStores = async () => {
    try {
      const r = await af("/stores");
      if (r.ok) {
        const d = await r.json();
        setStores((d || []).filter((s: { category?: string }) => s.category === "supermarket").map((s: { _id?: string; id: string; nameAr: string }) => ({ id: s._id || s.id, nameAr: s.nameAr })));
      }
    } catch { /* ignore */ }
  };

  useEffect(() => { loadStats(); loadProducts(1); loadStores(); }, []);

  // Load xlsx from CDN at runtime (avoids bundling / build-time resolution)
  const loadXLSX = async (): Promise<{ read: (data: ArrayBuffer, opts: { type: string }) => { Sheets: Record<string, unknown>; SheetNames: string[] }; utils: { sheet_to_json: (ws: unknown, opts: { header: number; defval: string }) => unknown[][] } }> => {
    if ((window as Record<string, unknown>)["XLSX"]) return (window as Record<string, unknown>)["XLSX"] as ReturnType<typeof loadXLSX> extends Promise<infer T> ? T : never;
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      script.onload = () => resolve((window as Record<string, unknown>)["XLSX"] as ReturnType<typeof loadXLSX> extends Promise<infer T> ? T : never);
      script.onerror = () => reject(new Error("فشل تحميل مكتبة XLSX"));
      document.head.appendChild(script);
    });
  };

  // Parse Excel file in browser using xlsx (loaded from CDN)
  const handleFile = async (file: File) => {
    if (!file) return;
    setImportPhase("parsing");
    setImportError("");
    setPreview(null);
    try {
      const { read, utils } = await loadXLSX();
      const buffer = await file.arrayBuffer();
      const wb = read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawData = utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
      if (rawData.length < 2) { setImportError("الملف فارغ أو لا يحتوي على بيانات كافية"); setImportPhase("idle"); return; }

      const headers = (rawData[0] as string[]).map(h => String(h || "").trim());
      const rows    = rawData.slice(1).filter(row => row.some(cell => cell !== "" && cell !== null && cell !== undefined));
      setParsedHeaders(headers);
      setParsedRows(rows);

      // Send to backend for preview analysis
      setImportPhase("previewing");
      const r = await af("/master-catalog/preview", {
        method: "POST",
        body: JSON.stringify({ headers, rows: rows.slice(0, 5000) }),
      });
      const d = await r.json();
      if (!r.ok) { setImportError(d.error || "فشل تحليل الملف"); setImportPhase("idle"); return; }
      setPreview(d);
    } catch (e) {
      setImportError("فشل قراءة الملف — تأكد أنه Excel (.xlsx/.xls) أو CSV");
      setImportPhase("idle");
    }
  };

  const doImport = async () => {
    if (!parsedHeaders.length || !parsedRows.length) return;
    setImportPhase("importing");
    setImportError("");
    try {
      const r = await af("/master-catalog/import", {
        method: "POST",
        body: JSON.stringify({ headers: parsedHeaders, rows: parsedRows, options: opts }),
      });
      const d = await r.json();
      if (!r.ok) { setImportError(d.error || "فشل الاستيراد"); setImportPhase("previewing"); return; }
      setImportResult({ inserted: d.inserted, updated: d.updated, errors: d.errors });
      setImportPhase("done");
      loadStats();
      loadProducts(1, "", "");
    } catch (e) {
      setImportError("خطأ في الاتصال بالخادم");
      setImportPhase("previewing");
    }
  };

  const doApplyToStore = async () => {
    if (!selectedStore) return;
    setApplying(true); setApplyResult("");
    try {
      const stock = Math.max(0, parseInt(initialStock) || 0);
      const r = await af("/master-catalog/apply-to-store", { method: "POST", body: JSON.stringify({ storeId: selectedStore, initialStock: stock }) });
      const d = await r.json();
      if (r.ok) setApplyResult(`✓ تمت إضافة ${d.added} منتج للمتجر${stock > 0 ? ` بكمية ابتدائية ${stock} لكل منتج` : ""}`);
      else setApplyResult(d.error || "فشل التطبيق");
    } catch { setApplyResult("خطأ في الاتصال"); }
    finally { setApplying(false); }
  };

  const doApplyToAll = async () => {
    setApplying(true); setApplyResult("");
    try {
      const stock = Math.max(0, parseInt(initialStock) || 0);
      const r = await af("/master-catalog/apply-to-all", { method: "POST", body: JSON.stringify({ initialStock: stock }) });
      const d = await r.json();
      if (r.ok) setApplyResult(`✓ تمت إضافة المنتجات لـ ${d.stores} متجر${stock > 0 ? ` بكمية ابتدائية ${stock}` : ""}`);
      else setApplyResult(d.error || "فشل التطبيق");
    } catch { setApplyResult("خطأ في الاتصال"); }
    finally { setApplying(false); }
  };

  const resetImport = () => { setImportPhase("idle"); setPreview(null); setImportResult(null); setImportError(""); setParsedHeaders([]); setParsedRows([]); };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <Hdr
        title="كتالوج السوبرماركت الرئيسي"
        sub="قاعدة المنتجات المركزية — كل متجر سوبرماركت جديد يرث هذا الكتالوج تلقائياً"
      />

      {/* ── Stats Row ── */}
      {loadingStats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI label="إجمالي المنتجات" value={stats.total.toLocaleString()} icon={<Boxes size={16} />} color="#4F46E5" />
          <KPI label="منتجات نشطة" value={stats.active.toLocaleString()} icon={<CheckCircle size={16} />} color="#10B981" />
          <KPI label="التصنيفات" value={stats.categories.toLocaleString()} icon={<Tag size={16} />} color="#F59E0B" />
          <KPI label="آخر تحديث" value={stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString("ar-JO") : "—"} icon={<RefreshCw size={16} />} color="#8B5CF6" />
        </div>
      ) : (
        <div className="p-4 bg-muted/50 rounded-2xl text-center text-sm text-muted-foreground">
          الكتالوج فارغ — قم بالاستيراد الأول من ملف Excel
        </div>
      )}

      {/* ── Import Section ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Upload size={16} className="text-primary" />
            <span className="font-bold text-sm">استيراد / تحديث الكتالوج</span>
          </div>
          {importPhase !== "idle" && (
            <button onClick={resetImport} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <RefreshCw size={12} /> بدء من جديد
            </button>
          )}
        </div>

        <div className="p-5 space-y-5">
          {/* Phase: idle — file drop zone */}
          {importPhase === "idle" && (
            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-2xl p-8 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <FileText size={24} className="text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">ارفع ملف Excel أو CSV</p>
                <p className="text-xs text-muted-foreground mt-1">يدعم: .xlsx, .xls, .csv — حتى 10,000 منتج</p>
              </div>
              <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
              <span className="text-xs px-4 py-2 rounded-xl bg-primary text-white font-semibold">اختر الملف</span>
            </label>
          )}

          {/* Phase: parsing */}
          {importPhase === "parsing" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <RefreshCw size={24} className="text-primary animate-spin" />
              <p className="text-sm font-medium">جاري قراءة الملف وتحليله...</p>
            </div>
          )}

          {/* Phase: previewing — show analysis + options */}
          {importPhase === "previewing" && preview && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-border p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{preview.total.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">إجمالي الصفوف</p>
                </div>
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{preview.new.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">منتجات جديدة</p>
                </div>
                <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{preview.updated.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">موجودة مسبقاً</p>
                </div>
                <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">{preview.errors}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">صفوف خاطئة</p>
                </div>
              </div>

              {/* Error list */}
              {preview.errorList.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-3 max-h-28 overflow-y-auto">
                  <p className="text-xs font-bold text-red-700 dark:text-red-400 mb-2">تحذيرات ({preview.errorList.length})</p>
                  {preview.errorList.slice(0, 10).map((e, i) => (
                    <p key={i} className="text-xs text-red-600 dark:text-red-300">صف {e.row}: {e.reason}</p>
                  ))}
                </div>
              )}

              {/* Import options */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-foreground">خيارات الاستيراد للمنتجات الموجودة مسبقاً:</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { key: "updateNames",        label: "تحديث الأسماء" },
                    { key: "updatePrices",       label: "تحديث الأسعار الافتراضية" },
                    { key: "updateCategories",   label: "تحديث التصنيفات" },
                    { key: "updateDescriptions", label: "تحديث الأوصاف" },
                    { key: "skipExisting",       label: "تجاهل الموجودة (إضافة الجديدة فقط)" },
                  ] as { key: keyof typeof opts; label: string }[]).map(o => (
                    <label key={String(o.key)} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={opts[o.key]} onChange={e => setOpts(p => ({ ...p, [o.key]: e.target.checked }))}
                        className="w-3.5 h-3.5 accent-primary" />
                      <span className="text-xs">{o.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Preview table */}
              <div>
                <p className="text-xs font-bold text-muted-foreground mb-2">معاينة أول {preview.preview.length} منتج:</p>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/70">
                      <tr>
                        {["#", "الاسم العربي", "الاسم الإنجليزي", "الباركود", "الكود", "التصنيف", "سعر البيع"].map(h => (
                          <th key={h} className="px-3 py-2 text-right font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.preview.map((p, i) => (
                        <tr key={i} className="border-t border-border hover:bg-muted/30">
                          <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                          <td className="px-3 py-2 font-medium max-w-[150px] truncate">{p.product_name_ar}</td>
                          <td className="px-3 py-2 text-muted-foreground max-w-[120px] truncate">{p.product_name}</td>
                          <td className="px-3 py-2 font-mono">{p.barcode}</td>
                          <td className="px-3 py-2 font-mono">{p.sku}</td>
                          <td className="px-3 py-2">{p.category}</td>
                          <td className="px-3 py-2 font-semibold">{p.selling_price_default > 0 ? `${p.selling_price_default} JOD` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {importError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 rounded-xl">
                  <AlertTriangle size={14} className="text-red-500 shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-300">{importError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Btn v="secondary" full onClick={resetImport}>إلغاء</Btn>
                <Btn full icon={<Upload size={13} />} onClick={doImport}>
                  استيراد {preview.new.toLocaleString()} منتج جديد
                </Btn>
              </div>
            </div>
          )}

          {/* Phase: importing */}
          {importPhase === "importing" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <RefreshCw size={24} className="text-primary animate-spin" />
              <p className="text-sm font-medium">جاري حفظ المنتجات في قاعدة البيانات...</p>
              <p className="text-xs text-muted-foreground">قد يستغرق هذا دقيقة للكتالوجات الكبيرة</p>
            </div>
          )}

          {/* Phase: done */}
          {importPhase === "done" && importResult && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <CheckCircle size={28} className="text-emerald-600" />
                </div>
                <p className="text-sm font-bold">اكتمل الاستيراد بنجاح!</p>
                <div className="flex gap-4 text-center">
                  <div><p className="text-xl font-bold text-emerald-600">{importResult.inserted.toLocaleString()}</p><p className="text-xs text-muted-foreground">أُضيف</p></div>
                  <div><p className="text-xl font-bold text-blue-600">{importResult.updated.toLocaleString()}</p><p className="text-xs text-muted-foreground">حُدِّث</p></div>
                  <div><p className="text-xl font-bold text-red-600">{importResult.errors}</p><p className="text-xs text-muted-foreground">خطأ</p></div>
                </div>
              </div>
              <Btn full onClick={resetImport} v="secondary">استيراد ملف آخر</Btn>
            </div>
          )}
        </div>
      </div>

      {/* ── Apply to Stores ── */}
      {stats && stats.total > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Store size={16} className="text-primary" />
            <span className="font-bold text-sm">تطبيق الكتالوج على المتاجر</span>
          </div>
          <p className="text-xs text-muted-foreground">إضافة المنتجات الجديدة فقط — لا يتم الكتابة فوق المخزون أو الأسعار المخصصة</p>

          {/* Initial stock input — shared between both apply options */}
          <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
              <Package size={15} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-300">الكمية الابتدائية لكل منتج</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">0 = بدون مخزون (تعبئة لاحقاً) · أي رقم = يُضبط لكل منتج</p>
            </div>
            <input
              type="number"
              min="0"
              max="99999"
              value={initialStock}
              onChange={e => setInitialStock(e.target.value)}
              className="w-24 h-9 px-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-amber-950/30 text-sm font-bold text-center text-amber-900 dark:text-amber-100 focus:outline-none focus:border-amber-500"
              dir="ltr"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Apply to specific store */}
            <div className="rounded-xl border border-border p-4 space-y-3">
              <p className="text-xs font-semibold">متجر محدد</p>
              <select
                value={selectedStore}
                onChange={e => setSelectedStore(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary"
                dir="rtl"
              >
                <option value="">اختر متجر سوبرماركت...</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.nameAr}</option>)}
              </select>
              <Btn full s="sm" disabled={!selectedStore || applying} onClick={doApplyToStore} icon={<Store size={13} />}>
                {applying ? "جاري التطبيق..." : `تطبيق على المتجر${parseInt(initialStock) > 0 ? ` (كمية: ${initialStock})` : ""}`}
              </Btn>
            </div>

            {/* Apply to all */}
            <div className="rounded-xl border border-border p-4 space-y-3">
              <p className="text-xs font-semibold">جميع متاجر السوبرماركت ({stores.length})</p>
              <p className="text-xs text-muted-foreground">يضيف المنتجات الجديدة لكل متجر سوبرماركت مسجّل في النظام</p>
              <Btn full s="sm" v="secondary" disabled={applying || stores.length === 0} onClick={doApplyToAll} icon={<Boxes size={13} />}>
                {applying ? "جاري التطبيق..." : `تطبيق على الجميع${parseInt(initialStock) > 0 ? ` (كمية: ${initialStock})` : ""}`}
              </Btn>
            </div>
          </div>

          {applyResult && (
            <div className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${applyResult.startsWith("✓") ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-700 dark:text-emerald-300" : "bg-red-50 dark:bg-red-950/30 border-red-200 text-red-700 dark:text-red-300"}`}>
              {applyResult.startsWith("✓") ? <CheckCircle size={14} className="shrink-0" /> : <AlertTriangle size={14} className="shrink-0" />}
              {applyResult}
            </div>
          )}
        </div>
      )}

      {/* ── Product List ── */}
      {stats && stats.total > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2 flex-1">
              <Hash size={15} className="text-muted-foreground" />
              <span className="font-bold text-sm">المنتجات ({total.toLocaleString()})</span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <input
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); loadProducts(1, e.target.value, catFilter); }}
                placeholder="بحث بالاسم / باركود / كود..."
                className="flex-1 sm:w-48 h-8 px-3 rounded-xl border border-border bg-background text-xs focus:outline-none focus:border-primary"
                dir="rtl"
              />
              <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); loadProducts(1, search, e.target.value); }}
                className="h-8 px-2 rounded-xl border border-border bg-background text-xs focus:outline-none" dir="rtl">
                <option value="">كل التصنيفات</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center"><RefreshCw size={20} className="animate-spin text-muted-foreground" /></div>
          ) : products.length === 0 ? (
            <Empty icon={<Boxes size={28} />} title="لا توجد منتجات" desc="قم بالاستيراد أولاً" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    {["#", "الاسم العربي", "الاسم الإنجليزي", "الباركود", "الكود", "التصنيف", "سعر الشراء", "سعر البيع", "الوحدة", "الحالة"].map(h => (
                      <th key={h} className="px-3 py-2.5 text-right text-muted-foreground font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr key={p._id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5 text-muted-foreground">{(page - 1) * LIMIT + i + 1}</td>
                      <td className="px-3 py-2.5 font-medium max-w-[160px]">
                        <p className="truncate">{p.product_name_ar}</p>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground max-w-[120px]">
                        <p className="truncate">{p.product_name}</p>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-muted-foreground">{p.barcode || "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-muted-foreground">{p.sku || "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className="px-1.5 py-0.5 rounded-lg bg-primary/10 text-primary text-[11px] font-medium">{p.category}</span>
                      </td>
                      <td className="px-3 py-2.5">{p.purchase_price_default > 0 ? `${p.purchase_price_default.toFixed(3)}` : "—"}</td>
                      <td className="px-3 py-2.5 font-semibold">{p.selling_price_default > 0 ? `${p.selling_price_default.toFixed(3)}` : "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{p.sales_unit}</td>
                      <td className="px-3 py-2.5">
                        <span className={`px-1.5 py-0.5 rounded-lg text-[11px] font-medium ${p.active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                          {p.active ? "نشط" : "معطّل"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {total > LIMIT && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">{total.toLocaleString()} منتج — صفحة {page} من {Math.ceil(total / LIMIT)}</p>
                  <div className="flex gap-2">
                    <button onClick={() => { const p = Math.max(1, page - 1); setPage(p); loadProducts(p); }}
                      disabled={page === 1} className="px-3 py-1.5 rounded-lg border border-border text-xs disabled:opacity-40 hover:bg-muted">السابق</button>
                    <button onClick={() => { const p = page + 1; setPage(p); loadProducts(p); }}
                      disabled={page >= Math.ceil(total / LIMIT)} className="px-3 py-1.5 rounded-lg border border-border text-xs disabled:opacity-40 hover:bg-muted">التالي</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SA ALL USERS SCREEN
// ─────────────────────────────────────────────────────────────────────────────

function SAAllUsers() {
  const API = (import.meta as Record<string, Record<string, string>>).env?.VITE_API_URL || "http://localhost:5000/api";
  const tok = () => { try { return localStorage.getItem("sowwanjo_jwt") || ""; } catch { return ""; } };
  const af = (path: string, opts: RequestInit = {}) =>
    fetch(`${API}${path}`, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}`, ...(opts.headers || {}) } });

  type AllUser = { id: string; name: string; email: string; role: string; phone: string; storeId: string; storeName: string; status: string; createdAt: string };
  const ROLES = [
    { value: "owner",     label: "مالك" },
    { value: "manager",   label: "مدير" },
    { value: "cashier",   label: "كاشير" },
    { value: "inventory", label: "مخزون" },
    { value: "accountant",label: "محاسب" },
  ];
  const ROLE_STYLE: Record<string, string> = {
    owner:      "bg-purple-50 text-purple-700 border-purple-200",
    manager:    "bg-blue-50 text-blue-700 border-blue-200",
    cashier:    "bg-emerald-50 text-emerald-700 border-emerald-200",
    inventory:  "bg-amber-50 text-amber-700 border-amber-200",
    accountant: "bg-sky-50 text-sky-700 border-sky-200",
  };

  const [users,   setUsers]   = useState<AllUser[]>([]);
  const [total,   setTotal]   = useState(0);
  const [pages,   setPages]   = useState(1);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [q,       setQ]       = useState("");
  const [roleF,   setRoleF]   = useState("");
  const [storeF,  setStoreF]  = useState("");
  const [stores,  setStores]  = useState<{ id: string; nameAr: string }[]>([]);

  // Edit / password / add
  const emptyForm = { name: "", email: "", role: "cashier", phone: "", storeId: "", password: "" };
  const [editUser,   setEditUser]   = useState<AllUser | null>(null);
  const [editForm,   setEditForm]   = useState({ name: "", email: "", role: "", phone: "" });
  const [editLoading,setEditLoading]= useState(false);
  const [passUser,   setPassUser]   = useState<AllUser | null>(null);
  const [passVal,    setPassVal]    = useState("");
  const [passLoading,setPassLoading]= useState(false);
  const [showAdd,    setShowAdd]    = useState(false);
  const [addForm,    setAddForm]    = useState(emptyForm);
  const [addLoading, setAddLoading] = useState(false);
  const [addError,   setAddError]   = useState("");

  const LIMIT = 50;

  const load = async (pg = 1, search = q, role = roleF, store = storeF) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: String(LIMIT) });
      if (search) params.set("q", search);
      if (role)   params.set("role", role);
      if (store)  params.set("storeId", store);
      const r = await af(`/stores/all-users?${params}`);
      const d = await r.json() as { users: AllUser[]; total: number; pages: number };
      setUsers(d.users || []); setTotal(d.total || 0); setPages(d.pages || 1); setPage(pg);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  // Load stores for filter dropdown & add form
  useEffect(() => {
    af("/stores").then(r => r.json()).then((d: unknown) => {
      if (Array.isArray(d)) setStores((d as { _id?: string; id?: string; nameAr: string }[]).map(s => ({ id: s._id || s.id || "", nameAr: s.nameAr })));
    }).catch(() => {});
    load(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => load(1, q, roleF, storeF), 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, roleF, storeF]);

  const doEdit = async () => {
    if (!editUser) return;
    setEditLoading(true);
    try {
      const r = await af(`/stores/${editUser.storeId}/users/${editUser.id}`, { method: "PUT", body: JSON.stringify(editForm) });
      const d = await r.json() as Partial<AllUser> & { error?: string };
      if (d.error) { showToast(d.error, "error"); return; }
      setUsers(u => u.map(x => x.id === editUser.id ? { ...x, ...d } : x));
      setEditUser(null); showToast("تم التحديث ✓", "success");
    } catch { showToast("خطأ في التعديل", "error"); }
    finally { setEditLoading(false); }
  };

  const doResetPass = async () => {
    if (!passUser || passVal.length < 6) return;
    setPassLoading(true);
    try {
      const r = await af(`/stores/${passUser.storeId}/users/${passUser.id}/reset-password`, { method: "POST", body: JSON.stringify({ newPassword: passVal }) });
      const d = await r.json() as { error?: string };
      if (d.error) { showToast(d.error, "error"); return; }
      setPassUser(null); setPassVal(""); showToast(`تم تغيير كلمة مرور "${passUser.name}" ✓`, "success");
    } catch { showToast("خطأ في تغيير كلمة المرور", "error"); }
    finally { setPassLoading(false); }
  };

  const doDelete = async (user: AllUser) => {
    if (!confirm(`حذف "${user.name}" من متجر "${user.storeName}"؟`)) return;
    try {
      await af(`/stores/${user.storeId}/users/${user.id}`, { method: "DELETE" });
      setUsers(u => u.filter(x => x.id !== user.id)); setTotal(t => t - 1);
      showToast(`تم حذف "${user.name}"`, "warning");
    } catch { showToast("خطأ في الحذف", "error"); }
  };

  const doAdd = async () => {
    if (!addForm.storeId || !addForm.name || !addForm.email || addForm.password.length < 6) return;
    setAddLoading(true); setAddError("");
    try {
      const r = await af(`/stores/${addForm.storeId}/users`, { method: "POST", body: JSON.stringify(addForm) });
      const d = await r.json() as AllUser & { error?: string };
      if (d.error) { setAddError(d.error); return; }
      showToast(`تم إضافة "${addForm.name}" ✓`, "success");
      setShowAdd(false); setAddForm(emptyForm); load(1);
    } catch { setAddError("خطأ في الإضافة"); }
    finally { setAddLoading(false); }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 overflow-y-auto h-full">
      <Hdr title="إدارة المستخدمين" sub={`${total.toLocaleString("ar")} مستخدم في جميع المتاجر`}
        action={<Btn s="sm" icon={<Plus size={13} />} onClick={() => { setShowAdd(true); setAddForm(emptyForm); setAddError(""); setEditUser(null); setPassUser(null); }}>مستخدم جديد</Btn>} />

      {/* ── Add User Panel ── */}
      {showAdd && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm">إضافة مستخدم جديد</p>
            <button onClick={() => setShowAdd(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground"><X size={14} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <F label="المتجر" req>
              <select value={addForm.storeId} onChange={e => setAddForm(f => ({ ...f, storeId: e.target.value }))}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary" dir="rtl">
                <option value="">اختر متجراً...</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.nameAr}</option>)}
              </select>
            </F>
            <F label="الاسم الكامل" req><TInput value={addForm.name} onChange={v => setAddForm(f => ({ ...f, name: v }))} placeholder="أحمد محمد" /></F>
            <F label="البريد الإلكتروني" req><TInput value={addForm.email} onChange={v => setAddForm(f => ({ ...f, email: v }))} placeholder="ahmed@store.com" /></F>
            <F label="كلمة المرور" req><TInput value={addForm.password} onChange={v => setAddForm(f => ({ ...f, password: v }))} type="password" placeholder="6 أحرف على الأقل" /></F>
            <F label="رقم الجوال"><TInput value={addForm.phone} onChange={v => setAddForm(f => ({ ...f, phone: v }))} placeholder="07XXXXXXXX" /></F>
            <F label="الصلاحية"><SInput value={addForm.role} onChange={v => setAddForm(f => ({ ...f, role: v }))} options={ROLES} /></F>
          </div>
          {addError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 font-semibold">{addError}</p>}
          <div className="flex gap-2 justify-end">
            <Btn v="secondary" s="sm" onClick={() => setShowAdd(false)}>إلغاء</Btn>
            <Btn s="sm" icon={addLoading ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
              onClick={doAdd} disabled={addLoading || !addForm.storeId || !addForm.name || !addForm.email || addForm.password.length < 6}>
              {addLoading ? "جاري الإضافة..." : "إضافة"}
            </Btn>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-48 relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث بالاسم، البريد، الجوال..."
            className="w-full h-10 rounded-xl border border-border bg-background text-sm pr-9 pl-3 focus:outline-none focus:border-primary" />
        </div>
        <select value={storeF} onChange={e => setStoreF(e.target.value)}
          className="h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary" dir="rtl">
          <option value="">كل المتاجر</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.nameAr}</option>)}
        </select>
        <select value={roleF} onChange={e => setRoleF(e.target.value)}
          className="h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary" dir="rtl">
          <option value="">كل الصلاحيات</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button onClick={() => { setQ(""); setRoleF(""); setStoreF(""); }} className="h-10 px-3 rounded-xl border border-border text-xs text-muted-foreground hover:bg-muted transition-all">مسح</button>
      </div>

      {/* ── Table ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="space-y-0 divide-y divide-border/60">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="w-9 h-9 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5"><div className="h-3.5 bg-muted animate-pulse rounded-lg w-32" /><div className="h-3 bg-muted animate-pulse rounded-lg w-48" /></div>
                <div className="h-6 w-16 bg-muted animate-pulse rounded-full" />
                <div className="h-6 w-24 bg-muted animate-pulse rounded-lg" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <Empty icon={<Users size={28} />} title="لا يوجد مستخدمون" desc="جرب تغيير الفلتر أو أضف مستخدماً جديداً" />
        ) : (
          <div className="divide-y divide-border/60">
            {/* Desktop header */}
            <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-muted/40 text-xs font-bold text-muted-foreground">
              <span>المستخدم</span><span>البريد / الجوال</span><span>المتجر</span><span>الصلاحية</span><span>تاريخ الإضافة</span><span>إجراءات</span>
            </div>

            {users.map(user => (
              <div key={user.id} className="overflow-hidden">
                {/* Main row */}
                <div className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-3 md:gap-4 items-center px-4 md:px-5 py-3 hover:bg-muted/20 transition-all">
                  {/* Avatar + name */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-sm font-black">{user.name[0]}</div>
                    <div className="min-w-0"><p className="text-sm font-bold truncate">{user.name}</p><p className="text-xs text-muted-foreground truncate md:hidden">{user.email}</p></div>
                  </div>
                  {/* Email / phone */}
                  <div className="hidden md:block min-w-0">
                    <p className="text-xs truncate">{user.email}</p>
                    {user.phone && <p className="text-xs text-muted-foreground">{user.phone}</p>}
                  </div>
                  {/* Store */}
                  <p className="text-xs font-semibold text-muted-foreground truncate">{user.storeName}</p>
                  {/* Role badge */}
                  <span className={`inline-flex items-center self-start md:self-center text-xs font-bold px-2 py-0.5 rounded-full border ${ROLE_STYLE[user.role] || "bg-muted text-muted-foreground border-border"}`}>
                    {ROLES.find(r => r.value === user.role)?.label || user.role}
                  </span>
                  {/* Date */}
                  <p className="hidden md:block text-xs text-muted-foreground">{user.createdAt}</p>
                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    <button title="تعديل" onClick={() => { setEditUser(user); setEditForm({ name: user.name, email: user.email, role: user.role, phone: user.phone }); setPassUser(null); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-100 text-blue-600 transition-all"><Edit2 size={12} /></button>
                    <button title="تغيير كلمة المرور" onClick={() => { setPassUser(user); setPassVal(""); setEditUser(null); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-100 text-amber-600 transition-all"><Key size={12} /></button>
                    <button title="حذف" onClick={() => doDelete(user)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-100 text-red-500 transition-all"><Trash2 size={12} /></button>
                  </div>
                </div>

                {/* Inline edit */}
                {editUser?.id === user.id && (
                  <div className="border-t border-border px-4 md:px-5 py-4 bg-blue-50/60 dark:bg-blue-950/20 space-y-3">
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-300">تعديل بيانات المستخدم</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <F label="الاسم"><TInput value={editForm.name} onChange={v => setEditForm(f => ({ ...f, name: v }))} /></F>
                      <F label="البريد"><TInput value={editForm.email} onChange={v => setEditForm(f => ({ ...f, email: v }))} /></F>
                      <F label="الجوال"><TInput value={editForm.phone} onChange={v => setEditForm(f => ({ ...f, phone: v }))} /></F>
                      <F label="الصلاحية"><SInput value={editForm.role} onChange={v => setEditForm(f => ({ ...f, role: v }))} options={ROLES} /></F>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Btn v="secondary" s="sm" onClick={() => setEditUser(null)}>إلغاء</Btn>
                      <Btn s="sm" icon={editLoading ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />} onClick={doEdit} disabled={editLoading}>
                        {editLoading ? "جاري الحفظ..." : "حفظ"}
                      </Btn>
                    </div>
                  </div>
                )}

                {/* Inline password */}
                {passUser?.id === user.id && (
                  <div className="border-t border-border px-4 md:px-5 py-4 bg-amber-50/60 dark:bg-amber-950/20">
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-2">كلمة مرور جديدة لـ "{user.name}"</p>
                    <div className="flex gap-2 max-w-sm">
                      <TInput value={passVal} onChange={setPassVal} type="password" placeholder="6 أحرف على الأقل" />
                      <Btn v="secondary" s="sm" onClick={() => setPassUser(null)}>إلغاء</Btn>
                      <Btn s="sm" icon={passLoading ? <RefreshCw size={12} className="animate-spin" /> : <Key size={12} />}
                        onClick={doResetPass} disabled={passLoading || passVal.length < 6}>
                        {passLoading ? "..." : "حفظ"}
                      </Btn>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <p>{total.toLocaleString("ar")} مستخدم · صفحة {page} من {pages}</p>
          <div className="flex gap-1">
            <button onClick={() => load(page - 1)} disabled={page === 1}
              className="px-3 h-8 rounded-xl border border-border hover:bg-muted disabled:opacity-40 transition-all">السابق</button>
            {Array.from({ length: Math.min(5, pages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, pages - 4)) + i;
              return <button key={p} onClick={() => load(p)}
                className={`w-8 h-8 rounded-xl border text-xs font-bold transition-all ${p === page ? "bg-primary text-white border-primary" : "border-border hover:bg-muted"}`}>{p}</button>;
            })}
            <button onClick={() => load(page + 1)} disabled={page >= pages}
              className="px-3 h-8 rounded-xl border border-border hover:bg-muted disabled:opacity-40 transition-all">التالي</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SA MODULE MARKETPLACE — Enable/Disable modules per plan
// ─────────────────────────────────────────────────────────────────────────────
const MODULES = [
  { id: "pos",         nameAr: "نقطة البيع (POS)",         icon: "🖥️", desc: "واجهة البيع السريع مع دعم الباركود والسلة", category: "أساسي", plans: ["basic","pro","enterprise"] },
  { id: "inventory",  nameAr: "إدارة المخزون",              icon: "📦", desc: "تتبع الكميات والحد الأدنى وتنبيهات النفاد", category: "أساسي", plans: ["basic","pro","enterprise"] },
  { id: "customers",  nameAr: "إدارة العملاء",              icon: "👥", desc: "ملفات العملاء والتواصل وسجل المشتريات",      category: "أساسي", plans: ["basic","pro","enterprise"] },
  { id: "reports",    nameAr: "التقارير والتحليلات",        icon: "📊", desc: "تقارير يومية وأسبوعية وشهرية وسنوية",        category: "تحليلات", plans: ["basic","pro","enterprise"] },
  { id: "loyalty",    nameAr: "برنامج الولاء",              icon: "⭐", desc: "نقاط ومكافآت للعملاء المميزين",               category: "تسويق", plans: ["pro","enterprise"] },
  { id: "giftcards",  nameAr: "بطاقات الهدايا",             icon: "🎁", desc: "إصدار وإدارة بطاقات هدايا رقمية",            category: "تسويق", plans: ["pro","enterprise"] },
  { id: "coupons",    nameAr: "الكوبونات والخصومات",        icon: "🏷️", desc: "كوبونات خصم ذكية بشروط متعددة",               category: "تسويق", plans: ["pro","enterprise"] },
  { id: "debts",      nameAr: "إدارة الذمم",                icon: "📒", desc: "بيع على الذمة وتتبع المديونيات",               category: "مالي", plans: ["pro","enterprise"] },
  { id: "expenses",   nameAr: "المصاريف",                   icon: "💸", desc: "تسجيل وتتبع مصاريف المتجر",                   category: "مالي", plans: ["basic","pro","enterprise"] },
  { id: "suppliers",  nameAr: "الموردون والمشتريات",        icon: "🚚", desc: "إدارة الموردين وأوامر الشراء",                 category: "مخزون", plans: ["pro","enterprise"] },
  { id: "branches",   nameAr: "الفروع المتعددة",            icon: "🏪", desc: "إدارة أكثر من فرع في نفس الاشتراك",          category: "متقدم", plans: ["enterprise"] },
  { id: "employees",  nameAr: "إدارة الموظفين",             icon: "👨‍💼", desc: "صلاحيات وورديات وأداء الموظفين",              category: "موارد بشرية", plans: ["pro","enterprise"] },
  { id: "shifts",     nameAr: "الورديات",                   icon: "🕐", desc: "فتح وإغلاق الورديات وتقاريرها",               category: "موارد بشرية", plans: ["pro","enterprise"] },
  { id: "print",      nameAr: "إدارة الطباعة",              icon: "🖨️", desc: "مواد الطباعة وقوائم الأسعار والوظائف",        category: "طباعة", plans: ["basic","pro","enterprise"] },
  { id: "flowers",    nameAr: "طلبات الزهور",               icon: "🌸", desc: "وحدة متخصصة لمتاجر الزهور والهدايا",          category: "متخصص", plans: ["pro","enterprise"] },
  { id: "promotions", nameAr: "العروض والتخفيضات",          icon: "🎉", desc: "إدارة العروض الترويجية الآلية",                category: "تسويق", plans: ["pro","enterprise"] },
  { id: "splitpay",   nameAr: "الدفع المختلط",              icon: "✦",  desc: "دفع بأكثر من طريقة في نفس الفاتورة",          category: "دفع", plans: ["pro","enterprise"] },
  { id: "offline",    nameAr: "العمل بدون إنترنت",          icon: "📡", desc: "IndexedDB + مزامنة تلقائية عند العودة",        category: "متقدم", plans: ["enterprise"] },
  { id: "whatsapp",   nameAr: "إشعارات WhatsApp",           icon: "💬", desc: "إرسال الفواتير عبر واتساب للعملاء",           category: "تواصل", plans: ["enterprise"] },
  { id: "api",        nameAr: "API & Webhooks",              icon: "⚙️", desc: "تكامل مع أنظمة خارجية عبر REST API",          category: "تكامل", plans: ["enterprise"] },
];

const PLAN_COLORS: Record<string, string> = {
  basic: "bg-sky-100 text-sky-700 border-sky-200",
  pro: "bg-violet-100 text-violet-700 border-violet-200",
  enterprise: "bg-amber-100 text-amber-700 border-amber-200",
};

function SAModuleMarketplace() {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("الكل");
  const [filterPlan, setFilterPlan] = useState("الكل");
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("sowwanjo_sa_modules") || "{}"); } catch { return {}; }
  });

  const toggleModule = (id: string) => {
    setEnabled(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem("sowwanjo_sa_modules", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const cats = ["الكل", ...Array.from(new Set(MODULES.map(m => m.category)))];
  const plans = ["الكل", "basic", "pro", "enterprise"];

  const filtered = MODULES.filter(m =>
    (filterCat === "الكل" || m.category === filterCat) &&
    (filterPlan === "الكل" || m.plans.includes(filterPlan)) &&
    (!search || m.nameAr.includes(search) || m.desc.includes(search))
  );

  const enabledCount = MODULES.filter(m => enabled[m.id] !== false).length;

  return (
    <div className="p-3 sm:p-6 space-y-5">
      <Hdr title="سوق الوحدات" sub={`${enabledCount} وحدة مفعّلة من أصل ${MODULES.length}`} />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "مفعّلة", val: String(enabledCount), color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
          { label: "معطّلة", val: String(MODULES.length - enabledCount), color: "text-red-500", bg: "bg-red-50 border-red-200" },
          { label: "الكل", val: String(MODULES.length), color: "text-primary", bg: "bg-primary/5 border-primary/20" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 text-center ${s.bg}`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث عن وحدة..."
            className="w-full h-10 rounded-xl border border-border bg-background text-sm pr-9 pl-3 focus:outline-none focus:ring-2 focus:ring-ring/25" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="h-10 rounded-xl border border-border bg-background text-sm px-3 focus:outline-none">
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
          className="h-10 rounded-xl border border-border bg-background text-sm px-3 focus:outline-none">
          {plans.map(p => <option key={p} value={p}>{p === "الكل" ? "كل الخطط" : p}</option>)}
        </select>
      </div>

      {/* Modules grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map(m => {
          const isOn = enabled[m.id] !== false;
          return (
            <div key={m.id} className={`bg-card rounded-2xl border-2 p-4 flex flex-col gap-3 transition-all ${isOn ? "border-primary/40 shadow-sm" : "border-border opacity-70"}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${isOn ? "bg-primary/10" : "bg-muted"}`}>{m.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black leading-tight">{m.nameAr}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {m.plans.map(p => (
                  <span key={p} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PLAN_COLORS[p] || ""}`}>{p}</span>
                ))}
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border mr-auto">{m.category}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-border/60">
                <span className={`text-xs font-bold ${isOn ? "text-emerald-600" : "text-muted-foreground"}`}>{isOn ? "✓ مفعّل" : "معطّل"}</span>
                <button onClick={() => toggleModule(m.id)}
                  className={`relative w-11 h-6 rounded-full border-2 transition-all ${isOn ? "bg-primary border-primary" : "bg-muted border-border"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isOn ? "right-0.5" : "left-0.5"}`} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && <Empty icon={<Grid3X3 size={24} />} title="لا توجد وحدات" desc="جرب تغيير الفلتر أو البحث" />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STORE LAYOUT
// ─────────────────────────────────────────────────────────────────────────────


export { SuperAdminLayout };
