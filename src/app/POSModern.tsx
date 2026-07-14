/**
 * POSModern — واجهة نقطة بيع محسّنة وأكثر وضوحاً
 * 
 * تصميم احترافي بألوان واضحة وتجربة مستخدم سلسة
 */

import { useState, useRef, useEffect } from "react";
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Scan, Grid3X3,
  List, Star, Clock, CreditCard, Banknote, Smartphone, Percent,
  User, Gift, Tag, Calculator, Printer, X, Check, AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Badge } from "./components/ui/badge";
import { Card } from "./components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  nameAr: string;
  nameEn?: string;
  barcode?: string;
  sku?: string;
  sellPrice: number;
  stock: number;
  category?: string;
  unit?: string;
  image?: string;
}

interface CartItem {
  product: Product;
  qty: number;
  discount: number; // نسبة مئوية
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA للعرض التوضيحي
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_PRODUCTS: Product[] = [
  { id: "1", nameAr: "كوكاكولا 330مل", sellPrice: 0.750, stock: 120, category: "مشروبات", barcode: "123456789", unit: "حبة" },
  { id: "2", nameAr: "شيبس لايز", sellPrice: 1.250, stock: 85, category: "وجبات خفيفة", barcode: "234567890", unit: "حبة" },
  { id: "3", nameAr: "حليب نادك طازج", sellPrice: 2.500, stock: 45, category: "ألبان", barcode: "345678901", unit: "علبة" },
  { id: "4", nameAr: "خبز صمون", sellPrice: 0.400, stock: 200, category: "مخبوزات", barcode: "456789012", unit: "رغيف" },
  { id: "5", nameAr: "أرز بسمتي 5كغم", sellPrice: 12.000, stock: 30, category: "بقالة", barcode: "567890123", unit: "كيس" },
  { id: "6", nameAr: "زيت زيتون 1ل", sellPrice: 8.500, stock: 25, category: "زيوت", barcode: "678901234", unit: "زجاجة" },
  { id: "7", nameAr: "شامبو بانتين", sellPrice: 3.750, stock: 60, category: "عناية شخصية", barcode: "789012345", unit: "قارورة" },
  { id: "8", nameAr: "معجون أسنان سيجنال", sellPrice: 2.200, stock: 90, category: "عناية شخصية", barcode: "890123456", unit: "علبة" },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function POSModern() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [products] = useState<Product[]>(MOCK_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [posTab, setPosTab] = useState<"all" | "fav" | "recent">("all");
  const [favorites, setFavorites] = useState<string[]>(["1", "2", "3"]); // mock favorites
  const [recentIds] = useState<string[]>(["1", "4", "7"]); // mock recent
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "cliq">("cash");
  const [cashAmount, setCashAmount] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Categories ─────────────────────────────────────────────────────────────
  const categories = ["الكل", ...Array.from(new Set(products.map(p => p.category || "عام")))];

  // ── Filtered Products ──────────────────────────────────────────────────────
  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchQuery || 
      p.nameAr.includes(searchQuery) || 
      (p.barcode && p.barcode.includes(searchQuery));
    const matchesCategory = selectedCategory === "الكل" || p.category === selectedCategory;
    
    let matchesTab = true;
    if (posTab === "fav") matchesTab = favorites.includes(p.id);
    if (posTab === "recent") matchesTab = recentIds.includes(p.id);
    
    return matchesSearch && matchesCategory && matchesTab;
  });

  // ── Cart Calculations ──────────────────────────────────────────────────────
  const subtotal = cart.reduce((sum, item) => sum + (item.product.sellPrice * item.qty), 0);
  const itemDiscounts = cart.reduce((sum, item) => 
    sum + (item.product.sellPrice * item.qty * (item.discount / 100)), 0
  );
  const invoiceDiscount = (subtotal - itemDiscounts) * (discountPercent / 100);
  const tax = (subtotal - itemDiscounts - invoiceDiscount) * 0.16; // 16% ضريبة
  const total = subtotal - itemDiscounts - invoiceDiscount + tax;
  const change = paymentMethod === "cash" && cashAmount ? parseFloat(cashAmount) - total : 0;

  // ── Cart Actions ───────────────────────────────────────────────────────────
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, qty: Math.min(item.qty + 1, product.stock) }
            : item
        );
      }
      return [...prev, { product, qty: 1, discount: 0 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, Math.min(item.qty + delta, item.product.stock));
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => setCart([]);

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      const product = products.find(p => 
        p.barcode === searchQuery.trim() || 
        p.sku === searchQuery.trim()
      );
      if (product) {
        addToCart(product);
        setSearchQuery("");
      }
    }
  };

  const handleCheckout = () => {
    // هنا سيتم الاتصال بالـ API لحفظ البيع
    console.log("Checkout:", { cart, total, paymentMethod });
    setShowPayment(false);
    clearCart();
    setCashAmount("");
    setDiscountPercent(0);
    // يمكن إضافة toast notification هنا
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" className="flex h-screen bg-gray-50 overflow-hidden" style={{ fontFamily: "'Cairo', sans-serif" }}>
      {/* ═══════════════════════════════════════════════════════════════════════
          PRODUCTS PANEL (اليمين)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden border-l border-gray-200">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <Input
                ref={searchRef}
                type="text"
                placeholder="بحث بالاسم أو الباركود... (اضغط Enter للإضافة)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleBarcodeScan}
                className="pr-10 text-base h-12"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            >
              {viewMode === "grid" ? <List size={20} /> : <Grid3X3 size={20} />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12"
            >
              <Scan size={20} />
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={posTab} onValueChange={(v) => setPosTab(v as typeof posTab)} className="mb-3">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <ShoppingCart size={16} />
                <span>الكل</span>
              </TabsTrigger>
              <TabsTrigger value="fav" className="flex items-center gap-2">
                <Star size={16} />
                <span>المفضلة</span>
              </TabsTrigger>
              <TabsTrigger value="recent" className="flex items-center gap-2">
                <Clock size={16} />
                <span>الأخيرة</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="whitespace-nowrap"
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Products Grid/List */}
        <div className="flex-1 overflow-y-auto p-4">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map(product => (
                <ProductCardGrid
                  key={product.id}
                  product={product}
                  onAdd={addToCart}
                  isFavorite={favorites.includes(product.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map(product => (
                <ProductCardList
                  key={product.id}
                  product={product}
                  onAdd={addToCart}
                  isFavorite={favorites.includes(product.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}

          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <AlertCircle size={48} className="mb-2" />
              <p>لا توجد منتجات</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          CART PANEL (اليسار)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="w-[420px] bg-white flex flex-col shadow-2xl">
        {/* Cart Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShoppingCart size={24} />
              <h2 className="text-xl font-bold">السلة</h2>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white border-0">
              {cart.length} منتج
            </Badge>
          </div>
          <p className="text-sm text-emerald-100">إجمالي: {total.toFixed(3)} JOD</p>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ShoppingCart size={64} className="mb-3 opacity-20" />
              <p className="text-lg font-semibold">السلة فارغة</p>
              <p className="text-sm">أضف منتجات للبدء</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map(item => (
                <CartItemCard
                  key={item.product.id}
                  item={item}
                  onUpdateQty={updateQty}
                  onRemove={removeFromCart}
                />
              ))}
            </div>
          )}
        </div>

        {/* Cart Footer - Totals */}
        {cart.length > 0 && (
          <div className="border-t border-gray-200 p-4 space-y-3">
            {/* Discount Control */}
            <div className="flex items-center gap-2">
              <Percent size={18} className="text-gray-500" />
              <Input
                type="number"
                placeholder="خصم على الفاتورة %"
                value={discountPercent || ""}
                onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                className="flex-1 h-9 text-sm"
                min="0"
                max="100"
              />
            </div>

            {/* Totals */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>المجموع الفرعي</span>
                <span className="font-semibold">{subtotal.toFixed(3)} JOD</span>
              </div>
              {itemDiscounts > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>خصم المنتجات</span>
                  <span className="font-semibold">-{itemDiscounts.toFixed(3)} JOD</span>
                </div>
              )}
              {invoiceDiscount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>خصم الفاتورة ({discountPercent}%)</span>
                  <span className="font-semibold">-{invoiceDiscount.toFixed(3)} JOD</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>ضريبة (16%)</span>
                <span className="font-semibold">{tax.toFixed(3)} JOD</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-emerald-700 pt-2 border-t border-gray-200">
                <span>الإجمالي</span>
                <span>{total.toFixed(3)} JOD</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearCart}
                className="flex-1"
              >
                <Trash2 size={16} className="ml-1" />
                مسح
              </Button>
              <Button
                size="sm"
                onClick={() => setShowPayment(true)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check size={16} className="ml-1" />
                دفع
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          PAYMENT MODAL
          ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showPayment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPayment(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-bold">إتمام الدفع</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => setShowPayment(false)}
                  >
                    <X size={24} />
                  </Button>
                </div>
                <div className="text-3xl font-black">{total.toFixed(3)} JOD</div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Payment Method Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    طريقة الدفع
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "cash", label: "نقدي", icon: Banknote },
                      { value: "card", label: "بطاقة", icon: CreditCard },
                      { value: "cliq", label: "كليك", icon: Smartphone },
                    ].map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setPaymentMethod(value as typeof paymentMethod)}
                        className={`
                          flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                          ${paymentMethod === value
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                            : "border-gray-200 hover:border-gray-300 text-gray-600"
                          }
                        `}
                      >
                        <Icon size={24} />
                        <span className="text-sm font-semibold">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cash Input */}
                {paymentMethod === "cash" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      المبلغ المستلم
                    </label>
                    <Input
                      type="number"
                      placeholder="0.000"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      className="text-lg h-14 text-center font-bold"
                      step="0.001"
                      autoFocus
                    />
                    {change > 0 && (
                      <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-emerald-700">الباقي</span>
                          <span className="text-xl font-bold text-emerald-700">
                            {change.toFixed(3)} JOD
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Cash Buttons */}
                {paymentMethod === "cash" && (
                  <div className="grid grid-cols-4 gap-2">
                    {[5, 10, 20, 50].map(amount => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        onClick={() => setCashAmount(String(amount))}
                        className="h-12 font-bold"
                      >
                        {amount} JOD
                      </Button>
                    ))}
                  </div>
                )}

                {/* Checkout Button */}
                <Button
                  className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleCheckout}
                  disabled={paymentMethod === "cash" && (!cashAmount || parseFloat(cashAmount) < total)}
                >
                  <Check size={20} className="ml-2" />
                  تأكيد وطباعة الفاتورة
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT CARD - GRID VIEW
// ─────────────────────────────────────────────────────────────────────────────

function ProductCardGrid({ 
  product, 
  onAdd, 
  isFavorite, 
  onToggleFavorite 
}: { 
  product: Product; 
  onAdd: (p: Product) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  return (
    <Card className="group cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden">
      <div onClick={() => onAdd(product)} className="p-3">
        {/* Product Image Placeholder */}
        <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-3 flex items-center justify-center">
          <Package className="text-gray-300" size={48} />
        </div>

        {/* Product Info */}
        <div className="space-y-2">
          <h3 className="font-bold text-sm line-clamp-2 text-gray-800 min-h-[40px]">
            {product.nameAr}
          </h3>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-black text-emerald-700">
                {product.sellPrice.toFixed(3)}
              </p>
              <p className="text-xs text-gray-500">دينار أردني</p>
            </div>
            <Badge 
              variant={product.stock > 10 ? "default" : "destructive"}
              className="text-xs"
            >
              {product.stock} {product.unit || "وحدة"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex border-t border-gray-200">
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(product); }}
          className="flex-1 py-2 text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1"
        >
          <Plus size={16} />
          إضافة
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(product.id); }}
          className="px-3 border-r border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <Star 
            size={16} 
            className={isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-400"} 
          />
        </button>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT CARD - LIST VIEW
// ─────────────────────────────────────────────────────────────────────────────

function ProductCardList({ 
  product, 
  onAdd, 
  isFavorite, 
  onToggleFavorite 
}: { 
  product: Product; 
  onAdd: (p: Product) => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  return (
    <Card 
      className="flex items-center gap-3 p-3 cursor-pointer hover:shadow-md transition-all"
      onClick={() => onAdd(product)}
    >
      {/* Product Image */}
      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
        <Package className="text-gray-300" size={32} />
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-sm text-gray-800 truncate">{product.nameAr}</h3>
        <p className="text-xs text-gray-500">{product.barcode}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={product.stock > 10 ? "default" : "destructive"} className="text-xs">
            {product.stock}
          </Badge>
          <span className="text-xs text-gray-500">{product.category}</span>
        </div>
      </div>

      {/* Price & Actions */}
      <div className="flex items-center gap-3">
        <div className="text-left">
          <p className="text-lg font-black text-emerald-700">{product.sellPrice.toFixed(3)}</p>
          <p className="text-xs text-gray-500">JOD</p>
        </div>
        <div className="flex flex-col gap-1">
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); onAdd(product); }}
            className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus size={14} />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(product.id); }}
            className="h-8 px-3"
          >
            <Star 
              size={14} 
              className={isFavorite ? "fill-yellow-400 text-yellow-400" : ""} 
            />
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CART ITEM CARD
// ─────────────────────────────────────────────────────────────────────────────

function CartItemCard({
  item,
  onUpdateQty,
  onRemove,
}: {
  item: CartItem;
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}) {
  const lineTotal = item.product.sellPrice * item.qty * (1 - item.discount / 100);

  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        {/* Product Image */}
        <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
          <Package className="text-gray-300" size={28} />
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-gray-800 line-clamp-2 mb-1">
            {item.product.nameAr}
          </h4>
          <p className="text-xs text-gray-500 mb-2">
            {item.product.sellPrice.toFixed(3)} × {item.qty} = {lineTotal.toFixed(3)} JOD
          </p>

          {/* Quantity Controls */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              onClick={() => onUpdateQty(item.product.id, -1)}
            >
              <Minus size={14} />
            </Button>
            <span className="w-10 text-center font-bold text-sm">{item.qty}</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              onClick={() => onUpdateQty(item.product.id, 1)}
            >
              <Plus size={14} />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 w-7 p-0 mr-auto"
              onClick={() => onRemove(item.product.id)}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        {/* Line Total */}
        <div className="text-left">
          <p className="text-base font-black text-emerald-700">
            {lineTotal.toFixed(3)}
          </p>
          <p className="text-xs text-gray-500">JOD</p>
        </div>
      </div>
    </Card>
  );
}

// Missing import
function Package({ size, className }: { size: number; className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <line x1="16.5" x2="7.5" y1="9.4" y2="4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" x2="12" y1="22" y2="12" />
    </svg>
  );
}
