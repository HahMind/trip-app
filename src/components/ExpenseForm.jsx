import { Edit2, Receipt } from "lucide-react";

export default function ExpenseForm({
  editId,
  date,
  category,
  categories,
  item,
  amount,
  paidBy,
  members,
  onDateChange,
  onCategoryChange,
  onItemChange,
  onAmountChange,
  onPaidByChange,
  onSubmit,
  onCancel,
}) {
  //  ฟังก์ชันกดปุ่มวันนี้
  const setToday = () => {
    onDateChange(new Date().toLocaleDateString("en-CA"));
  };

  return (
    <section
      className={`rounded-xl border p-5 shadow-sm ${
        editId ? "border-yellow-300 bg-yellow-50" : "border-gray-200 bg-gray-300"
      }`}
    >
      <div className="mb-4 flex items-center gap-2 font-bold text-blue-600">
        {editId ? <Edit2 size={20} className="text-yellow-600" /> : <Receipt size={20} />}
        <h2 className={editId ? "text-yellow-700" : ""}>
          {editId ? "แก้ไขรายการ" : "จดรายจ่ายใหม่"}
        </h2>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-3">
          <div className="flex flex-col">
            <label className="mb-1 text-xs text-gray-500">วันที่</label>
            <div className="flex gap-2">
              {/* 🧠 เปลี่ยนเป็น input แบบปฏิทิน */}
              <input
                type="date"
                value={date}
                onChange={(event) => onDateChange(event.target.value)}
                className="w-full rounded-lg border bg-gray-50 p-2 text-sm"
              />
              {/* ปุ่มเลือกวันที่ปัจจุบัน */}
              <button
                type="button"
                onClick={setToday}
                className="rounded-lg bg-blue-100 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-200 w-1/4"
              >
                วันนี้
              </button>
            </div>
          </div>
          <label className="flex flex-col text-xs text-gray-500">
            <span className="mb-1">หมวดหมู่</span>
            <select
              value={category}
              onChange={(event) => onCategoryChange(event.target.value)}
              className="w-full rounded-lg border bg-gray-50 p-2 text-sm"
            >
              {categories.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-xs text-gray-500">
          ชื่อรายการ (เว้นว่างได้)
          <input
            type="text"
            placeholder="ดึงชื่อหมวดหมู่อัตโนมัติ"
            value={item}
            onChange={(event) => onItemChange(event.target.value)}
            className="w-full mt-1 rounded-lg border p-2 text-sm"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col text-xs text-gray-500">
            <span className="mb-1">จำนวนเงิน (บาท)</span>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              className="w-full rounded-lg border p-2 text-lg font-bold text-red-600"
            />
          </label>
          <label className="flex flex-col text-xs text-gray-500">
            <span className="mb-1">คนจ่ายสำรอง</span>
            <select
              value={paidBy}
              onChange={(event) => onPaidByChange(event.target.value)}
              className="w-full rounded-lg border bg-gray-50 p-2 font-bold text-blue-600 text-base"
            >
              {members.map((member) => (
                <option key={member} value={member}>
                  {member}
                </option>
              ))}
            </select>
          </label>
        </div>
        {editId ? (
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-lg bg-yellow-500 py-3 font-bold text-white transition hover:bg-yellow-600">
              บันทึกแก้ไข
            </button>
            <button type="button" onClick={onCancel} className="rounded-lg bg-gray-400 px-4 py-3 font-bold text-white transition hover:bg-gray-500">
              ยกเลิก
            </button>
          </div>
        ) : (
          <button type="submit" className="w-full rounded-lg bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-700">
            บันทึกรายการ
          </button>
        )}
      </form>
    </section>
  );
}
