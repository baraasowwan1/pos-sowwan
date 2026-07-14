// StorePanelC — Reports, Employees, Branches, Loyalty, Print Shop, Settings
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Flower2, Gift, Bike, FileSpreadsheet,
} from "lucide-react";
import { storeApi, useApi, useLS, norm, normList, dateAr, timeAr, showToast, KPI, Modal, F, TInput, SInput, Btn, Hdr, Empty, Toggle, useStoreId, sk, PLANS, CAT, ST, printReceipt, PRODUCTS, jod, getToken, useStoreModules } from "./lib";
import type { StoreData, Product, CartItem, StoreCategory } from "./lib";

// ── decode JWT payload without verification ───────────────────────────────────
function decodeJwtRole(): string {
  try {
    const token = getToken();
    if (!token) return "";
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.role || payload.userRole || "";
  } catch { return ""; }
}

// Roles allowed to export reports
const EXPORT_ROLES = ["مالك", "مدير", "محاسب", "owner", "manager", "accountant", "superadmin"];
// Roles allowed to view reports at all
const REPORT_ROLES = ["مالك", "مدير", "محاسب", "مسؤول مخزون", "owner", "manager", "accountant", "inventory"];

function StoreReports() {
  const sid = useStoreId();
  const [activeTab, setActiveTab] = useState<"sales"|"profit">("sales");
  const [period, setPeriod] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const { data: salesRaw, loading: sLoading } = useApi<unknown[]>("/sales", []);
  const { data: retsRaw } = useApi<unknown[]>("/returns", []);
  const { data: prodsRaw } = useApi<unknown[]>("/products", []);

  // Permission check
  const userRole = decodeJwtRole();
  const canView   = !userRole || REPORT_ROLES.some(r => userRole.includes(r));
  const canExport = !userRole || EXPORT_ROLES.some(r => userRole.includes(r));

  type SaleRow = { id:string; invoiceNo?:string; total:number; discount:number; tax:number; payMethod:string; paymentMethod:string; createdAt:string; items:{name:string;qty:number;price:number}[]; customerName?:string; };
  const sales = normList<SaleRow>(salesRaw);
  const rets  = normList<{id:string;amount:number;status:string}>(retsRaw);

  const now = new Date();

  const periodLabel = (() => {
    if (period === "today") return "اليوم";
    if (period === "yesterday") return "أمس";
    if (period === "week") return "آخر 7 أيام";
    if (period === "lastweek") return "الأسبوع الماضي";
    if (period === "month") return now.toLocaleDateString("ar-JO", { month: "long", year: "numeric" });
    if (period === "lastmonth") { const lm = new Date(now.getFullYear(), now.getMonth()-1, 1); return lm.toLocaleDateString("ar-JO", { month: "long", year: "numeric" }); }
    if (period === "year") return String(now.getFullYear());
    if (period === "custom" && customFrom && customTo) return `${customFrom} — ${customTo}`;
    return "مخصص";
  })();

  const filtered = sales.filter(s => {
    const d = new Date(s.createdAt);
    if (period === "today") return d.toDateString() === now.toDateString();
    if (period === "yesterday") { const y = new Date(now); y.setDate(y.getDate()-1); return d.toDateString() === y.toDateString(); }
    if (period === "week") { const w = new Date(now); w.setDate(w.getDate()-7); return d >= w; }
    if (period === "lastweek") { const e = new Date(now); e.setDate(e.getDate()-7); const s2 = new Date(now); s2.setDate(s2.getDate()-14); return d >= s2 && d < e; }
    if (period === "month") return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    if (period === "lastmonth") { const lm = new Date(now.getFullYear(), now.getMonth()-1, 1); const le = new Date(now.getFullYear(), now.getMonth(), 0); return d >= lm && d <= le; }
    if (period === "year") return d.getFullYear()===now.getFullYear();
    if (period === "custom") {
      const from = customFrom ? new Date(customFrom) : null;
      const to   = customTo   ? new Date(customTo + "T23:59:59") : null;
      return (!from || d >= from) && (!to || d <= to);
    }
    return d.getFullYear()===now.getFullYear();
  });

  const totalSales    = filtered.reduce((a, s) => a + (s.total || 0), 0);
  const totalDiscount = filtered.reduce((a, s) => a + (s.discount || 0), 0);
  const totalTax      = filtered.reduce((a, s) => a + (s.tax || 0), 0);
  const netSales      = totalSales - totalDiscount;
  const totalRets     = rets.filter(r => r.status === "معتمد").reduce((a, r) => a + (r.amount || 0), 0);
  const avgInvoice    = filtered.length ? totalSales / filtered.length : 0;

  // ── Profit Report data ────────────────────────────────────────────────────
  type ProdRow = { id: string; nameAr: string; costPrice: number; sellPrice: number };
  const prods = normList<ProdRow>(prodsRaw);
  const costMap: Record<string, number> = {};
  prods.forEach(p => { costMap[p.nameAr] = p.costPrice || 0; });

  // Per-day profit breakdown
  type ProfitDay = { day: string; revenue: number; cost: number; profit: number; tax: number };
  const profitDayMap: Record<string, ProfitDay> = {};
  filtered.forEach(s => {
    const key = new Date(s.createdAt).toLocaleDateString("ar-JO", { month: "2-digit", day: "2-digit" });
    if (!profitDayMap[key]) profitDayMap[key] = { day: key, revenue: 0, cost: 0, profit: 0, tax: 0 };
    profitDayMap[key].revenue += s.total || 0;
    profitDayMap[key].tax     += s.tax || 0;
    s.items?.forEach((it: { name: string; qty: number; price: number }) => {
      const cost = costMap[it.name] || 0;
      profitDayMap[key].cost += cost * it.qty;
    });
    profitDayMap[key].profit = profitDayMap[key].revenue - profitDayMap[key].cost - profitDayMap[key].tax;
  });
  const profitDays = Object.values(profitDayMap);
  const totalCost   = profitDays.reduce((a, d) => a + d.cost,   0);
  const totalProfit = profitDays.reduce((a, d) => a + d.profit, 0);
  const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

  const exportProfitExcel = () => {
    const rows = [["اليوم","الإيراد (JOD)","التكلفة (JOD)","الضريبة (JOD)","الربح (JOD)","هامش الربح %"],
      ...profitDays.map(d => [d.day, d.revenue.toFixed(3), d.cost.toFixed(3), d.tax.toFixed(3), d.profit.toFixed(3), d.revenue > 0 ? ((d.profit/d.revenue)*100).toFixed(1)+"%" : "0%"]),
      ["الإجمالي", totalSales.toFixed(3), totalCost.toFixed(3), totalTax.toFixed(3), totalProfit.toFixed(3), profitMargin.toFixed(1)+"%"]];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const b = new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8;"}); const a = document.createElement("a"); a.href=URL.createObjectURL(b); a.download=`تقرير-الأرباح-${periodLabel}.csv`; a.click();
    showToast("تم تصدير تقرير الأرباح ✓", "success");
  };

  const printProfit = () => {
    const w = window.open("","_blank","width=700,height=600");
    if (!w) return;
    const rows = profitDays.map(d => `<tr><td>${d.day}</td><td>${d.revenue.toFixed(3)}</td><td>${d.cost.toFixed(3)}</td><td>${d.tax.toFixed(3)}</td><td style="color:${d.profit>=0?"#059669":"#DC2626"};font-weight:900">${d.profit.toFixed(3)}</td></tr>`).join("");
    w.document.write(`<html dir="rtl"><head><meta charset="utf-8"><style>body{font-family:Cairo,Arial;padding:24px;font-size:12px}h2{text-align:center}p.sub{text-align:center;color:#666;margin-bottom:16px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:7px;text-align:right}th{background:#f5f5f5}tfoot td{font-weight:900}</style></head><body><h2>تقرير الأرباح</h2><p class="sub">${periodLabel}</p><table><thead><tr><th>اليوم</th><th>الإيراد</th><th>التكلفة</th><th>الضريبة</th><th>الربح</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td>الإجمالي</td><td>${totalSales.toFixed(3)}</td><td>${totalCost.toFixed(3)}</td><td>${totalTax.toFixed(3)}</td><td>${totalProfit.toFixed(3)}</td></tr></tfoot></table><br><p>هامش الربح: ${profitMargin.toFixed(1)}%</p><br><button onclick="window.print()">طباعة</button></body></html>`);
    w.document.close();
  };

  const payGroups = filtered.reduce((acc: Record<string, number>, s) => {
    const m = s.payMethod || s.paymentMethod || "cash";
    const label = m === "cash" ? "نقدي" : m === "cliq" ? "كليك" : m === "card" ? "بطاقة" : m;
    acc[label] = (acc[label] || 0) + s.total;
    return acc;
  }, {});
  const payTotal = Object.values(payGroups).reduce((a, v) => a + v, 0) || 1;

  const prodMap: Record<string, { revenue: number; qty: number }> = {};
  filtered.forEach(s => s.items?.forEach(it => {
    if (!prodMap[it.name]) prodMap[it.name] = { revenue: 0, qty: 0 };
    prodMap[it.name].revenue += it.price * it.qty;
    prodMap[it.name].qty     += it.qty;
  }));
  const topProds = Object.entries(prodMap).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);
  const topMax = topProds[0]?.[1].revenue || 1;

  const dayMap: Record<string, number> = {};
  filtered.forEach(s => {
    const key = new Date(s.createdAt).toLocaleDateString("ar-JO", { month: "2-digit", day: "2-digit" });
    dayMap[key] = (dayMap[key] || 0) + s.total;
  });
  const chartData = Object.entries(dayMap).map(([day, مبيعات]) => ({ day, مبيعات }));

  // ── CSV Export (UTF-8 BOM — opens correctly in Excel with Arabic) ────────────
  const exportExcel = useCallback(() => {
    if (!canExport) { showToast("ليس لديك صلاحية تصدير التقارير", "error"); return; }
    setExporting(true);
    try {
      const storeName = (() => { try { return JSON.parse(localStorage.getItem(`sowwanjo_storeinfo_${sid}`) || "{}").nameAr || "المتجر"; } catch { return "المتجر"; } })();
      const now2 = new Date();
      const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
      const row = (...cols: (string | number)[]) => cols.map(esc).join(",") + "\n";

      let csv = "";

      // ── Section 1: ملخص ──────────────────────────────────────────
      csv += row("تقرير المبيعات", storeName);
      csv += row("الفترة", periodLabel);
      csv += row("تاريخ التصدير", now2.toLocaleDateString("ar-JO") + " " + now2.toLocaleTimeString("ar-JO"));
      csv += row("", "");
      csv += row("البيان", "المبلغ (JOD)");
      csv += row("إجمالي المبيعات",       totalSales.toFixed(3));
      csv += row("الخصومات الممنوحة",    totalDiscount.toFixed(3));
      csv += row("صافي المبيعات",         netSales.toFixed(3));
      csv += row("ضريبة القيمة المضافة", totalTax.toFixed(3));
      csv += row("المرتجعات المعتمدة",   totalRets.toFixed(3));
      csv += row("عدد الفواتير",          filtered.length);
      csv += row("متوسط قيمة الفاتورة",  avgInvoice.toFixed(3));
      csv += row("", "");

      // ── Section 2: طرق الدفع ─────────────────────────────────────
      csv += row("طرق الدفع", "المبلغ (JOD)", "النسبة");
      Object.entries(payGroups).forEach(([m, v]) => {
        csv += row(m, v.toFixed(3), Math.round((v / payTotal) * 100) + "%");
      });
      csv += row("", "", "");

      // ── Section 3: الفواتير ───────────────────────────────────────
      csv += row("رقم الفاتورة", "التاريخ", "الوقت", "العميل", "طريقة الدفع", "الخصم (JOD)", "الضريبة (JOD)", "الإجمالي (JOD)");
      filtered.forEach(s => {
        const dt = new Date(s.createdAt);
        const payLabel = (s.payMethod || s.paymentMethod || "cash") === "cash" ? "نقدي" : (s.payMethod || s.paymentMethod) === "cliq" ? "كليك" : "بطاقة";
        csv += row(
          s.invoiceNo || s.id.slice(-6).toUpperCase(),
          dt.toLocaleDateString("ar-JO"),
          dt.toLocaleTimeString("ar-JO"),
          s.customerName || "زبون عام",
          payLabel,
          (s.discount || 0).toFixed(3),
          (s.tax || 0).toFixed(3),
          (s.total || 0).toFixed(3),
        );
      });
      csv += row("", "", "", "", "", "", "", "");

      // ── Section 4: أكثر المنتجات مبيعاً ─────────────────────────
      csv += row("المنتج", "إجمالي المبيعات (JOD)", "الكمية المباعة");
      Object.entries(prodMap)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .forEach(([name, { revenue, qty }]) => { csv += row(name, revenue.toFixed(3), qty); });
      csv += row("", "", "");

      // ── Section 5: المرتجعات ──────────────────────────────────────
      csv += row("رقم المرتجع", "المبلغ (JOD)", "الحالة");
      rets.forEach(r => { csv += row(r.id.slice(-6).toUpperCase(), (r.amount || 0).toFixed(3), r.status); });

      // UTF-8 BOM so Excel renders Arabic correctly
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `تقرير-المبيعات-${periodLabel.replace(/\s+/g, "-")}-${now2.toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("تم تصدير التقرير بنجاح ✓", "success");
    } catch {
      showToast("فشل تصدير التقرير — حاول مرة أخرى", "error");
    } finally {
      setExporting(false);
    }
  }, [canExport, filtered, totalSales, totalDiscount, netSales, totalTax, totalRets, avgInvoice, payGroups, payTotal, prodMap, rets, periodLabel, sid]);

  const printTax = () => {
    const taxable = totalSales - totalTax;
    const w = window.open("", "_blank", "width=420,height=600");
    if (!w) { showToast("يُرجى السماح بالنوافذ المنبثقة", "warning"); return; }
    const storeName = (() => { try { return JSON.parse(localStorage.getItem(`sowwanjo_storeinfo_${sid}`) || "{}").nameAr || ""; } catch { return ""; } })();
    w.document.write(`<html dir="rtl"><head><meta charset="utf-8"><title>تقرير الضريبة</title><style>*{font-family:Cairo,sans-serif;margin:0;padding:0}body{padding:20px}h2{text-align:center;margin-bottom:4px}p.sub{text-align:center;color:#6b7280;font-size:12px;margin-bottom:16px}table{width:100%;border-collapse:collapse}td{padding:10px;border-bottom:1px solid #e5e7eb}td:last-child{font-weight:900;text-align:left}@media print{button{display:none}}</style></head><body><h2>تقرير الضريبة</h2><p class="sub">${storeName} • ${periodLabel}</p><table><tr><td>إجمالي المبيعات</td><td>${totalSales.toFixed(3)} JOD</td></tr><tr><td>مبيعات قبل الضريبة</td><td>${taxable.toFixed(3)} JOD</td></tr><tr><td>ضريبة القيمة المضافة 16%</td><td>${totalTax.toFixed(3)} JOD</td></tr><tr><td>الخصومات</td><td>${totalDiscount.toFixed(3)} JOD</td></tr><tr><td>صافي المبيعات</td><td>${netSales.toFixed(3)} JOD</td></tr></table><br><button onclick="window.print()">طباعة</button></body></html>`);
    w.document.close();
  };

  if (!canView) {
    return (
      <div className="p-5 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4"><Shield size={24} className="text-red-500" /></div>
          <p className="font-bold text-foreground">ليس لديك صلاحية عرض التقارير</p>
          <p className="text-sm text-muted-foreground mt-1">تواصل مع مدير المتجر لمنحك الوصول</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full">
      {/* Header */}
      <Hdr title="التقارير والإحصائيات" action={
        <div className="flex gap-2">
          {activeTab === "profit" ? (
            <>
              {canExport && <Btn s="sm" icon={<FileSpreadsheet size={13}/>} onClick={exportProfitExcel}>Excel</Btn>}
              <Btn v="secondary" s="sm" icon={<Printer size={13}/>} onClick={printProfit}>طباعة</Btn>
            </>
          ) : (
            <>
              {canExport && (
                <Btn s="sm" icon={exporting ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />} onClick={exportExcel} disabled={exporting}>
                  {exporting ? "جاري التصدير..." : "تصدير Excel"}
                </Btn>
              )}
              <Btn v="secondary" s="sm" icon={<Printer size={13} />} onClick={printTax}>طباعة</Btn>
            </>
          )}
        </div>
      } />

      {/* Tab bar */}
      <div className="flex bg-muted rounded-2xl p-1 border border-border w-fit gap-0.5">
        {([["sales","تقرير المبيعات"],["profit","تقرير الأرباح"]] as [string,string][]).map(([t,l]) => (
          <button key={t} onClick={() => setActiveTab(t as "sales"|"profit")} className={`px-4 h-8 rounded-xl text-xs font-bold transition-all ${activeTab===t ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
        ))}
      </div>

      {/* Period filter */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <div className="flex bg-muted rounded-2xl p-1 border border-border flex-wrap gap-0.5">
          {([["today","اليوم"],["yesterday","أمس"],["week","أسبوع"],["lastweek","الأسبوع الماضي"],["month","هذا الشهر"],["lastmonth","الشهر الماضي"],["year","هذه السنة"],["custom","مخصص"]] as [string,string][]).map(([vv,l]) => (
            <button key={vv} onClick={() => setPeriod(vv)} className={`px-3 h-8 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${period === vv ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
          ))}
        </div>
        {period === "custom" && (
          <div className="flex items-center gap-2">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-8 rounded-xl border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
            <span className="text-xs text-muted-foreground">—</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-8 rounded-xl border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        )}
        <span className="text-xs text-muted-foreground bg-muted px-3 h-8 flex items-center rounded-xl border border-border">{filtered.length} فاتورة • {periodLabel}</span>
        {!canExport && (
          <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 h-8 flex items-center gap-1 rounded-xl">
            <Shield size={11} /> صلاحية التصدير غير متاحة
          </span>
        )}
      </div>

      {activeTab === "profit" ? (
        /* ── Profit Report Tab ─────────────────────────────────────────── */
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI icon={<TrendingUp size={18}/>} label="إجمالي الإيراد" value={`${totalSales.toFixed(3)} JOD`} color="#0C7BB3" />
            <KPI icon={<Banknote size={18}/>} label="إجمالي التكلفة" value={`${totalCost.toFixed(3)} JOD`} color="#D97706" />
            <KPI icon={<DollarSign size={18}/>} label="صافي الربح" value={`${totalProfit.toFixed(3)} JOD`} sub={totalProfit >= 0 ? "ربح" : "خسارة"} color={totalProfit >= 0 ? "#059669" : "#DC2626"} />
            <KPI icon={<Percent size={18}/>} label="هامش الربح" value={`${profitMargin.toFixed(1)}%`} color="#7C3AED" />
          </div>
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="font-bold mb-4">الأرباح اليومية</p>
            {profitDays.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات في هذه الفترة</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={profitDays}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(3)} JOD`]} />
                  <Bar dataKey="revenue" fill="#0C7BB3" name="الإيراد" radius={[3,3,0,0]} />
                  <Bar dataKey="cost" fill="#D97706" name="التكلفة" radius={[3,3,0,0]} />
                  <Bar dataKey="profit" fill="#059669" name="الربح" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/40"><p className="font-bold text-sm">تفصيل الأرباح اليومية</p></div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-muted/30">{["اليوم","الإيراد","التكلفة","الضريبة","الربح","الهامش"].map(h => <th key={h} className="px-4 py-2.5 text-right font-bold text-muted-foreground border-b border-border">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-border/40">
                  {profitDays.map(d => (
                    <tr key={d.day} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-medium">{d.day}</td>
                      <td className="px-4 py-2.5">{d.revenue.toFixed(3)} JOD</td>
                      <td className="px-4 py-2.5 text-amber-600">{d.cost.toFixed(3)} JOD</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{d.tax.toFixed(3)} JOD</td>
                      <td className={`px-4 py-2.5 font-black ${d.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{d.profit.toFixed(3)} JOD</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{d.revenue > 0 ? ((d.profit/d.revenue)*100).toFixed(1) : "0"}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="bg-muted/40 font-black text-sm">
                  <td className="px-4 py-3">الإجمالي</td>
                  <td className="px-4 py-3">{totalSales.toFixed(3)}</td>
                  <td className="px-4 py-3 text-amber-600">{totalCost.toFixed(3)}</td>
                  <td className="px-4 py-3">{totalTax.toFixed(3)}</td>
                  <td className={`px-4 py-3 ${totalProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{totalProfit.toFixed(3)}</td>
                  <td className="px-4 py-3">{profitMargin.toFixed(1)}%</td>
                </tr></tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : (
      /* ── Sales Report Tab ──────────────────────────────────────────── */
      <>
      {/* KPIs */}
      {sLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[0,1,2,3].map(i => <div key={i} className="bg-card rounded-2xl border border-border h-24 animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI icon={<ShoppingCart size={18} />} label="إجمالي المبيعات" value={`${totalSales.toFixed(3)} JOD`} sub={`${filtered.length} فاتورة`} color="#0C7BB3" />
          <KPI icon={<TrendingUp size={18} />} label="صافي المبيعات" value={`${netSales.toFixed(3)} JOD`} sub={`خصم ${totalDiscount.toFixed(3)} JOD`} color="#059669" />
          <KPI icon={<RotateCcw size={18} />} label="المرتجعات المعتمدة" value={`${totalRets.toFixed(3)} JOD`} color="#DC2626" />
          <KPI icon={<Percent size={18} />} label="متوسط الفاتورة" value={`${avgInvoice.toFixed(3)} JOD`} color="#D97706" />
        </div>
      )}

      {/* Charts + tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sales chart */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-4">مبيعات الفترة</p>
          {chartData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">لا توجد مبيعات في هذه الفترة</div>
          ) : (
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(3)} JOD`]} />
                <Line type="monotone" dataKey="مبيعات" stroke="#0C7BB3" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top products */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-4">أكثر المنتجات مبيعاً</p>
          {topProds.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">لا توجد مبيعات بعد</div>
          ) : (
            <div className="space-y-3">
              {topProds.map(([name, { revenue, qty }], i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-xs font-black text-muted-foreground w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-bold">{name}</span>
                      <span className="text-xs font-black">{revenue.toFixed(3)} JOD</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round((revenue / topMax) * 100)}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{qty} وحدة مباعة</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment methods */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-4">طرق الدفع</p>
          {Object.keys(payGroups).length === 0 ? (
            <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">لا توجد مبيعات بعد</div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(payGroups).map(([method, amount]) => (
                <div key={method} className="text-center p-4 rounded-2xl bg-muted/40 border border-border">
                  <p className="text-2xl font-black">{Math.round((amount / payTotal) * 100)}%</p>
                  <p className="text-xs font-bold mt-0.5">{method}</p>
                  <p className="text-xs text-muted-foreground">{amount.toFixed(3)} JOD</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tax summary */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-4">ملخص الضريبة</p>
          <div className="space-y-3">
            {[
              ["إجمالي المبيعات",         `${totalSales.toFixed(3)} JOD`],
              ["مبيعات قبل الضريبة",      `${(totalSales - totalTax).toFixed(3)} JOD`],
              ["ضريبة القيمة المضافة 16%", `${totalTax.toFixed(3)} JOD`],
              ["الخصومات الممنوحة",       `${totalDiscount.toFixed(3)} JOD`],
              ["صافي المبيعات",           `${netSales.toFixed(3)} JOD`],
            ].map(([l, vv]) => (
              <div key={l} className="flex justify-between border-b border-border/60 pb-2 last:border-0">
                <span className="text-sm text-muted-foreground">{l}</span>
                <span className="font-bold">{vv}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <Btn v="secondary" full icon={<Printer size={13} />} onClick={printTax}>طباعة</Btn>
            {canExport && (
              <Btn full icon={exporting ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />} onClick={exportExcel} disabled={exporting}>Excel</Btn>
            )}
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
type EmpRecord = {id:string;name:string;email:string;role:string;phone:string;sales:number;status:string;branch:string;shift:string;shiftStart:string;shiftEnd:string};
function EmpScreen() {
  const sid = useStoreId();
  const { data: empsRaw, refresh: refreshEmps } = useApi<unknown[]>("/users", []);
  const [emps, setEmps] = useState<EmpRecord[]>([]);
  const { data: branchesRaw } = useApi<unknown[]>("/branches", []);
  const branchOpts = useMemo(() => {
    const list = normList<{id:string;name:string}>(branchesRaw);
    const opts = list.map(b => ({ value: b.name, label: b.name }));
    if (!opts.find(o => o.value === "الفرع الرئيسي")) opts.unshift({ value:"الفرع الرئيسي", label:"الفرع الرئيسي" });
    return opts;
  }, [branchesRaw]);
  useEffect(() => { setEmps(normList<EmpRecord>(empsRaw)); }, [empsRaw]);
  const [showNew, setShowNew] = useState(false);
  const [editEmp, setEditEmp] = useState<EmpRecord|null>(null);
  const ROLE_AR_TO_EN: Record<string,string> = { مدير:"manager", كاشير:"cashier", "مسؤول مخزون":"inventory", محاسب:"accountant", مالك:"owner" };
  const ROLE_EN_TO_AR: Record<string,string> = { owner:"مالك", manager:"مدير", cashier:"كاشير", inventory:"مسؤول مخزون", accountant:"محاسب" };
  const STATUS_AR_TO_EN: Record<string,string> = { نشط:"active", موقوف:"suspended", إجازة:"suspended" };
  const STATUS_EN_TO_AR: Record<string,string> = { active:"نشط", suspended:"موقوف" };
  const SHIFT_EN_TO_AR: Record<string,string> = { morning:"صباحي", evening:"مسائي", night:"ليلي", flexible:"مرن" };
  const SHIFT_ICON: Record<string,string> = { morning:"🌅", evening:"🌆", night:"🌙", flexible:"🔄" };
  const ROLE_OPTS = ["manager","cashier","inventory","accountant"].map(r => ({ value: r, label: ROLE_EN_TO_AR[r] || r }));
  const STATUS_OPTS = ["active","suspended"].map(s => ({ value: s, label: STATUS_EN_TO_AR[s] || s }));
  const SHIFT_OPTS = ["morning","evening","night","flexible"].map(s => ({ value: s, label: `${SHIFT_ICON[s]} ${SHIFT_EN_TO_AR[s]}` }));
  const RC: Record<string, { c: string; b: string }> = { manager: { c: "#4F46E5", b: "#DBEAFE" }, cashier: { c: "#059669", b: "#D1FAE5" }, inventory: { c: "#D97706", b: "#FEF3C7" }, owner: { c: "#7C3AED", b: "#EDE9FE" }, accountant: { c: "#0891B2", b: "#CFFAFE" } };

  const emptyEmp = () => ({ name: '', role: 'cashier', phone: '', branch: 'الفرع الرئيسي', email: '', password: '', autoPass: true, shift: 'flexible', shiftStart: '', shiftEnd: '' });
  const [nf, setNf] = useState(emptyEmp());
  const [createdCreds, setCreatedCreds] = useState<{name:string;email:string;password:string}|null>(null);
  const [editPass, setEditPass] = useState('');
  const addEmp = async () => {
    if (!nf.name || !nf.phone || !nf.email) return;
    try {
      const body: Record<string,string> = { name: nf.name, phone: nf.phone, role: nf.role, email: nf.email, shift: nf.shift, shiftStart: nf.shiftStart, shiftEnd: nf.shiftEnd, branch: nf.branch };
      if (!nf.autoPass && nf.password) body["password"] = nf.password;
      const res = await storeApi.post("/users", body) as { generatedPassword?: string };
      await refreshEmps();
      const finalPass = (!nf.autoPass && nf.password) ? nf.password : (res.generatedPassword || "—");
      setCreatedCreds({ name: nf.name, email: nf.email, password: finalPass });
    } catch (e) { showToast((e as {error?:string}).error || "خطأ في إضافة الموظف", "error"); return; }
    setShowNew(false); setNf(emptyEmp());
  };
  const delEmp = async (id: string) => { await storeApi.delete(`/users/${id}`); await refreshEmps(); showToast("تم حذف الموظف", "warning"); };
  const saveEdit = async () => {
    if (!editEmp) return;
    const enRole = ROLE_AR_TO_EN[editEmp.role] || editEmp.role;
    const enStatus = STATUS_AR_TO_EN[editEmp.status] || editEmp.status;
    const body: Record<string,string> = { name: editEmp.name, phone: editEmp.phone || '', role: enRole, status: enStatus, shift: editEmp.shift || 'flexible', shiftStart: editEmp.shiftStart || '', shiftEnd: editEmp.shiftEnd || '', branch: editEmp.branch || '' };
    if (editPass.trim()) body["password"] = editPass.trim();
    await storeApi.put(`/users/${editEmp.id}`, body);
    await refreshEmps(); showToast("تم حفظ تعديلات الموظف"); setEditEmp(null); setEditPass('');
  };

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
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: rc.b, color: rc.c }}>{ROLE_EN_TO_AR[e.role] || e.role}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${e.status === "active" ? "text-emerald-700 bg-emerald-100" : "text-amber-700 bg-amber-100"}`}>{STATUS_EN_TO_AR[e.status] || e.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{e.phone} • {e.branch} {e.shift && e.shift !== "flexible" ? `• ${SHIFT_ICON[e.shift] || ""} شفت ${SHIFT_EN_TO_AR[e.shift] || e.shift}${e.shiftStart ? ` (${e.shiftStart}–${e.shiftEnd})` : ""}` : ""}</p>
                {e.email && <p className="text-xs text-blue-500 mt-0.5 font-mono">{e.email}</p>}
              </div>
              {e.sales > 0 && <div className="hidden sm:block text-right shrink-0"><p className="text-sm font-black">{e.sales.toFixed(3)} JOD</p><p className="text-xs text-muted-foreground">مبيعات الشهر</p></div>}
              <div className="flex gap-1 shrink-0">
                <button onClick={() => showToast(`صلاحيات "${e.name}" — الدور: ${e.role}`, "info")} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-primary/10 text-primary"><Shield size={13} /></button>
                <button onClick={() => setEditEmp({ ...e })} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground"><Edit2 size={13} /></button>
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

      {/* ── بيانات الدخول بعد الإنشاء ── */}
      {createdCreds && (
        <Modal title="تم إضافة الموظف بنجاح ✅" onClose={() => setCreatedCreds(null)} size="sm">
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
              <p className="text-sm font-bold text-emerald-800 mb-3">بيانات تسجيل الدخول — احتفظ بها وسلّمها للموظف</p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">الاسم</span>
                <span className="font-bold text-sm">{createdCreds.name}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">البريد الإلكتروني</span>
                <span className="font-bold text-sm font-mono">{createdCreds.email}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">كلمة المرور</span>
                <span className="font-black text-base font-mono tracking-widest text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg select-all">{createdCreds.password}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">يمكن للموظف تغيير كلمة المرور لاحقاً من الإعدادات.</p>
            <div className="flex gap-3 justify-end">
              <Btn onClick={() => { navigator.clipboard?.writeText(`البريد: ${createdCreds.email}\nكلمة المرور: ${createdCreds.password}`); showToast("تم النسخ ✅"); }} v="secondary" icon={<Copy size={13}/>}>نسخ البيانات</Btn>
              <Btn onClick={() => setCreatedCreds(null)} icon={<Check size={14}/>}>تم</Btn>
            </div>
          </div>
        </Modal>
      )}

      {showNew && (
        <Modal title="إضافة موظف جديد" onClose={() => setShowNew(false)} size="sm">
          <div className="space-y-4">
            <F label="الاسم الكامل" req><TInput value={nf.name} onChange={v=>setNf({...nf,name:v})} placeholder="محمد أحمد السالم" /></F>
            <F label="رقم الهاتف" req><TInput value={nf.phone} onChange={v=>setNf({...nf,phone:v})} placeholder="+962-79-XXX-XXXX" icon={<Phone size={13}/>} /></F>
            <F label="البريد الإلكتروني (للدخول على النظام)" req><TInput value={nf.email} onChange={v=>setNf({...nf,email:v})} placeholder="employee@store.jo" /></F>
            <p className="text-xs text-muted-foreground -mt-2">💡 الموظف يقدر يدخل أيضاً برقم هاتفه المسجّل</p>
            <F label="الدور الوظيفي"><SInput value={nf.role} onChange={v=>setNf({...nf,role:v})} options={ROLE_OPTS} /></F>
            <F label="شفت الدوام"><SInput value={nf.shift} onChange={v=>setNf({...nf,shift:v})} options={SHIFT_OPTS} /></F>
            {nf.shift !== "flexible" && (
              <div className="grid grid-cols-2 gap-3">
                <F label="بداية الشفت"><TInput value={nf.shiftStart} onChange={v=>setNf({...nf,shiftStart:v})} placeholder="08:00" /></F>
                <F label="نهاية الشفت"><TInput value={nf.shiftEnd} onChange={v=>setNf({...nf,shiftEnd:v})} placeholder="16:00" /></F>
              </div>
            )}
            <F label="الفرع"><SInput value={nf.branch} onChange={v=>setNf({...nf,branch:v})} options={branchOpts} /></F>
            <div>
              <label className="flex items-center gap-2 cursor-pointer mb-3 select-none">
                <div onClick={()=>setNf({...nf,autoPass:!nf.autoPass})} className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${nf.autoPass?"bg-primary":"bg-muted-foreground/30"}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${nf.autoPass?"translate-x-0":"translate-x-4"}`}/>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">توليد كلمة مرور تلقائياً</span>
              </label>
              {!nf.autoPass && (
                <F label="كلمة المرور"><TInput value={nf.password} onChange={v=>setNf({...nf,password:v})} placeholder="8 أحرف على الأقل" /></F>
              )}
            </div>
            <div className="flex gap-3 justify-end"><Btn v="secondary" onClick={()=>setShowNew(false)}>إلغاء</Btn><Btn onClick={addEmp} disabled={!nf.name||!nf.phone||!nf.email} icon={<Plus size={14}/>}>إضافة الموظف</Btn></div>
          </div>
        </Modal>
      )}
      {editEmp && (
        <Modal title="تعديل بيانات الموظف" onClose={() => { setEditEmp(null); setEditPass(''); }} size="sm">
          <div className="space-y-4">
            {editEmp.email && (
              <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-blue-700 mb-0.5">بريد الدخول على النظام</p>
                  <p className="text-sm font-mono text-blue-900">{editEmp.email}</p>
                </div>
                <p className="text-xs text-blue-500">أو رقم الهاتف</p>
              </div>
            )}
            <F label="الاسم الكامل"><TInput value={editEmp.name} onChange={v=>setEditEmp({...editEmp,name:v})} /></F>
            <F label="رقم الهاتف"><TInput value={editEmp.phone} onChange={v=>setEditEmp({...editEmp,phone:v})} /></F>
            <F label="الدور الوظيفي"><SInput value={editEmp.role} onChange={v=>setEditEmp({...editEmp,role:v})} options={ROLE_OPTS} /></F>
            <F label="الحالة"><SInput value={editEmp.status} onChange={v=>setEditEmp({...editEmp,status:v})} options={STATUS_OPTS} /></F>
            <F label="الفرع"><SInput value={editEmp.branch || "الفرع الرئيسي"} onChange={v=>setEditEmp({...editEmp,branch:v})} options={branchOpts} /></F>
            <F label="شفت الدوام"><SInput value={editEmp.shift || "flexible"} onChange={v=>setEditEmp({...editEmp,shift:v})} options={SHIFT_OPTS} /></F>
            {(editEmp.shift || "flexible") !== "flexible" && (
              <div className="grid grid-cols-2 gap-3">
                <F label="بداية الشفت"><TInput value={editEmp.shiftStart || ""} onChange={v=>setEditEmp({...editEmp,shiftStart:v})} placeholder="08:00" /></F>
                <F label="نهاية الشفت"><TInput value={editEmp.shiftEnd || ""} onChange={v=>setEditEmp({...editEmp,shiftEnd:v})} placeholder="16:00" /></F>
              </div>
            )}
            <F label="كلمة مرور جديدة (اتركها فارغة إن لم تريد تغييرها)">
              <TInput value={editPass} onChange={setEditPass} placeholder="••••••••" />
            </F>
            <div className="flex gap-3 justify-end"><Btn v="secondary" onClick={()=>{ setEditEmp(null); setEditPass(''); }}>إلغاء</Btn><Btn onClick={saveEdit} icon={<Check size={14}/>}>حفظ التعديلات</Btn></div>
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

type Coupon = { id: string; code: string; desc: string; uses: number; exp: string; type: string; value: number; maxUses: number; active: boolean };

function LoyaltyScreen() {
  const { data: custsRaw } = useApi<unknown[]>("/customers", []);
  const { data: couponsRaw, refresh: refreshCoupons } = useApi<unknown[]>("/coupons", []);
  const [custs, setCusts] = useState<{id:string;name:string;loyaltyPoints?:number}[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nf, setNf] = useState({ code: "", desc: "", exp: "", type: "نسبة", value: "", maxUses: "" });

  useEffect(() => { setCusts(normList<{id:string;name:string;loyaltyPoints?:number}>(custsRaw)); }, [custsRaw]);
  useEffect(() => { setCoupons(normList<Coupon>(couponsRaw)); }, [couponsRaw]);

  const totalPoints = custs.reduce((a, c) => a + (c.loyaltyPoints || 0), 0);
  const activeCoupons = coupons.filter(c => c.active && (!c.exp || new Date(c.exp) >= new Date()));

  const TIERS = [
    { l: "عادي",    min: 0,    max: 199,   icon: "🥉" },
    { l: "فضي",     min: 200,  max: 499,   icon: "🥈" },
    { l: "ذهبي",    min: 500,  max: 999,   icon: "🥇" },
    { l: "بلاتيني", min: 1000, max: 99999, icon: "💎" },
  ];
  const tierCounts = TIERS.map(t => ({
    ...t, count: custs.filter(c => (c.loyaltyPoints || 0) >= t.min && (c.loyaltyPoints || 0) <= t.max).length,
  }));

  const addCoupon = async () => {
    if (!nf.code || !nf.desc || !nf.value) return;
    setSaving(true);
    try {
      await storeApi.post("/coupons", { code: nf.code.toUpperCase(), desc: nf.desc, type: nf.type, value: parseFloat(nf.value), exp: nf.exp, maxUses: parseInt(nf.maxUses || "0") });
      showToast(`تم إضافة القسيمة ${nf.code.toUpperCase()}`);
      setShowNew(false);
      setNf({ code: "", desc: "", exp: "", type: "نسبة", value: "", maxUses: "" });
      refreshCoupons();
    } catch (e) {
      showToast((e as {error?:string}).error || "فشل الإضافة", "error");
    } finally { setSaving(false); }
  };

  const delCoupon = async (id: string) => {
    try {
      await storeApi.delete(`/coupons/${id}`);
      showToast("تم حذف القسيمة", "warning");
      refreshCoupons();
    } catch { showToast("فشل الحذف", "error"); }
  };

  const copyCoupon = (code: string) => { navigator.clipboard?.writeText(code); showToast(`تم نسخ الكود: ${code}`, "info"); };

  return (
    <div className="p-3 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto h-full">
      <Hdr title="نظام الولاء والمكافآت" action={<Btn s="sm" icon={<Plus size={13} />} onClick={() => setShowNew(true)}>قسيمة جديدة</Btn>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KPI icon={<Star size={18} />}  label="إجمالي النقاط"  value={totalPoints.toLocaleString("ar-JO")} color="#D97706" />
        <KPI icon={<Users size={18} />} label="أعضاء الولاء"   value={String(custs.length)}                color="#7C3AED" />
        <KPI icon={<Tag size={18} />}   label="قسائم نشطة"     value={String(activeCoupons.length)}        color="#059669" />
        <KPI icon={<Hash size={18} />}  label="إجمالي القسائم" value={String(coupons.length)}              color="#4F46E5" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-4">مستويات العضوية</p>
          {custs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">لا يوجد عملاء بعد — أضف عملاء من قسم العملاء</p>
          ) : (
            <div className="space-y-3">
              {tierCounts.map(m => (
                <div key={m.l} className="flex items-center gap-3 border border-border rounded-xl p-3">
                  <span className="text-xl shrink-0">{m.icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-sm">{m.l}</span>
                      <span className="text-xs text-muted-foreground font-bold">{m.count} عميل</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: custs.length ? `${Math.round((m.count / custs.length) * 100)}%` : "0%" }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{m.min} — {m.max === 99999 ? "∞" : m.max} نقطة</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold mb-4">القسائم النشطة</p>
          {activeCoupons.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">لا توجد قسائم — أضف قسيمة جديدة</p>
          ) : (
            <div className="space-y-3">
              {activeCoupons.map(c => {
                const expired = c.exp && new Date(c.exp) < new Date();
                return (
                  <div key={c.id} className={`border rounded-xl p-3 flex items-center gap-3 ${expired ? "border-red-200 bg-red-50" : "border-border"}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-primary">{c.code}</span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{c.value} {c.type === "نسبة" ? "%" : "JOD"}</span>
                        {c.maxUses > 0 && <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{c.uses}/{c.maxUses} استخدام</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.desc}{c.exp ? ` • ينتهي ${c.exp}` : ""}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => copyCoupon(c.code)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground transition-colors"><Copy size={11} /></button>
                      <button onClick={() => delCoupon(c.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-100 text-red-500 transition-colors"><Trash2 size={11} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Btn full v="secondary" cls="mt-4" icon={<Plus size={13} />} onClick={() => setShowNew(true)}>إضافة قسيمة جديدة</Btn>
        </div>
      </div>

      {showNew && (
        <Modal title="إضافة قسيمة خصم جديدة" onClose={() => setShowNew(false)} size="sm">
          <div className="space-y-4">
            <F label="كود القسيمة" req><TInput value={nf.code} onChange={v=>setNf({...nf,code:v.toUpperCase()})} placeholder="PROMO20" /></F>
            <F label="وصف القسيمة" req><TInput value={nf.desc} onChange={v=>setNf({...nf,desc:v})} placeholder="خصم 20% على المشتريات" /></F>
            <F label="نوع الخصم"><SInput value={nf.type} onChange={v=>setNf({...nf,type:v})} options={[{value:"نسبة",label:"نسبة مئوية %"},{value:"مبلغ",label:"مبلغ ثابت JOD"}]} /></F>
            <F label={`قيمة الخصم ${nf.type === "نسبة" ? "(%)" : "(JOD)"}`} req><TInput value={nf.value} onChange={v=>setNf({...nf,value:v})} type="number" placeholder={nf.type === "نسبة" ? "20" : "5.000"} /></F>
            <F label="الحد الأقصى للاستخدام (0 = غير محدود)"><TInput value={nf.maxUses} onChange={v=>setNf({...nf,maxUses:v})} type="number" placeholder="0" /></F>
            <F label="تاريخ الانتهاء"><TInput value={nf.exp} onChange={v=>setNf({...nf,exp:v})} type="date" /></F>
            <div className="flex gap-3 justify-end">
              <Btn v="secondary" onClick={()=>setShowNew(false)}>إلغاء</Btn>
              <Btn onClick={addCoupon} disabled={!nf.code||!nf.desc||!nf.value||saving} icon={<Plus size={14}/>}>{saving?"جاري الحفظ...":"إضافة القسيمة"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRINT SHOP SCREENS — مطبعة / ضغاطة
// ─────────────────────────────────────────────────────────────────────────────

type PrintMat = { id: string; name: string; type: string; unit: string; rollWidth: number; rollLength: number; totalArea: number; usedArea: number; costPerUnit: number; supplier: string; minStock: number; status: string };
type PrintJob = { id: string; jobNo: string; customer: string; phone: string; status: string; total: number; createdAt: string; deadline?: string; items: { service: string; material: string; width: number; height: number; qty: number; area: number; pricePerSqm: number; subtotal: number; wastePercent: number; deductedArea: number }[]; designFee: number; cuttingFee: number; laminationFee: number; installFee: number; discount: number; tax: number; notes: string; assignedTo: string };
type PrintPrice = { id: string; name: string; pricingType: string; pricePerUnit: number; minCharge: number; notes: string; active: boolean };

const JOB_STATUSES: { value: string; label: string; color: string }[] = [
  { value: "new",              label: "جديد",                color: "bg-blue-100 text-blue-700" },
  { value: "waiting_design",   label: "انتظار التصميم",       color: "bg-purple-100 text-purple-700" },
  { value: "design_ready",     label: "التصميم جاهز",         color: "bg-indigo-100 text-indigo-700" },
  { value: "waiting_approval", label: "انتظار الموافقة",      color: "bg-amber-100 text-amber-700" },
  { value: "approved",         label: "موافق عليه",           color: "bg-teal-100 text-teal-700" },
  { value: "printing",         label: "قيد الطباعة",          color: "bg-cyan-100 text-cyan-700" },
  { value: "cutting",          label: "قيد القص",             color: "bg-orange-100 text-orange-700" },
  { value: "finishing",        label: "قيد التشطيب",          color: "bg-rose-100 text-rose-700" },
  { value: "ready",            label: "جاهز للاستلام",        color: "bg-emerald-100 text-emerald-700" },
  { value: "delivered",        label: "تم التسليم",           color: "bg-green-100 text-green-700" },
  { value: "cancelled",        label: "ملغى",                 color: "bg-red-100 text-red-700" },
];
const statusLabel = (v: string) => JOB_STATUSES.find(s => s.value === v)?.label || v;
const statusColor = (v: string) => JOB_STATUSES.find(s => s.value === v)?.color || "bg-gray-100 text-gray-700";

// ── PrintJobsScreen ───────────────────────────────────────────────────────────
function PrintJobsScreen({ store }: { store: StoreData }) {
  const { data: jobsRaw, refresh, loading } = useApi<unknown[]>("/print-jobs", []);
  const jobs = normList<PrintJob>(jobsRaw);
  const { data: matsRaw } = useApi<unknown[]>("/print-materials", []);
  const mats = normList<PrintMat>(matsRaw);

  const [viewJob, setViewJob] = useState<PrintJob | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  // New job form
  const emptyItem = () => ({ service: "", material: "", materialId: "", width: 1, height: 1, qty: 1, pricePerSqm: 0, wastePercent: 5 });
  const [nf, setNf] = useState({ customer: "", phone: "", deadline: "", notes: "", assignedTo: "", designFee: "0", cuttingFee: "0", laminationFee: "0", installFee: "0", discount: "0", vatRate: "16" });
  const [items, setItems] = useState([emptyItem()]);

  const calcItem = (it: ReturnType<typeof emptyItem>) => {
    const area = it.width * it.height * it.qty;
    const deducted = area * (1 + it.wastePercent / 100);
    const subtotal = area * it.pricePerSqm;
    return { ...it, area: +area.toFixed(4), deductedArea: +deducted.toFixed(4), subtotal: +subtotal.toFixed(3) };
  };
  const calcedItems = items.map(calcItem);
  const subtotalItems = calcedItems.reduce((a, i) => a + i.subtotal, 0);
  const fees = (parseFloat(nf.designFee) || 0) + (parseFloat(nf.cuttingFee) || 0) + (parseFloat(nf.laminationFee) || 0) + (parseFloat(nf.installFee) || 0);
  const disc = parseFloat(nf.discount) || 0;
  const vatRate = (parseFloat(nf.vatRate) || 16) / 100;
  const beforeTax = subtotalItems + fees - disc;
  const tax = beforeTax * vatRate;
  const total = beforeTax + tax;

  const saveJob = async () => {
    if (!nf.customer || calcedItems.length === 0) { showToast("الرجاء إدخال اسم العميل وبند واحد على الأقل", "error"); return; }
    setSaving(true);
    try {
      await storeApi.post("/print-jobs", {
        customer: nf.customer, phone: nf.phone, notes: nf.notes, assignedTo: nf.assignedTo,
        deadline: nf.deadline || undefined,
        items: calcedItems.map(i => ({ ...i, materialId: mats.find(m => m.name === i.material)?.id || undefined })),
        designFee: parseFloat(nf.designFee) || 0,
        cuttingFee: parseFloat(nf.cuttingFee) || 0,
        laminationFee: parseFloat(nf.laminationFee) || 0,
        installFee: parseFloat(nf.installFee) || 0,
        discount: disc, tax, total,
      });
      showToast("تم إنشاء طلب الطباعة ✅");
      setShowNew(false);
      setItems([emptyItem()]);
      setNf({ customer: "", phone: "", deadline: "", notes: "", assignedTo: "", designFee: "0", cuttingFee: "0", laminationFee: "0", installFee: "0", discount: "0", vatRate: "16" });
      refresh();
    } catch (e) { showToast((e as { error?: string }).error || "فشل الحفظ", "error"); }
    finally { setSaving(false); }
  };

  const changeStatus = async (job: PrintJob, status: string) => {
    await storeApi.patch(`/print-jobs/${job.id}/status`, { status });
    showToast(`تم تغيير الحالة إلى: ${statusLabel(status)}`);
    refresh();
    if (viewJob?.id === job.id) setViewJob({ ...viewJob, status });
  };

  const printJobCard = (job: PrintJob) => {
    const w = window.open("", "_blank", "width=480,height=700");
    if (!w) return;
    const rows = job.items.map(i => `<tr><td>${i.service}</td><td>${i.material||"—"}</td><td>${i.width}×${i.height}م</td><td>${i.qty}</td><td>${i.area.toFixed(3)} م²</td><td>${i.subtotal.toFixed(3)} JOD</td></tr>`).join("");
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>طلب طباعة ${job.jobNo}</title><style>body{font-family:'Cairo',Arial,sans-serif;padding:20px;font-size:12px}h2{text-align:center}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px;text-align:right}th{background:#f5f5f5}.total{font-weight:bold;font-size:14px}@media print{button{display:none}}</style></head><body>
    <h2>طلب طباعة — ${store.nameAr}</h2><p>رقم الطلب: <b>${job.jobNo}</b> | العميل: <b>${job.customer}</b> | الهاتف: ${job.phone||"—"} | التاريخ: ${new Date(job.createdAt).toLocaleDateString("ar-JO")}${job.deadline ? " | الموعد: "+new Date(job.deadline).toLocaleDateString("ar-JO") : ""}</p>
    <table><thead><tr><th>الخدمة</th><th>المادة</th><th>الأبعاد</th><th>الكمية</th><th>المساحة</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>
    <br><table><tr><td>إجمالي البنود</td><td>${subtotalItems.toFixed(3)} JOD</td></tr>${job.designFee?"<tr><td>رسوم تصميم</td><td>"+job.designFee.toFixed(3)+" JOD</td></tr>":""}${job.cuttingFee?"<tr><td>رسوم قص</td><td>"+job.cuttingFee.toFixed(3)+" JOD</td></tr>":""}${job.laminationFee?"<tr><td>رسوم تغليف</td><td>"+job.laminationFee.toFixed(3)+" JOD</td></tr>":""}${job.installFee?"<tr><td>رسوم تركيب</td><td>"+job.installFee.toFixed(3)+" JOD</td></tr>":""}${job.discount?"<tr><td>خصم</td><td>-"+job.discount.toFixed(3)+" JOD</td></tr>":""}<tr><td>ضريبة القيمة المضافة</td><td>${job.tax.toFixed(3)} JOD</td></tr><tr class="total"><td>الإجمالي النهائي</td><td>${job.total.toFixed(3)} JOD</td></tr></table>
    <p>${job.notes ? "ملاحظات: "+job.notes : ""}</p><br><button onclick="window.print()">طباعة</button></body></html>`);
    w.document.close();
  };

  const filtered = statusFilter === "all" ? jobs : jobs.filter(j => j.status === statusFilter);
  const stats = { total: jobs.length, active: jobs.filter(j => !["delivered","cancelled"].includes(j.status)).length, ready: jobs.filter(j => j.status === "ready").length, revenue: jobs.filter(j => j.status === "delivered").reduce((a, j) => a + j.total, 0) };

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <Hdr title="طلبات الطباعة" sub="إدارة أوامر الإنتاج وتتبع الحالة" action={<Btn icon={<Plus size={14} />} onClick={() => setShowNew(true)}>طلب جديد</Btn>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI icon={<Printer size={18} />} label="إجمالي الطلبات" value={String(stats.total)} color="#0891B2" />
        <KPI icon={<Ruler size={18} />} label="طلبات نشطة" value={String(stats.active)} color="#D97706" />
        <KPI icon={<CheckCircle size={18} />} label="جاهزة للاستلام" value={String(stats.ready)} color="#059669" />
        <KPI icon={<DollarSign size={18} />} label="إيرادات مسلّمة" value={`${stats.revenue.toFixed(3)} JOD`} color="#7C3AED" />
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[{ value: "all", label: "الكل" }, ...JOB_STATUSES].map(s => (
          <button key={s.value} onClick={() => setStatusFilter(s.value)}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${statusFilter === s.value ? "bg-primary text-white border-primary" : "bg-card border-border text-muted-foreground"}`}>
            {s.label}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div> :
        filtered.length === 0 ? <Empty icon={<Printer size={28} />} title="لا توجد طلبات" desc="أنشئ أول طلب طباعة من الزر أعلاه" /> :
        <div className="space-y-2">
          {filtered.map(job => (
            <div key={job.id} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0"><Printer size={16} className="text-cyan-600" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><p className="font-bold text-sm">{job.jobNo}</p><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(job.status)}`}>{statusLabel(job.status)}</span></div>
                <p className="text-xs text-muted-foreground">{job.customer} • {job.items?.length || 0} بنود • {job.total.toFixed(3)} JOD{job.deadline ? " • الموعد: "+new Date(job.deadline).toLocaleDateString("ar-JO") : ""}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Btn v="secondary" s="xs" icon={<Eye size={10} />} onClick={() => setViewJob(job)}>عرض</Btn>
                <Btn v="ghost" s="xs" icon={<Printer size={10} />} onClick={() => printJobCard(job)} />
                <select value={job.status} onChange={e => changeStatus(job, e.target.value)} className="text-xs rounded-lg border border-border bg-input px-2 py-1 text-foreground">
                  {JOB_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      }

      {/* View Job Modal */}
      {viewJob && (
        <Modal title={`طلب ${viewJob.jobNo}`} sub={`${viewJob.customer} • ${statusLabel(viewJob.status)}`} onClose={() => setViewJob(null)}>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[["العميل", viewJob.customer], ["الهاتف", viewJob.phone||"—"], ["الحالة", statusLabel(viewJob.status)], ["المسؤول", viewJob.assignedTo||"—"], ["الموعد", viewJob.deadline ? new Date(viewJob.deadline).toLocaleDateString("ar-JO") : "—"], ["الإجمالي", `${viewJob.total.toFixed(3)} JOD`]].map(([l, v]) =>
                <div key={l} className="bg-muted/40 rounded-xl p-2.5"><p className="text-xs text-muted-foreground">{l}</p><p className="font-bold">{v}</p></div>
              )}
            </div>
            <table className="w-full text-xs border-collapse">
              <thead><tr className="bg-muted/50">{["الخدمة","المادة","العرض×الارتفاع","الكمية","المساحة م²","السعر/م²","الإجمالي"].map(h => <th key={h} className="border border-border px-2 py-1 text-right font-bold">{h}</th>)}</tr></thead>
              <tbody>{viewJob.items?.map((it, i) => <tr key={i}><td className="border border-border px-2 py-1">{it.service}</td><td className="border border-border px-2 py-1">{it.material||"—"}</td><td className="border border-border px-2 py-1">{it.width}×{it.height}م</td><td className="border border-border px-2 py-1">{it.qty}</td><td className="border border-border px-2 py-1">{it.area?.toFixed(3)}</td><td className="border border-border px-2 py-1">{it.pricePerSqm?.toFixed(3)}</td><td className="border border-border px-2 py-1 font-bold">{it.subtotal?.toFixed(3)}</td></tr>)}</tbody>
            </table>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[["رسوم تصميم", viewJob.designFee], ["رسوم قص", viewJob.cuttingFee], ["تغليف", viewJob.laminationFee], ["تركيب", viewJob.installFee]].filter(([,v]) => Number(v) > 0).map(([l,v]) => <div key={String(l)} className="flex justify-between bg-muted/30 rounded px-2 py-1"><span>{l}</span><span>{Number(v).toFixed(3)} JOD</span></div>)}
              <div className="flex justify-between bg-primary/10 rounded px-2 py-1 font-black col-span-2"><span>الإجمالي النهائي</span><span>{viewJob.total.toFixed(3)} JOD</span></div>
            </div>
            {viewJob.notes && <p className="text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">ملاحظات: {viewJob.notes}</p>}
            <div className="flex gap-2">
              <Btn v="secondary" cls="flex-1" icon={<Printer size={13} />} onClick={() => printJobCard(viewJob)}>طباعة الطلب</Btn>
              <F label="تغيير الحالة"><select value={viewJob.status} onChange={e => changeStatus(viewJob, e.target.value)} className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm">
                {JOB_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select></F>
            </div>
          </div>
        </Modal>
      )}

      {/* New Job Modal */}
      {showNew && (
        <Modal title="طلب طباعة جديد" sub="احسب المساحة والسعر تلقائياً" onClose={() => setShowNew(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <F label="اسم العميل" req><TInput value={nf.customer} onChange={v => setNf(f => ({ ...f, customer: v }))} placeholder="اسم الزبون" /></F>
              <F label="رقم الهاتف"><TInput value={nf.phone} onChange={v => setNf(f => ({ ...f, phone: v }))} /></F>
              <F label="الموعد المطلوب"><TInput value={nf.deadline} onChange={v => setNf(f => ({ ...f, deadline: v }))} type="date" /></F>
              <F label="المسؤول عن الطلب"><TInput value={nf.assignedTo} onChange={v => setNf(f => ({ ...f, assignedTo: v }))} /></F>
            </div>

            <div className="border border-border rounded-2xl overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 flex items-center justify-between"><p className="font-bold text-sm">بنود الطلب</p><Btn s="xs" v="ghost" icon={<Plus size={12} />} onClick={() => setItems(p => [...p, emptyItem()])}>إضافة بند</Btn></div>
              <div className="divide-y divide-border">
                {items.map((it, i) => {
                  const c = calcItem(it);
                  return (
                    <div key={i} className="p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <F label="الخدمة / المنتج"><TInput value={it.service} onChange={v => setItems(p => p.map((x, j) => j === i ? { ...x, service: v } : x))} placeholder="ستيكر / بانر / كروت..." /></F>
                        <F label="المادة المستخدمة">
                          <select value={it.material} onChange={e => setItems(p => p.map((x, j) => j === i ? { ...x, material: e.target.value } : x))} className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm">
                            <option value="">بدون مادة</option>
                            {mats.map(m => <option key={m.id} value={m.name}>{m.name} ({((m.totalArea||0)-(m.usedArea||0)).toFixed(1)} م² متبقي)</option>)}
                          </select>
                        </F>
                        <F label="العرض (م)"><TInput value={String(it.width)} onChange={v => setItems(p => p.map((x, j) => j === i ? { ...x, width: parseFloat(v)||0 } : x))} type="number" placeholder="1.00" /></F>
                        <F label="الارتفاع (م)"><TInput value={String(it.height)} onChange={v => setItems(p => p.map((x, j) => j === i ? { ...x, height: parseFloat(v)||0 } : x))} type="number" placeholder="1.00" /></F>
                        <F label="الكمية"><TInput value={String(it.qty)} onChange={v => setItems(p => p.map((x, j) => j === i ? { ...x, qty: parseInt(v)||1 } : x))} type="number" /></F>
                        <F label="السعر / م²"><TInput value={String(it.pricePerSqm)} onChange={v => setItems(p => p.map((x, j) => j === i ? { ...x, pricePerSqm: parseFloat(v)||0 } : x))} type="number" placeholder="0.000" /></F>
                        <F label="نسبة الهدر %"><TInput value={String(it.wastePercent)} onChange={v => setItems(p => p.map((x, j) => j === i ? { ...x, wastePercent: parseFloat(v)||0 } : x))} type="number" placeholder="5" /></F>
                        <div className="flex flex-col justify-end">
                          <div className="bg-cyan-50 border border-cyan-200 rounded-xl px-3 py-2 text-center">
                            <p className="text-xs text-cyan-600">م²: {c.area.toFixed(3)} — إجمالي: <b>{c.subtotal.toFixed(3)} JOD</b></p>
                          </div>
                        </div>
                      </div>
                      {items.length > 1 && <Btn v="ghost" s="xs" icon={<Trash2 size={11} />} onClick={() => setItems(p => p.filter((_, j) => j !== i))}>حذف البند</Btn>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <F label="رسوم التصميم (JOD)"><TInput value={nf.designFee} onChange={v => setNf(f => ({ ...f, designFee: v }))} type="number" /></F>
              <F label="رسوم القص (JOD)"><TInput value={nf.cuttingFee} onChange={v => setNf(f => ({ ...f, cuttingFee: v }))} type="number" /></F>
              <F label="رسوم التغليف (JOD)"><TInput value={nf.laminationFee} onChange={v => setNf(f => ({ ...f, laminationFee: v }))} type="number" /></F>
              <F label="رسوم التركيب (JOD)"><TInput value={nf.installFee} onChange={v => setNf(f => ({ ...f, installFee: v }))} type="number" /></F>
              <F label="الخصم (JOD)"><TInput value={nf.discount} onChange={v => setNf(f => ({ ...f, discount: v }))} type="number" /></F>
              <F label="نسبة الضريبة %"><TInput value={nf.vatRate} onChange={v => setNf(f => ({ ...f, vatRate: v }))} type="number" /></F>
            </div>

            <F label="ملاحظات"><TInput value={nf.notes} onChange={v => setNf(f => ({ ...f, notes: v }))} placeholder="أي تعليمات خاصة..." /></F>

            <div className="bg-gradient-to-l from-cyan-50 to-blue-50 border border-cyan-200 rounded-2xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">إجمالي البنود</span><span className="font-bold">{subtotalItems.toFixed(3)} JOD</span></div>
              {fees > 0 && <div className="flex justify-between"><span className="text-muted-foreground">رسوم إضافية</span><span>{fees.toFixed(3)} JOD</span></div>}
              {disc > 0 && <div className="flex justify-between"><span className="text-muted-foreground">خصم</span><span className="text-red-600">-{disc.toFixed(3)} JOD</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">ضريبة</span><span>{tax.toFixed(3)} JOD</span></div>
              <div className="flex justify-between border-t border-cyan-200 pt-1.5"><span className="font-black text-lg">الإجمالي النهائي</span><span className="font-black text-lg text-primary">{total.toFixed(3)} JOD</span></div>
            </div>

            <div className="flex gap-3"><Btn v="secondary" cls="flex-1" onClick={() => setShowNew(false)}>إلغاء</Btn><Btn cls="flex-1" disabled={saving} icon={<Printer size={14} />} onClick={saveJob}>{saving ? "جاري الحفظ..." : "حفظ الطلب"}</Btn></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── PrintMatsScreen ───────────────────────────────────────────────────────────
function PrintMatsScreen() {
  const { data: matsRaw, refresh, loading } = useApi<unknown[]>("/print-materials", []);
  const mats = normList<PrintMat>(matsRaw);
  const [showNew, setShowNew] = useState(false);
  const [editMat, setEditMat] = useState<PrintMat | null>(null);
  const [saving, setSaving] = useState(false);
  const emptyForm = () => ({ name: "", type: "sticker_roll", unit: "sqm", rollWidth: "1.22", rollLength: "50", costPerUnit: "0", supplier: "", minStock: "5" });
  const [form, setForm] = useState(emptyForm());

  const totalArea = (parseFloat(form.rollWidth) || 0) * (parseFloat(form.rollLength) || 0);

  const save = async () => {
    if (!form.name) { showToast("اسم المادة مطلوب", "error"); return; }
    setSaving(true);
    try {
      const body = { name: form.name, type: form.type, unit: form.unit, rollWidth: parseFloat(form.rollWidth) || 0, rollLength: parseFloat(form.rollLength) || 0, costPerUnit: parseFloat(form.costPerUnit) || 0, supplier: form.supplier, minStock: parseFloat(form.minStock) || 5 };
      if (editMat) {
        await storeApi.put(`/print-materials/${editMat.id}`, body);
        showToast("تم تحديث المادة ✅");
      } else {
        await storeApi.post("/print-materials", body);
        showToast("تم إضافة المادة ✅");
      }
      setShowNew(false); setEditMat(null); setForm(emptyForm()); refresh();
    } catch (e) { showToast((e as { error?: string }).error || "فشل الحفظ", "error"); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("حذف هذه المادة؟")) return;
    await storeApi.delete(`/print-materials/${id}`);
    showToast("تم الحذف", "warning"); refresh();
  };

  const openEdit = (m: PrintMat) => {
    setEditMat(m);
    setForm({ name: m.name, type: m.type, unit: m.unit, rollWidth: String(m.rollWidth||0), rollLength: String(m.rollLength||0), costPerUnit: String(m.costPerUnit||0), supplier: m.supplier||"", minStock: String(m.minStock||5) });
    setShowNew(true);
  };

  const TYPES = [["sticker_roll","رول ستيكر"],["vinyl","فينيل"],["banner","بانر"],["flex","فليكس"],["canvas","كانفاس"],["paper","ورق"],["photo_paper","ورق صور"],["business_card","ورق كروت"],["ink","حبر"],["lamination","لمينيشن"],["other","أخرى"]];

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <Hdr title="مواد الطباعة" sub="إدارة الرولات والمواد الخام وتتبع الكميات" action={<Btn icon={<Plus size={14} />} onClick={() => { setEditMat(null); setForm(emptyForm()); setShowNew(true); }}>إضافة مادة</Btn>} />

      {loading ? <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div> :
        mats.length === 0 ? <Empty icon={<Ruler size={28} />} title="لا توجد مواد بعد" desc="أضف أول مادة طباعة من الزر أعلاه" /> :
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {mats.map(m => {
            const remaining = (m.totalArea || 0) - (m.usedArea || 0);
            const pct = m.totalArea ? Math.max(0, Math.round((remaining / m.totalArea) * 100)) : 100;
            const barColor = pct > 30 ? "bg-emerald-500" : pct > 10 ? "bg-amber-500" : "bg-red-500";
            return (
              <div key={m.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.supplier || "—"} • {m.unit}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.status === "active" ? "bg-emerald-100 text-emerald-700" : m.status === "low" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                    {m.status === "active" ? "متوفر" : m.status === "low" ? "منخفض" : "نفد"}
                  </span>
                </div>
                {m.rollWidth > 0 && (
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-muted/40 rounded-xl p-2"><p className="font-black">{(m.totalArea||0).toFixed(1)}</p><p className="text-muted-foreground">إجمالي م²</p></div>
                    <div className="bg-muted/40 rounded-xl p-2"><p className="font-black text-red-600">{(m.usedArea||0).toFixed(1)}</p><p className="text-muted-foreground">مستخدم م²</p></div>
                    <div className="bg-muted/40 rounded-xl p-2"><p className="font-black text-emerald-600">{remaining.toFixed(1)}</p><p className="text-muted-foreground">متبقي م²</p></div>
                  </div>
                )}
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>المتبقي</span><span>{pct}%</span></div>
                  <div className="h-2 bg-muted rounded-full"><div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} /></div>
                </div>
                <div className="flex gap-2">
                  <Btn v="secondary" s="xs" cls="flex-1" icon={<Edit2 size={11} />} onClick={() => openEdit(m)}>تعديل</Btn>
                  <Btn v="ghost" s="xs" icon={<Trash2 size={11} />} onClick={() => del(m.id)}>حذف</Btn>
                </div>
              </div>
            );
          })}
        </div>
      }

      {showNew && (
        <Modal title={editMat ? "تعديل المادة" : "إضافة مادة جديدة"} onClose={() => { setShowNew(false); setEditMat(null); }} size="sm">
          <div className="space-y-3">
            <F label="اسم المادة" req><TInput value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="رول ستيكر أبيض 1.22م" /></F>
            <div className="grid grid-cols-2 gap-3">
              <F label="نوع المادة">
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm">
                  {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </F>
              <F label="وحدة القياس">
                <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm">
                  {[["sqm","متر مربع"],["meter","متر طولي"],["roll","رول"],["sheet","ورقة"],["piece","قطعة"],["liter","لتر"],["box","صندوق"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </F>
              <F label="عرض الرول (م)"><TInput value={form.rollWidth} onChange={v => setForm(f => ({ ...f, rollWidth: v }))} type="number" placeholder="1.22" /></F>
              <F label="طول الرول (م)"><TInput value={form.rollLength} onChange={v => setForm(f => ({ ...f, rollLength: v }))} type="number" placeholder="50" /></F>
            </div>
            {totalArea > 0 && <div className="bg-cyan-50 border border-cyan-200 rounded-xl px-4 py-2 text-center text-sm"><span className="text-cyan-700">إجمالي المساحة: <b>{totalArea.toFixed(2)} م²</b></span></div>}
            <div className="grid grid-cols-2 gap-3">
              <F label="التكلفة / وحدة (JOD)"><TInput value={form.costPerUnit} onChange={v => setForm(f => ({ ...f, costPerUnit: v }))} type="number" /></F>
              <F label="حد التنبيه (م²)"><TInput value={form.minStock} onChange={v => setForm(f => ({ ...f, minStock: v }))} type="number" /></F>
            </div>
            <F label="المورد"><TInput value={form.supplier} onChange={v => setForm(f => ({ ...f, supplier: v }))} /></F>
            <div className="flex gap-3"><Btn v="secondary" cls="flex-1" onClick={() => { setShowNew(false); setEditMat(null); }}>إلغاء</Btn><Btn cls="flex-1" disabled={saving} onClick={save}>{saving ? "جاري الحفظ..." : "حفظ"}</Btn></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── PrintPricesScreen ─────────────────────────────────────────────────────────
function PrintPricesScreen() {
  const { data: pricesRaw, refresh } = useApi<unknown[]>("/print-price-lists", []);
  const prices = normList<PrintPrice>(pricesRaw);
  const [showNew, setShowNew] = useState(false);
  const [editP, setEditP] = useState<PrintPrice | null>(null);
  const [saving, setSaving] = useState(false);
  const emptyForm = () => ({ name: "", pricingType: "sqm", pricePerUnit: "", minCharge: "0", notes: "" });
  const [form, setForm] = useState(emptyForm());

  const PRICING_TYPES = [["sqm","متر مربع (م²)"],["meter","متر طولي"],["piece","قطعة"],["sheet","ورقة"],["job","وظيفة ثابتة"],["design","تصميم"],["installation","تركيب"],["cutting","قص"],["lamination","تغليف"]];

  const save = async () => {
    if (!form.name || !form.pricePerUnit) { showToast("الاسم والسعر مطلوبان", "error"); return; }
    setSaving(true);
    try {
      const body = { name: form.name, pricingType: form.pricingType, pricePerUnit: parseFloat(form.pricePerUnit), minCharge: parseFloat(form.minCharge) || 0, notes: form.notes, active: true };
      if (editP) { await storeApi.put(`/print-price-lists/${editP.id}`, body); showToast("تم التحديث ✅"); }
      else { await storeApi.post("/print-price-lists", body); showToast("تم إضافة السعر ✅"); }
      setShowNew(false); setEditP(null); setForm(emptyForm()); refresh();
    } catch { showToast("فشل الحفظ", "error"); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm("حذف هذا السعر؟")) return;
    await storeApi.delete(`/print-price-lists/${id}`);
    showToast("تم الحذف", "warning"); refresh();
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <Hdr title="قائمة أسعار الطباعة" sub="حدد أسعار الخدمات للمتر المربع والقطعة والوظيفة الثابتة" action={<Btn icon={<Plus size={14} />} onClick={() => { setEditP(null); setForm(emptyForm()); setShowNew(true); }}>سعر جديد</Btn>} />

      {prices.length === 0 ? <Empty icon={<Calculator size={28} />} title="لا توجد أسعار بعد" desc="أضف أسعار خدماتك من الزر أعلاه" /> :
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {prices.map(p => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0"><Hash size={14} className="text-cyan-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{PRICING_TYPES.find(([v]) => v === p.pricingType)?.[1] || p.pricingType}{p.minCharge > 0 ? ` • حد أدنى: ${p.minCharge.toFixed(3)} JOD` : ""}</p>
                </div>
                <p className="font-black text-primary">{p.pricePerUnit.toFixed(3)} JOD</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${p.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{p.active ? "نشط" : "معطّل"}</span>
                <div className="flex gap-1.5">
                  <Btn v="ghost" s="xs" icon={<Edit2 size={10} />} onClick={() => { setEditP(p); setForm({ name: p.name, pricingType: p.pricingType, pricePerUnit: String(p.pricePerUnit), minCharge: String(p.minCharge||0), notes: p.notes||"" }); setShowNew(true); }} />
                  <Btn v="ghost" s="xs" icon={<Trash2 size={10} />} onClick={() => del(p.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      }

      {showNew && (
        <Modal title={editP ? "تعديل السعر" : "سعر جديد"} onClose={() => { setShowNew(false); setEditP(null); }} size="sm">
          <div className="space-y-3">
            <F label="اسم الخدمة" req><TInput value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="طباعة ستيكر / بانر / كروت..." /></F>
            <F label="نوع التسعير">
              <select value={form.pricingType} onChange={e => setForm(f => ({ ...f, pricingType: e.target.value }))} className="w-full rounded-xl border border-border bg-input px-3 py-2 text-sm">
                {PRICING_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </F>
            <div className="grid grid-cols-2 gap-3">
              <F label="السعر / وحدة (JOD)" req><TInput value={form.pricePerUnit} onChange={v => setForm(f => ({ ...f, pricePerUnit: v }))} type="number" placeholder="0.000" /></F>
              <F label="الحد الأدنى (JOD)"><TInput value={form.minCharge} onChange={v => setForm(f => ({ ...f, minCharge: v }))} type="number" placeholder="0" /></F>
            </div>
            <F label="ملاحظات"><TInput value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} /></F>
            <div className="flex gap-3"><Btn v="secondary" cls="flex-1" onClick={() => { setShowNew(false); setEditP(null); }}>إلغاء</Btn><Btn cls="flex-1" disabled={saving} onClick={save}>{saving ? "جاري الحفظ..." : "حفظ"}</Btn></div>
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
  // Loyalty settings
  const [loyaltyPPJ, setLoyaltyPPJ] = useState(() => { try { return localStorage.getItem(sk(sid,"sett_loyalty_ppj")) || "1"; } catch { return "1"; } });
  const [loyaltyPV,  setLoyaltyPV]  = useState(() => { try { return localStorage.getItem(sk(sid,"sett_loyalty_pv"))  || "0.010"; } catch { return "0.010"; } });
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
      try { localStorage.setItem(sk(sid, "sett_loyalty_ppj"), loyaltyPPJ); } catch {}
      try { localStorage.setItem(sk(sid, "sett_loyalty_pv"),  loyaltyPV); } catch {}
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
          <p className="font-bold flex items-center gap-2"><Star size={13} /> إعدادات نظام الولاء</p>
          <F label="نقاط لكل دينار أردني مصروف">
            <TInput value={loyaltyPPJ} onChange={setLoyaltyPPJ} type="number" placeholder="1" />
          </F>
          <F label="قيمة النقطة الواحدة (JOD)">
            <TInput value={loyaltyPV} onChange={setLoyaltyPV} type="number" placeholder="0.010" />
          </F>
          <p className="text-xs text-muted-foreground">مثال: إذا كانت 1 نقطة لكل دينار، وقيمة النقطة 0.010 JOD — العميل يجمع 100 نقطة عند إنفاق 100 JOD (= 1 JOD خصم)</p>
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

// ── DebtScreen — ذمم المتجر ───────────────────────────────────────────────────
function DebtScreen() {
  const { data: custsRaw, refresh } = useApi<unknown[]>("/customers", []);
  type DebtCust = { id: string; name: string; phone: string; debt: number };
  const [custs, setCusts] = useState<DebtCust[]>([]);
  useEffect(() => {
    setCusts(normList<DebtCust>(custsRaw).filter(c => (c.debt || 0) > 0));
  }, [custsRaw]);

  const [collecting, setCollecting] = useState<DebtCust | null>(null);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const totalDebt = custs.reduce((a, c) => a + (c.debt || 0), 0);

  const collect = async () => {
    if (!collecting || !amount || parseFloat(amount) <= 0) return;
    setSaving(true);
    try {
      await storeApi.patch(`/customers/${collecting.id}/collect-debt`, { amount: parseFloat(amount) });
      showToast(`تم تسجيل تحصيل ${parseFloat(amount).toFixed(3)} JOD من ${collecting.name}`);
      setCollecting(null);
      setAmount("");
      refresh();
    } catch (e) {
      showToast((e as {error?:string}).error || "فشل التحصيل", "error");
    } finally { setSaving(false); }
  };

  return (
    <div className="p-3 sm:p-5 space-y-4 overflow-y-auto h-full">
      <Hdr title="ذمم المتجر" sub="متابعة المبالغ المستحقة على العملاء" />
      <div className="grid grid-cols-2 gap-3">
        <KPI icon={<Landmark size={18} />} label="إجمالي الذمم" value={`${totalDebt.toFixed(3)} JOD`} color="#D97706" />
        <KPI icon={<Users size={18} />} label="عملاء لديهم ذمم" value={String(custs.length)} color="#DC2626" />
      </div>

      {custs.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border">
          <Empty icon={<Landmark size={28} />} title="لا توجد ذمم" desc="جميع العملاء سدّدوا مستحقاتهم" />
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="divide-y divide-border/60">
            {custs.map(c => (
              <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-muted/20">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                  <span className="font-black text-amber-700">{c.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.phone}</p>
                </div>
                <div className="text-left shrink-0">
                  <p className="font-black text-lg text-amber-600">{(c.debt || 0).toFixed(3)} JOD</p>
                  <p className="text-xs text-muted-foreground">مستحق</p>
                </div>
                <Btn s="sm" v="secondary" icon={<Check size={13} />} onClick={() => { setCollecting(c); setAmount(String((c.debt || 0).toFixed(3))); }}>
                  تحصيل
                </Btn>
              </div>
            ))}
          </div>
        </div>
      )}

      {collecting && (
        <Modal title={`تحصيل ذمة — ${collecting.name}`} onClose={() => { setCollecting(null); setAmount(""); }} size="sm">
          <div className="space-y-4">
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
              <p className="text-sm text-amber-700 mb-1">إجمالي المستحق</p>
              <p className="text-3xl font-black text-amber-600">{(collecting.debt || 0).toFixed(3)} JOD</p>
            </div>
            <F label="المبلغ المُحصَّل (JOD)">
              <TInput value={amount} onChange={setAmount} type="number" placeholder="0.000" icon={<Banknote size={13} />} />
            </F>
            <div className="flex gap-2">
              {[0.5, 1, 5, 10].map(v => (
                <button key={v} onClick={() => setAmount(String(v))} className="flex-1 h-9 rounded-xl text-xs font-bold border border-border bg-muted hover:bg-primary hover:text-white">{v} JOD</button>
              ))}
              <button onClick={() => setAmount(String((collecting.debt || 0).toFixed(3)))} className="flex-1 h-9 rounded-xl text-xs font-bold border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100">الكل</button>
            </div>
            <div className="flex gap-3">
              <Btn v="secondary" onClick={() => { setCollecting(null); setAmount(""); }} cls="flex-1">إلغاء</Btn>
              <Btn v="success" onClick={collect} disabled={saving || !amount || parseFloat(amount) <= 0} cls="flex-1" icon={<Check size={14} />}>تأكيد التحصيل</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GIFT CARDS SCREEN — بطاقات الهدايا
// ─────────────────────────────────────────────────────────────────────────────
function GiftCardsScreen() {
  const sid = useStoreId();
  type GC = { _id:string; code:string; balance:number; originalBalance:number; isActive:boolean; expiresAt?:string; notes?:string; createdBy?:string; createdAt:string };
  const { data: rawCards, refresh: refreshCards } = useApi<GC[]>("/gift-cards", []);
  const cards = normList<GC>(rawCards);
  const [showCreate, setShowCreate] = useState(false);
  const [balance, setBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all"|"active"|"used">("all");

  const filtered = cards.filter(c =>
    (filterStatus === "all" || (filterStatus === "active" ? c.isActive : !c.isActive)) &&
    (!search || c.code.includes(search.toUpperCase()) || (c.notes||"").includes(search))
  );

  const totalActive = cards.filter(c => c.isActive).length;
  const totalBalance = cards.filter(c => c.isActive).reduce((a, c) => a + c.balance, 0);
  const totalUsed = cards.filter(c => !c.isActive).length;

  const createCard = async () => {
    if (!balance || parseFloat(balance) <= 0) { showToast("أدخل رصيد صحيح", "error"); return; }
    setSaving(true);
    try {
      await storeApi.post("/gift-cards", { balance: parseFloat(balance), notes, expiresAt: expiresAt || undefined, storeId: sid });
      showToast("تم إنشاء بطاقة الهدية", "success");
      setShowCreate(false); setBalance(""); setNotes(""); setExpiresAt("");
      refreshCards();
    } catch (e) { showToast((e as {error?:string}).error || "فشل إنشاء البطاقة", "error"); }
    finally { setSaving(false); }
  };

  const deactivate = async (id: string) => {
    try {
      await storeApi.patch(`/gift-cards/${id}/deactivate`, {});
      showToast("تم تعطيل البطاقة", "success");
      refreshCards();
    } catch { showToast("فشل التعطيل", "error"); }
  };

  const deleteCard = async (id: string) => {
    if (!confirm("حذف البطاقة نهائياً؟")) return;
    try {
      await storeApi.delete(`/gift-cards/${id}`);
      showToast("تم الحذف", "success");
      refreshCards();
    } catch { showToast("فشل الحذف", "error"); }
  };

  return (
    <div className="p-3 sm:p-6 space-y-5">
      <Hdr title="بطاقات الهدايا" sub={`${totalActive} بطاقة نشطة`}
        action={<Btn icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>بطاقة جديدة</Btn>} />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <KPI icon={<Star size={16} />} label="نشطة" value={String(totalActive)} color="#10B981" />
        <KPI icon={<DollarSign size={16} />} label="رصيد نشط" value={`${totalBalance.toFixed(3)} JOD`} color="#6366F1" />
        <KPI icon={<Check size={16} />} label="مستخدمة" value={String(totalUsed)} color="#F59E0B" />
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالكود أو الملاحظة..."
            className="w-full h-10 rounded-xl border border-border bg-background text-sm pr-9 pl-3 focus:outline-none focus:ring-2 focus:ring-ring/25" />
        </div>
        {(["all","active","used"] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-4 h-10 rounded-xl text-xs font-bold border transition-all ${filterStatus === s ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}>
            {s === "all" ? "الكل" : s === "active" ? "نشطة" : "مستخدمة"}
          </button>
        ))}
      </div>

      {/* Cards list */}
      <div className="space-y-2">
        {filtered.map(c => (
          <div key={c._id} className={`bg-card rounded-2xl border p-4 flex items-center gap-4 ${c.isActive ? "border-emerald-200" : "border-border opacity-70"}`}>
            <div className="text-2xl shrink-0">🎁</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-black text-sm font-mono tracking-widest">{c.code}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.isActive ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-muted text-muted-foreground border-border"}`}>
                  {c.isActive ? "نشطة" : "مستخدمة"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                رصيد: <span className="font-bold text-foreground">{c.balance.toFixed(3)} JOD</span>
                {" / "} أصلي: {c.originalBalance.toFixed(3)} JOD
                {c.notes && <> · {c.notes}</>}
                {c.expiresAt && <> · ينتهي: {new Date(c.expiresAt).toLocaleDateString("ar-JO")}</>}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {c.isActive && (
                <button onClick={() => deactivate(c._id)} title="تعطيل"
                  className="w-8 h-8 flex items-center justify-center rounded-xl border border-amber-200 text-amber-600 hover:bg-amber-50">
                  <Lock size={14} />
                </button>
              )}
              <button onClick={() => deleteCard(c._id)} title="حذف"
                className="w-8 h-8 flex items-center justify-center rounded-xl border border-red-200 text-red-400 hover:bg-red-50">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <Empty icon={<Star size={24} />} title="لا توجد بطاقات هدايا" desc="أنشئ أول بطاقة هدية باستخدام زر «بطاقة جديدة»" />}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Modal title="بطاقة هدية جديدة" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <F label="الرصيد (JOD) *">
              <TInput value={balance} onChange={setBalance} type="number" placeholder="0.000" icon={<DollarSign size={13} />} />
            </F>
            <div className="grid grid-cols-4 gap-1.5">
              {[5, 10, 20, 50].map(v => (
                <button key={v} onClick={() => setBalance(String(v))}
                  className="h-9 rounded-xl text-xs font-bold border border-border bg-muted hover:bg-primary hover:text-white">{v} JOD</button>
              ))}
            </div>
            <F label="تاريخ الانتهاء (اختياري)">
              <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/25" />
            </F>
            <F label="ملاحظات (اختياري)">
              <TInput value={notes} onChange={setNotes} placeholder="مثال: هدية عيد ميلاد" />
            </F>
            <div className="flex gap-3">
              <Btn v="secondary" onClick={() => setShowCreate(false)} cls="flex-1">إلغاء</Btn>
              <Btn onClick={createCard} disabled={saving || !balance} cls="flex-1" icon={<Plus size={14} />}>إنشاء البطاقة</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export { StoreReports, EmpScreen, BranchScreen, LoyaltyScreen, DebtScreen, GiftCardsScreen, PrintJobsScreen, PrintMatsScreen, PrintPricesScreen, StoreSetts };
