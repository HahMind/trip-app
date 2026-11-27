import { Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { dynaura } from "dynaura";
import { formatMoney } from "../utils/trip";
import ModalShell from "./ModalShell";

export default function SplitModal({ expense, members, onClose, onSave }) {
  const initialSelected = useMemo(() => {
    const valid = (expense?.split_between || []).filter((member) =>
      members.includes(member),
    );
    if (valid.length > 0) return valid;
    if (expense?.paid_by && members.includes(expense.paid_by)) {
      return [expense.paid_by];
    }
    return members.length > 0 ? [members[0]] : [];
  }, [expense, members]);

  const [selected, setSelected] = useState(initialSelected);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSelected(initialSelected);
  }, [initialSelected]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const isAllSelected =
    members.length > 0 && members.every((member) => selected.includes(member));

  const toggleMember = (member) => {
    setSelected((prev) => {
      const next = prev.includes(member)
        ? prev.filter((item) => item !== member)
        : [...prev, member];
      return members.filter((item) => next.includes(item));
    });
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const fallback =
        expense?.paid_by && members.includes(expense.paid_by)
          ? [expense.paid_by]
          : members.length > 0
            ? [members[0]]
            : [];
      setSelected(fallback);
    } else {
      setSelected([...members]);
    }
  };

  const handleConfirm = useCallback(async () => {
    if (isSaving) return;
    if (selected.length === 0) {
      dynaura.warning({
        title: "กรุณาเลือกผู้ร่วมหารอย่างน้อย 1 คน",
        description: "ไม่สามารถบันทึกโดยไม่มีผู้ร่วมหารได้",
        duration: 3000,
      });
      return;
    }

    const orderedSelected = members.filter((member) =>
      selected.includes(member),
    );
    const targetId = expense?.__draft ? null : (expense?.id ?? null);

    setIsSaving(true);
    try {
      const result = await onSave(targetId, orderedSelected);
      if (result !== false && targetId !== null) {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  }, [expense, isSaving, members, onClose, onSave, selected]);

  return (
    <ModalShell
      backdropClassName="bg-gray-950/80"
      panelClassName="max-w-sm"
      onClose={handleConfirm}
    >
      {/* ส่วนหัว */}
      <div className="flex items-start justify-between border-b border-gray-800 bg-gray-800 p-4">
        <div>
          <h2 className="text-lg font-bold text-gray-100">ระบุผู้หารรายการ</h2>
          <p className="mt-0.5 text-xs font-bold text-lime-400">
            {expense?.item_name || "รายการ"} (฿{formatMoney(expense?.amount || 0)})
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-sky-400">
            <Users size={14} />
            <span>
              เลือกแล้ว {selected.length} คน (จาก {members.length} คน)
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-700 hover:text-gray-200 focus:outline-none"
          aria-label="ปิดหน้าต่าง"
        >
          <X size={20} />
        </button>
      </div>

      {/* รายชื่อสมาชิก */}
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400">
            เลือกคนที่ร่วมหาร
          </span>
          <label className="flex cursor-pointer select-none items-center gap-2 text-xs font-bold text-lime-400">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              className="split-check h-4 w-4 rounded border-gray-600 bg-gray-800"
            />
            <span>เลือกทุกคน</span>
          </label>
        </div>

        <div className="max-h-64 space-y-2 overflow-y-auto pr-0.5">
          {members.map((member) => {
            const checked = selected.includes(member);
            return (
              <label
                key={member}
                className={`flex cursor-pointer select-none items-center justify-between rounded-xl border px-3.5 py-3 transition ${
                  checked
                    ? "border-lime-400/50 bg-gray-800"
                    : "border-gray-800 bg-gray-800/50 hover:bg-gray-800"
                }`}
              >
                <span className="text-sm font-bold text-gray-100">{member}</span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleMember(member)}
                  className="split-check h-4 w-4 rounded border-gray-600 bg-gray-900"
                />
              </label>
            );
          })}
        </div>

        {/* ปุ่มยกเลิก / ตกลง */}
        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-700 bg-gray-800 py-2.5 text-sm font-bold text-gray-200 transition hover:bg-gray-700 focus:outline-none"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleConfirm}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-gray-950 transition focus:outline-none ${
              isSaving
                ? "cursor-not-allowed bg-gray-500 shimmer"
                : "bg-lime-400 hover:bg-lime-300"
            }`}
          >
            {isSaving ? "กำลังบันทึก..." : "ตกลง"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
