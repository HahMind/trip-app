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
import { useState } from "react";

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
  const [swipedExpenseId, setSwipedExpenseId] = useState(null);
  const [touchStartX, setTouchStartX] = useState(null);

  // เริ่มแตะหน้าจอ
  const handleTouchStart = (e, id) => {
    setTouchStartX(e.targetTouches[0].clientX);
    // ปิดอันอื่นที่เปิดอยู่ถ้าแตะอันใหม่
    if (swipedExpenseId !== id) {
      setSwipedExpenseId(null);
    }
  };

  // กำลังลากนิ้ว
  const handleTouchMove = (e, id) => {
    if (touchStartX === null) return;
    const currentX = e.targetTouches[0].clientX;
    const diff = touchStartX - currentX;

    // ลากไปทางซ้ายมากกว่า 40px ให้เปิดปุ่มลบ
    if (diff > 40) {
      setSwipedExpenseId(id);
    }
    // ลากกลับไปทางขวาให้ปิดปุ่มลบ
    else if (diff < -40) {
      setSwipedExpenseId(null);
    }
  };

  // ปล่อยนิ้ว
  const handleTouchEnd = () => {
    setTouchStartX(null);
  };

  const formatMoney = (value) =>
    Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <section className="rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-sm">
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
              className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800 shadow-sm"
            >
              <button
                onClick={() => onToggleDate(date)}
                className="flex w-full items-center justify-between rounded-lg border-2 border-gray-700 bg-gray-700 p-3 hover:bg-gray-600"
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
                <div className="divide-y divide-gray-700 overflow-hidden">
                  {groupedExpenses[date].map((expense) => (
                    <div
                      key={expense.id}
                      className="relative overflow-hidden bg-gray-800" // 🧠 1. ลบ bg-red-500 ออก แล้วเปลี่ยนเป็น bg-gray-800 ให้กลืนกับพื้นหลังปกติ
                    >
                      {/* ปุ่ม Delete ด้านหลัง (โผล่มาตอนปัด) */}
                      {/* 🧠 2. ย้าย bg-red-500 และกำหนดความกว้าง w-20 มาไว้ที่กรอบของปุ่มลบแทน */}
                      <div className="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-red-500">
                        <button
                          onClick={() => {
                            onDelete(expense.id);
                            setSwipedExpenseId(null);
                          }}
                          className="flex h-full w-full flex-col items-center justify-center text-white transition hover:bg-red-600"
                        >
                          <Trash2 size={20} className="mb-1" />
                          <span className="text-xs font-medium">Delete</span>
                        </button>
                      </div>

                      {/* กล่องเนื้อหารายการ (ตัวที่ขยับไปมา) */}
                      {/* 🧠 3. ลบ bg-gray-800 ตรงนี้ออก (เพราะเราไปใส่ที่ตัวคลุมด้านบนแล้ว) ป้องกันสีซ้อนทับกัน */}
                      <div
                        className={`flex items-center justify-between border-gray-800 p-3 pl-8 transition-transform duration-300 ease-in-out ${
                          swipedExpenseId === expense.id
                            ? "-translate-x-20"
                            : "translate-x-0"
                        }`}
                        onTouchStart={(e) => handleTouchStart(e, expense.id)}
                        onTouchMove={(e) => handleTouchMove(e, expense.id)}
                        onTouchEnd={handleTouchEnd}
                      >
                        <div className="flex-1">
                          <p className="mb-0.5 text-xs text-gray-400">
                            จ่ายโดย:{" "}
                            <span className="font-bold text-lime-400">
                              {expense.paid_by}
                            </span>
                          </p>
                          <p className="font-medium text-gray-100">
                            {expense.item_name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {expense.category}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-bold text-gray-100">
                            ฿{formatMoney(expense.amount)}
                          </p>
                          <button
                            onClick={() => {
                              onEdit(expense);
                              setSwipedExpenseId(null);
                            }}
                            className="text-gray-400 transition hover:text-lime-400"
                          >
                            <Edit2 size={16} />
                          </button>
                        </div>
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
