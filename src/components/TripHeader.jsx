import { RefreshCw } from "lucide-react";

export default function TripHeader({ totalExpense, perPerson, isSyncing, onRefresh }) {
  const formatMoney = (value) =>
    value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <header className="sticky top-0 z-40 bg-blue-600 p-4 text-white shadow-md">
      <div className="relative mx-auto max-w-md text-center">
        <button
          onClick={onRefresh}
          className="absolute right-0 top-5 rounded-full bg-blue-700 p-2 transition hover:bg-blue-800"
          title="รีเฟรชข้อมูล"
        >
          <RefreshCw size={24} className={isSyncing ? "animate-spin" : ""} />
        </button>
        <p className="mt-1 text-sm font-light opacity-80">ยอดรวมค่าใช้จ่ายทั้งทริป</p>
        <h1 className="my-1 text-4xl font-bold">฿{formatMoney(totalExpense)}</h1>
        <p className="inline-block rounded-full bg-blue-700 px-3 py-1 text-sm">
          หาร 4 คน = ตกคนละ ฿{formatMoney(perPerson)}
        </p>
      </div>
    </header>
  );
}
