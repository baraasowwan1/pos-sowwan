import { useState, useCallback, useRef, useEffect, createContext, useContext } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// API SERVICE — يربط Frontend بـ Backend API (MongoDB)
// ─────────────────────────────────────────────────────────────────────────────
const API = (import.meta as Record<string,Record<string,string>>).env?.VITE_API_URL || "http://localhost:5000/api";

export async function apiFetch(path: string, opts: RequestInit = {}, token?: string): Promise<unknown> {
  const headers: Record<string,string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  } catch {
    // Network error — CORS, no connection, wrong URL
    throw { error: `تعذّر الاتصال بالخادم (${API}) — تحقق من VITE_API_URL` };
  }

  let data: unknown = {};
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) throw data || { error: `خطأ ${res.status}` };
  if (!data) throw { error: "استجابة فارغة من الخادم" };
  return data;
}

// جلب/حفظ JWT token
export const getToken = () => { try { return localStorage.getItem("sowwanjo_jwt") || ""; } catch { return ""; } };
export const setToken = (t: string) => { try { localStorage.setItem("sowwanjo_jwt", t); } catch {} };
export const clearToken = () => { try { localStorage.removeItem("sowwanjo_jwt"); } catch {} };

// دخول المتجر من Backend
export async function apiLoginStore(email: string, password: string) {
  return apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }) as Promise<{token:string;store:{id:string;nameAr:string;category:string;plan:string;status:string}}>;
}

// دخول المدير العام من Backend
export async function apiLoginAdmin(email: string, password: string) {
  return apiFetch("/auth/admin", { method: "POST", body: JSON.stringify({ email, password }) }) as Promise<{token:string;role:string}>;
}

// إنشاء متجر من Backend (السوبر أدمن)
export async function apiCreateStore(data: object) {
  return apiFetch("/stores", { method: "POST", body: JSON.stringify(data) }, getToken()) as Promise<{store:StoreData;generatedPassword:string}>;
}

// جلب جميع المتاجر من Backend
export async function apiGetStores() {
  return apiFetch("/stores", {}, getToken()) as Promise<StoreData[]>;
}

// تحديث متجر
export async function apiUpdateStore(id: string, data: object) {
  return apiFetch(`/stores/${id}`, { method: "PUT", body: JSON.stringify(data) }, getToken()) as Promise<StoreData>;
}

// حذف متجر
export async function apiDeleteStore(id: string) {
  return apiFetch(`/stores/${id}`, { method: "DELETE" }, getToken());
}

// إعادة تعيين كلمة مرور متجر
export async function apiResetPass(id: string) {
  return apiFetch(`/stores/${id}/reset-password`, { method: "POST" }, getToken()) as Promise<{newPassword:string}>;
}

// ── Generic CRUD API helpers (scoped to logged-in store via JWT) ─────────────
export const storeApi = {
  get:    (path: string)                => apiFetch(path, {}, getToken()),
  post:   (path: string, data: object) => apiFetch(path, { method: "POST",   body: JSON.stringify(data) }, getToken()),
  put:    (path: string, data: object) => apiFetch(path, { method: "PUT",    body: JSON.stringify(data) }, getToken()),
  patch:  (path: string, data: object) => apiFetch(path, { method: "PATCH",  body: JSON.stringify(data) }, getToken()),
  delete: (path: string)               => apiFetch(path, { method: "DELETE" }, getToken()),
};

// ── useApi hook — fetch from backend with loading/error state ──────────────
export function useApi<T>(path: string, initial: T): { data: T; loading: boolean; error: string; refresh: () => void } {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick(t => t + 1), []);
  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    setLoading(true);
    storeApi.get(path)
      .then(d => { setData(d as T); setError(""); })
      .catch(e => setError((e as {error?:string}).error || "خطأ في جلب البيانات"))
      .finally(() => setLoading(false));
  }, [path, tick]);
  return { data, loading, error, refresh };
}

// Normalize MongoDB _id to id
export function norm<T extends object>(item: T & { _id?: string; id?: string }): T & { id: string } {
  return { ...item, id: item._id || item.id || String(Date.now()) };
}
export function normList<T extends object>(arr: unknown): (T & { id: string })[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => norm(item as T & { _id?: string; id?: string }));
}
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

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type View = "login" | "superadmin" | "store";
export type StoreCategory = "supermarket" | "clothing" | "cafe" | "electronics" | "barber";

export interface StoreData {
  id: string; nameAr: string; nameEn: string; category: StoreCategory;
  owner: string; email: string; phone: string; city: string;
  status: "active" | "suspended" | "expired" | "trial";
  plan: string; users: number; products: number; sales: number;
  revenue: number; createdAt: string; expiresAt: string; branches: number;
  taxNo?: string;
}
export interface Product {
  id: string; nameAr: string; nameEn: string; barcode: string; sku: string;
  category: string; costPrice: number; sellPrice: number; stock: number;
  minStock: number; image: string; unit: string;
}
export interface CartItem { product: Product; qty: number; discount: number; }
export interface Plan {
  id: string; nameAr: string; price: number; yearlyPrice: number;
  maxBranches: number; maxUsers: number; maxProducts: number;
  maxInvoices: number; maxTerminals: number; storage: string;
  apiAccess: boolean; features: string[]; color: string; badge?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────────────────────────────

export const STORES: StoreData[] = [];  // أضف المتاجر من لوحة المدير العام

export const PRODUCTS: Product[] = [];  // أضف المنتجات من إدارة المنتجات

export const PLANS: Plan[] = [
  { id: "pl1", nameAr: "المبتدئ", price: 15, yearlyPrice: 144, maxBranches: 1, maxUsers: 3, maxProducts: 500, maxInvoices: 1000, maxTerminals: 1, storage: "1 غيغابايت", apiAccess: false, color: "#64748B", features: ["نقطة بيع واحدة", "إدارة المنتجات", "تقارير أساسية", "إدارة العملاء", "دعم عبر البريد"] },
  { id: "pl2", nameAr: "الاحترافي", price: 35, yearlyPrice: 336, maxBranches: 3, maxUsers: 10, maxProducts: 2000, maxInvoices: 5000, maxTerminals: 5, storage: "5 غيغابايت", apiAccess: false, color: "#1D4ED8", badge: "الأكثر شيوعاً", features: ["كل مزايا المبتدئ", "إدارة متعددة الفروع", "تقارير متقدمة", "إدارة المخزون", "ماسح الباركود", "إدارة الموردين", "دعم أولوية"] },
  { id: "pl3", nameAr: "المؤسسي", price: 75, yearlyPrice: 720, maxBranches: 99, maxUsers: 99, maxProducts: 99999, maxInvoices: 99999, maxTerminals: 99, storage: "50 غيغابايت", apiAccess: true, color: "#059669", features: ["كل مزايا الاحترافي", "فروع غير محدودة", "مستخدمون غير محدودون", "وصول API كامل", "تقارير مخصصة", "نظام الولاء والمكافآت", "إدارة المستودعات", "نسخ احتياطي يومي تلقائي", "مدير حساب مخصص"] },
];

export const weekData = [
  { day: "السبت", مبيعات: 0, أرباح: 0 }, { day: "الأحد", مبيعات: 0, أرباح: 0 },
  { day: "الاثنين", مبيعات: 0, أرباح: 0 }, { day: "الثلاثاء", مبيعات: 0, أرباح: 0 },
  { day: "الأربعاء", مبيعات: 0, أرباح: 0 }, { day: "الخميس", مبيعات: 0, أرباح: 0 },
  { day: "الجمعة", مبيعات: 0, أرباح: 0 },
];
export const monthData = [
  { month: "يناير", إيرادات: 0, مصروفات: 0, أرباح: 0 },
  { month: "فبراير", إيرادات: 0, مصروفات: 0, أرباح: 0 },
  { month: "مارس", إيرادات: 0, مصروفات: 0, أرباح: 0 },
  { month: "أبريل", إيرادات: 0, مصروفات: 0, أرباح: 0 },
  { month: "مايو", إيرادات: 0, مصروفات: 0, أرباح: 0 },
  { month: "يونيو", إيرادات: 0, مصروفات: 0, أرباح: 0 },
];
export const hourData = [
  { h: "8ص", v: 0 }, { h: "9ص", v: 0 }, { h: "10ص", v: 0 }, { h: "11ص", v: 0 },
  { h: "12م", v: 0 }, { h: "1م", v: 0 }, { h: "2م", v: 0 }, { h: "3م", v: 0 },
  { h: "4م", v: 0 }, { h: "5م", v: 0 }, { h: "6م", v: 0 }, { h: "7م", v: 0 },
];

export const CAT: Record<StoreCategory, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  supermarket: { label: "سوبرماركت",     icon: <ShoppingCart size={15} />, color: "#059669", bg: "#D1FAE5" },
  clothing:    { label: "ملابس",          icon: <ShoppingBag size={15} />, color: "#7C3AED", bg: "#EDE9FE" },
  cafe:        { label: "كافيه",          icon: <Coffee size={15} />,      color: "#D97706", bg: "#FEF3C7" },
  electronics: { label: "إلكترونيات",    icon: <Cpu size={15} />,         color: "#1D4ED8", bg: "#DBEAFE" },
  barber:      { label: "حلاقة وتجميل",  icon: <Scissors size={15} />,    color: "#DB2777", bg: "#FCE7F3" },
};

export const ST = {
  active:    { label: "نشط",    dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  trial:     { label: "تجريبي", dot: "bg-blue-500",    badge: "bg-blue-100 text-blue-700 border border-blue-200" },
  suspended: { label: "موقوف",  dot: "bg-red-500",     badge: "bg-red-100 text-red-700 border border-red-200" },
  expired:   { label: "منتهي",  dot: "bg-orange-500",  badge: "bg-orange-100 text-orange-700 border border-orange-200" },
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILS & SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

export const jod = (n: number) => `${n.toFixed(3)} د.أ`;
export const dateAr = () => new Date().toLocaleDateString("ar-JO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
export const timeAr = () => new Date().toLocaleTimeString("ar-JO", { hour: "2-digit", minute: "2-digit" });


// ── طباعة الإيصال الحقيقية ────────────────────────────────────────────────────
export interface ReceiptData {
  invNo: string;
  storeName: string;
  storePhone: string;
  items: { name: string; qty: number; price: number; discount: number }[];
  subtotal: number;
  discountAmt: number;
  taxAmt: number;
  taxRate: number;   // النسبة الحقيقية من الإعدادات
  total: number;
  payMethod: string;
  change?: number;
  cashIn?: number;
  date: string;
  time: string;
}

export function printReceipt(data: ReceiptData, paper: string = "80mm") {
  const w     = paper === "58mm" ? "58mm" : "80mm";
  const wPx   = paper === "58mm" ? "219px" : "302px";   // 58mm ≈ 219px, 80mm ≈ 302px @ 96dpi
  const fontSize = paper === "58mm" ? "11px" : "13px";

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }

  html, body {
    width: ${wPx};
    max-width: ${wPx};
    font-family: 'Cairo', 'Tahoma', 'Arial', sans-serif;
    font-size: ${fontSize};
    line-height: 1.4;
    color: #000;
    background: #fff;
    direction: rtl;
  }

  .receipt {
    width: ${wPx};
    max-width: ${wPx};
    padding: 4px 6px;
  }

  .center  { text-align: center; }
  .bold    { font-weight: bold; }
  .right   { text-align: right; }

  .line {
    border-top: 1px dashed #000;
    margin: 5px 0;
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin: 2px 0;
    gap: 4px;
  }

  .store-name   { font-size: 15px; font-weight: 900; margin-bottom: 3px; }
  .inv-no       { font-size: 10px; color: #333; }
  .item-name    { flex: 1; text-align: right; word-break: break-word; }
  .item-qty     { white-space: nowrap; text-align: left; font-size: 10px; margin: 0 3px; }
  .item-total   { white-space: nowrap; font-weight: bold; }
  .total-row    { font-size: 14px; font-weight: 900; margin-top: 3px; }
  .footer       { font-size: 10px; color: #555; margin-top: 6px; }
  .discount-note { font-size: 10px; color: #666; padding-right: 4px; }

  @page {
    margin: 0;
    size: ${w} auto;
  }

  @media print {
    html, body {
      width: ${wPx};
      max-width: ${wPx};
    }
    .receipt {
      width: ${wPx};
      max-width: ${wPx};
    }
  }
</style>
</head>
<body>
<div class="receipt">

  <div class="center">
    <div class="store-name">${data.storeName}</div>
    ${data.storePhone ? `<div class="inv-no">${data.storePhone}</div>` : ""}
    <div class="inv-no">pos.sowwanjo.online</div>
  </div>

  <div class="line"></div>

  <div class="row inv-no">
    <span>فاتورة: ${data.invNo}</span>
    <span>${data.date}</span>
  </div>
  <div class="inv-no center">${data.time}</div>

  <div class="line"></div>

  ${data.items.map(it => `
  <div class="row">
    <span class="item-name">${it.name}</span>
    <span class="item-qty">${it.qty}×${it.price.toFixed(3)}</span>
    <span class="item-total">${(it.qty * it.price * (1 - it.discount / 100)).toFixed(3)}</span>
  </div>
  ${it.discount > 0 ? `<div class="discount-note">خصم صنف: ${it.discount}%</div>` : ""}
  `).join("")}

  <div class="line"></div>

  <div class="row">
    <span>المجموع الفرعي</span>
    <span>${data.subtotal.toFixed(3)} JOD</span>
  </div>

  ${data.discountAmt > 0 ? `
  <div class="row">
    <span>خصم الفاتورة</span>
    <span>-${data.discountAmt.toFixed(3)} JOD</span>
  </div>` : ""}

  ${data.taxAmt > 0 ? `
  <div class="row">
    <span>ضريبة ${(data.taxRate * 100).toFixed(0)}%</span>
    <span>${data.taxAmt.toFixed(3)} JOD</span>
  </div>` : ""}

  <div class="line"></div>

  <div class="row total-row">
    <span>الإجمالي</span>
    <span>${data.total.toFixed(3)} JOD</span>
  </div>

  <div class="row">
    <span>الدفع</span>
    <span>${data.payMethod}</span>
  </div>

  ${data.cashIn != null && data.cashIn > 0 ? `
  <div class="row">
    <span>المُستلم</span>
    <span>${(data.cashIn || 0).toFixed(3)} JOD</span>
  </div>` : ""}

  ${(data.change || 0) > 0 ? `
  <div class="row bold">
    <span>الباقي</span>
    <span>${(data.change || 0).toFixed(3)} JOD</span>
  </div>` : ""}

  <div class="line"></div>

  <div class="center footer">
    شكراً لتعاملكم معنا<br/>
    pos.sowwanjo.online
  </div>

</div>
</body>
</html>`;

  // فتح نافذة بعرض دقيق يتناسب مع الطابعة الحرارية
  const winW = paper === "58mm" ? 250 : 340;
  const win = window.open("", "_blank", `width=${winW},height=700,scrollbars=no,toolbar=no,menubar=no`);
  if (!win) { alert("السماح بالنوافذ المنبثقة مطلوب لطباعة الإيصال"); return; }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    // لا نغلق تلقائياً حتى يتم الطباعة فعلاً
    setTimeout(() => win.close(), 1500);
  }, 600);
}

export function SBadge({ status }: { status: StoreData["status"] }) {
  const s = ST[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
    </span>
  );
}

export function KPI({ icon, label, value, sub, color = "#1D4ED8", trend }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color?: string; trend?: number;
}) {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform" style={{ backgroundColor: `${color}18` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-lg ${trend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
            {trend >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground mb-0.5">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/60 mt-0.5">{sub}</p>}
    </div>
  );
}

export function Modal({ title, sub, onClose, children, size = "md" }: {
  title: string; sub?: string; onClose: () => void; children: React.ReactNode; size?: "sm" | "md" | "lg";
}) {
  const w = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-2xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}>
      <div className={`bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl w-full ${w[size]} max-h-[92vh] flex flex-col`} dir="rtl" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border shrink-0">
          <div><h3 className="text-lg font-bold text-foreground">{title}</h3>{sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}</div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors"><X size={15} className="text-muted-foreground" /></button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

export function F({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-foreground">{label}{req && <span className="text-red-500 mr-0.5">*</span>}</label>
      {children}
    </div>
  );
}

export function TInput({ value, onChange, placeholder, type = "text", icon, readOnly }: {
  value: string; onChange?: (v: string) => void; placeholder?: string; type?: string; icon?: React.ReactNode; readOnly?: boolean;
}) {
  return (
    <div className="relative">
      {icon && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">{icon}</span>}
      <input type={type} value={value} readOnly={readOnly} onChange={e => onChange?.(e.target.value)} placeholder={placeholder}
        className={`w-full h-10 rounded-xl border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-primary transition-all ${icon ? "pr-9 pl-3" : "px-3"} ${readOnly ? "opacity-60" : ""}`} />
    </div>
  );
}

export function SInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="w-full h-10 rounded-xl border border-border bg-input-background text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-primary">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function Btn({ children, onClick, v = "primary", s = "md", icon, cls = "", disabled, full }: {
  children?: React.ReactNode; onClick?: () => void;
  v?: "primary" | "secondary" | "ghost" | "danger" | "success" | "warning";
  s?: "xs" | "sm" | "md" | "lg"; icon?: React.ReactNode; cls?: string; disabled?: boolean; full?: boolean;
}) {
  const vs = {
    primary: "bg-primary text-white hover:bg-primary/90 shadow-sm",
    secondary: "bg-card text-foreground border border-border hover:bg-muted shadow-sm",
    ghost: "text-foreground hover:bg-muted/70",
    danger: "bg-destructive text-white hover:bg-destructive/90 shadow-sm",
    success: "bg-accent text-white hover:bg-accent/90 shadow-sm",
    warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-sm",
  };
  const ss = { xs: "h-7 px-2.5 text-xs gap-1", sm: "h-8 px-3 text-xs gap-1.5", md: "h-10 px-4 text-sm gap-2", lg: "h-12 px-6 text-base gap-2" };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center justify-center font-semibold rounded-xl transition-all ${vs[v]} ${ss[s]} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${full ? "w-full" : ""} ${cls}`}>
      {icon}{children}
    </button>
  );
}

export function Hdr({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div><h2 className="text-xl font-bold text-foreground">{title}</h2>{sub && <p className="text-sm text-muted-foreground mt-0.5">{sub}</p>}</div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

export function Empty({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4 text-muted-foreground/50">{icon}</div>
      <p className="font-bold text-foreground mb-1">{title}</p>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

// ── Toast notification system ──────────────────────────────────────────────────
type ToastT = { id: number; msg: string; type: "success"|"error"|"info"|"warning" };
const _toastListeners: ((t: ToastT) => void)[] = [];
export function showToast(msg: string, type: ToastT["type"] = "success") {
  const t: ToastT = { id: Date.now() + Math.random(), msg, type };
  _toastListeners.forEach(fn => fn(t));
}
export function ToastHost() {
  const [list, setList] = useState<ToastT[]>([]);
  useEffect(() => {
    const fn = (t: ToastT) => {
      setList(p => [...p.slice(-3), t]);
      setTimeout(() => setList(p => p.filter(x => x.id !== t.id)), 3500);
    };
    _toastListeners.push(fn);
    return () => { const i = _toastListeners.indexOf(fn); if (i > -1) _toastListeners.splice(i, 1); };
  }, []);
  if (!list.length) return null;
  const BG: Record<string,string> = { success:"bg-emerald-600", error:"bg-red-600", info:"bg-blue-600", warning:"bg-amber-500" };
  const IC: Record<string,React.ReactNode> = { success:<CheckCircle size={14}/>, error:<XCircle size={14}/>, info:<Info size={14}/>, warning:<AlertTriangle size={14}/> };
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none" dir="rtl">
      {list.map(t => (
        <div key={t.id} className={`${BG[t.type]} text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-sm font-semibold min-w-56`}>
          {IC[t.type]}{t.msg}
        </div>
      ))}
    </div>
  );
}

// ── Toggle Switch ──────────────────────────────────────────────────────────────
export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`w-10 h-5 rounded-full transition-colors flex items-center shrink-0 ${on ? "bg-primary" : "bg-switch-background"}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all mx-0.5 ${on ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

// ── localStorage Persistence Hook ────────────────────────────────────────────
export function useLS<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initial;
    } catch { return initial; }
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

// Store-scoped localStorage key
const sk = (storeId: string, name: string) => `sowwanjo_${storeId}_${name}`;

// ── Store Context — passes storeId to all child screens ───────────────────────
export const StoreCtx = createContext<string>("");
export const useStoreId = () => useContext(StoreCtx);

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN — SEPARATED (Store / Admin)
// Admin accessible only via clicking logo 5 times (hidden portal)
// ─────────────────────────────────────────────────────────────────────────────

export function LoginScreen({ onLogin }: { onLogin: (type: "superadmin" | "store", id?: string) => void }) {
  const [mode, setMode] = useState<"store" | "admin">("store");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [logoClicks, setLogoClicks] = useState(0);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const logoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Secret: click logo 5× within 3 seconds → unlock admin portal
  const handleLogoClick = () => {
    const next = logoClicks + 1;
    setLogoClicks(next);
    if (logoTimer.current) clearTimeout(logoTimer.current);
    if (next >= 5) {
      setAdminUnlocked(true);
      setLogoClicks(0);
    } else {
      logoTimer.current = setTimeout(() => setLogoClicks(0), 3000);
    }
  };

  const doLogin = async () => {
    if (!email || !pass) { setErr("الرجاء إدخال البريد الإلكتروني وكلمة المرور"); return; }
    setLoading(true); setErr("");
    try {
      if (mode === "admin") {
        // ── المدير العام — Backend فقط ───────────────────────────────
        const res = await apiLoginAdmin(email, pass);
        if (!res?.token) throw { error: "لم يُستلم توكن من الخادم" };
        setToken(res.token);
        onLogin("superadmin");
      } else {
        // ── المتجر — Backend فقط (MongoDB) — يعمل من أي متصفح ────────
        const res = await apiLoginStore(email, pass);
        if (!res?.token) throw { error: "لم يُستلم توكن من الخادم" };
        if (!res?.store?.id) throw { error: "بيانات المتجر غير مكتملة" };
        setToken(res.token);
        // تطبيع وحفظ بيانات المتجر في localStorage
        const normalizedStore = {
          id:       (res.store as {_id?: string; id: string})._id || res.store.id,
          nameAr:   res.store.nameAr   || "متجري",
          nameEn:   res.store.nameEn   || "",
          category: res.store.category || "supermarket",
          owner:    res.store.owner    || "",
          email:    res.store.email    || "",
          phone:    res.store.phone    || "",
          city:     res.store.city     || "",
          status:   res.store.status   || "active",
          plan:     res.store.plan     || "مبتدئ",
          taxNo:    "",
          users:    0, products: 0, sales: 0, revenue: 0, branches: 1,
          createdAt:new Date().toISOString().split("T")[0],
          expiresAt:res.store.expiresAt
            ? new Date(res.store.expiresAt).toISOString().split("T")[0]
            : new Date(Date.now() + 365*86400000).toISOString().split("T")[0],
        };
        try {
          localStorage.setItem(
            `sowwanjo_storeinfo_${normalizedStore.id}`,
            JSON.stringify(normalizedStore)
          );
        } catch {}
        onLogin("store", normalizedStore.id);
      }
    } catch (err: unknown) {
      const e = err as {error?:string; message?:string};
      setErr(e.error || e.message || "حدث خطأ غير متوقع — حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" dir="rtl" style={{ fontFamily: "'Cairo',sans-serif" }}>
      {/* Decorative Panel */}
      <div className="hidden lg:flex flex-1 flex-col relative overflow-hidden" style={{ background: "linear-gradient(160deg,#0A0F1E 0%,#0F172A 40%,#162040 100%)" }}>
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
        {/* Glow orbs */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full opacity-10" style={{ background: "radial-gradient(circle,#3B82F6 0%,transparent 70%)" }} />
        <div className="absolute bottom-1/3 left-1/4 w-64 h-64 rounded-full opacity-10" style={{ background: "radial-gradient(circle,#06B6D4 0%,transparent 70%)" }} />

        <div className="relative z-10 flex flex-col h-full">
          {/* Top — Logo */}
          <div className="px-12 pt-10">
            <button onClick={handleLogoClick} className="flex items-center gap-3 cursor-pointer group select-none" style={{ background: "none", border: "none" }}>
              <div className="w-11 h-11 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center backdrop-blur-sm group-hover:bg-blue-500/30 transition-colors">
                <Store size={20} className="text-blue-400" />
              </div>
              <div className="text-right">
                <p className="text-white font-black text-lg leading-tight">Sowwanjo POS</p>
                <p className="text-blue-400/60 text-xs">pos.sowwanjo.online</p>
              </div>
            </button>
          </div>

          {/* Middle — POS Image hero */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-6">
            {/* Headline above image */}
            <div className="text-center mb-6">
              <h1 className="text-4xl font-black text-white leading-tight mb-2">
                ادِر متجرك<br />
                <span className="bg-gradient-to-l from-blue-400 to-cyan-400 bg-clip-text text-transparent">بذكاء وسرعة</span>
              </h1>
              <p className="text-white/40 text-sm max-w-xs mx-auto">
                نظام POS سحابي متكامل مصمم للسوق الأردني
              </p>
            </div>

            {/* POS Device Image */}
            <div className="relative w-full max-w-md">
              {/* Glow under image */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 rounded-full opacity-30 blur-xl" style={{ background: "linear-gradient(90deg,#3B82F6,#06B6D4)" }} />
              {/* Device frame */}
              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)" }}>
                <img
                  src="https://images.unsplash.com/photo-1726065235239-b20b88d43eea?w=700&h=460&fit=crop&auto=format&q=85"
                  alt="جهاز نقطة البيع Sowwanjo POS"
                  className="w-full object-cover"
                  style={{ height: "260px" }}
                />
                {/* Overlay tint */}
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,15,30,0.5) 0%, transparent 60%)" }} />
                {/* Live badge */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-white text-xs font-semibold">نشط الآن</span>
                </div>
                {/* Stats overlay */}
                <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-1.5">
                  <p className="text-white/50 text-xs">مبيعات اليوم</p>
                  <p className="text-white font-black text-sm">247.850 JOD</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom — Feature cards */}
          <div className="px-8 pb-10 grid grid-cols-2 gap-2.5">
            {[
              { icon: <Store size={16} />, t: "متعدد المتاجر", d: "إدارة كاملة بلا حدود" },
              { icon: <ShoppingCart size={16} />, t: "نقطة بيع سريعة", d: "واجهة لمس احترافية" },
              { icon: <BarChart2 size={16} />, t: "تقارير لحظية", d: "تحليلات مباشرة" },
              { icon: <Shield size={16} />, t: "أمان عالي", d: "بيانات معزولة لكل متجر" },
            ].map(f => (
              <div key={f.t} className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-3 backdrop-blur-sm hover:bg-white/[0.07] transition-colors">
                <div className="text-blue-400 mb-1.5">{f.icon}</div>
                <p className="text-white font-bold text-xs">{f.t}</p>
                <p className="text-white/35 text-xs mt-0.5">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="w-full lg:w-[460px] bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <button onClick={handleLogoClick} className="flex items-center gap-2 mb-8 lg:hidden" style={{ background: "none", border: "none" }}>
            <Store size={22} className="text-primary" />
            <span className="font-black text-xl text-foreground">Sowwanjo POS</span>
          </button>

          {/* Admin mode banner (only shown after 5 logo clicks) */}
          {adminUnlocked && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-2">
              <Shield size={14} className="text-amber-600 shrink-0" />
              <p className="text-xs font-bold text-amber-700">تم تفعيل وضع الإدارة العليا</p>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-2xl font-black text-foreground mb-1">
              {mode === "admin" && adminUnlocked ? "بوابة الإدارة العليا" : "تسجيل الدخول"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {mode === "admin" && adminUnlocked ? "الوصول مقيد بالمصرح لهم فقط" : "أدخل بيانات حساب متجرك للدخول"}
            </p>
          </div>

          {/* Tab — admin tab only visible after secret unlock */}
          {adminUnlocked && (
            <div className="flex bg-muted/60 rounded-2xl p-1 mb-6 border border-border">
              <button onClick={() => { setMode("store"); setErr(""); }} className={`flex-1 h-9 rounded-xl text-sm font-bold transition-all ${mode === "store" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
                🏪 دخول المتجر
              </button>
              <button onClick={() => { setMode("admin"); setErr(""); }} className={`flex-1 h-9 rounded-xl text-sm font-bold transition-all ${mode === "admin" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
                🔐 الإدارة العليا
              </button>
            </div>
          )}

          <div className="space-y-4">
            <F label={mode === "admin" ? "اسم المستخدم" : "البريد الإلكتروني للمتجر"} req>
              <TInput value={email} onChange={setEmail} placeholder={mode === "admin" ? "اسم المستخدم" : "store@sowwanjo.online"} icon={mode === "admin" ? <Shield size={14} /> : <Mail size={14} />} />
            </F>
            <F label="كلمة المرور" req>
              <div className="relative">
                <input type={showPass ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••"
                  onKeyDown={e => e.key === "Enter" && doLogin()}
                  className="w-full h-10 rounded-xl border border-border bg-input-background text-sm text-foreground px-3 pr-9 focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-primary transition-all" />
                <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </F>
            {err && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle size={14} /> {err}
              </div>
            )}
            <Btn onClick={doLogin} full disabled={loading} s="lg" icon={loading ? <RefreshCw size={16} className="animate-spin" /> : <ArrowLeft size={16} />}>
              {loading ? "جاري التحقق..." : "دخول"}
            </Btn>
          </div>

          {/* Store owner note */}
          {mode === "store" && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
              <p className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-1.5"><Info size={12} /> ملاحظة لأصحاب المتاجر</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                إذا لم تمتلك حساباً، تواصل مع مزود الخدمة على: support@sowwanjo.online
              </p>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground mt-8">
            جميع الحقوق محفوظة © 2025 Sowwanjo<br />
            <span className="opacity-60">مدعوم بالدينار الأردني JOD • عربي RTL</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPER ADMIN LAYOUT
// ─────────────────────────────────────────────────────────────────────────────
