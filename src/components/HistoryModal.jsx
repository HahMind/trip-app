import { History, Trash2, X } from "lucide-react";

export default function HistoryModal({ expenses, onClose, onDelete }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-blue-600 p-4 text-white">
          <h2 className="flex items-center gap-2 font-bold"><History size={20} /> ประวัติการเคลียร์ยอด</h2>
          <button onClick={onClose} className="hover:text-blue-200"><X size={24} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {expenses.length === 0 ? (
            <p className="py-10 text-center text-gray-400">ยังไม่มีประวัติการโอนเงิน</p>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div>
                    <p className="text-xs text-gray-400">{expense.expense_date}</p>
                    <p className="font-medium text-gray-700">{expense.item_name}</p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <p className="font-bold text-green-600">฿{Number(expense.amount).toLocaleString()}</p>
                    <button onClick={() => onDelete(expense.id)} className="text-gray-300 transition hover:text-red-500"><Trash2 size={16} /></button>
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
