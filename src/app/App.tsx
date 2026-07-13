import { useState, useCallback, useEffect } from "react";
import { Store } from "lucide-react";
import {
  clearToken,
  LoginScreen,
  StoreCtx, ToastHost,
  View,
  applyBranding,
  getCachedBranding,
} from "./lib";
import { initAutoSync } from "./syncEngine";
import { SuperAdminLayout } from "./SAPanel";
import { StoreLayout } from "./StorePanel";

// ── White-label branding helpers ──────────────────────────────────────────────
interface StoreBranding {
  app_name?: string;
  primary_color?: string;
  logo_url?: string;
  icon_url?: string;
  splash_logo_url?: string;
}

function applyStoreBranding(branding: StoreBranding) {
  if (branding.app_name) document.title = branding.app_name;
  const color = branding.primary_color || "#0F172A";
  const tc = document.querySelector("meta[name=theme-color]") as HTMLMetaElement | null;
  if (tc) tc.content = color;
  document.documentElement.style.setProperty("--brand-color", color);
  if (branding.app_name || branding.icon_url || branding.primary_color) {
    const manifest = {
      name: branding.app_name || "Sowwanjo POS",
      short_name: branding.app_name?.split(" ")[0] || "متجري",
      start_url: "/",
      display: "standalone",
      background_color: color,
      theme_color: color,
      lang: "ar",
      dir: "rtl",
      icons: branding.icon_url
        ? [{ src: branding.icon_url, sizes: "any", type: "image/png", purpose: "any maskable" }]
        : [
            { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
            { src: "/icons/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
          ],
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
    const url = URL.createObjectURL(blob);
    let ml = document.querySelector("link[rel=manifest]") as HTMLLinkElement | null;
    if (!ml) { ml = document.createElement("link") as HTMLLinkElement; ml.rel = "manifest"; document.head.appendChild(ml); }
    if (ml.href.startsWith("blob:")) URL.revokeObjectURL(ml.href);
    ml.href = url;
  }
}

function resetSABranding() {
  document.title = "Sowwanjo POS — لوحة الإدارة";
  const tc = document.querySelector("meta[name=theme-color]") as HTMLMetaElement | null;
  if (tc) tc.content = "#0F172A";
  document.documentElement.style.removeProperty("--brand-color");
  let ml = document.querySelector("link[rel=manifest]") as HTMLLinkElement | null;
  if (!ml) { ml = document.createElement("link") as HTMLLinkElement; ml.rel = "manifest"; document.head.appendChild(ml); }
  if (ml.href.startsWith("blob:")) URL.revokeObjectURL(ml.href);
  ml.href = "/manifest.json";
}

// ── Splash screen ─────────────────────────────────────────────────────────────
function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fade, setFade] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 1400);
    const t2 = setTimeout(() => onDone(), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-400"
      style={{
        background: "linear-gradient(160deg,#0A0F1E 0%,#0F172A 50%,#162040 100%)",
        opacity: fade ? 0 : 1,
        pointerEvents: fade ? "none" : "auto",
      }}
    >
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full opacity-15" style={{ background: "radial-gradient(circle,#3B82F6 0%,transparent 70%)" }} />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="w-24 h-24 rounded-[28px] bg-blue-500/20 border border-blue-400/30 flex items-center justify-center" style={{ boxShadow: "0 0 40px rgba(59,130,246,0.3)" }}>
          <Store size={44} className="text-blue-400" />
        </div>
        <div className="text-center">
          <p className="text-white font-black text-3xl tracking-tight mb-1">Sowwanjo POS</p>
          <p className="text-blue-300/60 text-sm font-medium">نظام نقاط البيع السحابي</p>
        </div>
        <div className="flex gap-2 mt-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-blue-400/60" style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes bounce {
          0%,80%,100%{transform:translateY(0);opacity:.4}
          40%{transform:translateY(-8px);opacity:1}
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [splash, setSplash] = useState(() => {
    try { return sessionStorage.getItem("sowwanjo_splashed") !== "1"; } catch { return true; }
  });
  const hideSplash = useCallback(() => {
    try { sessionStorage.setItem("sowwanjo_splashed", "1"); } catch {}
    setSplash(false);
  }, []);

  // ── Platform branding (public endpoint, no auth) ──────────────
  useEffect(() => {
    // Apply cached branding immediately for first paint
    const cached = getCachedBranding();
    if (cached) applyBranding(cached);
    // Then fetch fresh branding from backend
    fetch("/api/branding")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) applyBranding(data); })
      .catch(() => {});
  }, []);

  // Service worker intentionally disabled — sw.ts cannot be served as JS from /public
  // Offline support is handled entirely via IndexedDB (syncEngine + offlineDb)

  // ── PWA meta tags injection ──────────────────────────────────
  useEffect(() => {
    let vp = document.querySelector("meta[name=viewport]");
    if (!vp) { vp = document.createElement("meta"); vp.setAttribute("name","viewport"); document.head.appendChild(vp); }
    vp.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1");
    let tc = document.querySelector("meta[name=theme-color]");
    if (!tc) { tc = document.createElement("meta"); tc.setAttribute("name","theme-color"); document.head.appendChild(tc); }
    tc.setAttribute("content", "#0F172A");
    let am = document.querySelector("meta[name=mobile-web-app-capable]");
    if (!am) { am = document.createElement("meta"); am.setAttribute("name","mobile-web-app-capable"); document.head.appendChild(am); }
    am.setAttribute("content", "yes");
    let ams = document.querySelector("meta[name=apple-mobile-web-app-status-bar-style]");
    if (!ams) { ams = document.createElement("meta"); ams.setAttribute("name","apple-mobile-web-app-status-bar-style"); document.head.appendChild(ams); }
    ams.setAttribute("content", "black-translucent");
    let ml = document.querySelector("link[rel=manifest]");
    if (!ml) { ml = document.createElement("link"); ml.setAttribute("rel","manifest"); document.head.appendChild(ml); }
    ml.setAttribute("href", "/manifest.json");
    document.title = "Sowwanjo POS";
  }, []);

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
      if (type === "store" && id) {
        // Re-initialize auto-sync for restored session
        setTimeout(() => { initAutoSync(id); }, 500);
      }
      return type === "store" ? id : "";
    } catch { return ""; }
  });

  const login = useCallback((type: "superadmin" | "store", id?: string) => {
    if (type === "superadmin") {
      localStorage.setItem("sowwanjo_session", JSON.stringify({ type: "superadmin" }));
      resetSABranding();
      setView("superadmin");
    } else {
      const sid = id || "";
      localStorage.setItem("sowwanjo_session", JSON.stringify({ type: "store", id: sid }));
      // Initialize auto-sync for this store
      initAutoSync(sid);
      try {
        const raw = localStorage.getItem(`sowwanjo_storeinfo_${sid}`);
        if (raw) {
          const info = JSON.parse(raw);
          applyStoreBranding({
            app_name: info.appName || info.nameAr || undefined,
            primary_color: info.primaryColor || undefined,
            logo_url: info.logoUrl || undefined,
            icon_url: info.iconUrl || undefined,
          });
        }
      } catch {}
      setStoreId(sid);
      setView("store");
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("sowwanjo_session");
    clearToken();
    resetSABranding();
    setView("login");
    setStoreId("");
  }, []);

  return (
    <div className="size-full" style={{ fontFamily: "'Cairo','Inter',sans-serif" }}>
      {splash && <SplashScreen onDone={hideSplash} />}
      {!splash && view === "login"      && <LoginScreen onLogin={login} />}
      {!splash && view === "superadmin" && <SuperAdminLayout onLogout={logout} />}
      {!splash && view === "store"      && (
        <StoreCtx.Provider value={storeId}>
          <StoreLayout storeId={storeId} onLogout={logout} />
        </StoreCtx.Provider>
      )}
      <ToastHost />
    </div>
  );
}
