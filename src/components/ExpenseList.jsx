import {
  ChevronDown,
  ChevronRight,
  FolderClosed,
  FolderOpen,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useEffect, useState } from "react";
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
  pendingDeleteId,
  pendingSplitId,
  isOffline,
}) {
  const [isSectionOpen, setIsSectionOpen] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      if (swipedId) setSwipedId(null);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [swipedId, setSwipedId]);

  const handleToggleSection = () => {
    setSwipedId(null);
    setIsSectionOpen((prev) => !prev);
  };

  return (
    <section
      className="relative rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-sm"
      onClick={() => setSwipedId(null)}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isSectionOpen}
        onClick={handleToggleSection}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleToggleSection();
          }
        }}
        className="flex cursor-pointer select-none items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 font-bold text-gray-300">
          <h2>รายการ ({expenses.length})</h2>
          <ChevronDown
            size={18}
            className={`text-gray-400 transition-transform duration-200 ${
              isSectionOpen ? "rotate-180" : ""
            }`}
          />
        </div>

        {isSectionOpen && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleExpanded();
            }}
            className="flex items-center gap-1 rounded-full bg-gray-800 px-3 py-1.5 text-xs text-gray-300 shadow-sm transition hover:bg-gray-700"
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}{" "}
            {isExpanded ? "ย่อเก็บ" : "ดูเต็ม"}
          </button>
        )}
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out ${
          isSectionOpen
            ? "mt-4 grid-rows-[1fr] opacity-100"
            : "mt-0 grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
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
                  className="overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => onToggleDate(date)}
                    className="expense-date-header relative z-20 flex w-full items-center justify-between border-b-2 border-gray-700 bg-[#374151] p-3 hover:bg-[#374151]"
                  >
                    <div className="flex items-center gap-2 font-bold text-gray-300">
                      {collapsedDates[date] ? (
                        <FolderClosed size={16} className="text-lime-400" />
                      ) : (
                        <FolderOpen size={16} className="text-lime-400" />
                      )}
                      <span>{date}</span>
                      <span className="rounded-full bg-gray-600 px-2 py-0.5 text-xs font-normal text-gray-300">
                        {groupedExpenses[date].length} รายการ
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
                          isHighlighted={highlightedId === expense.id}
                          MEMBERS={MEMBERS}
                          isPendingDelete={pendingDeleteId === expense.id}
                          isPendingSplit={pendingSplitId === expense.id}
                          isOffline={isOffline}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
