import { Edit2, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatMoney } from "../utils/trip";
import useSwipeDrag from "../hooks/useSwipeDrag";
import { dynaura } from "dynaura";

export default function ExpenseItem({
  expense,
  MEMBERS,
  swipedId,
  setSwipedId,
  onEdit,
  onDelete,
  onOpenSplitModal,
  isLast,
  isHighlighted,
  isPendingDelete,
  isPendingSplit,
  isOffline,
}) {
  const validSplit =
    expense.split_between?.filter((m) => MEMBERS.includes(m)) || [];
  const itemRef = useRef(null);
  const splitTriggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const [tooltipPos, setTooltipPos] = useState(null);

  const isOpen = swipedId === expense.id;
  const isPendingSync = expense.isPendingSync === true;
  const canInteract = !isOffline && !isPendingSync;
  const {
    drag,
    currentOffset,
    isSwiped,
    consumeSuppressedClick,
    touchHandlers,
    mouseHandlers,
  } = useSwipeDrag({
    id: expense.id,
    isOpen,
    setOpen: setSwipedId,
    canDrag: canInteract,
  });

  const createdTime = expense.created_at
    ? new Date(expense.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "";

  const warnOffline = () =>
    dynaura.warning({
      title: "ออฟไลน์",
      description: "ไม่สามารถแก้ไขหรือลบรายการขณะออฟไลน์ได้",
      duration: 4000,
    });

  useEffect(() => {
    if (isHighlighted && itemRef.current) {
      itemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [isHighlighted]);

  const splitList =
    validSplit.length > 0
      ? validSplit
      : MEMBERS.includes(expense.paid_by)
        ? [expense.paid_by]
        : [MEMBERS[0]].filter(Boolean);

  const calculateTooltipPosition = useCallback(() => {
    if (!splitTriggerRef.current) return null;
    const rect = splitTriggerRef.current.getBoundingClientRect();
    const tooltipWidth = 220;
    const placeAbove = rect.bottom + 130 > window.innerHeight;
    const left = Math.max(
      12,
      Math.min(rect.left - 8, window.innerWidth - tooltipWidth - 12),
    );
    const arrowLeft = Math.max(
      14,
      Math.min(rect.left + rect.width / 2 - left - 6, tooltipWidth - 26),
    );

    return {
      top: placeAbove ? rect.top - 8 : rect.bottom + 8,
      left,
      arrowLeft,
      placeAbove,
      width: tooltipWidth,
    };
  }, []);

  const handleToggleSplitTooltip = (e) => {
    e.stopPropagation();
    if (tooltipPos) {
      setTooltipPos(null);
      return;
    }
    setSwipedId(null);
    setTooltipPos(calculateTooltipPosition());
  };

  useEffect(() => {
    if (!tooltipPos) return;

    const handlePointerDown = (event) => {
      if (
        splitTriggerRef.current?.contains(event.target) ||
        tooltipRef.current?.contains(event.target)
      ) {
        return;
      }
      setTooltipPos(null);
    };

    const handleCloseOnMove = () => setTooltipPos(null);

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", handleCloseOnMove, true);
    window.addEventListener("resize", handleCloseOnMove);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", handleCloseOnMove, true);
      window.removeEventListener("resize", handleCloseOnMove);
    };
  }, [tooltipPos]);

  const isGas = expense.category === "ค่าน้ำมัน";
  const distance =
    isGas && expense.odometer_start && expense.odometer_end
      ? Number(expense.odometer_end) - Number(expense.odometer_start)
      : 0;

  return (
    <div
      ref={itemRef}
      className={`relative bg-gray-900 ${!isLast ? "border-b border-gray-800" : ""}`}
    >
      <div className="absolute inset-y-0 right-3 flex items-center justify-center">
        <button
          onClick={() => {
            if (!canInteract) {
              warnOffline();
              return;
            }
            onDelete(expense.id);
            setSwipedId(null);
          }}
          disabled={isPendingDelete || !canInteract}
          className={`flex h-11 w-11 items-center justify-center rounded-full text-white shadow-sm transition ${
            isPendingDelete || !canInteract
              ? "cursor-not-allowed bg-gray-500 shimmer"
              : "bg-red-500 hover:bg-red-600"
          }`}
          style={{
            opacity: Math.min(1, -currentOffset / 40),
            transform: `scale(${Math.min(1.2, 0.2 + (-currentOffset / 70) * 0.8)})`,
            transition: drag.active
              ? "none"
              : "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div
        className={`relative z-10 flex cursor-grab touch-pan-y items-center justify-between p-3 pl-8 transition-colors duration-700 active:cursor-grabbing ${
          isHighlighted
            ? "bg-yellow-200/30 shadow-[inset_4px_0_0_#c9c9af]"
            : "bg-gray-800"
        }`}
        style={{
          transform: `translate3d(${currentOffset}px, 0, 0)`,
          transition: drag.active
            ? "none"
            : "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.5s ease-out, box-shadow 0.5s ease-out, border-radius 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.1s",
          borderTopRightRadius: isSwiped ? "24px" : "0px",
          borderBottomRightRadius: isSwiped ? "24px" : "0px",
        }}
        {...touchHandlers}
        {...mouseHandlers}
        onClick={(e) => {
          if (consumeSuppressedClick()) {
            e.stopPropagation();
            return;
          }
          setSwipedId(null);
        }}
      >
        <div className="pointer-events-none flex-1">
          <p className="mb-0.5 text-xs text-gray-400">
            จ่ายโดย:{" "}
            <span className="font-bold text-lime-400">{expense.paid_by}</span>
            {createdTime && (
              <span className="ml-1 text-[11px] font-normal text-gray-400">
                {createdTime}
              </span>
            )}
            {isPendingSync && (
              <span className="ml-2 text-xs font-bold text-amber-400">
                รอซิงค์
              </span>
            )}
          </p>
          <p className="font-medium text-gray-100">{expense.item_name}</p>
          <p className="text-xs text-gray-400">
            {expense.category}{" "}
            {splitList.length > 0 && (
              <button
                ref={splitTriggerRef}
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={handleToggleSplitTooltip}
                className="pointer-events-auto inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium text-sky-400 underline decoration-sky-400/50 underline-offset-2 transition hover:bg-sky-400/15"
              >
                (หาร {splitList.length} คน)
              </button>
            )}
          </p>
          {distance > 0 && (
            <p className="mt-0.5 text-[11px] font-medium text-amber-400">
              ไมล์ {expense.odometer_start} - {expense.odometer_end} ({distance}{" "}
              กม.)
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <p className="pointer-events-none font-bold text-gray-100">
            ฿{formatMoney(expense.amount)}
          </p>
          <div className="relative z-20 flex items-center gap-2">
            <button
              disabled={isPendingSplit || !canInteract}
              onClick={(e) => {
                e.stopPropagation();
                if (!canInteract) {
                  warnOffline();
                  return;
                }
                setTooltipPos(null);
                onOpenSplitModal(expense);
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-full border text-gray-400 transition ${
                isPendingSplit || !canInteract
                  ? "cursor-not-allowed border-gray-500 bg-gray-500 shimmer"
                  : "border-gray-600 hover:border-sky-400 hover:bg-sky-400/10 hover:text-sky-400"
              }`}
              title="เลือกคนหาร"
              aria-label="เลือกคนหาร"
            >
              <Users size={19} />
            </button>
            <button
              disabled={!canInteract}
              onClick={(e) => {
                e.stopPropagation();
                if (!canInteract) {
                  warnOffline();
                  return;
                }
                setTooltipPos(null);
                onEdit(expense);
                setSwipedId(null);
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition ${
                !canInteract
                  ? "cursor-not-allowed opacity-40"
                  : "hover:bg-lime-400/10 hover:text-lime-400"
              }`}
              title="แก้ไขรายการ"
              aria-label="แก้ไขรายการ"
            >
              <Edit2 size={20} />
            </button>
          </div>
        </div>
      </div>

      {tooltipPos &&
        createPortal(
          <div
            ref={tooltipRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              top: `${tooltipPos.top}px`,
              left: `${tooltipPos.left}px`,
              width: `${tooltipPos.width}px`,
              transform: tooltipPos.placeAbove
                ? "translateY(-100%)"
                : "translateY(0)",
            }}
            className="fixed z-50 rounded-xl border border-gray-700 bg-gray-900 p-3 text-xs text-gray-100 shadow-2xl"
          >
            {/* ลูกศรชี้ไปยังปุ่ม (หาร X คน) */}
            <div
              style={{ left: `${tooltipPos.arrowLeft}px` }}
              className={`absolute h-3 w-3 rotate-45 border-gray-700 bg-gray-900 ${
                tooltipPos.placeAbove
                  ? "-bottom-1.5 border-b border-r"
                  : "-top-1.5 border-l border-t"
              }`}
            />
            <p className="mb-1.5 text-[11px] font-bold text-lime-400">
              ผู้ร่วมหาร ({splitList.length} คน)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {splitList.map((member) => (
                <span
                  key={member}
                  className="rounded-md border border-gray-700 bg-gray-800 px-2 py-0.5 text-[11px] font-medium text-gray-100"
                >
                  {member}
                </span>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
