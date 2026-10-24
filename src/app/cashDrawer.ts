// ESC/POS cash-drawer kick command (drawer kick on printer/serial pin 2).
const KICK_PIN2 = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0x19]);

type DrawerResult = "opened" | "no_serial" | "cancelled" | "needs_permission" | "error";

function serialApi(): any {
  if (typeof navigator === "undefined") return null;
  return (navigator as any).serial || null;
}

// Run this only from a direct user action (the "enable auto-open" switch).
// Browser permission must be granted before a later invoice can open the drawer silently.
export async function prepareCashDrawer(): Promise<"ready" | "no_serial" | "cancelled" | "error"> {
  const serial = serialApi();
  if (!serial) return "no_serial";
  try {
    const port = await serial.requestPort();
    // Remembering browser permission lets later sales use getPorts() without prompting.
    const ports = await serial.getPorts();
    if (!ports.includes(port)) return "error";
    return "ready";
  } catch (e: any) {
    if (e?.name === "NotFoundError" || e?.code === 8) return "cancelled";
    return "error";
  }
}

// Automatically use a previously authorized serial port; never open a permission
// picker after a sale because browsers block that without a direct user gesture.
export async function openCashDrawer(): Promise<DrawerResult> {
  const serial = serialApi();
  if (!serial) return "no_serial";
  try {
    const ports: any[] = await serial.getPorts();
    if (!ports.length) return "needs_permission";
    const port = ports[0];
    if (!port.readable || !port.writable) {
      try { await port.open({ baudRate: 9600 }); }
      catch (e: any) {
        if (e?.name !== "InvalidStateError") throw e;
      }
    }
    const writer = port.writable.getWriter();
    try { await writer.write(KICK_PIN2); }
    finally { writer.releaseLock(); }
    // Do not close a previously granted port; keep it available for next sale.
    return "opened";
  } catch {
    return "error";
  }
}

// Legacy raw-print fallback retained for compatibility; standard browser printing
// cannot guarantee raw ESC/POS bytes reach a printer.
export function kickViaRawPrint() {
  const w = window.open("", "_blank", "width=1,height=1");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><style>body{display:none}@media print{pre{display:block;white-space:pre}}</style></head><body><pre>\\x1Bp\\x00\\x19\\x19</pre></body></html>`);
  w.document.close();
  setTimeout(() => { w.print(); w.close(); }, 200);
}
