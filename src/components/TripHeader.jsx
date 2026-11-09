import { RefreshCw } from "lucide-react";

export default function TripHeader({ totalExpense, perPerson, isSyncing, onRefresh }) {
  const formatMoney = (value) =>
    value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <header className="sticky top-0 z-40 bg-gray-900 p-4 text-gray-100 shadow-md">
      <div className="relative mx-auto max-w-md text-center">
        <button
          onClick={onRefresh}
          className="absolute right-0 top-5 rounded-full bg-gray-800 p-2 transition hover:bg-gray-700"
          title="รีเฟรชข้อมูล"
        >
          <RefreshCw size={24} className={isSyncing ? "animate-spin" : ""} />
        </button>
        <p className="mt-1 text-sm font-light opacity-80">ยอดรวมค่าใช้จ่ายทั้งทริป</p>
        <h1 className="my-1 text-4xl font-bold">฿{formatMoney(totalExpense)}</h1>
        <p className="inline-block rounded-full bg-gray-800 px-3 py-1 text-sm text-lime-400">
          หาร 4 คน = ตกคนละ ฿{formatMoney(perPerson)}
        </p>
      </div>
    </header>
  );
}
