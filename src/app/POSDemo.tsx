/**
 * POSDemo — صفحة عرض توضيحية لواجهة POS المحسّنة
 */

import { useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { POSModern } from "./POSModern";
import { Button } from "./components/ui/button";

export function POSDemo() {
  const [showDemo, setShowDemo] = useState(false);

  if (showDemo) {
    return <POSModern />;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-8" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
            ✨ التصميم الجديد
          </div>
          <h1 className="text-5xl font-black text-gray-900 mb-4">
            واجهة نقطة البيع المحسّنة
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            تصميم احترافي بألوان واضحة وتجربة مستخدم سلسة — مصمم خصيصاً للسوق الأردني
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {[
            {
              title: "واجهة واضحة وسهلة",
              desc: "تصميم نظيف مع ألوان متباينة لسهولة القراءة والاستخدام السريع",
              icon: "🎨",
            },
            {
              title: "سلة ذكية",
              desc: "عرض مفصّل للمنتجات مع حسابات الخصومات والضرائب بشكل تلقائي",
              icon: "🛒",
            },
            {
              title: "بحث متقدم",
              desc: "بحث فوري بالاسم أو الباركود مع دعم Scanner للإضافة السريعة",
              icon: "🔍",
            },
            {
              title: "طرق دفع متعددة",
              desc: "نقدي، بطاقة، كليك مع حساب الباقي تلقائياً للمدفوعات النقدية",
              icon: "💳",
            },
            {
              title: "تنظيم ذكي",
              desc: "تصنيفات، مفضلة، وأخيرة لسرعة الوصول للمنتجات الأكثر استخداماً",
              icon: "⭐",
            },
            {
              title: "RTL كامل",
              desc: "دعم كامل للعربية مع تصميم يراعي الاتجاه من اليمين لليسار",
              icon: "🇯🇴",
            },
          ].map((feature, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-3">{feature.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button
            onClick={() => setShowDemo(true)}
            size="lg"
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-lg h-16 px-12 rounded-2xl shadow-2xl hover:shadow-emerald-500/50 transition-all"
          >
            <ExternalLink size={24} className="ml-2" />
            تجربة الواجهة الآن
          </Button>
          <p className="mt-4 text-sm text-gray-500">
            * هذه نسخة تجريبية مع بيانات وهمية للعرض
          </p>
        </div>
      </div>
    </div>
  );
}
