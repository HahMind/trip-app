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
    <section className="rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 font-bold text-lime-400">
        <Car size={20} /> <h2>คำนวณ & จดค่าน้ำมัน</h2>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-base text-gray-400">
            เลขไมล์เริ่มต้น
            <input 
              type="number" 
              inputMode="decimal"
              value={odoStart} 
              onChange={(event) => onOdoStartChange(event.target.value)} 
              className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-100 focus:border-lime-400 focus:outline-none" 
            />
          </label>
          <label className="text-base text-gray-400">
            เลขไมล์ล่าสุด
            <input 
              type="number" 
              inputMode="decimal"
              value={odoEnd} 
              onChange={(event) => onOdoEndChange(event.target.value)} 
              className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-100 focus:border-lime-400 focus:outline-none" 
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-base text-gray-400">
            ราคาน้ำมัน (บ./ลิตร)
            <input 
              type="number" 
              inputMode="decimal"
              value={gasPrice} 
              onChange={(event) => onGasPriceChange(event.target.value)} 
              className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-100 focus:border-lime-400 focus:outline-none" 
            />
          </label>
          <label className="text-base text-gray-400">
            อัตรากินน้ำมัน (กม./ล.)
            <input 
              type="number" 
              inputMode="decimal"
              value={gasRate} 
              onChange={(event) => onGasRateChange(event.target.value)} 
              className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-100 focus:border-lime-400 focus:outline-none" 
            />
          </label>
        </div>
        <div className="my-2 rounded-lg border border-gray-700 bg-gray-800 p-3 text-center">
          <p className="mb-1 text-base text-lime-400">ยอดค่าน้ำมันจำลอง (หาร 4 แล้ว)</p>
          <h3 className="text-2xl font-bold text-lime-400">฿{formatMoney(previewGasCost)}</h3>
        </div>
        <button onClick={onSubmit} className="w-full rounded-lg bg-lime-400 py-3 font-bold text-gray-950 transition hover:bg-lime-300">
          + บันทึกค่าน้ำมัน
        </button>
      </div>
    </section>
  );
}
