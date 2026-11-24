import { Edit2, Receipt } from "lucide-react";
import { CATEGORIES } from "../data/constants";
import { getTodayISO } from "../utils/trip";

export default function ExpenseForm({
  editId,
  date,
  setDate,
  item,
  setItem,
  amount,
  setAmount,
  category,
  setCategory,
  paidBy,
  setPaidBy,
  members,
  odometerStart,
  setOdometerStart,
  odometerEnd,
  setOdometerEnd,
  isSubmitting,
  onSubmit,
  onCancel,
  onAddMember,
}) {
  return (
    <section
      className={`rounded-xl border p-6 shadow-sm transition-colors lg:col-span-3 ${
        editId
          ? "border-yellow-400 bg-yellow-100/15"
          : "border-gray-700 bg-gray-900"
      }`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-4 flex items-center gap-2 font-bold text-lime-400">
        {editId ? (
          <Edit2 size={20} className="text-yellow-400" />
        ) : (
          <Receipt size={20} />
        )}
        <h2 className={editId ? "text-yellow-400" : ""}>
          {editId ? "แก้ไขรายการ" : "จดรายจ่ายใหม่"}
        </h2>
      </div>
      <form onSubmit={onSubmit} className="grid gap-3 lg:grid-cols-2">
        <div className="flex gap-2 lg:order-2">
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-sm text-gray-100 focus:border-lime-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setDate(getTodayISO())}
            className="w-1/4 rounded-lg bg-lime-400 px-3 text-sm font-bold text-gray-950 transition hover:bg-lime-300"
          >
            วันนี้
          </button>
        </div>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-sm text-gray-100 focus:border-lime-400 focus:outline-none lg:order-1"
        >
          {CATEGORIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        {category === "ค่าน้ำมัน" && (
          <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 lg:order-3 lg:col-span-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400">
                  ไมล์เริ่มต้น
                </label>
                <input
                  type="number"
                  placeholder="ไมล์เริ่มต้น"
                  value={odometerStart}
                  onChange={(event) => setOdometerStart(event.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-xs text-gray-100 focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400">
                  ไมล์สิ้นสุด
                </label>
                <input
                  type="number"
                  placeholder="ไมล์สิ้นสุด"
                  value={odometerEnd}
                  onChange={(event) => setOdometerEnd(event.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-xs text-gray-100 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        <input
          type="text"
          placeholder="ชื่อรายการ (เว้นว่างได้)"
          value={item}
          onChange={(event) => setItem(event.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-base text-gray-100 focus:border-lime-400 focus:outline-none lg:order-4 lg:col-span-2"
        />
        <div className="grid grid-cols-1 gap-3 lg:order-5 lg:grid-cols-2">
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-base font-bold text-gray-100 focus:border-lime-400 focus:outline-none"
          />
          <select
            value={paidBy}
            onChange={(event) => {
              if (event.target.value === "__ADD__") onAddMember();
              else setPaidBy(event.target.value);
            }}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-base font-bold text-gray-300 focus:border-lime-400 focus:outline-none"
          >
            {members.map((member) => (
              <option key={member} value={member}>
                {member}
              </option>
            ))}
            <option value="__ADD__">+ เพิ่มคนใหม่...</option>
          </select>
        </div>

        {editId ? (
          <div className="flex gap-2 lg:order-6 lg:col-span-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg bg-gray-700 py-3 font-bold text-gray-100 transition hover:bg-gray-600"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-2 rounded-lg py-3 font-bold text-gray-950 transition ${
                isSubmitting
                  ? "cursor-not-allowed bg-gray-500 shimmer"
                  : "bg-yellow-400 hover:bg-yellow-300"
              }`}
            >
              {isSubmitting ? "กำลังบันทึก..." : "บันทึกแก้ไข"}
            </button>
          </div>
        ) : (
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full rounded-lg py-3 font-bold text-gray-950 transition lg:order-6 lg:col-span-2 ${
              isSubmitting
                ? "cursor-not-allowed bg-gray-500 shimmer"
                : "bg-lime-400 hover:bg-lime-300"
            }`}
          >
            {isSubmitting ? "กำลังบันทึก..." : "บันทึกรายการ"}
          </button>
        )}
      </form>
    </section>
  );
}
