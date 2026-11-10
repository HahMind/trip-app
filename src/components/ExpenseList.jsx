import {
  ChevronDown,
  ChevronRight,
  Edit2,
  FolderClosed,
  FolderOpen,
  Maximize2,
  Minimize2,
  Receipt,
  Trash2,
} from "lucide-react";
import { useState, useRef } from "react";

// 🧠 Component ย่อยสำหรับแต่ละรายการ
function ExpenseItem({
  expense,
  swipedId,
  setSwipedId,
  onEdit,
  onDelete,
  formatMoney,
  isLast,
}) {
  const [drag, setDrag] = useState({
    active: false,
    startX: 0,
    startY: 0,
    offset: 0,
    scrolling: false,
  });
  const isMouse = useRef(false);

  const isOpen = swipedId === expense.id;

  // 🧠 ปรับระยะดึงให้พอดีกับปุ่มวงกลม (ปุ่มวงกลมใช้พื้นที่ประมาณ 60px)
  let currentOffset = isOpen ? -70 : 0;
  if (drag.active) {
    currentOffset = (isOpen ? -70 : 0) + drag.offset;
    if (currentOffset > 0) currentOffset = 0;
    if (currentOffset < -90) currentOffset = -90; // ยืดสุดได้แค่ -90px
  }

  // เช็คว่าเริ่มโดนลากเกิน 5px หรือยัง เพื่อเปลี่ยนขอบการ์ดให้โค้งมน
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
    const diffX = clientX - drag.startX;
    const diffY = Math.abs(clientY - drag.startY);

    if (!drag.scrolling && diffY > 15 && Math.abs(diffX) < 15) {
      setDrag((prev) => ({ ...prev, scrolling: true }));
    }
    if (drag.scrolling) return;
    setDrag((prev) => ({ ...prev, offset: diffX }));
  };

  const endDrag = () => {
    if (!drag.active) return;
    if (!drag.scrolling) {
      // 🧠 ถ้าดึงเกิน -35 ให้ถือว่าเปิด
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
    // เปลี่ยนพื้นหลังหลักเป็นสีเดียวกับฉากหลัง เพื่อให้ปุ่มวงกลมดูลอยเด่นขึ้นมา
    <div
      className={`relative bg-gray-900 ${!isLast ? "border-b border-gray-800" : ""}`}
    >
      {/* 🗑️ กล่องปุ่ม Delete "วงกลม" สีแดง ลอยอยู่ขวาสุด */}
      <div className="absolute inset-y-0 right-3 flex items-center justify-center">
        <button
          onClick={() => {
            onDelete(expense.id);
            setSwipedId(null);
          }}
          // 🧠 กำหนดให้ปุ่มเป็นวงกลม (h-11 w-11 rounded-full)
          className="flex h-13 w-13 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition hover:bg-red-600"
          style={{
            // ถ้ายังดึงไม่ถึงระยะ ให้ซ่อนปุ่มไว้ก่อน (opacity) และให้มันค่อยๆ ขยายตัวโผล่มา (scale)
            opacity: currentOffset < -20 ? 1 : 0,
            transform: `scale(${currentOffset < -40 ? 1 : 0.5})`,
            transition: drag.active ? "none" : "all 0.25s ease-out",
          }}
        >
          <Trash2 size={25} />
        </button>
      </div>

      {/* 📱 เลเยอร์การ์ดสีเทาหลัก */}
      <div
        className="relative z-10 flex cursor-grab touch-pan-y items-center justify-between bg-gray-800 p-3 pl-8 active:cursor-grabbing"
        style={{
          transform: `translate3d(${currentOffset}px, 0, 0)`,
          transition: drag.active ? "none" : "all 0.25s ease-out",
          //  สั่งให้ขอบขวา "โค้งมน (Rounded)" เมื่อเริ่มโดนลาก
          borderTopRightRadius: isSwiped ? "9999px" : "0px",
          borderBottomRightRadius: isSwiped ? "9999px" : "0px",
        }}
        // Touch
        onTouchStart={(e) =>
          startDrag(e.targetTouches[0].clientX, e.targetTouches[0].clientY)
        }
        onTouchMove={(e) =>
          moveDrag(e.targetTouches[0].clientX, e.targetTouches[0].clientY)
        }
        onTouchEnd={endDrag}
        // Mouse
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
        <div className="flex-1 pointer-events-none">
          <p className="mb-0.5 text-xs text-gray-400">
            จ่ายโดย:{" "}
            <span className="font-bold text-lime-400">{expense.paid_by}</span>
          </p>
          <p className="font-medium text-gray-100">{expense.item_name}</p>
          <p className="text-xs text-gray-400">{expense.category}</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="font-bold text-gray-100 pointer-events-none">
            ฿{formatMoney(expense.amount)}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(expense);
              setSwipedId(null);
            }}
            className="text-gray-400 transition hover:text-lime-400 z-20 relative"
          >
            <Edit2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// 🧠 Component หลัก
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
  const [swipedId, setSwipedId] = useState(null);

  const formatMoney = (value) =>
    Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <section className="rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-sm relative">
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
                className="flex w-full items-center justify-between rounded-t-lg border-b-2 border-gray-700 bg-gray-700 p-3 hover:bg-gray-600 relative z-20"
              >
                <div className="flex items-center gap-2 font-bold text-gray-100">
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

              {!collapsedDates[date] && (
                <div className="bg-gray-900">
                  {groupedExpenses[date].map((expense, index) => (
                    <ExpenseItem
                      key={expense.id}
                      expense={expense}
                      swipedId={swipedId}
                      setSwipedId={setSwipedId}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      formatMoney={formatMoney}
                      isLast={index === groupedExpenses[date].length - 1}
                    />
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
