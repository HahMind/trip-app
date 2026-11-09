import { Car } from "lucide-react";

export default function GasForm({
  odoStart,
  odoEnd,
  gasPrice,
  gasRate,
  previewGasCost,
  onOdoStartChange,
  onOdoEndChange,
  onGasPriceChange,
  onGasRateChange,
  onSubmit,
}) {
  const formatMoney = (value) =>
    value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <section className="rounded-xl border border-gray-200 bg-gray-300 p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 font-bold text-orange-500">
        <Car size={20} /> <h2>คำนวณ & จดค่าน้ำมัน</h2>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-500">
            เลขไมล์เริ่มต้น
            <input type="number" value={odoStart} onChange={(event) => onOdoStartChange(event.target.value)} className="w-full rounded-lg border bg-gray-50 p-2" />
          </label>
          <label className="text-xs text-gray-500">
            เลขไมล์ล่าสุด
            <input type="number" value={odoEnd} onChange={(event) => onOdoEndChange(event.target.value)} className="w-full rounded-lg border bg-yellow-50 p-2" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-500">
            ราคาน้ำมัน (บ./ลิตร)
            <input type="number" value={gasPrice} onChange={(event) => onGasPriceChange(event.target.value)} className="w-full rounded-lg border p-2" />
          </label>
          <label className="text-xs text-gray-500">
            อัตรากินน้ำมัน (กม./ล.)
            <input type="number" value={gasRate} onChange={(event) => onGasRateChange(event.target.value)} className="w-full rounded-lg border p-2" />
          </label>
        </div>
        <div className="my-2 rounded-lg border border-orange-100 bg-orange-50 p-3 text-center">
          <p className="mb-1 text-xs text-orange-600">ยอดค่าน้ำมันจำลอง (หาร 4 แล้ว)</p>
          <h3 className="text-2xl font-bold text-orange-600">฿{formatMoney(previewGasCost)}</h3>
        </div>
        <button onClick={onSubmit} className="w-full rounded-lg bg-orange-500 py-3 font-bold text-white transition hover:bg-orange-600">
          + บันทึกค่าน้ำมัน
        </button>
      </div>
    </section>
  );
}
