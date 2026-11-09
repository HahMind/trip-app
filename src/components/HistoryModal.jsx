import { History, RotateCcw, X } from "lucide-react";
import { useEffect } from "react";

export default function HistoryModal({ expenses, onClose, onUndo }) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-900 text-gray-100 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
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
                      ฿{Number(expense.amount).toLocaleString()}
                    </p>
                    {/*  เปลี่ยนเป็นปุ่มกู้คืน (Undo) พร้อมไอคอน RotateCcw */}
                    <button
                      onClick={() => onUndo(expense.id)}
                      className="ml-2 flex items-center gap-1 rounded-3xl border border-red-500 bg-red-500 px-2 py-1 text-xs text-gray-950 transition hover:bg-red-400"
                      title="กู้คืนรายการนี้"
                    >
                      <RotateCcw size={14} /> กู้คืนรายการ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
