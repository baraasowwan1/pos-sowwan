import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

export interface LabelProduct {
  nameAr: string;
  barcode: string;
  sku: string;
  sellPrice: number;
}

export interface LabelOptions {
  qty: number;
  size: "sm" | "md" | "lg"; // 3x1.5cm | 5x2.5cm | 6x4cm
  showQr: boolean;
  showPrice: boolean;
  showName: boolean;
  perRow: number;
}

// Generate barcode SVG string via jsbarcode
function makeBarcodesvg(code: string, width: number, height: number): string {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  try {
    JsBarcode(svg, code, {
      format: code.length === 13 || code.length === 12 ? "EAN13" : "CODE128",
      width: 1.5,
      height,
      displayValue: true,
      fontSize: 9,
      margin: 2,
      background: "#ffffff",
    });
  } catch {
    JsBarcode(svg, code || "0000000000000", {
      format: "CODE128",
      width: 1.5,
      height,
      displayValue: true,
      fontSize: 9,
      margin: 2,
    });
  }
  svg.setAttribute("width", String(width));
  return svg.outerHTML;
}

const SIZE_MAP = {
  sm: { w: 113, h: 57,  bh: 24, name: "3×1.5 سم" },
  md: { w: 189, h: 95,  bh: 38, name: "5×2.5 سم" },
  lg: { w: 227, h: 151, bh: 50, name: "6×4 سم"   },
};

export async function printBarcodeLabels(product: LabelProduct, opts: LabelOptions) {
  const dim = SIZE_MAP[opts.size];
  const barcodeValue = product.barcode || product.sku || product.nameAr;

  // Generate QR data URL
  let qrDataUrl = "";
  if (opts.showQr) {
    try {
      qrDataUrl = await QRCode.toDataURL(barcodeValue, { width: dim.h - 12, margin: 0 });
    } catch { /* skip QR */ }
  }

  const barcodeSvg = makeBarcodesvg(barcodeValue, opts.showQr ? dim.w * 0.6 : dim.w - 6, dim.bh);

  const labelHtml = (i: number) => `
    <div class="label">
      ${opts.showName ? `<p class="name">${product.nameAr}</p>` : ""}
      <div class="barcode-row">
        <div class="barcode-wrap">${barcodeSvg}</div>
        ${opts.showQr && qrDataUrl ? `<img class="qr" src="${qrDataUrl}" alt="QR"/>` : ""}
      </div>
      ${opts.showPrice ? `<p class="price">${product.sellPrice.toFixed(3)} JOD</p>` : ""}
    </div>`;

  const labels = Array.from({ length: opts.qty }, (_, i) => labelHtml(i)).join("");

  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>طباعة ملصقات — ${product.nameAr}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', 'Tahoma', Arial, sans-serif; background: #f3f4f6; direction: rtl; }
  @media screen {
    .controls { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; z-index: 100; }
    .controls button { padding: 8px 20px; border-radius: 8px; font-family: inherit; font-weight: bold; font-size: 13px; cursor: pointer; border: none; }
    .btn-print { background: #2563EB; color: white; }
    .btn-close { background: #6b7280; color: white; }
    .sheet { display: flex; flex-wrap: wrap; gap: 4px; padding: 24px 16px 16px; max-width: 900px; margin: 50px auto 0; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
  }
  @media print {
    .controls { display: none !important; }
    body { background: white; }
    .sheet { display: flex; flex-wrap: wrap; gap: 3px; padding: 4mm; margin: 0; box-shadow: none; border-radius: 0; }
  }
  .label {
    width: ${dim.w}px; height: ${dim.h}px;
    border: 1px dashed #d1d5db; border-radius: 4px;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 3px 2px; background: white; overflow: hidden;
    gap: 1px;
  }
  @media print { .label { border: 0.5pt solid #ccc; } }
  .name {
    font-size: ${opts.size === "sm" ? 7 : opts.size === "md" ? 9 : 11}px;
    font-weight: 900; text-align: center; line-height: 1.2;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    width: 100%; max-width: 100%;
  }
  .barcode-row { display: flex; align-items: center; justify-content: center; gap: 2px; width: 100%; }
  .barcode-wrap { display: flex; align-items: center; }
  .barcode-wrap svg { max-width: 100%; height: auto; display: block; }
  .qr { width: ${Math.round((dim.h - 12) * 0.75)}px; height: ${Math.round((dim.h - 12) * 0.75)}px; object-fit: contain; }
  .price {
    font-size: ${opts.size === "sm" ? 8 : opts.size === "md" ? 10 : 13}px;
    font-weight: 900; color: #111; letter-spacing: -0.02em;
  }
</style>
</head>
<body>
  <div class="controls">
    <button class="btn-print" onclick="window.print()">🖨️ طباعة</button>
    <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
  </div>
  <div class="sheet">${labels}</div>
</body>
</html>`);
  w.document.close();
}
