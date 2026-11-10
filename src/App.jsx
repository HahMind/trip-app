import {
  ArrowRight,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Edit2,
  FolderClosed,
  FolderOpen,
  Fuel,
  History,
  Maximize2,
  Minimize2,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Swal from "sweetalert2";

// ----------------------------------------
// ตั้งค่า Supabase & Constants
// ----------------------------------------
const supabase = createClient(
  "https://ovphjcceaxajshgzyvaz.supabase.co",
  "sb_publishable_2akfx9awEyywfq5Q0ZpLWA_iQGY9gzD"
);

const CATEGORIES = ["ค่าอาหาร", "ค่ารถ", "ค่าน้ำมัน", "ค่าที่พัก", "ค่าเที่ยว", "อื่นๆ"];
const HISTORY_CATEGORY = "ประวัติการโอน";
const DEFAULT_MEMBERS = ["หมิว", "มาย", "เมย์", "พี่เบส"];
const QR_IMAGES = {
  หมิว: "/Mind's QR.png",
  มาย: "/Mind's QR.png",
  เมย์: "/Mind's QR.png",
  พี่เบส: "/Mind's QR.png",
};

const SWAL_THEME = {
  background: "#111827",
  color: "#F3F4F6",
  buttonsStyling: false,
  customClass: {
    popup: "border border-gray-700 rounded-xl shadow-2xl p-6",
    title: "text-gray-100 font-bold text-lg",
    htmlContainer: "text-gray-300 text-sm mt-1",
    confirmButton:
      "bg-lime-400 text-gray-950 font-bold px-5 py-2.5 rounded-lg hover:bg-lime-300 transition text-sm cursor-pointer",
    cancelButton:
      "bg-gray-800 text-gray-300 font-bold px-5 py-2.5 rounded-lg hover:bg-gray-700 transition text-sm cursor-pointer ml-3",
  },
};

// ----------------------------------------
// Helpers
// ----------------------------------------
const getTodayISO = () => new Date().toLocaleDateString("en-CA");
const formatForDB = (isoDate) => {
  if (!isoDate || !isoDate.includes("-")) return isoDate;
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
};
const parseForUI = (thDate) => {
  if (!thDate || !thDate.includes("/")) return getTodayISO();
  const [d, m, y] = thDate.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
};
const getStoredMembers = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("tripMembers") || "null");
    if (Array.isArray(saved)) {
      const members = [...new Set(saved.map((member) => String(member).trim()))].filter(Boolean);
      if (members.length > 0) return members;
    }
  } catch {
    localStorage.removeItem("tripMembers");
  }
  return DEFAULT_MEMBERS;
};
const formatMoney = (value) =>
  Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ----------------------------------------
// Component: MemberModal (จัดการสมาชิก)
// ----------------------------------------
function MemberModal({ members, balances, onClose, onAdd, onRemove }) {
  const [newName, setNewName] = useState("");

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
      onAdd(trimmed);
      setNewName("");
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm transition-all"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-900 text-gray-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-gray-800 p-4 text-lime-400">
          <h2 className="flex items-center gap-2 font-bold">
            <Users size={20} /> จัดการสมาชิกทริป
          </h2>
          <button onClick={onClose} className="hover:text-lime-300">
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <form onSubmit={handleAdd} className="mb-6 flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="พิมพ์ชื่อเพื่อน..."
              className="flex-1 rounded-lg border border-gray-700 bg-gray-800 p-2 text-sm text-gray-100 focus:border-lime-400 focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={!newName.trim()}
              className="flex items-center gap-1 rounded-lg bg-lime-400 px-4 py-2 text-sm font-bold text-gray-950 transition hover:bg-lime-300 disabled:opacity-50"
            >
              <UserPlus size={16} /> เพิ่ม
            </button>
          </form>
          <div className="space-y-2">
            <p className="mb-2 text-xs font-bold text-gray-400">สมาชิกปัจจุบัน ({members.length})</p>
            {members.map((member) => {
              const memberBalance = balances.find((b) => b.member === member)?.balance || 0;
              const hasDebt = Math.abs(memberBalance) > 0.01;
              return (
                <div key={member} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-800/50 p-3">
                  <span className="font-medium text-gray-100">{member}</span>
                  <button
                    onClick={() => onRemove(member, hasDebt)}
                    className={`rounded p-1.5 transition ${
                      hasDebt ? "cursor-not-allowed text-gray-600" : "text-red-500 hover:bg-red-500/20"
                    }`}
                    title={hasDebt ? "ลบไม่ได้ มียอดค้างชำระ" : "ลบสมาชิก"}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------
// Component: SplitModal (Modal เลือกคนหารกลางจอ)
// ----------------------------------------
function SplitModal({ expense, members, onClose, onSave }) {
  const [selectedSplit, setSelectedSplit] = useState(() => {
    if (expense?.split_between?.length > 0) return expense.split_between;
    return [expense?.paid_by];
  });

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleToggle = (member) => {
    setSelectedSplit((prev) =>
      prev.includes(member) ? prev.filter((m) => m !== member) : [...prev, member]
    );
  };

  const isAllSelected = selectedSplit.length === members.length && members.length > 0;

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedSplit([]);
    } else {
      setSelectedSplit([...members]);
    }
  };

  const handleConfirm = () => {
    onSave(expense.id, selectedSplit);
    onClose();
  };

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
            <h3 className="font-bold text-base text-gray-100">ระบุผู้หารรายการ</h3>
            <p className="text-xs text-lime-400 font-medium">
              {expense.item_name} (฿{formatMoney(expense.amount)})
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400">เลือกคนที่ร่วมหารในรายการนี้</p>
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
                <span className="font-medium text-gray-100 text-sm">{member}</span>
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
              onClick={handleConfirm}
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

// ----------------------------------------
// Component: HistoryModal
// ----------------------------------------
function HistoryModal({ expenses, onClose, onUndo }) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm transition-all"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-900 text-gray-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-gray-800 p-4 text-lime-400">
          <h2 className="flex items-center gap-2 font-bold">
            <History size={20} /> ประวัติการเคลียร์ยอด
          </h2>
          <button onClick={onClose} className="hover:text-lime-300">
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {expenses.length === 0 ? (
            <p className="py-10 text-center text-gray-400">ยังไม่มีประวัติการโอนเงิน</p>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 p-3">
                  <div>
                    <p className="text-xs text-gray-400">{expense.expense_date}</p>
                    <p className="font-medium text-gray-100">{expense.item_name}</p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <p className="font-bold text-lime-400">฿{formatMoney(expense.amount)}</p>
                    <button
                      onClick={() => onUndo(expense.id)}
                      className="ml-2 flex items-center gap-1 rounded-3xl border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-xs text-sky-400 transition hover:bg-sky-500 hover:text-gray-950"
                      title="กู้คืนรายการนี้"
                    >
                      <RotateCcw size={14} /> กู้คืน
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------
// Component: TripHeader
// ----------------------------------------
function TripHeader({ totalExpense, isSyncing, onRefresh, MEMBERS, onOpenMemberModal }) {
  const [syncStatus, setSyncStatus] = useState("idle");

  useEffect(() => {
    if (isSyncing) setSyncStatus("syncing");
    else if (!isSyncing && syncStatus === "syncing") setSyncStatus("success");
  }, [isSyncing]);

  useEffect(() => {
    if (syncStatus === "success") {
      const timer = setTimeout(() => setSyncStatus("idle"), 1500);
      return () => clearTimeout(timer);
    }
  }, [syncStatus]);

  return (
    <header className="sticky top-0 z-30 bg-gray-900 p-4 text-gray-100 shadow-md">
      <div className="relative mx-auto max-w-md text-center">
        <button
          onClick={onOpenMemberModal}
          className="absolute left-0 top-5 flex h-10 items-center justify-center gap-1.5 rounded-full bg-gray-800 px-3 transition hover:bg-gray-700"
          title="จัดการสมาชิก"
        >
          <Users size={16} className="text-lime-400" />
          <span className="text-xs font-bold text-gray-300">{MEMBERS.length}</span>
        </button>
        <button
          onClick={onRefresh}
          disabled={syncStatus === "syncing"}
          className="absolute right-0 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 transition hover:bg-gray-700"
        >
          {syncStatus === "syncing" ? (
            <RefreshCw size={20} className="animate-spin text-gray-400" />
          ) : syncStatus === "success" ? (
            <Check size={20} className="animate-draw text-lime-400" />
          ) : (
            <RefreshCw size={20} className="text-gray-300 transition" />
          )}
        </button>
        <p className="mt-1 text-sm font-light opacity-80">ยอดรวมค่าใช้จ่ายทั้งทริป</p>
        <h1 className="my-1 text-4xl font-bold">฿{formatMoney(totalExpense)}</h1>
      </div>
    </header>
  );
}

// ----------------------------------------
// Component: ExpenseItem
// ----------------------------------------
function ExpenseItem({ expense, swipedId, setSwipedId, onEdit, onDelete, onOpenSplitModal, members, isLast }) {
  const [drag, setDrag] = useState({ active: false, startX: 0, startY: 0, offset: 0, scrolling: false });
  const isMouse = useRef(false);

  const splitList = expense.split_between?.length > 0 ? expense.split_between : [expense.paid_by];
  const isGas = expense.category === "ค่าน้ำมัน";
  const hasOdometer = isGas && expense.odometer_start && expense.odometer_end;
  const distance = hasOdometer ? Number(expense.odometer_end) - Number(expense.odometer_start) : 0;

  const isOpen = swipedId === expense.id;
  let currentOffset = isOpen ? -70 : 0;
  if (drag.active) {
    currentOffset = (isOpen ? -70 : 0) + drag.offset;
    if (currentOffset > 0) currentOffset = 0;
    if (currentOffset < -90) currentOffset = -90;
  }
  const isSwiped = currentOffset < -5;

  const startDrag = (clientX, clientY) => {
    setDrag({ active: true, startX: clientX, startY: clientY, offset: 0, scrolling: false });
    if (swipedId !== expense.id) setSwipedId(null);
  };
  const moveDrag = (clientX, clientY) => {
    if (!drag.active) return;
    const diffX = clientX - drag.startX;
    const diffY = Math.abs(clientY - drag.startY);
    if (!drag.scrolling && diffY > 15 && Math.abs(diffX) < 15) {
      setDrag((prev) => ({ ...prev, scrolling: true }));
    }
    if (drag.scrolling) return;
    setDrag((prev) => ({ ...prev, offset: diffX }));
  };
  const endDrag = () => {
    if (!drag.active) return;
    if (!drag.scrolling) {
      if (currentOffset < -35) setSwipedId(expense.id);
      else setSwipedId(null);
    }
    setDrag({ active: false, startX: 0, startY: 0, offset: 0, scrolling: false });
  };

  return (
    <div className={`relative bg-gray-900 ${!isLast ? "border-b border-gray-800" : ""}`}>
      <div className="absolute inset-y-0 right-3 flex items-center justify-center">
        <button
          onClick={() => {
            onDelete(expense.id);
            setSwipedId(null);
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition hover:bg-red-600"
          style={{
            opacity: currentOffset < -20 ? 1 : 0,
            transform: `scale(${currentOffset < -40 ? 1 : 0.5})`,
            transition: drag.active ? "none" : "all 0.25s ease-out",
          }}
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div
        className="relative z-10 flex cursor-grab touch-pan-y items-center justify-between bg-gray-800 p-3 pl-8 active:cursor-grabbing"
        style={{
          transform: `translate3d(${currentOffset}px, 0, 0)`,
          transition: drag.active ? "none" : "all 0.25s ease-out",
          borderTopRightRadius: isSwiped ? "24px" : "0px",
          borderBottomRightRadius: isSwiped ? "24px" : "0px",
        }}
        onTouchStart={(e) => startDrag(e.targetTouches[0].clientX, e.targetTouches[0].clientY)}
        onTouchMove={(e) => moveDrag(e.targetTouches[0].clientX, e.targetTouches[0].clientY)}
        onTouchEnd={endDrag}
        onMouseDown={(e) => {
          isMouse.current = true;
          startDrag(e.clientX, e.clientY);
        }}
        onMouseMove={(e) => {
          if (isMouse.current) moveDrag(e.clientX, e.clientY);
        }}
        onMouseUp={() => {
          if (isMouse.current) {
            isMouse.current = false;
            endDrag();
          }
        }}
        onMouseLeave={() => {
          if (isMouse.current) {
            isMouse.current = false;
            endDrag();
          }
        }}
      >
        <div className="pointer-events-none flex-1">
          <p className="mb-0.5 text-xs text-gray-400">
            จ่ายโดย: <span className="font-bold text-lime-400">{expense.paid_by}</span>
          </p>
          <p className="font-medium text-gray-100">{expense.item_name}</p>
          <p className="text-xs text-gray-400">
            {expense.category}{" "}
            {splitList.length > 0 && (
              <span className="text-[10px] text-sky-400"> (หาร {splitList.length} คน)</span>
            )}
          </p>
          {hasOdometer && (
            <p className="mt-0.5 text-[11px] font-medium text-amber-400">
              ไมล์ {expense.odometer_start} - {expense.odometer_end} ({distance} กม.)
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <p className="pointer-events-none font-bold text-gray-100">฿{formatMoney(expense.amount)}</p>
          <div className="relative z-20 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenSplitModal(expense);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-600 text-gray-400 transition hover:border-sky-400 hover:text-sky-400"
              title="เลือกคนหาร"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(expense);
                setSwipedId(null);
              }}
              className="text-gray-400 transition hover:text-lime-400"
            >
              <Edit2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------
// Component: ExpenseList
// ----------------------------------------
function ExpenseList({
  expenses,
  groupedExpenses,
  loading,
  isExpanded,
  collapsedDates,
  onToggleExpanded,
  onToggleDate,
  onEdit,
  onDelete,
  onOpenSplitModal,
  members,
  swipedId,
  setSwipedId,
}) {
  return (
    <section className="relative rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-sm">
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
                className="relative z-20 flex w-full items-center justify-between rounded-t-lg border-b-2 border-gray-700 bg-gray-700 p-3 hover:bg-gray-600"
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

              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  collapsedDates[date] ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
                }`}
              >
                <div className="overflow-hidden bg-gray-900">
                  {groupedExpenses[date].map((expense, index) => (
                    <ExpenseItem
                      key={expense.id}
                      expense={expense}
                      swipedId={swipedId}
                      setSwipedId={setSwipedId}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onOpenSplitModal={onOpenSplitModal}
                      members={members}
                      formatMoney={formatMoney}
                      isLast={index === groupedExpenses[date].length - 1}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ----------------------------------------
// Component: SettlementCard
// ----------------------------------------
function SettlementCard({ settlements, onSettle }) {
  return (
    <section className="rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between font-bold text-lime-400">
        <div className="flex items-center gap-2">
          <Users size={20} /> <h2>สรุปเคลียร์เงิน</h2>
        </div>
      </div>
      <div className="mb-6 space-y-2">
        {settlements.transfers.length === 0 ? (
          <p className="py-2 text-center text-sm text-gray-400">ทุกคนเคลียร์เงินครบแล้ว</p>
        ) : (
          settlements.transfers.map((transfer) => (
            <div key={`${transfer.from}-${transfer.to}`} className="rounded-lg border border-lime-900 bg-gray-800 p-3">
              <div className="mb-2 flex items-center justify-between p-2">
                <div className="flex items-center gap-2 font-medium">
                  <span className="text-gray-100">{transfer.from}</span>
                  <ArrowRight size={16} className="text-gray-400" />
                  <span className="text-gray-100">{transfer.to}</span>
                </div>
                <div className="font-bold text-lime-400">฿{formatMoney(transfer.amount)}</div>
              </div>
              <button
                onClick={() => onSettle(transfer.from, transfer.to, transfer.amount)}
                className="m-auto flex w-10/12 items-center justify-center gap-1 rounded bg-lime-500 py-2 text-xs text-gray-950 shadow-sm transition hover:bg-lime-300"
              >
                <CheckCircle size={14} /> เคลียร์ยอดนี้
              </button>
            </div>
          ))
        )}
      </div>
      <hr className="my-4 border-gray-800" />
      <div className="space-y-3">
        <p className="mb-2 text-xs font-bold text-gray-400">สรุปยอดสุทธิแต่ละคน</p>
        {settlements.balances.map((balance) => (
          <div key={balance.member} className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-100">{balance.member}</span>
            <div className="text-right">
              {balance.balance > 0.01 ? (
                <span className="font-bold text-lime-400">(ได้คืน ฿{formatMoney(balance.balance)})</span>
              ) : balance.balance < -0.01 ? (
                <span className="font-bold text-red-500">(ติดลบ ฿{formatMoney(Math.abs(balance.balance))})</span>
              ) : (
                <span className="font-bold text-gray-400">(พอดี)</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ----------------------------------------
// Component: App (Main)
// ----------------------------------------
export default function App() {
  const [MEMBERS, setMembers] = useState(getStoredMembers);
  const [paidBy, setPaidBy] = useState(() => {
    const saved = localStorage.getItem("defaultPaidBy");
    return saved && MEMBERS.includes(saved) ? saved : MEMBERS[0];
  });

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [collapsedDates, setCollapsedDates] = useState({});
  const [showHistory, setShowHistory] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [activeSplitExpense, setActiveSplitExpense] = useState(null);
  const [editId, setEditId] = useState(null);
  const [swipedId, setSwipedId] = useState(null);

  const [date, setDate] = useState(getTodayISO());
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);

  // 🧠 สเตตและการจำค่าของค่าน้ำมัน
  const [odometerStart, setOdometerStart] = useState(() => localStorage.getItem("lastOdometerEnd") || "");
  const [odometerEnd, setOdometerEnd] = useState("");
  const [fuelPrice, setFuelPrice] = useState(() => localStorage.getItem("lastFuelPrice") || "");
  const [fuelConsumption, setFuelConsumption] = useState(() => localStorage.getItem("lastFuelConsumption") || "");

  // ประวัติ Scroll to top
  const [isPressing, setIsPressing] = useState(false);
  const pressTimer = useRef(null);
  const hasScrolled = useRef(false);

  const refreshExpenses = useCallback(async () => {
    setIsSyncing(true);
    const { data, error } = await supabase.from("trip_expenses").select("*").order("created_at", { ascending: false });
    if (error) Swal.fire({ ...SWAL_THEME, icon: "error", title: "โหลดข้อมูลไม่สำเร็จ", text: error.message, confirmButtonText: "ตกลง" });
    else if (data) setExpenses(data);
    setTimeout(() => setIsSyncing(false), 500);
  }, []);

  useEffect(() => {
    refreshExpenses().then(() => setLoading(false));
    const subscription = supabase
      .channel("trip_expenses_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_expenses" }, refreshExpenses)
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, [refreshExpenses]);

  const handleAddMember = (name) => {
    if (!MEMBERS.includes(name)) {
      const newMembers = [...MEMBERS, name];
      setMembers(newMembers);
      localStorage.setItem("tripMembers", JSON.stringify(newMembers));
      setPaidBy(name);
      localStorage.setItem("defaultPaidBy", name);

      Swal.fire({
        ...SWAL_THEME,
        icon: "success",
        title: `เพิ่ม ${name} สำเร็จ`,
        timer: 400,
        showConfirmButton: false,
      });
    }
  };

  const handleRemoveMember = async (name, hasDebt) => {
    if (MEMBERS.length <= 1) {
      return Swal.fire({
        ...SWAL_THEME,
        icon: "warning",
        title: "ไม่สามารถลบได้",
        text: "ต้องมีสมาชิกอย่างน้อย 1 คน",
        confirmButtonText: "ตกลง",
      });
    }
    if (hasDebt) {
      return Swal.fire({
        ...SWAL_THEME,
        icon: "error",
        title: "ไม่สามารถลบสมาชิกได้",
        text: `${name} ยังมียอดค้างชำระอยู่ กรุณาเคลียร์ยอดเงินก่อน`,
        confirmButtonText: "เข้าใจแล้ว",
      });
    }

    const result = await Swal.fire({
      ...SWAL_THEME,
      title: "ยืนยันการลบสมาชิก",
      text: `ต้องการลบ ${name} ออกจากทริปใช่หรือไม่?`,
      showCancelButton: true,
      confirmButtonText: "ลบสมาชิก",
      cancelButtonText: "ยกเลิก",
      customClass: {
        ...SWAL_THEME.customClass,
        confirmButton:
          "bg-red-500 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-red-600 transition text-sm cursor-pointer",
      },
    });

    if (!result.isConfirmed) return;

    const newMembers = MEMBERS.filter((m) => m !== name);
    setMembers(newMembers);
    localStorage.setItem("tripMembers", JSON.stringify(newMembers));
    if (paidBy === name) {
      setPaidBy(newMembers[0]);
      localStorage.setItem("defaultPaidBy", newMembers[0]);
    }

    Swal.fire({
      ...SWAL_THEME,
      icon: "success",
      title: `ลบ ${name} เรียบร้อยแล้ว`,
      timer: 500,
      showConfirmButton: false,
    });
  };

  const handlePaidByChange = (value) => {
    if (value === "__ADD_NEW__") {
      setShowMemberModal(true);
    } else {
      setPaidBy(value);
      localStorage.setItem("defaultPaidBy", value);
    }
  };

  const handleAddExpense = async (event) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0)
      return Swal.fire({
        ...SWAL_THEME,
        icon: "warning",
        title: "แจ้งเตือน",
        text: "กรุณากรอกจำนวนเงินให้ถูกต้อง",
        confirmButtonText: "ตกลง",
      });

    const payload = {
      expense_date: formatForDB(date),
      item_name: item.trim() || category,
      amount: numericAmount,
      category,
      paid_by: paidBy,
      split_between: [paidBy],
      odometer_start: category === "ค่าน้ำมัน" && odometerStart ? Number(odometerStart) : null,
      odometer_end: category === "ค่าน้ำมัน" && odometerEnd ? Number(odometerEnd) : null,
    };

    if (editId) {
      const { error } = await supabase.from("trip_expenses").update(payload).eq("id", editId);
      if (error)
        return Swal.fire({ ...SWAL_THEME, icon: "error", title: "แก้ไขไม่สำเร็จ", text: error.message, confirmButtonText: "ตกลง" });
      setEditId(null);
    } else {
      const { error } = await supabase.from("trip_expenses").insert([payload]);
      if (error)
        return Swal.fire({ ...SWAL_THEME, icon: "error", title: "บันทึกไม่สำเร็จ", text: error.message, confirmButtonText: "ตกลง" });
    }

    // 🧠 บันทึกค่าล่าสุดของค่าน้ำมันลง localStorage
    if (category === "ค่าน้ำมัน") {
      if (odometerEnd) localStorage.setItem("lastOdometerEnd", odometerEnd);
      if (fuelPrice) localStorage.setItem("lastFuelPrice", fuelPrice);
      if (fuelConsumption) localStorage.setItem("lastFuelConsumption", fuelConsumption);
    }

    await refreshExpenses();
    setItem("");
    setAmount("");
    setCategory(CATEGORIES[0]); // 🧠 เปลี่ยนกลับเป็น "ค่าอาหาร" ตั้งต้น
    setOdometerStart(localStorage.getItem("lastOdometerEnd") || "");
    setOdometerEnd("");

    Swal.fire({
      ...SWAL_THEME,
      icon: "success",
      title: editId ? "แก้ไขรายการสำเร็จ" : "บันทึกรายการสำเร็จ",
      timer: 1000,
      showConfirmButton: false,
    });
  };

  const handleUpdateSplit = async (id, newSplit) => {
    const { error } = await supabase.from("trip_expenses").update({ split_between: newSplit }).eq("id", id);
    if (error)
      Swal.fire({ ...SWAL_THEME, icon: "error", title: "อัปเดตผู้หารไม่สำเร็จ", text: error.message, confirmButtonText: "ตกลง" });
    else await refreshExpenses();
  };

  const handleEdit = (expense) => {
    setEditId(expense.id);
    setDate(parseForUI(expense.expense_date));
    setPaidBy(expense.paid_by);
    setItem(expense.item_name);
    setAmount(expense.amount);
    setCategory(expense.category);
    setOdometerStart(expense.odometer_start || localStorage.getItem("lastOdometerEnd") || "");
    setOdometerEnd(expense.odometer_end || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditId(null);
    setItem("");
    setAmount("");
    setCategory(CATEGORIES[0]);
    setOdometerStart(localStorage.getItem("lastOdometerEnd") || "");
    setOdometerEnd("");
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      ...SWAL_THEME,
      title: "ยืนยันการลบรายการ",
      text: "ต้องการลบรายการนี้ออกจากทริปใช่หรือไม่?",
      showCancelButton: true,
      confirmButtonText: "ลบรายการ",
      cancelButtonText: "ยกเลิก",
      customClass: {
        ...SWAL_THEME.customClass,
        confirmButton:
          "bg-red-500 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-red-600 transition text-sm cursor-pointer",
      },
    });

    if (!result.isConfirmed) return;

    const { error } = await supabase.from("trip_expenses").delete().eq("id", id);
    if (error)
      Swal.fire({ ...SWAL_THEME, icon: "error", title: "ลบไม่สำเร็จ", text: error.message, confirmButtonText: "ตกลง" });
    else await refreshExpenses();
  };

  const handleUndoHistory = async (id) => {
    const { error } = await supabase.from("trip_expenses").delete().eq("id", id);
    if (error)
      Swal.fire({ ...SWAL_THEME, icon: "error", title: "กู้คืนไม่สำเร็จ", text: error.message, confirmButtonText: "ตกลง" });
    else await refreshExpenses();
  };

  const handleSettleDebt = async (from, to, settleAmount) => {
    const qrUrl = QR_IMAGES[to] || "https://placehold.co/250x250?text=No+QR+Code";
    const result = await Swal.fire({
      ...SWAL_THEME,
      title: `โอนเงินให้ ${to}`,
      text: `ยอดเงิน ฿${settleAmount.toLocaleString()}`,
      imageUrl: qrUrl,
      imageWidth: 250,
      imageHeight: 250,
      showCancelButton: true,
      confirmButtonText: "ยืนยันโอนแล้ว",
      cancelButtonText: "ยกเลิก",
    });

    if (!result.isConfirmed) return;

    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

    const { error } = await supabase.from("trip_expenses").insert([{
      expense_date: formattedDate,
      item_name: `[เคลียร์ยอด] ${from} -> ${to}`,
      amount: settleAmount,
      category: HISTORY_CATEGORY,
      paid_by: from,
    }]);
    if (error)
      return Swal.fire({ ...SWAL_THEME, icon: "error", title: "บันทึกการโอนไม่สำเร็จ", text: error.message, confirmButtonText: "ตกลง" });
    await refreshExpenses();
  };

  const startPressTimer = () => {
    hasScrolled.current = false;
    setIsPressing(true);
    pressTimer.current = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      hasScrolled.current = true;
      setIsPressing(false);
    }, 700);
  };
  const cancelPressTimer = () => {
    clearTimeout(pressTimer.current);
    setIsPressing(false);
  };
  const handleHistoryClick = () => {
    if (!hasScrolled.current) setShowHistory(true);
  };

  const regularExpenses = expenses.filter((e) => e.category !== HISTORY_CATEGORY);
  const historyExpenses = expenses.filter((e) => e.category === HISTORY_CATEGORY);
  const groupedExpenses = useMemo(() =>
    regularExpenses.reduce((groups, expense) => {
      (groups[expense.expense_date] ||= []).push(expense);
      return groups;
    }, {}),
  [regularExpenses]);
  const totalExpense = useMemo(() => regularExpenses.reduce((sum, e) => sum + Number(e.amount), 0), [regularExpenses]);

  // คำนวณยอดหนี้แบบระบุตัวผู้หาร (กรองเฉพาะคนที่มีชื่ออยู่ใน MEMBERS ปัจจุบันเท่านั้น)
  const settlements = useMemo(() => {
    const balances = MEMBERS.map((member) => ({ member, balance: 0 }));

    regularExpenses.forEach((expense) => {
      const amount = Number(expense.amount);
      const payer = balances.find((b) => b.member === expense.paid_by);
      if (payer) payer.balance += amount;

      let splitMembers = Array.isArray(expense.split_between) && expense.split_between.length > 0
        ? expense.split_between
        : [expense.paid_by];

      const validSplitMembers = splitMembers.filter((m) => MEMBERS.includes(m));
      if (validSplitMembers.length > 0) {
        const costPerPerson = amount / validSplitMembers.length;
        validSplitMembers.forEach((m) => {
          const debtor = balances.find((b) => b.member === m);
          if (debtor) debtor.balance -= costPerPerson;
        });
      }
    });

    historyExpenses.forEach((expense) => {
      const payer = balances.find((b) => b.member === expense.paid_by);
      if (payer) payer.balance += Number(expense.amount);
      MEMBERS.forEach((m) => {
        if (expense.item_name.includes(`-> ${m}`)) {
          const receiver = balances.find((b) => b.member === m);
          if (receiver) receiver.balance -= Number(expense.amount);
        }
      });
    });

    const debtors = balances.filter((b) => b.balance < -0.01).map((b) => ({ ...b }));
    const creditors = balances.filter((b) => b.balance > 0.01).map((b) => ({ ...b }));
    const transfers = [];
    let debtorIndex = 0;
    let creditorIndex = 0;
    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];
      const transferAmount = Math.min(Math.abs(debtor.balance), creditor.balance);
      if (transferAmount > 0.01) transfers.push({ from: debtor.member, to: creditor.member, amount: transferAmount });
      debtor.balance += transferAmount;
      creditor.balance -= transferAmount;
      if (Math.abs(debtor.balance) < 0.01) debtorIndex++;
      if (creditor.balance < 0.01) creditorIndex++;
    }
    return { balances, transfers };
  }, [MEMBERS, regularExpenses, historyExpenses]);

  // คำนวณปริมาณน้ำมันและประมาณการค่าน้ำมัน
  const distanceCalc = odometerStart && odometerEnd && Number(odometerEnd) >= Number(odometerStart)
    ? Number(odometerEnd) - Number(odometerStart)
    : 0;
  const litresCalc = distanceCalc > 0 && fuelConsumption && Number(fuelConsumption) > 0
    ? (distanceCalc / Number(fuelConsumption)).toFixed(2)
    : 0;
  const estimatedCostCalc = litresCalc > 0 && fuelPrice && Number(fuelPrice) > 0
    ? (litresCalc * Number(fuelPrice)).toFixed(2)
    : 0;

  return (
    <div className="relative min-h-screen bg-black pb-24 font-sans text-gray-100" onClick={() => setSwipedId(null)}>
      <style>{`
        @keyframes drawRing {
          0% { stroke-dashoffset: 176; }
          100% { stroke-dashoffset: 0; }
        }
      `}</style>

      <TripHeader
        totalExpense={totalExpense}
        isSyncing={isSyncing}
        onRefresh={refreshExpenses}
        MEMBERS={MEMBERS}
        onOpenMemberModal={() => setShowMemberModal(true)}
      />

      <main className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-6 p-4 md:grid-cols-2 lg:grid-cols-4">
        {/* ฟอร์มเพิ่มรายการ */}
        <section className={`rounded-xl border p-5 shadow-sm ${editId ? "border-lime-400 bg-gray-900" : "border-gray-700 bg-gray-900"}`} onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex items-center gap-2 font-bold text-lime-400">
            {editId ? <Edit2 size={20} /> : <Receipt size={20} />}
            <h2>{editId ? "แก้ไขรายการ" : "จดรายจ่ายใหม่"}</h2>
          </div>
          <form onSubmit={handleAddExpense} className="space-y-3">
            <div className="flex gap-2">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-sm text-gray-100 focus:border-lime-400 focus:outline-none" />
              <button type="button" onClick={() => setDate(getTodayISO())} className="w-1/4 rounded-lg bg-lime-400 px-3 text-sm font-bold text-gray-950 transition hover:bg-lime-300">วันนี้</button>
            </div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-sm text-gray-100 focus:border-lime-400 focus:outline-none">
              {CATEGORIES.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>

            {/* 🧠 ส่วนกรอกค่าน้ำมัน เลขไมล์ ราคาน้ำมัน และอัตรากินน้ำมัน */}
            {category === "ค่าน้ำมัน" && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <Fuel size={14} /> บันทึกข้อมูลค่าน้ำมัน
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400">ไมล์เริ่มต้น</label>
                    <input
                      type="number"
                      placeholder="ไมล์เริ่มต้น"
                      value={odometerStart}
                      onChange={(e) => setOdometerStart(e.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-xs text-gray-100 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">ไมล์สิ้นสุด</label>
                    <input
                      type="number"
                      placeholder="ไมล์สิ้นสุด"
                      value={odometerEnd}
                      onChange={(e) => setOdometerEnd(e.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-xs text-gray-100 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400">ราคาน้ำมัน (บาท/ลิตร)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="เช่น 38.50"
                      value={fuelPrice}
                      onChange={(e) => {
                        setFuelPrice(e.target.value);
                        localStorage.setItem("lastFuelPrice", e.target.value);
                      }}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-xs text-gray-100 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">อัตรากินน้ำมัน (กม./ลิตร)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="เช่น 15.0"
                      value={fuelConsumption}
                      onChange={(e) => {
                        setFuelConsumption(e.target.value);
                        localStorage.setItem("lastFuelConsumption", e.target.value);
                      }}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-xs text-gray-100 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                {distanceCalc > 0 && (
                  <div className="space-y-0.5 text-right text-[11px] text-amber-300">
                    <p>ระยะทาง: {distanceCalc} กม.</p>
                    {litresCalc > 0 && <p>น้ำมันที่ใช้: {litresCalc} ลิตร</p>}
                    {estimatedCostCalc > 0 && (
                      <p className="font-bold text-amber-400">
                        ประมาณการค่าน้ำมัน: ฿{formatMoney(estimatedCostCalc)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <input type="text" placeholder="ชื่อรายการ (เว้นว่างได้)" value={item} onChange={(e) => setItem(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-base text-gray-100 focus:border-lime-400 focus:outline-none" />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-base font-bold text-gray-100 focus:border-lime-400 focus:outline-none" />
              <select
                value={paidBy}
                onChange={(e) => handlePaidByChange(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-base font-bold text-gray-300 focus:border-lime-400 focus:outline-none"
              >
                {MEMBERS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
                <option value="__ADD_NEW__">+ เพิ่มคนใหม่...</option>
              </select>
            </div>
            {editId ? (
              <div className="flex gap-2">
                <button type="submit" className="flex-1 rounded-lg bg-lime-400 py-3 font-bold text-gray-950 transition hover:bg-lime-300">บันทึกแก้ไข</button>
                <button type="button" onClick={cancelEdit} className="rounded-lg bg-gray-700 px-4 py-3 font-bold text-gray-100 transition hover:bg-gray-600">ยกเลิก</button>
              </div>
            ) : (
              <button type="submit" className="w-full rounded-lg bg-lime-400 py-3 font-bold text-gray-950 transition hover:bg-lime-300">บันทึกรายการ</button>
            )}
          </form>
        </section>

        <div onClick={(e) => e.stopPropagation()}>
          <ExpenseList
            expenses={regularExpenses}
            groupedExpenses={groupedExpenses}
            loading={loading}
            isExpanded={isListExpanded}
            collapsedDates={collapsedDates}
            onToggleExpanded={() => setIsListExpanded((v) => !v)}
            onToggleDate={(val) => setCollapsedDates((d) => ({ ...d, [val]: !d[val] }))}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onOpenSplitModal={(exp) => setActiveSplitExpense(exp)}
            members={MEMBERS}
            swipedId={swipedId}
            setSwipedId={setSwipedId}
          />
        </div>

        <SettlementCard settlements={settlements} onSettle={handleSettleDebt} />
      </main>

      {/* ปุ่มประวัติมุมล่างขวา */}
      <div className="fixed bottom-10 right-6 z-40 flex items-center justify-center">
        {isPressing && (
          <svg className="absolute inset-0 h-[68px] w-[68px] -translate-x-[2px] -translate-y-[2px] -rotate-90 pointer-events-none" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" stroke="#D7FF3B" strokeWidth="4" fill="none"
              strokeDasharray="176"
              strokeDashoffset="176"
              className="animate-[drawRing_0.7s_linear_forwards]"
            />
          </svg>
        )}
        <button
          onClick={handleHistoryClick}
          onMouseEnter={startPressTimer}
          onMouseLeave={cancelPressTimer}
          onTouchStart={startPressTimer}
          onTouchEnd={cancelPressTimer}
          className={`flex h-16 w-16 items-center justify-center rounded-full text-gray-950 shadow-xl shadow-lime-500/10 ${
            isPressing
              ? "scale-125 bg-amber-700 transition-all duration-700 ease-linear"
              : "scale-100 bg-amber-500 transition-all duration-200 ease-out hover:bg-amber-600"
          }`}
          title="ดูประวัติการเคลียร์เงิน หรือกดค้างเพื่อขึ้นบนสุด"
        >
          <History size={28} />
        </button>
      </div>

      {showMemberModal && (
        <MemberModal
          members={MEMBERS}
          balances={settlements.balances}
          onClose={() => setShowMemberModal(false)}
          onAdd={handleAddMember}
          onRemove={handleRemoveMember}
        />
      )}

      {activeSplitExpense && (
        <SplitModal
          expense={activeSplitExpense}
          members={MEMBERS}
          onClose={() => setActiveSplitExpense(null)}
          onSave={handleUpdateSplit}
        />
      )}

      {showHistory && (
        <HistoryModal
          expenses={historyExpenses}
          onClose={() => setShowHistory(false)}
          onUndo={handleUndoHistory}
        />
      )}

      {/* 🧠 Footer ด้านล่างสุด */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-center gap-2 bg-gray-900/90 p-3 text-xs text-gray-400 backdrop-blur-sm">
        <span>v.2.0.0</span>
      </footer>
    </div>
  );
}