import { Check, RefreshCw, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { formatMoney } from "../utils/trip";

export default function TripHeader({
  totalExpense,
  isSyncing,
  onRefresh,
  MEMBERS,
  onOpenMemberModal,
}) {
  const [syncStatus, setSyncStatus] = useState("idle");
  useEffect(() => {
    if (isSyncing) setSyncStatus("syncing");
    else if (!isSyncing && syncStatus === "syncing") {
      setSyncStatus("success");
      setTimeout(() => setSyncStatus("idle"), 1500);
    }
  }, [isSyncing, syncStatus]);

  return (
    <header className="sticky top-0 z-30 bg-gray-900 p-4 text-gray-100 shadow-md">
      <div className="relative mx-auto max-w-md text-center">
        <button
          onClick={onOpenMemberModal}
          className="absolute left-0 top-5 flex h-10 items-center justify-center gap-1.5 rounded-full bg-gray-800 px-3 transition hover:bg-gray-700"
        >
          <Users size={20} className="text-lime-400" />
          <span className="text-base font-bold text-gray-300">
            {MEMBERS.length}
          </span>
        </button>
        <button
          onClick={onRefresh}
          disabled={syncStatus === "syncing"}
          className="absolute right-1 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 transition hover:bg-gray-700"
        >
          {syncStatus === "syncing" ? (
            <RefreshCw size={26} className="animate-spin text-gray-400" />
          ) : syncStatus === "success" ? (
            <Check size={26} className="text-lime-400" />
          ) : (
            <RefreshCw size={26} className="text-gray-300" />
          )}
        </button>
        <p className="mt-1 text-sm font-light opacity-80">
          ยอดรวมค่าใช้จ่ายทั้งทริป
        </p>
        <h1 className="my-1 text-4xl font-bold">
          ฿{formatMoney(totalExpense)}
        </h1>
      </div>
    </header>
  );
}
