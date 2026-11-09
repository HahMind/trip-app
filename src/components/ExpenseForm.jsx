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
        editId ? "border-yellow-400 bg-gray-900" : "border-gray-700 bg-gray-900"
      }`}
    >
      <div className="mb-4 flex items-center gap-2 font-bold text-lime-400">
        {editId ? <Edit2 size={20} className="text-yellow-400" /> : <Receipt size={20} />}
        <h2 className={editId ? "text-yellow-400" : ""}>
          {editId ? "แก้ไขรายการ" : "จดรายจ่ายใหม่"}
        </h2>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-3">
          <div className="flex flex-col">
            <label className="mb-1 text-xs text-gray-400">วันที่</label>
            <div className="flex gap-2">
              {/*  เปลี่ยนเป็น input แบบปฏิทิน */}
              <input
                type="date"
                value={date}
                onChange={(event) => onDateChange(event.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-sm text-gray-100"
              />
              {/* ปุ่มเลือกวันที่ปัจจุบัน */}
              <button
                type="button"
                onClick={setToday}
                className="w-1/4 rounded-lg bg-lime-400 px-3 text-xs font-bold text-gray-950 transition hover:bg-lime-300"
              >
                วันนี
              </button>
            </div>
          </div>
          <label className="flex flex-col text-xs text-gray-400">
            <span className="mb-1">หมวดหมู่</span>
            <select
              value={category}
              onChange={(event) => onCategoryChange(event.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-sm text-gray-100"
            >
              {categories.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-xs text-gray-400">
          ชื่อรายการ (เว้นว่างได้)
          <input
            type="text"
            placeholder="ดึงชื่อหมวดรายการ"
            value={item}
            onChange={(event) => onItemChange(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-sm text-gray-100"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col text-xs text-gray-400">
            <span className="mb-1">จำนวนเงิน (บาท)</span>
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-lg font-bold text-gray-100"
            />
          </label>
          <label className="flex flex-col text-xs text-gray-400">
            <span className="mb-1">คนจ่ายสำรอง</span>
            <select
              value={paidBy}
              onChange={(event) => onPaidByChange(event.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-base font-bold text-gray-300"
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
            <button type="submit" className="flex-1 rounded-lg bg-yellow-400 py-3 font-bold text-gray-950 transition hover:bg-yellow-300">
              บันทึกแก้ไข
            </button>
            <button type="button" onClick={onCancel} className="rounded-lg bg-gray-700 px-4 py-3 font-bold text-gray-100 transition hover:bg-gray-600">
              ยกเลิก
            </button>
          </div>
        ) : (
          <button type="submit" className="w-full rounded-lg bg-lime-400 py-3 font-bold text-gray-950 transition hover:bg-lime-300">
            บันทึกรายการ
          </button>
        )}
      </form>
    </section>
  );
}
