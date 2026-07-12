// ESC/POS cash drawer kick command bytes
const KICK_PIN2 = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0x19]);

// Try to open cash drawer via Web Serial API (Chrome/Edge HTTPS only)
export async function openCashDrawer(): Promise<"opened" | "no_serial" | "cancelled" | "error"> {
  if (!("serial" in navigator)) return "no_serial";
  try {
    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate: 9600 });
    const writer = port.writable.getWriter();
    await writer.write(KICK_PIN2);
    writer.releaseLock();
    await port.close();
    return "opened";
  } catch (e: any) {
    if (e?.name === "NotFoundError" || e?.code === 8) return "cancelled";
    return "error";
  }
}

// Embed kick bytes into an ESC/POS print job that runs in the background
// Works when the browser has a raw-mode printer configured
export function kickViaRawPrint() {
  const w = window.open("", "_blank", "width=1,height=1");
  if (!w) return;
  // Some browsers send raw bytes via <pre> with media=print
  w.document.write(`<!DOCTYPE html><html><head><style>body{display:none}@media print{pre{display:block;white-space:pre}}</style></head><body><pre>\x1Bp\x00\x19\x19</pre></body></html>`);
  w.document.close();
  setTimeout(() => { w.print(); w.close(); }, 200);
}
