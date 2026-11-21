import { Edit2, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { formatMoney } from "../utils/trip";
import useSwipeDrag from "../hooks/useSwipeDrag";

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
  const validSplit = expense.split_between?.filter(m => MEMBERS.includes(m)) || [];
  const itemRef = useRef(null); //  Ref สำหรับเลื่อนหน้าจอ
  const isOpen = swipedId === expense.id;
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
  });

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
        <div className="flex items-center gap-4">
          <p className="pointer-events-none font-bold text-gray-100">
            ฿{formatMoney(expense.amount)}
          </p>
          <div className="relative z-20 flex gap-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenSplitModal(expense);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-600 text-gray-400 transition hover:border-sky-400 hover:text-sky-400"
            >
              <Plus size={20} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(expense);
                setSwipedId(null);
              }}
              className="text-gray-400 transition hover:text-lime-400"
            >
              <Edit2 size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}