/**
 * Sowwanjo POS — Offline Database (Dexie/IndexedDB)
 * قاعدة بيانات محلية للعمل بدون إنترنت
 *
 * This is the local source of truth during offline periods.
 * The cloud MongoDB remains the primary source when online.
 */
import Dexie, { Table } from "dexie";

// ── Core types ────────────────────────────────────────────────────────────────

export type SyncStatus = "pending" | "syncing" | "synced" | "failed" | "conflict";
export type OperationType =
  | "create_sale"
  | "create_customer"
  | "update_customer"
  | "open_cash_session"
  | "close_cash_session"
  | "inventory_movement"
  | "create_return";

export interface OfflineSaleItem {
  productId: string;
  nameAr: string;
  qty: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface OfflineSale {
  localId: string;           // UUID — idempotency key
  invoiceNo: string;         // e.g. ST01-BR01-POS01-20260711-000001
  storeId: string;
  branchId?: string;
  terminalId?: string;
  userId?: string;
  items: OfflineSaleItem[];
  subtotal: number;
  discountAmt: number;
  taxAmt: number;
  total: number;
  payMethod: "cash" | "cliq" | "card";
  cashIn?: number;
  change?: number;
  cliqRef?: string;
  cliqSender?: string;
  cardRef?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  status: "completed" | "held";
  syncStatus: SyncStatus;
  serverId?: string;         // _id returned from backend after sync
  createdAt: string;         // ISO string
  syncedAt?: string;
  lastError?: string;
  isOffline?: boolean;       // true = was created while offline
}

export interface OfflineProduct {
  id: string;
  storeId: string;
  nameAr: string;
  nameEn?: string;
  barcode?: string;
  sku?: string;
  sellPrice: number;
  costPrice?: number;
  stock: number;
  minStock?: number;
  category?: string;
  unit?: string;
  imageUrl?: string;
  isActive: boolean;
  updatedAt: string;
  syncedAt: string;
}

export interface OfflineCustomer {
  id: string;
  storeId: string;
  name: string;
  phone?: string;
  email?: string;
  points?: number;
  address?: string;
  syncStatus: SyncStatus;
  serverId?: string;
  createdAt: string;
  syncedAt: string;
}

export interface OfflineInventory {
  id: string;              // `${productId}-${storeId}`
  productId: string;
  storeId: string;
  branchId?: string;
  qty: number;
  pendingDeduction: number; // deducted offline, not yet confirmed by server
  lastSyncAt: string;
}

export interface OfflineCashSession {
  localId: string;
  storeId: string;
  branchId?: string;
  terminalId?: string;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  closingCash?: number;
  totalSales: number;
  status: "open" | "closed";
  syncStatus: SyncStatus;
  serverId?: string;
}

export interface OfflineSettings {
  key: string;
  storeId: string;
  value: unknown;
  updatedAt: string;
}

export interface SyncQueueItem {
  id?: number;               // auto-increment primary key
  operationId: string;       // UUID — idempotency key sent to server
  operationType: OperationType;
  storeId: string;
  branchId?: string;
  terminalId?: string;
  userId?: string;
  payload: unknown;
  localCreatedAt: string;
  syncStatus: SyncStatus;
  retryCount: number;
  lastError?: string;
  lastAttemptAt?: string;
  serverRecordId?: string;   // returned by backend on success
}

export interface OfflineDevice {
  id: string;                // unique device identifier
  storeId: string;
  branchId?: string;
  terminalId?: string;
  deviceName: string;
  platform: string;
  offlineEnabled: boolean;
  initialized: boolean;
  bootstrappedAt?: string;
  lastSyncAt?: string;
}

// ── Database class ─────────────────────────────────────────────────────────────

class SowwanjoOfflineDB extends Dexie {
  syncQueue!: Table<SyncQueueItem, number>;
  sales!: Table<OfflineSale, string>;
  products!: Table<OfflineProduct, string>;
  customers!: Table<OfflineCustomer, string>;
  inventory!: Table<OfflineInventory, string>;
  cashSessions!: Table<OfflineCashSession, string>;
  settings!: Table<OfflineSettings, [string, string]>;
  devices!: Table<OfflineDevice, string>;

  constructor() {
    super("SowwanjoPOS");
    this.version(1).stores({
      syncQueue:    "++id, operationId, storeId, syncStatus, operationType, localCreatedAt",
      sales:        "localId, storeId, syncStatus, createdAt, invoiceNo",
      products:     "id, storeId, barcode, category, isActive",
      customers:    "id, storeId, phone, syncStatus",
      inventory:    "id, productId, storeId, branchId",
      cashSessions: "localId, storeId, syncStatus, status",
      settings:     "[key+storeId], storeId",
      devices:      "id, storeId",
    });
  }
}

export const db = new SowwanjoOfflineDB();

// ── Utility helpers ────────────────────────────────────────────────────────────

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

/** Generates an offline invoice number unique per store/branch/terminal/time.
 *  Format: ST<store>-BR<branch>-POS<terminal>-<YYYYMMDD>-<microseconds>
 */
export function generateOfflineInvoiceNo(
  storeId: string,
  branchId = "01",
  terminalId = "01"
): string {
  const st = storeId.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase() || "XXXX";
  const br = branchId.replace(/[^a-zA-Z0-9]/g, "").slice(-2).toUpperCase() || "01";
  const tm = terminalId.replace(/[^a-zA-Z0-9]/g, "").slice(-2).toUpperCase() || "01";
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const seq = String(d.getTime()).slice(-7);
  return `ST${st}-BR${br}-POS${tm}-${date}-${seq}`;
}

/** Returns device ID stored in localStorage (persistent across sessions) */
export function getDeviceId(): string {
  const key = "sowwanjo_device_id";
  try {
    let id = localStorage.getItem(key);
    if (!id) { id = generateUUID(); localStorage.setItem(key, id); }
    return id;
  } catch {
    return generateUUID();
  }
}

/** Check if device has been initialized for offline use */
export async function isOfflineReady(storeId: string): Promise<boolean> {
  try {
    const devId = getDeviceId();
    const device = await db.devices.get(devId);
    return !!(device?.initialized && device.storeId === storeId);
  } catch {
    return false;
  }
}

/** Save products to IndexedDB (called after online load) */
export async function cacheProducts(storeId: string, products: OfflineProduct[]): Promise<void> {
  try {
    const now = new Date().toISOString();
    const records = products.map(p => ({ ...p, storeId, syncedAt: now }));
    await db.products.bulkPut(records);
    // Initialize inventory snapshot
    const invRecords = products.map(p => ({
      id: `${p.id}-${storeId}`,
      productId: p.id,
      storeId,
      qty: p.stock,
      pendingDeduction: 0,
      lastSyncAt: now,
    }));
    await db.inventory.bulkPut(invRecords);
  } catch (e) {
    console.warn("[offlineDb] cacheProducts failed:", e);
  }
}

/** Save customers to IndexedDB (called after online load) */
export async function cacheCustomers(storeId: string, customers: OfflineCustomer[]): Promise<void> {
  try {
    const now = new Date().toISOString();
    const records = customers.map(c => ({ ...c, storeId, syncedAt: now, syncStatus: "synced" as SyncStatus }));
    await db.customers.bulkPut(records);
  } catch (e) {
    console.warn("[offlineDb] cacheCustomers failed:", e);
  }
}

/** Deduct stock locally from an offline sale */
export async function deductLocalInventory(storeId: string, items: OfflineSaleItem[]): Promise<void> {
  for (const item of items) {
    const key = `${item.productId}-${storeId}`;
    try {
      const inv = await db.inventory.get(key);
      if (inv) {
        const newQty = Math.max(0, inv.qty - item.qty);
        await db.inventory.update(key, {
          qty: newQty,
          pendingDeduction: inv.pendingDeduction + item.qty,
        });
        // Also update the product record
        const prod = await db.products.get(item.productId);
        if (prod) await db.products.update(item.productId, { stock: newQty });
      }
    } catch (e) {
      console.warn(`[offlineDb] deductLocalInventory failed for ${item.productId}:`, e);
    }
  }
}

/** Mark inventory as synced (clear pending deductions) */
export async function confirmInventorySync(storeId: string, items: OfflineSaleItem[]): Promise<void> {
  for (const item of items) {
    const key = `${item.productId}-${storeId}`;
    try {
      const inv = await db.inventory.get(key);
      if (inv) {
        await db.inventory.update(key, {
          pendingDeduction: Math.max(0, inv.pendingDeduction - item.qty),
          lastSyncAt: new Date().toISOString(),
        });
      }
    } catch {}
  }
}

/** Get pending sync queue count by store */
export async function getPendingCount(storeId: string): Promise<number> {
  try {
    return await db.syncQueue
      .where("storeId").equals(storeId)
      .filter(q => q.syncStatus === "pending" || q.syncStatus === "failed")
      .count();
  } catch {
    return 0;
  }
}

/** Get sync status summary */
export async function getSyncSummary(storeId: string) {
  try {
    const all = await db.syncQueue.where("storeId").equals(storeId).toArray();
    return {
      pending:  all.filter(q => q.syncStatus === "pending").length,
      syncing:  all.filter(q => q.syncStatus === "syncing").length,
      synced:   all.filter(q => q.syncStatus === "synced").length,
      failed:   all.filter(q => q.syncStatus === "failed").length,
      conflict: all.filter(q => q.syncStatus === "conflict").length,
    };
  } catch {
    return { pending: 0, syncing: 0, synced: 0, failed: 0, conflict: 0 };
  }
}
