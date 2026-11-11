import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatMoney } from "../utils/trip";

export default function SplitModal({ expense, members, onClose, onSave }) {
  const [selectedSplit, setSelectedSplit] = useState(() =>
    expense?.split_between?.length > 0
      ? expense.split_between
      : [expense?.paid_by],
  );

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleToggle = (member) =>
    setSelectedSplit((prev) =>
      prev.includes(member)
        ? prev.filter((m) => m !== member)
        : [...prev, member],
    );
  const isAllSelected =
    selectedSplit.length === members.length && members.length > 0;
  const handleToggleAll = () =>
    isAllSelected ? setSelectedSplit([]) : setSelectedSplit([...members]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/70 p-4 backdrop-blur-sm transition-all"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-sm flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-900 text-gray-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-800 bg-gray-800 p-4 text-lime-400">
          <div>
            <h3 className="font-bold text-base text-gray-100">
              ระบุผู้หารรายการ
            </h3>
            <p className="text-xs text-lime-400 font-medium">
              {expense.item_name} (฿{formatMoney(expense.amount)})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400">เลือกคนที่ร่วมหาร</p>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-lime-400 hover:text-lime-300">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleToggleAll}
                className="h-3.5 w-3.5 rounded accent-lime-400 cursor-pointer"
              />
              <span>เลือกทุกคน</span>
            </label>
          </div>
          <div className="mb-4 max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {members.map((member) => (
              <label
                key={member}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-800 bg-gray-800/60 p-3 transition hover:bg-gray-750"
              >
                <span className="font-medium text-gray-100 text-sm">
                  {member}
                </span>
                <input
                  type="checkbox"
                  checked={selectedSplit.includes(member)}
                  onChange={() => handleToggle(member)}
                  className="h-4 w-4 rounded accent-lime-400 cursor-pointer"
                />
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-700 bg-gray-800 py-2.5 text-xs font-semibold text-gray-300 transition hover:bg-gray-700"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(expense.id, selectedSplit);
                onClose();
              }}
              className="flex-1 rounded-lg bg-lime-400 py-2.5 text-xs font-bold text-gray-950 transition hover:bg-lime-300"
            >
              ตกลง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

