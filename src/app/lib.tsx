import React, { useState, useCallback, useRef, useEffect, createContext, useContext } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// API SERVICE
// ─────────────────────────────────────────────────────────────────────────────
const API = (import.meta as Record<string,Record<string,string>>).env?.VITE_API_URL || "https://sowwanjo-pos-api.onrender.com/api";

export async function apiFetch(path: string, opts: RequestInit = {}, token?: string): Promise<unknown> {
  const headers: Record<string,string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { ...opts, headers: { ...headers, ...(opts.headers as Record<string,string> || {}) } });
  } catch {
    throw { error: `تعذّر الاتصال بالخادم — تحقق من الاتصال` };
  }
  let data: unknown = {};
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) throw data || { error: `خطأ ${res.status}` };
  return data;
}

export const getToken  = (): string  => { try { return localStorage.getItem("sowwanjo_jwt") || ""; } catch { return ""; } };
export const setToken  = (t: string) => { try { localStorage.setItem("sowwanjo_jwt", t); } catch {} };
export const clearToken = ()         => { try { localStorage.removeItem("sowwanjo_jwt"); } catch {} };

// ── Authenticated store API helper ───────────────────────────────────────────
export const storeApi = {
  get:    (path: string)                 => apiFetch(path, { method: "GET" }, getToken()),
  post:   (path: string, body: object)   => apiFetch(path, { method: "POST",   body: JSON.stringify(body) }, getToken()),
  put:    (path: string, body: object)   => apiFetch(path, { method: "PUT",    body: JSON.stringify(body) }, getToken()),
  patch:  (path: string, body: object)   => apiFetch(path, { method: "PATCH",  body: JSON.stringify(body) }, getToken()),
  delete: (path: string)                 => apiFetch(path, { method: "DELETE" }, getToken()),
};

// ── SA API helpers ───────────────────────────────────────────────────────────
export const apiLoginStore  = (email: string, password: string) => apiFetch("/auth/login", { method:"POST", body: JSON.stringify({ email, password }) });
export const apiLoginAdmin  = (username: string, password: string) => apiFetch("/auth/admin", { method:"POST", body: JSON.stringify({ username, password }) });
export const apiCreateStore = (data: object) => apiFetch("/stores", { method:"POST", body: JSON.stringify(data) }, getToken());
export const apiGetStores   = () => apiFetch("/stores", {}, getToken());
export const apiUpdateStore = (id: string, data: object) => apiFetch(`/stores/${id}`, { method:"PUT", body: JSON.stringify(data) }, getToken());
export const apiDeleteStore = (id: string) => apiFetch(`/stores/${id}`, { method:"DELETE" }, getToken());
export const apiResetPass   = (id: string, password: string) => apiFetch(`/stores/${id}/reset-password`, { method:"POST", body: JSON.stringify({ password }) }, getToken());
export const apiResetEmployeePass = (storeId: string, userId: string, password: string) => apiFetch(`/stores/${storeId}/users/${userId}/reset-password`, { method:"POST", body: JSON.stringify({ password }) }, getToken());

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────────────────

// Simple cache for useApiCached
const _cache: Record<string, { data: unknown; ts: number }> = {};
export function getCacheAge(path: string): number { const c = _cache[path]; return c ? Date.now() - c.ts : Infinity; }
export function invalidateCache(path: string) { delete _cache[path]; }

export function useApi<T>(path: string, initial: T): { data: T; loading: boolean; error: string; refresh: () => void } {
  const [data, setData]       = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const pathRef = useRef(path);
  pathRef.current = path;

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await apiFetch(path, {}, getToken());
      setData(res as T);
    } catch (e) {
      setError((e as {error?:string}).error || "خطأ في الاتصال");
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, refresh: load };
}

export function useApiCached<T>(path: string, initial: T, ttlMs = 60_000): { data: T; loading: boolean; error: string; refresh: () => void } {
  const [data, setData]       = useState<T>(() => (_cache[path]?.data as T) ?? initial);
  const [loading, setLoading] = useState(!_cache[path]);
  const [error, setError]     = useState("");

  const load = useCallback(async (force = false) => {
    const cached = _cache[path];
    if (!force && cached && Date.now() - cached.ts < ttlMs) { setData(cached.data as T); setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const res = await apiFetch(path, {}, getToken());
      _cache[path] = { data: res, ts: Date.now() };
      setData(res as T);
    } catch (e) {
      setError((e as {error?:string}).error || "خطأ في الاتصال");
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ttlMs]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, refresh: () => load(true) };
}

export function useLS<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => {
    try { const s = localStorage.getItem(key); return s !== null ? JSON.parse(s) : initial; }
    catch { return initial; }
  });
  const set = useCallback((v: T | ((prev: T) => T)) => {
    setVal(prev => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);
  return [val, set];
}

export function sk(storeId: string, key: string): string { return `sowwanjo_${storeId}_${key}`; }

// ── Store ID context ─────────────────────────────────────────────────────────
export const StoreCtx = createContext<string>("");
export function useStoreId(): string { return useContext(StoreCtx); }

export function useOffline(): { isOnline: boolean; queueOffline: (path: string, payload: object) => void } {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  const queueOffline = useCallback((path: string, payload: object) => {
    try {
      const q = JSON.parse(localStorage.getItem("sowwanjo_offline_queue") || "[]") as object[];
      q.push({ path, payload, ts: Date.now() });
      localStorage.setItem("sowwanjo_offline_queue", JSON.stringify(q));
    } catch {}
  }, []);
  return { isOnline, queueOffline };
}

const StoreModulesCtx = createContext<Record<string, boolean>>({});
export function useStoreModules(): Record<string, boolean> {
  return useContext(StoreModulesCtx);
}
export function StoreModulesProvider({ children, storeId }: { children: React.ReactNode; storeId: string }) {
  const [modules, setModules] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`sowwanjo_sa_modules`);
      const all: { id: string; enabled: boolean }[] = raw ? JSON.parse(raw) : [];
      const map: Record<string, boolean> = {};
      all.forEach(m => { map[m.id] = m.enabled; });
      setModules(map);
    } catch {}
    void storeId;
  }, [storeId]);
  return React.createElement(StoreModulesCtx.Provider, { value: modules }, children);
}

export function useDarkMode(): [boolean, () => void] {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("sowwanjo_dark") === "1" || document.documentElement.classList.contains("dark"); }
    catch { return false; }
  });
  const toggle = useCallback(() => {
    setDark(d => {
      const next = !d;
      try { localStorage.setItem("sowwanjo_dark", next ? "1" : "0"); }
      catch {}
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }, []);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  return [dark, toggle];
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────
export type View = "login" | "superadmin" | "store";
export type StoreCategory = "supermarket" | "clothing" | "cafe" | "electronics" | "barber" | "flowershop" | "printshop" | "restaurant" | "salon" | "pharmacy";

export interface SidebarFeatures {
  pos?: boolean; products?: boolean; inventory?: boolean; customers?: boolean;
  suppliers?: boolean; purchases?: boolean; expenses?: boolean; returns?: boolean;
  purchaseorders?: boolean; promotions?: boolean; sales?: boolean;
  reports?: boolean; employees?: boolean; branches?: boolean; loyalty?: boolean;
  debt?: boolean; giftcards?: boolean; print?: boolean; settings?: boolean;
  syncCenter?: boolean;
}

export interface StoreData {
  id: string; nameAr: string; nameEn: string; category: string;
  phone: string; email: string; plan: string; status: string;
  expiresAt: string; users: number; products: number;
  sidebarFeatures?: SidebarFeatures;
  primaryColor?: string; appName?: string; logoUrl?: string;
  address?: string; taxRate?: number; paperSize?: string;
}

export interface Product {
  id: string; nameAr: string; nameEn?: string; barcode?: string; sku?: string;
  category: string; sellPrice: number; buyPrice?: number;
  stock: number; minStock?: number; unit?: string; taxRate?: number;
  image?: string; description?: string; active?: boolean;
  branchId?: string;
}

export interface CartItem { product: Product; qty: number; discount: number; }

export interface Plan {
  id: string; nameAr: string; price: number; yearlyPrice: number;
  maxBranches: number; maxUsers: number; maxProducts: number;
  maxInvoices: number; maxTerminals: number; storage: string;
  apiAccess: boolean; features: string[]; color: string; badge?: string;
}

export interface ReceiptData {
  storeName: string; storePhone?: string; storeAddress?: string;
  invNo: string; date: string; time: string;
  items: { nameAr?: string; name?: string; qty: number; price: number; discount: number; total?: number }[];
  // Support both naming conventions
  sub?: number; subtotal?: number;
  discount?: number; discountAmt?: number;
  tax?: number; taxAmt?: number; taxRate?: number;
  total: number;
  pay?: string; payMethod?: string;
  cash?: number; cashIn?: number; change?: number;
  customerName?: string; customerPoints?: number; pointsEarned?: number;
  note?: string; paperSize?: string;
  branchName?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS / SEED DATA
// ─────────────────────────────────────────────────────────────────────────────
export const PLANS: Plan[] = [
  { id:"starter", nameAr:"مبتدئ", price:15, yearlyPrice:150, maxBranches:1, maxUsers:3, maxProducts:500, maxInvoices:300, maxTerminals:1, storage:"1GB", apiAccess:false, features:["نقطة بيع واحدة","3 مستخدمين","500 منتج","تقارير أساسية"], color:"#64748B", badge:"مجاني" },
  { id:"pro", nameAr:"احترافي", price:35, yearlyPrice:350, maxBranches:3, maxUsers:10, maxProducts:2000, maxInvoices:2000, maxTerminals:3, storage:"5GB", apiAccess:false, features:["3 فروع","10 مستخدمين","2000 منتج","تقارير متقدمة","ولاء العملاء"], color:"#6366F1", badge:"الأكثر طلباً" },
  { id:"enterprise", nameAr:"مؤسسات", price:80, yearlyPrice:800, maxBranches:999, maxUsers:999, maxProducts:999999, maxInvoices:999999, maxTerminals:999, storage:"50GB", apiAccess:true, features:["فروع غير محدودة","مستخدمون غير محدودون","API كامل","دعم مخصص 24/7"], color:"#D97706", badge:"للشركات" },
];

export type StoreStatus = "active" | "trial" | "suspended" | "expired";
export const ST: Record<string, { label: string; dot: string; badge: string }> = {
  active:    { label: "نشط",     dot: "bg-green-500",  badge: "bg-green-100 text-green-700 border border-green-200" },
  trial:     { label: "تجريبي",  dot: "bg-blue-500",   badge: "bg-blue-100 text-blue-700 border border-blue-200" },
  suspended: { label: "موقوف",   dot: "bg-red-500",    badge: "bg-red-100 text-red-700 border border-red-200" },
  expired:   { label: "منتهي",   dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700 border border-orange-200" },
};

export const CAT: Record<string, { label: string; icon: string; features: string[] }> = {
  supermarket: { label: "سوبرماركت",    icon: "🛒", features: ["pos","products","inventory","customers","suppliers","purchases","expenses","returns","purchaseorders","promotions","sales","reports","employees","branches","loyalty","debt","giftcards","settings","syncCenter"] },
  clothing:    { label: "ملابس وأزياء", icon: "👕", features: ["pos","products","inventory","customers","sales","reports","employees","branches","loyalty","promotions","settings","syncCenter"] },
  cafe:        { label: "كافيه",        icon: "☕", features: ["pos","products","sales","customers","reports","employees","branches","loyalty","giftcards","settings","syncCenter"] },
  electronics: { label: "إلكترونيات",  icon: "📱", features: ["pos","products","inventory","customers","suppliers","purchases","sales","reports","employees","branches","settings","syncCenter"] },
  barber:      { label: "حلاقة وتجميل",icon: "✂️", features: ["pos","products","customers","sales","reports","employees","settings","syncCenter"] },
  flowershop:  { label: "محل زهور",    icon: "🌸", features: ["pos","products","inventory","customers","sales","reports","employees","settings","syncCenter"] },
  printshop:   { label: "مطبعة",       icon: "🖨️", features: ["pos","products","customers","sales","reports","employees","settings","syncCenter"] },
  restaurant:  { label: "مطعم",        icon: "🍽️", features: ["pos","products","inventory","customers","sales","reports","employees","branches","loyalty","settings","syncCenter"] },
  salon:       { label: "صالون",       icon: "💇", features: ["pos","products","customers","sales","reports","employees","settings","syncCenter"] },
  pharmacy:    { label: "صيدلية",      icon: "💊", features: ["pos","products","inventory","customers","suppliers","purchases","sales","reports","employees","branches","settings","syncCenter"] },
};

export const DEFAULT_SIDEBAR: SidebarFeatures = {
  pos:true, products:true, inventory:true, customers:true, suppliers:true,
  purchases:true, expenses:true, returns:true, purchaseorders:true, promotions:true,
  sales:true, reports:true, employees:true, branches:true, loyalty:true,
  debt:true, giftcards:true, print:false, settings:true, syncCenter:true,
};

// Seed data for demo / offline fallback
export const STORES: StoreData[] = [];
export const PRODUCTS: Product[] = [];

// Chart seed helpers
export function weekData(base = 200) {
  return ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"].map(d => ({ day: d, sales: Math.round(base * (0.7 + Math.random() * 0.6)) }));
}
export function monthData(base = 1500) {
  return Array.from({length:30},(_,i) => ({ date: `${i+1}`, sales: Math.round(base * (0.6 + Math.random())) }));
}
export function hourData() {
  return Array.from({length:14},(_,i) => ({ hour: `${i+8}:00`, sales: Math.round(200 * Math.random()) }));
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
export function norm<T extends object>(raw: unknown): T {
  if (!raw || typeof raw !== "object") return {} as T;
  const obj = raw as Record<string, unknown>;
  return { ...obj, id: String(obj._id || obj.id || "") } as T;
}

export function normList<T extends object>(raw: unknown): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(item => norm<T>(item));
}

export function jod(n: number | string | undefined): string {
  const v = parseFloat(String(n ?? 0));
  return isNaN(v) ? "0.000 JOD" : `${v.toFixed(3)} JOD`;
}

export function dateAr(iso: string): string {
  try { return new Date(iso).toLocaleDateString("ar-JO", { year:"numeric", month:"short", day:"numeric" }); }
  catch { return iso; }
}
export function timeAr(iso: string): string {
  try { return new Date(iso).toLocaleTimeString("ar-JO", { hour:"2-digit", minute:"2-digit" }); }
  catch { return iso; }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRINT RECEIPT
// ─────────────────────────────────────────────────────────────────────────────
export function printReceipt(d: ReceiptData, paperOverride?: string): void {
  const paper = paperOverride || d.paperSize || "80mm";
  const w = paper === "58mm" ? "58mm" : paper === "a4" ? "210mm" : "80mm";
  // Normalize both naming conventions
  const sub      = d.subtotal     ?? d.sub     ?? 0;
  const discAmt  = d.discountAmt  ?? d.discount ?? 0;
  const taxAmt   = d.taxAmt       ?? d.tax      ?? 0;
  const payLabel = d.payMethod    || d.pay       || "";
  const cashAmt  = d.cashIn       ?? d.cash      ?? 0;
  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;font-size:${paper==="a4"?"12px":"11px"};width:${w};padding:${paper==="a4"?"20px":"4mm"}}
  .c{text-align:center}.r{text-align:right}.b{font-weight:bold}
  .sep{border-top:1px dashed #000;margin:4px 0}
  table{width:100%;border-collapse:collapse}
  td{padding:1px 2px}
  .tot{font-size:14px;font-weight:900}
</style></head><body>
<div class="c b" style="font-size:14px">${d.storeName}</div>
${d.branchName ? `<div class="c" style="font-size:10px">فرع: ${d.branchName}</div>` : ""}
${d.storePhone ? `<div class="c" style="font-size:10px">${d.storePhone}</div>` : ""}
${d.storeAddress ? `<div class="c" style="font-size:10px">${d.storeAddress}</div>` : ""}
<div class="sep"></div>
<div class="c">فاتورة رقم: ${d.invNo}</div>
<div class="c" style="font-size:10px">${d.date} ${d.time}</div>
${d.customerName ? `<div class="c" style="font-size:10px">العميل: ${d.customerName}</div>` : ""}
<div class="sep"></div>
<table>
  <tr><td class="b">الصنف</td><td class="b" style="text-align:center">ك</td><td class="b" style="text-align:left">المبلغ</td></tr>
  ${d.items.map(i => {
    const label = i.nameAr || i.name || "";
    const rowTotal = i.total !== undefined ? i.total : i.price * i.qty * (1 - (i.discount || 0) / 100);
    return `<tr><td>${label}</td><td style="text-align:center">${i.qty}</td><td style="text-align:left">${rowTotal.toFixed(3)}</td></tr>`;
  }).join("")}
</table>
<div class="sep"></div>
<table>
  <tr><td>المجموع الفرعي</td><td style="text-align:left">${sub.toFixed(3)}</td></tr>
  ${discAmt>0?`<tr><td>الخصم</td><td style="text-align:left">${discAmt.toFixed(3)}</td></tr>`:""}
  ${taxAmt>0?`<tr><td>الضريبة</td><td style="text-align:left">${taxAmt.toFixed(3)}</td></tr>`:""}
  <tr class="tot"><td>الإجمالي</td><td style="text-align:left">${d.total.toFixed(3)} JOD</td></tr>
  <tr><td>طريقة الدفع</td><td style="text-align:left">${payLabel}</td></tr>
  ${cashAmt>0?`<tr><td>المبلغ المسلّم</td><td style="text-align:left">${cashAmt.toFixed(3)}</td></tr>`:""}
  ${(d.change||0)>0?`<tr><td>الباقي</td><td style="text-align:left">${(d.change||0).toFixed(3)}</td></tr>`:""}
  ${d.customerPoints!==undefined?`<tr><td>نقاط مكتسبة</td><td style="text-align:left">+${d.pointsEarned||0}</td></tr>`:""}
</table>
<div class="sep"></div>
<div class="c" style="font-size:10px">شكراً لزيارتكم</div>
<div class="c" style="font-size:9px;margin-top:4px">Powered by Sowwanjo POS</div>
</body></html>`;
  const win = window.open("", "_blank", "width=400,height=600");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 400);
}

// ─────────────────────────────────────────────────────────────────────────────
// TOAST SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
type ToastType = "success" | "error" | "info" | "warning";
interface Toast { id: string; msg: string; type: ToastType; }
let _toastSetState: ((fn: (prev: Toast[]) => Toast[]) => void) | null = null;
const _shownMsgs = new Set<string>();

export function showToast(msg: string, type: ToastType = "success"): void {
  const dedupeKey = `${type}:${msg}`;
  if (_shownMsgs.has(dedupeKey)) return;
  _shownMsgs.add(dedupeKey);
  setTimeout(() => _shownMsgs.delete(dedupeKey), 3000);
  if (!_toastSetState) return;
  const id = `${Date.now()}-${Math.random()}`;
  _toastSetState(p => [...p, { id, msg, type }].slice(-5));
  setTimeout(() => _toastSetState?.(p => p.filter(t => t.id !== id)), 4000);
}

export function ToastHost(): React.ReactElement {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => { _toastSetState = setToasts; return () => { _toastSetState = null; }; }, []);
  const colors: Record<ToastType, string> = {
    success: "bg-green-600", error: "bg-red-600", info: "bg-blue-600", warning: "bg-amber-500",
  };
  return React.createElement("div", {
    style: { position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)", zIndex:9999, display:"flex", flexDirection:"column", gap:8, alignItems:"center", pointerEvents:"none" }
  }, toasts.map(t =>
    React.createElement("div", {
      key: t.id,
      className: `${colors[t.type]} text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl`,
      style: { animation:"fadeInUp .25s ease", pointerEvents:"none", maxWidth:340, textAlign:"center" }
    }, t.msg)
  ));
}

// ─────────────────────────────────────────────────────────────────────────────
// WHITE-LABEL BRANDING
// ─────────────────────────────────────────────────────────────────────────────
export function applyBranding(b: { primaryColor?: string; appName?: string; logoUrl?: string }): void {
  if (b.primaryColor) document.documentElement.style.setProperty("--primary", b.primaryColor);
  if (b.appName) document.title = b.appName;
}
export function getCachedBranding(storeId?: string): { primaryColor?: string; appName?: string; logoUrl?: string } | null {
  try {
    // If no storeId, try to find any cached branding
    if (!storeId) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith("sowwanjo_storeinfo_")) {
          const r = localStorage.getItem(k);
          return r ? JSON.parse(r) : null;
        }
      }
      return null;
    }
    const r = localStorage.getItem(`sowwanjo_storeinfo_${storeId}`);
    return r ? JSON.parse(r) : null;
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

export function SBadge({ status }: { status: string }): React.ReactElement {
  const s = ST[status] || { label: status, dot: "bg-gray-400", badge: "bg-gray-100 text-gray-600 border border-gray-200" };
  return React.createElement("span", {
    className: `inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.badge}`
  },
    React.createElement("span", { className: `w-1.5 h-1.5 rounded-full ${s.dot}` }),
    s.label
  );
}

export function KPI({ icon, label, value, color, sub }: {
  icon?: React.ReactNode; label: string; value: string | number; color?: string; sub?: string;
}): React.ReactElement {
  return React.createElement("div", { className: "bg-card border border-border rounded-2xl p-4 flex flex-col gap-1" },
    React.createElement("div", { className: "flex items-center gap-2" },
      icon && React.createElement("span", { style: { color: color || "var(--primary)" } }, icon),
      React.createElement("span", { className: "text-xs font-semibold text-muted-foreground" }, label)
    ),
    React.createElement("p", { className: "text-2xl font-black", style: { color: color || "var(--foreground)" } }, value),
    sub && React.createElement("p", { className: "text-xs text-muted-foreground" }, sub)
  );
}

export function Modal({ title, sub, onClose, children, size = "md" }: {
  title: string; sub?: string; onClose: () => void; children: React.ReactNode; size?: "sm"|"md"|"lg"|"xl"|"full";
}): React.ReactElement {
  const maxW = { sm:"max-w-sm", md:"max-w-md", lg:"max-w-lg", xl:"max-w-2xl", full:"max-w-4xl" }[size] || "max-w-md";
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);
  return React.createElement("div", {
    className: "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4",
    onClick: (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); }
  },
    React.createElement("div", { className: `bg-card border border-border rounded-2xl shadow-2xl w-full ${maxW} max-h-[90vh] flex flex-col overflow-hidden` },
      React.createElement("div", { className: "flex items-start justify-between p-5 border-b border-border flex-shrink-0" },
        React.createElement("div", null,
          React.createElement("h3", { className: "text-base font-bold text-foreground" }, title),
          sub && React.createElement("p", { className: "text-xs text-muted-foreground mt-0.5" }, sub)
        ),
        React.createElement("button", {
          onClick: onClose,
          className: "w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
        }, "×")
      ),
      React.createElement("div", { className: "overflow-y-auto flex-1 p-5 space-y-4" }, children)
    )
  );
}

// ── Form field wrapper — auto-generates htmlFor/id ───────────────────────────
const FORM_FIELD_TYPES = new Set(["input","select","textarea"]);
function isFormField(el: React.ReactElement): boolean {
  const t = el.type;
  if (typeof t === "string") return FORM_FIELD_TYPES.has(t);
  if (typeof t === "function") {
    const n = (t as React.ComponentType).displayName || (t as {name?:string}).name || "";
    return ["TInput","SInput"].includes(n);
  }
  return false;
}

let _fieldSeq = 0;
export function F({ label, req, children, id: forcedId }: {
  label: string; req?: boolean; children: React.ReactNode; id?: string;
}): React.ReactElement {
  const idRef = useRef(forcedId || `f-${++_fieldSeq}`);
  const child = React.Children.only(children) as React.ReactElement;
  const cloned = isFormField(child) ? React.cloneElement(child, { id: idRef.current } as object) : child;
  return React.createElement("div", { className: "space-y-1.5" },
    React.createElement("label", { htmlFor: idRef.current, className: "block text-sm font-semibold text-foreground" },
      label,
      req && React.createElement("span", { className: "text-red-500 ml-0.5" }, " *")
    ),
    cloned
  );
}

export function TInput({ value, onChange, placeholder, type = "text", icon, readOnly, id }: {
  value: string; onChange?: (v: string) => void; placeholder?: string;
  type?: string; icon?: React.ReactNode; readOnly?: boolean; id?: string;
}): React.ReactElement {
  return React.createElement("div", { className: "relative" },
    icon && React.createElement("span", {
      className: "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
    }, icon),
    React.createElement("input", {
      id, type, value, readOnly,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange?.(e.target.value),
      placeholder: placeholder || "",
      className: `w-full rounded-xl border border-border bg-input-background text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring/25 transition ${icon ? "pr-9" : ""} ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`,
    })
  );
}
TInput.displayName = "TInput";

export function SInput({ value, onChange, options, id }: {
  value: string; onChange: (v: string) => void;
  options: (string | { value: string; label: string })[]; id?: string;
}): React.ReactElement {
  return React.createElement("select", {
    id, value,
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value),
    className: "w-full rounded-xl border border-border bg-input-background text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring/25 transition appearance-none",
  },
    options.map(o => {
      const v = typeof o === "string" ? o : o.value;
      const l = typeof o === "string" ? o : o.label;
      return React.createElement("option", { key: v, value: v }, l);
    })
  );
}
SInput.displayName = "SInput";

export function Btn({ children, onClick, v = "primary", s = "md", icon, cls = "", disabled, full }: {
  children?: React.ReactNode; onClick?: () => void;
  v?: "primary"|"secondary"|"ghost"|"danger"|"success"|"warning";
  s?: "xs"|"sm"|"md"|"lg"; icon?: React.ReactNode; cls?: string; disabled?: boolean; full?: boolean;
}): React.ReactElement {
  const vs = {
    primary:   "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
    secondary: "bg-card text-foreground border border-border hover:bg-muted shadow-sm",
    ghost:     "text-foreground hover:bg-muted/70",
    danger:    "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
    success:   "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
    warning:   "bg-amber-500 text-white hover:bg-amber-600 shadow-sm",
  };
  const ss = { xs:"h-7 px-2.5 text-xs gap-1", sm:"h-8 px-3 text-xs gap-1.5", md:"h-10 px-4 text-sm gap-2", lg:"h-12 px-6 text-base gap-2" };
  return React.createElement("button", {
    onClick, disabled,
    className: `inline-flex items-center justify-center font-semibold rounded-xl transition-all ${vs[v]} ${ss[s]} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${full ? "w-full" : ""} ${cls}`,
  }, icon, children);
}

export function Hdr({ title, sub, action }: {
  title: string; sub?: string; action?: React.ReactNode;
}): React.ReactElement {
  return React.createElement("div", { className: "flex items-start justify-between mb-5" },
    React.createElement("div", null,
      React.createElement("h2", { className: "text-xl font-bold text-foreground" }, title),
      sub && React.createElement("p", { className: "text-sm text-muted-foreground mt-0.5" }, sub)
    ),
    action && React.createElement("div", { className: "flex gap-2 items-center flex-wrap" }, action)
  );
}

export function Empty({ icon, title, desc }: {
  icon?: React.ReactNode; title: string; desc?: string;
}): React.ReactElement {
  return React.createElement("div", { className: "flex flex-col items-center justify-center py-16 text-center px-4" },
    icon && React.createElement("div", { className: "text-muted-foreground/40 mb-4" }, icon),
    React.createElement("p", { className: "font-bold text-foreground mb-1" }, title),
    desc && React.createElement("p", { className: "text-sm text-muted-foreground" }, desc)
  );
}

export function Toggle({ on, onChange, label }: {
  on: boolean; onChange: (v: boolean) => void; label?: string;
}): React.ReactElement {
  return React.createElement("label", { className: "flex items-center gap-2 cursor-pointer select-none" },
    React.createElement("div", {
      onClick: () => onChange(!on),
      className: `relative w-10 h-6 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted-foreground/30"}`,
    },
      React.createElement("div", {
        className: `absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5 right-auto left-1" : "left-1"}`,
      })
    ),
    label && React.createElement("span", { className: "text-sm font-medium text-foreground" }, label)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROLE / SCREEN ACCESS
// ─────────────────────────────────────────────────────────────────────────────
export const ROLE_SCREENS: Record<string, string[] | "*"> = {
  owner:     "*",
  manager:   ["dashboard","pos","products","inventory","customers","sales","reports","employees","branches","loyalty","debt","giftcards","print","settings","syncCenter","promotions","expenses","returns","purchaseorders","suppliers","purchases"],
  cashier:   ["pos","products","sales","syncCenter"],
  inventory: ["products","inventory","suppliers","purchases","purchaseorders","syncCenter"],
  accountant:["sales","reports","debt","expenses","syncCenter"],
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const BP = "#2563EB";
const BADGES = ["سحابي 100%","متعدد المتاجر","متعدد الفروع","يعمل أوفلاين","مخزون فوري","تقارير متقدمة","باركود وQR","موبايل وتابلت","منصة آمنة","الأردن أولاً"];
const BIZ_TYPES = ["السوبرماركت","المحلات التجارية","المقاهي","المطاعم","محلات الزهور","مطابع","الإلكترونيات","الأزياء","الصالونات","خدمات الأعمال"];

const LX_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap');
  @keyframes lx-up    { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes lx-spin  { to{transform:rotate(360deg)} }
  @keyframes lx-enter { from{opacity:0} to{opacity:1} }
  @keyframes lx-blob1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-20px) scale(1.05)} 66%{transform:translate(-15px,15px) scale(0.97)} }
  @keyframes lx-blob2 { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(-25px,20px) scale(1.04)} 70%{transform:translate(20px,-15px) scale(0.96)} }
  @keyframes lx-blob3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(15px,-10px)} }
  @keyframes lx-glow-ping { 0%{opacity:.55;transform:scale(1)} 100%{opacity:0;transform:scale(1.35)} }
  @keyframes lx-pulse-dot { 0%,100%{opacity:1} 50%{opacity:.35} }
  @keyframes lx-biz { 0%,10%{opacity:0;transform:translateY(8px)} 20%,80%{opacity:1;transform:translateY(0)} 90%,100%{opacity:0;transform:translateY(-8px)} }
  @keyframes fadeInUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }

  .lx-dev1{animation:lx-blob1 8s ease-in-out infinite}
  .lx-dev2{animation:lx-blob2 9s ease-in-out infinite .5s}
  .lx-dev3{animation:lx-blob3 7s ease-in-out infinite 1s}
  .lx-dev4{animation:lx-blob1 10s ease-in-out infinite .8s}
  .lx-dev5{animation:lx-blob2 8.5s ease-in-out infinite 1.2s}
  .lx-dev6{animation:lx-blob3 9s ease-in-out infinite .3s}
  .lx-dev7{animation:lx-blob1 7.5s ease-in-out infinite 1.5s}

  .lx0{animation:lx-up .45s cubic-bezier(.22,1,.36,1) both}
  .lx1{animation:lx-up .45s cubic-bezier(.22,1,.36,1) both .06s}
  .lx2{animation:lx-up .45s cubic-bezier(.22,1,.36,1) both .12s}
  .lx3{animation:lx-up .45s cubic-bezier(.22,1,.36,1) both .18s}
  .lx4{animation:lx-up .45s cubic-bezier(.22,1,.36,1) both .24s}
  .lx5{animation:lx-up .45s cubic-bezier(.22,1,.36,1) both .30s}
  .lx6{animation:lx-up .45s cubic-bezier(.22,1,.36,1) both .36s}

  .lx-cur{display:inline-block;width:2px;height:.9em;background:${BP};margin-right:2px;vertical-align:text-bottom;animation:lx-pulse-dot 1s ease-in-out infinite}
  .lx-tab{flex:1;padding:7px 10px;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;transition:all .18s;font-family:inherit}

  .lx-field{
    width:100%;border-radius:12px;font-size:13.5px;font-family:inherit;
    padding:12px 14px;outline:none;transition:all .2s;
    border:1.5px solid #E2E8F0;background:#FFFFFF;color:#111827;
    box-shadow:0 1px 3px rgba(15,23,42,.06);
  }
  .lx-field:focus{border-color:${BP};box-shadow:0 0 0 3px ${BP}22;}
  .lx-field.has-err{border-color:#DC2626;box-shadow:0 0 0 3px #DC262622;}
  .lx-field::placeholder{color:#94A3B8;}

  .lx-btn{
    width:100%;height:48px;border-radius:14px;border:none;cursor:pointer;
    display:flex;align-items:center;justify-content:center;gap:8px;
    font-size:14px;font-weight:800;font-family:inherit;
    background:${BP};color:#fff;
    box-shadow:0 4px 14px ${BP}40;
    transition:all .2s;
  }
  .lx-btn:hover:not(:disabled){background:#1d4ed8;transform:translateY(-1px);box-shadow:0 6px 20px ${BP}55;}
  .lx-btn:active:not(:disabled){transform:translateY(0);}
  .lx-btn:disabled{opacity:.55;cursor:not-allowed;transform:none;}
`;

export function LoginScreen({ onLogin }: { onLogin: (type: "superadmin" | "store", id?: string) => void }): React.ReactElement {
  const [mode,        setMode]        = useState<"store"|"admin">("store");
  const [email,       setEmail]       = useState(() => { try { return localStorage.getItem("sowwanjo_remember_email") || ""; } catch { return ""; } });
  const [pass,        setPass]        = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [rememberMe,  setRememberMe]  = useState(() => { try { return !!localStorage.getItem("sowwanjo_remember_email"); } catch { return false; } });
  const [err,         setErr]         = useState("");
  const [loading,     setLoading]     = useState(false);
  const [online,      setOnline]      = useState(navigator.onLine);
  const [entering,    setEntering]    = useState(false);
  const [capsLock,    setCapsLock]    = useState(false);
  const [isDesktop,   setIsDesktop]   = useState(() => window.innerWidth >= 768);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [logoClicks,    setLogoClicks]    = useState(0);
  const [twText,        setTwText]        = useState("");
  const [bizIdx,        setBizIdx]        = useState(0);

  const TW_WORDS = ["السوبرماركت","المحلات التجارية","المقاهي","المطاعم","الصيدليات","الإلكترونيات","الأزياء","الصالونات","المطابع","خدمات الأعمال"];

  // Typewriter
  useEffect(() => {
    let wi = 0; let ci = 0; let deleting = false; let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const word = TW_WORDS[wi % TW_WORDS.length];
      if (!deleting) {
        ci++;
        setTwText(word.slice(0, ci));
        if (ci >= word.length) { t = setTimeout(() => { deleting = true; tick(); }, 1800); return; }
      } else {
        ci--;
        setTwText(word.slice(0, ci));
        if (ci === 0) { deleting = false; wi++; }
      }
      t = setTimeout(tick, deleting ? 45 : 90);
    };
    t = setTimeout(tick, 400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Business type cycling
  useEffect(() => {
    const t = setInterval(() => setBizIdx(i => (i + 1) % BIZ_TYPES.length), 2800);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    const sz  = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    window.addEventListener("resize",  sz);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); window.removeEventListener("resize", sz); };
  }, []);

  const handleLogoClick = () => {
    setLogoClicks(c => { const n = c + 1; if (n >= 5) { setAdminUnlocked(true); } return n; });
  };

  const doLogin = async () => {
    if (!email.trim() || !pass.trim()) { setErr("يرجى إدخال بيانات تسجيل الدخول"); return; }
    setLoading(true); setErr("");
    try {
      if (mode === "admin") {
        const res = await apiLoginAdmin(email.trim(), pass) as { token: string };
        setToken(res.token);
        if (rememberMe) { try { localStorage.setItem("sowwanjo_remember_email", email.trim()); } catch {} }
        else { try { localStorage.removeItem("sowwanjo_remember_email"); } catch {} }
        setEntering(true);
        setTimeout(() => onLogin("superadmin"), 600);
      } else {
        const res = await apiLoginStore(email.trim(), pass) as { token: string; storeId: string; store?: StoreData; branding?: object };
        setToken(res.token);
        if (rememberMe) { try { localStorage.setItem("sowwanjo_remember_email", email.trim()); } catch {} }
        else { try { localStorage.removeItem("sowwanjo_remember_email"); } catch {} }
        if (res.store) {
          try { localStorage.setItem(`sowwanjo_storeinfo_${res.storeId}`, JSON.stringify(res.store)); } catch {}
        }
        if (res.branding) applyBranding(res.branding as { primaryColor?: string; appName?: string; logoUrl?: string });
        setEntering(true);
        setTimeout(() => onLogin("store", res.storeId), 600);
      }
    } catch (e) {
      const msg = (e as {error?:string}).error || "بيانات غير صحيحة";
      setErr(msg);
      setLoading(false);
    }
  };

  // Shared device card style
  const dc = (extra?: React.CSSProperties): React.CSSProperties => ({
    background:"rgba(15,23,42,0.84)", backdropFilter:"blur(18px) saturate(130%)",
    border:"1px solid rgba(255,255,255,0.10)", borderRadius:16,
    padding:"12px 14px", boxShadow:"0 16px 40px rgba(0,0,0,0.45)",
    ...extra,
  });

  return (
    <div dir="rtl" style={{ fontFamily:"'Cairo','Inter',sans-serif", minHeight:"100dvh", background:"#F8FAFC", position:"relative", overflow:"hidden" }}>
      <style>{LX_CSS}</style>

      {entering && (
        <div style={{ position:"fixed", inset:0, zIndex:1000, background:"#0F172A", display:"flex", alignItems:"center", justifyContent:"center", animation:"lx-enter .4s ease both" }}>
          <div style={{ position:"relative", width:48, height:48 }}>
            <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:`2.5px solid ${BP}30`, borderTopColor:BP, animation:"lx-spin .7s linear infinite" }}/>
            <div style={{ position:"absolute", inset:7, borderRadius:"50%", border:`2px solid #10B98122`, borderRightColor:"#10B981", animation:"lx-spin 1.2s linear infinite reverse" }}/>
          </div>
        </div>
      )}

      {!online && (
        <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 16px", fontSize:12, fontWeight:700, color:"#fff", background:"#DC2626" }}>
          ⚠ لا يوجد اتصال بالإنترنت
        </div>
      )}

      {/* DESKTOP */}
      {isDesktop && (
        <div style={{ height:"100dvh", display:"flex" }}>
          {/* HERO 65% */}
          <div style={{ width:"65%", flexShrink:0, position:"relative", overflow:"hidden", background:"#0F172A", display:"flex", flexDirection:"column", transition:"transform .6s cubic-bezier(.4,0,.2,1)", transform: entering ? "scale(1.05)" : "scale(1)" }}>
            <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(rgba(255,255,255,0.022) 1px,transparent 1px)", backgroundSize:"26px 26px", pointerEvents:"none" }}/>
            <div style={{ position:"absolute", top:"-8%", right:"15%", width:520, height:520, borderRadius:"50%", background:`${BP}18`, filter:"blur(110px)", animation:"lx-blob1 14s ease-in-out infinite", pointerEvents:"none" }}/>
            <div style={{ position:"absolute", bottom:"-12%", left:"5%", width:460, height:460, borderRadius:"50%", background:"#10B98115", filter:"blur(100px)", animation:"lx-blob2 16s ease-in-out infinite", pointerEvents:"none" }}/>

            {/* SVG connection lines */}
            <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }} viewBox="0 0 780 880" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient id="lxc1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={BP} stopOpacity="0.65"/><stop offset="100%" stopColor="#10B981" stopOpacity="0.12"/></linearGradient>
                <linearGradient id="lxc2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#10B981" stopOpacity="0.5"/><stop offset="100%" stopColor={BP} stopOpacity="0.1"/></linearGradient>
              </defs>
              {(["M390,110 C 320,172 248,210 168,255","M390,110 C 462,172 534,210 614,252","M390,110 C 355,260 290,340 210,425","M390,110 C 425,260 490,340 570,422","M210,425 C 282,484 350,498 390,500","M570,422 C 498,484 430,498 390,500"] as string[]).map((d,i) => (
                <g key={i}>
                  <path d={d} stroke={`url(#${i%2===0?"lxc1":"lxc2"})`} strokeWidth="1.1" fill="none" strokeOpacity="0.38" strokeDasharray="4 10"/>
                  <circle r="2.5" fill={i%2===0?BP:"#10B981"} opacity="0.9"><animateMotion dur={`${3.2+i*0.48}s`} repeatCount="indefinite" begin={`${i*0.65}s`} path={d}/></circle>
                </g>
              ))}
            </svg>

            {/* Logo */}
            <div style={{ position:"relative", zIndex:3, padding:"32px 48px 0", flexShrink:0 }}>
              <button onClick={handleLogoClick} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:10, padding:0 }}>
                <div style={{ width:40, height:40, borderRadius:11, background:`${BP}22`, border:`1.5px solid ${BP}45`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ color:BP, fontSize:18 }}>🏪</span>
                </div>
                <div style={{ textAlign:"right" }}>
                  <p style={{ color:"#F1F5F9", fontWeight:800, fontSize:15, letterSpacing:"-0.025em", lineHeight:1.2 }}>Sowwanjo POS</p>
                  <p style={{ color:"rgba(255,255,255,0.28)", fontSize:10, marginTop:1 }}>منصة الأعمال السحابية</p>
                </div>
              </button>
            </div>

            {/* Device cards */}
            <div style={{ position:"absolute", inset:0, zIndex:2, pointerEvents:"none" }}>
              {/* Cloud hub */}
              <div className="lx-dev1" style={{ ...dc({ position:"absolute", top:"8%", left:"50%", transform:"translateX(-50%)", display:"flex", alignItems:"center", gap:10, padding:"10px 16px", borderRadius:18, border:`1.5px solid ${BP}40`, whiteSpace:"nowrap" }) }}>
                <div style={{ width:28, height:28, borderRadius:8, background:`${BP}22`, border:`1px solid ${BP}45`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>🌐</div>
                <div>
                  <p style={{ color:"#F1F5F9", fontWeight:700, fontSize:11.5 }}>مزامنة سحابية فورية</p>
                  <p style={{ color:`${BP}CC`, fontSize:9.5 }}>آمن · موثوق · محمي</p>
                </div>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"#10B981", animation:"lx-pulse-dot 1.8s ease-in-out infinite" }}/>
              </div>
              {/* Dashboard */}
              <div className="lx-dev2" style={{ ...dc({ position:"absolute", top:"19%", left:"4%", minWidth:150 }) }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:9 }}>
                  <span style={{ fontSize:14 }}>📊</span>
                  <span style={{ color:"rgba(255,255,255,0.48)", fontSize:10.5, fontWeight:700 }}>لوحة التحكم</span>
                </div>
                <div style={{ display:"flex", gap:3.5, alignItems:"flex-end", height:32 }}>
                  {[48,74,40,90,60,70,85].map((h,i) => (
                    <div key={i} style={{ flex:1, height:`${h}%`, borderRadius:3, background:i===3?BP:`${BP}48`, opacity:i===3?1:0.6 }}/>
                  ))}
                </div>
                <div style={{ marginTop:5, display:"flex", justifyContent:"space-between" }}>
                  <span style={{ color:`${BP}CC`, fontSize:9.5, fontWeight:700 }}>↑ 23.4%</span>
                  <span style={{ color:"rgba(255,255,255,0.24)", fontSize:9.5 }}>هذا الأسبوع</span>
                </div>
              </div>
              {/* POS Terminal */}
              <div className="lx-dev4" style={{ ...dc({ position:"absolute", top:"47%", left:"4%", minWidth:150 }) }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:14 }}>🛒</span>
                  <span style={{ color:"rgba(255,255,255,0.48)", fontSize:10.5, fontWeight:700 }}>نقطة البيع</span>
                </div>
                <div style={{ padding:"6px 9px", borderRadius:9, background:`${BP}09`, border:`1px solid ${BP}20` }}>
                  <p style={{ color:"rgba(255,255,255,0.35)", fontSize:8.5, fontWeight:600, marginBottom:1 }}>الإجمالي</p>
                  <p style={{ color:BP, fontWeight:900, fontSize:18, letterSpacing:"-0.04em", lineHeight:1 }}>12.750 JOD</p>
                </div>
              </div>
              {/* Inventory */}
              <div className="lx-dev5" style={{ ...dc({ position:"absolute", top:"45%", right:"3%", minWidth:146 }) }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:14 }}>📦</span>
                  <span style={{ color:"rgba(255,255,255,0.48)", fontSize:10.5, fontWeight:700 }}>المخزون</span>
                </div>
                {[["منتجات","3,724","#A855F7"],["تنبيهات","12","#F59E0B"]].map(([l,v,c]) => (
                  <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontSize:9.5, color:"rgba(255,255,255,0.32)" }}>{l}</span>
                    <span style={{ fontSize:11, fontWeight:800, color:c }}>{v}</span>
                  </div>
                ))}
              </div>
              {/* Scanner */}
              <div className="lx-dev6" style={{ ...dc({ position:"absolute", top:"71%", left:"50%", transform:"translateX(-50%)", display:"flex", alignItems:"center", gap:9, padding:"9px 14px", border:`1px solid ${BP}28`, whiteSpace:"nowrap" }) }}>
                <span style={{ fontSize:16 }}>📷</span>
                <div>
                  <p style={{ color:"#F1F5F9", fontWeight:700, fontSize:10.5 }}>باركود · QR · سكانر</p>
                  <p style={{ color:"rgba(255,255,255,0.30)", fontSize:9 }}>دعم احترافي كامل</p>
                </div>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"#10B981", flexShrink:0, animation:"lx-pulse-dot 1.5s ease-in-out infinite" }}/>
              </div>
            </div>

            {/* Hero text */}
            <div style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:3, padding:"80px 48px 36px", background:"linear-gradient(to top,rgba(15,23,42,.97) 0%,rgba(15,23,42,.55) 55%,transparent 100%)" }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 11px", borderRadius:100, background:`${BP}18`, border:`1px solid ${BP}32`, marginBottom:12, animation:"lx-up .5s cubic-bezier(.22,1,.36,1) both .08s" }}>
                <span style={{ width:5, height:5, borderRadius:"50%", background:"#10B981", display:"block", boxShadow:"0 0 5px #10B981" }}/>
                <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.52)", letterSpacing:"0.07em" }}>LIVE · منصة الأعمال السحابية · الأردن</span>
              </div>
              <h1 style={{ color:"#F8FAFC", fontWeight:900, fontSize:"clamp(24px,2.6vw,40px)", lineHeight:1.18, letterSpacing:"-0.04em", marginBottom:10, animation:"lx-up .5s cubic-bezier(.22,1,.36,1) both .15s" }}>
                أدِر أعمالك بذكاء<br/>
                <span style={{ color:BP }}>{twText}</span><span className="lx-cur"/>
              </h1>
              <p style={{ fontSize:12.5, color:"rgba(255,255,255,0.38)", marginBottom:18, animation:"lx-up .5s cubic-bezier(.22,1,.36,1) both .22s" }}>
                منصة واحدة لـ{" "}
                <span key={bizIdx} style={{ color:`${BP}DD`, fontWeight:700, display:"inline-block", animation:"lx-biz 2.8s ease both" }}>{BIZ_TYPES[bizIdx]}</span>
              </p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:22, animation:"lx-up .5s cubic-bezier(.22,1,.36,1) both .30s" }}>
                {BADGES.map((b,i) => (
                  <div key={b} style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:100, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
                    <span style={{ width:3.5, height:3.5, borderRadius:"50%", background:i%3===0?BP:i%3===1?"#10B981":"#F59E0B", display:"block" }}/>
                    <span style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,0.44)" }}>{b}</span>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", paddingTop:16, borderTop:"1px solid rgba(255,255,255,0.07)", animation:"lx-up .5s cubic-bezier(.22,1,.36,1) both .42s" }}>
                {([["١٢٠+","متجر نشط"],["٩٩.٩٪","وقت التشغيل"],["٥٠٠+","فاتورة/يوم"]] as [string,string][]).map(([n,l],i) => (
                  <div key={l} style={{ flex:1, paddingRight:i<2?18:0, borderRight:i<2?"1px solid rgba(255,255,255,0.07)":"none", marginRight:i<2?18:0 }}>
                    <p style={{ color:BP, fontWeight:900, fontSize:20, letterSpacing:"-0.04em", lineHeight:1 }}>{n}</p>
                    <p style={{ color:"rgba(255,255,255,0.26)", fontSize:10, marginTop:2 }}>{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* LOGIN CARD 35% */}
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 28px", position:"relative", zIndex:10, background:"#F8FAFC", transition:"opacity .38s ease", opacity: entering ? 0 : 1 }}>
            <div style={{ position:"absolute", top:"-6%", left:"-8%", width:280, height:280, borderRadius:"50%", background:`${BP}08`, filter:"blur(60px)", pointerEvents:"none" }}/>
            <div style={{ width:"100%", maxWidth:400, background:"#FFFFFF", border:"1px solid #E2E8F0", borderRadius:20, padding:"36px 32px 28px", boxShadow:"0 20px 60px rgba(15,23,42,.10),0 4px 16px rgba(15,23,42,.05)", position:"relative" }}>
              <div style={{ position:"absolute", top:0, left:"20%", right:"20%", height:"2px", background:`linear-gradient(90deg,transparent,${BP},transparent)`, borderRadius:2 }}/>

              {/* Logo */}
              <div className="lx0" style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
                <button onClick={handleLogoClick} style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", flexShrink:0 }}>
                  <div style={{ width:46, height:46, borderRadius:13, background:`${BP}12`, border:`2px solid ${BP}28`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 4px 16px ${BP}20` }}>
                    <span style={{ fontSize:22 }}>🏪</span>
                  </div>
                </button>
                <div>
                  <p style={{ color:"#0F172A", fontWeight:800, fontSize:16, letterSpacing:"-0.025em", lineHeight:1.2 }}>Sowwanjo POS</p>
                  <p style={{ color:"#64748B", fontSize:10.5 }}>الإصدار 1.0 · نقاط البيع السحابي</p>
                </div>
              </div>

              <div className="lx1" style={{ marginBottom:22 }}>
                <h2 style={{ color:"#0F172A", fontWeight:900, fontSize:21, letterSpacing:"-0.035em", marginBottom:4 }}>
                  {mode==="admin"&&adminUnlocked ? "بوابة الإدارة العليا" : "مرحباً بعودتك"}
                </h2>
                <p style={{ color:"#64748B", fontSize:13 }}>أدخل بياناتك للدخول إلى منصتك</p>
              </div>

              {adminUnlocked && (
                <div className="lx1" style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", borderRadius:12, marginBottom:14, background:"#FEF3C7", border:"1px solid #FDE68A" }}>
                  <span>🛡️</span>
                  <p style={{ fontSize:12, fontWeight:700, color:"#92400E" }}>تم تفعيل وضع الإدارة العليا</p>
                </div>
              )}

              {adminUnlocked && (
                <div className="lx2" style={{ display:"flex", padding:3, borderRadius:12, marginBottom:16, background:"#F1F5F9", gap:3, border:"1px solid #E2E8F0" }}>
                  {(["store","admin"] as const).map(m => (
                    <button key={m} className="lx-tab" onClick={()=>{setMode(m);setErr("");}}
                      style={{ background:mode===m?"#FFFFFF":"transparent", color:mode===m?BP:"#94A3B8", border:mode===m?"1px solid #E2E8F0":"1px solid transparent", boxShadow:mode===m?"0 1px 4px rgba(15,23,42,0.08)":"none" }}>
                      {m==="store" ? "دخول المتجر" : "الإدارة العليا"}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div className="lx2">
                  <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:7 }}>
                    {mode==="admin" ? "اسم المستخدم" : "البريد الإلكتروني أو رقم الهاتف"}
                  </label>
                  <input dir="rtl" className={`lx-field${err?" has-err":""}`} type="text" value={email}
                    onChange={e=>{setEmail(e.target.value);setErr("");}}
                    placeholder={mode==="admin" ? "superadmin" : "email@store.jo"}
                    autoComplete={mode==="admin"?"username":"email"}/>
                </div>

                <div className="lx3">
                  <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:7 }}>كلمة المرور</label>
                  <div style={{ position:"relative" }}>
                    <input dir="rtl" className={`lx-field${err?" has-err":""}`}
                      type={showPass?"text":"password"} value={pass}
                      onChange={e=>{setPass(e.target.value);setErr("");}}
                      placeholder="••••••••" autoComplete="current-password"
                      onKeyDown={e=>e.key==="Enter"&&doLogin()}
                      onKeyUp={e=>setCapsLock(e.getModifierState("CapsLock"))}
                      style={{ paddingLeft:44 }}/>
                    <button type="button" onClick={()=>setShowPass(v=>!v)}
                      style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#94A3B8", padding:0 }}>
                      {showPass ? "🙈" : "👁"}
                    </button>
                  </div>
                  {capsLock && <p style={{ marginTop:6, fontSize:11, fontWeight:600, color:"#B45309" }}>⚠ مفتاح Caps Lock مفعّل</p>}
                </div>

                <div className="lx4">
                  <label style={{ display:"flex", alignItems:"center", gap:9, cursor:"pointer", userSelect:"none", width:"fit-content" }}>
                    <div onClick={()=>setRememberMe(!rememberMe)}
                      style={{ width:18, height:18, borderRadius:5, border:`1.5px solid ${rememberMe?BP:"#CBD5E1"}`, background:rememberMe?BP:"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .16s", cursor:"pointer", flexShrink:0 }}>
                      {rememberMe && <svg width="10" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{ fontSize:13, fontWeight:500, color:"#4B5563" }}>تذكرني</span>
                  </label>
                </div>

                {err && (
                  <div className="lx0" style={{ display:"flex", alignItems:"flex-start", gap:9, padding:"10px 12px", borderRadius:12, background:"#FEF2F2", border:"1px solid #FECACA" }}>
                    <span style={{ color:"#DC2626", flexShrink:0 }}>⚠</span>
                    <p style={{ fontSize:12.5, fontWeight:600, color:"#991B1B" }}>{err}</p>
                  </div>
                )}

                <div className="lx5">
                  <button className="lx-btn" onClick={doLogin} disabled={loading||!online}>
                    {loading ? (
                      <svg style={{ animation:"lx-spin .8s linear infinite" }} width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,0.30)" strokeWidth="2"/><path d="M10 2A8 8 0 0 1 18 10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
                    ) : !online ? "⚠ لا يوجد اتصال" : "دخول ←"}
                  </button>
                </div>
              </div>

              {mode==="store" && !adminUnlocked && (
                <div className="lx6" style={{ marginTop:16, padding:"10px 12px", borderRadius:12, background:"#F8FAFC", border:"1px solid #E2E8F0" }}>
                  <p style={{ fontSize:11.5, color:"#64748B", lineHeight:1.6 }}>
                    تحتاج حساباً؟ تواصل:{" "}
                    <span style={{ color:BP, fontWeight:700 }}>support@sowwanjo.online</span>
                  </p>
                </div>
              )}
              <p style={{ textAlign:"center", fontSize:10.5, color:"#94A3B8", marginTop:18 }}>© 2026 Sowwanjo POS · v1.0 · مشفّر وآمن</p>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE */}
      {!isDesktop && (
        <div style={{ width:"100%", minHeight:"100dvh", display:"flex", flexDirection:"column", padding:"16px 18px 24px", background:"#F8FAFC", position:"relative", zIndex:1, opacity: entering ? 0 : 1, transition:"opacity .38s ease" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
            <button onClick={handleLogoClick} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:10, padding:0 }}>
              <div style={{ width:38, height:38, borderRadius:10, background:`${BP}12`, border:`1.5px solid ${BP}28`, display:"flex", alignItems:"center", justifyContent:"center" }}>🏪</div>
              <div>
                <p style={{ color:"#0F172A", fontWeight:800, fontSize:14.5 }}>Sowwanjo POS</p>
                <p style={{ color:"#64748B", fontSize:10 }}>نظام نقاط البيع السحابي</p>
              </div>
            </button>
            {online && <div style={{ width:7, height:7, borderRadius:"50%", background:"#10B981", boxShadow:"0 0 6px #10B981" }}/>}
          </div>

          <div style={{ background:"#0F172A", borderRadius:18, padding:"18px", marginBottom:16, overflow:"hidden", position:"relative" }}>
            <div style={{ position:"absolute", top:"-20%", right:"-5%", width:160, height:160, borderRadius:"50%", background:`${BP}20`, filter:"blur(55px)", pointerEvents:"none" }}/>
            <h2 style={{ color:"#F8FAFC", fontWeight:900, fontSize:20, letterSpacing:"-0.04em", lineHeight:1.22, marginBottom:8, position:"relative" }}>
              أدِر أعمالك · <span style={{ color:BP }}>{twText}</span><span className="lx-cur"/>
            </h2>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5, position:"relative" }}>
              {BADGES.slice(0,5).map((b,i) => (
                <div key={b} style={{ display:"flex", alignItems:"center", gap:3.5, padding:"3px 8px", borderRadius:100, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)" }}>
                  <span style={{ width:3, height:3, borderRadius:"50%", background:i%2===0?BP:"#10B981", display:"block" }}/>
                  <span style={{ fontSize:9.5, fontWeight:600, color:"rgba(255,255,255,0.42)" }}>{b}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background:"#FFFFFF", border:"1px solid #E2E8F0", borderRadius:18, padding:"22px 18px 18px", boxShadow:"0 8px 30px rgba(15,23,42,.08)", position:"relative" }}>
            <div style={{ position:"absolute", top:0, left:"22%", right:"22%", height:"2px", background:`linear-gradient(90deg,transparent,${BP},transparent)`, borderRadius:2 }}/>
            <h3 style={{ color:"#0F172A", fontWeight:800, fontSize:17, marginBottom:3 }}>مرحباً بعودتك</h3>
            <p style={{ color:"#64748B", fontSize:12, marginBottom:16 }}>أدخل بياناتك للمتابعة</p>

            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <label style={{ display:"block", fontSize:11.5, fontWeight:600, color:"#374151", marginBottom:6 }}>البريد الإلكتروني أو رقم الهاتف</label>
                <input dir="rtl" className={`lx-field${err?" has-err":""}`} type="text" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} placeholder="email@store.jo"/>
              </div>
              <div>
                <label style={{ display:"block", fontSize:11.5, fontWeight:600, color:"#374151", marginBottom:6 }}>كلمة المرور</label>
                <div style={{ position:"relative" }}>
                  <input dir="rtl" className={`lx-field${err?" has-err":""}`} type={showPass?"text":"password"} value={pass}
                    onChange={e=>{setPass(e.target.value);setErr("");}} placeholder="••••••••"
                    onKeyDown={e=>e.key==="Enter"&&doLogin()} style={{ paddingLeft:42 }}/>
                  <button type="button" onClick={()=>setShowPass(v=>!v)} style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#94A3B8", padding:0 }}>
                    {showPass?"🙈":"👁"}
                  </button>
                </div>
              </div>
              {err && <div style={{ padding:"10px 12px", borderRadius:11, background:"#FEF2F2", border:"1px solid #FECACA" }}><p style={{ fontSize:12, fontWeight:600, color:"#991B1B" }}>{err}</p></div>}
              <button className="lx-btn" onClick={doLogin} disabled={loading||!online}>
                {loading ? <svg style={{ animation:"lx-spin .8s linear infinite" }} width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,.30)" strokeWidth="2"/><path d="M10 2A8 8 0 0 1 18 10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
                  : !online ? "⚠ لا يوجد اتصال" : "دخول ←"}
              </button>
            </div>
            <p style={{ textAlign:"center", fontSize:10.5, color:"#94A3B8", marginTop:16 }}>© 2026 Sowwanjo · v1.0</p>
          </div>
        </div>
      )}
    </div>
  );
}
