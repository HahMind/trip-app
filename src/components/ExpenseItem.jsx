import { Edit2, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatMoney } from "../utils/trip";

export default function ExpenseItem({
  expense,
  MEMBERS,
  swipedId,
  setSwipedId,
  onEdit,
  onDelete,
  onOpenSplitModal,
  isLast,
  isHighlighted, //  รับ State การ Highlight
}) {
  const [drag, setDrag] = useState({
    active: false,
    startX: 0,
    startY: 0,
    offset: 0,
    scrolling: false,
  });
  const validSplit = expense.split_between?.filter(m => MEMBERS.includes(m)) || [];

  const isMouse = useRef(false);
  const itemRef = useRef(null); //  Ref สำหรับเลื่อนหน้าจอ

  //  สั่ง Auto-scroll มาที่ Item นี้เมื่อโดน Highlight
  useEffect(() => {
    if (isHighlighted && itemRef.current) {
      itemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center", // ให้กล่องรายการอยู่ตรงกลางจอพอดี
      });
    }
  }, [isHighlighted]);

  const splitList = validSplit.length > 0 
  ? validSplit
  : (MEMBERS.includes(expense.paid_by) ? [expense.paid_by] : [MEMBERS[0]]); // ถ้าไม่มีใครอยู่ใน split_between ให้ใช้ paid_by หรือสมาชิกคนแรกแทน
  const isGas = expense.category === "ค่าน้ำมัน";
  const distance =
    isGas && expense.odometer_start && expense.odometer_end
      ? Number(expense.odometer_end) - Number(expense.odometer_start)
      : 0;

  const isOpen = swipedId === expense.id;
  let currentOffset = isOpen ? -70 : 0;
  if (drag.active) {
    currentOffset = (isOpen ? -70 : 0) + drag.offset;
    if (currentOffset > 0) currentOffset = 0;
    if (currentOffset < -90) currentOffset = -90;
  }
  const isSwiped = currentOffset < -5;

  const startDrag = (clientX, clientY) => {
    setDrag({
      active: true,
      startX: clientX,
      startY: clientY,
      offset: 0,
      scrolling: false,
    });
    if (swipedId !== expense.id) setSwipedId(null);
  };
  const moveDrag = (clientX, clientY) => {
    if (!drag.active) return;
    const diffX = clientX - drag.startX,
      diffY = Math.abs(clientY - drag.startY);
    if (!drag.scrolling && diffY > 15 && Math.abs(diffX) < 15)
      setDrag((prev) => ({ ...prev, scrolling: true }));
    if (drag.scrolling) return;
    setDrag((prev) => ({ ...prev, offset: diffX }));
  };
  const endDrag = () => {
    if (!drag.active) return;
    if (!drag.scrolling) {
      if (currentOffset < -35) setSwipedId(expense.id);
      else setSwipedId(null);
    }
    setDrag({
      active: false,
      startX: 0,
      startY: 0,
      offset: 0,
      scrolling: false,
    });
  };

  return (
    <div
      ref={itemRef} //  ผูก Ref เพื่อดึงหน้าจอ
      className={`relative bg-gray-900 ${!isLast ? "border-b border-gray-800" : ""}`}
    >
      <div className="absolute inset-y-0 right-3 flex items-center justify-center">
        <button
          onClick={() => {
            onDelete(expense.id);
            setSwipedId(null);
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition hover:bg-red-600"
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
        //  สลับ Class การสว่าง (Highlight สีเหลือง) หาก isHighlighted เป็น true
        className={`relative z-10 flex cursor-grab touch-pan-y items-center justify-between p-3 pl-8 active:cursor-grabbing transition-colors duration-700 ${
          isHighlighted ? "bg-yellow-200/30 shadow-[inset_4px_0_0_#c9c9af]" : "bg-gray-800"
        }`}
        style={{
          transform: `translate3d(${currentOffset}px, 0, 0)`,
          transition: drag.active
            ? "none"
            : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.5s ease-out, box-shadow 0.5s ease-out",
          borderTopRightRadius: isSwiped ? "24px" : "0px",
          borderBottomRightRadius: isSwiped ? "24px" : "0px",
        }}
        onTouchStart={(e) =>
          startDrag(e.targetTouches[0].clientX, e.targetTouches[0].clientY)
        }
        onTouchMove={(e) =>
          moveDrag(e.targetTouches[0].clientX, e.targetTouches[0].clientY)
        }
        onTouchEnd={endDrag}
        onMouseDown={(e) => {
          isMouse.current = true;
          startDrag(e.clientX, e.clientY);
        }}
        onMouseMove={(e) => {
          if (isMouse.current) moveDrag(e.clientX, e.clientY);
        }}
        onMouseUp={() => {
          if (isMouse.current) {
            isMouse.current = false;
            endDrag();
          }
        }}
        onMouseLeave={() => {
          if (isMouse.current) {
            isMouse.current = false;
            endDrag();
          }
        }}
      >
        <div className="pointer-events-none flex-1">
          <p className="mb-0.5 text-xs text-gray-400">
            จ่ายโดย:{" "}
            <span className="font-bold text-lime-400">{expense.paid_by}</span>
          </p>
          <p className="font-medium text-gray-100">{expense.item_name}</p>
          <p className="text-xs text-gray-400">
            {expense.category}{" "}
            {splitList.length > 0 && (
              <span className="text-[10px] text-sky-400">
                {" "}
                (หาร {splitList.length} คน)
              </span>
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
          <div className="relative z-20 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenSplitModal(expense);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-600 text-gray-400 transition hover:border-sky-400 hover:text-sky-400"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(expense);
                setSwipedId(null);
              }}
              className="text-gray-400 transition hover:text-lime-400"
            >
              <Edit2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}