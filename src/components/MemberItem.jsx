import { Edit2, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { BANKS } from "../data/constants";
import useSwipeDrag from "../hooks/useSwipeDrag";
import { dynaura } from "dynaura";
import { normalizePromptPay, validatePromptPay } from "../utils/trip";

export default function MemberItem({
  member,
  hasDebt,
  details,
  onRemove,
  onUpdateDetails,
  swipedMember,
  setSwipedMember,
  isEditing,
  onEdit,
  setShowNewPayForm,
  isPending,
  isOffline,
}) {
  const [form, setForm] = useState({
    promptpay: details?.promptpay || "",
    bankId: details?.bankId || "kbank",
    bankAcc: details?.bankAcc || "",
  });

  useEffect(() => {
    if (isEditing) {
      setForm({
        promptpay: details?.promptpay || "",
        bankId: details?.bankId || "kbank",
        bankAcc: details?.bankAcc || "",
      });
    }
  }, [isEditing, details]);

  const warnOffline = () =>
    dynaura.warning({
      title: "ออฟไลน์",
      description: "ไม่สามารถแก้ไขหรือลบสมาชิกขณะออฟไลน์ได้",
      duration: 4000,
    });

  const isOpen = swipedMember === member;
  const {
    drag,
    currentOffset,
    isSwiped,
    consumeSuppressedClick,
    touchHandlers,
    mouseHandlers,
  } = useSwipeDrag({
    id: member,
    isOpen,
    setOpen: setSwipedMember,
    canDrag: !isEditing,
  });

  return (
    <div className="relative mb-2 overflow-hidden rounded-lg border border-gray-800 bg-gray-900/50">
      
      {/* 💻 [Desktop View] ปุ่มลบโชว์ไว้ตลอดทางด้านขวา ไม่ต้องปัด */}
      <div className="absolute inset-y-0 right-3 hidden md:flex items-center justify-center z-20">
        <button
          onClick={() => {
            if (isOffline) {
              warnOffline();
              return;
            }
            onRemove(member, hasDebt);
          }}
          disabled={isPending || isOffline}
          className={`flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition ${
            isPending || isOffline
              ? "cursor-not-allowed bg-gray-500 shimmer"
              : hasDebt
              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
              : "bg-red-500 text-white hover:bg-red-600"
          }`}
          title={hasDebt ? "มียอดค้างชำระ ลบไม่ได้" : "ลบสมาชิก"}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* 📱 [Mobile View] ปุ่มลบสำหรับระบบ Swipe */}
      <div className="absolute inset-y-0 right-3 flex md:hidden items-center justify-center">
        <button
          onClick={() => {
            if (isOffline) {
              warnOffline();
              return;
            }
            onRemove(member, hasDebt);
            setSwipedMember(null);
          }}
          disabled={isPending || isOffline}
          className={`flex h-10 w-10 items-center justify-center rounded-full shadow-sm transition ${
            isPending || isOffline
              ? "cursor-not-allowed bg-gray-500 shimmer"
              : hasDebt
              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
              : "bg-red-500 text-white hover:bg-red-600"
          }`}
          style={{
            opacity: Math.min(1, -currentOffset / 40),
            transform: `scale(${Math.min(1.08, 0.2 + (-currentOffset / 70) * 0.8)})`,
            transition: drag.active ? "none" : "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div
        className="relative z-10 flex items-center justify-between bg-gray-800 p-3 md:pr-14"
        style={{
          transform: `translate3d(${currentOffset}px, 0, 0)`,
          transition: drag.active
            ? "none"
            : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.1s",
          borderTopRightRadius: isSwiped ? "24px" : "0px",
          borderBottomRightRadius: isSwiped ? "24px" : "0px",
        }}
        {...touchHandlers}
        {...mouseHandlers}
        onClick={(e) => {
          if (consumeSuppressedClick()) {
            e.stopPropagation();
            return;
          }
          setSwipedMember(null);
        }}
      >
        <span className="font-medium text-gray-100">{member}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (isOffline) {
                warnOffline();
                return;
              }
              onEdit();
              setShowNewPayForm(false); 
            }}
            className="p-1.5 text-sky-400 transition hover:bg-sky-400/20 rounded z-30"
            disabled={isOffline}
          >
            <Edit2 size={16} />
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="border-t border-gray-700 bg-gray-900/80 p-3 space-y-3">
          <div>
            <label className="mb-1 block text-[10px] text-gray-400">
              เบอร์พร้อมเพย์ (เว้นว่างได้)
            </label>
            <input
              type="tel"
              value={form.promptpay}
              inputMode="numeric"
              pattern="[0-9]*"
              onChange={(e) =>
                setForm({
                  ...form,
                  promptpay: normalizePromptPay(e.target.value).replace(/\D/g, ""),
                })
              }
              className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-sm focus:border-lime-400 focus:outline-none"
              placeholder="เช่น 0812345678"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] text-gray-400">
                ธนาคาร (หลัก)
              </label>
              <select
                value={form.bankId}
                onChange={(e) => setForm({ ...form, bankId: e.target.value })}
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-xs focus:border-lime-400 focus:outline-none"
              >
                {BANKS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-gray-400">
                เลขบัญชี
              </label>
              <input
                type="tel"
                value={form.bankAcc}
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={(e) =>
                  setForm({
                    ...form,
                    bankAcc: e.target.value.replace(/\D/g, ""),
                  })
                }
                className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-sm focus:border-lime-400 focus:outline-none"
                placeholder="เลขบัญชี..."
              />
            </div>
          </div>
          <button
            onClick={() => {
              if (isOffline) {
                warnOffline();
                return;
              }
              const validation = validatePromptPay(form.promptpay);
              if (!validation.valid) {
                dynaura.warning({
                  title: "เลขพร้อมเพย์ไม่ถูกต้อง",
                  description: validation.message,
                  duration: 4000,
                });
                return;
              }
              onUpdateDetails(member, {
                ...form,
                promptpay: validation.normalized,
              });
              onEdit(); // ปิดฟอร์มแก้ไขหลังจากกดบันทึก
            }}
            disabled={isOffline}
            className={`flex w-full items-center justify-center gap-1 rounded bg-lime-400 py-2 text-sm font-bold text-gray-950 transition hover:bg-lime-300 ${
              isOffline ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <Save size={16} /> บันทึกข้อมูล
          </button>
        </div>
      )}
    </div>
  );
}
