import { Plus, UserPlus, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BANKS } from "../data/constants";
import MemberItem from "./MemberItem";
import ModalShell from "./ModalShell";

export default function MemberModal({
  members,
  balances,
  memberDetails,
  onClose,
  onAdd,
  onRemove,
  onUpdateDetails,
}) {
  const [newName, setNewName] = useState("");
  const [showNewPayForm, setShowNewPayForm] = useState(false);
  const [newPayForm, setNewPayForm] = useState({
    promptpay: "",
    bankId: "kbank",
    bankAcc: "",
  });
  const [swipedMember, setSwipedMember] = useState(null);
  const [editingMember, setEditingMember] = useState(null);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleAdd = (e) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (trimmed) {
      onAdd(trimmed, showNewPayForm ? newPayForm : null);
      setNewName("");
      setShowNewPayForm(false);
      setNewPayForm({ promptpay: "", bankId: "kbank", bankAcc: "" });
    }
  };

  return (
    <ModalShell
      backdropClassName="bg-gray-950/70"
      panelClassName="max-h-[85vh] max-w-md"
      onClose={onClose}
    >
        <div className="flex items-center justify-between bg-gray-800 p-4 text-lime-400">
          <h2 className="flex items-center gap-2 font-bold">
            <Users size={20} /> จัดการสมาชิก
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-lime-300"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-6 rounded-lg border border-gray-700 bg-gray-800/30 p-3">
            <form onSubmit={handleAdd} className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="พิมพ์ชื่อ..."
                className="flex-1 rounded-lg border border-gray-700 bg-gray-800 p-2 text-base text-gray-100 focus:border-lime-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newName.trim()}
                className="flex items-center gap-1 rounded-lg bg-lime-400 px-4 py-2 text-sm font-bold text-gray-950 transition hover:bg-lime-300 disabled:opacity-50"
              >
                <UserPlus size={16} /> เพิ่ม
              </button>
            </form>

            {!showNewPayForm ? (
              <button
                type="button"
                onClick={() => {
                  setShowNewPayForm(true);
                  setEditingMember(null);
                }}
                className="mt-2 flex items-center gap-1 text-[11px] font-medium text-sky-400 hover:text-sky-300 transition"
              >
                <Plus size={12} /> เพิ่มวิธีการชำระเงินให้{" "}
                {newName || "เพื่อนใหม่"} (ตั้งค่าภายหลังได้)
              </button>
            ) : (
              <div className="mt-3 space-y-2 border-t border-gray-700 pt-3 relative">
                <div className="flex justify-end pr-2 ">
                  <button
                    type="button"
                    onClick={() => setShowNewPayForm(false)}
                    className="mt-2 flex items-center gap-1 text-[11px] bg-red-700 p-1.5 rounded font-medium text-gray-200 transition hover:text-red-500"
                  >
                    <X size={12} /> ยกเลิก
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="เบอร์พร้อมเพย์..."
                  value={newPayForm.promptpay}
                  onChange={(e) =>
                    setNewPayForm({ ...newPayForm, promptpay: e.target.value })
                  }
                  className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-base focus:border-lime-400 focus:outline-none"
                />
                <p className="font-medium text-xs text-sky-400 ">หรือ</p>
                <div className="flex gap-2 ">
                  <select
                    value={newPayForm.bankId}
                    onChange={(e) =>
                      setNewPayForm({ ...newPayForm, bankId: e.target.value })
                    }
                    className="flex rounded border border-gray-700 bg-gray-800 p-2 text-base focus:border-lime-400 focus:outline-none"
                  >
                    {BANKS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="เลขบัญชี..."
                    value={newPayForm.bankAcc}
                    onChange={(e) =>
                      setNewPayForm({ ...newPayForm, bankAcc: e.target.value })
                    }
                    className="flex rounded border border-gray-700 bg-gray-800 p-2 text-base focus:border-lime-400 focus:outline-none w-full"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <p className="mb-2 text-xs font-bold text-gray-400">
              ปัดซ้ายเพื่อลบสมาชิก ({members.length})
            </p>
            {members.map((member) => {
              const balance =
                balances.find((b) => b.member === member)?.balance || 0;
              const hasDebt = Math.abs(balance) > 0.01;
              const details = memberDetails[member] || {};
              return (
                <MemberItem
                  key={member}
                  setShowNewPayForm={setShowNewPayForm}
                  member={member}
                  hasDebt={hasDebt}
                  details={details}
                  onRemove={onRemove}
                  onUpdateDetails={onUpdateDetails}
                  swipedMember={swipedMember}
                  setSwipedMember={setSwipedMember}
                  isEditing={editingMember === member}
                  onEdit={() =>
                    setEditingMember(editingMember === member ? null : member)
                  }
                />
              );
            })}
          </div>
        </div>
    </ModalShell>
  );
}
