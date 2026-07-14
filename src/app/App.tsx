import { useState, useCallback, useEffect, useRef } from "react";
import {
  Store, BarChart3, Package, Smartphone, Shield, WifiOff, ScanLine,
  GitBranch, Eye, EyeOff, Mail, Lock, ChevronLeft, ChevronRight,
  Headphones, Cloud, TrendingUp, AlertCircle, Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  clearToken, StoreCtx, ToastHost, View,
  applyBranding, getCachedBranding,
  apiLoginStore, apiLoginAdmin, setToken,
} from "./lib";
import { initAutoSync } from "./syncEngine";
import { SuperAdminLayout } from "./SAPanel";
import { StoreLayout } from "./StorePanel";
import { POSDemo } from "./POSDemo"; // استيراد صفحة POS التجريبية

// ─────────────────────────────────────────────────────────────────────────────
// WHITE-LABEL BRANDING
// ─────────────────────────────────────────────────────────────────────────────
interface StoreBranding {
  app_name?: string; primary_color?: string;
  logo_url?: string; icon_url?: string; splash_logo_url?: string;
}
function applyStoreBranding(b: StoreBranding) {
  if (b.app_name) document.title = b.app_name;
  const color = b.primary_color || "#173A34";
  const tc = document.querySelector("meta[name=theme-color]") as HTMLMetaElement | null;
  if (tc) tc.content = color;
  document.documentElement.style.setProperty("--brand-color", color);
  if (b.app_name || b.icon_url || b.primary_color) {
    const origin = window.location.origin;
    const manifest = {
      name: b.app_name || "Sowwanjo POS", short_name: b.app_name?.split(" ")[0] || "متجري",
      start_url: origin + "/", display: "standalone", background_color: color, theme_color: color,
      lang: "ar", dir: "rtl",
      icons: b.icon_url
        ? [{ src: b.icon_url, sizes: "any", type: "image/png", purpose: "any maskable" }]
        : [
            { src: origin + "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
            { src: origin + "/icons/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
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
  if (tc) tc.content = "#173A34";
  document.documentElement.style.removeProperty("--brand-color");
  let ml = document.querySelector("link[rel=manifest]") as HTMLLinkElement | null;
  if (!ml) { ml = document.createElement("link") as HTMLLinkElement; ml.rel = "manifest"; document.head.appendChild(ml); }
  if (ml.href.startsWith("blob:")) URL.revokeObjectURL(ml.href);
  ml.href = "/manifest.json";
}

// ─────────────────────────────────────────────────────────────────────────────
// SPLASH SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fade, setFade] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 1400);
    const t2 = setTimeout(() => onDone(), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-400"
      style={{ background: "linear-gradient(160deg,#0A1A15 0%,#173A34 50%,#1a4a3e 100%)", opacity: fade ? 0 : 1, pointerEvents: fade ? "none" : "auto" }}>
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(200,164,92,1) 1px,transparent 1px),linear-gradient(90deg,rgba(200,164,92,1) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10" style={{ background: "radial-gradient(circle,#C8A45C 0%,transparent 70%)" }} />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="w-24 h-24 rounded-[28px] flex items-center justify-center" style={{ background: "rgba(200,164,92,0.12)", border: "1.5px solid rgba(200,164,92,0.35)", boxShadow: "0 0 48px rgba(200,164,92,0.2)" }}>
          <Store size={44} color="#C8A45C" />
        </div>
        <div className="text-center">
          <p className="font-black text-3xl tracking-tight mb-1" style={{ color: "#fff" }}>Sowwanjo POS</p>
          <p className="text-sm font-medium" style={{ color: "rgba(200,164,92,0.6)" }}>نظام نقاط البيع السحابي</p>
        </div>
        <div className="flex gap-2 mt-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full" style={{ background: "rgba(200,164,92,0.6)", animation: `splash-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
      <style>{`@keyframes splash-bounce{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-8px);opacity:1}}`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BUSINESS SCENE — Hero Illustration
// ─────────────────────────────────────────────────────────────────────────────
function BusinessScene() {
  return (
    <div className="relative w-full h-full overflow-hidden select-none pointer-events-none">
      {/* Ambient center glow */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 55% at 50% 58%, rgba(200,164,92,0.07) 0%, transparent 100%)" }} />

      {/* SVG Connection Lines */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 620 500" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cgl1" gradientUnits="userSpaceOnUse" x1="310" y1="118" x2="128" y2="182">
            <stop offset="0%" stopColor="#C8A45C" stopOpacity="0.65" /><stop offset="100%" stopColor="#C8A45C" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="cgl2" gradientUnits="userSpaceOnUse" x1="310" y1="118" x2="492" y2="182">
            <stop offset="0%" stopColor="#C8A45C" stopOpacity="0.65" /><stop offset="100%" stopColor="#C8A45C" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="cgl3" gradientUnits="userSpaceOnUse" x1="310" y1="118" x2="310" y2="248">
            <stop offset="0%" stopColor="#C8A45C" stopOpacity="0.85" /><stop offset="100%" stopColor="#C8A45C" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id="cgl4" gradientUnits="userSpaceOnUse" x1="310" y1="118" x2="96" y2="338">
            <stop offset="0%" stopColor="#C8A45C" stopOpacity="0.4" /><stop offset="100%" stopColor="#C8A45C" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="cgl5" gradientUnits="userSpaceOnUse" x1="310" y1="118" x2="524" y2="318">
            <stop offset="0%" stopColor="#C8A45C" stopOpacity="0.4" /><stop offset="100%" stopColor="#C8A45C" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="310" y1="118" x2="128" y2="182" stroke="url(#cgl1)" strokeWidth="1.2" strokeDasharray="6 4"><animate attributeName="stroke-dashoffset" values="0;-20" dur="2.6s" repeatCount="indefinite" /></line>
        <line x1="310" y1="118" x2="492" y2="182" stroke="url(#cgl2)" strokeWidth="1.2" strokeDasharray="6 4"><animate attributeName="stroke-dashoffset" values="0;-20" dur="3.1s" repeatCount="indefinite" /></line>
        <line x1="310" y1="118" x2="310" y2="248" stroke="url(#cgl3)" strokeWidth="1.6" strokeDasharray="5 3"><animate attributeName="stroke-dashoffset" values="0;-16" dur="1.7s" repeatCount="indefinite" /></line>
        <line x1="310" y1="118" x2="96" y2="338" stroke="url(#cgl4)" strokeWidth="1" strokeDasharray="5 5"><animate attributeName="stroke-dashoffset" values="0;-20" dur="3.6s" repeatCount="indefinite" /></line>
        <line x1="310" y1="118" x2="524" y2="318" stroke="url(#cgl5)" strokeWidth="1" strokeDasharray="5 5"><animate attributeName="stroke-dashoffset" values="0;-20" dur="3.3s" repeatCount="indefinite" /></line>
        {/* Traveling data packets */}
        <circle r="3.5" fill="#C8A45C" fillOpacity="0.85"><animateMotion dur="2s" repeatCount="indefinite"><mpath href="#scp-center" /></animateMotion></circle>
        <path id="scp-center" d="M310,118 L310,248" fill="none" />
        <circle r="2.5" fill="#C8A45C" fillOpacity="0.55"><animateMotion dur="2.8s" repeatCount="indefinite" begin="0.4s"><mpath href="#scp-left" /></animateMotion></circle>
        <path id="scp-left" d="M310,118 L128,182" fill="none" />
        <circle r="2.5" fill="#C8A45C" fillOpacity="0.55"><animateMotion dur="3.3s" repeatCount="indefinite" begin="1.1s"><mpath href="#scp-right" /></animateMotion></circle>
        <path id="scp-right" d="M310,118 L492,182" fill="none" />
      </svg>

      {/* Cloud Hub — top center */}
      <motion.div className="absolute flex flex-col items-center" style={{ top: "7%", left: "50%", transform: "translateX(-50%)" }}
        animate={{ y: [0, -6, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}>
        <div style={{ width: 82, height: 82, borderRadius: "50%", background: "rgba(23,58,52,0.65)", border: "1.5px solid rgba(200,164,92,0.5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 50px rgba(200,164,92,0.15),0 0 100px rgba(200,164,92,0.06),inset 0 1px 0 rgba(255,255,255,0.08)" }}>
          <Cloud size={36} color="#C8A45C" />
        </div>
        <p style={{ color: "rgba(200,164,92,0.65)", fontSize: 9, fontWeight: 700, marginTop: 5, letterSpacing: "0.08em" }}>السحابة</p>
      </motion.div>

      {/* Sales Dashboard Card — top left */}
      <motion.div className="absolute" style={{ top: "5%", left: "4%" }} animate={{ y: [0, -9, 0] }} transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}>
        <div style={{ width: 182, borderRadius: 15, padding: "13px 15px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 22px 52px rgba(0,0,0,0.38)", transform: "rotate(-5deg)", backdropFilter: "blur(10px)" }}>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 9, marginBottom: 4 }}>المبيعات اليوم</p>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 3 }}>
            <p style={{ color: "#fff", fontSize: 24, fontWeight: 900, lineHeight: 1 }}>٢٤,٨٣٠</p>
            <span style={{ background: "rgba(46,139,87,0.2)", color: "#4ade80", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 5 }}>▲ ٠٥٪</span>
          </div>
          <p style={{ color: "rgba(255,255,255,0.28)", fontSize: 8, marginBottom: 10 }}>دينار أردني · آخر تحديث ٣ دقائق</p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 44 }}>
            {[30, 52, 38, 70, 55, 88, 68].map((h, i) => (
              <div key={i} style={{ flex: 1, borderRadius: "3px 3px 0 0", height: `${h}%`, background: i === 5 ? "#C8A45C" : i === 6 ? "rgba(200,164,92,0.4)" : "rgba(255,255,255,0.14)" }} />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Mobile App Card — top right */}
      <motion.div className="absolute" style={{ top: "4%", right: "4%" }} animate={{ y: [0, -11, 0] }} transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}>
        <div style={{ width: 90, borderRadius: 20, overflow: "hidden", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 20px 44px rgba(0,0,0,0.4)", transform: "rotate(5deg)", backdropFilter: "blur(10px)" }}>
          <div style={{ background: "rgba(255,255,255,0.07)", padding: "6px 0 6px", display: "flex", justifyContent: "center" }}>
            <div style={{ width: 24, height: 4, background: "rgba(255,255,255,0.22)", borderRadius: 2 }} />
          </div>
          <div style={{ padding: "8px 9px 11px" }}>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 7, marginBottom: 7, fontWeight: 600, letterSpacing: "0.05em" }}>طلب جديد</p>
            {[["بيبسي ٣٣٠مل", "٢.٢٠٠"], ["شيبس لايز", "٢.٥٠٠"], ["مياه نوتيكا", "٠.٣٥٠"]].map(([name, price], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 7, flex: 1 }}>{name}</span>
                <span style={{ color: "#C8A45C", fontSize: 7, fontWeight: 700 }}>{price}</span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 7, paddingTop: 7, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 8, fontWeight: 700 }}>الإجمالي</span>
              <span style={{ color: "#C8A45C", fontSize: 9, fontWeight: 800 }}>٤.٠٥٠</span>
            </div>
            <div style={{ marginTop: 7, background: "#C8A45C", borderRadius: 8, padding: "5px 0", textAlign: "center" }}>
              <span style={{ color: "#173A34", fontSize: 8, fontWeight: 900 }}>دفع الآن</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* POS Terminal — center piece */}
      <motion.div className="absolute" style={{ top: "37%", left: "50%", transform: "translateX(-50%)" }} animate={{ y: [0, -7, 0] }} transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}>
        <div style={{ width: 172, borderRadius: 17, overflow: "hidden", background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 28px 64px rgba(0,0,0,0.45),0 0 0 1px rgba(200,164,92,0.07)", backdropFilter: "blur(14px)" }}>
          <div style={{ background: "rgba(23,58,52,0.65)", padding: "9px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(200,164,92,0.18)" }}>
            <span style={{ color: "#C8A45C", fontSize: 9, fontWeight: 800, letterSpacing: "0.04em" }}>Sowwanjo POS</span>
            <div style={{ display: "flex", gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#C8A45C" }} />
            </div>
          </div>
          <div style={{ padding: "11px 13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, paddingBottom: 7, borderBottom: "1px dashed rgba(255,255,255,0.12)" }}>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 8 }}>فاتورة #٢٤٧</span>
              <span style={{ color: "rgba(200,164,92,0.65)", fontSize: 8 }}>١٤/٧/٢٠٢٥</span>
            </div>
            {[["كوكاكولا ٣٣٠مل", "×٢", "٢.٤٠٠"], ["شيبس لايز", "×١", "١.٢٥٠"], ["نوتيكا ١.٥ل", "×٣", "١.٠٥٠"]].map(([n, q, p], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
                <span style={{ color: "rgba(255,255,255,0.62)", fontSize: 8, flex: 1 }}>{n}</span>
                <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 7, margin: "0 5px" }}>{q}</span>
                <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 8, fontWeight: 600 }}>{p}</span>
              </div>
            ))}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.13)", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>الإجمالي</span>
              <span style={{ color: "#C8A45C", fontSize: 13, fontWeight: 900 }}>٤.٧٠٠ JOD</span>
            </div>
            <div style={{ marginTop: 9, background: "#173A34", border: "1px solid rgba(200,164,92,0.35)", borderRadius: 9, padding: "7px 0", textAlign: "center" }}>
              <span style={{ color: "#C8A45C", fontSize: 9, fontWeight: 800 }}>إتمام الدفع</span>
            </div>
          </div>
          <div style={{ padding: "0 13px 11px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 3 }}>
            {["٢","٣","٤","٥","٦","٧","٨","٩","⌫","٠","✓"].map((k, i) => (
              <div key={i} style={{ background: k === "✓" ? "rgba(200,164,92,0.18)" : "rgba(255,255,255,0.06)", borderRadius: 5, height: 18, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${k === "✓" ? "rgba(200,164,92,0.3)" : "transparent"}` }}>
                <span style={{ color: k === "✓" ? "#C8A45C" : "rgba(255,255,255,0.45)", fontSize: 8 }}>{k}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Analytics Card — bottom left */}
      <motion.div className="absolute" style={{ bottom: "4%", left: "4%" }} animate={{ y: [0, -9, 0] }} transition={{ duration: 4.9, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}>
        <div style={{ width: 154, borderRadius: 14, padding: "12px 14px", background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 18px 40px rgba(0,0,0,0.32)", transform: "rotate(3deg)", backdropFilter: "blur(10px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, marginBottom: 3 }}>النمو الشهري</p>
              <p style={{ color: "#C8A45C", fontSize: 22, fontWeight: 900, lineHeight: 1 }}>+٢٨٪</p>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(46,139,87,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={14} color="#4ade80" />
            </div>
          </div>
          <svg width="126" height="42" viewBox="0 0 126 42">
            <defs>
              <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C8A45C" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#C8A45C" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,36 C12,32 18,30 28,24 S48,15 62,19 S82,10 94,8 S110,4 126,2" fill="none" stroke="#C8A45C" strokeWidth="2" strokeLinecap="round" />
            <path d="M0,36 C12,32 18,30 28,24 S48,15 62,19 S82,10 94,8 S110,4 126,2 L126,42 L0,42 Z" fill="url(#areaFill)" />
          </svg>
        </div>
      </motion.div>

      {/* Inventory Card — bottom right */}
      <motion.div className="absolute" style={{ bottom: "4%", right: "4%" }} animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}>
        <div style={{ width: 148, borderRadius: 14, padding: "12px 13px", background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 18px 40px rgba(0,0,0,0.32)", transform: "rotate(-3deg)", backdropFilter: "blur(10px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 9 }}>حالة المخزون</p>
            <Package size={12} color="rgba(200,164,92,0.5)" />
          </div>
          {[["مياه نوتيكا", 78, "#4ade80"], ["مشروبات غازية", 44, "#C8A45C"], ["منتجات تعبئة", 91, "#4ade80"]].map(([name, level, color], i) => (
            <div key={i} style={{ marginBottom: i < 2 ? 8 : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ color: "rgba(255,255,255,0.58)", fontSize: 8 }}>{name as string}</span>
                <span style={{ color: color as string, fontSize: 8, fontWeight: 700 }}>{level as number}٪</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 3, height: 4, overflow: "hidden" }}>
                <div style={{ width: `${level as number}%`, background: color as string, height: "100%", borderRadius: 3, opacity: 0.85 }} />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING SLIDES (Mobile)
// ─────────────────────────────────────────────────────────────────────────────
const SLIDES = [
  {
    Icon: Building2,
    title: "منصة واحدة لإدارة جميع أعمالك",
    subtitle: "من المبيعات والمخزون إلى الموظفين والتقارير — كل شيء في مكان واحد.",
    accent: "#C8A45C",
  },
  {
    Icon: BarChart3,
    title: "تقارير ذكية ورؤية فورية للأداء",
    subtitle: "اتخذ قرارات مبنية على البيانات مع لوحة تحكم متكاملة في الوقت الفعلي.",
    accent: "#4ade80",
  },
  {
    Icon: WifiOff,
    title: "يعمل حتى عند انقطاع الإنترنت",
    subtitle: "لا توقف في العمل. تستمر الفواتير ثم تتزامن تلقائياً عند الاتصال.",
    accent: "#C8A45C",
  },

];

const FEATURES = [
  { Icon: Store, label: "متعدد المتاجر" },
  { Icon: GitBranch, label: "متعدد الفروع" },
  { Icon: WifiOff, label: "بدون إنترنت" },
  { Icon: BarChart3, label: "تقارير ذكية" },
  { Icon: ScanLine, label: "باركود و QR" },
  { Icon: Package, label: "إدارة المخزون" },
  { Icon: Smartphone, label: "الجوال والتابلت" },
  { Icon: Shield, label: "سحابي وآمن" },
];

// ─────────────────────────────────────────────────────────────────────────────
// LUXURY LOGIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
const APP_VER = "2.0.0";

function LuxuryLoginScreen({ onLogin }: { onLogin: (type: "superadmin" | "store", id?: string) => void }) {
  const [mode,           setMode]          = useState<"store" | "admin">("store");
  const [email,          setEmail]         = useState(() => { try { return localStorage.getItem("sowwanjo_remember_email") || ""; } catch { return ""; } });
  const [pass,           setPass]          = useState("");
  const [showPass,       setShowPass]      = useState(false);
  const [rememberMe,     setRememberMe]    = useState(() => { try { return !!localStorage.getItem("sowwanjo_remember_email"); } catch { return false; } });
  const [err,            setErr]           = useState("");
  const [loading,        setLoading]       = useState(false);
  const [entering,       setEntering]      = useState(false);
  const [logoClicks,     setLogoClicks]    = useState(0);
  const [adminUnlocked,  setAdminUnlocked] = useState(false);
  const [isMobile,       setIsMobile]      = useState(() => window.innerWidth < 1024);
  const [slide,          setSlide]         = useState(0);
  const [showLoginForm,  setShowLoginForm]  = useState(false);
  const [branding,       setBranding]      = useState<{ appName?: string; logoUrl?: string; primaryColor?: string } | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    const cached = getCachedBranding();
    if (cached) setBranding(cached as typeof branding);
    fetch("/api/branding").then(r => r.ok ? r.json() : null).then(d => { if (d) setBranding(d); }).catch(() => {});
  }, []);

  const handleLogoClick = () => {
    setLogoClicks(c => { const n = c + 1; if (n >= 5) setAdminUnlocked(true); return n; });
  };

  const doLogin = async () => {
    if (!email.trim() || !pass.trim()) { setErr("يرجى إدخال بيانات تسجيل الدخول"); return; }
    setLoading(true); setErr("");
    try {
      if (mode === "admin") {
        const res = await apiLoginAdmin(email.trim(), pass) as { token: string };
        setToken(res.token);
        if (rememberMe) { try { localStorage.setItem("sowwanjo_remember_email", email.trim()); } catch {} }
        else { try { localStorage.removeItem("sowwanjo_remember_email"); } catch {} }
        setEntering(true);
        setTimeout(() => onLogin("superadmin"), 650);
      } else {
        const res = await apiLoginStore(email.trim(), pass) as {
          token: string; storeId?: string;
          user?: { id: string; name: string; email: string; role: string };
          store?: { id?: string; _id?: string; nameAr?: string; appName?: string; primaryColor?: string; logoUrl?: string; iconUrl?: string; [k: string]: unknown };
          branding?: object;
        };
        setToken(res.token);
        if (rememberMe) { try { localStorage.setItem("sowwanjo_remember_email", email.trim()); } catch {} }
        else { try { localStorage.removeItem("sowwanjo_remember_email"); } catch {} }
        const sid = res.storeId || res.store?.id || String(res.store?._id || "");
        if (res.store) { try { localStorage.setItem(`sowwanjo_storeinfo_${sid}`, JSON.stringify({ ...res.store, id: sid })); } catch {} }
        if (res.user) {
          try {
            localStorage.setItem(`sowwanjo_user_role_${sid}`, res.user.role || "owner");
            localStorage.setItem(`sowwanjo_user_name_${sid}`, res.user.name || "");
            localStorage.setItem(`sowwanjo_user_id_${sid}`, res.user.id || "");
          } catch {}
        }
        if (res.branding) applyBranding(res.branding as { primaryColor?: string; appName?: string; logoUrl?: string });
        setEntering(true);
        setTimeout(() => onLogin("store", sid), 650);
      }
    } catch (e) {
      setErr((e as { error?: string }).error || "بيانات غير صحيحة");
      setLoading(false);
    }
  };

  const platformName = branding?.appName || "Sowwanjo POS";

  // ── Login Card inner UI ──────────────────────────────────────────────────
  const LoginCardContent = (
    <div>
      {/* Card header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <button onClick={handleLogoClick} className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 transition-transform active:scale-95 cursor-default"
          style={{ background: "rgba(23,58,52,0.06)", border: "1.5px solid rgba(23,58,52,0.12)" }}>
          {branding?.logoUrl
            ? <img src={branding.logoUrl} alt="شعار المنصة" className="w-10 h-10 object-contain" />
            : <Store size={30} color="#173A34" />}
        </button>
        <p className="font-black text-2xl" style={{ color: "#173A34", marginBottom: 4 }}>{platformName}</p>
        <p className="text-sm font-medium" style={{ color: "#888" }}>
          {mode === "admin" ? "دخول المدير العام" : "مرحباً بك — سجّل دخولك للمتابعة"}
        </p>
      </div>

      {/* Mode toggle — shown only when admin unlocked */}
      {adminUnlocked && (
        <div className="flex rounded-xl p-1 mb-6" style={{ background: "rgba(23,58,52,0.06)", border: "1px solid rgba(23,58,52,0.1)" }}>
          {(["store", "admin"] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setErr(""); }}
              className="flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-200"
              style={{ background: mode === m ? "#173A34" : "transparent", color: mode === m ? "#C8A45C" : "#666" }}>
              {m === "store" ? "المتجر" : "المدير العام"}
            </button>
          ))}
        </div>
      )}

      {/* Email field */}
      <div className="mb-4">
        <label className="block text-xs font-semibold mb-1.5" style={{ color: "#555" }}>
          {mode === "admin" ? "البريد الإلكتروني أو اسم المستخدم" : "البريد الإلكتروني أو رقم الهاتف"}
        </label>
        <div className="relative">
          <input
            ref={emailRef}
            type="text" value={email} onChange={e => { setEmail(e.target.value); setErr(""); }}
            onKeyDown={e => e.key === "Enter" && doLogin()}
            placeholder={mode === "admin" ? "superadmin@..." : "user@example.com"}
            className="w-full rounded-xl text-sm outline-none transition-all duration-200"
            style={{
              padding: "13px 44px 13px 14px",
              background: "#fff", border: `1.5px solid ${err && !email ? "#ef4444" : "#E7E7E7"}`,
              color: "#222", direction: "ltr", textAlign: "right",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              fontFamily: "'Cairo',sans-serif",
            }}
            onFocus={e => (e.target.style.borderColor = "#173A34")}
            onBlur={e => (e.target.style.borderColor = err && !email ? "#ef4444" : "#E7E7E7")}
          />
          <div className="absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" style={{ color: "#bbb" }}>
            <Mail size={16} />
          </div>
        </div>
      </div>

      {/* Password field */}
      <div className="mb-5">
        <label className="block text-xs font-semibold mb-1.5" style={{ color: "#555" }}>كلمة المرور</label>
        <div className="relative">
          <input
            type={showPass ? "text" : "password"} value={pass}
            onChange={e => { setPass(e.target.value); setErr(""); }}
            onKeyDown={e => e.key === "Enter" && doLogin()}
            placeholder="••••••••"
            className="w-full rounded-xl text-sm outline-none transition-all duration-200"
            style={{
              padding: "13px 44px 13px 44px",
              background: "#fff", border: `1.5px solid ${err && !pass ? "#ef4444" : "#E7E7E7"}`,
              color: "#222", letterSpacing: showPass ? "normal" : "0.12em",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              fontFamily: "'Cairo',sans-serif",
            }}
            onFocus={e => (e.target.style.borderColor = "#173A34")}
            onBlur={e => (e.target.style.borderColor = err && !pass ? "#ef4444" : "#E7E7E7")}
          />
          <div className="absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" style={{ color: "#bbb" }}>
            <Lock size={16} />
          </div>
          <button type="button" onClick={() => setShowPass(s => !s)}
            className="absolute top-1/2 -translate-y-1/2 left-3 p-1 rounded-lg transition-colors"
            style={{ color: "#999", background: "transparent" }}>
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Remember me */}
      <div className="flex items-center gap-2 mb-6">
        <button type="button" onClick={() => setRememberMe(s => !s)}
          className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-200"
          style={{ background: rememberMe ? "#173A34" : "#fff", border: `1.5px solid ${rememberMe ? "#173A34" : "#ddd"}` }}>
          {rememberMe && <svg width="11" height="8" viewBox="0 0 11 8" fill="none"><path d="M1 4l3 3 6-6" stroke="#C8A45C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </button>
        <span className="text-xs" style={{ color: "#666" }}>تذكّرني في هذا الجهاز</span>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {err && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertCircle size={15} color="#ef4444" className="flex-shrink-0" />
            <span className="text-xs font-medium" style={{ color: "#dc2626" }}>{err}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login button */}
      <button onClick={doLogin} disabled={loading}
        className="w-full rounded-xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]"
        style={{
          background: loading ? "#2a5549" : "#173A34",
          color: "#C8A45C", padding: "14px 0",
          boxShadow: "0 4px 20px rgba(23,58,52,0.28)",
          letterSpacing: "0.03em",
        }}
        onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.background = "#C8A45C"; (e.currentTarget as HTMLButtonElement).style.color = "#173A34"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 24px rgba(200,164,92,0.35)"; } }}
        onMouseLeave={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.background = "#173A34"; (e.currentTarget as HTMLButtonElement).style.color = "#C8A45C"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(23,58,52,0.28)"; } }}>
        {loading
          ? <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(200,164,92,0.3)", borderTopColor: "#C8A45C" }} /><span>جارٍ التحقق...</span></>
          : <span>تسجيل الدخول</span>}
      </button>

      {/* Support & version */}
      <div className="flex items-center justify-between mt-6 pt-5" style={{ borderTop: "1px solid #F0EEEA" }}>
        <button className="flex items-center gap-1.5 text-xs transition-colors" style={{ color: "#999" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#173A34")}
          onMouseLeave={e => (e.currentTarget.style.color = "#999")}>
          <Headphones size={14} /><span>الدعم الفني</span>
        </button>
        <span className="text-xs font-mono" style={{ color: "#ccc" }}>v{APP_VER}</span>
      </div>
    </div>
  );

  // ── Login Transition Overlay ───────────────────────────────────────────────
  if (entering) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "#173A34" }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(200,164,92,0.12)", border: "1.5px solid rgba(200,164,92,0.3)" }}>
            <Store size={30} color="#C8A45C" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(200,164,92,0.25)", borderTopColor: "#C8A45C" }} />
            <span className="text-sm font-semibold" style={{ color: "rgba(200,164,92,0.7)" }}>جارٍ التحميل...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── MOBILE Layout ─────────────────────────────────────────────────────────
  if (isMobile) {
    // Show login form directly if requested
    if (showLoginForm) {
      return (
        <div dir="rtl" className="min-h-dvh flex flex-col" style={{ background: "#F7F5F2", fontFamily: "'Cairo',sans-serif" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-safe-top pt-6 pb-4">
            <button onClick={() => setShowLoginForm(false)} className="flex items-center gap-1 text-sm" style={{ color: "#173A34" }}>
              <ChevronRight size={18} />
              <span className="font-semibold">رجوع</span>
            </button>
            <span className="text-xs font-mono" style={{ color: "#ccc" }}>v{APP_VER}</span>
          </div>
          {/* Card */}
          <div className="flex-1 flex flex-col justify-center px-6 pb-8">
            <div className="rounded-3xl p-7 shadow-2xl" style={{ background: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.1)" }}>
              {LoginCardContent}
            </div>
          </div>
        </div>
      );
    }

    // Onboarding slides
    const currentSlide = SLIDES[slide];
    return (
      <div dir="rtl" className="fixed inset-0 flex flex-col overflow-hidden" style={{ fontFamily: "'Cairo',sans-serif", background: "#173A34" }}>
        <AnimatePresence mode="wait">
          <motion.div key={slide} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.35 }}
            className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <div className="w-28 h-28 rounded-3xl flex items-center justify-center mb-10"
              style={{ background: `rgba(${slide === 1 ? "74,222,128" : "200,164,92"},0.12)`, border: `1.5px solid rgba(${slide === 1 ? "74,222,128" : "200,164,92"},0.25)` }}>
              <currentSlide.Icon size={52} color={currentSlide.accent} />
            </div>
            <h1 className="text-2xl font-black leading-tight mb-4" style={{ color: "#fff" }}>{currentSlide.title}</h1>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{currentSlide.subtitle}</p>
          </motion.div>
        </AnimatePresence>

        {/* Bottom area */}
        <div className="px-8 pb-safe-bottom pb-10">
          {/* Dots */}
          <div className="flex justify-center gap-2 mb-8">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => setSlide(i)}
                className="transition-all duration-300 rounded-full"
                style={{ width: i === slide ? 24 : 8, height: 8, background: i === slide ? "#C8A45C" : "rgba(255,255,255,0.25)" }} />
            ))}
          </div>

          {slide < SLIDES.length - 1 ? (
            <div className="flex items-center justify-between gap-4">
              <button onClick={() => setShowLoginForm(true)} className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>تخطّي</button>
              <button onClick={() => setSlide(s => s + 1)}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-base transition-all"
                style={{ background: "#C8A45C", color: "#173A34" }}>
                <span>التالي</span><ChevronLeft size={18} />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowLoginForm(true)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-base"
              style={{ background: "#C8A45C", color: "#173A34" }}>
              <span>ابدأ الآن</span><ChevronLeft size={18} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── DESKTOP + TABLET Layout ───────────────────────────────────────────────
  return (
    <div dir="rtl" className="fixed inset-0 overflow-hidden" style={{ fontFamily: "'Cairo',sans-serif" }}>

      {/* ── Full-screen green background ───────────────────────────────────── */}
      <div className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: "linear-gradient(160deg,#0d2620 0%,#173A34 55%,#1a4840 100%)" }}>
        {/* Subtle grid texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(rgba(200,164,92,1) 1px,transparent 1px),linear-gradient(90deg,rgba(200,164,92,1) 1px,transparent 1px)", backgroundSize: "56px 56px" }} />
        {/* Radial glow center-left */}
        <div className="absolute pointer-events-none" style={{ top: "20%", right: "40%", width: 520, height: 520, background: "radial-gradient(circle,rgba(200,164,92,0.07) 0%,transparent 70%)" }} />

        {/* Top brand bar */}
        <div className="relative z-10 flex items-center gap-3 px-10 pt-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(200,164,92,0.12)", border: "1px solid rgba(200,164,92,0.25)" }}>
            <Store size={18} color="#C8A45C" />
          </div>
          <span className="font-black text-base tracking-tight" style={{ color: "#fff" }}>{platformName}</span>
          <div className="mr-auto flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: "pulse 2s ease-in-out infinite" }} />
            <span className="text-xs font-semibold" style={{ color: "rgba(74,222,128,0.85)" }}>متصل</span>
          </div>
        </div>

        {/* Hero text — right half stays free for the card */}
        <div className="relative z-10 px-10 mt-10" style={{ maxWidth: "58%" }}>
          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-black leading-tight mb-4"
            style={{ color: "#fff", fontSize: "clamp(26px,2.8vw,38px)", lineHeight: 1.3 }}>
            تحكم بأعمالك<br />
            <span style={{ color: "#C8A45C" }}>بذكاء واحتراف</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="text-sm leading-relaxed"
            style={{ color: "rgba(255,255,255,0.5)", maxWidth: 380 }}>
            منصة سحابية متكاملة لإدارة المبيعات، المخزون، العملاء، الفروع، والتقارير من أي مكان.
          </motion.p>
        </div>

        {/* Business Scene */}
        <div className="relative flex-1 min-h-0" style={{ maxWidth: "62%" }}>
          <BusinessScene />
        </div>

        {/* Feature badges */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="relative z-10 px-10 pb-8"
          style={{ maxWidth: "62%" }}>
          <div className="flex flex-wrap gap-2">
            {FEATURES.map(({ Icon, label }, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.7 + i * 0.05 }}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Icon size={11} color="rgba(200,164,92,0.75)" />
                <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.65)" }}>{label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Login card — floating over the left side (RTL: visually right) ─── */}
      <div className="absolute inset-y-0 left-0 flex items-center justify-center"
        style={{ width: "42%", padding: "2rem", zIndex: 20 }}>
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="w-full rounded-3xl overflow-y-auto"
          style={{
            background: "#fff",
            maxWidth: 400,
            maxHeight: "calc(100dvh - 4rem)",
            boxShadow: "0 32px 96px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.06)",
            padding: "2rem",
          }}>
          {LoginCardContent}
          <div className="flex items-center justify-center gap-1.5 mt-5 pt-4" style={{ borderTop: "1px solid #F0EEEA" }}>
            <Shield size={11} color="#ccc" />
            <span className="text-xs" style={{ color: "#ccc" }}>تشفير كامل · SSL · بيانات آمنة</span>
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// THREE-STATE AUTH
// ─────────────────────────────────────────────────────────────────────────────
type AuthState = "loading" | "authenticated" | "unauthenticated";

export default function App() {
  const [splash, setSplash] = useState(() => {
    try { return sessionStorage.getItem("sowwanjo_splashed") !== "1"; } catch { return true; }
  });
  const hideSplash = useCallback(() => {
    try { sessionStorage.setItem("sowwanjo_splashed", "1"); } catch {}
    setSplash(false);
  }, []);

  // Platform branding
  useEffect(() => {
    const cached = getCachedBranding();
    if (cached) applyBranding(cached);
    fetch("/api/branding").then(r => r.ok ? r.json() : null).then(d => { if (d) applyBranding(d); }).catch(() => {});
  }, []);

  // PWA meta tags
  useEffect(() => {
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name=${name}]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    document.querySelector("meta[name=viewport]")?.setAttribute("content", "width=device-width,initial-scale=1,viewport-fit=cover,maximum-scale=1") || setMeta("viewport", "width=device-width,initial-scale=1,viewport-fit=cover,maximum-scale=1");
    setMeta("theme-color", "#173A34");
    setMeta("mobile-web-app-capable", "yes");
    setMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
    let ml = document.querySelector("link[rel=manifest]");
    if (!ml) { ml = document.createElement("link"); ml.setAttribute("rel", "manifest"); document.head.appendChild(ml); }
    ml.setAttribute("href", "/manifest.json");
    document.title = "Sowwanjo POS";
  }, []);

  // Three-state auth
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [view,      setView]      = useState<View>("login");
  const [storeId,   setStoreId]   = useState<string>("");

  useEffect(() => {
    const restore = async () => {
      try {
        const raw = localStorage.getItem("sowwanjo_session");
        if (!raw) { setAuthState("unauthenticated"); return; }
        const { type, id } = JSON.parse(raw) as { type: string; id?: string };
        if (type === "superadmin") {
          const { getToken } = await import("./lib");
          if (!getToken()) { setAuthState("unauthenticated"); return; }
          setView("superadmin"); setAuthState("authenticated"); return;
        }
        if (type === "store" && id) {
          try {
            const info = JSON.parse(localStorage.getItem(`sowwanjo_storeinfo_${id}`) || "{}");
            if (info.nameAr) applyStoreBranding({ app_name: info.appName || info.nameAr, primary_color: info.primaryColor, logo_url: info.logoUrl, icon_url: info.iconUrl });
          } catch {}
          setStoreId(id); setView("store"); setAuthState("authenticated");
          setTimeout(() => { initAutoSync(id); }, 500);
          return;
        }
        setAuthState("unauthenticated");
      } catch { setAuthState("unauthenticated"); }
    };
    restore();
  }, []);

  const login = useCallback((type: "superadmin" | "store", id?: string) => {
    if (type === "superadmin") {
      localStorage.setItem("sowwanjo_session", JSON.stringify({ type: "superadmin" }));
      resetSABranding(); setView("superadmin");
    } else {
      const sid = id || "";
      localStorage.setItem("sowwanjo_session", JSON.stringify({ type: "store", id: sid }));
      initAutoSync(sid);
      try {
        const info = JSON.parse(localStorage.getItem(`sowwanjo_storeinfo_${sid}`) || "{}");
        if (info.nameAr) applyStoreBranding({ app_name: info.appName || info.nameAr, primary_color: info.primaryColor, logo_url: info.logoUrl, icon_url: info.iconUrl });
      } catch {}
      setStoreId(sid); setView("store");
    }
    setAuthState("authenticated");
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("sowwanjo_session");
    clearToken(); resetSABranding();
    setView("login"); setStoreId(""); setAuthState("unauthenticated");
  }, []);

  const showContent = !splash && authState !== "loading";

  return (
    <div className="size-full" style={{ fontFamily: "'Cairo','Inter',sans-serif" }}>
      {splash && <SplashScreen onDone={hideSplash} />}
      {!splash && authState === "loading" && (
        <div className="flex h-full items-center justify-center" style={{ background: "#173A34" }}>
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(200,164,92,0.3)", borderTopColor: "#C8A45C" }} />
        </div>
      )}
      {showContent && authState === "unauthenticated" && (
        <LuxuryLoginScreen onLogin={login} />
      )}
      {showContent && authState === "authenticated" && view === "superadmin" && (
        <SuperAdminLayout onLogout={logout} />
      )}
      {showContent && authState === "authenticated" && view === "store" && (
        <StoreCtx.Provider value={storeId}>
          <StoreLayout storeId={storeId} onLogout={logout} />
        </StoreCtx.Provider>
      )}
      <ToastHost />
    </div>
  );
}
