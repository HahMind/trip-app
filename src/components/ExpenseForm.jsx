import { Edit2, Receipt } from "lucide-react";

export default function ExpenseForm({
  editId,
  date,
  dates,
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
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-500">
            วันที่
            <select
              value={date}
              onChange={(event) => onDateChange(event.target.value)}
              className="w-full rounded-lg border bg-gray-50 p-2 text-sm"
            >
              {dates.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-500">
            หมวดหมู่
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
            className="w-full rounded-lg border p-2"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-500">
            จำนวนเงิน (บาท)
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              className="w-full rounded-lg border p-2 text-lg font-bold text-red-600"
            />
          </label>
          <label className="text-xs text-gray-500">
            คนจ่ายสำรอง
            <select
              value={paidBy}
              onChange={(event) => onPaidByChange(event.target.value)}
              className="w-full rounded-lg border bg-gray-50 p-2 font-bold text-blue-600"
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
