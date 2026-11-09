import { ChevronDown, ChevronRight, Edit2, FolderClosed, FolderOpen, Maximize2, Minimize2, Receipt, Trash2 } from "lucide-react";

export default function ExpenseList({
  expenses,
  groupedExpenses,
  loading,
  isExpanded,
  collapsedDates,
  onToggleExpanded,
  onToggleDate,
  onEdit,
  onDelete,
}) {
  const formatMoney = (value) =>
    Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <section className="rounded-xl border border-gray-200 bg-gray-300 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-gray-700">
          <Receipt size={20} /> <h2>รายการ ({expenses.length})</h2>
        </div>
        <button onClick={onToggleExpanded} className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs text-gray-600 shadow-sm">
          {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />} {isExpanded ? "ย่อเก็บ" : "ดูเต็ม"}
        </button>
      </div>
      {loading ? (
        <p className="py-4 text-center text-gray-400">กำลังโหลด...</p>
      ) : expenses.length === 0 ? (
        <p className="py-4 text-center text-gray-400">ไม่มีรายการ</p>
      ) : (
        <div className={`space-y-4 pr-2 transition-all ${!isExpanded ? "max-h-96 overflow-y-auto" : ""}`}>
          {Object.keys(groupedExpenses).map((date) => (
            <div key={date} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <button onClick={() => onToggleDate(date)} className="flex w-full items-center justify-between border-b border-gray-100 bg-gray-50 p-3 hover:bg-gray-100">
                <div className="flex items-center gap-2 font-bold text-gray-700">
                  {collapsedDates[date] ? <FolderClosed size={16} className="text-blue-500" /> : <FolderOpen size={16} className="text-blue-500" />}
                  <span>{date}</span>
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-normal text-gray-400">{groupedExpenses[date].length} รายการ</span>
                </div>
                {collapsedDates[date] ? <ChevronRight size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
              </button>
              {!collapsedDates[date] && (
                <div className="divide-y divide-gray-100">
                  {groupedExpenses[date].map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-3 pl-8">
                      <div className="flex-1">
                        <p className="mb-0.5 text-xs text-gray-400">จ่ายโดย: <span className="font-bold text-blue-600">{expense.paid_by}</span></p>
                        <p className="font-medium text-gray-800">{expense.item_name}</p>
                        <p className="text-xs text-gray-500">{expense.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-red-600">฿{formatMoney(expense.amount)}</p>
                        <button onClick={() => onEdit(expense)} className="ml-2 text-gray-300 transition hover:text-yellow-500"><Edit2 size={16} /></button>
                        <button onClick={() => onDelete(expense.id)} className="text-gray-300 transition hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
