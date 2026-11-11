import { ChevronDown, ChevronRight, FolderClosed, FolderOpen, Maximize2, Minimize2, Receipt } from "lucide-react";
import { useEffect } from "react";
import ExpenseItem from "./ExpenseItem";

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
  onOpenSplitModal,
  swipedId,
  setSwipedId,
  highlightedId, 
  MEMBERS,
}) {
  useEffect(() => {
    const handleScroll = () => {
      if (swipedId) setSwipedId(null);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [swipedId, setSwipedId]);

  return (
    <section className="relative rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-gray-100">
          <Receipt size={20} /> <h2>รายการ ({expenses.length})</h2>
        </div>
        <button
          onClick={onToggleExpanded}
          className="flex items-center gap-1 rounded-full bg-gray-800 px-3 py-1.5 text-xs text-gray-300 shadow-sm"
        >
          {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}{" "}
          {isExpanded ? "ย่อเก็บ" : "ดูเต็ม"}
        </button>
      </div>

      {loading ? (
        <p className="py-4 text-center text-gray-400">กำลังโหลด...</p>
      ) : expenses.length === 0 ? (
        <p className="py-4 text-center text-gray-400">ไม่มีรายการ</p>
      ) : (
        <div
          className={`space-y-4 pr-2 transition-all ${!isExpanded ? "max-h-96 overflow-y-auto overscroll-none" : ""}`}
        >
          {Object.keys(groupedExpenses).map((date) => (
            <div
              key={date}
              className="overflow-hidden rounded-lg border border-gray-700 bg-gray-900 shadow-sm"
            >
              <button
                onClick={() => onToggleDate(date)}
                className="relative z-20 flex w-full items-center justify-between rounded-t-lg border-b-2 border-gray-700 bg-gray-700 p-3 hover:bg-gray-600"
              >
                <div className="flex items-center gap-2 font-bold text-gray-100">
                  {collapsedDates[date] ? (
                    <FolderClosed size={16} className="text-lime-400" />
                  ) : (
                    <FolderOpen size={16} className="text-lime-400" />
                  )}
                  <span>{date}</span>
                  <span className="rounded-full bg-gray-600 px-2 py-0.5 text-xs font-normal text-gray-300">
                    {groupedExpenses[date].length}
                  </span>
                </div>
                {collapsedDates[date] ? (
                  <ChevronRight size={18} className="text-lime-400" />
                ) : (
                  <ChevronDown size={18} className="text-lime-400" />
                )}
              </button>
              <div
                className={`grid transition-all duration-300 ease-in-out ${collapsedDates[date] ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"}`}
              >
                <div className="overflow-hidden bg-gray-900">
                  {groupedExpenses[date].map((expense, index) => (
                    <ExpenseItem
                      key={expense.id}
                      expense={expense}
                      swipedId={swipedId}
                      setSwipedId={setSwipedId}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onOpenSplitModal={onOpenSplitModal}
                      isLast={index === groupedExpenses[date].length - 1}
                      isHighlighted={highlightedId === expense.id} // 🧠 ส่ง isHighlighted เข้าไป
                      MEMBERS={MEMBERS}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}