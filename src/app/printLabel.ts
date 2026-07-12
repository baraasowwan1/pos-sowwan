// Zero-dependency label printer:
// - Barcodes via "Libre Barcode 128 Text" Google Font (renders Code128 from plain text)
// - QR codes via api.qrserver.com (free public API, no key required)

export interface LabelProduct {
  nameAr: string;
  barcode: string;
  sku: string;
  sellPrice: number;
}

export interface LabelOptions {
  qty: number;
  size: "sm" | "md" | "lg";
  showQr: boolean;
  showPrice: boolean;
  showName: boolean;
  perRow: number;
}

const SIZE_MAP = {
  sm: { wPx: 113, hPx: 57,  barFs: 28, nameFs: 7,  priceFs: 8,  qrSz: 44, name: "3×1.5 سم" },
  md: { wPx: 189, hPx: 95,  barFs: 40, nameFs: 9,  priceFs: 11, qrSz: 70, name: "5×2.5 سم" },
  lg: { wPx: 227, hPx: 151, barFs: 52, nameFs: 12, priceFs: 14, qrSz: 90, name: "6×4 سم"   },
};

export function printBarcodeLabels(product: LabelProduct, opts: LabelOptions) {
  const dim = SIZE_MAP[opts.size];
  const barcodeValue = product.barcode || product.sku || product.nameAr;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${dim.qrSz}x${dim.qrSz}&data=${encodeURIComponent(barcodeValue)}&margin=0`;

  const labelHtml = () => `
    <div class="label">
      ${opts.showName ? `<p class="name">${product.nameAr}</p>` : ""}
      <div class="mid">
        <div class="bar-wrap">
          <span class="bar">${barcodeValue}</span>
          <p class="barnum">${barcodeValue}</p>
        </div>
        ${opts.showQr ? `<img class="qr" src="${qrUrl}" alt="QR" crossorigin="anonymous"/>` : ""}
      </div>
      ${opts.showPrice ? `<p class="price">${product.sellPrice.toFixed(3)} JOD</p>` : ""}
    </div>`;

  const labels = Array.from({ length: opts.qty }, () => labelHtml()).join("");

  const w = window.open("", "_blank", "width=920,height=720");
  if (!w) { alert("يرجى السماح للمتصفح بفتح نوافذ منبثقة"); return; }

  w.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>ملصقات — ${product.nameAr}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128+Text&family=Cairo:wght@700;900&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Cairo',sans-serif;background:#f3f4f6;direction:rtl}
  @media screen{
    .ctrl{position:fixed;top:10px;left:50%;transform:translateX(-50%);display:flex;gap:8px;z-index:99}
    .ctrl button{padding:8px 22px;border-radius:8px;font-family:inherit;font-weight:900;font-size:13px;cursor:pointer;border:none}
    .bp{background:#2563EB;color:white}
    .bc{background:#6b7280;color:white}
    .sheet{display:flex;flex-wrap:wrap;gap:4px;padding:20px 14px 14px;max-width:930px;margin:52px auto 0;background:white;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.09)}
  }
  @media print{
    .ctrl{display:none!important}
    body{background:white}
    .sheet{display:flex;flex-wrap:wrap;gap:3px;padding:3mm;margin:0;box-shadow:none;border-radius:0}
    .label{border:0.4pt dashed #bbb!important}
  }
  .label{
    width:${dim.wPx}px;height:${dim.hPx}px;
    border:1px dashed #d1d5db;border-radius:3px;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    padding:2px 2px;background:white;overflow:hidden;gap:0;
  }
  .name{
    font-size:${dim.nameFs}px;font-weight:900;text-align:center;
    line-height:1.15;width:100%;overflow:hidden;
    text-overflow:ellipsis;white-space:nowrap;color:#111;
  }
  .mid{display:flex;align-items:center;justify-content:center;gap:2px;width:100%}
  .bar-wrap{display:flex;flex-direction:column;align-items:center;flex:1;min-width:0}
  .bar{
    font-family:'Libre Barcode 128 Text',monospace;
    font-size:${dim.barFs}px;line-height:1;
    display:block;text-align:center;color:#000;
    white-space:nowrap;overflow:hidden;max-width:100%;
  }
  .barnum{font-size:${Math.max(6, dim.nameFs - 1)}px;color:#333;font-family:monospace;letter-spacing:.05em;text-align:center;margin-top:-2px}
  .qr{flex-shrink:0;width:${dim.qrSz * 0.72}px;height:${dim.qrSz * 0.72}px;object-fit:contain}
  .price{font-size:${dim.priceFs}px;font-weight:900;color:#111;letter-spacing:-.02em;margin-top:1px}
</style>
</head>
<body>
  <div class="ctrl">
    <button class="bp" onclick="window.print()">🖨️ طباعة</button>
    <button class="bc" onclick="window.close()">✕ إغلاق</button>
  </div>
  <div class="sheet">${labels}</div>
</body>
</html>`);
  w.document.close();
}
