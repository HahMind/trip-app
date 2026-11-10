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
import { useState, useRef, useEffect } from "react"; //  เพิ่ม useRef และ useEffect

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
  const [swipeState, setSwipeState] = useState({ id: null, startX: 0, startY: 0, offset: 0, isScrolling: false });
  const [swipedId, setSwipedId] = useState(null);
  
  // 🧠 เพิ่ม Ref สำหรับจำว่ากำลังคลิกเมาส์ค้างไว้หรือไม่
  const isDraggingMouse = useRef(false);

  // --- Touch Events (สำหรับมือถือ) ---
  const handleTouchStart = (e, id) => {
    setSwipeState({
      id,
      startX: e.targetTouches[0].clientX,
      startY: e.targetTouches[0].clientY,
      offset: swipedId === id ? -90 : 0,
      isScrolling: false
    });
  };

  const handleTouchMove = (e, id) => {
    if (swipeState.id !== id) return;
    const currentX = e.targetTouches[0].clientX;
    const currentY = e.targetTouches[0].clientY;
    const diffX = currentX - swipeState.startX;
    const diffY = Math.abs(currentY - swipeState.startY);

    if (!swipeState.isScrolling && diffY > 15 && Math.abs(diffX) < 15) {
      setSwipeState(prev => ({ ...prev, isScrolling: true }));
    }
    if (swipeState.isScrolling) return;

    let newOffset = (swipedId === id ? -90 : 0) + diffX;
    if (newOffset > 0) newOffset = 0;
    if (newOffset < -110) newOffset = -110;

    setSwipeState(prev => ({ ...prev, offset: newOffset }));
  };

  const handleTouchEnd = (e, id) => {
    if (swipeState.id !== id) return;
    if (!swipeState.isScrolling) {
       if (swipeState.offset < -45) setSwipedId(id);
       else setSwipedId(null);
    }
    setSwipeState({ id: null, startX: 0, startY: 0, offset: 0, isScrolling: false });
  };

  // --- Mouse Events (สำหรับเล่นบนเว็บ) ---
  const handleMouseDown = (e, id) => {
    isDraggingMouse.current = true;
    setSwipeState({
      id,
      startX: e.clientX,
      startY: e.clientY,
      offset: swipedId === id ? -90 : 0,
      isScrolling: false
    });
  };

  const handleMouseMove = (e, id) => {
    if (!isDraggingMouse.current || swipeState.id !== id) return;
    
    const currentX = e.clientX;
    const diffX = currentX - swipeState.startX;

    let newOffset = (swipedId === id ? -90 : 0) + diffX;
    if (newOffset > 0) newOffset = 0;
    if (newOffset < -110) newOffset = -110;

    setSwipeState(prev => ({ ...prev, offset: newOffset }));
  };

  const handleMouseUp = (e, id) => {
    if (!isDraggingMouse.current || swipeState.id !== id) return;
    isDraggingMouse.current = false;
    
    if (swipeState.offset < -45) setSwipedId(id);
    else setSwipedId(null);
    
    setSwipeState({ id: null, startX: 0, startY: 0, offset: 0, isScrolling: false });
  };
  
  // 🧠 กรณีเมาส์หลุดออกจากกล่อง ให้ยกเลิกการลาก
  const handleMouseLeave = (e, id) => {
    if (isDraggingMouse.current && swipeState.id === id) {
      handleMouseUp(e, id);
    }
  };

  const formatMoney = (value) =>
    Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <section className="rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-sm relative">
      
      {/* 💧 ย้าย SVG ไปไว้ในจุดที่ไม่รบกวน Layout */}
      <svg style={{ visibility: "hidden", position: "absolute", width: 0, height: 0 }}>
        <defs>
          <filter id="gooey">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="gooey" />
            <feBlend in="SourceGraphic" in2="gooey" />
          </filter>
        </defs>
      </svg>

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
        <div className={`space-y-4 pr-2 transition-all ${!isExpanded ? "max-h-96 overflow-y-auto overscroll-none" : ""}`}>
          {Object.keys(groupedExpenses).map((date) => (
            <div key={date} className="overflow-hidden rounded-lg border border-gray-700 bg-gray-900 shadow-sm">
              <button
                onClick={() => onToggleDate(date)}
                className="flex w-full items-center justify-between rounded-t-lg border-b-2 border-gray-700 bg-gray-700 p-3 hover:bg-gray-600 relative z-20"
              >
                <div className="flex items-center gap-2 font-bold text-gray-100">
                  {collapsedDates[date] ? <FolderClosed size={16} className="text-lime-400" /> : <FolderOpen size={16} className="text-lime-400" />}
                  <span>{date}</span>
                  <span className="rounded-full bg-gray-600 px-2 py-0.5 text-xs font-normal text-gray-300">
                    {groupedExpenses[date].length} รายการ
                  </span>
                </div>
                {collapsedDates[date] ? <ChevronRight size={18} className="text-lime-400" /> : <ChevronDown size={18} className="text-lime-400" />}
              </button>

              {!collapsedDates[date] && (
                <div className="bg-gray-900">
                  {groupedExpenses[date].map((expense, index) => {
                    const isDragging = swipeState.id === expense.id;
                    const currentOffset = isDragging ? swipeState.offset : (swipedId === expense.id ? -90 : 0);
                    const isSwiped = currentOffset < -10;

                    return (
                      <div
                        key={expense.id}
                        className={`relative bg-gray-900 overflow-hidden ${
                          index !== groupedExpenses[date].length - 1 ? "border-b border-gray-800" : ""
                        }`}
                      >
                        {/* 💧 ชั้นของเหลว (Gooey Layer) */}
                        {/* 🧠 บั๊กเส้นแดงแก้ด้วย opacity ให้โชว์สีแดงเฉพาะตอนดึงเท่านั้น */}
                        <div
                          className="absolute inset-y-0 right-0 w-32 z-0"
                          style={{ 
                            filter: "url(#gooey)",
                            opacity: isSwiped ? 1 : 0, // ซ่อนมิดเมื่อไม่ได้ลาก ตัดปัญหาเส้นโผล่
                            transition: isDragging ? "none" : "opacity 0.2s"
                          }}
                        >
                          <div className="absolute right-3 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full bg-red-500" />
                          <div
                            className="absolute bottom-0 right-[-20px] top-0 w-12 bg-red-500"
                            style={{
                              transform: `translateX(${currentOffset}px)`,
                              transition: isDragging ? "none" : "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                            }}
                          />
                        </div>

                        {/* 🗑️ ปุ่มถังขยะ */}
                        <button
                          onClick={() => {
                            onDelete(expense.id);
                            setSwipedId(null);
                          }}
                          className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-white z-10"
                          style={{
                            opacity: currentOffset < -50 ? 1 : 0,
                            transform: `translateY(-50%) scale(${currentOffset < -60 ? 1 : 0.5})`,
                            transition: isDragging ? "none" : "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                            pointerEvents: currentOffset < -50 ? "auto" : "none" // กันกดโดนปุ่มตอนที่มันยังไม่โชว์
                          }}
                        >
                          <Trash2 size={18} />
                        </button>

                        {/* 📱 ตัวการ์ดรายการ (รองรับทั้งนิ้วและเมาส์) */}
                        <div
                          className={`relative z-20 flex items-center justify-between bg-gray-800 p-3 pl-8 cursor-grab active:cursor-grabbing`}
                          style={{
                            transform: `translateX(${currentOffset}px)`,
                            transition: isDragging ? "none" : "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                            borderRadius: isSwiped ? "16px" : "0px",
                          }}
                          // สำหรับมือถือ
                          onTouchStart={(e) => handleTouchStart(e, expense.id)}
                          onTouchMove={(e) => handleTouchMove(e, expense.id)}
                          onTouchEnd={(e) => handleTouchEnd(e, expense.id)}
                          // สำหรับเมาส์บนเว็บ
                          onMouseDown={(e) => handleMouseDown(e, expense.id)}
                          onMouseMove={(e) => handleMouseMove(e, expense.id)}
                          onMouseUp={(e) => handleMouseUp(e, expense.id)}
                          onMouseLeave={(e) => handleMouseLeave(e, expense.id)}
                        >
                          <div className="flex-1 pointer-events-none"> {/* กันคลิกโดน text แล้วลากไม่ไป */}
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
                                e.stopPropagation(); // กันการลากทำงานซ้อนตอนกดแก้ไข
                                onEdit(expense);
                                setSwipedId(null);
                              }}
                              className="text-gray-400 transition hover:text-lime-400 z-30 relative"
                            >
                              <Edit2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}