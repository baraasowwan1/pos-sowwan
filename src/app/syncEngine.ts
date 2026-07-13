/**
 * Sowwanjo POS — Sync Engine
 * محرك المزامنة — يرفع العمليات المحفوظة محلياً إلى السحابة عند عودة الاتصال
 */
import {
  db, SyncQueueItem, OfflineSale,
  confirmInventorySync, cacheProducts, cacheCustomers,
  getDeviceId, getPendingCount, OfflineProduct, OfflineCustomer,
} from "./offlineDb";

const BASE_URL = "https://sowwanjo-pos-api.onrender.com/api";

// ── Sync event bus (lightweight pub/sub for React components) ─────────────────
type SyncListener = (state: SyncState) => void;
const _listeners: SyncListener[] = [];

export interface SyncState {
  status: "idle" | "syncing" | "synced" | "error" | "offline";
  pending: number;
  failed: number;
  lastSyncAt: string | null;
  lastError: string | null;
  isSyncing: boolean;
}

let _state: SyncState = {
  status: "idle",
  pending: 0,
  failed: 0,
  lastSyncAt: null,
  lastError: null,
  isSyncing: false,
};

export function subscribeSyncState(fn: SyncListener): () => void {
  _listeners.push(fn);
  fn(_state); // immediate delivery
  return () => {
    const i = _listeners.indexOf(fn);
    if (i > -1) _listeners.splice(i, 1);
  };
}

function emit(patch: Partial<SyncState>) {
  _state = { ..._state, ...patch };
  _listeners.forEach(fn => fn(_state));
}

// ── Mutex (prevent parallel sync runs) ───────────────────────────────────────
let _running = false;

// ── Auth token accessor ───────────────────────────────────────────────────────
function getToken(): string {
  try { return localStorage.getItem("sowwanjo_jwt") || ""; } catch { return ""; }
}

// ── Backend reachability check ────────────────────────────────────────────────
async function isBackendReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL.replace("/api", "")}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Fetch wrapper (with JWT) ──────────────────────────────────────────────────
async function syncFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

// ── Process a single sync queue item ─────────────────────────────────────────
async function processItem(item: SyncQueueItem): Promise<void> {
  if (!item.id) return;

  await db.syncQueue.update(item.id, {
    syncStatus: "syncing",
    lastAttemptAt: new Date().toISOString(),
  });

  try {
    let endpoint = "";
    let serverRecordId: string | undefined;

    switch (item.operationType) {
      case "create_sale": {
        endpoint = "/sync/sales";
        const sale = item.payload as OfflineSale;
        const res = await syncFetch(endpoint, {
          method: "POST",
          body: JSON.stringify({
            operationId: item.operationId,
            sale: {
              invoiceNo:    sale.invoiceNo,
              items:        sale.items,
              subtotal:     sale.subtotal,
              discountAmt:  sale.discountAmt,
              taxAmt:       sale.taxAmt,
              total:        sale.total,
              payMethod:    sale.payMethod,
              cashIn:       sale.cashIn,
              change:       sale.change,
              cliqRef:      sale.cliqRef,
              cliqSender:   sale.cliqSender,
              cardRef:      sale.cardRef,
              customerId:   sale.customerId,
              customerName: sale.customerName || "عميل نقدي",
              customerPhone:sale.customerPhone,
              status:       "completed",
              branchId:     sale.branchId,
              terminalId:   sale.terminalId,
              isOffline:    true,
              offlineCreatedAt: sale.createdAt,
            },
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
          // 409 = duplicate operationId → already synced, treat as success
          if (res.status === 409) {
            const body = await res.json().catch(() => ({}));
            serverRecordId = body.sale?._id || body.sale?.id || body._id;
            await db.syncQueue.update(item.id, {
              syncStatus: "synced",
              serverRecordId,
              lastAttemptAt: new Date().toISOString(),
            });
            await db.sales.update(sale.localId, {
              syncStatus: "synced",
              serverId: serverRecordId,
              syncedAt: new Date().toISOString(),
            }).catch(() => {});
            return;
          }
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        serverRecordId = data.sale?._id || data.sale?.id || data._id;

        // Confirm local inventory deduction
        await confirmInventorySync(sale.storeId, sale.items);

        // Update local sale record
        await db.sales.update(sale.localId, {
          syncStatus: "synced",
          serverId: serverRecordId,
          syncedAt: new Date().toISOString(),
        });
        break;
      }

      case "create_customer": {
        const cust = item.payload as { name: string; phone?: string; email?: string };
        const res = await syncFetch("/customers", {
          method: "POST",
          body: JSON.stringify(cust),
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        serverRecordId = data._id || data.id;
        if (item.payload && typeof item.payload === "object" && "id" in item.payload) {
          await db.customers.update((item.payload as { id: string }).id, {
            syncStatus: "synced",
            serverId: serverRecordId,
            syncedAt: new Date().toISOString(),
          });
        }
        break;
      }

      default:
        // Unknown operation type — mark as failed
        throw new Error(`Unknown operation type: ${item.operationType}`);
    }

    await db.syncQueue.update(item.id, {
      syncStatus: "synced",
      serverRecordId,
      lastAttemptAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const nextRetry = (item.retryCount || 0) + 1;
    await db.syncQueue.update(item.id!, {
      syncStatus: nextRetry >= 5 ? "failed" : "pending",
      retryCount: nextRetry,
      lastError: msg,
      lastAttemptAt: new Date().toISOString(),
    });
    throw err; // propagate so caller knows
  }
}

// ── Pull fresh data from backend ──────────────────────────────────────────────
async function pullData(storeId: string): Promise<void> {
  try {
    const res = await syncFetch(`/products?storeId=${storeId}&limit=2000`, {
      signal: AbortSignal.timeout(20000),
    });
    if (res.ok) {
      const data = await res.json() as unknown[];
      const prods = (data as Array<{_id?:string;id?:string;[k:string]:unknown}>).map(p => ({
        id: (p._id || p.id || "") as string,
        storeId,
        nameAr:    (p.nameAr || "") as string,
        nameEn:    (p.nameEn || "") as string,
        barcode:   (p.barcode || "") as string,
        sku:       (p.sku || "") as string,
        sellPrice: (p.sellPrice || 0) as number,
        costPrice: (p.costPrice || 0) as number,
        stock:     (p.quantity ?? p.stock ?? 0) as number,
        minStock:  (p.minStock || 0) as number,
        category:  (p.category || "") as string,
        unit:      (p.unit || "") as string,
        isActive:  p.isActive !== false,
        updatedAt: (p.updatedAt || new Date().toISOString()) as string,
        syncedAt:  new Date().toISOString(),
      } as OfflineProduct));
      await cacheProducts(storeId, prods);
    }
  } catch {}

  try {
    const res = await syncFetch(`/customers?limit=500`, {
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const data = await res.json() as unknown[];
      const custs = (data as Array<{_id?:string;id?:string;[k:string]:unknown}>).map(c => ({
        id: (c._id || c.id || "") as string,
        storeId,
        name:      (c.name || "") as string,
        phone:     (c.phone || "") as string,
        email:     (c.email || "") as string,
        points:    (c.points || 0) as number,
        address:   (c.address || "") as string,
        syncStatus: "synced" as const,
        createdAt: (c.createdAt || new Date().toISOString()) as string,
        syncedAt:  new Date().toISOString(),
      } as OfflineCustomer));
      await cacheCustomers(storeId, custs);
    }
  } catch {}
}

// ── Main sync function ────────────────────────────────────────────────────────
export async function runSync(storeId: string, opts: { silent?: boolean } = {}): Promise<boolean | null> {
  if (_running) return null; // null = busy, not a failure
  _running = true;

  emit({ status: "syncing", isSyncing: true, lastError: null });

  try {
    // 1. Confirm backend is actually reachable
    const reachable = await isBackendReachable();
    if (!reachable) {
      emit({ status: "offline", isSyncing: false });
      _running = false;
      return false;
    }

    // 2. Pull fresh data first (so conflict detection has latest server state)
    await pullData(storeId);

    // 3. Get all pending operations for this store
    const pending = await db.syncQueue
      .where("storeId").equals(storeId)
      .filter(q => q.syncStatus === "pending" || q.syncStatus === "syncing")
      .sortBy("localCreatedAt");

    let failed = 0;
    for (const item of pending) {
      try {
        await processItem(item);
      } catch {
        failed++;
      }
    }

    // 4. Count remaining failures
    const failedCount = await db.syncQueue
      .where("storeId").equals(storeId)
      .filter(q => q.syncStatus === "failed")
      .count();
    const pendingCount = await getPendingCount(storeId);

    const now = new Date().toISOString();
    // Persist last sync time
    try { localStorage.setItem(`sowwanjo_last_sync_${storeId}`, now); } catch {}

    emit({
      status: failed > 0 ? "error" : "synced",
      isSyncing: false,
      pending: pendingCount,
      failed: failedCount,
      lastSyncAt: now,
      lastError: failed > 0 ? `${failed} عملية لم تُزامن` : null,
    });

    return failed === 0;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطأ غير متوقع";
    emit({ status: "error", isSyncing: false, lastError: msg });
    return false;
  } finally {
    _running = false;
  }
}

// ── Bootstrap (initial data download) ────────────────────────────────────────
export async function bootstrapDevice(storeId: string): Promise<boolean> {
  try {
    emit({ status: "syncing", isSyncing: true });
    await pullData(storeId);

    const devId = getDeviceId();
    const ua = navigator.userAgent;
    await db.devices.put({
      id: devId,
      storeId,
      deviceName: ua.includes("Mobile") ? "جهاز جوال" : "حاسوب مكتبي",
      platform: ua.slice(0, 120),
      offlineEnabled: true,
      initialized: true,
      bootstrappedAt: new Date().toISOString(),
      lastSyncAt: new Date().toISOString(),
    });

    // Register device with backend (fire-and-forget)
    syncFetch("/sync/device", {
      method: "POST",
      body: JSON.stringify({ deviceId: devId, storeId, platform: ua.slice(0, 120) }),
    }).catch(() => {});

    emit({ status: "synced", isSyncing: false, lastSyncAt: new Date().toISOString() });
    return true;
  } catch {
    emit({ status: "error", isSyncing: false });
    return false;
  }
}

// ── Auto-sync when online event fires ────────────────────────────────────────
let _storeId = "";
let _autoSyncSetup = false;

export function initAutoSync(storeId: string) {
  _storeId = storeId;
  if (_autoSyncSetup) return;
  _autoSyncSetup = true;

  const handleOnline = async () => {
    if (!_storeId) return;
    const pending = await getPendingCount(_storeId);
    if (pending > 0) {
      setTimeout(() => runSync(_storeId, { silent: true }), 1500);
    }
  };

  window.addEventListener("online", handleOnline);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      getPendingCount(_storeId).then(n => {
        if (n > 0) runSync(_storeId, { silent: true });
      });
    }
  });

  // Restore last sync time
  try {
    const last = localStorage.getItem(`sowwanjo_last_sync_${storeId}`);
    if (last) emit({ lastSyncAt: last });
  } catch {}

  // Count pending on startup
  getPendingCount(storeId).then(n => emit({ pending: n }));
}

// Update storeId reference (called when store changes)
export function updateSyncStoreId(storeId: string) {
  _storeId = storeId;
}
