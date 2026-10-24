/**
 * Sowwanjo POS — Sync Center UI + Status Badge
 * واجهة مركز المزامنة + شارة الحالة في الهيدر
 */
import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, CheckCircle, AlertCircle, WifiOff, Wifi, Clock,
  Download, Trash2, AlertTriangle, Info, Monitor, RotateCcw, X,
} from "lucide-react";
import { runSync, subscribeSyncState, SyncState, bootstrapDevice } from "./syncEngine";
import { db, SyncQueueItem, getDeviceId, isOfflineReady } from "./offlineDb";
import { Btn, Hdr, showToast, jod } from "./lib";

// ── Sync Status Badge (shown in the store header) ─────────────────────────────

export function SyncStatusBadge({
  storeId,
  onOpenCenter,
}: {
  storeId: string;
  onOpenCenter?: () => void;
}) {
  const [state, setState] = useState<SyncState>({
    status: "idle", pending: 0, failed: 0,
    lastSyncAt: null, lastError: null, isSyncing: false,
  });
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const unsub = subscribeSyncState(setState);
    const up = () => setOnline(true);
    const dn = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", dn);
    return () => { unsub(); window.removeEventListener("online", up); window.removeEventListener("offline", dn); };
  }, []);

  // Compact badge — shown in header
  if (!online) {
    return (
      <button
        onClick={onOpenCenter}
        className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold transition-colors"
        style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
      >
        <WifiOff size={11} />
        <span>غير متصل{state.pending > 0 ? ` · ${state.pending} معلق` : ""}</span>
      </button>
    );
  }

  if (state.isSyncing) {
    return (
      <span className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold"
        style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>
        <RefreshCw size={11} style={{ animation: "spin 0.8s linear infinite" }} />
        <span>مزامنة...</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </span>
    );
  }

  if (state.failed > 0) {
    return (
      <button onClick={onOpenCenter}
        className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold"
        style={{ background: "#fef3c7", color: "#b45309", border: "1px solid #fcd34d" }}>
        <AlertTriangle size={11} />
        <span>{state.failed} خطأ في المزامنة</span>
      </button>
    );
  }

  if (state.pending > 0) {
    return (
      <button onClick={onOpenCenter}
        className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold"
        style={{ background: "#fffbeb", color: "#b45309", border: "1px solid #fcd34d" }}>
        <Clock size={11} />
        <span>{state.pending} في الانتظار</span>
      </button>
    );
  }

  if (state.status === "synced" && state.lastSyncAt) {
    return (
      <span className="hidden sm:flex items-center gap-1 text-xs text-emerald-600 font-medium px-2 py-0.5 rounded-md"
        style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
        <Wifi size={11} />
        <span>متزامن</span>
      </span>
    );
  }

  return null;
}

// ── SyncCenter full page ───────────────────────────────────────────────────────

export function SyncCenter({ storeId }: { storeId: string }) {
  const [state, setState] = useState<SyncState>({
    status: "idle", pending: 0, failed: 0,
    lastSyncAt: null, lastError: null, isSyncing: false,
  });
  const [online, setOnline] = useState(navigator.onLine);
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [offlineReady, setOfflineReady] = useState(false);
  const [tab, setTab] = useState<"overview" | "queue" | "devices">("overview");
  const [bootstrapping, setBootstrapping] = useState(false);
  const [cachedProds, setCachedProds] = useState(0);
  const [cachedCusts, setCachedCusts] = useState(0);

  // Network listeners
  useEffect(() => {
    const unsub = subscribeSyncState(setState);
    const up = () => setOnline(true);
    const dn = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", dn);
    return () => { unsub(); window.removeEventListener("online", up); window.removeEventListener("offline", dn); };
  }, []);

  const loadQueue = useCallback(async () => {
    try {
      const items = await db.syncQueue.where("storeId").equals(storeId).reverse().sortBy("localCreatedAt");
      setQueueItems(items.slice(0, 100));
    } catch {}
  }, [storeId]);

  const loadStats = useCallback(async () => {
    try {
      const [prods, custs, ready] = await Promise.all([
        db.products.where("storeId").equals(storeId).count(),
        db.customers.where("storeId").equals(storeId).count(),
        isOfflineReady(storeId),
      ]);
      setCachedProds(prods);
      setCachedCusts(custs);
      setOfflineReady(ready);
    } catch {}
  }, [storeId]);

  useEffect(() => {
    loadQueue();
    loadStats();
    const interval = setInterval(() => { loadQueue(); loadStats(); }, 5000);
    return () => clearInterval(interval);
  }, [loadQueue, loadStats]);

  const handleSync = async () => {
    if (state.isSyncing || !online) return;
    const ok = await runSync(storeId);
    if (ok === null) return; // already syncing, ignore
    if (ok) showToast("تمت المزامنة بنجاح", "success");
    else showToast("بعض العمليات لم تُزامن — راجع قائمة الأخطاء", "error");
    loadQueue();
    loadStats();
  };

  const handleBootstrap = async () => {
    setBootstrapping(true);
    const ok = await bootstrapDevice(storeId);
    setBootstrapping(false);
    if (ok) { showToast("تم تحميل البيانات محلياً بنجاح", "success"); loadStats(); }
    else showToast("فشل تهيئة الجهاز — تحقق من الاتصال", "error");
  };

  const retryFailed = async () => {
    try {
      // Reset both "failed" and stuck "pending" (retryCount > 0 means they've been attempted)
      await db.syncQueue
        .where("storeId").equals(storeId)
        .filter(q => q.syncStatus === "failed" || (q.syncStatus === "pending" && (q.retryCount || 0) > 0))
        .modify({ syncStatus: "pending", retryCount: 0, lastError: undefined });
      await handleSync();
    } catch {}
  };

  const retryItem = async (item: SyncQueueItem) => {
    if (!item.id) return;
    try {
      await db.syncQueue.update(item.id, { syncStatus: "pending", retryCount: 0, lastError: undefined });
      loadQueue();
      if (online) await handleSync();
      else showToast("سيتم المزامنة عند عودة الاتصال", "info");
    } catch {}
  };

  const discardItem = async (item: SyncQueueItem) => {
    if (!item.id) return;
    try {
      await db.syncQueue.deleteByKey(item.id);
      loadQueue();
      showToast("تم حذف العملية", "info");
    } catch {}
  };

  const clearSynced = async () => {
    try {
      await db.syncQueue
        .where("storeId").equals(storeId)
        .filter(q => q.syncStatus === "synced")
        .delete();
      loadQueue();
      showToast("تم حذف العمليات المزامنة", "info");
    } catch {}
  };

  const statusLabel: Record<string, { label: string; color: string; bg: string }> = {
    pending:  { label: "في الانتظار", color: "#92400e", bg: "#fef3c7" },
    syncing:  { label: "مزامنة...",   color: "#1d4ed8", bg: "#eff6ff" },
    synced:   { label: "تمت",         color: "#065f46", bg: "#f0fdf4" },
    failed:   { label: "فشل",         color: "#991b1b", bg: "#fef2f2" },
    conflict: { label: "تعارض",       color: "#7c3aed", bg: "#f5f3ff" },
  };

  const opLabel: Record<string, string> = {
    create_sale:         "إنشاء فاتورة",
    create_customer:     "إضافة عميل",
    update_customer:     "تعديل عميل",
    open_cash_session:   "فتح جلسة نقدية",
    close_cash_session:  "إغلاق جلسة نقدية",
    inventory_movement:  "حركة مخزون",
    create_return:       "مرتجع",
  };

  const deviceId = getDeviceId();

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto" dir="rtl">
      <Hdr
        title="مركز المزامنة"
        sub="إدارة العمليات المحفوظة محلياً ومزامنتها مع السحابة"
        action={
          <div className="flex gap-2">
            <Btn
              v="secondary" s="sm"
              onClick={handleBootstrap}
              disabled={bootstrapping || !online}
              icon={<Download size={13} />}
            >
              {bootstrapping ? "تحميل..." : "تهيئة الجهاز"}
            </Btn>
            <Btn
              v="primary" s="sm"
              onClick={handleSync}
              disabled={state.isSyncing || !online}
              icon={<RefreshCw size={13} style={state.isSyncing ? { animation: "spin 0.8s linear infinite" } : undefined} />}
            >
              {state.isSyncing ? "مزامنة..." : "مزامنة الآن"}
            </Btn>
          </div>
        }
      />

      {/* Status banner */}
      <div className="mb-4 flex items-center justify-between px-4 py-3 rounded-lg border" style={{
        background: !online ? "#fef2f2" : state.failed > 0 ? "#fffbeb" : state.pending > 0 ? "#eff6ff" : "#f0fdf4",
        borderColor: !online ? "#fecaca" : state.failed > 0 ? "#fcd34d" : state.pending > 0 ? "#bfdbfe" : "#bbf7d0",
      }}>
        <div className="flex items-center gap-2">
          {!online
            ? <WifiOff size={16} style={{ color: "#dc2626" }} />
            : state.failed > 0
              ? <AlertTriangle size={16} style={{ color: "#d97706" }} />
              : state.pending > 0
                ? <Clock size={16} style={{ color: "#2563eb" }} />
                : <CheckCircle size={16} style={{ color: "#059669" }} />
          }
          <div>
            <p className="text-sm font-semibold" style={{ color: !online ? "#991b1b" : state.failed > 0 ? "#92400e" : state.pending > 0 ? "#1d4ed8" : "#065f46" }}>
              {!online ? "غير متصل بالإنترنت" : state.failed > 0 ? `${state.failed} عملية فشلت` : state.pending > 0 ? `${state.pending} عملية في الانتظار` : "جميع العمليات مزامنة"}
            </p>
            {state.lastError && (
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "#991b1b" }}>
                تفاصيل الخطأ: {state.lastError}
              </p>
            )}
            {state.lastSyncAt && (
              <p className="text-xs text-muted-foreground">
                آخر مزامنة: {new Date(state.lastSyncAt).toLocaleString("ar-JO")}
              </p>
            )}
          </div>
        </div>
        {(state.failed > 0 || state.pending > 0) && online && (
          <Btn v="secondary" s="xs" onClick={retryFailed} icon={<RefreshCw size={11} />}>إعادة المحاولة</Btn>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {([["overview","نظرة عامة"], ["queue","قائمة العمليات"], ["devices","الجهاز"]] as const).map(([t, l]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-3 py-2 text-xs font-semibold transition-colors"
            style={{
              color: tab === t ? "#2563eb" : "#64748b",
              borderBottom: tab === t ? "2px solid #2563eb" : "2px solid transparent",
            }}
          >{l}</button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="space-y-3">
          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "معلق", value: state.pending, color: "#b45309", bg: "#fef3c7" },
              { label: "فشل", value: state.failed, color: "#dc2626", bg: "#fef2f2" },
              { label: "منتجات محفوظة", value: cachedProds, color: "#059669", bg: "#f0fdf4" },
              { label: "عملاء محفوظون", value: cachedCusts, color: "#7c3aed", bg: "#f5f3ff" },
            ].map(k => (
              <div key={k.label} className="rounded-lg p-3 border border-border text-center" style={{ background: k.bg }}>
                <p className="text-xl font-black" style={{ color: k.color }}>{k.value}</p>
                <p className="text-xs mt-0.5" style={{ color: k.color, opacity: 0.7 }}>{k.label}</p>
              </div>
            ))}
          </div>

          {/* Offline readiness */}
          <div className="rounded-lg border border-border p-4" style={{ background: offlineReady ? "#f0fdf4" : "#fef3c7" }}>
            <div className="flex items-center gap-2 mb-2">
              {offlineReady
                ? <CheckCircle size={15} style={{ color: "#059669" }} />
                : <AlertCircle size={15} style={{ color: "#d97706" }} />
              }
              <p className="text-sm font-semibold" style={{ color: offlineReady ? "#065f46" : "#92400e" }}>
                {offlineReady ? "الجهاز جاهز للعمل بدون إنترنت" : "الجهاز يحتاج إلى تهيئة"}
              </p>
            </div>
            <p className="text-xs" style={{ color: offlineReady ? "#065f46" : "#92400e", opacity: 0.8 }}>
              {offlineReady
                ? `${cachedProds} منتج و${cachedCusts} عميل محفوظون محلياً. يمكنك إكمال البيع بدون اتصال.`
                : 'اضغط "تهيئة الجهاز" لتحميل البيانات محلياً وتفعيل وضع عدم الاتصال.'
              }
            </p>
          </div>

          {/* Instructions */}
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
              <Info size={12} className="text-muted-foreground" /> كيف يعمل وضع عدم الاتصال
            </p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {[
                "عند انقطاع الإنترنت، يُحفظ كل بيع محلياً في قاعدة بيانات الجهاز (IndexedDB)",
                "المنتجات والعملاء تُحمَّل مسبقاً لتظل متاحة بدون اتصال",
                "رقم الفاتورة يُولَّد تلقائياً بنمط متجر/فرع/طرفية/تاريخ/تسلسل",
                "عند عودة الإنترنت، تبدأ المزامنة تلقائياً لرفع الفواتير للسحابة",
                "الخادم يتحقق من تكرار العمليات ولا يُسجِّل الفاتورة مرتين",
                "المخزون يُخصَم محلياً فور البيع، ويُؤكَّد من الخادم بعد المزامنة",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-0.5 w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Queue tab */}
      {tab === "queue" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{queueItems.length} عملية</p>
            <Btn v="secondary" s="xs" onClick={clearSynced} icon={<Trash2 size={11} />}>حذف المزامنة</Btn>
          </div>
          {queueItems.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <CheckCircle size={28} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">لا توجد عمليات في الانتظار</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              {queueItems.map((item, i) => {
                const st = statusLabel[item.syncStatus] || { label: item.syncStatus, color: "#64748b", bg: "#f8fafc" };
                const sale = item.operationType === "create_sale" ? (item.payload as { invoiceNo?: string; total?: number }) : null;
                return (
                  <div key={item.id ?? i} className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {opLabel[item.operationType] || item.operationType}
                          {sale?.invoiceNo && <span className="text-muted-foreground font-normal"> · {sale.invoiceNo}</span>}
                        </p>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: st.color, background: st.bg }}>
                          {st.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(item.localCreatedAt).toLocaleString("ar-JO")}
                        </span>
                        {sale?.total != null && (
                          <span className="text-[10px] font-bold text-primary">{jod(sale.total)}</span>
                        )}
                        {item.retryCount > 0 && (
                          <span className="text-[10px] text-amber-600">محاولة {item.retryCount}</span>
                        )}
                      </div>
                      {item.lastError && (
                        <p className="text-[10px] text-red-600 mt-0.5 truncate">{item.lastError}</p>
                      )}
                    </div>
                    {item.syncStatus !== "synced" && item.syncStatus !== "syncing" && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => retryItem(item)}
                          title="إعادة المحاولة"
                          className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 transition-colors"
                        >
                          <RotateCcw size={12} />
                        </button>
                        <button
                          onClick={() => discardItem(item)}
                          title="حذف العملية"
                          className="p-1.5 rounded-md hover:bg-red-50 text-red-500 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Devices tab */}
      {tab === "devices" && (
        <div className="space-y-3">
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Monitor size={18} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">هذا الجهاز</p>
                <p className="text-xs text-muted-foreground font-mono">{deviceId.slice(0, 24)}...</p>
              </div>
              <span className="mr-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: offlineReady ? "#f0fdf4" : "#fef3c7", color: offlineReady ? "#059669" : "#b45309" }}>
                {offlineReady ? "جاهز" : "يحتاج تهيئة"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: "الاتصال", value: online ? "متصل" : "غير متصل" },
                { label: "المنتجات المحفوظة", value: `${cachedProds}` },
                { label: "العملاء المحفوظون", value: `${cachedCusts}` },
                { label: "المتجر", value: storeId.slice(-8) },
              ].map(r => (
                <div key={r.label} className="rounded-md p-2 border border-border">
                  <p className="text-muted-foreground mb-0.5">{r.label}</p>
                  <p className="font-semibold text-foreground">{r.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-1">
              <AlertTriangle size={12} /> تحذير — تعدد الأجهزة بدون إنترنت
            </p>
            <p className="text-xs text-amber-700 leading-relaxed">
              إذا فقدت عدة أجهزة الاتصال في نفس الوقت، قد يكون لكل منها لقطة مخزون مختلفة.
              قد يتطلب ذلك مراجعة مدير المتجر بعد المزامنة لمعالجة أي تعارض في المخزون.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
