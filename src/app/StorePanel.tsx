// StorePanel — Store screens
import { useState, useCallback, useRef, useEffect, useMemo, createContext, useContext } from "react";
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
  Flower2, Gift, Bike, Moon, Sun, WifiOff, Wifi, CloudOff, Clock,
} from "lucide-react";
import { storeApi, useApi, useApiCached, useLS, norm, normList, invalidateCache, dateAr, timeAr, showToast, KPI, Modal, F, TInput, SInput, Btn, Hdr, Empty, Toggle, useStoreId, sk, PLANS, CAT, ST, printReceipt, PRODUCTS, jod, getToken, useStoreModules, useDarkMode } from "./lib";
import { SyncCenter, SyncStatusBadge } from "./SyncCenter";
import type { StoreData, Product, CartItem, StoreCategory } from "./lib";
import { SalesScreen, ProductsMgr, InvScreen, CustScreen, SuppScreen, PurchScreen, ExpScreen, ReturnScreen, PurchaseOrdersScreen, PromotionsScreen } from "./StorePanelB";
import { StoreReports, EmpScreen, BranchScreen, LoyaltyScreen, DebtScreen, GiftCardsScreen, PrintJobsScreen, PrintMatsScreen, PrintPricesScreen, StoreSetts } from "./StorePanelC";
import { FlowerOrdersScreen, BouquetBuilderScreen, DeliveryMgmtScreen } from "./StorePanelD";

// Offline context — lets deep components (POSTerm) know network state
const OfflineCtx = createContext<{ isOnline: boolean; queueOffline: (path: string, payload: object) => void }>({
  isOnline: true,
  queueOffline: () => {},
});
const useOffline = () => useContext(OfflineCtx);

// Role → allowed screen IDs (* = all screens)
const ROLE_SCREENS: Record<string, string[] | "*"> = {
  owner:      "*",
  manager:    ["dashboard","pos","sales","products","inventory","customers","debts","suppliers","purchases","expenses","returns","reports","employees","branches","loyalty","print_jobs","print_mats","print_prices","flower_orders","bouquet","delivery_mgmt","sync"],
  cashier:    ["dashboard","pos","sales","customers"],
  inventory:  ["dashboard","products","inventory","suppliers","purchases"],
  accountant: ["dashboard","sales","reports","expenses"],
};

const STORE_NAV = [
  { id: "dashboard",      label: "الرئيسية",           icon: <LayoutDashboard size={15} />, sfKey: null },
  { id: "pos",            label: "نقطة البيع",          icon: <ShoppingCart size={15} />,  sfKey: "pos" },
  { id: "sales",          label: "المبيعات",             icon: <FileText size={15} />,       sfKey: "sales" },
  { id: "products",       label: "المنتجات",             icon: <Package size={15} />,        sfKey: "products" },
  { id: "inventory",      label: "المخزون",              icon: <Boxes size={15} />,          sfKey: "inventory" },
  { id: "customers",      label: "العملاء",               icon: <Users size={15} />,          sfKey: "customers" },
  { id: "suppliers",      label: "الموردون",              icon: <Truck size={15} />,          sfKey: "suppliers" },
  { id: "purchases",      label: "المشتريات",             icon: <Clipboard size={15} />,      sfKey: "purchases" },
  { id: "purchaseOrders", label: "طلبات الشراء",          icon: <ClipboardList size={15} />,  sfKey: "purchaseOrders" },
  { id: "promotions",     label: "العروض والخصومات",     icon: <Percent size={15} />,        sfKey: "promotions" },
  { id: "expenses",       label: "المصروفات",             icon: <Wallet size={15} />,         sfKey: "expenses" },
  { id: "returns",        label: "المرتجعات",             icon: <RotateCcw size={15} />,      sfKey: "returns" },
  { id: "reports",        label: "التقارير",              icon: <BarChart2 size={15} />,      sfKey: "reports" },
  { id: "employees",      label: "الموظفون",              icon: <UserCheck size={15} />,      sfKey: "users" },
  { id: "branches",       label: "الفروع والأجهزة",      icon: <Building2 size={15} />,      sfKey: "branches" },
  { id: "loyalty",        label: "الولاء",                icon: <Star size={15} />,           sfKey: "loyalty" },
  { id: "debts",          label: "الذمم",                 icon: <Landmark size={15} />,       sfKey: "customers" },
  { id: "giftcards",      label: "بطاقات الهدايا",       icon: <Gift size={15} />,           sfKey: null },
  { id: "print_jobs",     label: "طلبات الطباعة",        icon: <Printer size={15} />,        sfKey: null },
  { id: "print_mats",     label: "مواد الطباعة",          icon: <Ruler size={15} />,          sfKey: null },
  { id: "print_prices",   label: "أسعار الطباعة",        icon: <Hash size={15} />,           sfKey: null },
  { id: "flower_orders",  label: "طلبات الزهور",          icon: <Flower2 size={15} />,        sfKey: null },
  { id: "bouquet",        label: "باقة مخصصة",            icon: <Gift size={15} />,           sfKey: null },
  { id: "delivery_mgmt",  label: "إدارة التوصيل",         icon: <Bike size={15} />,           sfKey: null },
  { id: "settings",       label: "الإعدادات",             icon: <Settings size={15} />,       sfKey: "settings" },
  { id: "sync",           label: "مركز المزامنة",         icon: <RefreshCw size={15} />,      sfKey: "sync" },
];

function StoreLayout({ storeId, onLogout }: { storeId: string; onLogout: () => void }) {
  // بيانات localStorage تُستخدم كعرض أولي فقط؛ قاعدة البيانات هي المصدر الأساسي.
  const storeFromLS: StoreData = (() => {
    try {
      const info = localStorage.getItem(`sowwanjo_storeinfo_${storeId}`);
      if (info) return JSON.parse(info);
    } catch {}
    return null as unknown as StoreData;
  })();
  const [serverStore, setServerStore] = useState<Partial<StoreData> | null>(null);
  const refreshStoreFromServer = useCallback(async () => {
    try {
      const result = await storeApi.get("/auth/me") as { store?: Partial<StoreData> & { _id?: string } };
      if (!result?.store) return;
      const fresh = { ...result.store, id: String(result.store.id || result.store._id || storeId) } as Partial<StoreData>;
      setServerStore(fresh);
      try { localStorage.setItem(`sowwanjo_storeinfo_${storeId}`, JSON.stringify({ ...(storeFromLS || {}), ...fresh, id: storeId })); } catch {}
    } catch {
      // إبقاء الواجهة متاحة عند انقطاع الاتصال، دون اعتبار التخزين المحلي مصدراً موثوقاً.
    }
  }, [storeId]);
  useEffect(() => {
    void refreshStoreFromServer();
    const onStoreUpdated = () => { void refreshStoreFromServer(); };
    window.addEventListener("sowwan:store-updated", onStoreUpdated);
    return () => window.removeEventListener("sowwan:store-updated", onStoreUpdated);
  }, [refreshStoreFromServer]);
  const rawStore = { ...(storeFromLS || {}), ...(serverStore || {}) } as Partial<StoreData>;
  // تطبيع بيانات المتجر — تضمن عدم وجود قيم null تسبب crash
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
    sidebarFeatures: rawStore?.sidebarFeatures || undefined,
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

  const sf = store.sidebarFeatures || {};
  const visibleNav = STORE_NAV.filter(n => {
    if (!canSee(n.id)) return false;
    if (n.id === "print_jobs" || n.id === "print_mats" || n.id === "print_prices") return storeCategory === "print_shop";
    if (n.id === "flower_orders" || n.id === "bouquet" || n.id === "delivery_mgmt") return storeCategory === "flower_shop";
    // sidebarFeatures override — if key set to false, hide; if no key defined, show by default
    if (n.sfKey && Object.prototype.hasOwnProperty.call(sf, n.sfKey)) {
      return sf[n.sfKey as keyof typeof sf] !== false;
    }
    return true;
  });
  const [storeMobileMenu, setStoreMobileMenu] = useState(false);

  // ── Offline detection ─────────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [offlineSince, setOfflineSince] = useState<Date | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<unknown[]>(() => {
    try { return JSON.parse(localStorage.getItem(`sowwanjo_offline_queue_${storeId}`) || "[]"); } catch { return []; }
  });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      setOfflineSince(null);
      showToast("🌐 عاد الاتصال بالإنترنت", "success");
    };
    const goOffline = () => {
      setIsOnline(false);
      setOfflineSince(new Date());
      showToast("📵 انقطع الاتصال — النظام يعمل أوف لاين", "warning");
    };
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, []);

  // Persist queue to localStorage whenever it changes
  useEffect(() => {
    try { localStorage.setItem(`sowwanjo_offline_queue_${storeId}`, JSON.stringify(offlineQueue)); } catch {}
  }, [offlineQueue, storeId]);

  // Auto-sync queue when back online
  useEffect(() => {
    if (!isOnline || offlineQueue.length === 0 || syncing) return;
    const syncQueue = async () => {
      setSyncing(true);
      let success = 0;
      const remaining: unknown[] = [];
      for (const item of offlineQueue as { path: string; payload: object }[]) {
        try { await storeApi.post(item.path, item.payload); success++; }
        catch { remaining.push(item); }
      }
      setOfflineQueue(remaining);
      setSyncing(false);
      if (success > 0) showToast(`تمت مزامنة ${success} عملية معلقة ✓`, "success");
    };
    syncQueue();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const queueOffline = (path: string, payload: object) => {
    setOfflineQueue(q => [...(q as unknown[]), { path, payload, ts: new Date().toISOString() }]);
    showToast("💾 تم حفظ العملية — ستُرسل عند عودة الاتصال", "info");
  };

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
    { items: ["sales", "products", "inventory", "purchases", "purchaseOrders", "returns", "expenses"] },
    { items: ["customers", "debts", "suppliers", "promotions"] },
    { items: ["reports", "employees", "branches", "loyalty"] },
    { items: ["print_jobs", "print_mats", "print_prices", "flower_orders", "bouquet", "delivery_mgmt"] },
    { items: ["settings", "sync"] },
  ];

  return (
    <OfflineCtx.Provider value={{ isOnline, queueOffline }}>
    <div className="flex flex-col h-screen overflow-hidden bg-background" dir="rtl" style={{ fontFamily: "'Cairo',sans-serif" }}>

      {/* ── Offline Banner ───────────────────────────────────────────────────── */}
      {!isOnline && (
        <div className="shrink-0 bg-amber-500 text-white px-4 py-2 flex items-center justify-between gap-3 z-50 text-sm font-bold">
          <div className="flex items-center gap-2">
            <WifiOff size={15} className="shrink-0" />
            <span>وضع أوف لاين — البيانات محفوظة محلياً{offlineSince ? ` منذ ${Math.floor((Date.now() - offlineSince.getTime()) / 60000)} دقيقة` : ""}</span>
          </div>
          {offlineQueue.length > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{offlineQueue.length} عملية معلقة</span>
          )}
        </div>
      )}
      {isOnline && syncing && (
        <div className="shrink-0 bg-emerald-500 text-white px-4 py-2 flex items-center gap-2 z-50 text-sm font-bold">
          <RefreshCw size={13} className="animate-spin" />
          <span>جاري مزامنة العمليات المعلقة...</span>
        </div>
      )}
      {isOnline && !syncing && offlineQueue.length === 0 && (
        <></> // no banner when online + clean
      )}

      <div className="flex flex-1 overflow-hidden">

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
              {screen === "purchases"      && <PurchScreen />}
              {screen === "purchaseOrders" && <PurchaseOrdersScreen store={store} />}
              {screen === "promotions"     && <PromotionsScreen store={store} />}
              {screen === "expenses"       && <ExpScreen />}
              {screen === "returns"        && <ReturnScreen />}
              {screen === "reports"        && <StoreReports />}
              {screen === "employees" && <EmpScreen />}
              {screen === "branches"  && <BranchScreen />}
              {screen === "loyalty"       && <LoyaltyScreen />}
              {screen === "debts"         && <DebtScreen />}
              {screen === "giftcards"     && <GiftCardsScreen />}
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
      </div> {/* flex flex-1 overflow-hidden */}
    </div>
    </OfflineCtx.Provider>
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
  const { isOnline, queueOffline } = useOffline();
  // Per-user identity for role-based permissions and per-user sessions
  const posUserId = (() => { try { return localStorage.getItem(`sowwanjo_user_id_${sid}`) || "default"; } catch { return "default"; } })();
  const posRole   = (() => { try { return localStorage.getItem(`sowwanjo_user_role_${sid}`) || "owner"; } catch { return "owner"; } })();
  const posUserName = (() => { try { return localStorage.getItem(`sowwanjo_user_name_${sid}`) || ""; } catch { return ""; } })();
  const isOwnerOrMgr = posRole === "owner" || posRole === "manager";
  // Cash session — per-user so each cashier has their own shift
  const [session, setSession] = useLS<CashSession | null>(sk(sid, `pos_session_${posUserId}`), null);
  const [showOpenSession, setShowOpenSession] = useState(false);
  const [showCloseSession, setShowCloseSession] = useState(false);
  const [openingBal, setOpeningBal] = useState("0");
  const [closingBal, setClosingBal] = useState("");

  // منتجات POS — من Backend مع fallback إلى IndexedDB عند انقطاع الاتصال
  const { data: prodsApiRaw, refresh: refreshPosProds } = useApiCached<unknown[]>("/products", []);
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

  // عروض وخصومات نشطة — تُطبَّق تلقائياً على السلة
  type ActivePromo = { id: string; name: string; type: "percentage"|"fixed"; discountValue: number; appliesTo: "all"|"specific"; active: boolean; startDate: string; endDate: string; categories?: string[] };
  const { data: rawPromos } = useApiCached<ActivePromo[]>("/promotions", []);
  const activePromos = useMemo(() => {
    const now = Date.now();
    return normList<ActivePromo>(rawPromos).filter(p =>
      p.active &&
      new Date(p.startDate).getTime() <= now &&
      new Date(p.endDate).getTime() + 86400000 >= now // include end date itself
    );
  }, [rawPromos]);

  // عملاء POS
  type POSCust = {id:string;name:string;phone:string;email?:string;loyaltyPoints?:number;debt?:number};
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
  // Manual product entry (when barcode not found)
  const [manualEntry, setManualEntry] = useState<{ barcode: string } | null>(null);
  const [manualForm, setManualForm] = useState({ nameAr: "", sellPrice: "", qty: "1" });
  const [cat, setCat] = useState("الكل");
  const [drawerAuto, setDrawerAuto] = useLS<boolean>(sk(sid,"pos_drawer_auto"), false);
  const [drawerOpening, setDrawerOpening] = useState(false);
  const [disc, setDisc] = useState(0);
  const [pay, setPay] = useState<"cash" | "cliq" | "card" | "credit">("cash");
  const [cash, setCash] = useState("");
  const [cliqRef, setCliqRef] = useState("");
  const [cliqSender, setCliqSender] = useState("");
  const [cardRef, setCardRef] = useState("");
  // Split payment
  type SplitRow = { method: "cash"|"cliq"|"card"; amount: string };
  const [splitMode, setSplitMode] = useState(false);
  const [splitRows, setSplitRows] = useState<SplitRow[]>([{method:"cash",amount:""},{method:"cliq",amount:""}]);
  const splitTotal = splitRows.reduce((a,r) => a + (parseFloat(r.amount)||0), 0);
  // Gift card
  const [giftCode, setGiftCode] = useState("");
  const [giftCard, setGiftCard] = useState<{code:string;balance:number}|null>(null);
  const [giftChecking, setGiftChecking] = useState(false);
  const checkGiftCard = async () => {
    if (!giftCode.trim()) return;
    setGiftChecking(true);
    try {
      const res = await storeApi.get(`/gift-cards/check/${giftCode.trim().toUpperCase()}`) as {code:string;balance:number};
      setGiftCard(res);
      showToast(`بطاقة هدية صالحة — الرصيد: ${res.balance.toFixed(3)} JOD`, "success");
    } catch (e) { showToast((e as {error?:string}).error || "كود غير صحيح", "error"); setGiftCard(null); }
    finally { setGiftChecking(false); }
  };
  // Coupon
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<{id:string;code:string;type:"نسبة"|"مبلغ";value:number;desc?:string}|null>(null);
  const [couponChecking, setCouponChecking] = useState(false);
  const checkCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponChecking(true);
    try {
      const res = await storeApi.get(`/coupons/check/${couponCode.trim().toUpperCase()}`) as {id:string;code:string;type:"نسبة"|"مبلغ";value:number;desc?:string};
      setCoupon(res);
      showToast(`كوبون صالح — خصم ${res.type === "نسبة" ? res.value+"%" : res.value.toFixed(3)+" JOD"}`, "success");
    } catch (e) { showToast((e as {error?:string}).error || "كود غير صحيح", "error"); setCoupon(null); }
    finally { setCouponChecking(false); }
  };
  // Favorites + Recent
  const [favorites, setFavorites] = useLS<string[]>(sk(sid,"pos_favorites"), []);
  const [recentIds, setRecentIds] = useLS<string[]>(sk(sid,"pos_recent"), []);
  const toggleFav = (id: string) => setFavorites(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [id,...prev].slice(0,50));
  const [posTab, setPosTab] = useLS<"all"|"fav"|"recent">(sk(sid,"pos_tab"), "all");
  const [showPay, setShowPay] = useState(false);
  const [ok, setOk] = useState(false);
  // Customer selection
  const [selectedCustomer, setSelectedCustomer] = useState<POSCust|null>(null);
  const [customerQ, setCustomerQ] = useState("");
  const [showCustSearch, setShowCustSearch] = useState(false);
  const [showAddCust, setShowAddCust] = useState(false);
  const [newCust, setNewCust] = useState({name:"",phone:"",email:"",address:"",notes:""});
  // Loyalty
  const loyaltyPPJ = (() => { try { return parseFloat(localStorage.getItem(sk(sid,"sett_loyalty_ppj")) || "1") || 1; } catch { return 1; } })();
  const loyaltyPV  = (() => { try { return parseFloat(localStorage.getItem(sk(sid,"sett_loyalty_pv"))  || "0.01") || 0.01; } catch { return 0.01; } })();
  const [redeemPoints, setRedeemPoints] = useState(false);
  const customerPoints = selectedCustomer?.loyaltyPoints || 0;
  const maxRedeemable = Math.floor(customerPoints);
  // finalTotal وما يعتمد عليها — معرّفة بعد total أسفل
  // Calculator
  const [showCalc, setShowCalc] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState("0");
  const [calcExpr, setCalcExpr] = useState("");
  // Shift sales
  const [showShift, setShowShift] = useState(false);
  const { data: shiftSales, refresh: refreshShift } = useApi<unknown[]>("/sales?limit=500", []);
  const [vm, setVm] = useLS<"grid"|"list">(sk(sid,"pos_vm"), "grid");
  const [scannerMode, setScannerMode] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const DISPLAY_LIMIT = 60;
  const [displayCount, setDisplayCount] = useState(DISPLAY_LIMIT);

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
  // Per-product tax: use product.taxRate if defined, else fall back to store TAX
  const ta = cart.reduce((acc, i) => {
    const lineTotal = i.product.sellPrice * i.qty * (1 - i.discount / 100) * (1 - disc / 100);
    const rate = i.product.taxRate !== undefined ? i.product.taxRate / 100 : TAX;
    return acc + lineTotal * rate;
  }, 0);
  const total = sub - da + ta;
  const giftDiscount = giftCard ? Math.min(giftCard.balance, total) : 0;
  const couponDiscount = coupon ? (coupon.type === "نسبة" ? Math.min(total * (coupon.value / 100), total) : Math.min(coupon.value, total)) : 0;
  const pointsDiscount = redeemPoints ? Math.min(maxRedeemable * loyaltyPV, total * 0.5) : 0;
  const finalTotal = Math.max(0, total - pointsDiscount - giftDiscount - couponDiscount);
  const splitRemaining = Math.max(0, finalTotal - splitTotal);
  const pointsToRedeem = redeemPoints ? Math.ceil(pointsDiscount / loyaltyPV) : 0;
  const pointsEarned = selectedCustomer && pay !== "credit" ? Math.floor(finalTotal * loyaltyPPJ) : 0;
  const change = parseFloat(cash || "0") - total;
  // Sort all products once: by category then name (Arabic)
  const sortedProds = useMemo(() =>
    [...allProds].sort((a, b) =>
      (a.category || "").localeCompare(b.category || "", "ar") ||
      (a.nameAr || "").localeCompare(b.nameAr || "", "ar")
    ), [allProds]);

  // Categories with counts, sorted by count desc
  const cats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of allProds) counts[p.category || "عام"] = (counts[p.category || "عام"] || 0) + 1;
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([c]) => c);
    return ["الكل", ...sorted];
  }, [allProds]);

  // Filtered products (memoized) — includes posTab filter (all/fav/recent)
  const prods = useMemo(() => {
    const tabFiltered = posTab === "fav"
      ? sortedProds.filter(p => favorites.includes(p.id))
      : posTab === "recent"
        ? recentIds.map(id => sortedProds.find(p => p.id === id)).filter(Boolean) as Product[]
        : sortedProds;
    return tabFiltered.filter(p =>
      (!q || p.nameAr.includes(q) || (p.barcode || "").includes(q) || (p.sku || "").toLowerCase().includes(q.toLowerCase())) &&
      (cat === "الكل" || p.category === cat)
    );
  }, [sortedProds, q, cat, posTab, favorites, recentIds]);

  // Reset display count when filter changes
  useEffect(() => setDisplayCount(DISPLAY_LIMIT), [q, cat, posTab]);

  // Infinite scroll: load more when sentinel enters viewport
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setDisplayCount(c => Math.min(c + DISPLAY_LIMIT, prods.length));
    }, { threshold: 0.1 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [prods.length]);

  const displayedProds = prods.slice(0, displayCount);

  // Barcode scanner: detect Enter key → instant add to cart (supports barcodes[] array)
  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !q.trim()) return;
    const val = q.trim();
    const found = allProds.find(p =>
      p.barcode === val ||
      (p.barcodes && p.barcodes.includes(val)) ||
      p.sku === val ||
      p.nameAr === val
    );
    if (found) {
      add(found);
      setQ("");
    } else {
      // Product not found — open manual entry modal
      setManualEntry({ barcode: val });
      setManualForm({ nameAr: "", sellPrice: "", qty: "1" });
      setQ("");
    }
  };

  const add = (p: Product) => {
    if (p.stock <= 0) { showToast(`"${p.nameAr}" نفد من المخزون`, "error"); return; }
    // Find best active promo for this product
    const bestPromo = activePromos.find(pr =>
      pr.appliesTo === "all" ||
      (pr.appliesTo === "specific" && (
        pr.categories?.includes(p.category || "") ||
        (pr as ActivePromo & { productIds?: string[] }).productIds?.includes(p.id)
      ))
    );
    let promoDiscount = 0;
    if (bestPromo) {
      if (bestPromo.type === "percentage") {
        promoDiscount = bestPromo.discountValue;
      } else if (bestPromo.type === "fixed" && p.sellPrice > 0) {
        promoDiscount = Math.min(100, Math.round((bestPromo.discountValue / p.sellPrice) * 10000) / 100);
      }
    }
    setCart(prev => {
      const ex = prev.find(i => i.product.id === p.id);
      if (ex) {
        if (ex.qty >= p.stock) { showToast(`الكمية المتاحة فقط ${p.stock} وحدة`, "warning"); return prev; }
        return prev.map(i => i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product: p, qty: 1, discount: promoDiscount, promoApplied: bestPromo?.name }];
    });
    if (bestPromo && promoDiscount > 0) showToast(`تم تطبيق عرض "${bestPromo.name}" — خصم ${bestPromo.discountValue}${bestPromo.type === "percentage" ? "%" : " JOD"}`, "success");
    setRecentIds(prev => [p.id, ...prev.filter(id=>id!==p.id)].slice(0,20));
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

  // Build per-tax-rate breakdown for receipt and UI
  const taxBreakdown = useMemo(() => {
    const map: Record<number, number> = {};
    for (const i of cart) {
      const rate = i.product.taxRate !== undefined ? i.product.taxRate : TAX * 100;
      const lineNet = i.product.sellPrice * i.qty * (1 - i.discount / 100) * (1 - disc / 100);
      map[rate] = (map[rate] || 0) + lineNet * (rate / 100);
    }
    return Object.entries(map)
      .map(([rate, amt]) => ({ rate: Number(rate), amt }))
      .filter(x => x.rate > 0)
      .sort((a, b) => b.rate - a.rate);
  }, [cart, disc, TAX]);

  const hasMultiTax = taxBreakdown.length > 1;

  const doPrint = () => printReceipt({
    invNo,
    storeName: store.nameAr || 'متجري',
    storePhone: store.phone || '',
    items: cart.map(i => ({
      name: i.product.nameAr, qty: i.qty, price: i.product.sellPrice, discount: i.discount,
      taxRate: i.product.taxRate !== undefined ? i.product.taxRate : TAX * 100,
    })),
    subtotal: sub, discountAmt: da, taxAmt: ta,
    taxRate: hasMultiTax ? undefined : (taxBreakdown[0]?.rate ?? TAX * 100),
    taxBreakdown: hasMultiTax ? taxBreakdown : undefined,
    total,
    payMethod: pay === "cash" ? "نقدي" : pay === "cliq" ? "كليك" : pay === "card" ? "بطاقة ائتمانية" : "ذمة",
    change: change > 0 ? change : undefined,
    cashIn: pay === "cash" ? parseFloat(cash || "0") : undefined,
    date: new Date().toLocaleDateString("ar-JO"),
    time: new Date().toLocaleTimeString("ar-JO", { hour: "2-digit", minute: "2-digit" }),
  }, paper);

  const doPay = async () => {
    const saleItems = cart.map(i => {
      const lineTotal = i.product.sellPrice * i.qty * (1 - i.discount / 100);
      const itemTaxRate = i.product.taxRate !== undefined ? i.product.taxRate : TAX * 100;
      return {
        productId: i.product.id,
        nameAr:    i.product.nameAr,
        qty:       i.qty,
        unitPrice: i.product.sellPrice,
        discount:  i.discount,
        taxRate:   itemTaxRate,
        taxAmt:    lineTotal * (1 - disc / 100) * (itemTaxRate / 100),
        total:     lineTotal,
      };
    });
    const salePayload = {
      invoiceNo:    invNo,
      items:        saleItems,
      subtotal: sub, discountAmt: da + pointsDiscount + giftDiscount + couponDiscount, taxAmt: ta, total: finalTotal,
      payMethod: splitMode ? "cash" : pay, // split: store primary method as cash for now
      splitPayments: splitMode ? splitRows.filter(r => parseFloat(r.amount||"0") > 0).map(r => ({ method: r.method, amount: parseFloat(r.amount) })) : undefined,
      cashIn:     !splitMode && pay === "cash" ? parseFloat(cash || "0") : undefined,
      change:     !splitMode && pay === "cash" ? Math.max(0, parseFloat(cash || "0") - finalTotal) : undefined,
      cliqRef:    !splitMode && pay === "cliq" ? cliqRef : undefined,
      cliqSender: !splitMode && pay === "cliq" ? cliqSender : undefined,
      cardRef:    !splitMode && pay === "card" ? cardRef : undefined,
      giftCardCode: giftCard ? giftCard.code : undefined,
      giftCardDiscount: giftDiscount > 0 ? giftDiscount : undefined,
      couponCode: coupon ? coupon.code : undefined,
      couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
      customerId:   selectedCustomer?.id,
      customerName: selectedCustomer?.name || "عميل نقدي",
      customerPhone:selectedCustomer?.phone,
      loyaltyPointsEarned:   pointsEarned || undefined,
      loyaltyPointsRedeemed: pointsToRedeem || undefined,
      cashierName:  posUserName || undefined,
      cashierId:    posUserId !== "default" ? posUserId : undefined,
      status: "completed",
    };

    // Redeem gift card if applied
    if (giftCard && giftDiscount > 0 && isOnline) {
      try { await storeApi.post("/gift-cards/redeem", { code: giftCard.code, amount: giftDiscount }); } catch { /* non-critical */ }
    }
    // Increment coupon use counter
    if (coupon && couponDiscount > 0 && isOnline) {
      try { await storeApi.patch(`/coupons/${coupon.id}/use`, {}); } catch { /* non-critical */ }
    }

    if (isOnline) {
      try {
        await storeApi.post("/sales", salePayload);
        setTimeout(() => refreshPosProds(), 500);
      } catch (err) {
        const e = err as { error?: string; message?: string; code?: string };
        const isNetworkError = !e.code && !e.error;
        if (isNetworkError) {
          // True network failure — save offline
          await saveOfflineSale(saleItems);
          queueOffline("/sales", salePayload);
        } else {
          // Server returned an error — show it, do NOT silently save offline
          showToast(e.error || e.message || "فشل حفظ الفاتورة", "error");
          return;
        }
      }
    } else {
      // Fully offline — save to IndexedDB + localStorage queue
      await saveOfflineSale(saleItems);
      queueOffline("/sales", salePayload);
    }

    setOk(true);
    setRedeemPoints(false);
    setSplitMode(false);
    setSplitRows([{method:"cash",amount:""},{method:"cliq",amount:""}]);
    setGiftCard(null); setGiftCode("");
    setCoupon(null); setCouponCode("");
    invNoRef.current = `INV-${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;
    if (drawerAuto && (pay === "cash" || (splitMode && splitRows.some(r => r.method === "cash")))) openDrawer();
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
        payMethod: pay as "cash" | "cliq" | "card" | "credit",
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
    setSelectedCustomer(null); setCustomerQ(""); setRedeemPoints(false);
    setSplitMode(false); setSplitRows([{method:"cash",amount:""},{method:"cliq",amount:""}]);
    setGiftCard(null); setGiftCode("");
    setCoupon(null); setCouponCode("");
  };

  const openSession = () => {
    const s: CashSession = { openedAt: new Date().toISOString(), openingBalance: parseFloat(openingBal) || 0, status: "open" };
    setSession(s);
    setShowOpenSession(false);
    showToast(`تم فتح الجلسة — الرصيد الافتتاحي: ${(parseFloat(openingBal)||0).toFixed(3)} JOD`, "success");
  };

  // ── Shift Report Print ─────────────────────────────────────────────────────
  type ShiftSale = { id: string; total: number; payMethod: string; createdAt: string; invoiceNo: string; customerName?: string; items?: { nameAr?: string; qty: number; unitPrice?: number; total?: number }[] };

  const buildShiftHtml = (salesList: ShiftSale[], closingBalance?: number, cashierName?: string) => {
    const sessionStart = session?.openedAt ? new Date(session.openedAt) : null;
    const filtered = salesList.filter(s => sessionStart ? new Date(s.createdAt) >= sessionStart : true);
    const now = new Date();
    const gross  = filtered.reduce((a, s) => a + s.total, 0);
    const cash   = filtered.filter(s => s.payMethod === "cash").reduce((a, s) => a + s.total, 0);
    const cliq   = filtered.filter(s => s.payMethod === "cliq").reduce((a, s) => a + s.total, 0);
    const card   = filtered.filter(s => s.payMethod === "card").reduce((a, s) => a + s.total, 0);
    const credit = filtered.filter(s => s.payMethod === "credit").reduce((a, s) => a + s.total, 0);

    // Aggregate products
    const prodMap: Record<string, { nameAr: string; qty: number; total: number }> = {};
    for (const sale of filtered) {
      for (const item of sale.items || []) {
        const key = item.nameAr || "منتج";
        if (!prodMap[key]) prodMap[key] = { nameAr: key, qty: 0, total: 0 };
        prodMap[key].qty   += item.qty || 0;
        prodMap[key].total += item.total || 0;
      }
    }
    const products = Object.values(prodMap).sort((a, b) => b.qty - a.qty);

    const row = (label: string, value: string, bold = false) =>
      `<div class="row${bold ? " bold" : ""}"><span>${label}</span><span>${value}</span></div>`;

    const prodRows = products.map(p =>
      `<tr><td>${p.nameAr}</td><td style="text-align:center">${p.qty}</td><td style="text-align:left">${p.total.toFixed(3)}</td></tr>`
    ).join("");

    const invoiceRows = filtered.map(s =>
      `<tr><td style="font-family:monospace">${s.invoiceNo}</td><td>${s.customerName || "نقدي"}</td><td style="text-align:center">${s.payMethod === "cash" ? "نقدي" : s.payMethod === "cliq" ? "كليك" : s.payMethod === "card" ? "بطاقة" : "ذمة"}</td><td style="text-align:left">${s.total.toFixed(3)}</td></tr>`
    ).join("");

    return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>تقرير الشفت</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Cairo','Tahoma',Arial,sans-serif;direction:rtl;padding:20px 24px;color:#111;font-size:12px;max-width:80mm;margin:auto}
h1{text-align:center;font-size:16px;font-weight:900;margin-bottom:2px}
h2{font-size:13px;font-weight:700;margin:14px 0 6px;border-bottom:1px solid #ddd;padding-bottom:4px}
p.sub{text-align:center;color:#555;font-size:10px;margin-bottom:4px}
.row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed #e5e7eb;font-size:12px}
.row.bold{font-weight:900;font-size:13px;border-bottom:2px solid #111;margin-top:2px}
.badge{display:inline-block;background:#f3f4f6;padding:2px 8px;border-radius:4px;font-size:11px}
table{width:100%;border-collapse:collapse;font-size:11px;margin-top:4px}
thead tr{background:#f3f4f6}
th,td{padding:4px 5px;text-align:right;border-bottom:1px solid #e5e7eb}
.footer{margin-top:16px;text-align:center;font-size:9px;color:#999;border-top:1px dashed #ddd;padding-top:10px}
@media print{body{padding:8px}}
</style></head><body>
<h1>تقرير الشفت</h1>
<p class="sub">${store.nameAr}</p>
${cashierName ? `<p class="sub">الكاشير: <strong>${cashierName}</strong></p>` : ""}
<p class="sub">بدأ: ${sessionStart ? sessionStart.toLocaleString("ar-JO") : "—"}</p>
<p class="sub">انتهى: ${now.toLocaleString("ar-JO")}</p>

<h2>ملخص المبيعات</h2>
${row("عدد الفواتير", String(filtered.length))}
${row("إجمالي المبيعات", `${gross.toFixed(3)} JOD`, true)}
${row("نقدي", `${cash.toFixed(3)} JOD`)}
${row("كليك", `${cliq.toFixed(3)} JOD`)}
${row("بطاقة", `${card.toFixed(3)} JOD`)}
${credit > 0 ? row("ذمة (غير محصّلة)", `${credit.toFixed(3)} JOD`) : ""}
${session ? row("الرصيد الافتتاحي", `${session.openingBalance.toFixed(3)} JOD`) : ""}
${closingBalance !== undefined ? row("الرصيد الختامي", `${closingBalance.toFixed(3)} JOD`) : ""}
${closingBalance !== undefined && session ? row("الفرق", `${(closingBalance - session.openingBalance).toFixed(3)} JOD`, true) : ""}

${products.length > 0 ? `
<h2>المنتجات المباعة (${products.length} صنف)</h2>
<table>
<thead><tr><th>المنتج</th><th style="text-align:center">الكمية</th><th style="text-align:left">المبلغ</th></tr></thead>
<tbody>${prodRows}</tbody>
</table>` : ""}

${filtered.length > 0 ? `
<h2>الفواتير (${filtered.length})</h2>
<table>
<thead><tr><th>رقم</th><th>العميل</th><th style="text-align:center">الدفع</th><th style="text-align:left">المبلغ</th></tr></thead>
<tbody>${invoiceRows}</tbody>
</table>` : ""}

<div class="footer">Sowwanjo POS · ${now.toLocaleDateString("ar-JO")}</div>
</body></html>`;
  };

  const printShiftReport = (salesList: ShiftSale[], closingBalance?: number) => {
    const html = buildShiftHtml(salesList, closingBalance, posUserName || posRole);
    const w = window.open("", "_blank", "width=500,height=700");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => { w.focus(); w.print(); }, 400); }
  };

  const closeSession = () => {
    if (!session) return;
    const closing = parseFloat(closingBal) || 0;
    setSession(null);
    setShowCloseSession(false);
    setCart([]);
    showToast("تم إغلاق الجلسة النقدية بنجاح", "success");
    // Print shift report with products
    const salesList = normList<ShiftSale>(shiftSales).filter(s =>
      session.openedAt ? new Date(s.createdAt) >= new Date(session.openedAt) : true
    );
    printShiftReport(salesList, closing);
  };

  // If no session, show session open screen
  if (!session) {
    const ROLE_AR_MAP: Record<string,string> = { owner:"مالك", manager:"مدير", cashier:"كاشير", inventory:"مسؤول مخزون", accountant:"محاسب" };
    return (
      <div className="flex h-full items-center justify-center" style={{background:"linear-gradient(135deg,#0f2520 0%,#173A34 60%,#1e4a3f 100%)"}}>
        <div className="w-full max-w-md mx-auto px-4">
          {/* Brand */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl" style={{background:"#C8A45C"}}>
              <Monitor size={38} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-white mb-1">{store.nameAr || "نقطة البيع"}</h1>
            <p className="text-sm" style={{color:"#C8A45C"}}>بدء جلسة نقدية جديدة</p>
          </div>
          {/* User badge */}
          {posUserName && (
            <div className="flex items-center gap-3 mb-5 px-4 py-3 rounded-2xl border" style={{background:"rgba(255,255,255,0.06)",borderColor:"rgba(200,164,92,0.3)"}}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0" style={{background:"#C8A45C",color:"#173A34"}}>
                {posUserName.charAt(0)}
              </div>
              <div>
                <p className="font-black text-white text-sm">{posUserName}</p>
                <p className="text-xs" style={{color:"rgba(255,255,255,0.5)"}}>{ROLE_AR_MAP[posRole] || posRole}</p>
              </div>
            </div>
          )}
          {/* Card */}
          <div className="rounded-2xl p-6 shadow-2xl" style={{background:"#F7F5F2"}}>
            <p className="text-sm text-muted-foreground mb-4 text-center">أدخل الرصيد الافتتاحي في الدرج النقدي</p>
            <F label="الرصيد الافتتاحي (JOD)">
              <TInput value={openingBal} onChange={setOpeningBal} type="number" placeholder="0.000" icon={<Banknote size={13} />} />
            </F>
            <div className="grid grid-cols-3 gap-2 my-4">
              {[0, 10, 20, 50, 100, 200].map(v => (
                <button key={v} onClick={() => setOpeningBal(String(v))}
                  className="h-11 rounded-xl text-sm font-bold border transition-all"
                  style={openingBal === String(v)
                    ? {background:"#173A34",color:"#F7F5F2",borderColor:"#173A34"}
                    : {background:"white",color:"#173A34",borderColor:"#e5e7eb"}}>
                  {v} JOD
                </button>
              ))}
            </div>
            <button onClick={openSession}
              className="w-full h-12 rounded-xl font-black text-base flex items-center justify-center gap-2 transition-all hover:opacity-90"
              style={{background:"#173A34",color:"#F7F5F2"}}>
              <Power size={16} />فتح الجلسة
            </button>
          </div>
          <p className="text-center text-xs mt-4" style={{color:"rgba(255,255,255,0.35)"}}>{new Date().toLocaleString("ar-JO")}</p>
        </div>
      </div>
    );
  }

  /* ─── MAIN 3-COLUMN POS LAYOUT ───────────────────────────────────────────── */
  return (
    <main dir="rtl" className="flex h-full overflow-hidden" style={{background:"#F0EEE9",fontFamily:"'Cairo','Inter',sans-serif"}} aria-label="نقطة البيع">

      {/* ══ LEFT PANEL — Cart ══════════════════════════════════════════════════ */}
      <div className="flex flex-col overflow-hidden border-l border-border" style={{width:320,minWidth:320,background:"white"}}>

        {/* Cart header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border" style={{background:"#173A34"}}>
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-white" />
            <span className="font-black text-white text-sm">الفاتورة</span>
            {cart.length > 0 && (
              <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{background:"#C8A45C",color:"#173A34"}}>
                {cart.reduce((a,i)=>a+i.qty,0)}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-xs font-bold px-2 py-1 rounded-lg transition-all hover:bg-white/10" style={{color:"rgba(255,255,255,0.6)"}}>
              مسح الكل
            </button>
          )}
        </div>

        {/* Customer selector */}
        <div className="shrink-0 px-3 py-2.5 border-b border-border/60 relative">
          <div className="flex gap-1.5">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="اختر عميل (اختياري)..."
                value={selectedCustomer ? selectedCustomer.name : customerQ}
                onChange={e => { setCustomerQ(e.target.value); setShowCustSearch(true); setSelectedCustomer(null); }}
                onFocus={() => setShowCustSearch(true)}
                className="w-full h-9 rounded-xl border border-border bg-background text-sm px-3 pr-8 focus:outline-none focus:ring-2 focus:ring-ring/25"
              />
              <Users size={13} className="absolute right-2.5 top-2.5 text-muted-foreground pointer-events-none" />
              {selectedCustomer && (
                <button onClick={() => { setSelectedCustomer(null); setCustomerQ(""); }} className="absolute left-2.5 top-2.5 text-muted-foreground hover:text-foreground"><X size={13} /></button>
              )}
            </div>
            <button onClick={() => setShowAddCust(true)} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted/50 transition-all shrink-0">
              <Plus size={14} className="text-muted-foreground" />
            </button>
          </div>
          {showCustSearch && customerQ && (
            <div className="absolute right-3 left-3 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
              {posCustomers.filter(c => c.name.includes(customerQ) || (c.phone||"").includes(customerQ)).slice(0,8).map(c => (
                <button key={c.id} className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-all text-right"
                  onClick={() => { setSelectedCustomer(c); setCustomerQ(""); setShowCustSearch(false); }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black" style={{background:"#173A34",color:"white"}}>{c.name.charAt(0)}</div>
                  <div className="text-right flex-1">
                    <p className="text-sm font-bold text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                  {(c.loyaltyPoints||0) > 0 && <span className="text-xs font-black" style={{color:"#C8A45C"}}>{c.loyaltyPoints} نقطة</span>}
                </button>
              ))}
              {posCustomers.filter(c => c.name.includes(customerQ) || (c.phone||"").includes(customerQ)).length === 0 && (
                <p className="text-center py-3 text-sm text-muted-foreground">لا نتائج — <button className="text-primary font-bold" onClick={()=>{setShowCustSearch(false);setShowAddCust(true);}}>إضافة عميل جديد</button></p>
              )}
            </div>
          )}
          {selectedCustomer && (
            <div className="flex items-center justify-between mt-1.5 px-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle size={12} style={{color:"#173A34"}} />
                <span className="text-xs font-bold" style={{color:"#173A34"}}>{selectedCustomer.name}</span>
              </div>
              {(selectedCustomer.loyaltyPoints||0) > 0 && (
                <div className="flex items-center gap-1">
                  <Star size={11} style={{color:"#C8A45C"}} />
                  <span className="text-xs font-black" style={{color:"#C8A45C"}}>{selectedCustomer.loyaltyPoints} نقطة</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto" onClick={() => showCustSearch && setShowCustSearch(false)}>
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-10 px-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{background:"#F0EEE9"}}>
                <ShoppingCart size={28} style={{color:"#C8A45C"}} />
              </div>
              <p className="text-sm font-bold text-muted-foreground">السلة فارغة</p>
              <p className="text-xs text-muted-foreground mt-1">اضغط على منتج لإضافته</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {cart.map((item) => (
                <div key={item.product.id} className="px-3 py-2.5 hover:bg-muted/30 transition-all">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate leading-tight">{item.product.nameAr}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs font-black" style={{color:"#173A34"}}>{(item.product.sellPrice * (1 - item.discount/100)).toFixed(3)}</span>
                        <span className="text-xs text-muted-foreground">JOD</span>
                        {item.discount > 0 && <span className="text-xs line-through text-muted-foreground">{item.product.sellPrice.toFixed(3)}</span>}
                        {item.promoApplied && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{background:"#173A34",color:"#C8A45C"}}>{item.promoApplied}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => item.qty === 1 ? rm(item.product.id) : upd(item.product.id, -1)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all border border-border hover:bg-red-50 hover:border-red-200 hover:text-red-500">
                        {item.qty === 1 ? <Trash2 size={11} /> : <Minus size={11} />}
                      </button>
                      <span className="w-7 text-center text-sm font-black">{item.qty}</span>
                      <button onClick={() => upd(item.product.id, 1)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all border border-border hover:border-primary hover:text-primary">
                        <Plus size={11} />
                      </button>
                    </div>
                    <div className="text-right shrink-0 w-16">
                      <p className="text-sm font-black">{(item.product.sellPrice * item.qty * (1-item.discount/100)).toFixed(3)}</p>
                    </div>
                  </div>
                  {isOwnerOrMgr && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <Percent size={10} className="text-muted-foreground shrink-0" />
                      <input type="range" min={0} max={50} step={1} value={item.discount}
                        onChange={e => updd(item.product.id, parseFloat(e.target.value))}
                        className="flex-1 h-1 accent-primary cursor-pointer" />
                      <span className="text-xs font-black w-8 text-left" style={{color: item.discount > 0 ? "#173A34" : undefined}}>{item.discount}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Held orders */}
        {holds.length > 0 && (
          <div className="shrink-0 border-t border-border/60 px-3 py-2" style={{background:"#FFFBF0"}}>
            <p className="text-xs font-bold text-amber-700 mb-1.5 flex items-center gap-1"><Archive size={11} /> طلبات معلقة ({holds.length})</p>
            <div className="flex gap-1.5 flex-wrap">
              {holds.map((h, i) => (
                <button key={i} onClick={() => resume(i)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold border border-amber-200 bg-white text-amber-700 hover:bg-amber-100 transition-all">
                  طلب {i+1} ({h.reduce((a,x)=>a+x.qty,0)} قطعة)
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cart totals + checkout */}
        {cart.length > 0 && (
          <div className="shrink-0 border-t border-border" style={{background:"#F7F5F2"}}>
            <div className="px-4 py-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">المجموع الفرعي</span>
                <span className="font-bold">{sub.toFixed(3)} JOD</span>
              </div>
              {isOwnerOrMgr && (
                <div className="flex items-center gap-2 py-0.5">
                  <span className="text-xs text-muted-foreground shrink-0">خصم الفاتورة</span>
                  <input type="range" min={0} max={50} step={1} value={disc} onChange={e => setDisc(parseFloat(e.target.value))} className="flex-1 h-1 accent-primary cursor-pointer" />
                  <span className="text-xs font-black w-8 text-left" style={{color: disc > 0 ? "#173A34" : undefined}}>{disc}%</span>
                </div>
              )}
              {da > 0 && <div className="flex justify-between text-sm"><span className="text-red-500">خصم</span><span className="font-bold text-red-500">-{da.toFixed(3)} JOD</span></div>}
              {ta > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">ضريبة</span><span className="font-bold">+{ta.toFixed(3)} JOD</span></div>}
              {pointsDiscount > 0 && <div className="flex justify-between text-sm"><span className="text-amber-500">نقاط الولاء</span><span className="font-bold text-amber-600">-{pointsDiscount.toFixed(3)} JOD</span></div>}
              {giftDiscount > 0 && <div className="flex justify-between text-sm"><span className="text-emerald-500">بطاقة هدية</span><span className="font-bold text-emerald-600">-{giftDiscount.toFixed(3)} JOD</span></div>}
              {couponDiscount > 0 && <div className="flex justify-between text-sm"><span className="text-blue-500">كوبون</span><span className="font-bold text-blue-600">-{couponDiscount.toFixed(3)} JOD</span></div>}
              <div className="flex justify-between pt-1.5 border-t border-border">
                <span className="font-black text-base">الإجمالي</span>
                <span className="font-black text-xl" style={{color:"#173A34"}}>{finalTotal.toFixed(3)} JOD</span>
              </div>
            </div>
            <div className="flex gap-1.5 px-3 pb-3">
              <button onClick={hold} title="تعليق الطلب" className="w-10 h-10 rounded-xl border border-border flex items-center justify-center hover:bg-amber-50 hover:border-amber-200 transition-all shrink-0">
                <Archive size={15} className="text-muted-foreground" />
              </button>
              <button onClick={doPrint} title="طباعة" className="w-10 h-10 rounded-xl border border-border flex items-center justify-center hover:bg-muted/50 transition-all shrink-0">
                <Printer size={15} className="text-muted-foreground" />
              </button>
              <button onClick={() => setCart([])} title="مسح" className="w-10 h-10 rounded-xl border border-border flex items-center justify-center hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all shrink-0">
                <X size={15} className="text-muted-foreground" />
              </button>
              <button onClick={() => setShowPay(true)}
                className="flex-1 h-10 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{background:"#C8A45C",color:"#173A34"}}>
                <CreditCard size={15} />الدفع
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══ CENTER PANEL — Products ════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="shrink-0 px-3 py-2.5 border-b border-border space-y-2" style={{background:"white"}}>
          {!isOnline && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs font-bold text-amber-700">
              <WifiOff size={12} className="shrink-0" /><span>أوف لاين — المبيعات تُحفظ محلياً</span>
            </div>
          )}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              {scannerMode ? (
                <div className="w-full h-10 rounded-xl border-2 border-dashed flex items-center gap-2 px-3" style={{borderColor:"#C8A45C",background:"#FFFBF0"}}>
                  <Scan size={14} style={{color:"#C8A45C"}} className="shrink-0 animate-pulse" />
                  <input ref={searchRef} type="text" value={q} onChange={e => setQ(e.target.value)} onKeyDown={handleSearchKey}
                    className="flex-1 bg-transparent outline-none text-sm font-bold" placeholder="امسح الباركود..." autoFocus style={{color:"#173A34"}} />
                </div>
              ) : (
                <div className="relative">
                  <Search size={14} className="absolute right-3 top-3 text-muted-foreground pointer-events-none" />
                  <input ref={searchRef} type="text" value={q} onChange={e => setQ(e.target.value)} onKeyDown={handleSearchKey}
                    placeholder="ابحث بالاسم، الباركود، SKU..."
                    className="w-full h-10 rounded-xl border border-border bg-background text-sm pr-9 pl-3 focus:outline-none focus:ring-2 focus:ring-ring/25" />
                  {q && <button onClick={() => setQ("")} className="absolute left-3 top-3 text-muted-foreground hover:text-foreground"><X size={12} /></button>}
                </div>
              )}
            </div>
            <button onClick={() => { setScannerMode(m => !m); setQ(""); setTimeout(() => searchRef.current?.focus(), 50); }}
              className="w-10 h-10 rounded-xl border transition-all flex items-center justify-center shrink-0"
              style={scannerMode ? {background:"#173A34",borderColor:"#173A34",color:"white"} : {background:"white",borderColor:"#e5e7eb",color:"#6b7280"}}>
              <Scan size={15} />
            </button>
            <button onClick={() => setVm(v => v === "grid" ? "list" : "grid")}
              className="w-10 h-10 rounded-xl border border-border bg-white flex items-center justify-center shrink-0 hover:bg-muted/50 transition-all">
              {vm === "grid" ? <List size={15} className="text-muted-foreground" /> : <Grid3X3 size={15} className="text-muted-foreground" />}
            </button>
          </div>
          {/* Catalog filters appear only during search; keep the default cashier view uncluttered. */}
          {q.trim() && (<div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
            {/* View tabs */}
            {(["all","fav","recent"] as const).map((t, i) => {
              const labels = ["الكل","★ مفضلة","⏱ أخيرة"];
              return (
                <button key={t} onClick={() => setPosTab(t)}
                  className="flex items-center gap-1 px-2.5 h-7 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0"
                  style={posTab === t ? {background:"#173A34",color:"white"} : {background:"#f0f0f0",color:"#666"}}>
                  {labels[i]}
                </button>
              );
            })}
            {cats.length > 0 && <div className="w-px h-4 bg-border/60 shrink-0 mx-0.5" />}
            {/* Category chips */}
            {cats.map(c => (
              <button key={c} onClick={() => setCat(cat === c ? "" : c)}
                className="px-2.5 h-7 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0"
                style={cat === c
                  ? {background:"#C8A45C",color:"#173A34",fontWeight:800}
                  : {background:"#f0f0f0",color:"#555"}}>
                {c}
              </button>
            ))}
            {cat && (
              <button onClick={() => setCat("")}
                className="h-7 w-7 flex items-center justify-center rounded-lg shrink-0 hover:bg-red-50 transition-all"
                style={{background:"#fee2e2",color:"#ef4444"}}
                title="مسح الفلتر">
                <X size={11} />
              </button>
            )}
          </div>)}
        </div>

        {/* Products grid — hidden until the cashier searches or scans */}
        {true ? (<div className="flex-1 overflow-y-auto p-2.5">
          {prods.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16">
              <Package size={40} className="text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm font-bold">{posTab === "fav" ? "لا توجد مفضلات" : posTab === "recent" ? "لا يوجد سجل حديث" : "لا توجد منتجات"}</p>
              {q && <button onClick={() => setQ("")} className="mt-2 text-xs text-primary hover:underline">مسح البحث</button>}
            </div>
          ) : vm === "grid" ? (
            <div className="grid gap-2" style={{gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))"}}>
              {displayedProds.map(p => {
                const inCart = cart.find(i => i.product.id === p.id);
                const outOfStock = p.stock <= 0;
                const low = !outOfStock && p.stock <= p.minStock;
                return (
                  <div key={p.id} className="relative group">
                    <button onClick={() => add(p)} disabled={outOfStock}
                      className="w-full flex flex-col rounded-xl border-2 transition-all text-right overflow-hidden active:scale-95"
                      style={outOfStock
                        ? {opacity:0.55,cursor:"not-allowed",borderColor:"#e5e7eb",background:"#fafafa"}
                        : inCart
                        ? {borderColor:"#173A34",background:"#f0f7f5",boxShadow:"0 0 0 3px rgba(23,58,52,0.08)"}
                        : {borderColor:"#e8e8e8",background:"white"}}>
                      {/* Image — fixed 68px height, letter fallback when no image */}
                      <div className="w-full relative overflow-hidden shrink-0"
                        style={{height:68, background: inCart ? "#d6ede7" : "#eeece8"}}>
                        <img src={p.image} alt={p.nameAr} className="w-full h-full object-cover"
                          style={{display: p.image ? undefined : "none"}}
                          onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
                        {!p.image && (
                          <span className="absolute inset-0 flex items-center justify-center text-3xl font-black select-none"
                            style={{color:"#173A34",opacity:0.18}}>{p.nameAr?.charAt(0)||"؟"}</span>
                        )}
                        {outOfStock && (
                          <div className="absolute inset-0 flex items-center justify-center" style={{background:"rgba(0,0,0,0.52)"}}>
                            <span className="text-xs font-black text-white px-2 py-0.5 rounded-full bg-black/60">نفد</span>
                          </div>
                        )}
                        {inCart && (
                          <span className="absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow"
                            style={{background:"#173A34",color:"#C8A45C"}}>{inCart.qty}</span>
                        )}
                        {low && !outOfStock && !inCart && (
                          <span className="absolute top-1 left-1 text-[9px] font-black px-1 py-0.5 rounded shadow"
                            style={{background:"#F59E0B",color:"white"}}>{p.stock}</span>
                        )}
                      </div>
                      {/* Name + price — always readable */}
                      <div className="px-2 pt-1.5 pb-2">
                        <p className="text-xs font-bold leading-tight line-clamp-2 text-foreground" style={{minHeight:"2.3em"}}>
                          {p.nameAr}
                        </p>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-sm font-black" style={{color:"#173A34"}}>{p.sellPrice.toFixed(3)}</span>
                          <span className="text-[9px] font-medium" style={{color:"#aaa"}}>JOD</span>
                        </div>
                      </div>
                    </button>
                    <button onClick={e => { e.stopPropagation(); toggleFav(p.id); }}
                      className="absolute top-1 right-1 text-sm leading-none transition-all opacity-0 group-hover:opacity-100 drop-shadow"
                      style={favorites.includes(p.id) ? {opacity:1} : {}}>
                      {favorites.includes(p.id) ? "⭐" : "☆"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1">
              {displayedProds.map(p => {
                const inCart = cart.find(i => i.product.id === p.id);
                const outOfStock = p.stock <= 0;
                const lowStock = !outOfStock && p.stock <= p.minStock;
                return (
                  <button key={p.id} onClick={() => add(p)} disabled={outOfStock}
                    className="w-full flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-all text-right active:scale-[0.99]"
                    style={outOfStock
                      ? {opacity:0.55,cursor:"not-allowed",borderColor:"#e5e7eb",background:"#fafafa"}
                      : inCart
                      ? {borderColor:"#173A34",background:"#f0f7f5"}
                      : {borderColor:"#e8e8e8",background:"white"}}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden text-xl font-black"
                      style={{background: inCart ? "#d6ede7" : "#eeece8", color:"#173A34"}}>
                      {p.image
                        ? <img src={p.image} alt={p.nameAr} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
                        : <span style={{opacity:0.28}}>{p.nameAr?.charAt(0)||"؟"}</span>
                      }
                    </div>
                    <div className="flex-1 text-right min-w-0">
                      <p className="text-sm font-bold truncate text-foreground">{p.nameAr}</p>
                      <p className="text-xs" style={{color:"#9ca3af"}}>
                        {p.category}{p.category ? " · " : ""}
                        <span className={outOfStock ? "text-red-500 font-bold" : lowStock ? "text-amber-500 font-bold" : "text-emerald-600 font-medium"}>
                          {outOfStock ? "نفد المخزون" : `${p.stock} ${p.unit||"قطعة"}`}
                        </span>
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      <div className="text-left">
                        <p className="text-sm font-black" style={{color:"#173A34"}}>{p.sellPrice.toFixed(3)}</p>
                        <p className="text-[10px]" style={{color:"#aaa"}}>JOD</p>
                      </div>
                      {inCart && (
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black"
                          style={{background:"#173A34",color:"#C8A45C"}}>{inCart.qty}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <div ref={loadMoreRef} className="h-4" />
        </div>) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center" style={{background:"#fafaf8"}}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{background:"#e8f0ed",color:"#173A34"}}><Scan size={30} /></div>
            <p className="font-black text-base" style={{color:"#173A34"}}>لا توجد منتجات مطابقة</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs">جرّب البحث باسم المنتج أو امسح الباركود، أو غيّر التصنيف المحدد.</p>
          </div>
        )}
      </div>

      {/* ══ RIGHT PANEL — Quick Actions ═══════════════════════════════════════ */}
      <div className="flex flex-col overflow-hidden border-r border-border" style={{width:268,minWidth:268,background:"white"}}>

        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b border-border" style={{background:"#173A34"}}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0" style={{background:"#C8A45C",color:"#173A34"}}>
              {posUserName ? posUserName.charAt(0) : "P"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white truncate">{posUserName || "كاشير"}</p>
              <p className="text-[10px]" style={{color:"rgba(200,164,92,0.8)"}}>
                {session ? `${new Date(session.openedAt).toLocaleTimeString("ar-JO",{hour:"2-digit",minute:"2-digit"})} · مفتوح` : "جلسة مفتوحة"}
              </p>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{background:"rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.5)"}}>{invNo}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Payment method */}
          <div className="px-3 pt-3 pb-2">
            <p className="text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-wider">طريقة الدفع</p>
            <div className="grid grid-cols-2 gap-1.5">
              {([
                {id:"cash" as const,  label:"نقدي",  icon:<Banknote size={15}/>,   color:"#22C55E"},
                {id:"cliq" as const,  label:"كليك",  icon:<Zap size={15}/>,         color:"#8B5CF6"},
                {id:"card" as const,  label:"بطاقة", icon:<CreditCard size={15}/>,  color:"#3B82F6"},
                {id:"credit" as const,label:"ذمة",   icon:<FileText size={15}/>,    color:"#F59E0B"},
              ]).map(m => (
                <button key={m.id} onClick={() => setPay(m.id)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all font-bold text-xs"
                  style={pay === m.id
                    ? {background:m.color,borderColor:m.color,color:"white"}
                    : {background:"#f9f9f9",borderColor:"#e5e7eb",color:"#6b7280"}}>
                  {m.icon}{m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Extra fields for cliq/card */}
          {pay === "cliq" && (
            <div className="px-3 pb-2 space-y-1.5">
              <input type="text" value={cliqRef} onChange={e => setCliqRef(e.target.value)} placeholder="رقم مرجع كليك (اختياري)" className="w-full h-9 rounded-xl border border-border bg-background text-xs px-3 focus:outline-none focus:ring-2 focus:ring-ring/25" />
              <input type="text" value={cliqSender} onChange={e => setCliqSender(e.target.value)} placeholder="اسم المُرسِل (اختياري)" className="w-full h-9 rounded-xl border border-border bg-background text-xs px-3 focus:outline-none focus:ring-2 focus:ring-ring/25" />
            </div>
          )}
          {pay === "card" && (
            <div className="px-3 pb-2">
              <input type="text" value={cardRef} onChange={e => setCardRef(e.target.value)} placeholder="رقم مرجع البطاقة (اختياري)" className="w-full h-9 rounded-xl border border-border bg-background text-xs px-3 focus:outline-none focus:ring-2 focus:ring-ring/25" />
            </div>
          )}

          {/* Gift card + Coupon + Loyalty */}
          <div className="px-3 pb-2 space-y-1.5">
            <div className="flex gap-1.5">
              <input type="text" value={giftCode} onChange={e => setGiftCode(e.target.value.toUpperCase())} placeholder="كود بطاقة هدية..." className="flex-1 h-9 rounded-xl border border-border bg-background text-xs px-3 focus:outline-none focus:ring-2 focus:ring-ring/25" />
              <button onClick={checkGiftCard} disabled={!giftCode.trim() || giftChecking}
                className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted/50 transition-all shrink-0 disabled:opacity-40">
                <Gift size={13} className="text-muted-foreground" />
              </button>
            </div>
            {giftCard && (
              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg text-xs" style={{background:"#f0fdf4",border:"1px solid #bbf7d0"}}>
                <span className="font-bold text-emerald-700">{giftCard.code}</span>
                <span className="font-black text-emerald-700">-{giftDiscount.toFixed(3)} JOD</span>
                <button onClick={() => { setGiftCard(null); setGiftCode(""); }} className="text-emerald-500 hover:text-red-500 ml-1"><X size={11} /></button>
              </div>
            )}
            <div className="flex gap-1.5">
              <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="كود كوبون خصم..." className="flex-1 h-9 rounded-xl border border-border bg-background text-xs px-3 focus:outline-none focus:ring-2 focus:ring-ring/25" />
              <button onClick={checkCoupon} disabled={!couponCode.trim() || couponChecking}
                className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted/50 transition-all shrink-0 disabled:opacity-40">
                <Tag size={13} className="text-muted-foreground" />
              </button>
            </div>
            {coupon && (
              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg text-xs" style={{background:"#eff6ff",border:"1px solid #bfdbfe"}}>
                <span className="font-bold text-blue-700">{coupon.code}</span>
                <span className="font-black text-blue-700">-{couponDiscount.toFixed(3)} JOD</span>
                <button onClick={() => { setCoupon(null); setCouponCode(""); }} className="text-blue-400 hover:text-red-500 ml-1"><X size={11} /></button>
              </div>
            )}
            {selectedCustomer && maxRedeemable > 0 && (
              <button onClick={() => setRedeemPoints(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl border-2 transition-all text-xs font-bold"
                style={redeemPoints ? {background:"#FFF8E7",borderColor:"#C8A45C",color:"#92600A"} : {background:"#f9f9f9",borderColor:"#e5e7eb",color:"#6b7280"}}>
                <div className="flex items-center gap-1.5"><Star size={11} style={{color:"#C8A45C"}} />نقاط الولاء</div>
                <span>{maxRedeemable} → {(maxRedeemable*loyaltyPV).toFixed(3)}</span>
              </button>
            )}
          </div>

          {/* Checkout button */}
          <div className="px-3 pb-3">
            <button onClick={() => cart.length > 0 && setShowPay(true)} disabled={cart.length===0}
              className="w-full rounded-xl font-black py-4 flex flex-col items-center gap-0.5 transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{background: cart.length > 0 ? "linear-gradient(135deg,#173A34,#1e4a3f)" : "#e5e7eb", color: cart.length > 0 ? "#F7F5F2" : "#9ca3af"}}>
              <span className="text-lg font-black">{finalTotal > 0 ? `${finalTotal.toFixed(3)} JOD` : "0.000 JOD"}</span>
              <span className="text-xs font-bold opacity-80">اضغط للدفع</span>
            </button>
          </div>

          {/* Quick actions */}
          <div className="px-3 pb-3 border-t border-border/60 pt-3 space-y-1.5">
            <p className="text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-wider">إجراءات سريعة</p>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={hold} disabled={cart.length===0}
                className="flex items-center justify-center gap-1.5 h-10 rounded-xl border border-border text-xs font-bold hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-all disabled:opacity-40">
                <Archive size={13} />تعليق
              </button>
              <button onClick={() => setShowCalc(true)}
                className="flex items-center justify-center gap-1.5 h-10 rounded-xl border border-border text-xs font-bold hover:bg-muted/50 transition-all">
                <Calculator size={13} />حاسبة
              </button>
            </div>
            <button onClick={openDrawer} disabled={drawerOpening}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-border text-xs font-bold hover:bg-muted/50 transition-all disabled:opacity-40">
              <Banknote size={13} className="text-muted-foreground" />{drawerOpening ? "جاري الفتح..." : "فتح الدرج النقدي"}
            </button>
            <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-border/60 bg-muted/30">
              <span className="text-xs text-muted-foreground">فتح الدرج تلقائياً</span>
              <Toggle value={drawerAuto} onChange={setDrawerAuto} />
            </div>
          </div>
        </div>

        {/* Bottom shift controls */}
        <div className="shrink-0 border-t border-border px-3 py-2.5 space-y-1.5">
          <button onClick={() => { refreshShift(); setShowShift(true); }}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-border text-xs font-bold hover:bg-muted/50 transition-all">
            <Activity size={13} className="text-muted-foreground" />تقرير الشفت
          </button>
          <button onClick={() => { setClosingBal(""); setShowCloseSession(true); }}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border-2 text-xs font-bold transition-all hover:opacity-80"
            style={{borderColor:"#173A34",color:"#173A34"}}>
            <Power size={13} />إغلاق الجلسة
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPay && (
        <Modal title="إتمام عملية الدفع" sub={`الإجمالي: ${finalTotal.toFixed(3)} JOD`} onClose={() => setShowPay(false)} size="md">
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-1.5">
              {([
                {id:"cash" as const,  label:"نقدي",  icon:<Banknote size={15}/>},
                {id:"cliq" as const,  label:"كليك",  icon:<Zap size={15}/>},
                {id:"card" as const,  label:"بطاقة", icon:<CreditCard size={15}/>},
                {id:"credit" as const,label:"ذمة",   icon:<FileText size={15}/>},
              ]).map(m => (
                <button key={m.id} onClick={() => setPay(m.id)}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all text-xs font-bold"
                  style={pay === m.id ? {background:"#173A34",borderColor:"#173A34",color:"white"} : {background:"#f9f9f9",borderColor:"#e5e7eb",color:"#6b7280"}}>
                  {m.icon}{m.label}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-border bg-muted/30">
              <span className="text-sm font-bold">دفع مختلط (أكثر من وسيلة)</span>
              <Toggle value={splitMode} onChange={setSplitMode} />
            </div>
            {!splitMode && pay === "cash" && (
              <div className="space-y-3">
                <F label="المبلغ المستلم (JOD)">
                  <TInput value={cash} onChange={setCash} type="number" placeholder="0.000" icon={<Banknote size={13} />} autoFocus />
                </F>
                <div className="grid grid-cols-4 gap-1.5">
                  {[finalTotal, Math.ceil(finalTotal), Math.ceil(finalTotal/5)*5, Math.ceil(finalTotal/10)*10].filter((v,i,a) => a.indexOf(v)===i).map(v => (
                    <button key={v} onClick={() => setCash(v.toFixed(3))}
                      className="h-9 rounded-xl border border-border text-xs font-bold hover:bg-primary hover:text-white hover:border-primary transition-all">
                      {v.toFixed(3)}
                    </button>
                  ))}
                </div>
                {parseFloat(cash||"0") >= finalTotal && finalTotal > 0 && (
                  <div className="p-3 rounded-xl text-center" style={{background:"#f0fdf4",border:"2px solid #86efac"}}>
                    <p className="text-xs text-emerald-600 mb-1">الباقي للعميل</p>
                    <p className="text-2xl font-black text-emerald-700">{(parseFloat(cash)-finalTotal).toFixed(3)} JOD</p>
                  </div>
                )}
              </div>
            )}
            {pay === "cliq" && (
              <div className="space-y-3 p-4 bg-muted/40 border border-border rounded-xl">
                <div className="flex items-center gap-2 mb-1"><CreditCard size={20} className="text-primary" /><p className="font-bold">دفع عبر كليك</p></div>
                <F label="رقم مرجع المعاملة (اختياري)"><TInput value={cliqRef} onChange={setCliqRef} placeholder="مثال: TX-123456" /></F>
                <F label="اسم المُرسِل (اختياري)"><TInput value={cliqSender} onChange={setCliqSender} placeholder="اسم العميل المُرسِل" /></F>
              </div>
            )}
            {pay === "card" && (
              <div className="space-y-3 p-4 bg-muted/40 border border-border rounded-xl">
                <div className="flex items-center gap-2 mb-1"><CreditCard size={20} className="text-primary" /><p className="font-bold">دفع بالبطاقة</p></div>
                <F label="رقم المرجع / التفويض (اختياري)"><TInput value={cardRef} onChange={setCardRef} placeholder="مثال: AUTH-789012" /></F>
                <p className="text-xs text-muted-foreground">أدخل البطاقة في القارئ وانتظر التفويض</p>
              </div>
            )}
            {pay === "credit" && (
              <div className="space-y-2 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                <div className="flex items-center gap-2"><FileText size={20} className="text-amber-600" /><p className="font-bold text-amber-800">بيع على الذمة</p></div>
                {selectedCustomer ? (
                  <p className="text-sm text-amber-700">سيُضاف مبلغ <strong>{total.toFixed(3)} JOD</strong> على ذمة <strong>{selectedCustomer.name}</strong></p>
                ) : (
                  <p className="text-sm text-red-600 font-bold">⚠️ يجب اختيار عميل للبيع على الذمة</p>
                )}
              </div>
            )}
            {splitMode && (
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="px-3 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between">
                  <p className="text-sm font-bold">الدفع المختلط</p>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${splitRemaining <= 0 ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-amber-100 text-amber-700 border border-amber-200"}`}>
                    {splitRemaining <= 0 ? "✓ مغطى" : `متبقي: ${splitRemaining.toFixed(3)} JOD`}
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  {splitRows.map((row, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select value={row.method} onChange={e => setSplitRows(prev => prev.map((r,j) => j===i ? {...r, method: e.target.value as SplitRow["method"]} : r))}
                        className="h-9 rounded-xl border border-border bg-background text-sm px-2 focus:outline-none focus:ring-2 focus:ring-ring/25 shrink-0 w-24">
                        <option value="cash">نقدي</option><option value="cliq">كليك</option><option value="card">بطاقة</option>
                      </select>
                      <input type="number" value={row.amount} onChange={e => setSplitRows(prev => prev.map((r,j) => j===i ? {...r, amount: e.target.value} : r))}
                        placeholder="0.000" className="flex-1 h-9 text-sm rounded-xl border border-border bg-background px-3 focus:outline-none focus:ring-2 focus:ring-ring/25" />
                      {splitRows.length > 2 && <button onClick={() => setSplitRows(prev => prev.filter((_,j)=>j!==i))} className="w-9 h-9 flex items-center justify-center rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 border border-border transition-all">✕</button>}
                    </div>
                  ))}
                  {splitRows.length < 4 && <button onClick={() => setSplitRows(prev => [...prev, {method:"cash",amount:""}])} className="w-full h-8 border border-dashed border-border rounded-xl text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary transition-all">+ إضافة طريقة دفع</button>}
                  {splitRemaining > 0.005 && <button onClick={() => setSplitRows(prev => { const cp = [...prev]; cp[0] = {...cp[0], amount: (parseFloat(cp[0].amount||"0") + splitRemaining).toFixed(3)}; return cp; })} className="w-full h-8 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-all">إضافة المتبقي ({splitRemaining.toFixed(3)} JOD) للأول</button>}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <Btn v="secondary" onClick={() => setShowPay(false)} cls="flex-1">إلغاء</Btn>
              <Btn onClick={() => { doPay(); setShowPay(false); }} cls="flex-1" v="success" icon={<CheckCircle size={15} />}
                disabled={(!splitMode && pay === "cash" && parseFloat(cash || "0") < finalTotal) || (!splitMode && pay === "credit" && !selectedCustomer) || (splitMode && splitRemaining > 0.005)}>
                تأكيد الدفع
              </Btn>
            </div>
          </div>
        </Modal>
      )}
      {ok && (
        <SuccessOverlay invNo={invNo} total={total} pay={pay} change={change}
          drawerAuto={drawerAuto} setDrawerAuto={setDrawerAuto}
          onPrint={doPrint} onDrawer={openDrawer} drawerOpening={drawerOpening} onClose={handleClose} />
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
                    className={`h-12 rounded-xl font-bold text-lg transition-all active:scale-90 ${k === "=" ? "bg-primary text-white" : k === "C" ? "bg-red-100 text-red-600" : ["+","-","×","÷"].includes(k) ? "bg-primary/10 text-primary" : "bg-muted hover:bg-muted/80"}`}>
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
        type ShiftSaleRow = { id:string; total:number; payMethod:string; createdAt:string; invoiceNo:string; customerName?:string; items?:{ nameAr?:string; qty:number; unitPrice?:number; total?:number }[] };
        const shiftSalesList = normList<ShiftSaleRow>(shiftSales).filter(s => sessionStart ? new Date(s.createdAt) >= sessionStart : true);
        const shiftTotals = {
          count: shiftSalesList.length,
          gross: shiftSalesList.reduce((a,s) => a + s.total, 0),
          cash: shiftSalesList.filter(s => s.payMethod === "cash").reduce((a,s) => a + s.total, 0),
          cliq: shiftSalesList.filter(s => s.payMethod === "cliq").reduce((a,s) => a + s.total, 0),
          card: shiftSalesList.filter(s => s.payMethod === "card").reduce((a,s) => a + s.total, 0),
          credit: shiftSalesList.filter(s => s.payMethod === "credit").reduce((a,s) => a + s.total, 0),
          items: shiftSalesList.reduce((a,s) => a + (s.items||[]).reduce((b,i) => b + i.qty, 0), 0),
        };
        const shiftProdMap: Record<string, {nameAr:string;qty:number;total:number}> = {};
        for (const sale of shiftSalesList) for (const item of sale.items || []) {
          const key = item.nameAr || "منتج";
          if (!shiftProdMap[key]) shiftProdMap[key] = { nameAr: key, qty: 0, total: 0 };
          shiftProdMap[key].qty += item.qty || 0;
          shiftProdMap[key].total += item.total || 0;
        }
        const shiftProducts = Object.values(shiftProdMap).sort((a,b) => b.qty - a.qty);
        return (
          <Modal title="مبيعات الشفت الحالي" sub={session ? `${posUserName ? posUserName + " · " : ""}فُتح: ${new Date(session.openedAt).toLocaleString("ar-JO")}` : ""} onClose={() => setShowShift(false)} size="xl">
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-card border border-border rounded-xl p-3 text-center"><p className="text-xs text-muted-foreground mb-1">فواتير</p><p className="font-black text-xl">{shiftTotals.count}</p></div>
                <div className="bg-card border border-border rounded-xl p-3 text-center" style={{borderRightWidth:3,borderRightColor:"#22C55E"}}><p className="text-xs text-muted-foreground mb-1">إجمالي المبيعات</p><p className="font-black text-xl text-emerald-600">{shiftTotals.gross.toFixed(3)} JOD</p></div>
                <div className="bg-card border border-border rounded-xl p-3 text-center" style={{borderRightWidth:3,borderRightColor:"#4F46E5"}}><p className="text-xs text-muted-foreground mb-1">نقدي</p><p className="font-black text-xl text-primary">{shiftTotals.cash.toFixed(3)} JOD</p></div>
                <div className="bg-card border border-border rounded-xl p-3 text-center" style={{borderRightWidth:3,borderRightColor:"#8B5CF6"}}><p className="text-xs text-muted-foreground mb-1">كليك + بطاقة</p><p className="font-black text-xl" style={{color:"#8B5CF6"}}>{(shiftTotals.cliq + shiftTotals.card).toFixed(3)} JOD</p></div>
                {shiftTotals.credit > 0 && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center"><p className="text-xs text-amber-600 mb-1">ذمم غير محصّلة</p><p className="font-black text-xl text-amber-600">{shiftTotals.credit.toFixed(3)} JOD</p></div>}
              </div>
              {shiftProducts.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1"><Package size={12} /> المنتجات المباعة ({shiftProducts.length} صنف · {shiftTotals.items} قطعة)</p>
                  <div className="border border-border rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 sticky top-0"><tr><th className="px-3 py-2 text-right font-bold text-muted-foreground">المنتج</th><th className="px-3 py-2 text-center font-bold text-muted-foreground">الكمية</th><th className="px-3 py-2 text-left font-bold text-muted-foreground">المبلغ</th></tr></thead>
                      <tbody className="divide-y divide-border/60">
                        {shiftProducts.map(p => (<tr key={p.nameAr} className="hover:bg-muted/20"><td className="px-3 py-2">{p.nameAr}</td><td className="px-3 py-2 text-center font-bold text-emerald-600">{p.qty}</td><td className="px-3 py-2 text-left font-mono">{p.total.toFixed(3)}</td></tr>))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-muted-foreground mb-2">الفواتير</p>
                <div className="border border-border rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {shiftSalesList.length === 0 ? <p className="text-center py-6 text-sm text-muted-foreground">لا توجد مبيعات في هذا الشفت</p> : (
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 sticky top-0"><tr>{["الفاتورة","العميل","المبلغ","الدفع","الوقت"].map(h => <th key={h} className="px-3 py-2 text-right font-bold text-muted-foreground">{h}</th>)}</tr></thead>
                      <tbody className="divide-y divide-border/60">
                        {shiftSalesList.map(s => (
                          <tr key={s.id} className="hover:bg-muted/20">
                            <td className="px-3 py-2 font-mono">{s.invoiceNo}</td>
                            <td className="px-3 py-2">{s.customerName || "نقدي"}</td>
                            <td className="px-3 py-2 font-bold">{s.total.toFixed(3)} JOD</td>
                            <td className="px-3 py-2">{s.payMethod === "cash" ? "نقدي" : s.payMethod === "cliq" ? "كليك" : s.payMethod === "card" ? "بطاقة" : "ذمة"}</td>
                            <td className="px-3 py-2 text-muted-foreground">{new Date(s.createdAt).toLocaleTimeString("ar-JO",{hour:"2-digit",minute:"2-digit"})}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Btn full v="secondary" icon={<Printer size={13} />} onClick={() => printShiftReport(normList<ShiftSale>(shiftSales))}>طباعة التقرير</Btn>
                <Btn full v="secondary" icon={<Power size={13} />} onClick={() => { setShowShift(false); setClosingBal(""); setShowCloseSession(true); }}>إغلاق الشفت</Btn>
              </div>
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
                  const c = norm<POSCust>(created as POSCust & { _id?: string });
                  await refreshCusts();
                  setSelectedCustomer({ id: c.id, name: c.name, phone: c.phone || "", loyaltyPoints: 0 });
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

      {/* ── Manual Product Entry Modal — shown when barcode not in system ── */}
      {manualEntry && (
        <Modal title="منتج غير مُعرَّف في النظام" sub={`باركود: ${manualEntry.barcode} — أدخل التفاصيل للبيع المؤقت`} onClose={() => setManualEntry(null)} size="sm">
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex gap-2">
              <AlertCircle size={13} className="shrink-0 mt-0.5"/>
              <span>الباركود غير مسجل. أدخل الاسم والسعر، ثم اختر الإضافة المؤقتة أو الحفظ الدائم.</span>
            </div>
            <F label="اسم المنتج" req><TInput value={manualForm.nameAr} onChange={v => setManualForm(f => ({...f, nameAr: v}))} placeholder="اسم المنتج..." autoFocus /></F>
            <F label="سعر البيع (JOD)" req><TInput value={manualForm.sellPrice} onChange={v => setManualForm(f => ({...f, sellPrice: v}))} type="number" placeholder="0.000" /></F>
            <F label="الكمية في الفاتورة"><TInput value={manualForm.qty} onChange={v => setManualForm(f => ({...f, qty: v}))} type="number" placeholder="1" /></F>
            <div className="flex flex-col gap-2">
              <Btn disabled={!manualForm.nameAr.trim() || !manualForm.sellPrice || !(parseFloat(manualForm.sellPrice) >= 0) || !(parseInt(manualForm.qty) > 0)}
                onClick={() => {
                  const qty = Math.max(1, parseInt(manualForm.qty) || 1);
                  const tempProduct: Product = {
                    id: `manual_${Date.now()}`,
                    nameAr: manualForm.nameAr.trim(), nameEn: manualForm.nameAr.trim(),
                    barcode: manualEntry.barcode, barcodes: [],
                    sku: "", category: "يدوي", costPrice: 0,
                    sellPrice: parseFloat(manualForm.sellPrice) || 0,
                    stock: 999999, minStock: 0, image: "", unit: "قطعة",
                    taxRate: 0, taxable: false,
                  };
                  setCart(prev => {
                    const ex = prev.find(i => i.product.id === tempProduct.id);
                    if (ex) return prev.map(i => i.product.id === tempProduct.id ? {...i, qty: i.qty + qty} : i);
                    return [...prev, { product: tempProduct, qty, discount: 0 }];
                  });
                  setManualEntry(null);
                  showToast(`تمت إضافة "${tempProduct.nameAr}" للفاتورة مؤقتاً دون حفظه`, "success");
                }}
                icon={<Plus size={13}/>}>إضافة مؤقتة للفاتورة فقط</Btn>
              <Btn disabled={!manualForm.nameAr.trim() || !manualForm.sellPrice || !(parseFloat(manualForm.sellPrice) >= 0) || !(parseInt(manualForm.qty) > 0)}
                onClick={async () => {
                  const qty = Math.max(1, parseInt(manualForm.qty) || 1);
                  const price = parseFloat(manualForm.sellPrice);
                  const payload = {
                    nameAr: manualForm.nameAr.trim(), nameEn: manualForm.nameAr.trim(),
                    barcode: manualEntry.barcode, barcodes: [],
                    sku: "", category: "يدوي", costPrice: 0,
                    sellPrice: price, stock: qty, minStock: 0,
                    image: "", unit: "قطعة", taxRate: 0, taxable: false,
                  };
                  try {
                    const createdRaw = await storeApi.post("/products", payload);
                    const created = norm<Product>(createdRaw);
                    if (!created?.id) throw new Error("تعذر قراءة المنتج المحفوظ");
                    setAllProds(prev => [created, ...prev.filter(p => p.id !== created.id)]);
                    invalidateCache("/products");
                    await refreshPosProds();
                    setCart(prev => {
                      const ex = prev.find(i => i.product.id === created.id);
                      if (ex) return prev.map(i => i.product.id === created.id ? {...i, qty: i.qty + qty} : i);
                      return [...prev, { product: created, qty, discount: 0 }];
                    });
                    setManualEntry(null);
                    showToast(`تم حفظ "${created.nameAr}" في قاعدة البيانات وإضافته للفاتورة`, "success");
                  } catch (err) {
                    showToast((err as {message?:string})?.message || "تعذر حفظ المنتج. تحقق من الصلاحيات والاتصال.", "error");
                  }
                }}
                icon={<Check size={13}/>}>حفظ دائم وإضافة للفاتورة</Btn>
              <div className="flex justify-end pt-1"><Btn v="secondary" onClick={() => setManualEntry(null)}>إلغاء</Btn></div>
            </div>
          </div>
        </Modal>
      )}
    </main>
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
