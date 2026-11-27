import {
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  FolderClosed,
  FolderOpen,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HISTORY_CATEGORY } from "../data/constants";
import { formatMoney } from "../utils/trip";
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
  onUpdateSplit,
  swipedId,
  setSwipedId,
  highlightedId,
  MEMBERS,
  pendingDeleteId,
  pendingSplitId,
  isOffline,
  unsettledExpenseIds,
  settledExpenseIds,
}) {
  const [isSectionOpen, setIsSectionOpen] = useState(true);
  const [dailyTooltip, setDailyTooltip] = useState(null);
  const activeDollarBtnRef = useRef(null);
  const dailyTooltipRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (swipedId) setSwipedId(null);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [swipedId, setSwipedId]);

  useEffect(() => {
    if (!dailyTooltip) return;

    const handlePointerDown = (event) => {
      if (
        activeDollarBtnRef.current?.contains(event.target) ||
        dailyTooltipRef.current?.contains(event.target)
      ) {
        return;
      }
      setDailyTooltip(null);
    };

    const handleCloseOnMove = () => setDailyTooltip(null);

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", handleCloseOnMove, true);
    window.addEventListener("resize", handleCloseOnMove);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", handleCloseOnMove, true);
      window.removeEventListener("resize", handleCloseOnMove);
    };
  }, [dailyTooltip]);

  const handleToggleSection = () => {
    setSwipedId(null);
    setDailyTooltip(null);
    setIsSectionOpen((prev) => !prev);
  };

  const handleToggleDailyTooltip = useCallback(
    (event, date) => {
      event.stopPropagation();
      if (dailyTooltip?.date === date) {
        setDailyTooltip(null);
        return;
      }

      setSwipedId(null);
      const buttonEl = event.currentTarget;
      activeDollarBtnRef.current = buttonEl;
      const rect = buttonEl.getBoundingClientRect();
      const tooltipWidth = 210;
      const placeAbove = rect.bottom + 95 > window.innerHeight;
      const left = Math.max(
        12,
        Math.min(
          rect.left + rect.width / 2 - tooltipWidth / 2,
          window.innerWidth - tooltipWidth - 12,
        ),
      );
      const arrowLeft = Math.max(
        14,
        Math.min(rect.left + rect.width / 2 - left - 6, tooltipWidth - 26),
      );

      const itemsForDate = (groupedExpenses[date] || []).filter(
        (expense) => expense.category !== HISTORY_CATEGORY,
      );
      const dailyTotal = itemsForDate.reduce(
        (sum, expense) => sum + (Number(expense.amount) || 0),
        0,
      );

      setDailyTooltip({
        date,
        dailyTotal,
        itemCount: itemsForDate.length,
        top: placeAbove ? rect.top - 8 : rect.bottom + 8,
        left,
        arrowLeft,
        placeAbove,
        width: tooltipWidth,
      });
    },
    [dailyTooltip, groupedExpenses, setSwipedId],
  );

  return (
    <section
      className="relative rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-sm"
      onClick={() => {
        setSwipedId(null);
        setDailyTooltip(null);
      }}
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
              setDailyTooltip(null);
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
              onScroll={() => {
                if (dailyTooltip) setDailyTooltip(null);
              }}
              className={`space-y-4 pr-2 transition-all ${!isExpanded ? "max-h-96 overflow-y-auto overscroll-none" : ""}`}
            >
              {Object.keys(groupedExpenses).map((date) => (
                <div
                  key={date}
                  className="overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-sm"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setDailyTooltip(null);
                      onToggleDate(date);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setDailyTooltip(null);
                        onToggleDate(date);
                      }
                    }}
                    className="expense-date-header relative z-20 flex w-full cursor-pointer items-center justify-between border-b-2 border-gray-700 bg-[#374151] p-3 hover:bg-[#374151]"
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
                      <button
                        type="button"
                        onMouseDown={(event) => event.stopPropagation()}
                        onTouchStart={(event) => event.stopPropagation()}
                        onClick={(event) => handleToggleDailyTooltip(event, date)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-transparent text-lime-400 transition hover:bg-lime-400/15 active:scale-95"
                        title={`ดูยอดรวมวันที่ ${date}`}
                        aria-label={`ดูยอดรวมวันที่ ${date}`}
                      >
                        <CircleDollarSign size={20} />
                      </button>
                    </div>
                    {collapsedDates[date] ? (
                      <ChevronRight size={18} className="text-lime-400" />
                    ) : (
                      <ChevronDown size={18} className="text-lime-400" />
                    )}
                  </div>
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
                          onUpdateSplit={onUpdateSplit}
                          isLast={index === groupedExpenses[date].length - 1}
                          isHighlighted={highlightedId === expense.id}
                          MEMBERS={MEMBERS}
                          isPendingDelete={pendingDeleteId === expense.id}
                          isPendingSplit={pendingSplitId === expense.id}
                          isOffline={isOffline}
                          isUnsettled={Boolean(
                            unsettledExpenseIds?.has(expense.id),
                          )}
                          isSettled={Boolean(
                            settledExpenseIds?.has(expense.id),
                          )}
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

      {dailyTooltip &&
        createPortal(
          <div
            ref={dailyTooltipRef}
            onClick={(event) => event.stopPropagation()}
            style={{
              top: `${dailyTooltip.top}px`,
              left: `${dailyTooltip.left}px`,
              width: `${dailyTooltip.width}px`,
              transform: dailyTooltip.placeAbove
                ? "translateY(-100%)"
                : "translateY(0)",
            }}
            className="fixed z-50 rounded-xl border border-gray-700 bg-gray-900 p-3 text-xs text-gray-100 shadow-2xl"
          >
            <div
              style={{ left: `${dailyTooltip.arrowLeft}px` }}
              className={`absolute h-3 w-3 rotate-45 border-gray-700 bg-gray-900 ${
                dailyTooltip.placeAbove
                  ? "-bottom-1.5 border-b border-r"
                  : "-top-1.5 border-l border-t"
              }`}
            />
            <p className="text-[11px] font-medium text-gray-400">
              ยอดรวมวันที่ {dailyTooltip.date}
            </p>
            <p className="mt-1 text-base font-bold tabular-nums text-lime-400">
              ฿{formatMoney(dailyTooltip.dailyTotal)}
            </p>
            <p className="mt-0.5 text-[10px] text-gray-400">
              จากทั้งหมด {dailyTooltip.itemCount} รายการ
            </p>
          </div>,
          document.body,
        )}
    </section>
  );
}
