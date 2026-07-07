import { useState, useCallback, useRef, useEffect, createContext, useContext } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// API SERVICE — يربط Frontend بـ Backend API (MongoDB)
// ─────────────────────────────────────────────────────────────────────────────
const API = (import.meta as Record<string,Record<string,string>>).env?.VITE_API_URL || "http://localhost:5000/api";

async function apiFetch(path: string, opts: RequestInit = {}, token?: string): Promise<unknown> {
  const headers: Record<string,string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

// جلب/حفظ JWT token
const getToken = () => { try { return localStorage.getItem("sowwanjo_jwt") || ""; } catch { return ""; } };
const setToken = (t: string) => { try { localStorage.setItem("sowwanjo_jwt", t); } catch {} };
const clearToken = () => { try { localStorage.removeItem("sowwanjo_jwt"); } catch {} };

// دخول المتجر من Backend
async function apiLoginStore(email: string, password: string) {
  return apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }) as Promise<{token:string;store:{id:string;nameAr:string;category:string;plan:string;status:string}}>;
}

// دخول المدير العام من Backend
async function apiLoginAdmin(email: string, password: string) {
  return apiFetch("/auth/admin", { method: "POST", body: JSON.stringify({ email, password }) }) as Promise<{token:string;role:string}>;
}

// إنشاء متجر من Backend (السوبر أدمن)
async function apiCreateStore(data: object) {
  return apiFetch("/stores", { method: "POST", body: JSON.stringify(data) }, getToken()) as Promise<{store:StoreData;generatedPassword:string}>;
}

// جلب جميع المتاجر من Backend
async function apiGetStores() {
  return apiFetch("/stores", {}, getToken()) as Promise<StoreData[]>;
}

// تحديث متجر
async function apiUpdateStore(id: string, data: object) {
  return apiFetch(`/stores/${id}`, { method: "PUT", body: JSON.stringify(data) }, getToken()) as Promise<StoreData>;
}

// حذف متجر
async function apiDeleteStore(id: string) {
  return apiFetch(`/stores/${id}`, { method: "DELETE" }, getToken());
}

// إعادة تعيين كلمة مرور متجر
async function apiResetPass(id: string) {
  return apiFetch(`/stores/${id}/reset-password`, { method: "POST" }, getToken()) as Promise<{newPassword:string}>;
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

type View = "login" | "superadmin" | "store";
type StoreCategory = "supermarket" | "clothing" | "cafe" | "electronics" | "barber";

interface StoreData {
  id: string; nameAr: string; nameEn: string; category: StoreCategory;
  owner: string; email: string; phone: string; city: string;
  status: "active" | "suspended" | "expired" | "trial";
  plan: string; users: number; products: number; sales: number;
  revenue: number; createdAt: string; expiresAt: string; branches: number;
  taxNo?: string;
}
interface Product {
  id: string; nameAr: string; nameEn: string; barcode: string; sku: string;
  category: string; costPrice: number; sellPrice: number; stock: number;
  minStock: number; image: string; unit: string;
}
interface CartItem { product: Product; qty: number; discount: number; }
interface Plan {
  id: string; nameAr: string; price: number; yearlyPrice: number;
  maxBranches: number; maxUsers: number; maxProducts: number;
  maxInvoices: number; maxTerminals: number; storage: string;
  apiAccess: boolean; features: string[]; color: string; badge?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────────────────────────────

const STORES: StoreData[] = [];  // أضف المتاجر من لوحة المدير العام

const PRODUCTS: Product[] = [];  // أضف المنتجات من إدارة المنتجات

const PLANS: Plan[] = [
  { id: "pl1", nameAr: "المبتدئ", price: 15, yearlyPrice: 144, maxBranches: 1, maxUsers: 3, maxProducts: 500, maxInvoices: 1000, maxTerminals: 1, storage: "1 غيغابايت", apiAccess: false, color: "#64748B", features: ["نقطة بيع واحدة", "إدارة المنتجات", "تقارير أساسية", "إدارة العملاء", "دعم عبر البريد"] },
  { id: "pl2", nameAr: "الاحترافي", price: 35, yearlyPrice: 336, maxBranches: 3, maxUsers: 10, maxProducts: 2000, maxInvoices: 5000, maxTerminals: 5, storage: "5 غيغابايت", apiAccess: false, color: "#1D4ED8", badge: "الأكثر شيوعاً", features: ["كل مزايا المبتدئ", "إدارة متعددة الفروع", "تقارير متقدمة", "إدارة المخزون", "ماسح الباركود", "إدارة الموردين", "دعم أولوية"] },
  { id: "pl3", nameAr: "المؤسسي", price: 75, yearlyPrice: 720, maxBranches: 99, maxUsers: 99, maxProducts: 99999, maxInvoices: 99999, maxTerminals: 99, storage: "50 غيغابايت", apiAccess: true, color: "#059669", features: ["كل مزايا الاحترافي", "فروع غير محدودة", "مستخدمون غير محدودون", "وصول API كامل", "تقارير مخصصة", "نظام الولاء والمكافآت", "إدارة المستودعات", "نسخ احتياطي يومي تلقائي", "مدير حساب مخصص"] },
];

const weekData = [
  { day: "السبت", مبيعات: 0, أرباح: 0 }, { day: "الأحد", مبيعات: 0, أرباح: 0 },
  { day: "الاثنين", مبيعات: 0, أرباح: 0 }, { day: "الثلاثاء", مبيعات: 0, أرباح: 0 },
  { day: "الأربعاء", مبيعات: 0, أرباح: 0 }, { day: "الخميس", مبيعات: 0, أرباح: 0 },
  { day: "الجمعة", مبيعات: 0, أرباح: 0 },
];
const monthData = [
  { month: "يناير", إيرادات: 0, مصروفات: 0, أرباح: 0 },
  { month: "فبراير", إيرادات: 0, مصروفات: 0, أرباح: 0 },
  { month: "مارس", إيرادات: 0, مصروفات: 0, أرباح: 0 },
  { month: "أبريل", إيرادات: 0, مصروفات: 0, أرباح: 0 },
  { month: "مايو", إيرادات: 0, مصروفات: 0, أرباح: 0 },
  { month: "يونيو", إيرادات: 0, مصروفات: 0, أرباح: 0 },
];
const hourData = [
  { h: "8ص", v: 0 }, { h: "9ص", v: 0 }, { h: "10ص", v: 0 }, { h: "11ص", v: 0 },
  { h: "12م", v: 0 }, { h: "1م", v: 0 }, { h: "2م", v: 0 }, { h: "3م", v: 0 },
  { h: "4م", v: 0 }, { h: "5م", v: 0 }, { h: "6م", v: 0 }, { h: "7م", v: 0 },
];

const CAT: Record<StoreCategory, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  supermarket: { label: "سوبرماركت",     icon: <ShoppingCart size={15} />, color: "#059669", bg: "#D1FAE5" },
  clothing:    { label: "ملابس",          icon: <ShoppingBag size={15} />, color: "#7C3AED", bg: "#EDE9FE" },
  cafe:        { label: "كافيه",          icon: <Coffee size={15} />,      color: "#D97706", bg: "#FEF3C7" },
  electronics: { label: "إلكترونيات",    icon: <Cpu size={15} />,         color: "#1D4ED8", bg: "#DBEAFE" },
  barber:      { label: "حلاقة وتجميل",  icon: <Scissors size={15} />,    color: "#DB2777", bg: "#FCE7F3" },
};

const ST = {
  active:    { label: "نشط",    dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  trial:     { label: "تجريبي", dot: "bg-blue-500",    badge: "bg-blue-100 text-blue-700 border border-blue-200" },
  suspended: { label: "موقوف",  dot: "bg-red-500",     badge: "bg-red-100 text-red-700 border border-red-200" },
  expired:   { label: "منتهي",  dot: "bg-orange-500",  badge: "bg-orange-100 text-orange-700 border border-orange-200" },
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILS & SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const jod = (n: number) => `${n.toFixed(3)} د.أ`;
const dateAr = () => new Date().toLocaleDateString("ar-JO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const timeAr = () => new Date().toLocaleTimeString("ar-JO", { hour: "2-digit", minute: "2-digit" });


// ── طباعة الإيصال الحقيقية ────────────────────────────────────────────────────
interface ReceiptData {
  invNo: string;
  storeName: string;
  storePhone: string;
  items: { name: string; qty: number; price: number; discount: number }[];
  subtotal: number;
  discountAmt: number;
  taxAmt: number;
  total: number;
  payMethod: string;
  change?: number;
  cashIn?: number;
  date: string;
  time: string;
}

function printReceipt(data: ReceiptData, paper: string = "80mm") {
  const w = paper === "58mm" ? "58mm" : "80mm";
  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Cairo', 'Arial', sans-serif; font-size: 12px; width:${w}; }
  .center { text-align:center; }
  .bold { font-weight: bold; }
  .line { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display:flex; justify-content:space-between; margin:2px 0; }
  .store-name { font-size:16px; font-weight:900; margin-bottom:4px; }
  .inv-no { font-size:11px; color:#555; }
  .item-name { flex:1; }
  .total-row { font-size:14px; font-weight:900; margin-top:4px; }
  .footer { font-size:10px; color:#555; margin-top:8px; }
  @media print { @page { margin:0; size:${w} auto; } body { width:${w}; } }
</style>
</head>
<body>
<div class="center">
  <div class="store-name">${data.storeName}</div>
  <div class="inv-no">${data.storePhone}</div>
  <div class="inv-no">pos.sowwanjo.online</div>
</div>
<div class="line"></div>
<div class="row inv-no"><span>رقم الفاتورة: ${data.invNo}</span><span>${data.date}</span></div>
<div class="inv-no center">${data.time}</div>
<div class="line"></div>
${data.items.map(it => `
<div class="row">
  <span class="item-name">${it.name}</span>
  <span>${it.qty} × ${it.price.toFixed(3)}</span>
  <span class="bold">${(it.qty * it.price * (1 - it.discount/100)).toFixed(3)} JOD</span>
</div>
${it.discount > 0 ? `<div class="inv-no">خصم صنف: ${it.discount}%</div>` : ""}
`).join("")}
<div class="line"></div>
<div class="row"><span>المجموع الفرعي</span><span>${data.subtotal.toFixed(3)} JOD</span></div>
${data.discountAmt > 0 ? `<div class="row"><span>خصم الفاتورة</span><span>-${data.discountAmt.toFixed(3)} JOD</span></div>` : ""}
<div class="row"><span>ضريبة القيمة المضافة 16%</span><span>${data.taxAmt.toFixed(3)} JOD</span></div>
<div class="line"></div>
<div class="row total-row"><span>الإجمالي المستحق</span><span>${data.total.toFixed(3)} JOD</span></div>
<div class="row"><span>طريقة الدفع: ${data.payMethod}</span></div>
${data.cashIn != null ? `<div class="row"><span>المبلغ المستلم</span><span>${(data.cashIn || 0).toFixed(3)} JOD</span></div>` : ""}
${(data.change || 0) > 0 ? `<div class="row bold"><span>الباقي</span><span>${(data.change || 0).toFixed(3)} JOD</span></div>` : ""}
<div class="line"></div>
<div class="center footer">شكراً لتعاملكم معنا<br/>pos.sowwanjo.online</div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=400,height=600");
  if (!win) { alert("الرجاء السماح بالنوافذ المنبثقة لطباعة الإيصال"); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 400);
}

function SBadge({ status }: { status: StoreData["status"] }) {
  const s = ST[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
    </span>
  );
}

function KPI({ icon, label, value, sub, color = "#1D4ED8", trend }: {
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

function Modal({ title, sub, onClose, children, size = "md" }: {
  title: string; sub?: string; onClose: () => void; children: React.ReactNode; size?: "sm" | "md" | "lg";
}) {
  const w = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-2xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}>
      <div className={`bg-card rounded-2xl shadow-2xl w-full ${w[size]} max-h-[92vh] flex flex-col`} dir="rtl">
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <div><h3 className="text-lg font-bold text-foreground">{title}</h3>{sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}</div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors"><X size={15} className="text-muted-foreground" /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

function F({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-foreground">{label}{req && <span className="text-red-500 mr-0.5">*</span>}</label>
      {children}
    </div>
  );
}

function TInput({ value, onChange, placeholder, type = "text", icon, readOnly }: {
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

function SInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="w-full h-10 rounded-xl border border-border bg-input-background text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-primary">
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Btn({ children, onClick, v = "primary", s = "md", icon, cls = "", disabled, full }: {
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

function Hdr({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div><h2 className="text-xl font-bold text-foreground">{title}</h2>{sub && <p className="text-sm text-muted-foreground mt-0.5">{sub}</p>}</div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

function Empty({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
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
function showToast(msg: string, type: ToastT["type"] = "success") {
  const t: ToastT = { id: Date.now() + Math.random(), msg, type };
  _toastListeners.forEach(fn => fn(t));
}
function ToastHost() {
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
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
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
function useLS<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
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
const StoreCtx = createContext<string>("");
const useStoreId = () => useContext(StoreCtx);

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN — SEPARATED (Store / Admin)
// Admin accessible only via clicking logo 5 times (hidden portal)
// ─────────────────────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (type: "superadmin" | "store", id?: string) => void }) {
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
    setLoading(true); setErr("");
    try {
      if (mode === "admin") {
        // ── دخول المدير العام عبر Backend API ──────────────────────
        try {
          const res = await apiLoginAdmin(email, pass);
          setToken(res.token);
          onLogin("superadmin");
        } catch {
          // Fallback محلي إذا Backend غير متوفر
          if (email === "superadmin" && pass === "SA@Jordan#2025!") onLogin("superadmin");
          else setErr("بيانات الدخول غير صحيحة");
        }
      } else {
        // ── دخول المتجر عبر Backend API (يعمل من أي متصفح) ────────
        try {
          const res = await apiLoginStore(email, pass);
          setToken(res.token);
          // حفظ بيانات المتجر محلياً للسرعة
          try { localStorage.setItem(`sowwanjo_storeinfo_${res.store.id}`, JSON.stringify(res.store)); } catch {}
          if (res.store.status === "suspended") { setErr("هذا المتجر موقوف — تواصل مع الدعم الفني."); return; }
          if (res.store.status === "expired") { setErr("انتهت صلاحية اشتراكك — تواصل مع الدعم لتجديده."); return; }
          onLogin("store", res.store.id);
        } catch (apiErr: unknown) {
          const errMsg = (apiErr as {error?:string}).error;
          // Fallback: البحث في localStorage فقط إذا Backend غير متوفر
          if (errMsg && errMsg !== "Failed to fetch") {
            // Backend رد لكن كلمة المرور خاطئة
            setErr(errMsg || "البريد الإلكتروني أو كلمة المرور غير صحيحة");
          } else {
            // Backend غير متوفر — fallback للـ localStorage
            let allStores = STORES;
            try { const s = localStorage.getItem("sowwanjo_sa_stores"); if (s) allStores = JSON.parse(s); } catch {}
            const store = allStores.find(s => s.email.toLowerCase() === email.toLowerCase());
            if (store) {
              let storedPass = "Store@2025";
              try { const sp = localStorage.getItem(`sowwanjo_pass_${store.id}`); if (sp) storedPass = sp; } catch {}
              if (pass !== storedPass) { setErr("البريد الإلكتروني أو كلمة المرور غير صحيحة"); return; }
              if (store.status === "suspended") { setErr("هذا المتجر موقوف."); return; }
              onLogin("store", store.id);
            } else setErr("البريد الإلكتروني أو كلمة المرور غير صحيحة");
          }
        }
      }
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

const SA_NAV = [
  { id: "dashboard",  label: "لوحة التحكم",    icon: <LayoutDashboard size={17} /> },
  { id: "stores",     label: "المتاجر",          icon: <Store size={17} /> },
  { id: "plans",      label: "خطط الاشتراك",    icon: <CreditCard size={17} /> },
  { id: "reports",    label: "التقارير العامة",  icon: <BarChart2 size={17} /> },
  { id: "audit",      label: "سجلات النشاط",    icon: <ClipboardList size={17} /> },
  { id: "tickets",    label: "الدعم الفني",      icon: <Handshake size={17} /> },
  { id: "broadcast",  label: "الإعلانات",        icon: <Send size={17} /> },
  { id: "settings",   label: "إعدادات النظام",  icon: <Settings size={17} /> },
];

function SuperAdminLayout({ onLogout }: { onLogout: () => void }) {
  const [screen, setScreen] = useState("dashboard");
  const [col, setCol] = useState(false);
  const [notif, setNotif] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background" dir="rtl" style={{ fontFamily: "'Cairo',sans-serif" }}>
      {/* Sidebar */}
      <aside className={`${col ? "w-[58px]" : "w-60"} shrink-0 flex flex-col transition-all duration-300`}
        style={{ background: "linear-gradient(180deg,#0F172A 0%,#1A2744 100%)" }}>
        <div className="h-14 flex items-center border-b border-white/7 px-3 gap-3 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Store size={15} className="text-blue-400" />
          </div>
          {!col && <div className="min-w-0"><p className="text-white font-black text-sm truncate">Sowwanjo POS</p><p className="text-white/30 text-xs">لوحة الإدارة العليا</p></div>}
        </div>
        {!col && (
          <div className="mx-3 mt-3 mb-2 p-3 rounded-xl bg-white/5 border border-white/7">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-500/30 flex items-center justify-center shrink-0"><Shield size={12} className="text-blue-400" /></div>
              <div className="min-w-0"><p className="text-white text-xs font-bold">المدير العام</p><p className="text-white/30 text-xs">Super Admin</p></div>
            </div>
          </div>
        )}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {SA_NAV.map(n => (
            <button key={n.id} onClick={() => setScreen(n.id)}
              className={`w-full flex items-center gap-3 h-9 rounded-xl text-xs font-semibold transition-all ${col ? "justify-center px-2" : "px-3"} ${screen === n.id ? "bg-white/10 text-white border border-white/10" : "text-white/50 hover:bg-white/5 hover:text-white/80"}`}
              title={col ? n.label : undefined}>
              <span className="shrink-0">{n.icon}</span>
              {!col && <span>{n.label}</span>}
              {!col && screen === n.id && <span className="mr-auto w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-white/7 space-y-0.5">
          <button onClick={() => setCol(!col)} className={`w-full flex items-center gap-3 h-9 rounded-xl text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-all ${col ? "justify-center" : "px-3"}`}>
            {col ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
            {!col && <span>طي القائمة</span>}
          </button>
          <button onClick={onLogout} className={`w-full flex items-center gap-3 h-9 rounded-xl text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all ${col ? "justify-center" : "px-3"}`}>
            <LogOut size={15} />{!col && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-card border-b border-border flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setCol(!col)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground"><Menu size={16} /></button>
            <div><p className="text-sm font-bold text-foreground">{SA_NAV.find(n => n.id === screen)?.label}</p><p className="text-xs text-muted-foreground">{dateAr()}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setNotif(!notif)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted relative">
                <Bell size={16} className="text-muted-foreground" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-card" />
              </button>
              {notif && (
                <div className="absolute left-0 top-full mt-2 w-80 bg-card rounded-2xl border border-border shadow-2xl z-50 overflow-hidden">
                  <div className="flex justify-between px-4 py-3 border-b border-border">
                    <span className="font-bold text-sm">الإشعارات</span>
                    <button onClick={() => setNotif(false)} className="text-xs text-primary font-semibold">إغلاق</button>
                  </div>
                  {[
                    { t: "انتهى اشتراك سوبرماركت العائلة", dt: "منذ 10 دقائق", c: "bg-red-500" },
                    { t: "متجر ستايل باربر موقوف تلقائياً", dt: "منذ ساعتين", c: "bg-orange-500" },
                    { t: "طلب دعم جديد من إسبريسو عمّان", dt: "منذ 5 ساعات", c: "bg-blue-500" },
                  ].map((n, i) => (
                    <div key={i} className="flex gap-3 px-4 py-3 hover:bg-muted/40 border-b border-border/50 last:border-0">
                      <span className={`w-2 h-2 rounded-full ${n.c} shrink-0 mt-1.5`} />
                      <div><p className="text-xs text-foreground font-medium">{n.t}</p><p className="text-xs text-muted-foreground">{n.dt}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="h-8 px-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-700">النظام يعمل</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          {screen === "dashboard" && <SADash onNav={setScreen} />}
          {screen === "stores"    && <SAStores />}
          {screen === "plans"     && <SAPlans />}
          {screen === "reports"   && <SAReports />}
          {screen === "audit"     && <SAAudit />}
          {screen === "tickets"   && <SATickets />}
          {screen === "broadcast" && <SABroadcast />}
          {screen === "settings"  && <SASettings />}
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SA SCREENS
// ─────────────────────────────────────────────────────────────────────────────

function SADash({ onNav }: { onNav: (s: string) => void }) {
  const total = STORES.reduce((a, s) => a + s.revenue, 0);
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={<Store size={20} />} label="إجمالي المتاجر" value={String(STORES.length)} sub={`${STORES.filter(s => s.status === "active").length} نشط`} color="#1D4ED8" trend={14} />
        <KPI icon={<DollarSign size={20} />} label="إجمالي الإيرادات" value={jod(total)} sub="منذ الإطلاق" color="#059669" trend={22} />
        <KPI icon={<Users size={20} />} label="إجمالي المستخدمين" value={String(STORES.reduce((a, s) => a + s.users, 0))} color="#D97706" trend={9} />
        <KPI icon={<FileText size={20} />} label="إجمالي الفواتير" value={STORES.reduce((a, s) => a + s.sales, 0).toLocaleString()} color="#7C3AED" trend={18} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["active","trial","suspended","expired"] as const).map(st => {
          const count = STORES.filter(s => s.status === st).length;
          return <div key={st} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3"><span className={`w-3 h-3 rounded-full ${ST[st].dot} shrink-0`} /><div><p className="text-xl font-black text-foreground">{count}</p><p className="text-xs text-muted-foreground">{ST[st].label}</p></div></div>;
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-5">
          <p className="font-bold text-foreground mb-1">الإيرادات الشهرية (JOD)</p>
          <p className="text-xs text-muted-foreground mb-4">آخر 6 أشهر</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthData}>
              <defs>
                <linearGradient id="sa-dash-rev" x1="0" y1="0" x2="0" y2="1">
                  <stop key="sa-dash-rev-top" offset="5%" stopColor="#1D4ED8" stopOpacity={0.15} />
                  <stop key="sa-dash-rev-bot" offset="95%" stopColor="#1D4ED8" stopOpacity={0} />
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
              <Area key="area-rev" type="monotone" dataKey="إيرادات" stroke="#1D4ED8" strokeWidth={2.5} fill="url(#sa-dash-rev)" />
              <Area key="area-prof" type="monotone" dataKey="أرباح" stroke="#059669" strokeWidth={2.5} fill="url(#sa-dash-prof)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold text-foreground mb-4">أداء المتاجر</p>
          <div className="space-y-3">
            {STORES.filter(s => s.revenue > 0).sort((a, b) => b.revenue - a.revenue).map((s, i) => {
              const cat = CAT[s.category];
              const max = Math.max(...STORES.map(x => x.revenue), 1);
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="text-xs font-black text-muted-foreground w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-bold text-foreground truncate max-w-[110px]">{s.nameAr}</span>
                      <span className="text-xs font-bold text-foreground">{jod(s.revenue)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full"><div className="h-full rounded-full" style={{ width: `${(s.revenue / max) * 100}%`, backgroundColor: cat.color }} /></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <p className="font-bold text-foreground">قائمة المتاجر</p>
          <Btn v="ghost" s="sm" onClick={() => onNav("stores")} icon={<ChevronLeft size={13} />}>عرض الكل</Btn>
        </div>
        <div className="divide-y divide-border/60">
          {STORES.map(s => {
            const cat = CAT[s.category];
            return (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: cat.bg }}><span style={{ color: cat.color }}>{cat.icon}</span></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-bold text-foreground truncate">{s.nameAr}</p><p className="text-xs text-muted-foreground">{s.owner} • {s.city}</p></div>
                <div className="hidden sm:block text-right shrink-0"><p className="text-sm font-bold text-foreground">{jod(s.revenue)}</p><p className="text-xs text-muted-foreground">{s.sales.toLocaleString()} فاتورة</p></div>
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
  const [stores, setStores] = useLS<StoreData[]>("sowwanjo_sa_stores", STORES);
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
  const [renewStore, setRenewStore] = useState<StoreData | null>(null);
  const [renewMonths, setRenewMonths] = useState("1");
  const [deleteConfirm, setDeleteConfirm] = useState<StoreData | null>(null);
  const [nf, setNf] = useState({ nameAr: "", nameEn: "", category: "supermarket" as StoreCategory, owner: "", email: "", phone: "", city: "", plan: "الاحترافي", taxNo: "" });

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

  const filtered = stores.filter(s =>
    (!q || s.nameAr.includes(q) || s.nameEn.toLowerCase().includes(q.toLowerCase()) || s.owner.includes(q) || s.email.includes(q))
    && (sf === "all" || s.status === sf)
    && (catF === "all" || s.category === catF)
  );

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

  // إنشاء متجر — يُحفظ في MongoDB أولاً ثم localStorage
  const create = async () => {
    setCreating(true);
    try {
      // محاولة الحفظ في Backend
      const res = await apiCreateStore(nf);
      const newStore: StoreData = { ...(res.store as StoreData), id: (res.store as StoreData & {_id?:string})._id || (res.store as StoreData).id };
      setStores(p => [newStore, ...p]);
      setShowNew(false);
      setCreds({ email: nf.email, pass: res.generatedPassword });
      setNf({ nameAr: "", nameEn: "", category: "supermarket", owner: "", email: "", phone: "", city: "", plan: "الاحترافي", taxNo: "" });
      showToast(`تم إنشاء متجر "${nf.nameAr}" وحفظه في قاعدة البيانات ✅`);
    } catch {
      // Fallback: حفظ محلي إذا Backend غير متوفر
      const pw = `Store@${Math.floor(Math.random() * 90000) + 10000}!`;
      const sid = `s${Date.now()}`;
      const ns: StoreData = { id: sid, ...nf, status: "trial", users: 1, products: 0, sales: 0, revenue: 0, createdAt: new Date().toISOString().split("T")[0], expiresAt: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0], branches: 1 };
      try { localStorage.setItem(`sowwanjo_pass_${sid}`, pw); } catch {}
      setStores(p => [ns, ...p]);
      setShowNew(false);
      setCreds({ email: nf.email, pass: pw });
      setNf({ nameAr: "", nameEn: "", category: "supermarket", owner: "", email: "", phone: "", city: "", plan: "الاحترافي", taxNo: "" });
      showToast("تم الحفظ محلياً (Backend غير متوفر حالياً)", "warning");
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
      });
    } catch { /* fallback */ }
    setStores(p => p.map(s => s.id === editStore.id ? editStore : s));
    if (detail?.id === editStore.id) setDetail(editStore);
    showToast(`تم تحديث بيانات "${editStore.nameAr}" بنجاح`);
    setEditStore(null);
  };

  const doResetPass = async (store: StoreData) => {
    try {
      // إعادة تعيين من Backend — يحدّث في MongoDB
      const res = await apiResetPass(store.id);
      setNewPass({ store: store.nameAr, pass: res.newPassword });
    } catch {
      // Fallback محلي
      const pw = `Store@${Math.floor(Math.random() * 90000) + 10000}!`;
      try { localStorage.setItem(`sowwanjo_pass_${store.id}`, pw); } catch {}
      setNewPass({ store: store.nameAr, pass: pw });
    }
    setDetail(null);
  };

  const doRenew = async () => {
    if (!renewStore) return;
    const months = parseInt(renewMonths);
    const newExpiry = new Date(Date.now() + months * 30 * 86400000).toISOString().split("T")[0];
    try {
      await apiUpdateStore(renewStore.id, { status: "active", expiresAt: newExpiry });
    } catch { /* fallback */ }
    setStores(p => p.map(s => s.id === renewStore.id ? { ...s, status: "active" as const, expiresAt: newExpiry } : s));
    if (detail?.id === renewStore.id) setDetail({ ...detail, status: "active", expiresAt: newExpiry });
    showToast(`تم تجديد اشتراك "${renewStore.nameAr}" لمدة ${months} شهر حتى ${newExpiry}`, "success");
    setRenewStore(null);
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/40">
              {["المتجر","الفئة","الخطة","الحالة","الإيرادات","تاريخ الانتهاء","إجراءات"].map(h =>
                <th key={h} className="text-right p-4 font-bold text-muted-foreground text-xs">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map(s => {
                const cat = CAT[s.category];
                const expired = new Date(s.expiresAt) < new Date();
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
                    <td className="p-4 hidden sm:table-cell font-bold text-foreground">{jod(s.revenue)}</td>
                    <td className="p-4 hidden lg:table-cell">
                      <span className={`text-xs font-medium ${expired ? "text-red-600 font-bold" : "text-muted-foreground"}`}>{s.expiresAt}</span>
                      {expired && <span className="block text-xs text-red-500 font-bold">منتهي!</span>}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-0.5">
                        <button onClick={() => setDetail(s)} title="تفاصيل المتجر" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-primary/10 text-primary transition-colors"><Eye size={12} /></button>
                        <button onClick={() => setEditStore({ ...s })} title="تعديل البيانات" className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-100 text-blue-500 transition-colors"><Edit2 size={12} /></button>
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
        </div>
        {filtered.length === 0 && <Empty icon={<Store size={24} />} title="لا توجد متاجر" desc="لم يتم العثور على متاجر تطابق البحث" />}
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
            <F label="خطة الاشتراك"><SInput value={nf.plan} onChange={v => setNf({ ...nf, plan: v })} options={PLANS.map(p => ({ value: p.nameAr, label: `${p.nameAr} — ${p.price} JOD/شهر` }))} /></F>
            <F label="الرقم الضريبي (اختياري)"><TInput value={nf.taxNo} onChange={v => setNf({ ...nf, taxNo: v })} placeholder="JO-XXXXXXXX" icon={<Hash size={13} />} /></F>
          </div>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-1">
            <p className="font-bold">✅ سيتم تلقائياً عند الإنشاء:</p>
            <p>• توليد كلمة مرور عشوائية آمنة للمتجر</p>
            <p>• إنشاء حساب معزول بـ store_id خاص</p>
            <p>• فترة تجريبية مجانية 14 يوماً</p>
            <p>• تفعيل الوحدات المناسبة لفئة المتجر</p>
          </div>
          <div className="flex gap-3 mt-5 justify-end">
            <Btn v="secondary" onClick={() => setShowNew(false)}>إلغاء</Btn>
            <Btn icon={creating ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />} onClick={create} disabled={!nf.nameAr || !nf.email || !nf.owner || creating}>{creating ? "جاري الإنشاء..." : "إنشاء المتجر"}</Btn>
          </div>
        </Modal>
      )}

      {/* ── Credentials Modal ── */}
      {creds && (
        <Modal title="✅ تم إنشاء المتجر بنجاح" sub="احتفظ بهذه البيانات وأرسلها لصاحب المتجر فقط" onClose={() => setCreds(null)} size="sm">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle size={30} className="text-emerald-600" /></div>
            <div className="bg-muted rounded-xl p-4 space-y-2.5 font-mono text-sm border border-border text-right">
              <div className="flex justify-between items-center"><span className="text-muted-foreground">رابط الدخول</span><span className="font-bold text-xs text-primary">pos.sowwanjo.online</span></div>
              <div className="flex justify-between items-center"><span className="text-muted-foreground">البريد</span><span className="font-bold text-xs">{creds.email}</span></div>
              <div className="flex justify-between items-center"><span className="text-muted-foreground">كلمة المرور</span><span className="font-bold text-primary">{creds.pass}</span></div>
            </div>
            <div className="text-xs text-amber-700 p-3 bg-amber-50 border border-amber-200 rounded-xl">⚠️ لن تظهر كلمة المرور مجدداً — احفظها الآن</div>
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
            <F label="خطة الاشتراك"><SInput value={editStore.plan} onChange={v => setEditStore({...editStore, plan: v})} options={[...PLANS.map(p => ({ value: p.nameAr, label: `${p.nameAr} — ${p.price} JOD/شهر` })), { value: "تجريبي", label: "تجريبي (مجاني)" }]} /></F>
            <F label="حالة المتجر"><SInput value={editStore.status} onChange={v => setEditStore({...editStore, status: v as StoreData["status"]})} options={[{ value: "active", label: "نشط" }, { value: "trial", label: "تجريبي" }, { value: "suspended", label: "موقوف" }, { value: "expired", label: "منتهي" }]} /></F>
            <F label="تاريخ انتهاء الاشتراك"><TInput value={editStore.expiresAt} onChange={v => setEditStore({...editStore, expiresAt: v})} type="date" /></F>
            <F label="الرقم الضريبي"><TInput value={editStore.taxNo || ""} onChange={v => setEditStore({...editStore, taxNo: v})} placeholder="JO-XXXXXXXX" icon={<Hash size={13}/>} /></F>
          </div>
          <div className="flex gap-3 mt-5 justify-end">
            <Btn v="secondary" onClick={() => setEditStore(null)}>إلغاء</Btn>
            <Btn onClick={doEdit} icon={<Check size={14}/>}>حفظ التعديلات</Btn>
          </div>
        </Modal>
      )}

      {/* ── Store Details Modal ── */}
      {detail && (
        <Modal title={detail.nameAr} sub={`${CAT[detail.category].label} • ${detail.city} • ${detail.email}`} onClose={() => setDetail(null)} size="lg">
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[{ l: "مستخدمون", v: detail.users, color: "#1D4ED8" }, { l: "منتجات", v: detail.products, color: "#059669" }, { l: "فواتير", v: detail.sales, color: "#D97706" }, { l: "فروع", v: detail.branches, color: "#7C3AED" }].map(x => (
                <div key={x.l} className="rounded-xl p-3 text-center border border-border" style={{ backgroundColor: `${x.color}08` }}>
                  <p className="text-2xl font-black" style={{ color: x.color }}>{x.v}</p>
                  <p className="text-xs text-muted-foreground">{x.l}</p>
                </div>
              ))}
            </div>
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[["المالك", detail.owner], ["الهاتف", detail.phone], ["البريد الإلكتروني", detail.email], ["الخطة الحالية", detail.plan], ["إجمالي الإيرادات", jod(detail.revenue)], ["تاريخ الإنشاء", detail.createdAt], ["انتهاء الاشتراك", detail.expiresAt], ["الحالة", ST[detail.status].label], ["الفئة", CAT[detail.category].label], ["الرقم الضريبي", detail.taxNo || "—"]].map(([l, v]) => (
                <div key={l} className="flex justify-between border-b border-border/60 pb-2 last:border-0">
                  <span className="text-muted-foreground text-xs">{l}</span>
                  <span className="font-bold text-xs text-right">{v}</span>
                </div>
              ))}
            </div>
            {/* Subscription status bar */}
            <div className={`p-3 rounded-xl border text-sm font-semibold flex items-center gap-2 ${new Date(detail.expiresAt) < new Date() ? "bg-red-50 border-red-200 text-red-700" : new Date(detail.expiresAt) < new Date(Date.now() + 7 * 86400000) ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
              {new Date(detail.expiresAt) < new Date() ? <><XCircle size={16} /> الاشتراك منتهي — يجب التجديد</> : new Date(detail.expiresAt) < new Date(Date.now() + 7 * 86400000) ? <><AlertTriangle size={16} /> ينتهي الاشتراك خلال أقل من أسبوع</> : <><CheckCircle size={16} /> الاشتراك نشط حتى {detail.expiresAt}</>}
            </div>
            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Btn v="secondary" s="sm" icon={<Edit2 size={12} />} onClick={() => { setEditStore({ ...detail }); setDetail(null); }}>تعديل البيانات</Btn>
              <Btn v="secondary" s="sm" icon={<CreditCard size={12} />} onClick={() => { setRenewStore(detail); setDetail(null); }}>تجديد الاشتراك</Btn>
              <Btn v="secondary" s="sm" icon={<Key size={12} />} onClick={() => doResetPass(detail)}>إعادة تعيين كلمة المرور</Btn>
              <Btn v="secondary" s="sm" icon={<Download size={12} />} onClick={() => doExport(detail)}>تصدير بيانات المتجر</Btn>
              <Btn v={detail.status === "active" ? "warning" : "success"} s="sm" icon={detail.status === "active" ? <Lock size={12} /> : <Unlock size={12} />}
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
            <F label="الخطة"><SInput value={renewStore.plan} onChange={v => setRenewStore({...renewStore, plan: v})} options={PLANS.map(p => ({ value: p.nameAr, label: `${p.nameAr} — ${p.price} JOD/شهر` }))} /></F>
            <F label="مدة التجديد">
              <SInput value={renewMonths} onChange={setRenewMonths} options={[{ value: "1", label: "شهر واحد" }, { value: "3", label: "3 أشهر (وفر 5%)" }, { value: "6", label: "6 أشهر (وفر 10%)" }, { value: "12", label: "سنة كاملة (وفر 32%)" }]} />
            </F>
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">انتهاء الاشتراك الجديد:</span><span className="font-black text-emerald-700">{new Date(Date.now() + parseInt(renewMonths) * 30 * 86400000).toISOString().split("T")[0]}</span></div>
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
      {newPass && (
        <Modal title="كلمة المرور الجديدة" sub={`لمتجر: ${newPass.store}`} onClose={() => setNewPass(null)} size="sm">
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto"><Key size={26} className="text-blue-600" /></div>
            <div className="bg-muted rounded-xl p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">كلمة المرور الجديدة</p>
              <p className="text-2xl font-black font-mono text-primary">{newPass.pass}</p>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">⚠️ أرسل كلمة المرور لصاحب المتجر فوراً عبر قناة آمنة</p>
            <div className="flex gap-2">
              <Btn v="secondary" full icon={<Copy size={13} />} onClick={() => { navigator.clipboard?.writeText(newPass.pass); showToast("تم نسخ كلمة المرور"); }}>نسخ</Btn>
              <Btn full onClick={() => setNewPass(null)}>إغلاق</Btn>
            </div>
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
              <p className="text-xs text-muted-foreground">{deleteConfirm.email} • {deleteConfirm.sales.toLocaleString()} فاتورة • {jod(deleteConfirm.revenue)}</p>
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
  return (
    <div className="p-6 space-y-6">
      <Hdr title="خطط الاشتراك" sub="إدارة وتخصيص الخطط وتعيينها للمتاجر" action={<Btn icon={<Plus size={14} />}>خطة جديدة</Btn>} />
      <div className="flex bg-muted rounded-2xl p-1 w-fit border border-border">
        <button onClick={() => setBilling("m")} className={`px-6 h-9 rounded-xl text-sm font-bold transition-all ${billing === "m" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>شهري</button>
        <button onClick={() => setBilling("y")} className={`px-6 h-9 rounded-xl text-sm font-bold transition-all ${billing === "y" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>سنوي (خصم 32%)</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map(plan => (
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
              {[["فروع", plan.maxBranches === 99 ? "∞" : plan.maxBranches], ["مستخدمون", plan.maxUsers === 99 ? "∞" : plan.maxUsers], ["منتجات", plan.maxProducts > 9999 ? "∞" : plan.maxProducts.toLocaleString()], ["فواتير/شهر", plan.maxInvoices > 9999 ? "∞" : plan.maxInvoices.toLocaleString()]].map(([l, vv]) =>
                <div key={String(l)} className="bg-muted/60 rounded-xl p-2.5 text-center"><p className="font-black text-foreground text-base">{vv}</p><p className="text-muted-foreground">{l}</p></div>)}
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {plan.features.map(f => <li key={f} className="flex items-center gap-2 text-xs"><CheckCircle size={12} className="text-emerald-500 shrink-0" />{f}</li>)}
            </ul>
            <div className="flex gap-2"><Btn v="secondary" s="sm" cls="flex-1" icon={<Edit2 size={11} />}>تعديل</Btn><Btn v={plan.badge ? "primary" : "ghost"} s="sm" cls="flex-1">{plan.badge ? "محدد" : "تحديد"}</Btn></div>
          </div>
        ))}
      </div>
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border font-bold text-foreground">اشتراكات المتاجر الحالية</div>
        <div className="divide-y divide-border/60">
          {STORES.map(s => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20">
              <div className="flex-1 min-w-0"><p className="text-sm font-bold">{s.nameAr}</p><p className="text-xs text-muted-foreground">{s.email}</p></div>
              <span className="hidden sm:block text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{s.plan}</span>
              <SBadge status={s.status} />
              <div className="hidden md:block text-xs text-muted-foreground">انتهاء: {s.expiresAt}</div>
              <div className="flex gap-1.5"><Btn v="secondary" s="xs">تجديد</Btn><Btn v="ghost" s="xs" icon={<TrendingUp size={11} />}>ترقية</Btn><Btn v="ghost" s="xs" icon={<TrendingDown size={11} />}>تخفيض</Btn></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SAReports() {
  return (
    <div className="p-6 space-y-5">
      <Hdr title="التقارير العامة" sub="نظرة شاملة على أداء المنصة" action={<><Btn v="secondary" s="sm" icon={<Download size={14} />} onClick={() => showToast("جاري إعداد تقرير PDF الشامل...", "info")}>PDF</Btn><Btn v="secondary" s="sm" icon={<Download size={14} />} onClick={() => showToast("جاري تصدير ملف Excel...", "info")}>Excel</Btn></>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={<DollarSign size={20} />} label="إجمالي الإيرادات" value="158,940 JOD" sub="هذا العام" color="#1D4ED8" trend={24} />
        <KPI icon={<FileText size={20} />} label="إجمالي الفواتير" value="8,520" sub="هذا العام" color="#059669" trend={18} />
        <KPI icon={<TrendingUp size={20} />} label="متوسط الفاتورة" value="18.65 JOD" color="#D97706" trend={5} />
        <KPI icon={<Store size={20} />} label="معدل الاحتفاظ" value="87.3%" color="#7C3AED" trend={3} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-4">الإيرادات مقابل المصروفات (JOD)</p>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={monthData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v / 1000}k`} />
              <Tooltip formatter={(v: number) => [`${v.toLocaleString()} JOD`]} />
              <Bar key="bar-rev" dataKey="إيرادات" fill="#1D4ED8" radius={[5, 5, 0, 0]} />
              <Bar key="bar-exp" dataKey="مصروفات" fill="#E2E8F0" radius={[5, 5, 0, 0]} />
              <Bar key="bar-prof" dataKey="أرباح" fill="#059669" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-4">المبيعات الأسبوعية</p>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={weekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [`${v} JOD`]} />
              <Line key="line-sales" type="monotone" dataKey="مبيعات" stroke="#1D4ED8" strokeWidth={2.5} dot={false} />
              <Line key="line-prof" type="monotone" dataKey="أرباح" stroke="#059669" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function SAAudit() {
  const logs: {user:string;action:string;target:string;time:string;date:string;ip:string;device:string}[] = [];
  const AC: Record<string, string> = { "تسجيل دخول": "text-blue-600 bg-blue-50", "إضافة منتج": "text-emerald-600 bg-emerald-50", "إصدار فاتورة": "text-purple-600 bg-purple-50", "تعديل سعر": "text-orange-600 bg-orange-50" };
  return (
    <div className="p-6 space-y-5">
      <Hdr title="سجلات النشاط والتدقيق" action={<Btn v="secondary" s="sm" icon={<Download size={14} />} onClick={() => showToast("جاري تصدير سجلات التدقيق...", "info")}>تصدير</Btn>} />
      <div className="bg-card rounded-2xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/40">{["المستخدم","الإجراء","الهدف","التاريخ","الوقت","عنوان IP","الجهاز"].map(h => <th key={h} className="text-right p-4 font-bold text-muted-foreground text-xs">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-border/60">
            {[...logs,...logs].map((l, i) => (
              <tr key={i} className="hover:bg-muted/20">
                <td className="p-4 font-semibold text-xs">{l.user}</td>
                <td className="p-4"><span className={`text-xs font-bold px-2.5 py-1 rounded-full ${AC[l.action] || "bg-muted"}`}>{l.action}</span></td>
                <td className="p-4 text-xs text-muted-foreground">{l.target}</td>
                <td className="p-4 text-xs text-muted-foreground">{l.date}</td>
                <td className="p-4 text-xs font-mono text-muted-foreground">{l.time}</td>
                <td className="p-4 text-xs font-mono text-muted-foreground">{l.ip}</td>
                <td className="p-4 text-xs text-muted-foreground">{l.device}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SATickets() {
  const tickets = [
    { id: "TK-001", store: "إسبريسو عمّان", subject: "مشكلة في طباعة الإيصالات", priority: "عالية", status: "open", date: "2024-12-11" },
    { id: "TK-002", store: "هدى للأزياء", subject: "كيفية إضافة المتغيرات للمنتجات", priority: "متوسطة", status: "pending", date: "2024-12-10" },
    { id: "TK-003", store: "سوبرماركت المدينة", subject: "طلب تقرير مخصص", priority: "منخفضة", status: "closed", date: "2024-12-09" },
  ];
  const PR: Record<string, string> = { عالية: "text-red-600 bg-red-50 border-red-200", متوسطة: "text-orange-600 bg-orange-50 border-orange-200", منخفضة: "text-blue-600 bg-blue-50 border-blue-200" };
  const SR: Record<string, string> = { open: "text-emerald-700 bg-emerald-100", pending: "text-amber-700 bg-amber-100", closed: "text-gray-600 bg-gray-100" };
  const SL: Record<string, string> = { open: "مفتوح", pending: "قيد الانتظار", closed: "مغلق" };
  return (
    <div className="p-6 space-y-4">
      <Hdr title="تذاكر الدعم الفني" sub={`${tickets.filter(t => t.status !== "closed").length} تذاكر مفتوحة`} />
      <div className="space-y-3">
        {tickets.map(t => (
          <div key={t.id} className="bg-card rounded-2xl border border-border p-5 flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-mono text-muted-foreground">{t.id}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${PR[t.priority]}`}>{t.priority}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${SR[t.status]}`}>{SL[t.status]}</span>
              </div>
              <p className="font-bold text-foreground">{t.subject}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.store} • {t.date}</p>
            </div>
            <div className="flex gap-2 shrink-0"><Btn s="sm" icon={<Send size={12} />}>رد</Btn>{t.status !== "closed" && <Btn v="secondary" s="sm">إغلاق</Btn>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SABroadcast() {
  const [msg, setMsg] = useState(""); const [target, setTarget] = useState("all"); const [sent, setSent] = useState(false);
  return (
    <div className="p-6 space-y-5">
      <Hdr title="مركز الإعلانات" sub="إرسال رسائل ومستجدات لجميع المتاجر أو لمتجر محدد" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <p className="font-bold">إرسال إعلان جديد</p>
          <F label="المستهدف"><SInput value={target} onChange={setTarget} options={[{ value: "all", label: "جميع المتاجر" }, { value: "active", label: "النشطة فقط" }, ...STORES.map(s => ({ value: s.id, label: s.nameAr }))]} /></F>
          <F label="نص الإعلان" req><textarea value={msg} onChange={e => setMsg(e.target.value)} rows={5} placeholder="اكتب نص الإعلان..." className="w-full rounded-xl border border-border bg-input-background text-sm text-foreground px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring/25 resize-none" /></F>
          {sent && <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm"><CheckCircle size={14} /> تم الإرسال بنجاح!</div>}
          <Btn full icon={<Send size={15} />} disabled={!msg} onClick={() => { setSent(true); setMsg(""); setTimeout(() => setSent(false), 3000); }}>إرسال الآن</Btn>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-4">الإعلانات السابقة</p>
          <div className="space-y-3">
            {([]).map((p: {t:string;d:string;type:string}, i: number) => (
              <div key={i} className="border border-border rounded-xl p-4">
                <div className="flex justify-between mb-1.5"><span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{p.type}</span><span className="text-xs text-muted-foreground">{p.d}</span></div>
                <p className="text-sm">{p.t}</p>
              </div>
            ))}
          </div>
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
  const [backupOn, setBackupOn] = useState(true);
  const [syncOn, setSyncOn] = useState(true);
  const [auditOn, setAuditOn] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);

  const doSave = () => showToast("تم حفظ إعدادات النظام بنجاح ✓", "success");
  const doBackup = () => {
    setBackupLoading(true);
    setTimeout(() => { setBackupLoading(false); showToast("تم إنشاء النسخة الاحتياطية وحفظها بنجاح", "success"); }, 1800);
  };

  return (
    <div className="p-6 space-y-5">
      <Hdr title="إعدادات النظام" action={<Btn v="success" s="sm" icon={<Check size={14} />} onClick={doSave}>حفظ الإعدادات</Btn>} />
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STORE LAYOUT
// ─────────────────────────────────────────────────────────────────────────────

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
  const store: StoreData = storeFromLS || { id: storeId, nameAr: "متجري", nameEn: "My Store", category: "supermarket" as StoreCategory, owner: "", email: "", phone: "", city: "", status: "active" as const, plan: "مبتدئ", users: 0, products: 0, sales: 0, revenue: 0, createdAt: new Date().toISOString().split("T")[0], expiresAt: new Date(Date.now() + 365*86400000).toISOString().split("T")[0], branches: 1 };
  const [screen, setScreen] = useState("dashboard");
  const [col, setCol] = useState(false);
  const cat = CAT[store.category];
  return (
    <div className="flex h-screen overflow-hidden bg-background" dir="rtl" style={{ fontFamily: "'Cairo',sans-serif" }}>
      <aside className={`${col ? "w-[50px]" : "w-56"} shrink-0 flex flex-col transition-all duration-300`} style={{ background: "#0F172A" }}>
        <div className="h-14 flex items-center gap-2.5 px-3 border-b border-white/7 shrink-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${cat.color}25` }}>
            <span style={{ color: cat.color }}>{cat.icon}</span>
          </div>
          {!col && <div className="min-w-0"><p className="text-white font-bold text-xs leading-tight truncate">{store.nameAr}</p><p className="text-white/30 text-xs">{cat.label}</p></div>}
        </div>
        <nav className="flex-1 px-1.5 py-2 space-y-0.5 overflow-y-auto">
          {STORE_NAV.map(n => (
            <button key={n.id} onClick={() => setScreen(n.id)}
              className={`w-full flex items-center gap-2.5 h-8 rounded-xl text-xs font-semibold transition-all ${col ? "justify-center px-1.5" : "px-2.5"} ${screen === n.id ? "bg-white/10 text-white" : "text-white/45 hover:bg-white/5 hover:text-white/80"}`}
              title={col ? n.label : undefined}>
              <span className="shrink-0">{n.icon}</span>
              {!col && <span className="truncate">{n.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-1.5 border-t border-white/7 space-y-0.5">
          {!col && <div className="px-2.5 py-2 rounded-xl bg-white/4"><p className="text-white/40 text-xs">{store.plan}</p><p className="text-white/25 text-xs">ينتهي {store.expiresAt}</p></div>}
          <button onClick={() => setCol(!col)} className="w-full flex items-center justify-center h-8 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5">
            {col ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
          </button>
          <button onClick={onLogout} className={`w-full flex items-center gap-2 h-8 rounded-xl text-xs text-red-400/60 hover:text-red-400 hover:bg-red-500/10 ${col ? "justify-center" : "px-2.5"}`}>
            <LogOut size={13} />{!col && "تسجيل الخروج"}
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setCol(!col)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground"><Menu size={15} /></button>
            <div><p className="text-sm font-bold">{STORE_NAV.find(n => n.id === screen)?.label}</p><p className="text-xs text-muted-foreground">{dateAr()} • {timeAr()}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> نشط
            </span>
            <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground"><Bell size={15} /></button>
          </div>
        </header>
        <main className="flex-1 overflow-hidden">
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
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STORE DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function StoreDash({ store }: { store: StoreData }) {
  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={<ShoppingCart size={18} />} label="مبيعات اليوم" value="0.000 JOD" sub="0 فاتورة" color="#1D4ED8" trend={12} />
        <KPI icon={<DollarSign size={18} />} label="إيرادات الشهر" value="0.000 JOD" color="#059669" trend={18} />
        <KPI icon={<Package size={18} />} label="المنتجات" value={store.products.toString()} sub="5 منخفضة المخزون" color="#D97706" />
        <KPI icon={<Users size={18} />} label="العملاء" value="0" sub="لا يوجد عملاء بعد" color="#7C3AED" trend={8} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[{ c: "bg-emerald-50 border-emerald-200", ic: <CheckCircle size={20} className="text-emerald-600" />, n: "38", l: "فواتير اليوم", tc: "text-emerald-700" },
          { c: "bg-amber-50 border-amber-200", ic: <AlertTriangle size={20} className="text-amber-600" />, n: "5", l: "مخزون منخفض", tc: "text-amber-700" },
          { c: "bg-blue-50 border-blue-200", ic: <RotateCcw size={20} className="text-blue-600" />, n: "3", l: "مرتجعات اليوم", tc: "text-blue-700" }].map(x => (
          <div key={x.l} className={`${x.c} border rounded-2xl p-4 flex items-center gap-3`}>{x.ic}<div><p className={`text-xl font-black ${x.tc}`}>{x.n}</p><p className={`text-xs ${x.tc}`}>{x.l}</p></div></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-4">مبيعات وأرباح الأسبوع (JOD)</p>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={weekData} barGap={4}>
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
            <AreaChart data={hourData}>
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
            {[{ id: "INV-0234", n: "أحمد سالم", a: 12.75, m: "نقدي", t: "10:45", c: "text-emerald-600" }, { id: "INV-0233", n: "منى حسين", a: 8.5, m: "كليك", t: "10:21", c: "text-blue-600" }, { id: "INV-0232", n: "عمر طاهر", a: 24.3, m: "نقدي", t: "09:58", c: "text-emerald-600" }, { id: "INV-0231", n: "ريم كمال", a: 6.25, m: "كليك", t: "09:34", c: "text-blue-600" }].map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border/60 last:border-0">
                <div><p className="text-sm font-bold">{inv.id}</p><p className="text-xs text-muted-foreground">{inv.n} • {inv.t}</p></div>
                <div className="text-right"><p className="text-sm font-bold">{inv.a.toFixed(3)} JOD</p><p className={`text-xs font-bold ${inv.c}`}>{inv.m}</p></div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-3">تنبيهات المخزون</p>
          <div className="space-y-2">
            {PRODUCTS.filter(p => p.stock <= p.minStock + 15).slice(0, 5).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">لا توجد منتجات منخفضة المخزون</p>
            ) : null}
            {PRODUCTS.filter(p => p.stock <= p.minStock + 15).slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center gap-3 py-2 border-b border-border/60 last:border-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${p.stock <= p.minStock ? "bg-red-500" : "bg-amber-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{p.nameAr}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="flex-1 h-1 bg-muted rounded-full"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (p.stock / p.minStock) * 100)}%`, backgroundColor: p.stock <= p.minStock ? "#DC2626" : "#D97706" }} /></div>
                    <span className={`text-xs font-bold shrink-0 ${p.stock <= p.minStock ? "text-red-600" : "text-amber-600"}`}>{p.stock}/{p.minStock}</span>
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
  const [allProds, setAllProds] = useLS<Product[]>(sk(sid, "products"), PRODUCTS);
  const [cart, setCart] = useLS<CartItem[]>(sk(sid,"pos_cart"), []);  // السلة تبقى بعد الـ refresh
  const [holds, setHolds] = useLS<CartItem[][]>(sk(sid,"pos_holds"), []); // الطلبات المعلقة
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("الكل");
  const [disc, setDisc] = useState(0);
  const [pay, setPay] = useState<"cash" | "click" | "split">("cash");
  const [cash, setCash] = useState("");
  const [showPay, setShowPay] = useState(false);
  const [ok, setOk] = useState(false);
  const [vm, setVm] = useLS<"grid"|"list">(sk(sid,"pos_vm"), "grid");
  const [paper, setPaper] = useState("80mm");
  const invNoRef = useRef(`INV-${new Date().getFullYear()}${String(Date.now()).slice(-6)}`);
  const invNo = invNoRef.current;
  const TAX = 0.16;
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
    storeName: store.nameAr,
    storePhone: store.phone,
    items: cart.map(i => ({ name: i.product.nameAr, qty: i.qty, price: i.product.sellPrice, discount: i.discount })),
    subtotal: sub, discountAmt: da, taxAmt: ta, total,
    payMethod: pay === "cash" ? "نقدي" : pay === "click" ? "كليك" : "مختلط",
    change: change > 0 ? change : undefined,
    cashIn: pay === "cash" ? parseFloat(cash || "0") : undefined,
    date: new Date().toLocaleDateString("ar-JO"),
    time: new Date().toLocaleTimeString("ar-JO", { hour: "2-digit", minute: "2-digit" }),
  }, paper);

  const doPay = () => {
    // Deduct stock
    setAllProds(prev => prev.map(p => {
      const item = cart.find(i => i.product.id === p.id);
      return item ? { ...p, stock: Math.max(0, p.stock - item.qty) } : p;
    }));
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
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث بالاسم، الباركود، SKU..." className="w-full h-10 rounded-xl border border-border bg-background text-sm pr-9 pl-3 focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-primary" />
            </div>
            <button title="مسح الباركود" className="w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground"><Scan size={16} /></button>
            <button onClick={() => setVm(v => v === "grid" ? "list" : "grid")} className="w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground">
              {vm === "grid" ? <List size={16} /> : <Grid3X3 size={16} />}
            </button>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {cats.map(c => <button key={c} onClick={() => setCat(c)} className={`shrink-0 px-3 h-7 rounded-full text-xs font-bold border transition-all ${cat === c ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}>{c}</button>)}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {vm === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
              {prods.map(p => {
                const inCart = cart.find(i => i.product.id === p.id);
                const low = p.stock <= p.minStock;
                return (
                  <button key={p.id} onClick={() => add(p)} className={`bg-card rounded-2xl border-2 p-3 text-right hover:shadow-md transition-all hover:-translate-y-0.5 active:scale-95 ${inCart ? "border-primary shadow-md" : "border-border"}`}>
                    <div className="aspect-square rounded-xl bg-muted/40 mb-2 overflow-hidden relative">
                      <img src={p.image} alt={p.nameAr} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      {low && <div className="absolute top-1 left-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">منخفض</div>}
                    </div>
                    <p className="text-xs font-bold leading-tight line-clamp-2 mb-1">{p.nameAr}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-primary">{p.sellPrice.toFixed(3)}</span>
                      <span className={`text-xs font-bold ${low ? "text-red-500" : "text-emerald-600"}`}>{p.stock}</span>
                    </div>
                    {inCart && <div className="mt-1.5 bg-primary text-white rounded-full text-xs font-black text-center py-0.5">{inCart.qty} في السلة</div>}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1.5">
              {prods.map(p => {
                const inCart = cart.find(i => i.product.id === p.id);
                return (
                  <button key={p.id} onClick={() => add(p)} className={`w-full flex items-center gap-3 bg-card rounded-xl border p-3 text-right hover:shadow-sm transition-all ${inCart ? "border-primary" : "border-border"}`}>
                    <img src={p.image} alt={p.nameAr} className="w-12 h-12 rounded-xl object-cover bg-muted shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate">{p.nameAr}</p><p className="text-xs text-muted-foreground">{p.sku} • {p.category}</p></div>
                    <div className="text-right shrink-0"><p className="text-sm font-black text-primary">{p.sellPrice.toFixed(3)} JOD</p><p className={`text-xs ${p.stock <= p.minStock ? "text-red-500" : "text-emerald-600"}`}>{p.stock}</p></div>
                    {inCart && <div className="w-6 h-6 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center shrink-0">{inCart.qty}</div>}
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
      <div className="w-80 bg-card flex flex-col border-l border-border shrink-0">
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
                      <button onClick={() => upd(item.product.id, -1)} className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center hover:bg-red-100 hover:text-red-600"><Minus size={10} /></button>
                      <span className="w-8 text-center text-sm font-black">{item.qty}</span>
                      <button onClick={() => upd(item.product.id, 1)} className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20"><Plus size={10} /></button>
                    </div>
                    <span className="text-sm font-black">{(item.product.sellPrice * item.qty * (1 - item.discount / 100)).toFixed(3)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground shrink-0">خصم:</span>
                    <input type="number" value={item.discount} min={0} max={100} onChange={e => updd(item.product.id, Number(e.target.value))} className="w-14 h-6 rounded-lg border border-border bg-input-background text-xs text-center focus:outline-none" />
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
                {(["cash","click","split"] as const).map(m => <button key={m} onClick={() => setPay(m)} className={`px-1.5 h-8 rounded-xl text-xs font-bold transition-all ${pay === m ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}>{m === "cash" ? "نقدي" : m === "click" ? "كليك" : "مختلط"}</button>)}
              </div>
            </div>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground"><span>المجموع الفرعي</span><span className="font-bold">{sub.toFixed(3)} JOD</span></div>
            {disc > 0 && <div className="flex justify-between text-emerald-600"><span>خصم {disc}%</span><span>-{da.toFixed(3)} JOD</span></div>}
            <div className="flex justify-between text-muted-foreground"><span>ضريبة المبيعات 16%</span><span>{ta.toFixed(3)} JOD</span></div>
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
            <div className="grid grid-cols-3 gap-2">
              {(["cash","click","split"] as const).map(m => <button key={m} onClick={() => setPay(m)} className={`h-12 rounded-2xl text-sm font-black border-2 transition-all ${pay === m ? "border-primary bg-primary text-white" : "border-border hover:border-primary/40"}`}>{m === "cash" ? "💵 نقدي" : m === "click" ? "💳 كليك" : "🔀 مختلط"}</button>)}
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
            {pay === "click" && <div className="text-center py-6 bg-blue-50 border-2 border-blue-200 rounded-2xl"><CreditCard size={36} className="mx-auto mb-3 text-blue-500" /><p className="font-bold text-blue-700">في انتظار الدفع عبر كليك</p><p className="text-xs text-blue-500 mt-1">اطلب من العميل إتمام الدفع</p></div>}
            {pay === "split" && <div className="space-y-2"><div className="flex justify-between items-center p-3 border border-border rounded-xl"><span className="text-sm font-semibold">نقدي</span><TInput value={cash} onChange={setCash} placeholder="0.000" type="number" /></div><div className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded-xl"><span className="text-sm font-semibold text-blue-700">كليك</span><span className="font-bold text-blue-700">{Math.max(0, total - parseFloat(cash || "0")).toFixed(3)} JOD</span></div></div>}
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
  const [prods, setProds] = useLS<Product[]>(sk(sid, "products"), PRODUCTS);
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

  const save = () => {
    if (!f.nameAr || !f.sellPrice) return;
    const p: Product = {
      id: `p${Date.now()}`, ...f,
      costPrice: parseFloat(f.costPrice) || 0,
      sellPrice: parseFloat(f.sellPrice) || 0,
      stock: parseInt(f.stock) || 0,
      minStock: parseInt(f.minStock) || 5,
      image: f.image || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&h=100&fit=crop",
    };
    setProds(prev => [p, ...prev]);
    showToast(`تم إضافة "${p.nameAr}" بنجاح`);
    setShowAdd(false); setF(emptyF); setOfoResult(null); setOfoError("");
  };

  const saveEdit = () => {
    if (!editProd) return;
    setProds(prev => prev.map(p => p.id === editProd.id ? editProd : p));
    showToast(`تم تحديث "${editProd.nameAr}"`);
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
    <div className="p-5 space-y-4 overflow-y-auto h-full">
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
          <div className="overflow-x-auto">
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
                      <td className="p-3.5 font-mono text-xs text-muted-foreground hidden md:table-cell">{p.barcode}</td>
                      <td className="p-3.5"><span className="text-xs bg-muted px-2 py-0.5 rounded-full">{p.category}</span></td>
                      <td className="p-3.5 text-muted-foreground text-xs">{p.costPrice.toFixed(3)}</td>
                      <td className="p-3.5 font-bold">{p.sellPrice.toFixed(3)} JOD</td>
                      <td className="p-3.5"><div className="flex items-center gap-1"><span className={`font-black ${low ? "text-red-600" : ""}`}>{p.stock}</span>{low && <AlertTriangle size={11} className="text-red-500" />}</div></td>
                      <td className="p-3.5"><span className={`font-bold text-xs ${mg > 30 ? "text-emerald-600" : mg > 10 ? "text-amber-600" : "text-red-500"}`}>{mg.toFixed(1)}%</span></td>
                      <td className="p-3.5">{p.stock === 0 ? <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">نفد</span> : low ? <span className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">منخفض</span> : <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">مناسب</span>}</td>
                      <td className="p-3.5"><div className="flex gap-0.5">
                        <button onClick={() => setEditProd({ ...p })} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-100 text-blue-500"><Edit2 size={11} /></button>
                        <button onClick={() => { setProds(prev => prev.filter(x => x.id !== p.id)); showToast(`تم حذف "${p.nameAr}"`, "warning"); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-100 text-red-500"><Trash2 size={11} /></button>
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

          {/* Open Food Facts Section */}
          <div className="mb-5 p-4 bg-gradient-to-l from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl">
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
          </div>

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
  const [invProds, setInvProds] = useLS<Product[]>(sk(sid, "products"), PRODUCTS);
  const [adjProd, setAdjProd] = useState<Product | null>(null);
  const [adjQty, setAdjQty] = useState("");
  const [adjType, setAdjType] = useState<"add"|"set"|"remove">("add");
  const [adjNote, setAdjNote] = useState("");
  const [showJard, setShowJard] = useState(false);
  const [jardCounts, setJardCounts] = useState<Record<string,string>>({});

  const openAdj = (p: Product) => { setAdjProd(p); setAdjQty(""); setAdjNote(""); setAdjType("add"); };

  const doAdj = () => {
    if (!adjProd || !adjQty) return;
    const qty = parseInt(adjQty) || 0;
    setInvProds(prev => prev.map(p => {
      if (p.id !== adjProd.id) return p;
      const newStock = adjType === "add" ? p.stock + qty : adjType === "remove" ? Math.max(0, p.stock - qty) : qty;
      return { ...p, stock: newStock };
    }));
    showToast(`تم تعديل مخزون "${adjProd.nameAr}": ${adjType === "add" ? `+${adjQty}` : adjType === "remove" ? `-${adjQty}` : `= ${adjQty}`}`, "success");
    setAdjProd(null);
  };

  const startJard = () => {
    const counts: Record<string,string> = {};
    invProds.forEach(p => { counts[p.id] = ""; });
    setJardCounts(counts);
    setShowJard(true);
  };

  const saveJard = () => {
    setInvProds(prev => prev.map(p => {
      const counted = jardCounts[p.id];
      if (counted === "" || counted === undefined) return p;
      return { ...p, stock: parseInt(counted) || 0 };
    }));
    showToast("تم حفظ نتائج الجرد وتحديث المخزون بنجاح ✓", "success");
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
    <div className="p-5 space-y-4 overflow-y-auto h-full">
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
        <div className="bg-card rounded-2xl border border-border overflow-x-auto">
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
                    <td className="p-3.5">
                      <Btn v="secondary" s="xs" icon={<Edit2 size={10} />} onClick={() => openAdj(p)}>تعديل</Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
  const [custs, setCusts] = useLS<Cust[]>(sk(sid, "customers"), []);
  const [showNewC, setShowNewC] = useState(false);
  const [nc, setNc] = useState({ name: "", phone: "", level: "عادي" });
  const LV: Record<string, string> = { عادي: "bg-gray-100 text-gray-700", فضي: "bg-slate-200 text-slate-600", ذهبي: "bg-amber-100 text-amber-700", بلاتيني: "bg-purple-100 text-purple-700" };
  const addCust = () => {
    if (!nc.name) return;
    setCusts(p => [...p, { id: Date.now(), name: nc.name, phone: nc.phone, purchases: 0, total: 0, points: 0, level: nc.level, lastVisit: new Date().toISOString().split("T")[0] }]);
    showToast(`تم إضافة العميل "${nc.name}"`);
    setShowNewC(false); setNc({ name: "", phone: "", level: "عادي" });
  };
  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
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
        <div className="bg-card rounded-2xl border border-border overflow-x-auto">
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
                    <Btn v="ghost" s="xs" icon={<Trash2 size={10} />} onClick={() => { setCusts(p => p.filter(x=>x.id!==c.id)); showToast("تم حذف العميل","warning"); }}>حذف</Btn>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
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
  const [sups, setSups] = useLS<{id:number;name:string;phone:string;products:number;lastOrder:string;balance:number}[]>(sk(sid, "suppliers"), []);
  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
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
    <div className="p-5 space-y-4 overflow-y-auto h-full">
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
  const [exps, setExps] = useLS<{id:number;desc:string;amount:number;cat:string;date:string;method:string}[]>(sk(sid, "expenses"), []);
  const [showAdd, setShowAdd] = useState(false);
  const [editExp, setEditExp] = useState<typeof exps[0] | null>(null);
  const [nf, setNf] = useState({ desc: "", amount: "", cat: "ثابت", method: "نقدي" });
  const CE: Record<string, string> = { ثابت: "text-blue-700 bg-blue-100", متغير: "text-purple-700 bg-purple-100", تشغيل: "text-emerald-700 bg-emerald-100", طارئ: "text-red-700 bg-red-100" };
  const total = exps.reduce((a, e) => a + e.amount, 0);

  const addExp = () => {
    if (!nf.desc || !nf.amount) return;
    setExps(p => [...p, { id: Date.now(), desc: nf.desc, amount: parseFloat(nf.amount), cat: nf.cat, date: new Date().toISOString().split("T")[0], method: nf.method }]);
    showToast("تم إضافة المصروف بنجاح");
    setShowAdd(false); setNf({ desc: "", amount: "", cat: "ثابت", method: "نقدي" });
  };
  const delExp = (id: number) => { setExps(p => p.filter(e => e.id !== id)); showToast("تم حذف المصروف", "warning"); };
  const saveEdit = () => { if (!editExp) return; setExps(p => p.map(e => e.id === editExp.id ? editExp : e)); showToast("تم تعديل المصروف"); setEditExp(null); };

  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
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
  const [rets, setRets] = useLS<{id:string;inv:string;cust:string;amount:number;reason:string;date:string;status:string}[]>(sk(sid, "returns"), []);
  const [viewRet, setViewRet] = useState<typeof rets[0] | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [nf, setNf] = useState({ inv: "", cust: "", amount: "", reason: "" });
  const SC: Record<string, string> = { معتمد: "bg-emerald-100 text-emerald-700", "قيد المراجعة": "bg-amber-100 text-amber-700", مرفوض: "bg-red-100 text-red-700" };

  const approve = (id: string) => { setRets(p => p.map(r => r.id === id ? {...r, status: "معتمد"} : r)); showToast("تم اعتماد المرتجع"); setViewRet(null); };
  const reject = (id: string) => { setRets(p => p.map(r => r.id === id ? {...r, status: "مرفوض"} : r)); showToast("تم رفض المرتجع", "warning"); setViewRet(null); };
  const addReturn = () => {
    if (!nf.inv || !nf.amount) return;
    setRets(p => [...p, { id: `RET-00${p.length+4}`, inv: nf.inv, cust: nf.cust, amount: parseFloat(nf.amount)||0, reason: nf.reason, date: new Date().toISOString().split("T")[0], status: "قيد المراجعة" }]);
    showToast("تم إنشاء طلب المرتجع"); setShowNew(false); setNf({ inv: "", cust: "", amount: "", reason: "" });
  };

  const total = rets.filter(r=>r.status==="معتمد").reduce((a,r)=>a+r.amount,0);
  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
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
  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full">
      <Hdr title="التقارير والإحصائيات" action={<><Btn v="secondary" s="sm" icon={<Download size={13} />} onClick={() => showToast("جاري إعداد تقرير PDF...", "info")}>PDF</Btn><Btn v="secondary" s="sm" icon={<Download size={13} />} onClick={() => showToast("جاري تصدير ملف Excel...", "info")}>Excel</Btn></>} />
      <div className="flex bg-muted rounded-2xl p-1 border border-border w-fit">
        {[["week","أسبوع"],["month","شهر"],["year","سنة"]].map(([vv,l]) => <button key={vv} onClick={() => setPeriod(vv)} className={`px-4 h-8 rounded-xl text-xs font-bold transition-all ${period === vv ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{l}</button>)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI icon={<ShoppingCart size={18} />} label="المبيعات" value="1,840 JOD" sub="158 فاتورة" color="#1D4ED8" trend={15} />
        <KPI icon={<TrendingUp size={18} />} label="الربح الصافي" value="412 JOD" sub="هامش 22.4%" color="#059669" trend={8} />
        <KPI icon={<RotateCcw size={18} />} label="المرتجعات" value="45 JOD" color="#DC2626" />
        <KPI icon={<Percent size={18} />} label="الخصومات" value="38 JOD" color="#D97706" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-4">المبيعات والأرباح</p>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={weekData}>
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
          <div className="space-y-3">
            {[{ n: "أرز بسمتي 5كغ", r: 213.75, p: 95 }, { n: "زيت زيتون 750مل", r: 240.0, p: 80 }, { n: "حليب طازج 1 لتر", r: 97.5, p: 65 }, { n: "لبنة 500 غرام", r: 42.0, p: 45 }, { n: "صدر دجاج 1كغ", r: 104.5, p: 35 }].map((pp, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-black text-muted-foreground w-4 shrink-0">{i + 1}</span>
                <div className="flex-1"><div className="flex justify-between mb-1"><span className="text-xs font-bold">{pp.n}</span><span className="text-xs font-black">{pp.r.toFixed(3)} JOD</span></div><div className="h-1.5 bg-muted rounded-full"><div className="h-full bg-primary rounded-full" style={{ width: `${pp.p}%` }} /></div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-4">طرق الدفع</p>
          <div className="grid grid-cols-3 gap-3">
            {[{ m: "نقدي", a: 1240.5, p: 67, ic: <Banknote size={18} />, c: "#059669" }, { m: "كليك", a: 520.25, p: 28, ic: <CreditCard size={18} />, c: "#1D4ED8" }, { m: "مختلط", a: 79.25, p: 5, ic: <Layers size={18} />, c: "#D97706" }].map(x => (
              <div key={x.m} className="text-center p-4 rounded-2xl bg-muted/40 border border-border">
                <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: `${x.c}15` }}><span style={{ color: x.c }}>{x.ic}</span></div>
                <p className="text-2xl font-black">{x.p}%</p>
                <p className="text-xs font-bold mt-0.5">{x.m}</p>
                <p className="text-xs text-muted-foreground">{x.a.toFixed(3)} JOD</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-4">تقرير الضريبة</p>
          <div className="space-y-3">
            {[["مبيعات خاضعة للضريبة", "1,584.482 JOD"], ["ضريبة القيمة المضافة 16%", "253.517 JOD"], ["مبيعات معفاة من الضريبة", "255.518 JOD"], ["إجمالي الضرائب المحصّلة", "253.517 JOD"]].map(([l, vv]) => (
              <div key={l} className="flex justify-between border-b border-border/60 pb-2 last:border-0">
                <span className="text-sm text-muted-foreground">{l}</span><span className="font-bold">{vv}</span>
              </div>
            ))}
          </div>
          <Btn v="secondary" full cls="mt-4" icon={<Printer size={13} />} onClick={() => showToast("جاري طباعة تقرير الضريبة...", "info")}>طباعة تقرير الضريبة</Btn>
        </div>
      </div>
    </div>
  );
}

function EmpScreen() {
  const sid = useStoreId();
  const [emps, setEmps] = useLS<{id:number;name:string;role:string;phone:string;sales:number;status:string;branch:string}[]>(sk(sid, "employees"), []);
  const [showNew, setShowNew] = useState(false);
  const [editEmp, setEditEmp] = useState<{id:number;name:string;role:string;phone:string;sales:number;status:string;branch:string}|null>(null);
  const [nf, setNf] = useState({ name: '', role: 'كاشير', phone: '', branch: 'الفرع الرئيسي' });
  const RC: Record<string, { c: string; b: string }> = { مدير: { c: "#1D4ED8", b: "#DBEAFE" }, كاشير: { c: "#059669", b: "#D1FAE5" }, "مسؤول مخزون": { c: "#D97706", b: "#FEF3C7" } };
  const addEmp = () => {
    if (!nf.name || !nf.phone) return;
    setEmps(p => [...p, { id: Date.now(), ...nf, sales: 0, status: "نشط" }]);
    showToast(`تم إضافة الموظف "${nf.name}" بنجاح`);
    setShowNew(false); setNf({ name: '', role: 'كاشير', phone: '', branch: 'الفرع الرئيسي' });
  };
  const delEmp = (id: number) => { setEmps(p => p.filter(e => e.id !== id)); showToast("تم حذف الموظف", "warning"); };
  const saveEdit = () => { if (!editEmp) return; setEmps(p => p.map(e => e.id === editEmp.id ? editEmp : e)); showToast("تم حفظ تعديلات الموظف"); setEditEmp(null); };

  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
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
  const [branches, setBranches] = useLS<{id:number;name:string;city:string;manager:string;terminals:number;employees:number;sales:number;status:string}[]>(sk(sid, "branches"), []);
  const [terms, setTerms] = useLS<{id:string;name:string;cashier:string;branch:string;status:string;sales:number}[]>(sk(sid, "terminals"), []);
  const [showBranch, setShowBranch] = useState(false);
  const [showTerm, setShowTerm] = useState(false);
  const [viewBranch, setViewBranch] = useState<typeof branches[0] | null>(null);
  const [nb, setNb] = useState({ name: "", city: "", manager: "" });
  const [nt, setNt] = useState({ name: "", cashier: "", branch: "الفرع الرئيسي" });

  const toggleBranch = (id: number) => { setBranches(p => p.map(b => b.id === id ? {...b, status: b.status === "نشط" ? "غير نشط" : "نشط"} : b)); showToast("تم تغيير حالة الفرع"); setViewBranch(null); };
  const toggleTerm = (id: string) => { setTerms(p => p.map(t => t.id === id ? {...t, status: t.status === "نشط" ? "مغلق" : "نشط"} : t)); showToast(terms.find(t=>t.id===id)?.status === "نشط" ? "تم إغلاق الجهاز" : "تم فتح الجهاز"); };
  const addBranch = () => { if (!nb.name) return; setBranches(p => [...p, { id: Date.now(), ...nb, terminals: 0, employees: 0, sales: 0, status: "نشط" }]); showToast(`تم إنشاء فرع "${nb.name}"`); setShowBranch(false); setNb({name:"",city:"",manager:""}); };
  const addTerm = () => { if (!nt.name) return; setTerms(p => [...p, { id: `T-00${p.length+4}`, ...nt, status: "مغلق", sales: 0 }]); showToast(`تم إضافة جهاز "${nt.name}"`); setShowTerm(false); setNt({name:"",cashier:"",branch:"الفرع الرئيسي"}); };

  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full">
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
    <div className="p-5 space-y-5 overflow-y-auto h-full">
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
  // كل إعداد يُحفظ في localStorage لحاله
  const [sName,        setSName]        = useLS(sk(sid,"sett_name"),   store.nameAr);
  const [phone,        setPhone]        = useLS(sk(sid,"sett_phone"),  store.phone);
  const [address,      setAddress]      = useLS(sk(sid,"sett_addr"),   "شارع الثقافة، الجبيهة، عمّان، الأردن");
  const [lang,         setLang]         = useLS(sk(sid,"sett_lang"),   "ar");
  const [rl,           setRl]           = useLS(sk(sid,"sett_rl"),     "both");
  const [tax,          setTax]          = useLS(sk(sid,"sett_tax"),    "16");
  const [paper,        setPaper]        = useLS(sk(sid,"sett_paper"),  "80mm");
  const [printCopies,  setPrintCopies]  = useLS(sk(sid,"sett_copies"), "1");
  const [printLogo,    setPrintLogo]    = useLS(sk(sid,"sett_plogo"),  true);
  const [printTax,     setPrintTax]     = useLS(sk(sid,"sett_ptax"),   true);
  const [printPhone,   setPrintPhone]   = useLS(sk(sid,"sett_pphone"), true);
  const [printBarcode, setPrintBarcode] = useLS(sk(sid,"sett_pbar"),   false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const doSave = () => showToast("تم حفظ إعدادات المتجر بنجاح ✓", "success");

  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full">
      <Hdr title="إعدادات المتجر" action={<Btn v="success" s="sm" icon={<Check size={13} />} onClick={doSave}>حفظ الإعدادات</Btn>} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <p className="font-bold flex items-center gap-2"><Store size={13} /> معلومات المتجر</p>
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

export default function App() {
  // ── Persist session across refreshes ──────────────────────────
  const [view, setView] = useState<View>(() => {
    try {
      const s = localStorage.getItem("sowwanjo_session");
      if (!s) return "login";
      const { type } = JSON.parse(s);
      return type === "superadmin" ? "superadmin" : type === "store" ? "store" : "login";
    } catch { return "login"; }
  });
  const [storeId, setStoreId] = useState<string>(() => {
    try {
      const s = localStorage.getItem("sowwanjo_session");
      if (!s) return "";
      const { type, id } = JSON.parse(s);
      return type === "store" ? id : "";
    } catch { return ""; }
  });

  const login = useCallback((type: "superadmin" | "store", id?: string) => {
    if (type === "superadmin") {
      localStorage.setItem("sowwanjo_session", JSON.stringify({ type: "superadmin" }));
      setView("superadmin");
    } else {
      const sid = id || "";
      localStorage.setItem("sowwanjo_session", JSON.stringify({ type: "store", id: sid }));
      setStoreId(sid);
      setView("store");
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("sowwanjo_session");
    clearToken(); // مسح JWT token
    setView("login");
    setStoreId("");
  }, []);

  return (
    <div className="size-full" style={{ fontFamily: "'Cairo','Inter',sans-serif" }}>
      {view === "login"      && <LoginScreen onLogin={login} />}
      {view === "superadmin" && <SuperAdminLayout onLogout={logout} />}
      {view === "store"      && (
        <StoreCtx.Provider value={storeId}>
          <StoreLayout storeId={storeId} onLogout={logout} />
        </StoreCtx.Provider>
      )}
      <ToastHost />
    </div>
  );
}
