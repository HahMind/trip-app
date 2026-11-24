import { History, RotateCcw, X } from "lucide-react";
import { useEffect } from "react";
import { formatMoney } from "../utils/trip";
import ModalShell from "./ModalShell";
import { dynaura } from "dynaura";

export default function HistoryModal({ expenses, onClose, onUndo, pendingHistoryId, isOffline }) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <ModalShell
      backdropClassName="bg-gray-950/60"
      panelClassName="max-h-[80vh] max-w-md"
      onClose={onClose}
    >
        <div className="flex items-center justify-between bg-gray-800 p-4 text-lime-400">
          <h2 className="flex items-center gap-2 font-bold">
            <History size={20} /> ประวัติการเคลียร์ยอด
          </h2>
          <button onClick={onClose} className="hover:text-lime-300">
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {expenses.length === 0 ? (
            <p className="py-10 text-center text-gray-400">
              ยังไม่มีประวัติการโอนเงิน
            </p>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-3"
                >
                  <div>
                    <p className="text-xs text-gray-400">
                      {expense.expense_date}
                    </p>
                    <p className="font-medium text-gray-100">
                      {expense.item_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <p className="font-bold text-lime-400">
                      ฿{formatMoney(expense.amount)}
                    </p>
                    <button
                      onClick={() => {
                        if (isOffline) {
                          dynaura.warning({
                            title: "ออฟไลน์",
                            description: "ไม่สามารถกู้คืนยอดขณะออฟไลน์ได้",
                            duration: 4000,
                          });
                          return;
                        }
                        onUndo(expense.id);
                      }}
                      disabled={pendingHistoryId === expense.id || isOffline}
                      className={`ml-2 flex items-center gap-1 rounded-3xl border px-2 py-1 text-xs transition ${
                        pendingHistoryId === expense.id || isOffline
                          ? "cursor-not-allowed border-gray-500 bg-gray-500 text-gray-300 shimmer"
                          : "border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500 hover:text-gray-950"
                      }`}
                    >
                      <RotateCcw size={14} /> กู้คืน
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </ModalShell>
  );
}
