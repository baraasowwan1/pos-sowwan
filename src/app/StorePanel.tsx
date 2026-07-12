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
  Info, ChevronLeft, Grid3X3, List, Hash, Tag, Ruler, Calculator, FlipHorizontal,
  Flower2, Gift, Bike, Moon, Sun,
} from "lucide-react";
import { storeApi, useApi, useLS, norm, normList, dateAr, timeAr, showToast, KPI, Modal, F, TInput, SInput, Btn, Hdr, Empty, Toggle, useStoreId, sk, PLANS, CAT, ST, printReceipt, PRODUCTS, jod, getToken, useStoreModules, useDarkMode } from "./lib";
import { SyncCenter, SyncStatusBadge } from "./SyncCenter";
import type { StoreData, Product, CartItem, StoreCategory } from "./lib";
import { SalesScreen, ProductsMgr, InvScreen, CustScreen, SuppScreen, PurchScreen, ExpScreen, ReturnScreen } from "./StorePanelB";
import { StoreReports, EmpScreen, BranchScreen, LoyaltyScreen, PrintJobsScreen, PrintMatsScreen, PrintPricesScreen, StoreSetts } from "./StorePanelC";
import { FlowerOrdersScreen, BouquetBuilderScreen, DeliveryMgmtScreen } from "./StorePanelD";

// Role → allowed screen IDs (* = all screens)
const ROLE_SCREENS: Record<string, string[] | "*"> = {
  owner:      "*",
  manager:    ["dashboard","pos","sales","products","inventory","customers","suppliers","purchases","expenses","returns","reports","employees","branches","loyalty","print_jobs","print_mats","print_prices","flower_orders","bouquet","delivery_mgmt","sync"],
  cashier:    ["dashboard","pos","sales","customers"],
  inventory:  ["dashboard","products","inventory","suppliers","purchases"],
  accountant: ["dashboard","sales","reports","expenses"],
};

const STORE_NAV = [
  { id: "dashboard",  label: "الرئيسية",       icon: <LayoutDashboard size={15} /> },
  { id: "pos",        label: "نقطة البيع",      icon: <ShoppingCart size={15} /> },
  { id: "sales",      label: "المبيعات",         icon: <FileText size={15} /> },
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
  { id: "loyalty",       label: "الولاء",              icon: <Star size={15} /> },
  { id: "print_jobs",    label: "طلبات الطباعة",      icon: <Printer size={15} /> },
  { id: "print_mats",   label: "مواد الطباعة",        icon: <Ruler size={15} /> },
  { id: "print_prices", label: "أسعار الطباعة",       icon: <Hash size={15} /> },
  { id: "flower_orders", label: "طلبات الزهور",       icon: <Flower2 size={15} /> },
  { id: "bouquet",       label: "باقة مخصصة",         icon: <Gift size={15} /> },
  { id: "delivery_mgmt", label: "إدارة التوصيل",      icon: <Bike size={15} /> },
  { id: "settings",     label: "الإعدادات",           icon: <Settings size={15} /> },
  { id: "sync",         label: "مركز المزامنة",       icon: <RefreshCw size={15} /> },
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
    try {
      const saved = localStorage.getItem(`sowwanjo_store_screen_${storeId}`) || "dashboard";
      const role = localStorage.getItem(`sowwanjo_user_role_${storeId}`) || "owner";
      const perm = ROLE_SCREENS[role] ?? "*";
      if (perm === "*" || (perm as string[]).includes(saved)) return saved;
      return (perm as string[])[0] || "dashboard";
    } catch { return "dashboard"; }
  });
  const [col, setCol] = useState(false);
  const navTo = (s: string) => {
    setScreen(s);
    try { localStorage.setItem(`sowwanjo_store_screen_${storeId}`, s); } catch {}
  };
  const cat = CAT[store.category as StoreCategory] || CAT["supermarket"];
  const storeCategory = store.category as StoreCategory;

  // ── Role-based permissions ──────────────────────────────────────────────────
  const [darkMode, toggleDark] = useDarkMode();
  const userRole = (() => {
    try { return localStorage.getItem(`sowwanjo_user_role_${storeId}`) || "owner"; } catch { return "owner"; }
  })();
  const userName = (() => {
    try { return localStorage.getItem(`sowwanjo_user_name_${storeId}`) || store.nameAr; } catch { return store.nameAr; }
  })();
  const ROLE_AR: Record<string,string> = { owner:"مالك", manager:"مدير", cashier:"كاشير", inventory:"مسؤول مخزون", accountant:"محاسب" };

  const allowed = ROLE_SCREENS[userRole] ?? "*";
  const canSee = (id: string) => allowed === "*" || (allowed as string[]).includes(id);

  const visibleNav = STORE_NAV.filter(n => {
    if (!canSee(n.id)) return false;
    if (n.id === "print_jobs" || n.id === "print_mats" || n.id === "print_prices") return storeCategory === "print_shop";
    if (n.id === "flower_orders" || n.id === "bouquet" || n.id === "delivery_mgmt") return storeCategory === "flower_shop";
    return true;
  });
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
    { id: "sales",     label: "فواتير",   icon: <FileText size={19} /> },
    { id: "reports",   label: "تقارير",   icon: <BarChart2 size={19} /> },
    { id: "settings",  label: "إعدادات",  icon: <Settings size={19} /> },
  ];

  // Group nav items for sidebar sections
  const NAV_GROUPS = [
    { items: ["dashboard", "pos"] },
    { items: ["sales", "products", "inventory", "purchases", "returns", "expenses"] },
    { items: ["customers", "suppliers"] },
    { items: ["reports", "employees", "branches", "loyalty"] },
    { items: ["print_jobs", "print_mats", "print_prices", "flower_orders", "bouquet", "delivery_mgmt"] },
    { items: ["settings", "sync"] },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background" dir="rtl" style={{ fontFamily: "'Cairo',sans-serif" }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside
        className={`hidden md:flex shrink-0 flex-col transition-all duration-200 border-l border-sidebar-border md:w-14 ${col ? "lg:w-14" : "lg:w-52"}`}
        style={{ background: "var(--sidebar)" }}>

        {/* Logo / Store name */}
        <div className={`h-12 flex items-center gap-2.5 shrink-0 border-b border-sidebar-border ${col ? "lg:justify-center lg:px-0" : "lg:px-3"} px-2`}>
          <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${cat.color}22` }}>
            <span className="text-xs" style={{ color: cat.color }}>{cat.icon}</span>
          </div>
          <div className={`min-w-0 hidden ${col ? "lg:hidden" : "lg:block"}`}>
            <p className="text-sidebar-foreground font-semibold text-xs leading-tight truncate" style={{ color: "#F1F5F9" }}>{store.nameAr}</p>
            <p className="text-xs truncate" style={{ color: "var(--sidebar-foreground)" }}>{cat.label}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-1.5 py-2 overflow-y-auto space-y-px">
          {NAV_GROUPS.map((grp, gi) => {
            const groupItems = grp.items
              .map(id => visibleNav.find(n => n.id === id))
              .filter(Boolean) as typeof visibleNav;
            if (!groupItems.length) return null;
            return (
              <div key={gi} className={gi > 0 ? "pt-1.5 mt-1.5 border-t border-sidebar-border" : ""}>
                {groupItems.map(n => (
                  <button key={n.id} onClick={() => navTo(n.id)} title={n.label}
                    className={`w-full flex items-center gap-2.5 h-8 rounded-lg text-xs font-medium transition-all mb-0.5 relative
                      justify-center md:justify-center ${col ? "lg:justify-center" : "lg:justify-start lg:px-2.5"} px-2
                      ${screen === n.id
                        ? "bg-sidebar-primary/20 text-sidebar-primary font-semibold"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}>
                    <span className="shrink-0">{n.icon}</span>
                    <span className={`hidden truncate ${col ? "lg:hidden" : "lg:inline"}`}>{n.label}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Footer — user info + logout */}
        <div className="p-1.5 border-t border-sidebar-border space-y-1">
          {/* User card — visible when sidebar is expanded */}
          <div className={`${col ? "lg:hidden" : "lg:flex"} hidden items-center gap-2 px-2 py-1.5 rounded-md`}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black text-white" style={{ background: "#4F46E5" }}>
              {userName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold leading-tight truncate" style={{ color: "#F1F5F9" }}>{userName}</p>
              <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{ROLE_AR[userRole] || userRole}</p>
            </div>
          </div>
          <button onClick={() => setCol(!col)} className="hidden lg:flex w-full items-center justify-center h-7 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            {col ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
          </button>
          <button onClick={onLogout}
            className={`w-full flex items-center gap-2 h-8 rounded-md text-xs transition-colors
              text-red-400/60 hover:text-red-400 hover:bg-red-500/10
              justify-center md:justify-center ${col ? "lg:justify-center" : "lg:justify-start lg:px-2.5"} px-2`}>
            <LogOut size={13} />
            <span className={`hidden ${col ? "lg:hidden" : "lg:inline"}`}>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile slide-in menu ─────────────────────────────────────────────── */}
      {storeMobileMenu && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setStoreMobileMenu(false)} />
          <div className="relative mr-auto w-60 h-full flex flex-col" style={{ background: "var(--sidebar)", paddingTop: "env(safe-area-inset-top)" }}>
            <div className="h-12 flex items-center gap-2.5 px-3 border-b border-sidebar-border shrink-0">
              <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${cat.color}22` }}>
                <span className="text-xs" style={{ color: cat.color }}>{cat.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-xs leading-tight truncate" style={{ color: "#F1F5F9" }}>{store.nameAr}</p>
                <p className="text-xs" style={{ color: "var(--sidebar-foreground)" }}>{cat.label}</p>
              </div>
              <button onClick={() => setStoreMobileMenu(false)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-sidebar-accent text-sidebar-foreground shrink-0"><X size={13} /></button>
            </div>
            <nav className="flex-1 px-1.5 py-2 space-y-px overflow-y-auto">
              {NAV_GROUPS.map((grp, gi) => {
                const groupItems = grp.items.map(id => visibleNav.find(n => n.id === id)).filter(Boolean) as typeof visibleNav;
                if (!groupItems.length) return null;
                return (
                  <div key={gi} className={gi > 0 ? "pt-1.5 mt-1.5 border-t border-sidebar-border" : ""}>
                    {groupItems.map(n => (
                      <button key={n.id} onClick={() => { navTo(n.id); setStoreMobileMenu(false); }}
                        className={`w-full flex items-center gap-2.5 h-9 rounded-lg px-2.5 text-sm font-medium transition-all mb-0.5
                          ${screen === n.id
                            ? "bg-sidebar-primary/20 text-sidebar-primary font-semibold"
                            : "text-sidebar-foreground hover:bg-sidebar-accent"
                          }`}>
                        <span className="shrink-0">{n.icon}</span>
                        <span className="truncate">{n.label}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </nav>
            <div className="p-1.5 border-t border-sidebar-border space-y-1" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}>
              <div className="flex items-center gap-2.5 px-2 py-2 rounded-md">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-black text-white text-sm" style={{ background: "#2563EB" }}>
                  {userName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold leading-tight truncate" style={{ color: "#F1F5F9" }}>{userName}</p>
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{ROLE_AR[userRole] || userRole}</p>
                </div>
              </div>
              <button onClick={onLogout} className="w-full flex items-center gap-2 h-8 rounded-md px-2.5 text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <LogOut size={13} />تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* ── Top header ─────────────────────────────────────────────────────── */}
        <header className="h-13 bg-card border-b border-border flex items-center justify-between px-3 sm:px-4 shrink-0 gap-2" style={{ height: 52, paddingTop: "env(safe-area-inset-top)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => setStoreMobileMenu(true)} className="md:hidden w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground"><Menu size={16} /></button>
            <button onClick={() => setCol(!col)} className="hidden md:flex w-8 h-8 items-center justify-center rounded-md hover:bg-muted text-muted-foreground"><Menu size={15} /></button>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{visibleNav.find(n => n.id === screen)?.label || STORE_NAV.find(n => n.id === screen)?.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Logged-in user chip */}
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/60 border border-border">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0" style={{ background: "#2563EB" }}>
                {userName.charAt(0)}
              </div>
              <span className="text-xs font-semibold text-foreground max-w-[80px] truncate">{userName}</span>
              <span className="text-[10px] text-muted-foreground">{ROLE_AR[userRole] || userRole}</span>
            </div>
            <SyncStatusBadge storeId={storeId} onOpenCenter={() => navTo("sync")} />
            <button onClick={toggleDark} title={darkMode ? "الوضع الفاتح" : "الوضع الداكن"} className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground transition-colors">
              {darkMode ? <Sun size={15}/> : <Moon size={15}/>}
            </button>
            <span className="hidden sm:flex items-center gap-1 text-xs text-emerald-600 font-medium px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> نشط
            </span>
            {/* Announcements Bell */}
            <div className="relative">
              <button onClick={() => { setShowAnn(!showAnn); if (!showAnn) markAllSeen(); }}
                className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground relative">
                <Bell size={15} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {showAnn && (
                <div className="absolute left-0 top-full mt-1 w-72 max-w-[calc(100vw-1rem)] bg-card rounded-lg border border-border shadow-lg z-50 overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-3 border-b border-border">
                    <span className="text-sm font-semibold flex items-center gap-1.5">
                      الإعلانات
                      {unreadCount > 0 && <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>}
                    </span>
                    <button onClick={() => setShowAnn(false)} className="text-muted-foreground hover:text-foreground"><X size={13} /></button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {announcements.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Bell size={24} className="mx-auto mb-2 opacity-30" />
                        <p className="text-xs">لا توجد إعلانات</p>
                      </div>
                    ) : announcements.map(a => (
                      <div key={a._id} className={`px-4 py-3 border-b border-border last:border-0 ${!seenIds.includes(a._id) ? "bg-primary/5" : ""}`}>
                        <div className={`text-xs font-semibold px-2 py-0.5 rounded border inline-block mb-1 ${ANN_TYPE_COLOR[a.type] || ANN_TYPE_COLOR.info}`}>
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
          {!canSee(screen) ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
              <div className="w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center"><Shield size={36} className="text-red-400" /></div>
              <h2 className="text-xl font-black">غير مصرح لك بالوصول</h2>
              <p className="text-muted-foreground text-sm">صلاحيتك ({userRole}) لا تتيح الوصول لهذه الصفحة.</p>
              <button onClick={() => navTo("dashboard")} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-bold">العودة للرئيسية</button>
            </div>
          ) : (
            <>
              {screen === "dashboard" && <StoreDash store={store} />}
              {screen === "pos"       && <POSTerm store={store} />}
              {screen === "sales"     && <SalesScreen store={store} />}
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
              {screen === "loyalty"       && <LoyaltyScreen />}
              {screen === "print_jobs"    && <PrintJobsScreen store={store} />}
              {screen === "print_mats"   && <PrintMatsScreen />}
              {screen === "print_prices" && <PrintPricesScreen />}
              {screen === "flower_orders" && <FlowerOrdersScreen store={store} />}
              {screen === "bouquet"       && <BouquetBuilderScreen store={store} />}
              {screen === "delivery_mgmt" && <DeliveryMgmtScreen store={store} />}
              {screen === "settings"     && <StoreSetts store={store} />}
              {screen === "sync"         && <SyncCenter storeId={storeId} />}
            </>
          )}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 flex"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {storeBottomNav.filter(n => canSee(n.id)).map(n => (
            <button key={n.id} onClick={() => navTo(n.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[52px] transition-colors ${screen === n.id ? "text-primary" : "text-muted-foreground"}`}>
              <span>{n.icon}</span>
              <span className="text-[10px] font-medium leading-tight">{n.label}</span>
              {screen === n.id && <span className="absolute bottom-0 w-5 h-0.5 bg-primary rounded-t-full" />}
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
        <KPI icon={<ShoppingCart size={16} />} label="مبيعات اليوم"
          value={sumLoading ? "..." : `${(summary.today?.total || 0).toFixed(3)} JOD`}
          sub={`${summary.today?.count || 0} فاتورة`} color="#2563EB" />
        <KPI icon={<DollarSign size={16} />} label="إيرادات الشهر"
          value={sumLoading ? "..." : `${(summary.month?.total || 0).toFixed(3)} JOD`}
          color="#059669" />
        <KPI icon={<Package size={16} />} label="المنتجات"
          value={sumLoading ? "..." : String(summary.totalProducts || store.products || 0)}
          sub={summary.lowStock ? `${summary.lowStock} منخفضة` : "المخزون جيد"} color="#D97706" />
        <KPI icon={<Users size={16} />} label="العملاء"
          value={sumLoading ? "..." : String(summary.totalCustomers || 0)}
          color="#7C3AED" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { color: "#10B981", ic: <CheckCircle size={16} />, n: String(summary.today?.count || 0),  l: "فواتير اليوم" },
          { color: "#F59E0B", ic: <AlertTriangle size={16} />, n: String(summary.lowStock || 0),    l: "مخزون منخفض" },
          { color: "#6366F1", ic: <RotateCcw size={16} />,  n: String(summary.todayReturns || 0),   l: "مرتجعات اليوم" },
        ].map(x => (
          <div key={x.l} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3" style={{ borderRightWidth: 3, borderRightColor: x.color }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${x.color}15`, color: x.color }}>{x.ic}</div>
            <div><p className="text-lg font-bold text-foreground leading-tight">{x.n}</p><p className="text-xs text-muted-foreground">{x.l}</p></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-semibold mb-4 text-foreground">مبيعات وأرباح الأسبوع (JOD)</p>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={weekChartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [`${v} JOD`]} contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid var(--border)" }} />
              <Bar key="week-sales" dataKey="مبيعات" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              <Bar key="week-prof" dataKey="أرباح" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-semibold mb-4 text-foreground">المبيعات بالساعة</p>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={hourChartData}>
              <defs>
                <linearGradient id="store-dash-hour" x1="0" y1="0" x2="0" y2="1">
                  <stop key="sdh-top" offset="5%" stopColor="#4F46E5" stopOpacity={0.18} />
                  <stop key="sdh-bot" offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="h" tick={{ fontSize: 9, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9 }} hide />
              <Tooltip formatter={(v: number) => [`${v} JOD`]} contentStyle={{ borderRadius: 10, fontSize: 12, border: "1px solid var(--border)" }} />
              <Area key="area-hour" type="monotone" dataKey="v" stroke="#4F46E5" strokeWidth={2} fill="url(#store-dash-hour)" name="المبيعات" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-semibold mb-3 text-foreground">أحدث الفواتير</p>
          <div className="space-y-0">
            {salesLoading ? (
              <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-10 bg-muted animate-pulse rounded-lg"/>)}</div>
            ) : recentSales.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">لا توجد فواتير بعد — ابدأ بإصدار أول فاتورة</p>
            ) : recentSales.map(inv => (
              <div key={inv._id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0 hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors">
                <div>
                  <p className="text-xs font-bold font-mono text-foreground">{inv.invoiceNo || inv._id.slice(-6).toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">{inv.customerName || "عميل نقدي"} · {new Date(inv.createdAt).toLocaleTimeString("ar-JO", {hour:"2-digit",minute:"2-digit"})}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">{Number(inv.total).toFixed(3)} JOD</p>
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">{inv.payMethod}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm font-semibold mb-3 text-foreground">تنبيهات المخزون</p>
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
// ─── Cash Drawer Success Overlay ─────────────────────────────────────────────
function SuccessOverlay({ invNo, total, pay, change, drawerAuto, setDrawerAuto, onPrint, onDrawer, drawerOpening, onClose }: {
  invNo: string; total: number; pay: string; change: number;
  drawerAuto: boolean; setDrawerAuto: (v: boolean) => void;
  onPrint: () => void; onDrawer: () => void; drawerOpening: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(5,150,105,.12)", backdropFilter: "blur(8px)" }}>
      <div className="bg-card rounded-3xl shadow-2xl p-8 text-center max-w-sm w-full border border-emerald-200 space-y-3">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle size={44} className="text-emerald-500" /></div>
        <h3 className="text-2xl font-black">تمت العملية بنجاح!</h3>
        <p className="text-muted-foreground font-mono text-sm">{invNo}</p>
        <p className="text-4xl font-black text-primary">{total.toFixed(3)} JOD</p>
        {pay === "cash" && change > 0 && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 py-3">
            <p className="text-emerald-700 font-black text-xl">الباقي للعميل: {change.toFixed(3)} JOD</p>
          </div>
        )}
        {/* Cash drawer section */}
        <div className="rounded-2xl border border-border bg-muted/40 p-3 text-right space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground">الدرج النقدي (كاش بوكس)</p>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs text-muted-foreground">فتح تلقائي</span>
              <div onClick={() => setDrawerAuto(!drawerAuto)} className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${drawerAuto ? "bg-emerald-500" : "bg-muted-foreground/30"}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${drawerAuto ? "translate-x-4" : "translate-x-0"}`} />
              </div>
            </label>
          </div>
          <button onClick={onDrawer} disabled={drawerOpening} className="w-full h-9 flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition-all disabled:opacity-50">
            <Wallet size={15} /> {drawerOpening ? "جاري الفتح..." : "فتح الدرج الآن"}
          </button>
        </div>
        <div className="flex gap-2">
          <Btn v="secondary" full icon={<Printer size={14} />} onClick={onPrint}>طباعة الإيصال</Btn>
          <Btn v="ghost" full icon={<Download size={14} />} onClick={onPrint}>PDF</Btn>
        </div>
        <Btn v="success" full onClick={onClose} icon={<Plus size={14} />}>فاتورة جديدة</Btn>
      </div>
    </div>
  );
}

// POS TERMINAL (Full interactive)
// ─────────────────────────────────────────────────────────────────────────────

interface CashSession { id?: string; openedAt: string; openingBalance: number; closingBalance?: number; totalSales?: number; status: "open" | "closed"; }

function POSTerm({ store }: { store: StoreData }) {
  const sid = useStoreId();
  // Cash session state
  const [session, setSession] = useLS<CashSession | null>(sk(sid, "pos_session"), null);
  const [showOpenSession, setShowOpenSession] = useState(false);
  const [showCloseSession, setShowCloseSession] = useState(false);
  const [openingBal, setOpeningBal] = useState("0");
  const [closingBal, setClosingBal] = useState("");

  // منتجات POS — من Backend مع fallback إلى IndexedDB عند انقطاع الاتصال
  const { data: prodsApiRaw, refresh: refreshPosProds } = useApi<unknown[]>("/products", []);
  const [allProds, setAllProds] = useState<Product[]>([]);
  useEffect(() => {
    const prods = normList<Product>(prodsApiRaw);
    if (prods.length > 0) {
      setAllProds(prods);
      // Cache to IndexedDB for offline use
      import("./offlineDb").then(({ cacheProducts }) => {
        cacheProducts(sid, prods.map(p => ({
          id: p.id, storeId: sid, nameAr: p.nameAr, nameEn: p.nameEn || "",
          barcode: p.barcode || "", sku: p.sku || "", sellPrice: p.sellPrice,
          costPrice: 0, stock: p.stock, minStock: p.minStock || 0,
          category: p.category || "", unit: p.unit || "", isActive: true,
          updatedAt: new Date().toISOString(), syncedAt: new Date().toISOString(),
        }))).catch(() => {});
      });
    } else if (!navigator.onLine) {
      // Offline fallback: load from IndexedDB
      import("./offlineDb").then(({ db }) => {
        db.products.where("storeId").equals(sid).filter(p => p.isActive).toArray().then(offlineProds => {
          if (offlineProds.length > 0) {
            setAllProds(offlineProds.map(p => ({
              id: p.id, nameAr: p.nameAr, nameEn: p.nameEn || "",
              barcode: p.barcode || "", sku: p.sku || "", sellPrice: p.sellPrice,
              stock: p.stock, minStock: p.minStock || 0, category: p.category || "",
              unit: p.unit || "", cost: p.costPrice || 0,
            } as unknown as Product)));
          }
        }).catch(() => {});
      });
    }
  }, [prodsApiRaw, sid]);
  // عملاء POS
  type POSCust = {id:string;name:string;phone:string;email?:string};
  const { data: custsApiRaw, refresh: refreshCusts } = useApi<unknown[]>("/customers", []);
  const [posCustomers, setPosCustomers] = useState<POSCust[]>([]);
  useEffect(() => {
    const custs = normList<POSCust>(custsApiRaw);
    if (custs.length > 0) {
      setPosCustomers(custs);
      // Cache to IndexedDB
      import("./offlineDb").then(({ cacheCustomers }) => {
        cacheCustomers(sid, custs.map(c => ({
          id: c.id, storeId: sid, name: c.name, phone: c.phone || "",
          email: c.email || "", syncStatus: "synced" as const,
          createdAt: new Date().toISOString(), syncedAt: new Date().toISOString(),
        }))).catch(() => {});
      });
    } else if (!navigator.onLine) {
      import("./offlineDb").then(({ db }) => {
        db.customers.where("storeId").equals(sid).toArray().then(offlineCusts => {
          setPosCustomers(offlineCusts.map(c => ({ id: c.id, name: c.name, phone: c.phone || "", email: c.email })));
        }).catch(() => {});
      });
    }
  }, [custsApiRaw, sid]);
  const [cart, setCart] = useLS<CartItem[]>(sk(sid,"pos_cart"), []);  // السلة تبقى بعد الـ refresh
  const [holds, setHolds] = useLS<CartItem[][]>(sk(sid,"pos_holds"), []); // الطلبات المعلقة
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("الكل");
  const [drawerAuto, setDrawerAuto] = useLS<boolean>(sk(sid,"pos_drawer_auto"), false);
  const [drawerOpening, setDrawerOpening] = useState(false);
  const [disc, setDisc] = useState(0);
  const [pay, setPay] = useState<"cash" | "cliq" | "card">("cash");
  const [cash, setCash] = useState("");
  const [cliqRef, setCliqRef] = useState("");
  const [cliqSender, setCliqSender] = useState("");
  const [cardRef, setCardRef] = useState("");
  const [showPay, setShowPay] = useState(false);
  const [ok, setOk] = useState(false);
  // Customer selection
  const [selectedCustomer, setSelectedCustomer] = useState<{id:string;name:string;phone:string}|null>(null);
  const [customerQ, setCustomerQ] = useState("");
  const [showCustSearch, setShowCustSearch] = useState(false);
  const [showAddCust, setShowAddCust] = useState(false);
  const [newCust, setNewCust] = useState({name:"",phone:"",email:"",address:"",notes:""});
  // Calculator
  const [showCalc, setShowCalc] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState("0");
  const [calcExpr, setCalcExpr] = useState("");
  // Shift sales
  const [showShift, setShowShift] = useState(false);
  const { data: shiftSales, refresh: refreshShift } = useApi<unknown[]>("/sales", []);
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
  const add = (p: Product) => {
    if (p.stock <= 0) { showToast(`"${p.nameAr}" نفد من المخزون`, "error"); return; }
    setCart(prev => {
      const ex = prev.find(i => i.product.id === p.id);
      if (ex) {
        if (ex.qty >= p.stock) { showToast(`الكمية المتاحة فقط ${p.stock} وحدة`, "warning"); return prev; }
        return prev.map(i => i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product: p, qty: 1, discount: 0 }];
    });
  };
  const upd = (id: string, d: number) => setCart(prev => prev.map(i => {
    if (i.product.id !== id) return i;
    const newQty = Math.max(1, i.qty + d);
    if (newQty > i.product.stock) { showToast(`الكمية المتاحة ${i.product.stock} وحدة فقط`, "warning"); return i; }
    return { ...i, qty: newQty };
  }));
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
    payMethod: pay === "cash" ? "نقدي" : pay === "cliq" ? "كليك" : "بطاقة ائتمانية",
    change: change > 0 ? change : undefined,
    cashIn: pay === "cash" ? parseFloat(cash || "0") : undefined,
    date: new Date().toLocaleDateString("ar-JO"),
    time: new Date().toLocaleTimeString("ar-JO", { hour: "2-digit", minute: "2-digit" }),
  }, paper);

  const doPay = async () => {
    const saleItems = cart.map(i => ({
      productId: i.product.id,
      nameAr:    i.product.nameAr,
      qty:       i.qty,
      unitPrice: i.product.sellPrice,
      discount:  i.discount,
      total:     i.product.sellPrice * i.qty * (1 - i.discount / 100),
    }));
    const salePayload = {
      invoiceNo:    invNo,
      items:        saleItems,
      subtotal: sub, discountAmt: da, taxAmt: ta, total,
      payMethod: pay,
      cashIn:     pay === "cash" ? parseFloat(cash || "0") : undefined,
      change:     pay === "cash" ? Math.max(0, parseFloat(cash || "0") - total) : undefined,
      cliqRef:    pay === "cliq" ? cliqRef : undefined,
      cliqSender: pay === "cliq" ? cliqSender : undefined,
      cardRef:    pay === "card" ? cardRef : undefined,
      customerId:   selectedCustomer?.id,
      customerName: selectedCustomer?.name || "عميل نقدي",
      customerPhone:selectedCustomer?.phone,
      status: "completed",
    };

    if (navigator.onLine) {
      try {
        await storeApi.post("/sales", salePayload);
        setTimeout(() => refreshPosProds(), 500);
      } catch {
        // Online but server error — save offline as fallback
        await saveOfflineSale(saleItems);
      }
    } else {
      // Fully offline — save to IndexedDB + queue
      await saveOfflineSale(saleItems);
    }

    setOk(true);
    invNoRef.current = `INV-${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;
    if (drawerAuto && pay === "cash") openDrawer();
  };

  const saveOfflineSale = async (saleItems: { productId: string; nameAr: string; qty: number; unitPrice: number; discount: number; total: number }[]) => {
    try {
      const { db, generateUUID, generateOfflineInvoiceNo, deductLocalInventory } = await import("./offlineDb");
      const { runSync } = await import("./syncEngine");
      const localId = generateUUID();
      const offlineInvNo = generateOfflineInvoiceNo(sid);
      const now = new Date().toISOString();
      const sale = {
        localId, invoiceNo: offlineInvNo, storeId: sid,
        items: saleItems, subtotal: sub, discountAmt: da, taxAmt: ta, total,
        payMethod: pay as "cash" | "cliq" | "card",
        cashIn:     pay === "cash" ? parseFloat(cash || "0") : undefined,
        change:     pay === "cash" ? Math.max(0, parseFloat(cash || "0") - total) : undefined,
        cliqRef:    pay === "cliq" ? cliqRef : undefined,
        cliqSender: pay === "cliq" ? cliqSender : undefined,
        cardRef:    pay === "card" ? cardRef : undefined,
        customerId:   selectedCustomer?.id,
        customerName: selectedCustomer?.name || "عميل نقدي",
        customerPhone:selectedCustomer?.phone,
        status: "completed" as const,
        syncStatus: "pending" as const,
        isOffline: true,
        createdAt: now,
      };
      await db.sales.add(sale);
      await deductLocalInventory(sid, saleItems);
      await db.syncQueue.add({
        operationId:   localId,
        operationType: "create_sale",
        storeId: sid,
        payload: sale,
        localCreatedAt: now,
        syncStatus: "pending",
        retryCount: 0,
      });
      showToast("تم حفظ الفاتورة محلياً — ستُزامن عند عودة الاتصال", "warning");
      // Try sync in background if online
      if (navigator.onLine) setTimeout(() => runSync(sid), 2000);
    } catch (e) {
      console.error("[POSTerm] saveOfflineSale failed:", e);
      showToast("تعذّر حفظ الفاتورة محلياً — تحقق من التخزين", "error");
    }
  };

  const openDrawer = async () => {
    setDrawerOpening(true);
    try {
      const { openCashDrawer } = await import("./cashDrawer");
      const result = await openCashDrawer();
      if (result === "opened") showToast("تم فتح الدرج النقدي ✅");
      else if (result === "no_serial") showToast("المتصفح لا يدعم Web Serial — جرّب Chrome أو Edge", "warning");
      else if (result === "cancelled") showToast("تم إلغاء اختيار المنفذ", "warning");
      else showToast("تعذّر فتح الدرج — تحقق من التوصيل", "error");
    } catch { showToast("خطأ في فتح الدرج", "error"); }
    finally { setDrawerOpening(false); }
  };

  const handleClose = () => {
    setOk(false); setCart([]); setShowPay(false);
    setCash(""); setDisc(0); setCliqRef(""); setCliqSender(""); setCardRef("");
    setSelectedCustomer(null); setCustomerQ("");
  };

  const openSession = () => {
    const s: CashSession = { openedAt: new Date().toISOString(), openingBalance: parseFloat(openingBal) || 0, status: "open" };
    setSession(s);
    setShowOpenSession(false);
    showToast(`تم فتح الجلسة — الرصيد الافتتاحي: ${(parseFloat(openingBal)||0).toFixed(3)} JOD`, "success");
  };

  const closeSession = () => {
    if (!session) return;
    const closed: CashSession = { ...session, closingBalance: parseFloat(closingBal) || 0, totalSales: sub, status: "closed" };
    // Print closing summary
    const w = window.open("", "_blank", "width=500,height=600");
    if (w) {
      const now = new Date();
      w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>إغلاق الجلسة</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Cairo','Tahoma',Arial,sans-serif;direction:rtl;padding:28px;color:#111;font-size:13px}h1{text-align:center;font-size:18px;font-weight:900;margin-bottom:4px}p.sub{text-align:center;color:#666;font-size:11px;margin-bottom:20px}.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:13px}.row:last-child{font-weight:bold;font-size:15px;border-bottom:2px solid #111}.footer{margin-top:20px;text-align:center;font-size:10px;color:#999}</style></head><body><h1>تقرير إغلاق الجلسة</h1><p class="sub">${store.nameAr}</p><p class="sub">فُتحت: ${new Date(session.openedAt).toLocaleString("ar-JO")} — أُغلقت: ${now.toLocaleString("ar-JO")}</p><div class="row"><span>الرصيد الافتتاحي</span><span>${session.openingBalance.toFixed(3)} JOD</span></div><div class="row"><span>الرصيد الختامي المُعدّ</span><span>${closed.closingBalance?.toFixed(3)} JOD</span></div><div class="row"><span>الفرق</span><span>${((closed.closingBalance||0) - session.openingBalance).toFixed(3)} JOD</span></div><div class="footer">Sowwanjo POS — نظام نقاط البيع</div></body></html>`);
      w.document.close();
      setTimeout(() => { w.focus(); w.print(); }, 400);
    }
    setSession(null);
    setShowCloseSession(false);
    setCart([]);
    showToast("تم إغلاق الجلسة النقدية بنجاح", "success");
  };

  // If no session, show session open screen
  if (!session) {
    return (
      <div className="flex h-full items-center justify-center p-6 bg-background">
        <div className="bg-card rounded-2xl border border-border shadow-md p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Wallet size={36} className="text-primary" />
          </div>
          <h2 className="text-2xl font-black mb-2">فتح جلسة POS</h2>
          <p className="text-muted-foreground text-sm mb-6">أدخل الرصيد الافتتاحي في الدرج النقدي لبدء العمل</p>
          <F label="الرصيد الافتتاحي (JOD)">
            <TInput value={openingBal} onChange={setOpeningBal} type="number" placeholder="0.000" icon={<Banknote size={13} />} />
          </F>
          <div className="grid grid-cols-3 gap-2 my-4">
            {[0, 10, 20, 50, 100, 200].map(v => (
              <button key={v} onClick={() => setOpeningBal(String(v))} className="h-10 rounded-xl text-sm font-bold border border-border hover:bg-primary hover:text-white hover:border-primary transition-all">
                {v} JOD
              </button>
            ))}
          </div>
          <Btn full s="lg" onClick={openSession} icon={<Power size={16} />}>فتح الجلسة</Btn>
          <p className="text-xs text-muted-foreground mt-4">{new Date().toLocaleString("ar-JO")}</p>
        </div>
        {showOpenSession && null}
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-background">
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
                const outOfStock = p.stock <= 0;
                const low = !outOfStock && p.stock <= p.minStock;
                return (
                  <button key={p.id} onClick={() => add(p)} disabled={outOfStock}
                    className={`bg-card rounded-2xl border-2 p-2.5 sm:p-3 text-right transition-all ${outOfStock ? "opacity-50 cursor-not-allowed border-border" : inCart ? "border-primary shadow-md bg-primary/2 active:scale-95 hover:shadow-md" : "border-border hover:-translate-y-0.5 hover:shadow-md active:scale-95"}`}>
                    <div className="aspect-square rounded-xl bg-muted/40 mb-2 overflow-hidden relative">
                      <img src={p.image} alt={p.nameAr} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      {outOfStock && <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl"><span className="text-white text-xs font-black">نفد</span></div>}
                      {low && !outOfStock && <div className="absolute top-1 left-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">منخفض</div>}
                      {inCart && <div className="absolute top-1 right-1 w-5 h-5 bg-primary text-white text-xs font-black rounded-full flex items-center justify-center">{inCart.qty}</div>}
                    </div>
                    <p className="text-xs font-bold leading-tight line-clamp-2 mb-1.5">{p.nameAr}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-primary">{p.sellPrice.toFixed(3)}</span>
                      <span className={`text-xs font-semibold ${outOfStock ? "text-red-500" : low ? "text-amber-500" : "text-emerald-600"}`}>{outOfStock ? "نفد" : p.stock}</span>
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
                const outOfStock = p.stock <= 0;
                return (
                  <button key={p.id} onClick={() => add(p)} disabled={outOfStock}
                    className={`w-full flex items-center gap-3 bg-card rounded-xl border p-3 md:p-4 text-right hover:shadow-sm transition-all active:scale-[0.99] ${outOfStock ? "opacity-50 cursor-not-allowed border-border" : inCart ? "border-primary bg-primary/2" : "border-border"}`}>
                    <img src={p.image} alt={p.nameAr} className="w-12 h-12 md:w-14 md:h-14 rounded-xl object-cover bg-muted shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <div className="flex-1 min-w-0"><p className="text-sm md:text-base font-bold truncate">{p.nameAr}</p><p className="text-xs text-muted-foreground">{p.sku} • {p.category}</p></div>
                    <div className="text-right shrink-0"><p className="text-sm md:text-base font-black text-primary">{p.sellPrice.toFixed(3)} JOD</p><p className={`text-xs font-bold ${outOfStock ? "text-red-500" : p.stock <= p.minStock ? "text-amber-500" : "text-emerald-600"}`}>{outOfStock ? "نفد المخزون" : p.stock}</p></div>
                    {inCart && <div className="w-7 h-7 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center shrink-0">{inCart.qty}</div>}
                  </button>
                );
              })}
            </div>
          )}
          {prods.length === 0 && <Empty icon={<Package size={24} />} title="لا توجد منتجات" desc="جرب البحث بكلمات مختلفة" />}
        </div>
        {holds.length > 0 && (
          <div className="border-t border-border bg-muted/40 p-2.5 shrink-0">
            <p className="text-xs font-bold text-muted-foreground mb-1.5">طلبات معلقة ({holds.length})</p>
            <div className="flex gap-1.5 overflow-x-auto">
              {holds.map((h, i) => <button key={i} onClick={() => resume(i)} className="shrink-0 px-3 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20">طلب {i + 1} ({h.length} صنف)</button>)}
            </div>
          </div>
        )}
      </div>

      {/* Cart */}
      <div className="w-72 md:w-80 lg:w-96 bg-card flex flex-col border-l border-border shrink-0">
        <div className="px-4 py-3 border-b border-border shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-bold">سلة المشتريات</p>
            <div className="flex items-center gap-1">
              <button onClick={() => { setShowCalc(true); }} title="الآلة الحاسبة" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-colors"><Calculator size={13} /></button>
              <button onClick={() => { refreshShift(); setShowShift(true); }} title="مبيعات الشفت" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-colors"><BarChart2 size={13} /></button>
              <button onClick={openDrawer} disabled={drawerOpening} title="فتح الدرج النقدي" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-emerald-100 text-emerald-600 transition-colors disabled:opacity-50"><Wallet size={13} /></button>
              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">{invNo}</span>
              <button onClick={() => { setClosingBal(""); setShowCloseSession(true); }} title="إغلاق الجلسة" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-100 text-red-500 transition-colors">
                <Power size={13} />
              </button>
            </div>
          </div>
          {/* Customer selection */}
          <div className="relative">
            <button onClick={() => setShowCustSearch(s => !s)} className="w-full flex items-center gap-2 h-8 rounded-xl border border-border bg-muted/40 px-3 text-xs hover:bg-muted transition-all">
              <Users size={11} className="text-muted-foreground shrink-0" />
              <span className="flex-1 text-right truncate">{selectedCustomer ? `${selectedCustomer.name} ${selectedCustomer.phone ? `• ${selectedCustomer.phone}` : ""}` : "عميل نقدي"}</span>
              {selectedCustomer && <button onClick={e => { e.stopPropagation(); setSelectedCustomer(null); setCustomerQ(""); }} className="text-muted-foreground hover:text-red-500"><X size={10} /></button>}
            </button>
            {showCustSearch && (
              <div className="absolute top-9 left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-xl p-2 space-y-1.5 max-h-56 overflow-y-auto">
                <input autoFocus value={customerQ} onChange={e => setCustomerQ(e.target.value)} placeholder="ابحث بالاسم أو الجوال..." className="w-full h-8 rounded-lg border border-border bg-background text-xs px-3 focus:outline-none focus:ring-1 focus:ring-primary" />
                {posCustomers.filter(c => !customerQ || c.name.includes(customerQ) || (c.phone||"").includes(customerQ)).slice(0,8).map(c => (
                  <button key={c.id} onClick={() => { setSelectedCustomer(c); setShowCustSearch(false); setCustomerQ(""); }} className="w-full flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-muted text-right">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-[10px] font-black">{c.name[0]}</div>
                    <div className="flex-1 min-w-0"><p className="text-xs font-bold truncate">{c.name}</p><p className="text-[10px] text-muted-foreground">{c.phone}</p></div>
                  </button>
                ))}
                <button onClick={() => { setShowCustSearch(false); setShowAddCust(true); }} className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20">
                  <Plus size={11} /> عميل جديد
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{cart.length} صنف • {cart.reduce((a, i) => a + i.qty, 0)} وحدة</p>
            <p className="text-xs text-emerald-600 font-bold">● جلسة مفتوحة</p>
          </div>
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
                {(["cash","cliq","card"] as const).map(m => (
                  <button key={m} onClick={() => setPay(m)} className={`px-2 h-8 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap ${pay === m ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}>
                    {m === "cash" ? "نقدي" : m === "cliq" ? "كليك" : "بطاقة"}
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
            <div className="bg-primary rounded-2xl p-5 text-center">
              <p className="text-white/60 text-sm mb-1">المبلغ المستحق</p>
              <p className="text-5xl font-black text-white">{total.toFixed(3)}</p>
              <p className="text-white/60 font-bold mt-1">دينار أردني</p>
              {selectedCustomer && <p className="text-white/50 text-xs mt-2">العميل: {selectedCustomer.name}</p>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: "cash", label: "💵 نقدي" },
                { id: "cliq", label: "📱 كليك" },
                { id: "card", label: "💳 بطاقة" },
              ] as const).map(m => (
                <button key={m.id} onClick={() => setPay(m.id)}
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

            {pay === "cliq" && (
              <div className="space-y-3 p-4 bg-muted/40 border border-border rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard size={20} className="text-primary" />
                  <p className="font-bold text-foreground">دفع عبر كليك</p>
                </div>
                <F label="رقم مرجع المعاملة (اختياري)">
                  <TInput value={cliqRef} onChange={setCliqRef} placeholder="مثال: TX-123456" />
                </F>
                <F label="اسم المُرسِل (اختياري)">
                  <TInput value={cliqSender} onChange={setCliqSender} placeholder="اسم العميل المُرسِل" />
                </F>
              </div>
            )}

            {pay === "card" && (
              <div className="space-y-3 p-4 bg-muted/40 border border-border rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard size={20} className="text-primary" />
                  <p className="font-bold text-foreground">دفع بالبطاقة</p>
                </div>
                <F label="رقم المرجع / التفويض (اختياري)">
                  <TInput value={cardRef} onChange={setCardRef} placeholder="مثال: AUTH-789012" />
                </F>
                <p className="text-xs text-muted-foreground">أدخل البطاقة في القارئ وانتظر التفويض</p>
              </div>
            )}

            <div className="flex gap-3">
              <Btn v="secondary" onClick={() => setShowPay(false)} cls="flex-1">إلغاء</Btn>
              <Btn onClick={() => { doPay(); setShowPay(false); }} cls="flex-1" v="success" icon={<CheckCircle size={15} />}
                disabled={pay === "cash" && parseFloat(cash || "0") < total}>
                تأكيد الدفع
              </Btn>
            </div>
          </div>
        </Modal>
      )}
      {ok && (
        <SuccessOverlay
          invNo={invNo} total={total} pay={pay} change={change}
          drawerAuto={drawerAuto} setDrawerAuto={setDrawerAuto}
          onPrint={doPrint} onDrawer={openDrawer} drawerOpening={drawerOpening}
          onClose={handleClose}
        />
      )}

      {/* Calculator Modal */}
      {showCalc && (() => {
        const calcPress = (v: string) => {
          if (v === "C") { setCalcDisplay("0"); setCalcExpr(""); return; }
          if (v === "⌫") { setCalcDisplay(d => d.length > 1 ? d.slice(0,-1) : "0"); return; }
          if (v === "=") {
            try { const r = Function('"use strict"; return (' + calcExpr + ')')(); setCalcDisplay(String(parseFloat(r.toFixed(6)))); setCalcExpr(""); }
            catch { setCalcDisplay("خطأ"); }
            return;
          }
          const ops = ["+","-","×","÷","."];
          if (ops.includes(v)) { const op = v === "×" ? "*" : v === "÷" ? "/" : v; setCalcExpr(e => e + (calcDisplay === "0" ? "" : calcDisplay) + op); setCalcDisplay("0"); return; }
          setCalcDisplay(d => d === "0" ? v : d + v);
        };
        const keys = ["7","8","9","÷","4","5","6","×","1","2","3","-","0",".","⌫","+","C","","","="];
        return (
          <Modal title="الآلة الحاسبة" onClose={() => setShowCalc(false)} size="sm">
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-xl p-4 text-right">
                {calcExpr && <p className="text-xs text-muted-foreground mb-1 font-mono">{calcExpr}</p>}
                <p className="text-3xl font-black font-mono">{calcDisplay}</p>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {keys.map((k, i) => k ? (
                  <button key={i} onClick={() => calcPress(k)}
                    className={`h-12 rounded-xl font-bold text-lg transition-all active:scale-90 ${k === "=" ? "bg-primary text-white col-span-1" : k === "C" ? "bg-red-100 text-red-600" : ["+","-","×","÷"].includes(k) ? "bg-primary/10 text-primary" : "bg-muted hover:bg-muted/80"}`}>
                    {k}
                  </button>
                ) : <div key={i} />)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Btn v="secondary" onClick={() => { setCash(calcDisplay); setShowCalc(false); showToast("تم نقل النتيجة للمبلغ المستلم", "success"); }}>استخدام كمبلغ نقدي</Btn>
                <Btn v="ghost" onClick={() => setShowCalc(false)}>إغلاق</Btn>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Shift Sales Modal */}
      {showShift && (() => {
        const sessionStart = session?.openedAt ? new Date(session.openedAt) : null;
        const shiftSalesList = normList<{id:string;total:number;payMethod:string;createdAt:string;invoiceNo:string;customerName?:string;items?:{qty:number}[]}>(shiftSales)
          .filter(s => sessionStart ? new Date(s.createdAt) >= sessionStart : true);
        const shiftTotals = {
          count: shiftSalesList.length,
          gross: shiftSalesList.reduce((a,s) => a + s.total, 0),
          cash: shiftSalesList.filter(s => s.payMethod === "cash").reduce((a,s) => a + s.total, 0),
          cliq: shiftSalesList.filter(s => s.payMethod === "cliq").reduce((a,s) => a + s.total, 0),
          card: shiftSalesList.filter(s => s.payMethod === "card").reduce((a,s) => a + s.total, 0),
          items: shiftSalesList.reduce((a,s) => a + (s.items||[]).reduce((b,i) => b + i.qty, 0), 0),
        };
        return (
          <Modal title="مبيعات الشفت الحالي" sub={session ? `فُتح: ${new Date(session.openedAt).toLocaleString("ar-JO")}` : ""} onClose={() => setShowShift(false)} wide>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-card border border-border rounded-xl p-3 text-center"><p className="text-xs text-muted-foreground mb-1">فواتير</p><p className="font-black text-xl text-foreground">{shiftTotals.count}</p></div>
                <div className="bg-card border border-border rounded-xl p-3 text-center" style={{borderRightWidth:3,borderRightColor:"#22C55E"}}><p className="text-xs text-muted-foreground mb-1">إجمالي المبيعات</p><p className="font-black text-xl text-emerald-600">{shiftTotals.gross.toFixed(3)} JOD</p></div>
                <div className="bg-card border border-border rounded-xl p-3 text-center" style={{borderRightWidth:3,borderRightColor:"#4F46E5"}}><p className="text-xs text-muted-foreground mb-1">نقدي</p><p className="font-black text-xl text-primary">{shiftTotals.cash.toFixed(3)} JOD</p></div>
                <div className="bg-card border border-border rounded-xl p-3 text-center" style={{borderRightWidth:3,borderRightColor:"#8B5CF6"}}><p className="text-xs text-muted-foreground mb-1">كليك + بطاقة</p><p className="font-black text-xl" style={{color:"#8B5CF6"}}>{(shiftTotals.cliq + shiftTotals.card).toFixed(3)} JOD</p></div>
              </div>
              <div className="border border-border rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                {shiftSalesList.length === 0 ? <p className="text-center py-6 text-sm text-muted-foreground">لا توجد مبيعات في هذا الشفت</p> : (
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50"><tr>{["الفاتورة","العميل","المبلغ","الدفع","الوقت"].map(h => <th key={h} className="px-3 py-2 text-right font-bold text-muted-foreground">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-border/60">
                      {shiftSalesList.map(s => (
                        <tr key={s.id} className="hover:bg-muted/20">
                          <td className="px-3 py-2 font-mono">{s.invoiceNo}</td>
                          <td className="px-3 py-2">{s.customerName || "نقدي"}</td>
                          <td className="px-3 py-2 font-bold">{s.total.toFixed(3)} JOD</td>
                          <td className="px-3 py-2">{s.payMethod === "cash" ? "نقدي" : s.payMethod === "cliq" ? "كليك" : "بطاقة"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{new Date(s.createdAt).toLocaleTimeString("ar-JO",{hour:"2-digit",minute:"2-digit"})}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <Btn full v="secondary" icon={<Power size={13} />} onClick={() => { setShowShift(false); setClosingBal(""); setShowCloseSession(true); }}>إغلاق الشفت</Btn>
            </div>
          </Modal>
        );
      })()}

      {/* Add Customer Modal */}
      {showAddCust && (
        <Modal title="عميل جديد" onClose={() => setShowAddCust(false)} size="sm">
          <div className="space-y-3">
            <F label="الاسم" req><TInput value={newCust.name} onChange={v => setNewCust(c => ({...c, name: v}))} placeholder="اسم العميل" /></F>
            <F label="رقم الجوال"><TInput value={newCust.phone} onChange={v => setNewCust(c => ({...c, phone: v}))} placeholder="07X-XXXXXXX" /></F>
            <F label="البريد الإلكتروني"><TInput value={newCust.email} onChange={v => setNewCust(c => ({...c, email: v}))} placeholder="اختياري" /></F>
            <F label="العنوان"><TInput value={newCust.address} onChange={v => setNewCust(c => ({...c, address: v}))} placeholder="اختياري" /></F>
            <div className="flex gap-2">
              <Btn v="secondary" cls="flex-1" onClick={() => setShowAddCust(false)}>إلغاء</Btn>
              <Btn cls="flex-1" disabled={!newCust.name.trim()} onClick={async () => {
                try {
                  const created = await storeApi.post("/customers", { name: newCust.name, phone: newCust.phone, email: newCust.email, address: newCust.address });
                  const c = norm<POSCust>(created);
                  await refreshCusts();
                  setSelectedCustomer({ id: c.id, name: c.name, phone: c.phone || "" });
                  setShowAddCust(false);
                  setNewCust({ name:"", phone:"", email:"", address:"", notes:"" });
                  showToast(`تم إضافة العميل "${c.name}" وتحديده ✓`, "success");
                } catch { showToast("خطأ في حفظ العميل", "error"); }
              }} icon={<Plus size={13} />}>حفظ وتحديد</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Close Session Modal */}
      {showCloseSession && (
        <Modal title="إغلاق الجلسة النقدية" sub={`فُتحت: ${new Date(session?.openedAt || Date.now()).toLocaleString("ar-JO")}`} onClose={() => setShowCloseSession(false)} size="sm">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">الرصيد الافتتاحي</p>
                <p className="font-black text-lg text-foreground">{session?.openingBalance?.toFixed(3)} JOD</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3 text-center" style={{borderRightWidth:3,borderRightColor:"#22C55E"}}>
                <p className="text-xs text-muted-foreground mb-1">إجمالي المبيعات</p>
                <p className="font-black text-lg text-emerald-600">{total.toFixed(3)} JOD</p>
              </div>
            </div>
            <F label="الرصيد الختامي الفعلي في الدرج (JOD)">
              <TInput value={closingBal} onChange={setClosingBal} type="number" placeholder="0.000" icon={<Wallet size={13} />} />
            </F>
            {closingBal && (
              <div className={`p-3 rounded-xl border-2 text-center ${parseFloat(closingBal) >= (session?.openingBalance || 0) ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                <p className="text-xs text-muted-foreground mb-1">الفرق</p>
                <p className={`font-black text-lg ${parseFloat(closingBal) >= (session?.openingBalance || 0) ? "text-emerald-700" : "text-red-700"}`}>
                  {(parseFloat(closingBal) - (session?.openingBalance || 0)).toFixed(3)} JOD
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <Btn v="secondary" cls="flex-1" onClick={() => setShowCloseSession(false)}>إلغاء</Btn>
              <Btn v="danger" cls="flex-1" icon={<Power size={14} />} onClick={closeSession}>إغلاق الجلسة وطباعة التقرير</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS MANAGER
// ─────────────────────────────────────────────────────────────────────────────

// ── OpenFoodFacts real API types ─────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────

export { StoreLayout };
