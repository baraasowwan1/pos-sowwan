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

// ── Dark mode ─────────────────────────────────────────────────────────────────
const applyDark = (dark: boolean) => {
  document.documentElement.classList.toggle("dark", dark);
  try { localStorage.setItem("sowwanjo_dark", dark ? "1" : "0"); } catch {}
};
export const useDarkMode = (): [boolean, () => void] => {
  const [dark, setDark] = useState<boolean>(() => {
    try { return localStorage.getItem("sowwanjo_dark") === "1"; } catch { return false; }
  });
  useEffect(() => { applyDark(dark); }, [dark]);
  const toggle = () => setDark(d => !d);
  return [dark, toggle];
};

// ── Platform Branding ─────────────────────────────────────────────────────────
export interface PlatformBranding {
  platformName?: string;
  platformShortName?: string;
  logoUrl?: string;
  iconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  loginTitle?: string;
  loginSubtitle?: string;
  supportEmail?: string;
  supportPhone?: string;
  websiteUrl?: string;
  footerCopyright?: string;
  sidebarStyle?: "dark" | "light";
}

export function applyBranding(b: PlatformBranding) {
  if (!b) return;
  const root = document.documentElement;
  if (b.primaryColor) { root.style.setProperty("--primary", b.primaryColor); root.style.setProperty("--ring", b.primaryColor); }
  if (b.secondaryColor) root.style.setProperty("--accent", b.secondaryColor);
  if (b.accentColor) root.style.setProperty("--chart-3", b.accentColor);
  if (b.platformName) document.title = b.platformName;
  if (b.iconUrl) {
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = b.iconUrl;
  }
  try { localStorage.setItem("sowwanjo_branding", JSON.stringify(b)); } catch {}
}

export function getCachedBranding(): PlatformBranding | null {
  try { const s = localStorage.getItem("sowwanjo_branding"); return s ? JSON.parse(s) : null; } catch { return null; }
}

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

// إعادة تعيين كلمة مرور متجر (SA يكتب كلمة المرور يدوياً)
export async function apiResetPass(storeId: string, newPassword: string) {
  return apiFetch(`/stores/${storeId}/reset-password`, { method: "POST", body: JSON.stringify({ newPassword }) }, getToken()) as Promise<{ ok: boolean }>;
}

// إعادة تعيين كلمة مرور موظف من قبل SA
export async function apiResetEmployeePass(storeId: string, userId: string, newPassword: string) {
  return apiFetch(`/stores/${storeId}/users/${userId}/reset-password`, { method: "POST", body: JSON.stringify({ newPassword }) }, getToken()) as Promise<{ ok: boolean }>;
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
  Cpu, ShoppingBag, Send, Archive, RotateCcw, Scan, Wallet, Ruler, Flower2, Gift, Bike,
  Building2, Boxes, Truck, LayoutDashboard, UserCheck, ClipboardList,
  Banknote, Landmark, Handshake, Globe, MapPin, Key, User,
  ArrowUpRight, ArrowDownRight, Clipboard, Copy, Power, Monitor,
  Info, ChevronLeft, Grid3X3, List, Hash, Tag, WifiOff,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type View = "login" | "superadmin" | "store";
export type StoreCategory = "supermarket" | "clothing" | "cafe" | "electronics" | "barber" | "print_shop" | "flower_shop";

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
  { id: "pl2", nameAr: "الاحترافي", price: 35, yearlyPrice: 336, maxBranches: 3, maxUsers: 10, maxProducts: 2000, maxInvoices: 5000, maxTerminals: 5, storage: "5 غيغابايت", apiAccess: false, color: "#4F46E5", badge: "الأكثر شيوعاً", features: ["كل مزايا المبتدئ", "إدارة متعددة الفروع", "تقارير متقدمة", "إدارة المخزون", "ماسح الباركود", "إدارة الموردين", "دعم أولوية"] },
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
  electronics: { label: "إلكترونيات",    icon: <Cpu size={15} />,         color: "#4F46E5", bg: "#EEF2FF" },
  barber:      { label: "حلاقة وتجميل",  icon: <Scissors size={15} />,    color: "#DB2777", bg: "#FCE7F3" },
  print_shop:  { label: "مطبعة / طباعة", icon: <Ruler size={15} />,       color: "#0891B2", bg: "#CFFAFE" },
  flower_shop: { label: "محل زهور",      icon: <Flower2 size={15} />,     color: "#EC4899", bg: "#FCE7F3" },
};

export type CategoryModules = {
  openFoodFacts: boolean;
  nutrition: boolean;
  expiryDate: boolean;
  weightProducts: boolean;
  productVariants: boolean;
  sizes: boolean;
  colors: boolean;
  tables: boolean;
  kitchenOrders: boolean;
  modifiers: boolean;
  qrMenu: boolean;
  serialNumbers: boolean;
  warranty: boolean;
  repairs: boolean;
  appointments: boolean;
  services: boolean;
  commissions: boolean;
  printJobs: boolean;
  printMaterials: boolean;
  printPricing: boolean;
  flowerOrders: boolean;
  bouquetBuilder: boolean;
  deliveryMgmt: boolean;
};

export const CATEGORY_MODULES: Record<StoreCategory, CategoryModules> = {
  supermarket: { openFoodFacts: true,  nutrition: true,  expiryDate: true,  weightProducts: true,  productVariants: false, sizes: false, colors: false, tables: false, kitchenOrders: false, modifiers: false, qrMenu: false, serialNumbers: false, warranty: false, repairs: false, appointments: false, services: false, commissions: false, printJobs: false, printMaterials: false, printPricing: false, flowerOrders: false, bouquetBuilder: false, deliveryMgmt: false },
  clothing:    { openFoodFacts: false, nutrition: false, expiryDate: false, weightProducts: false, productVariants: true,  sizes: true,  colors: true,  tables: false, kitchenOrders: false, modifiers: false, qrMenu: false, serialNumbers: false, warranty: false, repairs: false, appointments: false, services: false, commissions: false, printJobs: false, printMaterials: false, printPricing: false, flowerOrders: false, bouquetBuilder: false, deliveryMgmt: false },
  cafe:        { openFoodFacts: false, nutrition: false, expiryDate: false, weightProducts: false, productVariants: false, sizes: false, colors: false, tables: true,  kitchenOrders: true,  modifiers: true,  qrMenu: true,  serialNumbers: false, warranty: false, repairs: false, appointments: false, services: false, commissions: false, printJobs: false, printMaterials: false, printPricing: false, flowerOrders: false, bouquetBuilder: false, deliveryMgmt: false },
  electronics: { openFoodFacts: false, nutrition: false, expiryDate: false, weightProducts: false, productVariants: false, sizes: false, colors: false, tables: false, kitchenOrders: false, modifiers: false, qrMenu: false, serialNumbers: true,  warranty: true,  repairs: true,  appointments: false, services: false, commissions: false, printJobs: false, printMaterials: false, printPricing: false, flowerOrders: false, bouquetBuilder: false, deliveryMgmt: false },
  barber:      { openFoodFacts: false, nutrition: false, expiryDate: false, weightProducts: false, productVariants: false, sizes: false, colors: false, tables: false, kitchenOrders: false, modifiers: false, qrMenu: false, serialNumbers: false, warranty: false, repairs: false, appointments: true,  services: true,  commissions: true,  printJobs: false, printMaterials: false, printPricing: false, flowerOrders: false, bouquetBuilder: false, deliveryMgmt: false },
  print_shop:  { openFoodFacts: false, nutrition: false, expiryDate: false, weightProducts: false, productVariants: false, sizes: false, colors: false, tables: false, kitchenOrders: false, modifiers: false, qrMenu: false, serialNumbers: false, warranty: false, repairs: false, appointments: false, services: false, commissions: false, printJobs: true,  printMaterials: true,  printPricing: true,  flowerOrders: false, bouquetBuilder: false, deliveryMgmt: false },
  flower_shop: { openFoodFacts: false, nutrition: false, expiryDate: true,  weightProducts: false, productVariants: false, sizes: false, colors: false, tables: false, kitchenOrders: false, modifiers: false, qrMenu: false, serialNumbers: false, warranty: false, repairs: false, appointments: false, services: false, commissions: false, printJobs: false, printMaterials: false, printPricing: false, flowerOrders: true,  bouquetBuilder: true,  deliveryMgmt: true  },
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

export function KPI({ icon, label, value, sub, color = "#4F46E5", trend }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color?: string; trend?: number;
}) {
  return (
    <div className="bg-card rounded-xl border border-border hover:shadow-sm transition-all group relative overflow-hidden" style={{ borderRightWidth: 3, borderRightColor: color }}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15`, color }}>
            {icon}
          </div>
          {trend !== undefined && (
            <span className={`flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-md ${trend >= 0 ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400" : "text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-400"}`}>
              {trend >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{Math.abs(trend)}%
            </span>
          )}
        </div>
        <p className="text-2xl font-bold text-foreground leading-tight tracking-tight mb-0.5">{value}</p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function Modal({ title, sub, onClose, children, size = "md" }: {
  title: string; sub?: string; onClose: () => void; children: React.ReactNode; size?: "sm" | "md" | "lg";
}) {
  const w = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-2xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl w-full ${w[size]} max-h-[94vh] sm:max-h-[88vh] flex flex-col`} dir="rtl" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border/60" />
        </div>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><X size={14} /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 overscroll-contain">{children}</div>
      </div>
    </div>
  );
}

export function F({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-foreground">{label}{req && <span className="text-destructive mr-0.5">*</span>}</label>
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
        className={`w-full h-10 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${icon ? "pr-9 pl-3" : "px-3"} ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`} />
    </div>
  );
}

export function SInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="w-full h-10 rounded-lg border border-border bg-input-background text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
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
    primary:   "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
    secondary: "bg-card text-foreground border border-border hover:bg-muted",
    ghost:     "text-muted-foreground hover:bg-muted hover:text-foreground",
    danger:    "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
    success:   "bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm",
    warning:   "bg-amber-500 text-white hover:bg-amber-600 shadow-sm",
  };
  const ss = {
    xs: "h-7 px-2.5 text-xs gap-1 rounded-md",
    sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
    md: "h-9 px-4 text-sm gap-2 rounded-lg",
    lg: "h-10 px-5 text-sm gap-2 rounded-lg",
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center justify-center font-medium transition-all active:scale-[0.97] ${vs[v]} ${ss[s]} ${disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : ""} ${full ? "w-full" : ""} ${cls}`}>
      {icon}{children}
    </button>
  );
}

export function Hdr({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 pb-4 border-b border-border mb-4">
      <div className="flex items-center gap-3">
        <div className="w-1 h-5 bg-primary rounded-full shrink-0" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </div>
      {action && <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">{action}</div>}
    </div>
  );
}

export function Empty({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4 text-muted-foreground">{icon}</div>
      <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">{desc}</p>
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
  const styles: Record<string,string> = {
    success: "bg-card border-emerald-200 text-emerald-700",
    error:   "bg-card border-red-200 text-red-700",
    info:    "bg-card border-blue-200 text-blue-700",
    warning: "bg-card border-amber-200 text-amber-700",
  };
  const IC: Record<string,React.ReactNode> = {
    success: <CheckCircle size={14} />,
    error:   <XCircle size={14} />,
    info:    <Info size={14} />,
    warning: <AlertTriangle size={14} />,
  };
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-5 z-[200] flex flex-col gap-2 pointer-events-none items-center sm:items-end" dir="rtl">
      {list.map(t => (
        <div key={t.id} className={`${styles[t.type]} border shadow-xl px-4 py-3 rounded-xl flex items-center gap-2.5 text-sm font-medium min-w-64 max-w-sm`}
          style={{ animation: "lgn-up .3s ease both" }}>
          {IC[t.type]}<span className="text-foreground">{t.msg}</span>
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
export const sk = (storeId: string, name: string) => `sowwanjo_${storeId}_${name}`;

// ── Store Context — passes storeId to all child screens ───────────────────────
export const StoreCtx = createContext<string>("");
export const useStoreId = () => useContext(StoreCtx);

export function useStoreModules(): CategoryModules {
  const sid = useStoreId();
  const [modules, setModules] = useState<CategoryModules>(CATEGORY_MODULES.supermarket);
  useEffect(() => {
    const raw = localStorage.getItem(`sowwanjo_storeinfo_${sid}`);
    if (raw) {
      try {
        const store = JSON.parse(raw);
        const cat = (store.category || store.businessType || "supermarket") as StoreCategory;
        setModules(CATEGORY_MODULES[cat] || CATEGORY_MODULES.supermarket);
      } catch {}
    }
  }, [sid]);
  return modules;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────

// Inline SVG POS dashboard illustration for the brand panel
function POSIllustration() {
  const bars = [42, 68, 55, 80, 61, 90, 74];
  const maxBar = 90;
  return (
    <div className="w-full max-w-[400px] mx-auto select-none" style={{ animation: "fadeUp 0.7s ease both 0.3s" }}>
      {/* Mock app window */}
      <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl" style={{ background: "#1e293b" }}>
        {/* Window bar */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/8" style={{ background: "#0f172a" }}>
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          <span className="flex-1 text-center text-[10px] text-white/20 font-mono">Sowwanjo POS</span>
        </div>
        <div className="p-3 space-y-2.5">
          {/* Metric row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "مبيعات اليوم", value: "247.850", unit: "JOD", color: "#60a5fa" },
              { label: "الفواتير",      value: "38",       unit: "فاتورة", color: "#34d399" },
              { label: "العملاء",      value: "12",       unit: "جديد",  color: "#a78bfa" },
            ].map(m => (
              <div key={m.label} className="rounded-lg p-2" style={{ background: "#0f172a" }}>
                <p className="text-[9px] mb-1" style={{ color: "#64748b" }}>{m.label}</p>
                <p className="text-sm font-bold leading-none" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[9px] mt-0.5" style={{ color: "#475569" }}>{m.unit}</p>
              </div>
            ))}
          </div>
          {/* Bar chart */}
          <div className="rounded-lg p-2.5" style={{ background: "#0f172a" }}>
            <p className="text-[9px] mb-2" style={{ color: "#64748b" }}>مبيعات الأسبوع</p>
            <div className="flex items-end gap-1 h-16">
              {bars.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full rounded-sm" style={{ height: `${(h / maxBar) * 100}%`, background: i === 5 ? "#2563eb" : "#1e3a5f", transition: "height 1s ease" }} />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1">
              {["سبت","أحد","اثن","ثلا","أرب","خمس","جمع"].map(d => (
                <span key={d} className="flex-1 text-center" style={{ fontSize: "7px", color: "#334155" }}>{d}</span>
              ))}
            </div>
          </div>
          {/* Product rows */}
          <div className="space-y-1">
            {[
              { name: "كوكا كولا 330مل", qty: 24, price: "0.650" },
              { name: "عصير نكتار توت",  qty: 18, price: "0.850" },
              { name: "ماء حياة 500مل",  qty: 41, price: "0.250" },
            ].map(p => (
              <div key={p.name} className="flex items-center gap-2 rounded px-2 py-1.5" style={{ background: "#0f172a" }}>
                <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ background: "#1e3a5f" }}>
                  <span style={{ fontSize: "9px" }}>📦</span>
                </div>
                <span className="flex-1 text-[9px] truncate" style={{ color: "#94a3b8" }}>{p.name}</span>
                <span className="text-[9px] font-bold" style={{ color: "#60a5fa" }}>{p.price} JOD</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoginScreen({ onLogin }: { onLogin: (type: "superadmin" | "store", id?: string) => void }) {
  const [mode, setMode] = useState<"store" | "admin">("store");
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem("sowwanjo_remember_email") || ""; } catch { return ""; }
  });
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [rememberMe, setRememberMe] = useState(() => {
    try { return !!localStorage.getItem("sowwanjo_remember_email"); } catch { return false; }
  });
  const [capsLock, setCapsLock] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [logoClicks, setLogoClicks] = useState(0);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const logoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const up = () => setOnline(true);
    const dn = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", dn);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", dn); };
  }, []);

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

  const friendlyError = (e: {error?:string; message?:string; status?: number; code?: string}): string => {
    const msg = (e.error || e.message || "").toLowerCase();
    if (e.code === "ABORT_ERR" || msg.includes("abort") || msg.includes("timeout"))
      return "انتهت مهلة الاتصال — تأكد من الاتصال بالإنترنت وحاول مرة أخرى";
    if (!online || msg.includes("failed to fetch") || msg.includes("network") || msg.includes("cors"))
      return "تعذر الوصول إلى الخادم — تحقق من اتصالك بالإنترنت";
    if (msg.includes("suspended") || msg.includes("موقوف"))
      return "هذا الحساب موقوف — تواصل مع الدعم الفني";
    if (msg.includes("expired") || msg.includes("subscription") || msg.includes("منتهي"))
      return "انتهى اشتراك المتجر — يرجى تجديد الاشتراك";
    if (msg.includes("invalid") || msg.includes("incorrect") || msg.includes("wrong") || msg.includes("خطأ") || msg.includes("غير صحيح"))
      return "البريد الإلكتروني أو كلمة المرور غير صحيحة";
    if (msg.includes("not found") || msg.includes("غير موجود"))
      return "لا يوجد حساب بهذا البريد الإلكتروني";
    if (e.error) return e.error;
    if (e.message) return e.message;
    return "حدث خطأ غير متوقع — حاول مرة أخرى";
  };

  const doLogin = async () => {
    if (loading) return;
    if (!email || !pass) { setErr("الرجاء إدخال البريد الإلكتروني وكلمة المرور"); return; }
    if (!online) { setErr("لا يوجد اتصال بالإنترنت — تحقق من شبكتك وحاول مرة أخرى"); return; }
    setLoading(true); setErr("");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      if (mode === "admin") {
        const res = await apiLoginAdmin(email, pass);
        if (!res?.token) throw { error: "لم يُستلم توكن من الخادم" };
        setToken(res.token);
        if (rememberMe) {
          try { localStorage.setItem("sowwanjo_remember_email", email); } catch {}
        } else {
          try { localStorage.removeItem("sowwanjo_remember_email"); } catch {}
        }
        onLogin("superadmin");
      } else {
        const res = await apiLoginStore(email, pass);
        if (!res?.token) throw { error: "لم يُستلم توكن من الخادم" };
        if (!res?.store?.id) throw { error: "بيانات المتجر غير مكتملة" };
        setToken(res.token);
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
          users: 0, products: 0, sales: 0, revenue: 0, branches: 1,
          createdAt: new Date().toISOString().split("T")[0],
          expiresAt: res.store.expiresAt
            ? new Date(res.store.expiresAt).toISOString().split("T")[0]
            : new Date(Date.now() + 365*86400000).toISOString().split("T")[0],
        };
        try {
          localStorage.setItem(`sowwanjo_storeinfo_${normalizedStore.id}`, JSON.stringify(normalizedStore));
          // Save user role for permission enforcement in StoreLayout
          if (res.user?.role) {
            localStorage.setItem(`sowwanjo_user_role_${normalizedStore.id}`, res.user.role);
          }
          if (res.user?.name) {
            localStorage.setItem(`sowwanjo_user_name_${normalizedStore.id}`, res.user.name);
          }
        } catch {}
        if (rememberMe) {
          try { localStorage.setItem("sowwanjo_remember_email", email); } catch {}
        } else {
          try { localStorage.removeItem("sowwanjo_remember_email"); } catch {}
        }
        onLogin("store", normalizedStore.id);
      }
    } catch (err: unknown) {
      const e = err as {error?:string; message?:string; code?: string; status?: number; name?: string};
      if (e.name === "AbortError" || e.code === "ABORT_ERR") {
        setErr("انتهت مهلة الاتصال (10 ثوان) — تأكد من الاتصال بالإنترنت وحاول مرة أخرى");
      } else {
        setErr(friendlyError(e));
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" style={{ fontFamily:"'Cairo',sans-serif", minHeight:"100dvh", display:"flex" }}>
      <style>{`
        @keyframes lgn-up  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes lgn-spin { to{transform:rotate(360deg)} }
        @keyframes lgn-fade { from{opacity:0} to{opacity:1} }
        .lf0{animation:lgn-up .45s cubic-bezier(.22,1,.36,1) both}
        .lf1{animation:lgn-up .45s cubic-bezier(.22,1,.36,1) both .07s}
        .lf2{animation:lgn-up .45s cubic-bezier(.22,1,.36,1) both .13s}
        .lf3{animation:lgn-up .45s cubic-bezier(.22,1,.36,1) both .19s}
        .lf4{animation:lgn-up .45s cubic-bezier(.22,1,.36,1) both .25s}
        .lf5{animation:lgn-up .45s cubic-bezier(.22,1,.36,1) both .31s}
        .lf6{animation:lgn-up .45s cubic-bezier(.22,1,.36,1) both .37s}
        .lgn-spin{animation:lgn-spin .8s linear infinite}
        .lgn-field{
          width:100%; height:48px; border-radius:10px;
          border:1.5px solid #E5E7EB;
          background:#F9FAFB;
          color:#111827; font-size:14px;
          padding:0 44px 0 14px;
          outline:none;
          transition:border-color .15s, box-shadow .15s, background .15s;
          font-family:"Cairo",sans-serif;
          -webkit-appearance:none;
        }
        .lgn-field:focus{
          border-color:#4F46E5;
          box-shadow:0 0 0 3px rgba(79,70,229,0.12);
          background:#fff;
        }
        .lgn-field::placeholder{color:#9CA3AF}
        .lgn-field[dir="rtl"]{text-align:right}
        .lgn-field.err{border-color:#EF4444; box-shadow:0 0 0 3px rgba(239,68,68,0.1);}
        .lgn-submit{
          width:100%; height:48px; border-radius:10px;
          background:#4F46E5; color:#fff;
          font-size:14px; font-weight:700;
          border:none; cursor:pointer;
          display:flex; align-items:center; justify-content:center; gap:8px;
          transition:background .15s, transform .1s, box-shadow .15s;
          font-family:"Cairo",sans-serif;
          letter-spacing:-0.01em;
        }
        .lgn-submit:hover:not(:disabled){background:#4338CA; box-shadow:0 4px 16px rgba(79,70,229,0.3);}
        .lgn-submit:active:not(:disabled){transform:scale(0.985);}
        .lgn-submit:disabled{opacity:0.6; cursor:not-allowed;}
        .lgn-tab{
          flex:1; height:34px; border-radius:7px; border:none; cursor:pointer;
          font-size:12px; font-weight:700; transition:all .15s; font-family:"Cairo",sans-serif;
        }
      `}</style>

      {/* ── BRAND PANEL (desktop) ─────────────────────────────────── */}
      <div className="hidden lg:flex" style={{ width:"52%", flexDirection:"column", background:"#0F172A", position:"relative", overflow:"hidden" }}>
        {/* Subtle dot grid */}
        <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(rgba(255,255,255,0.06) 1px,transparent 1px)", backgroundSize:"28px 28px" }} />
        {/* Indigo glow */}
        <div style={{ position:"absolute", top:"-30%", right:"-20%", width:"60%", height:"60%", borderRadius:"50%", background:"radial-gradient(circle,rgba(79,70,229,0.25) 0%,transparent 70%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"-20%", left:"-15%", width:"50%", height:"50%", borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,0.15) 0%,transparent 70%)", pointerEvents:"none" }} />

        <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", height:"100%", padding:"44px 52px" }}>
          {/* Logo */}
          <button onClick={handleLogoClick} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:12, width:"fit-content", padding:0 }}>
            <div style={{ width:42, height:42, borderRadius:12, background:"#4F46E5", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 0 1px rgba(99,102,241,0.5), 0 8px 24px rgba(79,70,229,0.4)" }}>
              <Store size={20} color="#fff"/>
            </div>
            <div style={{ textAlign:"right" }}>
              <p style={{ color:"#F9FAFB", fontWeight:800, fontSize:16, letterSpacing:"-0.025em", lineHeight:1.2 }}>Sowwanjo POS</p>
              <p style={{ color:"#475569", fontSize:11, marginTop:1 }}>نظام نقاط البيع السحابي</p>
            </div>
          </button>

          {/* Main copy */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center" }}>
            <div style={{ animation:"lgn-up .5s cubic-bezier(.22,1,.36,1) both .1s" }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:100, background:"rgba(99,102,241,0.15)", border:"1px solid rgba(99,102,241,0.3)", marginBottom:24 }}>
                <span style={{ width:5, height:5, borderRadius:"50%", background:"#818CF8", display:"block" }}/>
                <span style={{ fontSize:11, fontWeight:700, color:"#818CF8", letterSpacing:"0.02em" }}>الإصدار 2.0 · مصمّم للأردن</span>
              </div>
              <h1 style={{ color:"#F9FAFB", fontWeight:900, fontSize:"clamp(26px,2.6vw,38px)", lineHeight:1.18, letterSpacing:"-0.04em", marginBottom:16 }}>
                أذكى نظام POS<br/>
                <span style={{ color:"#818CF8" }}>للأعمال الأردنية</span>
              </h1>
              <p style={{ color:"#475569", fontSize:14, lineHeight:1.8, maxWidth:360 }}>
                إدارة المبيعات، المخزون، والعملاء في مكان واحد — سحابي، سريع، وآمن.
              </p>
            </div>

            {/* Feature list */}
            <div style={{ marginTop:40, display:"flex", flexDirection:"column", gap:14, animation:"lgn-up .5s cubic-bezier(.22,1,.36,1) both .2s" }}>
              {[
                { icon:"🏪", text:"إدارة متعددة الفروع والمتاجر" },
                { icon:"📊", text:"تقارير وإحصائيات فورية" },
                { icon:"👥", text:"صلاحيات ومستويات وصول متعددة" },
                { icon:"☁️", text:"سحابي، مشفّر، ومحمي 100%" },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:36, height:36, borderRadius:9, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{icon}</div>
                  <span style={{ fontSize:13, color:"#94A3B8", fontWeight:500 }}>{text}</span>
                </div>
              ))}
            </div>

            {/* Stats row */}
            <div style={{ display:"flex", gap:0, marginTop:44, borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:32, animation:"lgn-up .5s cubic-bezier(.22,1,.36,1) both .3s" }}>
              {[["١٢٠+","متجر نشط"],["٩٩.٩٪","وقت التشغيل"],["٥٠٠+","فاتورة/يوم"]].map(([n, l], i) => (
                <div key={l} style={{ flex:1, paddingRight: i < 2 ? 24 : 0, borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none", marginRight: i < 2 ? 24 : 0 }}>
                  <p style={{ color:"#F9FAFB", fontWeight:900, fontSize:22, letterSpacing:"-0.04em", lineHeight:1 }}>{n}</p>
                  <p style={{ color:"#475569", fontSize:11, marginTop:4 }}>{l}</p>
                </div>
              ))}
            </div>
          </div>

          <p style={{ color:"#1E293B", fontSize:11 }}>© 2026 Sowwanjo · pos.sowwanjo.online</p>
        </div>
      </div>

      {/* ── FORM PANEL ───────────────────────────────────────────── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", background:"#F8FAFC", overflowY:"auto", paddingTop: !online ? 40 : 0 }}>

        {/* Offline banner */}
        {!online && (
          <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"9px 16px", fontSize:12, fontWeight:700, color:"white", background:"#DC2626" }}>
            <WifiOff size={13}/> لا يوجد اتصال بالإنترنت — تحقق من الشبكة
          </div>
        )}

        {/* Mobile logo */}
        <div className="lg:hidden" style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingTop:"calc(env(safe-area-inset-top,0px) + 40px)", paddingBottom:8, background:"#0F172A" }}>
          <button onClick={handleLogoClick} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
            <div style={{ width:56, height:56, borderRadius:16, background:"#4F46E5", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 8px 24px rgba(79,70,229,0.4)" }}>
              <Store size={26} color="#fff"/>
            </div>
            <div style={{ textAlign:"center" }}>
              <p style={{ color:"#F9FAFB", fontWeight:800, fontSize:18, letterSpacing:"-0.025em" }}>Sowwanjo POS</p>
              <p style={{ color:"#475569", fontSize:11, marginTop:2 }}>نظام نقاط البيع السحابي</p>
            </div>
          </button>
        </div>

        {/* Form area */}
        <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"32px 24px", paddingBottom:"calc(env(safe-area-inset-bottom,0px) + 32px)" }}>
          <div style={{ width:"100%", maxWidth:400 }}>

            {/* Heading */}
            <div className="lf0" style={{ marginBottom:28 }}>
              <h2 style={{ fontWeight:900, color:"#111827", fontSize:22, letterSpacing:"-0.035em", marginBottom:6, lineHeight:1.2 }}>
                {mode === "admin" && adminUnlocked ? "بوابة الإدارة العليا" : "تسجيل الدخول"}
              </h2>
              <p style={{ color:"#6B7280", fontSize:13 }}>
                {mode === "admin" && adminUnlocked ? "الوصول مقيد — بيانات المدير فقط" : "أدخل بيانات حسابك للمتابعة"}
              </p>
            </div>

            {/* Admin unlock badge */}
            {adminUnlocked && (
              <div className="lf0" style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderRadius:10, marginBottom:20, background:"#FEF3C7", border:"1px solid #FDE68A" }}>
                <Shield size={14} color="#D97706"/>
                <p style={{ fontSize:12, fontWeight:700, color:"#92400E" }}>تم تفعيل وضع الإدارة العليا</p>
              </div>
            )}

            {/* Mode tabs */}
            {adminUnlocked && (
              <div className="lf1" style={{ display:"flex", padding:3, borderRadius:10, marginBottom:20, background:"#E5E7EB", gap:3 }}>
                {(["store","admin"] as const).map(m => (
                  <button key={m} className="lgn-tab" onClick={() => { setMode(m); setErr(""); }}
                    style={{ background:mode===m?"#fff":"transparent", color:mode===m?"#111827":"#6B7280", boxShadow:mode===m?"0 1px 4px rgba(0,0,0,0.12)":"none" }}>
                    {m==="store" ? "دخول المتجر" : "الإدارة العليا"}
                  </button>
                ))}
              </div>
            )}

            {/* Fields */}
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

              {/* Email/phone */}
              <div className="lf2">
                <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#374151", marginBottom:6 }}>
                  {mode==="admin" ? "اسم المستخدم" : "البريد الإلكتروني أو رقم الهاتف"}
                </label>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", color:"#9CA3AF", pointerEvents:"none", display:"flex" }}>
                    {mode==="admin" ? <Shield size={15}/> : <Mail size={15}/>}
                  </span>
                  <input dir="rtl" className={`lgn-field${err ? " err" : ""}`} type="text" value={email}
                    onChange={e=>{setEmail(e.target.value); setErr("");}}
                    placeholder={mode==="admin" ? "admin" : "email@store.jo أو 079..."}
                    autoComplete={mode==="admin"?"username":"email"} style={{ paddingRight:40 }}/>
                </div>
              </div>

              {/* Password */}
              <div className="lf3">
                <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#374151", marginBottom:6 }}>
                  كلمة المرور
                </label>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", color:"#9CA3AF", pointerEvents:"none", display:"flex" }}>
                    <Lock size={15}/>
                  </span>
                  <input dir="rtl" className={`lgn-field${err ? " err" : ""}`}
                    type={showPass?"text":"password"} value={pass}
                    onChange={e=>{setPass(e.target.value); setErr("");}}
                    placeholder="••••••••" autoComplete="current-password"
                    onKeyDown={e=>e.key==="Enter"&&doLogin()}
                    onKeyUp={e=>setCapsLock(e.getModifierState("CapsLock"))}
                    style={{ paddingRight:40, paddingLeft:40 }}/>
                  <button type="button" onClick={()=>setShowPass(!showPass)}
                    style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#9CA3AF", padding:0, display:"flex" }}>
                    {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
                {capsLock && (
                  <p style={{ display:"flex", alignItems:"center", gap:5, marginTop:5, fontSize:11, fontWeight:600, color:"#B45309" }}>
                    <AlertCircle size={11}/> مفتاح Caps Lock مفعّل
                  </p>
                )}
              </div>

              {/* Remember me */}
              <div className="lf4" style={{ display:"flex", alignItems:"center" }}>
                <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", userSelect:"none" }}>
                  <div onClick={()=>setRememberMe(!rememberMe)}
                    style={{ width:17, height:17, borderRadius:5, border:`1.5px solid ${rememberMe?"#4F46E5":"#D1D5DB"}`, background:rememberMe?"#4F46E5":"#fff", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s", cursor:"pointer", flexShrink:0 }}>
                    {rememberMe && <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{ fontSize:12, fontWeight:600, color:"#6B7280" }}>تذكرني</span>
                </label>
              </div>

              {/* Error */}
              {err && (
                <div className="lf0" style={{ display:"flex", alignItems:"flex-start", gap:9, padding:"11px 13px", borderRadius:10, background:"#FEF2F2", border:"1px solid #FECACA" }}>
                  <AlertCircle size={13} color="#EF4444" style={{ flexShrink:0, marginTop:1 }}/>
                  <div>
                    <p style={{ fontSize:12, fontWeight:600, color:"#B91C1C" }}>{err}</p>
                    {(err.includes("مهلة")||err.includes("اتصال")) && (
                      <button onClick={doLogin} style={{ marginTop:3, fontSize:11, fontWeight:700, color:"#EF4444", textDecoration:"underline", background:"none", border:"none", cursor:"pointer", padding:0, fontFamily:"inherit" }}>إعادة المحاولة</button>
                    )}
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="lf5">
                <button className="lgn-submit" onClick={doLogin} disabled={loading||!online}>
                  {loading ? (
                    <svg className="lgn-spin" width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/><path d="M10 2A8 8 0 0 1 18 10" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                  ) : !online ? (
                    <><WifiOff size={15}/> لا يوجد اتصال</>
                  ) : (
                    <>تسجيل الدخول <ArrowLeft size={15}/></>
                  )}
                </button>
              </div>
            </div>

            {/* Support note */}
            {mode==="store" && !adminUnlocked && (
              <div className="lf6" style={{ marginTop:20, padding:"11px 14px", borderRadius:10, background:"#F3F4F6", border:"1px solid #E5E7EB" }}>
                <p style={{ fontSize:11, fontWeight:700, color:"#6B7280", marginBottom:3, display:"flex", alignItems:"center", gap:5 }}>
                  <Info size={11}/> لأصحاب المتاجر
                </p>
                <p style={{ fontSize:11, color:"#9CA3AF", lineHeight:1.6 }}>
                  لا تمتلك حساباً؟ تواصل مع مزود الخدمة:<br/>
                  <span style={{ color:"#6B7280", fontWeight:600 }}>support@sowwanjo.online</span>
                </p>
              </div>
            )}

            <p style={{ textAlign:"center", fontSize:11, color:"#D1D5DB", marginTop:24, paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
              © 2026 Sowwanjo · دينار أردني · RTL
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPER ADMIN LAYOUT
// ─────────────────────────────────────────────────────────────────────────────
