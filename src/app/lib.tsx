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
  // ── STATE ─────────────────────────────────────────────────────────────────────
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

  // Load branding from backend and apply CSS variables + cached values
  useEffect(() => {
    const cached = (() => { try { return JSON.parse(localStorage.getItem("sowwanjo_branding") || "{}"); } catch { return {}; } })();
    const apply = (b: Record<string, string>) => {
      const r = document.documentElement;
      if (b.primaryColor)   { r.style.setProperty("--primary", b.primaryColor); r.style.setProperty("--ring", b.primaryColor); r.style.setProperty("--chart-1", b.primaryColor); }
      if (b.accentColor)    { r.style.setProperty("--accent", b.accentColor); }
      if (b.platformName)   document.title = b.platformName;
    };
    if (cached.primaryColor) apply(cached);
    fetch(`${API}/branding`)
      .then(r => r.json())
      .then((b: Record<string, string>) => {
        apply(b);
        try { localStorage.setItem("sowwanjo_branding", JSON.stringify(b)); } catch {}
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const [entering, setEntering] = useState(false);

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
        if (rememberMe) { try { localStorage.setItem("sowwanjo_remember_email", email); } catch {} }
        else { try { localStorage.removeItem("sowwanjo_remember_email"); } catch {} }
        setEntering(true);
        setTimeout(() => onLogin("superadmin"), 660);
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
          if (res.user?.role) localStorage.setItem(`sowwanjo_user_role_${normalizedStore.id}`, res.user.role);
          if (res.user?.name) localStorage.setItem(`sowwanjo_user_name_${normalizedStore.id}`, res.user.name);
        } catch {}
        if (rememberMe) { try { localStorage.setItem("sowwanjo_remember_email", email); } catch {} }
        else { try { localStorage.removeItem("sowwanjo_remember_email"); } catch {} }
        setEntering(true);
        setTimeout(() => onLogin("store", normalizedStore.id), 660);
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

  // Typewriter effect
  const TW_TEXTS = ["أذكى نظام POS", "إدارة متكاملة", "نمو مستدام"];
  const [twIdx, setTwIdx] = useState(0);
  const [twText, setTwText] = useState("");
  const [twTyping, setTwTyping] = useState(true);
  useEffect(() => {
    const current = TW_TEXTS[twIdx];
    let t: ReturnType<typeof setTimeout>;
    if (twTyping) {
      if (twText.length < current.length) {
        t = setTimeout(() => setTwText(current.slice(0, twText.length + 1)), 90);
      } else {
        t = setTimeout(() => setTwTyping(false), 2400);
      }
    } else {
      if (twText.length > 0) {
        t = setTimeout(() => setTwText(twText.slice(0, -1)), 45);
      } else {
        setTwIdx(i => (i + 1) % TW_TEXTS.length);
        setTwTyping(true);
      }
    }
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [twText, twTyping, twIdx]);

  /* Read live CSS variable so SA branding changes reflect immediately */
  const cssVar = (v: string, fallback: string) => {
    try {
      const val = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
      return val || fallback;
    } catch { return fallback; }
  };
  const brandPrimary = cssVar("--primary", "#4F46E5");
  const brandAccent  = cssVar("--accent",  "#10B981");

  const BP = brandPrimary;
  const BA = brandAccent;

  const BADGES = ["سحابي 100%","متعدد المتاجر","متعدد الفروع","يعمل أوفلاين","مخزون فوري","تقارير متقدمة","باركود وQR","موبايل وتابلت","منصة آمنة","الأردن أولاً"];

  const LX_CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');
    @keyframes lx-up    { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
    @keyframes lx-spin  { to{transform:rotate(360deg)} }
    @keyframes lx-cur   { 0%,49%{opacity:1} 50%,100%{opacity:0} }
    @keyframes lx-blob1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(28px,-22px) scale(1.07)} 66%{transform:translate(-18px,26px) scale(0.94)} }
    @keyframes lx-blob2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-24px,18px) scale(1.06)} 66%{transform:translate(22px,-28px) scale(0.95)} }
    @keyframes lx-blob3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(14px,22px) scale(1.10)} }
    @keyframes lx-float1 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-11px)} }
    @keyframes lx-float2 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
    @keyframes lx-float3 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-14px)} }
    @keyframes lx-shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
    @keyframes lx-glow-ping { 0%{transform:scale(1);opacity:0.55} 100%{transform:scale(2.0);opacity:0} }
    @keyframes lx-enter { from{opacity:0} to{opacity:1} }
    .lx0{animation:lx-up .55s cubic-bezier(.22,1,.36,1) both}
    .lx1{animation:lx-up .55s cubic-bezier(.22,1,.36,1) both .09s}
    .lx2{animation:lx-up .55s cubic-bezier(.22,1,.36,1) both .17s}
    .lx3{animation:lx-up .55s cubic-bezier(.22,1,.36,1) both .25s}
    .lx4{animation:lx-up .55s cubic-bezier(.22,1,.36,1) both .33s}
    .lx5{animation:lx-up .55s cubic-bezier(.22,1,.36,1) both .41s}
    .lx6{animation:lx-up .55s cubic-bezier(.22,1,.36,1) both .49s}
    .lx-dev1{animation:lx-float1 5.5s ease-in-out infinite}
    .lx-dev2{animation:lx-float2 6.5s ease-in-out infinite .8s}
    .lx-dev3{animation:lx-float3 7s ease-in-out infinite 1.5s}
    .lx-dev4{animation:lx-float1 6.2s ease-in-out infinite 0.4s}
    .lx-dev5{animation:lx-float2 5.2s ease-in-out infinite 2s}
    .lx-dev6{animation:lx-float3 7.8s ease-in-out infinite 1s}
    .lx-field{
      width:100%; height:52px; border-radius:14px;
      border:1.5px solid rgba(255,255,255,0.09);
      background:rgba(255,255,255,0.05);
      color:#F1F5F9; font-size:14px; font-weight:500;
      padding:0 48px 0 16px; outline:none;
      transition:border-color .22s,box-shadow .22s,background .22s;
      font-family:"Cairo",sans-serif; -webkit-appearance:none;
      backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
    }
    .lx-field:focus{ border-color:${BP}70; box-shadow:0 0 0 4px ${BP}14,0 2px 12px rgba(0,0,0,0.3); background:rgba(255,255,255,0.08); }
    .lx-field::placeholder{color:rgba(255,255,255,0.20)}
    .lx-field.has-err{border-color:rgba(248,113,113,0.5);box-shadow:0 0 0 3px rgba(239,68,68,0.08);}
    .lx-btn{
      width:100%; height:54px; border-radius:14px; border:none; cursor:pointer;
      font-size:15px; font-weight:800; font-family:"Cairo",sans-serif;
      display:flex; align-items:center; justify-content:center; gap:8px;
      position:relative; overflow:hidden;
      background:linear-gradient(135deg,${BP} 0%,${BP}CC 100%);
      color:#fff; letter-spacing:-0.01em;
      box-shadow:0 6px 30px ${BP}48,0 2px 8px rgba(0,0,0,0.3);
      transition:transform .12s,box-shadow .22s,opacity .18s;
    }
    .lx-btn::after{
      content:""; position:absolute; inset:0;
      background:linear-gradient(135deg,transparent 0%,rgba(255,255,255,0.11) 50%,transparent 100%);
      background-size:200% auto; animation:lx-shimmer 3s linear infinite;
    }
    .lx-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 10px 40px ${BP}60,0 4px 12px rgba(0,0,0,0.4);}
    .lx-btn:active:not(:disabled){transform:scale(0.985);}
    .lx-btn:disabled{opacity:0.35;cursor:not-allowed;box-shadow:none;}
    .lx-tab{flex:1;height:36px;border-radius:10px;border:none;cursor:pointer;font-size:12.5px;font-weight:700;transition:all .18s;font-family:"Cairo",sans-serif;}
    .lx-cur{display:inline-block;width:2px;height:0.88em;background:${BP};margin-right:2px;vertical-align:middle;border-radius:2px;animation:lx-cur .7s step-end infinite;}
    @media(prefers-reduced-motion:reduce){.lx0,.lx1,.lx2,.lx3,.lx4,.lx5,.lx6,.lx-dev1,.lx-dev2,.lx-dev3,.lx-dev4,.lx-dev5,.lx-dev6{animation:none!important;opacity:1!important;transform:none!important}}
  `;

  return (
    <div dir="rtl" style={{ fontFamily:"'Cairo',sans-serif", minHeight:"100dvh", background:"#06080F", position:"relative", overflow:"hidden" }}>
      <style>{LX_CSS}</style>

      {/* ── ENTERING TRANSITION OVERLAY ── */}
      {entering && (
        <div style={{ position:"fixed", inset:0, zIndex:1000, background:"#06080F", display:"flex", alignItems:"center", justifyContent:"center", animation:"lx-enter .45s ease both" }}>
          <div style={{ position:"relative", width:52, height:52 }}>
            <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:`3px solid ${BP}25`, borderTopColor:BP, animation:"lx-spin .75s linear infinite" }}/>
            <div style={{ position:"absolute", inset:8, borderRadius:"50%", border:`2px solid ${BA}20`, borderRightColor:BA, animation:"lx-spin 1.3s linear infinite reverse" }}/>
            <div style={{ position:"absolute", inset:"50%", width:8, height:8, marginLeft:-4, marginTop:-4, borderRadius:"50%", background:BP, boxShadow:`0 0 12px ${BP}` }}/>
          </div>
        </div>
      )}

      {/* ── OFFLINE BANNER ── */}
      {!online && (
        <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 16px", fontSize:12, fontWeight:700, color:"#fff", background:"#DC2626", borderBottom:"1px solid #B91C1C" }}>
          <WifiOff size={13}/> لا يوجد اتصال بالإنترنت — تحقق من الشبكة
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          DESKTOP LAYOUT  65% HERO  |  35% CARD
      ═══════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex" style={{ height:"100dvh" }}>

        {/* ── HERO 65% ── */}
        <div style={{
          width:"65%", flexShrink:0, position:"relative", overflow:"hidden",
          display:"flex", flexDirection:"column",
          borderLeft:"1px solid rgba(255,255,255,0.05)",
          transition:"transform .65s cubic-bezier(.4,0,.2,1)",
          transform: entering ? "scale(1.04)" : "scale(1)",
        }}>
          {/* Dot grid */}
          <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(rgba(255,255,255,0.027) 1px,transparent 1px)", backgroundSize:"28px 28px", pointerEvents:"none" }}/>
          {/* BG orbs */}
          <div style={{ position:"absolute", top:"-10%", right:"12%", width:540, height:540, borderRadius:"50%", background:`${BP}1E`, filter:"blur(115px)", animation:"lx-blob1 13s ease-in-out infinite", pointerEvents:"none" }}/>
          <div style={{ position:"absolute", bottom:"-14%", left:"3%", width:480, height:480, borderRadius:"50%", background:`${BA}17`, filter:"blur(105px)", animation:"lx-blob2 15s ease-in-out infinite", pointerEvents:"none" }}/>
          <div style={{ position:"absolute", top:"44%", left:"36%", width:320, height:320, borderRadius:"50%", background:`${BP}10`, filter:"blur(72px)", animation:"lx-blob3 9s ease-in-out infinite", pointerEvents:"none" }}/>

          {/* ── Connection lines SVG overlay ── */}
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }} viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="lxlg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={BP} stopOpacity="0.7"/><stop offset="100%" stopColor={BA} stopOpacity="0.15"/></linearGradient>
            </defs>
            {([
              "M400,138 C 328,192 255,228 178,268",
              "M400,138 C 472,192 545,228 622,265",
              "M400,138 C 362,270 298,352 218,438",
              "M400,138 C 438,270 502,352 582,436",
              "M178,268 C 183,338 195,388 218,438",
              "M622,265 C 617,338 600,390 582,436",
              "M218,438 C 288,492 358,505 400,507",
              "M582,436 C 512,492 442,505 400,507",
            ] as string[]).map((d,i) => (
              <g key={i}>
                <path d={d} stroke="url(#lxlg1)" strokeWidth="1.2" fill="none" strokeOpacity="0.35" strokeDasharray="5 12"/>
                <circle r="3" fill={i%2===0?BP:BA} opacity="0.85">
                  <animateMotion dur={`${3.4+i*0.55}s`} repeatCount="indefinite" begin={`${i*0.75}s`} path={d}/>
                </circle>
              </g>
            ))}
          </svg>

          {/* ── Logo (5-click admin unlock) ── */}
          <div style={{ position:"relative", zIndex:3, padding:"36px 52px 0", flexShrink:0 }}>
            <button onClick={handleLogoClick} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:11, padding:0 }}>
              <div style={{ width:42, height:42, borderRadius:12, background:`${BP}20`, border:`1.5px solid ${BP}48`, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(8px)", flexShrink:0 }}>
                <Store size={20} color={BP}/>
              </div>
              <div style={{ textAlign:"right" }}>
                <p style={{ color:"#F1F5F9", fontWeight:800, fontSize:16, letterSpacing:"-0.025em", lineHeight:1.2 }}>Sowwanjo POS</p>
                <p style={{ color:"rgba(255,255,255,0.30)", fontSize:10.5, marginTop:1 }}>نظام نقاط البيع السحابي</p>
              </div>
            </button>
          </div>

          {/* ── Floating device cards ── */}
          <div style={{ position:"absolute", inset:0, zIndex:2, pointerEvents:"none" }}>

            {/* Cloud hub — top center */}
            <div className="lx-dev1" style={{ position:"absolute", top:"9%", left:"50%", transform:"translateX(-50%)", background:"rgba(8,12,32,0.80)", backdropFilter:"blur(16px)", border:`1.5px solid ${BP}42`, borderRadius:20, padding:"11px 18px", display:"flex", alignItems:"center", gap:10, boxShadow:`0 0 38px ${BP}22,0 8px 28px rgba(0,0,0,0.45)`, whiteSpace:"nowrap" }}>
              <div style={{ width:30, height:30, borderRadius:9, background:`${BP}22`, border:`1px solid ${BP}48`, display:"flex", alignItems:"center", justifyContent:"center" }}><Globe size={15} color={BP}/></div>
              <div><p style={{ color:"#F1F5F9", fontWeight:700, fontSize:12, lineHeight:1.2 }}>مزامنة سحابية فورية</p><p style={{ color:`${BP}CC`, fontWeight:600, fontSize:10, marginTop:1 }}>آمن · موثوق · محمي</p></div>
              <div style={{ position:"absolute", inset:-9, borderRadius:29, border:`1px solid ${BP}22`, animation:"lx-glow-ping 2.8s ease-out infinite", pointerEvents:"none" }}/>
            </div>

            {/* Dashboard — top left */}
            <div className="lx-dev2" style={{ position:"absolute", top:"20%", left:"5%", background:"rgba(7,11,28,0.83)", backdropFilter:"blur(16px)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:16, padding:"13px 15px", boxShadow:"0 12px 36px rgba(0,0,0,0.5)", minWidth:152 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <div style={{ width:25, height:25, borderRadius:7, background:`${BP}1e`, border:`1px solid ${BP}3c`, display:"flex", alignItems:"center", justifyContent:"center" }}><Monitor size={13} color={BP}/></div>
                <span style={{ color:"rgba(255,255,255,0.50)", fontSize:11, fontWeight:700 }}>لوحة التحكم</span>
              </div>
              <div style={{ display:"flex", gap:4, alignItems:"flex-end", height:34 }}>
                {[52,78,44,94,62,72,88].map((h,i) => (
                  <div key={i} style={{ flex:1, height:`${h}%`, borderRadius:3, background:i===3?BP:`${BP}50`, opacity:i===3?1:0.65 }}/>
                ))}
              </div>
              <div style={{ marginTop:6, display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:`${BP}CC`, fontSize:10, fontWeight:700 }}>↑ 23.4%</span>
                <span style={{ color:"rgba(255,255,255,0.26)", fontSize:10 }}>هذا الأسبوع</span>
              </div>
            </div>

            {/* Analytics — top right */}
            <div className="lx-dev3" style={{ position:"absolute", top:"19%", right:"4%", background:"rgba(7,11,28,0.83)", backdropFilter:"blur(16px)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:16, padding:"13px 15px", boxShadow:"0 12px 36px rgba(0,0,0,0.5)", minWidth:148 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <div style={{ width:25, height:25, borderRadius:7, background:`${BA}1e`, border:`1px solid ${BA}3c`, display:"flex", alignItems:"center", justifyContent:"center" }}><BarChart2 size={13} color={BA}/></div>
                <span style={{ color:"rgba(255,255,255,0.50)", fontSize:11, fontWeight:700 }}>التقارير</span>
              </div>
              <svg viewBox="0 0 118 34" style={{ width:"100%", height:34 }}>
                <defs><linearGradient id="lxag" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor={BA} stopOpacity="0.35"/><stop offset="100%" stopColor={BA} stopOpacity="0"/></linearGradient></defs>
                <path d="M0,28 L14,22 L28,26 L42,14 L56,18 L70,8 L84,12 L98,4 L118,7" stroke={BA} strokeWidth="2" fill="none" strokeLinecap="round"/>
                <path d="M0,28 L14,22 L28,26 L42,14 L56,18 L70,8 L84,12 L98,4 L118,7 L118,34 L0,34Z" fill="url(#lxag)"/>
              </svg>
              <div style={{ marginTop:4, display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:`${BA}CC`, fontSize:10, fontWeight:800 }}>2,840 JOD</span>
                <span style={{ color:"rgba(255,255,255,0.26)", fontSize:10 }}>اليوم</span>
              </div>
            </div>

            {/* POS Terminal — middle left */}
            <div className="lx-dev4" style={{ position:"absolute", top:"48%", left:"4%", background:"rgba(7,11,28,0.83)", backdropFilter:"blur(16px)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:"13px 15px", boxShadow:"0 12px 36px rgba(0,0,0,0.5)", minWidth:148 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:9 }}>
                <div style={{ width:25, height:25, borderRadius:7, background:"rgba(16,185,129,0.18)", border:"1px solid rgba(16,185,129,0.38)", display:"flex", alignItems:"center", justifyContent:"center" }}><ShoppingCart size={13} color="#10B981"/></div>
                <span style={{ color:"rgba(255,255,255,0.50)", fontSize:11, fontWeight:700 }}>نقطة البيع</span>
              </div>
              <div style={{ padding:"7px 10px", borderRadius:10, background:"rgba(16,185,129,0.09)", border:"1px solid rgba(16,185,129,0.18)" }}>
                <p style={{ color:"rgba(255,255,255,0.38)", fontSize:9, fontWeight:600, marginBottom:2 }}>الإجمالي</p>
                <p style={{ color:"#10B981", fontWeight:900, fontSize:19, letterSpacing:"-0.04em", lineHeight:1 }}>12.750 JOD</p>
              </div>
              <div style={{ marginTop:8, display:"flex", gap:4 }}>
                {["كاش","كليك","بطاقة"].map(m => (
                  <div key={m} style={{ flex:1, padding:"3px 0", borderRadius:6, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)", textAlign:"center" }}>
                    <span style={{ fontSize:9, color:"rgba(255,255,255,0.32)", fontWeight:600 }}>{m}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Inventory — middle right */}
            <div className="lx-dev5" style={{ position:"absolute", top:"46%", right:"3%", background:"rgba(7,11,28,0.83)", backdropFilter:"blur(16px)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:"13px 15px", boxShadow:"0 12px 36px rgba(0,0,0,0.5)", minWidth:144 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:9 }}>
                <div style={{ width:25, height:25, borderRadius:7, background:"rgba(168,85,247,0.18)", border:"1px solid rgba(168,85,247,0.38)", display:"flex", alignItems:"center", justifyContent:"center" }}><Boxes size={13} color="#A855F7"/></div>
                <span style={{ color:"rgba(255,255,255,0.50)", fontSize:11, fontWeight:700 }}>المخزون</span>
              </div>
              {[["منتجات","3,724","#A855F7"],["تنبيهات منخفضة","12","#F59E0B"]].map(([l,v,c]) => (
                <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontSize:10, color:"rgba(255,255,255,0.35)" }}>{l}</span>
                  <span style={{ fontSize:12, fontWeight:800, color:c as string }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Scanner badge — lower center */}
            <div className="lx-dev6" style={{ position:"absolute", top:"70%", left:"50%", transform:"translateX(-50%)", background:"rgba(7,11,28,0.83)", backdropFilter:"blur(16px)", border:`1px solid ${BP}2e`, borderRadius:14, padding:"9px 15px", display:"flex", alignItems:"center", gap:9, boxShadow:`0 8px 24px rgba(0,0,0,0.45)`, whiteSpace:"nowrap" }}>
              <div style={{ width:27, height:27, borderRadius:8, background:`${BP}1e`, border:`1px solid ${BP}3c`, display:"flex", alignItems:"center", justifyContent:"center" }}><Scan size={13} color={BP}/></div>
              <div><p style={{ color:"#F1F5F9", fontWeight:700, fontSize:11 }}>باركود · QR · سكانر</p><p style={{ color:"rgba(255,255,255,0.32)", fontSize:9.5 }}>دعم احترافي كامل</p></div>
              <div style={{ width:7, height:7, borderRadius:"50%", background:"#10B981", boxShadow:"0 0 7px #10B981", flexShrink:0 }}/>
            </div>
          </div>

          {/* ── Hero text content ── */}
          <div style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:3, padding:"0 52px 42px", background:"linear-gradient(to top,rgba(6,8,15,0.96) 0%,rgba(6,8,15,0.5) 55%,transparent 100%)", paddingTop:90 }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"4px 12px", borderRadius:100, background:`${BP}18`, border:`1px solid ${BP}35`, marginBottom:14, animation:"lx-up .6s cubic-bezier(.22,1,.36,1) both .10s" }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background:"#10B981", display:"block", boxShadow:"0 0 6px #10B981" }}/>
              <span style={{ fontSize:10.5, fontWeight:700, color:"rgba(255,255,255,0.55)", letterSpacing:"0.06em" }}>منصة الأعمال السحابية · الأردن</span>
            </div>
            <h1 style={{ color:"#F1F5F9", fontWeight:900, fontSize:"clamp(26px,2.7vw,42px)", lineHeight:1.17, letterSpacing:"-0.04em", minHeight:"2.4em", marginBottom:12, animation:"lx-up .6s cubic-bezier(.22,1,.36,1) both .18s" }}>
              أدِر أعمالك بذكاء<br/>
              <span style={{ color:BP }}>{twText}</span><span className="lx-cur"/>
            </h1>
            <p style={{ color:"rgba(255,255,255,0.36)", fontSize:13, lineHeight:1.85, maxWidth:380, marginBottom:20, animation:"lx-up .6s cubic-bezier(.22,1,.36,1) both .26s" }}>
              منصة سحابية متكاملة لإدارة المبيعات والمخزون والعملاء — تعمل لجميع أنواع المتاجر
            </p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:26, animation:"lx-up .6s cubic-bezier(.22,1,.36,1) both .34s" }}>
              {BADGES.map((b,i) => (
                <div key={b} style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:100, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
                  <span style={{ width:4, height:4, borderRadius:"50%", background:i%2===0?BP:BA, display:"block" }}/>
                  <span style={{ fontSize:10.5, fontWeight:600, color:"rgba(255,255,255,0.46)" }}>{b}</span>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", paddingTop:18, borderTop:"1px solid rgba(255,255,255,0.06)", animation:"lx-up .6s cubic-bezier(.22,1,.36,1) both .48s" }}>
              {([["١٢٠+","متجر نشط"],["٩٩.٩٪","وقت التشغيل"],["٥٠٠+","فاتورة/يوم"]] as [string,string][]).map(([n,l],i) => (
                <div key={l} style={{ flex:1, paddingRight:i<2?20:0, borderRight:i<2?"1px solid rgba(255,255,255,0.06)":"none", marginRight:i<2?20:0 }}>
                  <p style={{ color:BP, fontWeight:900, fontSize:21, letterSpacing:"-0.04em", lineHeight:1 }}>{n}</p>
                  <p style={{ color:"rgba(255,255,255,0.28)", fontSize:10.5, marginTop:3 }}>{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── LOGIN CARD 35% ── */}
        <div style={{
          flex:1, display:"flex", alignItems:"center", justifyContent:"center",
          padding:"24px 28px", position:"relative", zIndex:10,
          background:"rgba(3,5,12,0.55)",
          transition:"opacity .40s ease",
          opacity: entering ? 0 : 1,
        }}>
          <div style={{ position:"absolute", top:"18%", right:"-8%", width:300, height:300, borderRadius:"50%", background:`${BP}12`, filter:"blur(85px)", pointerEvents:"none" }}/>
          <div style={{
            width:"100%", maxWidth:400,
            background:"rgba(8,12,30,0.90)", backdropFilter:"blur(30px) saturate(140%)",
            border:"1px solid rgba(255,255,255,0.08)", borderRadius:24,
            padding:"36px 30px 28px",
            boxShadow:"0 40px 100px rgba(0,0,0,0.58),0 0 0 1px rgba(255,255,255,0.03) inset",
            position:"relative",
          }}>
            <div style={{ position:"absolute", top:0, left:"22%", right:"22%", height:"1px", background:`linear-gradient(90deg,transparent,${BP}58,transparent)`, borderRadius:1 }}/>

            {/* Logo */}
            <div className="lx0" style={{ display:"flex", alignItems:"center", gap:12, marginBottom:26 }}>
              <button onClick={handleLogoClick} style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", flexShrink:0 }}>
                <div style={{ width:44, height:44, borderRadius:13, background:`${BP}20`, border:`2px solid ${BP}48`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 18px ${BP}28`, position:"relative" }}>
                  <Store size={22} color={BP}/>
                </div>
              </button>
              <div>
                <p style={{ color:"#F1F5F9", fontWeight:800, fontSize:16, letterSpacing:"-0.025em", lineHeight:1.2 }}>Sowwanjo POS</p>
                <p style={{ color:"rgba(255,255,255,0.28)", fontSize:10.5 }}>الإصدار 1.0 · نقاط البيع السحابي</p>
              </div>
            </div>

            {/* Welcome */}
            <div className="lx1" style={{ marginBottom:22 }}>
              <h2 style={{ color:"#F1F5F9", fontWeight:900, fontSize:20, letterSpacing:"-0.035em", marginBottom:4 }}>
                {mode==="admin"&&adminUnlocked ? "بوابة الإدارة العليا" : "مرحباً بعودتك"}
              </h2>
              <p style={{ color:"rgba(255,255,255,0.33)", fontSize:13 }}>
                {mode==="admin"&&adminUnlocked ? "الوصول مقيد — بيانات المدير العام فقط" : "أدخل بياناتك للدخول إلى منصتك"}
              </p>
            </div>

            {adminUnlocked && (
              <div className="lx1" style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 13px", borderRadius:12, marginBottom:14, background:"rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.22)" }}>
                <Shield size={12} color="#FCD34D"/>
                <p style={{ fontSize:11.5, fontWeight:700, color:"#FCD34D" }}>تم تفعيل وضع الإدارة العليا</p>
              </div>
            )}

            {adminUnlocked && (
              <div className="lx2" style={{ display:"flex", padding:3, borderRadius:12, marginBottom:16, background:"rgba(255,255,255,0.04)", gap:3, border:"1px solid rgba(255,255,255,0.07)" }}>
                {(["store","admin"] as const).map(m => (
                  <button key={m} className="lx-tab" onClick={()=>{setMode(m);setErr("");}}
                    style={{ background:mode===m?`${BP}1e`:"transparent", color:mode===m?BP:"rgba(255,255,255,0.32)", border:mode===m?`1px solid ${BP}32`:"1px solid transparent" }}>
                    {m==="store" ? "دخول المتجر" : "الإدارة العليا"}
                  </button>
                ))}
              </div>
            )}

            <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
              <div className="lx2">
                <label style={{ display:"block", fontSize:11.5, fontWeight:700, color:"rgba(255,255,255,0.40)", marginBottom:7, letterSpacing:"0.02em" }}>
                  {mode==="admin" ? "اسم المستخدم" : "البريد الإلكتروني أو رقم الهاتف"}
                </label>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", right:15, top:"50%", transform:"translateY(-50%)", color:`${BP}75`, pointerEvents:"none", display:"flex" }}>
                    {mode==="admin" ? <Shield size={15}/> : <Mail size={15}/>}
                  </span>
                  <input dir="rtl" className={`lx-field${err?" has-err":""}`} type="text" value={email}
                    onChange={e=>{setEmail(e.target.value);setErr("");}}
                    placeholder={mode==="admin" ? "superadmin" : "email@store.jo"}
                    autoComplete={mode==="admin"?"username":"email"} style={{ paddingRight:46 }}/>
                </div>
              </div>

              <div className="lx3">
                <label style={{ display:"block", fontSize:11.5, fontWeight:700, color:"rgba(255,255,255,0.40)", marginBottom:7, letterSpacing:"0.02em" }}>كلمة المرور</label>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", right:15, top:"50%", transform:"translateY(-50%)", color:`${BP}75`, pointerEvents:"none", display:"flex" }}><Lock size={15}/></span>
                  <input dir="rtl" className={`lx-field${err?" has-err":""}`}
                    type={showPass?"text":"password"} value={pass}
                    onChange={e=>{setPass(e.target.value);setErr("");}}
                    placeholder="••••••••" autoComplete="current-password"
                    onKeyDown={e=>e.key==="Enter"&&doLogin()}
                    onKeyUp={e=>setCapsLock(e.getModifierState("CapsLock"))}
                    style={{ paddingRight:46, paddingLeft:46 }}/>
                  <button type="button" onClick={()=>setShowPass(!showPass)}
                    style={{ position:"absolute", left:15, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.26)", padding:0, display:"flex", transition:"color .18s" }}>
                    {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
                {capsLock && <p style={{ display:"flex", alignItems:"center", gap:5, marginTop:6, fontSize:11, fontWeight:600, color:"#FCD34D" }}><AlertCircle size={11}/> مفتاح Caps Lock مفعّل</p>}
              </div>

              <div className="lx4">
                <label style={{ display:"flex", alignItems:"center", gap:9, cursor:"pointer", userSelect:"none", width:"fit-content" }}>
                  <div onClick={()=>setRememberMe(!rememberMe)}
                    style={{ width:18, height:18, borderRadius:5, border:`1.5px solid ${rememberMe?BP:"rgba(255,255,255,0.17)"}`, background:rememberMe?BP:"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .16s", cursor:"pointer", flexShrink:0 }}>
                    {rememberMe && <svg width="10" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{ fontSize:12.5, fontWeight:600, color:"rgba(255,255,255,0.36)" }}>تذكرني</span>
                </label>
              </div>

              {err && (
                <div className="lx0" style={{ display:"flex", alignItems:"flex-start", gap:9, padding:"11px 13px", borderRadius:12, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.22)" }}>
                  <AlertCircle size={13} color="#FCA5A5" style={{ flexShrink:0, marginTop:1 }}/>
                  <div>
                    <p style={{ fontSize:12, fontWeight:600, color:"#FCA5A5" }}>{err}</p>
                    {(err.includes("مهلة")||err.includes("اتصال")) && (
                      <button onClick={doLogin} style={{ marginTop:3, fontSize:11, fontWeight:700, color:"#FCA5A5", textDecoration:"underline", background:"none", border:"none", cursor:"pointer", padding:0, fontFamily:"inherit" }}>إعادة المحاولة</button>
                    )}
                  </div>
                </div>
              )}

              <div className="lx5">
                <button className="lx-btn" onClick={doLogin} disabled={loading||!online}>
                  {loading ? (
                    <svg style={{ animation:"lx-spin .8s linear infinite" }} width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,0.25)" strokeWidth="2"/><path d="M10 2A8 8 0 0 1 18 10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
                  ) : !online ? <><WifiOff size={15}/> لا يوجد اتصال</> : <>دخول <ArrowLeft size={15}/></>}
                </button>
              </div>
            </div>

            {mode==="store" && !adminUnlocked && (
              <div className="lx6" style={{ marginTop:16, padding:"10px 13px", borderRadius:12, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.26)", marginBottom:2, display:"flex", alignItems:"center", gap:5 }}>
                  <Info size={10}/> تحتاج حساباً؟
                </p>
                <p style={{ fontSize:11, color:"rgba(255,255,255,0.20)", lineHeight:1.7 }}>
                  تواصل مع مزود الخدمة:<br/>
                  <span style={{ color:`${BP}CC`, fontWeight:700 }}>support@sowwanjo.online</span>
                </p>
              </div>
            )}

            <p style={{ textAlign:"center", fontSize:10, color:"rgba(255,255,255,0.13)", marginTop:18 }}>
              © 2026 Sowwanjo POS · v1.0 · مشفّر وآمن
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE LAYOUT — full screen card with headline above
      ═══════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden" style={{
        width:"100%", minHeight:"100dvh", display:"flex", flexDirection:"column",
        padding:"calc(env(safe-area-inset-top,0px) + 20px) 18px calc(env(safe-area-inset-bottom,0px) + 20px)",
        position:"relative", zIndex:1,
        opacity: entering ? 0 : 1, transition:"opacity .4s ease",
      }}>
        <div style={{ position:"fixed", top:"-18%", left:"-15%", width:"80vw", height:"80vw", borderRadius:"50%", background:`${BP}16`, filter:"blur(80px)", pointerEvents:"none", zIndex:0 }}/>
        <div style={{ position:"fixed", bottom:"-22%", right:"-10%", width:"70vw", height:"70vw", borderRadius:"50%", background:`${BA}12`, filter:"blur(80px)", pointerEvents:"none", zIndex:0 }}/>

        {/* Mobile logo bar */}
        <div style={{ position:"relative", zIndex:1, display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <button onClick={handleLogoClick} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:10, padding:0 }}>
            <div style={{ width:40, height:40, borderRadius:11, background:`${BP}1e`, border:`1.5px solid ${BP}45`, display:"flex", alignItems:"center", justifyContent:"center" }}><Store size={19} color={BP}/></div>
            <div>
              <p style={{ color:"#F1F5F9", fontWeight:800, fontSize:15, letterSpacing:"-0.025em" }}>Sowwanjo POS</p>
              <p style={{ color:"rgba(255,255,255,0.28)", fontSize:10 }}>نظام نقاط البيع السحابي</p>
            </div>
          </button>
          {online && <div style={{ width:8, height:8, borderRadius:"50%", background:"#10B981", boxShadow:"0 0 8px #10B981" }}/>}
        </div>

        {/* Mobile headline */}
        <div style={{ position:"relative", zIndex:1, marginBottom:16 }}>
          <h2 style={{ color:"#F1F5F9", fontWeight:900, fontSize:23, letterSpacing:"-0.04em", lineHeight:1.22, minHeight:"1.4em", marginBottom:6 }}>
            أدِر أعمالك · <span style={{ color:BP }}>{twText}</span><span className="lx-cur"/>
          </h2>
          <p style={{ color:"rgba(255,255,255,0.36)", fontSize:12.5, lineHeight:1.7 }}>إدارة المبيعات والمخزون والعملاء في مكان واحد.</p>
        </div>

        {/* Mobile badges */}
        <div style={{ position:"relative", zIndex:1, display:"flex", flexWrap:"wrap", gap:6, marginBottom:18 }}>
          {BADGES.slice(0,6).map((b,i) => (
            <div key={b} style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 9px", borderRadius:100, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ width:3.5, height:3.5, borderRadius:"50%", background:i%2===0?BP:BA, display:"block" }}/>
              <span style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,0.42)" }}>{b}</span>
            </div>
          ))}
        </div>

        {/* Mobile card */}
        <div style={{ position:"relative", zIndex:1, background:"rgba(8,12,30,0.90)", backdropFilter:"blur(22px)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:22, padding:"22px 18px", boxShadow:"0 24px 60px rgba(0,0,0,0.52)" }}>
          <div style={{ position:"absolute", top:0, left:"25%", right:"25%", height:"1px", background:`linear-gradient(90deg,transparent,${BP}52,transparent)` }}/>
          <h3 style={{ color:"#F1F5F9", fontWeight:800, fontSize:17, letterSpacing:"-0.03em", marginBottom:4 }}>
            {mode==="admin"&&adminUnlocked ? "بوابة الإدارة العليا" : "مرحباً بعودتك"}
          </h3>
          <p style={{ color:"rgba(255,255,255,0.30)", fontSize:12, marginBottom:18 }}>أدخل بياناتك للمتابعة</p>

          {adminUnlocked && (
            <div style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 11px", borderRadius:10, marginBottom:12, background:"rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.22)" }}>
              <Shield size={12} color="#FCD34D"/><p style={{ fontSize:11, fontWeight:700, color:"#FCD34D" }}>وضع الإدارة العليا</p>
            </div>
          )}
          {adminUnlocked && (
            <div style={{ display:"flex", padding:3, borderRadius:11, marginBottom:14, background:"rgba(255,255,255,0.04)", gap:3, border:"1px solid rgba(255,255,255,0.07)" }}>
              {(["store","admin"] as const).map(m => (
                <button key={m} className="lx-tab" onClick={()=>{setMode(m);setErr("");}}
                  style={{ background:mode===m?`${BP}1e`:"transparent", color:mode===m?BP:"rgba(255,255,255,0.32)", border:mode===m?`1px solid ${BP}32`:"1px solid transparent" }}>
                  {m==="store" ? "المتجر" : "الإدارة"}
                </button>
              ))}
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.36)", marginBottom:6 }}>
                {mode==="admin" ? "اسم المستخدم" : "البريد الإلكتروني"}
              </label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", color:`${BP}72`, pointerEvents:"none", display:"flex" }}>
                  {mode==="admin" ? <Shield size={14}/> : <Mail size={14}/>}
                </span>
                <input dir="rtl" className={`lx-field${err?" has-err":""}`} type="text" value={email}
                  onChange={e=>{setEmail(e.target.value);setErr("");}}
                  placeholder={mode==="admin" ? "superadmin" : "email@store.jo"}
                  autoComplete={mode==="admin"?"username":"email"} style={{ paddingRight:42, height:48 }}/>
              </div>
            </div>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.36)", marginBottom:6 }}>كلمة المرور</label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", color:`${BP}72`, pointerEvents:"none", display:"flex" }}><Lock size={14}/></span>
                <input dir="rtl" className={`lx-field${err?" has-err":""}`}
                  type={showPass?"text":"password"} value={pass}
                  onChange={e=>{setPass(e.target.value);setErr("");}}
                  placeholder="••••••••" autoComplete="current-password"
                  onKeyDown={e=>e.key==="Enter"&&doLogin()}
                  onKeyUp={e=>setCapsLock(e.getModifierState("CapsLock"))}
                  style={{ paddingRight:42, paddingLeft:42, height:48 }}/>
                <button type="button" onClick={()=>setShowPass(!showPass)}
                  style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.26)", padding:0, display:"flex" }}>
                  {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
              {capsLock && <p style={{ marginTop:5, fontSize:10.5, fontWeight:600, color:"#FCD34D", display:"flex", alignItems:"center", gap:4 }}><AlertCircle size={10}/> Caps Lock مفعّل</p>}
            </div>
            <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", userSelect:"none", width:"fit-content" }}>
              <div onClick={()=>setRememberMe(!rememberMe)}
                style={{ width:17, height:17, borderRadius:5, border:`1.5px solid ${rememberMe?BP:"rgba(255,255,255,0.17)"}`, background:rememberMe?BP:"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .16s", cursor:"pointer", flexShrink:0 }}>
                {rememberMe && <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.34)" }}>تذكرني</span>
            </label>
            {err && (
              <div style={{ display:"flex", gap:8, padding:"10px 12px", borderRadius:11, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.20)" }}>
                <AlertCircle size={13} color="#FCA5A5" style={{ flexShrink:0, marginTop:1 }}/>
                <p style={{ fontSize:11.5, fontWeight:600, color:"#FCA5A5" }}>{err}</p>
              </div>
            )}
            <button className="lx-btn" onClick={doLogin} disabled={loading||!online} style={{ height:50 }}>
              {loading ? (
                <svg style={{ animation:"lx-spin .8s linear infinite" }} width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,0.25)" strokeWidth="2"/><path d="M10 2A8 8 0 0 1 18 10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
              ) : !online ? <><WifiOff size={14}/> لا يوجد اتصال</> : <>دخول <ArrowLeft size={14}/></>}
            </button>
          </div>
          <p style={{ textAlign:"center", fontSize:10, color:"rgba(255,255,255,0.13)", marginTop:16 }}>© 2026 Sowwanjo · v1.0</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPER ADMIN LAYOUT
// ─────────────────────────────────────────────────────────────────────────────
