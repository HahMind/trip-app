import { CheckCircle2, Edit2, Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  onUpdateSplit,
  isLast,
  isHighlighted,
  isPendingDelete,
  isPendingSplit,
  isOffline,
  isUnsettled,
  isSettled,
}) {
  const validSplit = useMemo(
    () => expense.split_between?.filter((m) => MEMBERS.includes(m)) || [],
    [expense.split_between, MEMBERS],
  );

  const baseSplitList = useMemo(
    () =>
      validSplit.length > 0
        ? validSplit
        : MEMBERS.includes(expense.paid_by)
          ? [expense.paid_by]
          : [MEMBERS[0]].filter(Boolean),
    [validSplit, MEMBERS, expense.paid_by],
  );

  const [optimisticSplit, setOptimisticSplit] = useState(null);
  const activeSplitList = optimisticSplit ?? baseSplitList;

  useEffect(() => {
    if (!isPendingSplit) {
      setOptimisticSplit(null);
    }
  }, [baseSplitList, isPendingSplit]);

  const itemRef = useRef(null);
  const splitTriggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const settledTriggerRef = useRef(null);
  const settledTooltipRef = useRef(null);

  const pillRefs = useRef(new Map());
  const prevRectsRef = useRef(null);

  const [tooltipPos, setTooltipPos] = useState(null);
  const [settledTooltipPos, setSettledTooltipPos] = useState(null);

  const isOpen = swipedId === expense.id && !isSettled;
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
    canDrag: canInteract && !isSettled,
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

  // จัดเรียงรายชื่อสมาชิก: คนที่ถูกเลือกหารย้ายมาอยู่ด้านหน้าเสมอ (เรียงตามลำดับเดิมใน MEMBERS) และคนที่ไม่ได้เลือกต่อท้าย
  const orderedMembers = useMemo(() => {
    const selectedSet = new Set(activeSplitList);
    const selected = MEMBERS.filter((member) => selectedSet.has(member));
    const unselected = MEMBERS.filter((member) => !selectedSet.has(member));
    return [...selected, ...unselected];
  }, [MEMBERS, activeSplitList]);

  // FLIP Animation เมื่อลำดับป้ายชื่อใน Tooltip เปลี่ยน
  useLayoutEffect(() => {
    if (!tooltipPos || !prevRectsRef.current) return;
    const prevRects = prevRectsRef.current;
    prevRectsRef.current = null;

    orderedMembers.forEach((member) => {
      const el = pillRefs.current.get(member);
      const prevRect = prevRects.get(member);
      if (!el || !prevRect) return;

      const newRect = el.getBoundingClientRect();
      const deltaX = prevRect.left - newRect.left;
      const deltaY = prevRect.top - newRect.top;

      if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
        el.style.transition = "none";
        el.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!el) return;
            el.style.transition =
              "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)";
            el.style.transform = "translate3d(0, 0, 0)";
          });
        });
      }
    });
  }, [orderedMembers, tooltipPos]);

  const calculateTooltipPosition = useCallback((triggerEl, tooltipWidth) => {
    if (!triggerEl) return null;
    const rect = triggerEl.getBoundingClientRect();
    const placeAbove = rect.bottom + 145 > window.innerHeight;
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
    setSettledTooltipPos(null);
    setTooltipPos(calculateTooltipPosition(splitTriggerRef.current, 232));
  };

  const handleToggleSettledTooltip = (e) => {
    e.stopPropagation();
    if (settledTooltipPos) {
      setSettledTooltipPos(null);
      return;
    }
    setSwipedId(null);
    setTooltipPos(null);
    setSettledTooltipPos(
      calculateTooltipPosition(settledTriggerRef.current, 224),
    );
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

  useEffect(() => {
    if (!settledTooltipPos) return;

    const handlePointerDown = (event) => {
      if (
        settledTriggerRef.current?.contains(event.target) ||
        settledTooltipRef.current?.contains(event.target)
      ) {
        return;
      }
      setSettledTooltipPos(null);
    };

    const handleCloseOnMove = () => setSettledTooltipPos(null);

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", handleCloseOnMove, true);
    window.addEventListener("resize", handleCloseOnMove);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", handleCloseOnMove, true);
      window.removeEventListener("resize", handleCloseOnMove);
    };
  }, [settledTooltipPos]);

  const handleToggleMemberInTooltip = async (member) => {
    if (isSettled) return;
    if (!canInteract) {
      warnOffline();
      return;
    }
    if (isPendingSplit) return;

    const isSelected = activeSplitList.includes(member);
    if (isSelected && activeSplitList.length <= 1) {
      dynaura.warning({
        title: "ต้องมีคนหารอย่างน้อย 1 คน",
        description: "ไม่สามารถยกเลิกคนหารทั้งหมดได้",
        duration: 3000,
      });
      return;
    }

    // First: เก็บตำแหน่งปัจจุบันของป้ายชื่อทุกตัวก่อนสลับลำดับ
    const currentRects = new Map();
    orderedMembers.forEach((m) => {
      const el = pillRefs.current.get(m);
      if (el) {
        currentRects.set(m, el.getBoundingClientRect());
      }
    });
    prevRectsRef.current = currentRects;

    const nextRaw = isSelected
      ? activeSplitList.filter((m) => m !== member)
      : [...activeSplitList, member];
    const nextSplit = MEMBERS.filter((m) => nextRaw.includes(m));

    setOptimisticSplit(nextSplit);

    if (onUpdateSplit) {
      const ok = await onUpdateSplit(expense.id, nextSplit);
      if (!ok) {
        setOptimisticSplit(null);
      }
    }
  };

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
      {!isSettled && (
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
      )}

      <div
        className={`relative z-10 flex touch-pan-y items-center justify-between p-3 pl-8 transition-colors duration-700 ${
          canInteract && !isSettled
            ? "cursor-grab active:cursor-grabbing"
            : "cursor-default"
        } ${
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
        <div className="pointer-events-none flex-1 pr-2">
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
          <p className="flex items-center font-medium text-gray-100">
            {isUnsettled && (
              <span
                className="unsettled-dot mr-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
                title="ยังไม่เคลียร์ยอด"
                aria-label="ยังไม่เคลียร์ยอด"
              />
            )}
            <span>{expense.item_name}</span>
          </p>
          <p className="text-xs text-gray-400">
            {expense.category}{" "}
            {activeSplitList.length > 0 && (
              <button
                ref={splitTriggerRef}
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={handleToggleSplitTooltip}
                className="pointer-events-auto inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium text-sky-400 underline decoration-sky-400/50 underline-offset-2 transition hover:bg-sky-400/15"
              >
                (หาร {activeSplitList.length} คน)
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
          <div className="relative z-20 flex items-center">
            {isSettled ? (
              <button
                ref={settledTriggerRef}
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={handleToggleSettledTooltip}
                className="flex h-10 w-10 items-center justify-center rounded-full text-emerald-500 transition hover:bg-emerald-500/10"
                title="เคลียร์ยอดแล้ว"
                aria-label="เคลียร์ยอดแล้ว"
              >
                <CheckCircle2 size={20} />
              </button>
            ) : (
              <button
                type="button"
                disabled={!canInteract}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!canInteract) {
                    warnOffline();
                    return;
                  }
                  setTooltipPos(null);
                  setSettledTooltipPos(null);
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
            )}
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
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-bold text-lime-400">
                ผู้ร่วมหาร ({activeSplitList.length}/{MEMBERS.length} คน)
              </p>
              {isSettled ? (
                <span className="text-[10px] font-medium text-gray-400">
                  ล็อกแล้ว
                </span>
              ) : (
                <span className="text-[10px] text-gray-400">แตะเพื่อเลือก</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {orderedMembers.map((member) => {
                const isSelected = activeSplitList.includes(member);
                const isDisabled = isSettled || !canInteract || isPendingSplit;
                return (
                  <button
                    key={member}
                    ref={(el) => {
                      if (el) pillRefs.current.set(member, el);
                      else pillRefs.current.delete(member);
                    }}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleToggleMemberInTooltip(member)}
                    className={`split-pill rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                      isSelected ? "split-pill-active" : "split-pill-inactive"
                    } ${
                      isDisabled
                        ? "cursor-not-allowed"
                        : "cursor-pointer active:scale-95"
                    }`}
                  >
                    {member}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}

      {settledTooltipPos &&
        createPortal(
          <div
            ref={settledTooltipRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              top: `${settledTooltipPos.top}px`,
              left: `${settledTooltipPos.left}px`,
              width: `${settledTooltipPos.width}px`,
              transform: settledTooltipPos.placeAbove
                ? "translateY(-100%)"
                : "translateY(0)",
            }}
            className="fixed z-50 rounded-xl border border-gray-700 bg-gray-900 p-3 text-xs text-gray-100 shadow-2xl"
          >
            <div
              style={{ left: `${settledTooltipPos.arrowLeft}px` }}
              className={`absolute h-3 w-3 rotate-45 border-gray-700 bg-gray-900 ${
                settledTooltipPos.placeAbove
                  ? "-bottom-1.5 border-b border-r"
                  : "-top-1.5 border-l border-t"
              }`}
            />
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-500">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>เคลียร์ยอดแล้ว</span>
            </p>
            <p className="mt-1 text-[11px] text-gray-400">
              ไม่สามารถแก้ไขหรือลบรายการที่เคลียร์ยอดแล้วได้
            </p>
          </div>,
          document.body,
        )}
    </div>
  );
}
