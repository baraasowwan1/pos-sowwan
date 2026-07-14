import React, { useState, useCallback, useRef, useEffect, createContext, useContext } from "react";

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
  return apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }) as Promise<{
    token: string;
    store: {
      id: string; _id?: string; nameAr: string; nameEn?: string; category: string;
      plan: string; status: string; owner?: string; email?: string; phone?: string;
      city?: string; expiresAt?: string | Date; taxNo?: string;
    };
    user?: { role?: string; name?: string; id?: string };
  }>;
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

// ── useApiCached hook — instant load from localStorage, refresh in background ─
// Used for heavy lists like products that must be available immediately at POS.
// Strategy: stale-while-revalidate — show cache first, fetch silently in BG,
// update state + cache when response arrives. TTL: 5 minutes.
const CACHE_TTL = 5 * 60 * 1000;
export function useApiCached<T>(path: string, initial: T): { data: T; loading: boolean; error: string; refresh: () => void } {
  const token = getToken();
  const cacheKey = `sowwanjo_cache_${token ? token.slice(-12) : "guest"}_${path.replace(/\//g, "_")}`;

  const readCache = (): { value: T; ts: number } | null => {
    try { const s = localStorage.getItem(cacheKey); return s ? JSON.parse(s) : null; } catch { return null; }
  };
  const writeCache = (value: T) => {
    try { localStorage.setItem(cacheKey, JSON.stringify({ value, ts: Date.now() })); } catch { /* quota */ }
  };

  const cached = readCache();
  const [data, setData]       = useState<T>(cached ? cached.value : initial);
  const [loading, setLoading] = useState(!cached);   // no spinner if we have cache
  const [error, setError]     = useState("");
  const [tick, setTick]       = useState(0);
  const refresh = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    const hit = readCache();
    const stale = !hit || (Date.now() - hit.ts > CACHE_TTL);
    if (hit && !stale && tick === 0) return;      // fresh cache, no need to fetch
    if (!hit) setLoading(true);                   // first ever load — show spinner
    storeApi.get(path)
      .then(d => { setData(d as T); setError(""); writeCache(d as T); })
      .catch(e => { setError((e as {error?:string}).error || "خطأ في جلب البيانات"); })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, token]);

  return { data, loading, error, refresh };
}

// Invalidate all cached entries for a path (call after add/edit/delete product)
export function invalidateCache(path: string) {
  const token = getToken();
  const cacheKey = `sowwanjo_cache_${token ? token.slice(-12) : "guest"}_${path.replace(/\//g, "_")}`;
  try { localStorage.removeItem(cacheKey); } catch { /* ignore */ }
}

// Returns how many seconds ago the cache was last refreshed, or null if no cache
export function getCacheAge(path: string): number | null {
  const token = getToken();
  const cacheKey = `sowwanjo_cache_${token ? token.slice(-12) : "guest"}_${path.replace(/\//g, "_")}`;
  try {
    const s = localStorage.getItem(cacheKey);
    if (!s) return null;
    const { ts } = JSON.parse(s);
    return Math.round((Date.now() - ts) / 1000);
  } catch { return null; }
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

export interface SidebarFeatures {
  pos?: boolean; products?: boolean; inventory?: boolean;
  sales?: boolean; customers?: boolean; suppliers?: boolean;
  purchases?: boolean; purchaseOrders?: boolean; reports?: boolean;
  expenses?: boolean; users?: boolean; settings?: boolean;
  branches?: boolean; promotions?: boolean; returns?: boolean;
  loyalty?: boolean; sync?: boolean;
}
export const DEFAULT_SIDEBAR: Required<SidebarFeatures> = {
  pos: true, products: true, inventory: true, sales: true,
  customers: true, suppliers: true, purchases: true, purchaseOrders: true,
  reports: true, expenses: true, users: true, settings: true,
  branches: false, promotions: true, returns: true,
  loyalty: false, sync: true,
};
export interface StoreData {
  id: string; nameAr: string; nameEn: string; category: StoreCategory;
  owner: string; email: string; phone: string; city: string;
  status: "active" | "suspended" | "expired" | "trial";
  plan: string; users: number; products: number; sales: number;
  revenue: number; createdAt: string; expiresAt: string; branches: number;
  taxNo?: string;
  sidebarFeatures?: SidebarFeatures;
}
export interface Product {
  id: string; nameAr: string; nameEn: string; barcode: string;
  barcodes?: string[];
  sku: string; category: string; costPrice: number; sellPrice: number;
  stock: number; minStock: number; image: string; unit: string;
  taxRate?: number;  // 0 | 2 | 4 | 8 | 16
  taxable?: boolean;
  brand?: string;
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
  title: string; sub?: string; onClose: () => void; children: React.ReactNode; size?: "sm" | "md" | "lg" | "xl";
}) {
  const w = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-2xl", xl: "max-w-4xl" };
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

const FORM_FIELD_TYPES = new Set(["input", "select", "textarea"]);
function isFormField(el: React.ReactElement): boolean {
  if (typeof el.type === "string") return FORM_FIELD_TYPES.has(el.type);
  // TInput / SInput components — they accept and forward id
  const name = (el.type as { displayName?: string; name?: string }).displayName
    || (el.type as { name?: string }).name || "";
  return name === "TInput" || name === "SInput";
}

export function F({ label, req, children, id }: { label: string; req?: boolean; children: React.ReactNode; id?: string }) {
  const autoId = React.useId();
  const fieldId = id || autoId;
  // Inject id into single direct form-field children only
  let injected = children;
  let labelFor: string | undefined;
  if (React.Children.count(children) === 1) {
    const child = React.Children.toArray(children)[0] as React.ReactElement<{ id?: string }>;
    if (React.isValidElement(child) && isFormField(child)) {
      injected = React.cloneElement(child, { id: child.props.id || fieldId });
      labelFor = fieldId;
    }
  }
  return (
    <div className="space-y-1">
      <label htmlFor={labelFor} className="text-xs font-medium text-foreground">{label}{req && <span className="text-destructive mr-0.5">*</span>}</label>
      {injected}
    </div>
  );
}

export function TInput({ value, onChange, placeholder, type = "text", icon, readOnly, id, name, autoFocus }: {
  value: string; onChange?: (v: string) => void; placeholder?: string; type?: string; icon?: React.ReactNode; readOnly?: boolean; id?: string; name?: string; autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      {icon && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">{icon}</span>}
      <input id={id} name={name || id} type={type} value={value} readOnly={readOnly} autoFocus={autoFocus} onChange={e => onChange?.(e.target.value)} placeholder={placeholder}
        className={`w-full h-10 rounded-lg border border-border bg-input-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${icon ? "pr-9 pl-3" : "px-3"} ${readOnly ? "opacity-50 cursor-not-allowed" : ""}`} />
    </div>
  );
}

export function SInput({ value, onChange, options, id, name }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; id?: string; name?: string; }) {
  return (
    <select id={id} name={name || id} value={value} onChange={e => onChange(e.target.value)} className="w-full h-10 rounded-lg border border-border bg-input-background text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
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
const _recentToastKeys = new Set<string>();
export function showToast(msg: string, type: ToastT["type"] = "success") {
  const key = `${type}:${msg}`;
  if (_recentToastKeys.has(key)) return;
  _recentToastKeys.add(key);
  setTimeout(() => _recentToastKeys.delete(key), 2500);
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
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1024);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    setIsDesktop(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, []);

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
  const BIZ_TYPES = ["السوبرماركت","المحلات التجارية","المقاهي","المطاعم","محلات الزهور","مطابع","الإلكترونيات","الأزياء","الصالونات","خدمات الأعمال"];

  const LX_CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap');
    @keyframes lx-up    { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
    @keyframes lx-spin  { to{transform:rotate(360deg)} }
    @keyframes lx-cur   { 0%,49%{opacity:1} 50%,100%{opacity:0} }
    @keyframes lx-blob1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(24px,-18px) scale(1.06)} 66%{transform:translate(-16px,22px) scale(0.95)} }
    @keyframes lx-blob2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-20px,16px) scale(1.05)} 66%{transform:translate(18px,-24px) scale(0.96)} }
    @keyframes lx-blob3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(12px,18px) scale(1.08)} }
    @keyframes lx-float1 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-10px)} }
    @keyframes lx-float2 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-7px)} }
    @keyframes lx-float3 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-13px)} }
    @keyframes lx-shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
    @keyframes lx-glow-ping { 0%{transform:scale(1);opacity:0.4} 100%{transform:scale(2.2);opacity:0} }
    @keyframes lx-enter  { from{opacity:0} to{opacity:1} }
    @keyframes lx-pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.4} }
    @keyframes lx-biz    { 0%,15%{opacity:0;transform:translateY(8px)} 20%,80%{opacity:1;transform:translateY(0)} 85%,100%{opacity:0;transform:translateY(-8px)} }
    .lx0{animation:lx-up .5s cubic-bezier(.22,1,.36,1) both}
    .lx1{animation:lx-up .5s cubic-bezier(.22,1,.36,1) both .08s}
    .lx2{animation:lx-up .5s cubic-bezier(.22,1,.36,1) both .16s}
    .lx3{animation:lx-up .5s cubic-bezier(.22,1,.36,1) both .24s}
    .lx4{animation:lx-up .5s cubic-bezier(.22,1,.36,1) both .32s}
    .lx5{animation:lx-up .5s cubic-bezier(.22,1,.36,1) both .40s}
    .lx6{animation:lx-up .5s cubic-bezier(.22,1,.36,1) both .48s}
    .lx-dev1{animation:lx-float1 5.5s ease-in-out infinite}
    .lx-dev2{animation:lx-float2 6.5s ease-in-out infinite .8s}
    .lx-dev3{animation:lx-float3 7s ease-in-out infinite 1.5s}
    .lx-dev4{animation:lx-float1 6.2s ease-in-out infinite 0.4s}
    .lx-dev5{animation:lx-float2 5.2s ease-in-out infinite 2s}
    .lx-dev6{animation:lx-float3 7.8s ease-in-out infinite 1s}
    .lx-dev7{animation:lx-float2 6.8s ease-in-out infinite 0.6s}
    .lx-field{
      width:100%; height:48px; border-radius:12px;
      border:1.5px solid #E2E8F0;
      background:#FFFFFF;
      color:#111827; font-size:14px; font-weight:500;
      padding:0 48px 0 16px; outline:none;
      transition:border-color .2s,box-shadow .2s;
      font-family:"Cairo","Inter",sans-serif; -webkit-appearance:none;
      box-shadow:0 1px 3px rgba(15,23,42,0.06);
    }
    .lx-field:focus{ border-color:${BP}; box-shadow:0 0 0 3px ${BP}18; }
    .lx-field::placeholder{color:#94A3B8}
    .lx-field.has-err{border-color:#EF4444;box-shadow:0 0 0 3px rgba(239,68,68,0.10);}
    .lx-btn{
      width:100%; height:48px; border-radius:12px; border:none; cursor:pointer;
      font-size:15px; font-weight:700; font-family:"Cairo","Inter",sans-serif;
      display:flex; align-items:center; justify-content:center; gap:8px;
      position:relative; overflow:hidden;
      background:${BP};
      color:#fff; letter-spacing:-0.01em;
      box-shadow:0 4px 14px ${BP}40,0 1px 4px rgba(0,0,0,0.10);
      transition:transform .14s,box-shadow .2s,opacity .15s;
    }
    .lx-btn::after{
      content:""; position:absolute; inset:0;
      background:linear-gradient(135deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.10) 50%,rgba(255,255,255,0) 100%);
      background-size:200% auto; animation:lx-shimmer 3s linear infinite;
    }
    .lx-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 24px ${BP}50,0 2px 8px rgba(0,0,0,0.12);}
    .lx-btn:active:not(:disabled){transform:scale(0.987);}
    .lx-btn:disabled{opacity:0.40;cursor:not-allowed;box-shadow:none;}
    .lx-tab{flex:1;height:36px;border-radius:9px;border:none;cursor:pointer;font-size:12px;font-weight:700;transition:all .16s;font-family:"Cairo","Inter",sans-serif;}
    .lx-cur{display:inline-block;width:2px;height:0.85em;background:${BP};margin-right:2px;vertical-align:middle;border-radius:2px;animation:lx-cur .7s step-end infinite;}
    @media(prefers-reduced-motion:reduce){.lx0,.lx1,.lx2,.lx3,.lx4,.lx5,.lx6,.lx-dev1,.lx-dev2,.lx-dev3,.lx-dev4,.lx-dev5,.lx-dev6,.lx-dev7{animation:none!important;opacity:1!important;transform:none!important}}
  `;

  // Business type cycling index
  const [bizIdx, setBizIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setBizIdx(i => (i+1) % BIZ_TYPES.length), 2800);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shared device card style
  const devCard = (extra?: React.CSSProperties): React.CSSProperties => ({
    background:"rgba(15,23,42,0.82)", backdropFilter:"blur(18px) saturate(130%)",
    border:"1px solid rgba(255,255,255,0.10)", borderRadius:16,
    padding:"12px 14px", boxShadow:"0 16px 40px rgba(0,0,0,0.45)",
    ...extra,
  });

  return (
    <div dir="rtl" style={{ fontFamily:"'Cairo','Inter',sans-serif", minHeight:"100dvh", background:"#F8FAFC", position:"relative", overflow:"hidden" }}>
      <style>{LX_CSS}</style>

      {/* ── ENTERING TRANSITION OVERLAY ── */}
      {entering && (
        <div style={{ position:"fixed", inset:0, zIndex:1000, background:"#0F172A", display:"flex", alignItems:"center", justifyContent:"center", animation:"lx-enter .4s ease both" }}>
          <div style={{ position:"relative", width:48, height:48 }}>
            <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:`2.5px solid ${BP}30`, borderTopColor:BP, animation:"lx-spin .7s linear infinite" }}/>
            <div style={{ position:"absolute", inset:7, borderRadius:"50%", border:`2px solid ${BA}22`, borderRightColor:BA, animation:"lx-spin 1.2s linear infinite reverse" }}/>
            <div style={{ position:"absolute", inset:"50%", width:7, height:7, marginLeft:-3.5, marginTop:-3.5, borderRadius:"50%", background:BP, boxShadow:`0 0 10px ${BP}` }}/>
          </div>
        </div>
      )}

      {/* ── OFFLINE BANNER ── */}
      {!online && (
        <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 16px", fontSize:12, fontWeight:700, color:"#fff", background:"#DC2626", borderBottom:"1px solid #B91C1C" }}>
          <WifiOff size={13}/> لا يوجد اتصال بالإنترنت — تحقق من الشبكة
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          DESKTOP LAYOUT  65% HERO (navy)  |  35% CARD (white)
      ════════════════════════════════════════════════════════ */}
      {isDesktop && <div style={{ height:"100dvh", display:"flex" }}>

        {/* ══ HERO 65% — Deep Navy cinematic ecosystem ══ */}
        <div style={{
          width:"65%", flexShrink:0, position:"relative", overflow:"hidden",
          background:"#0F172A",
          display:"flex", flexDirection:"column",
          transition:"transform .6s cubic-bezier(.4,0,.2,1)",
          transform: entering ? "scale(1.05)" : "scale(1)",
        }}>
          {/* Fine dot grid */}
          <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(rgba(255,255,255,0.022) 1px,transparent 1px)", backgroundSize:"26px 26px", pointerEvents:"none" }}/>

          {/* Ambient glows */}
          <div style={{ position:"absolute", top:"-8%", right:"15%", width:520, height:520, borderRadius:"50%", background:`${BP}18`, filter:"blur(110px)", animation:"lx-blob1 14s ease-in-out infinite", pointerEvents:"none" }}/>
          <div style={{ position:"absolute", bottom:"-12%", left:"5%", width:460, height:460, borderRadius:"50%", background:"#10B98115", filter:"blur(100px)", animation:"lx-blob2 16s ease-in-out infinite", pointerEvents:"none" }}/>
          <div style={{ position:"absolute", top:"40%", left:"32%", width:300, height:300, borderRadius:"50%", background:`${BA}0e`, filter:"blur(70px)", animation:"lx-blob3 10s ease-in-out infinite", pointerEvents:"none" }}/>

          {/* Cloud connection SVG */}
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }} viewBox="0 0 780 880" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="lxconn1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={BP} stopOpacity="0.65"/><stop offset="100%" stopColor="#10B981" stopOpacity="0.12"/></linearGradient>
              <linearGradient id="lxconn2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#10B981" stopOpacity="0.5"/><stop offset="100%" stopColor={BP} stopOpacity="0.1"/></linearGradient>
            </defs>
            {([
              ["M390,110 C 320,172 248,210 168,255", "lxconn1"],
              ["M390,110 C 462,172 534,210 614,252", "lxconn2"],
              ["M390,110 C 355,260 290,340 210,425", "lxconn1"],
              ["M390,110 C 425,260 490,340 570,422", "lxconn2"],
              ["M168,255 C 173,330 188,382 210,425", "lxconn1"],
              ["M614,252 C 609,328 594,382 570,422", "lxconn2"],
              ["M210,425 C 282,484 350,498 390,500", "lxconn1"],
              ["M570,422 C 498,484 430,498 390,500", "lxconn2"],
              ["M390,500 C 368,580 350,630 330,690", "lxconn1"],
              ["M390,500 C 412,580 430,630 450,690", "lxconn2"],
            ] as [string,string][]).map(([d,grad],i) => (
              <g key={i}>
                <path d={d} stroke={`url(#${grad})`} strokeWidth="1.1" fill="none" strokeOpacity="0.38" strokeDasharray="4 10"/>
                <circle r="2.5" fill={i%2===0?BP:"#10B981"} opacity="0.9">
                  <animateMotion dur={`${3.2+i*0.48}s`} repeatCount="indefinite" begin={`${i*0.65}s`} path={d}/>
                </circle>
              </g>
            ))}
          </svg>

          {/* ── Logo in hero ── */}
          <div style={{ position:"relative", zIndex:3, padding:"32px 48px 0", flexShrink:0 }}>
            <button onClick={handleLogoClick} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:10, padding:0 }}>
              <div style={{ width:40, height:40, borderRadius:11, background:`${BP}22`, border:`1.5px solid ${BP}45`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Store size={19} color={BP}/>
              </div>
              <div style={{ textAlign:"right" }}>
                <p style={{ color:"#F1F5F9", fontWeight:800, fontSize:15, letterSpacing:"-0.025em", lineHeight:1.2 }}>Sowwanjo POS</p>
                <p style={{ color:"rgba(255,255,255,0.28)", fontSize:10, marginTop:1 }}>منصة الأعمال السحابية</p>
              </div>
            </button>
          </div>

          {/* ── Device ecosystem cards ── */}
          <div style={{ position:"absolute", inset:0, zIndex:2, pointerEvents:"none" }}>

            {/* Cloud hub — top center */}
            <div className="lx-dev1" style={{ ...devCard({ position:"absolute", top:"8%", left:"50%", transform:"translateX(-50%)", display:"flex", alignItems:"center", gap:10, padding:"10px 16px", borderRadius:18, border:`1.5px solid ${BP}40`, boxShadow:`0 0 36px ${BP}20,0 10px 30px rgba(0,0,0,0.45)`, whiteSpace:"nowrap" }) }}>
              <div style={{ width:28, height:28, borderRadius:8, background:`${BP}22`, border:`1px solid ${BP}45`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Globe size={14} color={BP}/></div>
              <div>
                <p style={{ color:"#F1F5F9", fontWeight:700, fontSize:11.5, lineHeight:1.2 }}>مزامنة سحابية فورية</p>
                <p style={{ color:`${BP}CC`, fontWeight:600, fontSize:9.5, marginTop:1 }}>آمن · موثوق · محمي</p>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"#10B981", animation:"lx-pulse-dot 1.8s ease-in-out infinite" }}/>
              </div>
              <div style={{ position:"absolute", inset:-8, borderRadius:26, border:`1px solid ${BP}20`, animation:"lx-glow-ping 3s ease-out infinite", pointerEvents:"none" }}/>
            </div>

            {/* Super Admin Dashboard — top left */}
            <div className="lx-dev2" style={{ ...devCard({ position:"absolute", top:"19%", left:"4%", minWidth:158 }) }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:9 }}>
                <div style={{ width:24, height:24, borderRadius:7, background:`${BP}1e`, border:`1px solid ${BP}38`, display:"flex", alignItems:"center", justifyContent:"center" }}><Monitor size={12} color={BP}/></div>
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

            {/* Analytics/Reports — top right */}
            <div className="lx-dev3" style={{ ...devCard({ position:"absolute", top:"18%", right:"4%", minWidth:150 }) }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:9 }}>
                <div style={{ width:24, height:24, borderRadius:7, background:"#10B98120", border:"1px solid #10B98138", display:"flex", alignItems:"center", justifyContent:"center" }}><BarChart2 size={12} color="#10B981"/></div>
                <span style={{ color:"rgba(255,255,255,0.48)", fontSize:10.5, fontWeight:700 }}>التقارير</span>
              </div>
              <svg viewBox="0 0 115 32" style={{ width:"100%", height:32 }}>
                <defs><linearGradient id="lxgr1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#10B981" stopOpacity="0.32"/><stop offset="100%" stopColor="#10B981" stopOpacity="0"/></linearGradient></defs>
                <path d="M0,27 L13,21 L27,24 L40,13 L54,17 L68,7 L82,11 L96,3 L115,6" stroke="#10B981" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
                <path d="M0,27 L13,21 L27,24 L40,13 L54,17 L68,7 L82,11 L96,3 L115,6 L115,32 L0,32Z" fill="url(#lxgr1)"/>
              </svg>
              <div style={{ marginTop:3, display:"flex", justifyContent:"space-between" }}>
                <span style={{ color:"#10B981CC", fontSize:9.5, fontWeight:800 }}>2,840 JOD</span>
                <span style={{ color:"rgba(255,255,255,0.24)", fontSize:9.5 }}>اليوم</span>
              </div>
            </div>

            {/* POS Terminal — middle left */}
            <div className="lx-dev4" style={{ ...devCard({ position:"absolute", top:"47%", left:"4%", minWidth:150 }) }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <div style={{ width:24, height:24, borderRadius:7, background:"rgba(37,99,235,0.18)", border:"1px solid rgba(37,99,235,0.35)", display:"flex", alignItems:"center", justifyContent:"center" }}><ShoppingCart size={12} color={BP}/></div>
                <span style={{ color:"rgba(255,255,255,0.48)", fontSize:10.5, fontWeight:700 }}>نقطة البيع</span>
              </div>
              <div style={{ padding:"6px 9px", borderRadius:9, background:"rgba(37,99,235,0.09)", border:`1px solid ${BP}20` }}>
                <p style={{ color:"rgba(255,255,255,0.35)", fontSize:8.5, fontWeight:600, marginBottom:1 }}>الإجمالي</p>
                <p style={{ color:BP, fontWeight:900, fontSize:18, letterSpacing:"-0.04em", lineHeight:1 }}>12.750 JOD</p>
              </div>
              <div style={{ marginTop:7, display:"flex", gap:3 }}>
                {["كاش","كليك","بطاقة"].map(m => (
                  <div key={m} style={{ flex:1, padding:"3px 0", borderRadius:6, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)", textAlign:"center" }}>
                    <span style={{ fontSize:8.5, color:"rgba(255,255,255,0.30)", fontWeight:600 }}>{m}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Inventory — middle right */}
            <div className="lx-dev5" style={{ ...devCard({ position:"absolute", top:"45%", right:"3%", minWidth:146 }) }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <div style={{ width:24, height:24, borderRadius:7, background:"rgba(168,85,247,0.16)", border:"1px solid rgba(168,85,247,0.35)", display:"flex", alignItems:"center", justifyContent:"center" }}><Boxes size={12} color="#A855F7"/></div>
                <span style={{ color:"rgba(255,255,255,0.48)", fontSize:10.5, fontWeight:700 }}>المخزون</span>
              </div>
              {[["منتجات","3,724","#A855F7"],["تنبيهات","12","#F59E0B"],["متاجر","5","#10B981"]].map(([l,v,c]) => (
                <div key={l as string} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontSize:9.5, color:"rgba(255,255,255,0.32)" }}>{l}</span>
                  <span style={{ fontSize:11, fontWeight:800, color:c as string }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Receipt printer / Barcode scanner — lower left */}
            <div className="lx-dev7" style={{ ...devCard({ position:"absolute", top:"69%", left:"4%", display:"flex", alignItems:"center", gap:9, padding:"9px 13px", whiteSpace:"nowrap" }) }}>
              <div style={{ width:26, height:26, borderRadius:7, background:"rgba(245,158,11,0.15)", border:"1px solid rgba(245,158,11,0.30)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Printer size={13} color="#F59E0B"/></div>
              <div>
                <p style={{ color:"#F1F5F9", fontWeight:700, fontSize:10.5 }}>طباعة فاتورة</p>
                <p style={{ color:"rgba(255,255,255,0.30)", fontSize:9 }}>جاهز للطباعة</p>
              </div>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#10B981", flexShrink:0 }}/>
            </div>

            {/* Scanner badge — lower center */}
            <div className="lx-dev6" style={{ ...devCard({ position:"absolute", top:"71%", left:"50%", transform:"translateX(-50%)", display:"flex", alignItems:"center", gap:9, padding:"9px 14px", border:`1px solid ${BP}28`, whiteSpace:"nowrap" }) }}>
              <div style={{ width:26, height:26, borderRadius:7, background:`${BP}18`, border:`1px solid ${BP}38`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><Scan size={13} color={BP}/></div>
              <div>
                <p style={{ color:"#F1F5F9", fontWeight:700, fontSize:10.5 }}>باركود · QR · سكانر</p>
                <p style={{ color:"rgba(255,255,255,0.30)", fontSize:9 }}>دعم احترافي كامل</p>
              </div>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#10B981", boxShadow:"0 0 6px #10B981", flexShrink:0, animation:"lx-pulse-dot 1.5s ease-in-out infinite" }}/>
            </div>
          </div>

          {/* ── Hero text — gradient overlay at bottom ── */}
          <div style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:3, padding:"80px 48px 36px", background:"linear-gradient(to top,rgba(15,23,42,0.97) 0%,rgba(15,23,42,0.55) 55%,transparent 100%)" }}>
            {/* Live badge */}
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 11px", borderRadius:100, background:`${BP}18`, border:`1px solid ${BP}32`, marginBottom:12, animation:"lx-up .5s cubic-bezier(.22,1,.36,1) both .08s" }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background:"#10B981", display:"block", boxShadow:"0 0 5px #10B981" }}/>
              <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.52)", letterSpacing:"0.07em" }}>LIVE · منصة الأعمال السحابية · الأردن</span>
            </div>

            {/* Main headline */}
            <h1 style={{ color:"#F8FAFC", fontWeight:900, fontSize:"clamp(24px,2.6vw,40px)", lineHeight:1.18, letterSpacing:"-0.04em", marginBottom:10, animation:"lx-up .5s cubic-bezier(.22,1,.36,1) both .15s" }}>
              أدِر أعمالك بذكاء<br/>
              <span style={{ color:BP }}>{twText}</span><span className="lx-cur"/>
            </h1>

            {/* Business type cycling */}
            <p style={{ fontSize:12.5, color:"rgba(255,255,255,0.38)", marginBottom:18, animation:"lx-up .5s cubic-bezier(.22,1,.36,1) both .22s" }}>
              منصة واحدة لـ{" "}
              <span key={bizIdx} style={{ color:`${BP}DD`, fontWeight:700, display:"inline-block", animation:"lx-biz 2.8s ease both" }}>
                {BIZ_TYPES[bizIdx]}
              </span>
            </p>

            {/* Feature badges */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:22, animation:"lx-up .5s cubic-bezier(.22,1,.36,1) both .30s" }}>
              {BADGES.map((b,i) => (
                <div key={b} style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:100, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
                  <span style={{ width:3.5, height:3.5, borderRadius:"50%", background:i%3===0?BP:i%3===1?"#10B981":"#F59E0B", display:"block" }}/>
                  <span style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,0.44)" }}>{b}</span>
                </div>
              ))}
            </div>

            {/* Stats row */}
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

        {/* ══ LOGIN CARD 35% — Warm White premium panel ══ */}
        <div style={{
          flex:1, display:"flex", alignItems:"center", justifyContent:"center",
          padding:"24px 28px", position:"relative", zIndex:10,
          background:"#F8FAFC",
          transition:"opacity .38s ease",
          opacity: entering ? 0 : 1,
        }}>
          {/* Subtle decorative circles */}
          <div style={{ position:"absolute", top:"-6%", left:"-8%", width:280, height:280, borderRadius:"50%", background:`${BP}08`, filter:"blur(60px)", pointerEvents:"none" }}/>
          <div style={{ position:"absolute", bottom:"-8%", right:"-10%", width:240, height:240, borderRadius:"50%", background:"#10B98108", filter:"blur(60px)", pointerEvents:"none" }}/>

          <div style={{
            width:"100%", maxWidth:400,
            background:"#FFFFFF",
            border:"1px solid #E2E8F0",
            borderRadius:20,
            padding:"36px 32px 28px",
            boxShadow:"0 20px 60px rgba(15,23,42,0.10),0 4px 16px rgba(15,23,42,0.05)",
            position:"relative",
          }}>
            {/* Top accent line */}
            <div style={{ position:"absolute", top:0, left:"20%", right:"20%", height:"2px", background:`linear-gradient(90deg,transparent,${BP},transparent)`, borderRadius:2 }}/>

            {/* Logo */}
            <div className="lx0" style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
              <button onClick={handleLogoClick} style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", flexShrink:0 }}>
                <div style={{ width:46, height:46, borderRadius:13, background:`${BP}12`, border:`2px solid ${BP}28`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 4px 16px ${BP}20` }}>
                  <Store size={22} color={BP}/>
                </div>
              </button>
              <div>
                <p style={{ color:"#0F172A", fontWeight:800, fontSize:16, letterSpacing:"-0.025em", lineHeight:1.2 }}>Sowwanjo POS</p>
                <p style={{ color:"#64748B", fontSize:10.5 }}>الإصدار 1.0 · نقاط البيع السحابي</p>
              </div>
            </div>

            {/* Welcome */}
            <div className="lx1" style={{ marginBottom:22 }}>
              <h2 style={{ color:"#0F172A", fontWeight:900, fontSize:21, letterSpacing:"-0.035em", marginBottom:4 }}>
                {mode==="admin"&&adminUnlocked ? "بوابة الإدارة العليا" : "مرحباً بعودتك"}
              </h2>
              <p style={{ color:"#64748B", fontSize:13 }}>
                {mode==="admin"&&adminUnlocked ? "الوصول مقيد — بيانات المدير العام فقط" : "أدخل بياناتك للدخول إلى منصتك"}
              </p>
            </div>

            {adminUnlocked && (
              <div className="lx1" style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", borderRadius:12, marginBottom:14, background:"#FEF3C7", border:"1px solid #FDE68A" }}>
                <Shield size={13} color="#D97706"/>
                <p style={{ fontSize:12, fontWeight:700, color:"#92400E" }}>تم تفعيل وضع الإدارة العليا</p>
              </div>
            )}

            {adminUnlocked && (
              <div className="lx2" style={{ display:"flex", padding:3, borderRadius:12, marginBottom:16, background:"#F1F5F9", gap:3, border:"1px solid #E2E8F0" }}>
                {(["store","admin"] as const).map(m => (
                  <button key={m} className="lx-tab" onClick={()=>{setMode(m);setErr("");}}
                    style={{ background:mode===m?"#FFFFFF":"transparent", color:mode===m?BP:"#94A3B8", border:mode===m?`1px solid #E2E8F0`:"1px solid transparent", boxShadow:mode===m?"0 1px 4px rgba(15,23,42,0.08)":"none" }}>
                    {m==="store" ? "دخول المتجر" : "الإدارة العليا"}
                  </button>
                ))}
              </div>
            )}

            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {/* Email/username */}
              <div className="lx2">
                <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:7 }}>
                  {mode==="admin" ? "اسم المستخدم" : "البريد الإلكتروني أو رقم الهاتف"}
                </label>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", color:`${BP}80`, pointerEvents:"none", display:"flex" }}>
                    {mode==="admin" ? <Shield size={15}/> : <Mail size={15}/>}
                  </span>
                  <input dir="rtl" className={`lx-field${err?" has-err":""}`} type="text" value={email}
                    onChange={e=>{setEmail(e.target.value);setErr("");}}
                    placeholder={mode==="admin" ? "superadmin" : "email@store.jo"}
                    autoComplete={mode==="admin"?"username":"email"} style={{ paddingRight:44 }}/>
                </div>
              </div>

              {/* Password */}
              <div className="lx3">
                <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#374151", marginBottom:7 }}>كلمة المرور</label>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", color:`${BP}80`, pointerEvents:"none", display:"flex" }}><Lock size={15}/></span>
                  <input dir="rtl" className={`lx-field${err?" has-err":""}`}
                    type={showPass?"text":"password"} value={pass}
                    onChange={e=>{setPass(e.target.value);setErr("");}}
                    placeholder="••••••••" autoComplete="current-password"
                    onKeyDown={e=>e.key==="Enter"&&doLogin()}
                    onKeyUp={e=>setCapsLock(e.getModifierState("CapsLock"))}
                    style={{ paddingRight:44, paddingLeft:44 }}/>
                  <button type="button" onClick={()=>setShowPass(!showPass)}
                    style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#94A3B8", padding:0, display:"flex", transition:"color .16s" }}>
                    {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
                {capsLock && <p style={{ display:"flex", alignItems:"center", gap:5, marginTop:6, fontSize:11, fontWeight:600, color:"#B45309" }}><AlertCircle size={11}/> مفتاح Caps Lock مفعّل</p>}
              </div>

              {/* Remember me */}
              <div className="lx4">
                <label style={{ display:"flex", alignItems:"center", gap:9, cursor:"pointer", userSelect:"none", width:"fit-content" }}>
                  <div onClick={()=>setRememberMe(!rememberMe)}
                    style={{ width:18, height:18, borderRadius:5, border:`1.5px solid ${rememberMe?BP:"#CBD5E1"}`, background:rememberMe?BP:"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .16s", cursor:"pointer", flexShrink:0 }}>
                    {rememberMe && <svg width="10" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{ fontSize:13, fontWeight:500, color:"#4B5563" }}>تذكرني</span>
                </label>
              </div>

              {/* Error */}
              {err && (
                <div className="lx0" style={{ display:"flex", alignItems:"flex-start", gap:9, padding:"10px 12px", borderRadius:12, background:"#FEF2F2", border:"1px solid #FECACA" }}>
                  <AlertCircle size={13} color="#DC2626" style={{ flexShrink:0, marginTop:1 }}/>
                  <div>
                    <p style={{ fontSize:12.5, fontWeight:600, color:"#991B1B" }}>{err}</p>
                    {(err.includes("مهلة")||err.includes("اتصال")) && (
                      <button onClick={doLogin} style={{ marginTop:3, fontSize:11, fontWeight:700, color:"#2563EB", textDecoration:"underline", background:"none", border:"none", cursor:"pointer", padding:0, fontFamily:"inherit" }}>إعادة المحاولة</button>
                    )}
                  </div>
                </div>
              )}

              {/* Login button */}
              <div className="lx5">
                <button className="lx-btn" onClick={doLogin} disabled={loading||!online}>
                  {loading ? (
                    <svg style={{ animation:"lx-spin .8s linear infinite" }} width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,0.30)" strokeWidth="2"/><path d="M10 2A8 8 0 0 1 18 10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
                  ) : !online ? <><WifiOff size={15}/> لا يوجد اتصال</> : <>دخول <ArrowLeft size={15}/></>}
                </button>
              </div>
            </div>

            {/* Support contact */}
            {mode==="store" && !adminUnlocked && (
              <div className="lx6" style={{ marginTop:16, padding:"10px 12px", borderRadius:12, background:"#F8FAFC", border:"1px solid #E2E8F0" }}>
                <p style={{ fontSize:11, fontWeight:600, color:"#94A3B8", marginBottom:2, display:"flex", alignItems:"center", gap:5 }}>
                  <Info size={10}/> تحتاج حساباً؟
                </p>
                <p style={{ fontSize:11.5, color:"#64748B", lineHeight:1.6 }}>
                  تواصل مع مزود الخدمة:{" "}
                  <span style={{ color:BP, fontWeight:700 }}>support@sowwanjo.online</span>
                </p>
              </div>
            )}

            <p style={{ textAlign:"center", fontSize:10.5, color:"#94A3B8", marginTop:18 }}>
              © 2026 Sowwanjo POS · v1.0 · مشفّر وآمن
            </p>
          </div>
        </div>
      </div>}

      {/* ════════════════════════════════════════════════════════
          MOBILE LAYOUT — light warm-white full-screen
      ════════════════════════════════════════════════════════ */}
      {!isDesktop && <div style={{
        width:"100%", minHeight:"100dvh", display:"flex", flexDirection:"column",
        padding:"calc(env(safe-area-inset-top,0px) + 16px) 18px calc(env(safe-area-inset-bottom,0px) + 20px)",
        background:"#F8FAFC",
        position:"relative", zIndex:1,
        opacity: entering ? 0 : 1, transition:"opacity .38s ease",
      }}>
        <div style={{ position:"fixed", top:"-15%", right:"-12%", width:"72vw", height:"72vw", borderRadius:"50%", background:`${BP}0a`, filter:"blur(70px)", pointerEvents:"none", zIndex:0 }}/>
        <div style={{ position:"fixed", bottom:"-18%", left:"-8%", width:"60vw", height:"60vw", borderRadius:"50%", background:"#10B9810a", filter:"blur(70px)", pointerEvents:"none", zIndex:0 }}/>

        {/* Mobile logo bar */}
        <div style={{ position:"relative", zIndex:1, display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <button onClick={handleLogoClick} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:10, padding:0 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:`${BP}12`, border:`1.5px solid ${BP}28`, display:"flex", alignItems:"center", justifyContent:"center" }}><Store size={18} color={BP}/></div>
            <div>
              <p style={{ color:"#0F172A", fontWeight:800, fontSize:14.5, letterSpacing:"-0.025em" }}>Sowwanjo POS</p>
              <p style={{ color:"#64748B", fontSize:10 }}>نظام نقاط البيع السحابي</p>
            </div>
          </button>
          {online && <div style={{ width:7, height:7, borderRadius:"50%", background:"#10B981", boxShadow:"0 0 6px #10B981" }}/>}
        </div>

        {/* Mobile hero mini section */}
        <div style={{ position:"relative", zIndex:1, background:"#0F172A", borderRadius:18, padding:"18px 18px 16px", marginBottom:16, overflow:"hidden" }}>
          <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(rgba(255,255,255,0.018) 1px,transparent 1px)", backgroundSize:"22px 22px" }}/>
          <div style={{ position:"absolute", top:"-20%", right:"-5%", width:160, height:160, borderRadius:"50%", background:`${BP}20`, filter:"blur(55px)" }}/>
          <div style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 9px", borderRadius:100, background:`${BP}18`, border:`1px solid ${BP}30`, marginBottom:10 }}>
            <span style={{ width:4, height:4, borderRadius:"50%", background:"#10B981", display:"block" }}/>
            <span style={{ fontSize:9.5, fontWeight:700, color:"rgba(255,255,255,0.50)" }}>منصة الأعمال السحابية</span>
          </div>
          <h2 style={{ color:"#F8FAFC", fontWeight:900, fontSize:20, letterSpacing:"-0.04em", lineHeight:1.22, minHeight:"1.3em", marginBottom:6, position:"relative" }}>
            أدِر أعمالك · <span style={{ color:BP }}>{twText}</span><span className="lx-cur"/>
          </h2>
          <p style={{ color:"rgba(255,255,255,0.34)", fontSize:11.5, lineHeight:1.65, position:"relative", marginBottom:12 }}>
            منصة سحابية لجميع أنواع المتاجر — مبيعات · مخزون · عملاء
          </p>
          {/* Mini badges */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:5, position:"relative" }}>
            {BADGES.slice(0,5).map((b,i) => (
              <div key={b} style={{ display:"flex", alignItems:"center", gap:3.5, padding:"3px 8px", borderRadius:100, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ width:3, height:3, borderRadius:"50%", background:i%2===0?BP:"#10B981", display:"block" }}/>
                <span style={{ fontSize:9.5, fontWeight:600, color:"rgba(255,255,255,0.42)" }}>{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile login card */}
        <div style={{ position:"relative", zIndex:1, background:"#FFFFFF", border:"1px solid #E2E8F0", borderRadius:18, padding:"22px 18px 18px", boxShadow:"0 8px 30px rgba(15,23,42,0.08)" }}>
          <div style={{ position:"absolute", top:0, left:"22%", right:"22%", height:"2px", background:`linear-gradient(90deg,transparent,${BP},transparent)`, borderRadius:2 }}/>
          <h3 style={{ color:"#0F172A", fontWeight:800, fontSize:17, letterSpacing:"-0.03em", marginBottom:3 }}>
            {mode==="admin"&&adminUnlocked ? "بوابة الإدارة العليا" : "مرحباً بعودتك"}
          </h3>
          <p style={{ color:"#64748B", fontSize:12, marginBottom:16 }}>أدخل بياناتك للمتابعة</p>

          {adminUnlocked && (
            <div style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 10px", borderRadius:10, marginBottom:12, background:"#FEF3C7", border:"1px solid #FDE68A" }}>
              <Shield size={12} color="#D97706"/><p style={{ fontSize:11, fontWeight:700, color:"#92400E" }}>وضع الإدارة العليا</p>
            </div>
          )}
          {adminUnlocked && (
            <div style={{ display:"flex", padding:3, borderRadius:11, marginBottom:14, background:"#F1F5F9", gap:3, border:"1px solid #E2E8F0" }}>
              {(["store","admin"] as const).map(m => (
                <button key={m} className="lx-tab" onClick={()=>{setMode(m);setErr("");}}
                  style={{ background:mode===m?"#FFFFFF":"transparent", color:mode===m?BP:"#94A3B8", border:mode===m?"1px solid #E2E8F0":"1px solid transparent", boxShadow:mode===m?"0 1px 4px rgba(15,23,42,0.08)":"none" }}>
                  {m==="store" ? "المتجر" : "الإدارة"}
                </button>
              ))}
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div>
              <label style={{ display:"block", fontSize:11.5, fontWeight:600, color:"#374151", marginBottom:6 }}>
                {mode==="admin" ? "اسم المستخدم" : "البريد الإلكتروني"}
              </label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", color:`${BP}80`, pointerEvents:"none", display:"flex" }}>
                  {mode==="admin" ? <Shield size={14}/> : <Mail size={14}/>}
                </span>
                <input dir="rtl" className={`lx-field${err?" has-err":""}`} type="text" value={email}
                  onChange={e=>{setEmail(e.target.value);setErr("");}}
                  placeholder={mode==="admin" ? "superadmin" : "email@store.jo"}
                  autoComplete={mode==="admin"?"username":"email"} style={{ paddingRight:42 }}/>
              </div>
            </div>
            <div>
              <label style={{ display:"block", fontSize:11.5, fontWeight:600, color:"#374151", marginBottom:6 }}>كلمة المرور</label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", color:`${BP}80`, pointerEvents:"none", display:"flex" }}><Lock size={14}/></span>
                <input dir="rtl" className={`lx-field${err?" has-err":""}`}
                  type={showPass?"text":"password"} value={pass}
                  onChange={e=>{setPass(e.target.value);setErr("");}}
                  placeholder="••••••••" autoComplete="current-password"
                  onKeyDown={e=>e.key==="Enter"&&doLogin()}
                  onKeyUp={e=>setCapsLock(e.getModifierState("CapsLock"))}
                  style={{ paddingRight:42, paddingLeft:42 }}/>
                <button type="button" onClick={()=>setShowPass(!showPass)}
                  style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#94A3B8", padding:0, display:"flex" }}>
                  {showPass ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
              {capsLock && <p style={{ marginTop:5, fontSize:10.5, fontWeight:600, color:"#B45309", display:"flex", alignItems:"center", gap:4 }}><AlertCircle size={10}/> Caps Lock مفعّل</p>}
            </div>
            <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", userSelect:"none", width:"fit-content" }}>
              <div onClick={()=>setRememberMe(!rememberMe)}
                style={{ width:17, height:17, borderRadius:5, border:`1.5px solid ${rememberMe?BP:"#CBD5E1"}`, background:rememberMe?BP:"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .16s", cursor:"pointer", flexShrink:0 }}>
                {rememberMe && <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span style={{ fontSize:12.5, fontWeight:500, color:"#4B5563" }}>تذكرني</span>
            </label>
            {err && (
              <div style={{ display:"flex", gap:8, padding:"10px 12px", borderRadius:11, background:"#FEF2F2", border:"1px solid #FECACA" }}>
                <AlertCircle size={13} color="#DC2626" style={{ flexShrink:0, marginTop:1 }}/>
                <p style={{ fontSize:12, fontWeight:600, color:"#991B1B" }}>{err}</p>
              </div>
            )}
            <button className="lx-btn" onClick={doLogin} disabled={loading||!online}>
              {loading ? (
                <svg style={{ animation:"lx-spin .8s linear infinite" }} width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,0.30)" strokeWidth="2"/><path d="M10 2A8 8 0 0 1 18 10" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
              ) : !online ? <><WifiOff size={14}/> لا يوجد اتصال</> : <>دخول <ArrowLeft size={14}/></>}
            </button>
          </div>
          <p style={{ textAlign:"center", fontSize:10.5, color:"#94A3B8", marginTop:16 }}>© 2026 Sowwanjo · v1.0</p>
        </div>
      </div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPER ADMIN LAYOUT
// ─────────────────────────────────────────────────────────────────────────────
