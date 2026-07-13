/**
 * Sowwanjo POS — Offline Database (Native IndexedDB, zero dependencies)
 * قاعدة بيانات محلية للعمل بدون إنترنت — بدون مكتبات خارجية
 *
 * Provides a Dexie-compatible API surface using only browser-native IndexedDB.
 * Avoids any npm dependency to prevent Rollup/Vercel build failures.
 */

// ── Types ────────────────────────────────────────────────────────────────────

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
  localId: string;
  invoiceNo: string;
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
  serverId?: string;
  createdAt: string;
  syncedAt?: string;
  lastError?: string;
  isOffline?: boolean;
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
  id: string;           // `${productId}-${storeId}`
  productId: string;
  storeId: string;
  branchId?: string;
  qty: number;
  pendingDeduction: number;
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
  id?: number;              // auto-increment primary key
  operationId: string;      // UUID — idempotency key
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
  serverRecordId?: string;
}

export interface OfflineDevice {
  id: string;
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

// ── Native IndexedDB engine ───────────────────────────────────────────────────

const DB_NAME = "SowwanjoPOS";
const DB_VERSION = 1;

function prom<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
}

let _dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      // syncQueue — auto-increment id
      if (!db.objectStoreNames.contains("syncQueue")) {
        const sq = db.createObjectStore("syncQueue", { keyPath: "id", autoIncrement: true });
        sq.createIndex("storeId",       "storeId");
        sq.createIndex("syncStatus",    "syncStatus");
        sq.createIndex("operationType", "operationType");
        sq.createIndex("localCreatedAt","localCreatedAt");
        sq.createIndex("operationId",   "operationId");
      }
      // sales
      if (!db.objectStoreNames.contains("sales")) {
        const sl = db.createObjectStore("sales", { keyPath: "localId" });
        sl.createIndex("storeId",    "storeId");
        sl.createIndex("syncStatus", "syncStatus");
        sl.createIndex("invoiceNo",  "invoiceNo");
      }
      // products
      if (!db.objectStoreNames.contains("products")) {
        const pr = db.createObjectStore("products", { keyPath: "id" });
        pr.createIndex("storeId",  "storeId");
        pr.createIndex("barcode",  "barcode");
        pr.createIndex("category", "category");
      }
      // customers
      if (!db.objectStoreNames.contains("customers")) {
        const cu = db.createObjectStore("customers", { keyPath: "id" });
        cu.createIndex("storeId", "storeId");
        cu.createIndex("phone",   "phone");
      }
      // inventory
      if (!db.objectStoreNames.contains("inventory")) {
        const iv = db.createObjectStore("inventory", { keyPath: "id" });
        iv.createIndex("productId", "productId");
        iv.createIndex("storeId",   "storeId");
      }
      // cashSessions
      if (!db.objectStoreNames.contains("cashSessions")) {
        const cs = db.createObjectStore("cashSessions", { keyPath: "localId" });
        cs.createIndex("storeId",    "storeId");
        cs.createIndex("syncStatus", "syncStatus");
      }
      // settings — compound key [key, storeId]
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: ["key", "storeId"] });
      }
      // devices
      if (!db.objectStoreNames.contains("devices")) {
        const dv = db.createObjectStore("devices", { keyPath: "id" });
        dv.createIndex("storeId", "storeId");
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => { _dbPromise = null; reject(req.error); };
    req.onblocked = () => { _dbPromise = null; reject(new Error("IDB blocked by another tab")); };
  });
  return _dbPromise;
}

// ── Query builder (where().equals().filter().toArray() etc.) ─────────────────

class WhereChain<T extends object> {
  private _filter?: (r: T) => boolean;
  private _reversed = false;

  constructor(
    private storeName: string,
    private indexName: string,
    private indexValue: IDBValidKey,
  ) {}

  filter(fn: (r: T) => boolean): this { this._filter = fn; return this; }
  reverse(): this { this._reversed = true; return this; }

  private async _fetch(): Promise<T[]> {
    const db = await openDB();
    const tx = db.transaction(this.storeName, "readonly");
    const idx = tx.objectStore(this.storeName).index(this.indexName);
    const all = await prom<T[]>(idx.getAll(this.indexValue));
    return this._filter ? all.filter(this._filter) : all;
  }

  toArray(): Promise<T[]> { return this._fetch(); }

  async count(): Promise<number> { return (await this._fetch()).length; }

  async sortBy(field: keyof T & string): Promise<T[]> {
    const all = await this._fetch();
    const sorted = [...all].sort((a, b) =>
      String(a[field] ?? "").localeCompare(String(b[field] ?? ""), undefined, { numeric: true })
    );
    return this._reversed ? sorted.reverse() : sorted;
  }

  async modify(patch: Partial<T>): Promise<void> {
    const all = await this._fetch();
    if (!all.length) return;
    const db = await openDB();
    const tx = db.transaction(this.storeName, "readwrite");
    const store = tx.objectStore(this.storeName);
    await Promise.all(all.map(r => prom(store.put({ ...r, ...patch }))));
  }

  async delete(): Promise<void> {
    const all = await this._fetch();
    if (!all.length) return;
    const db = await openDB();
    const tx = db.transaction(this.storeName, "readwrite");
    const store = tx.objectStore(this.storeName);
    const kp = store.keyPath;
    const getKey = (r: T): IDBValidKey => {
      if (Array.isArray(kp)) return kp.map(k => (r as Record<string, unknown>)[k]) as unknown as IDBValidKey;
      return (r as Record<string, unknown>)[kp as string] as IDBValidKey;
    };
    await Promise.all(all.map(r => prom(store.delete(getKey(r)))));
  }
}

// ── Store wrapper ─────────────────────────────────────────────────────────────

class IDBStore<T extends object> {
  constructor(private storeName: string) {}

  async get(key: IDBValidKey): Promise<T | undefined> {
    const db = await openDB();
    const tx = db.transaction(this.storeName, "readonly");
    return prom<T | undefined>(tx.objectStore(this.storeName).get(key));
  }

  async put(record: T): Promise<IDBValidKey> {
    const db = await openDB();
    const tx = db.transaction(this.storeName, "readwrite");
    return prom<IDBValidKey>(tx.objectStore(this.storeName).put(record));
  }

  async add(record: T): Promise<IDBValidKey> {
    const db = await openDB();
    const tx = db.transaction(this.storeName, "readwrite");
    return prom<IDBValidKey>(tx.objectStore(this.storeName).add(record));
  }

  async update(key: IDBValidKey, changes: Partial<T>): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(this.storeName, "readwrite");
    const store = tx.objectStore(this.storeName);
    const existing = await prom<T | undefined>(store.get(key));
    if (existing != null) await prom(store.put({ ...existing, ...changes }));
  }

  async bulkPut(records: T[]): Promise<void> {
    if (!records.length) return;
    const db = await openDB();
    const tx = db.transaction(this.storeName, "readwrite");
    const store = tx.objectStore(this.storeName);
    // Create all requests before awaiting any — keeps the transaction alive
    await Promise.all(records.map(r => prom(store.put(r))));
  }

  async toArray(): Promise<T[]> {
    const db = await openDB();
    const tx = db.transaction(this.storeName, "readonly");
    return prom<T[]>(tx.objectStore(this.storeName).getAll());
  }

  async count(): Promise<number> {
    const db = await openDB();
    const tx = db.transaction(this.storeName, "readonly");
    return prom<number>(tx.objectStore(this.storeName).count());
  }

  async deleteByKey(key: IDBValidKey): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(this.storeName, "readwrite");
    await prom(tx.objectStore(this.storeName).delete(key));
  }

  where(indexName: string) {
    const storeName = this.storeName;
    return {
      equals: (value: IDBValidKey) => new WhereChain<T>(storeName, indexName, value),
    };
  }
}

// ── The db object — drop-in replacement for Dexie instance ───────────────────

export const db = {
  syncQueue:    new IDBStore<SyncQueueItem>("syncQueue"),
  sales:        new IDBStore<OfflineSale>("sales"),
  products:     new IDBStore<OfflineProduct>("products"),
  customers:    new IDBStore<OfflineCustomer>("customers"),
  inventory:    new IDBStore<OfflineInventory>("inventory"),
  cashSessions: new IDBStore<OfflineCashSession>("cashSessions"),
  settings:     new IDBStore<OfflineSettings>("settings"),
  devices:      new IDBStore<OfflineDevice>("devices"),
};

// ── Utility helpers ───────────────────────────────────────────────────────────

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

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

export async function isOfflineReady(storeId: string): Promise<boolean> {
  try {
    const devId = getDeviceId();
    const device = await db.devices.get(devId);
    return !!(device?.initialized && device.storeId === storeId);
  } catch {
    return false;
  }
}

export async function cacheProducts(storeId: string, products: OfflineProduct[]): Promise<void> {
  try {
    const now = new Date().toISOString();
    const records = products.map(p => ({ ...p, storeId, syncedAt: now }));
    await db.products.bulkPut(records);
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

export async function cacheCustomers(storeId: string, customers: OfflineCustomer[]): Promise<void> {
  try {
    const now = new Date().toISOString();
    const records = customers.map(c => ({ ...c, storeId, syncedAt: now, syncStatus: "synced" as SyncStatus }));
    await db.customers.bulkPut(records);
  } catch (e) {
    console.warn("[offlineDb] cacheCustomers failed:", e);
  }
}

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
        const prod = await db.products.get(item.productId);
        if (prod) await db.products.update(item.productId, { stock: newQty });
      }
    } catch (e) {
      console.warn(`[offlineDb] deductLocalInventory failed for ${item.productId}:`, e);
    }
  }
}

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

export async function getPendingCount(storeId: string): Promise<number> {
  try {
    const pending = await db.syncQueue.where("storeId").equals(storeId)
      .filter(q => q.syncStatus === "pending" || q.syncStatus === "failed")
      .count();
    return pending;
  } catch {
    return 0;
  }
}

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
