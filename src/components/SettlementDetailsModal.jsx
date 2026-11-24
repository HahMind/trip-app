import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { formatMoney } from "../utils/trip";
import ModalShell from "./ModalShell";

const formatDateTime = (expense) => {
  if (!expense.created_at) return expense.expense_date;
  const parsed = new Date(expense.created_at);
  if (Number.isNaN(parsed.getTime())) return expense.expense_date;

  const timeText = parsed.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${expense.expense_date} • ${timeText} น.`;
};

export default function SettlementDetailsModal({ transfer, onClose }) {
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const {
    from,
    to,
    amount,
    positiveItems = [],
    negativeItems = [],
    positiveTotal = 0,
    negativeTotal = 0,
    settledHistory = [],
  } = transfer;

  return (
    <ModalShell
      backdropClassName="bg-gray-950/75"
      panelClassName="max-h-[85vh] max-w-md"
      onClose={onClose}
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-800 bg-gray-800 p-4">
        <div>
          <div className="flex items-center gap-2 text-base font-bold text-gray-100">
            <span>{from}</span>
            <ArrowRight size={16} className="text-lime-400" />
            <span>{to}</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            ยอดสุทธิหลังหักลบ:{" "}
            <span className="text-base font-bold text-lime-400">
              ฿{formatMoney(amount)}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 transition hover:text-gray-200"
          aria-label="ปิดหน้าต่าง"
        >
          <X size={22} />
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 gap-2 border-b border-gray-800 bg-gray-900/80 px-4 py-2.5 text-xs">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
          <span className="text-gray-400">{to} ออกให้ก่อน</span>
          <p className="font-bold text-emerald-500">
            +฿{formatMoney(positiveTotal)}
          </p>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5">
          <span className="text-gray-400">{from} ออกให้หักลบ</span>
          <p className="font-bold text-red-500">
            -฿{formatMoney(negativeTotal)}
          </p>
        </div>
      </div>

      {/* Itemized List */}
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {/* 1. รายการบวก (สีเขียว) เรียงวันที่และเวลาล่าสุด -> เก่าสุด */}
        {positiveItems.map((expense) => (
          <div
            key={`pos-${expense.id}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-gray-800 p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 text-[11px] text-gray-400">
                <span>{formatDateTime(expense)}</span>
                <span className="mx-1.5">•</span>
                <span>
                  จ่ายโดย:{" "}
                  <strong className="font-semibold text-lime-400">
                    {expense.paid_by}
                  </strong>
                </span>
              </p>
              <p className="truncate text-sm font-medium text-gray-100">
                {expense.item_name}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">
                หาร {expense.splitCount} คน (ยอดเต็ม ฿
                {formatMoney(expense.amount)})
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-bold text-emerald-500">
                +฿{formatMoney(expense.shareAmount)}
              </p>
            </div>
          </div>
        ))}

        {/* 2. รายการลบ (สีแดง) เรียงวันที่และเวลาล่าสุด -> เก่าสุด */}
        {negativeItems.map((expense) => (
          <div
            key={`neg-${expense.id}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-gray-800 p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 text-[11px] text-gray-400">
                <span>{formatDateTime(expense)}</span>
                <span className="mx-1.5">•</span>
                <span>
                  จ่ายโดย:{" "}
                  <strong className="font-semibold text-lime-400">
                    {expense.paid_by}
                  </strong>
                </span>
              </p>
              <p className="truncate text-sm font-medium text-gray-100">
                {expense.item_name}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">
                หาร {expense.splitCount} คน (ยอดเต็ม ฿
                {formatMoney(expense.amount)})
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-bold text-red-500">
                -฿{formatMoney(expense.shareAmount)}
              </p>
            </div>
          </div>
        ))}

        {/* 3. บรรทัดสุดท้าย: เมนูพับเก็บรายการที่ชำระแล้ว (สีเทา ไม่นำมาคำนวณ) */}
        <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800/60">
          <button
            type="button"
            onClick={() => setIsHistoryExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-medium text-gray-400 transition hover:bg-gray-800"
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-gray-400" />
              <span>รายการที่ชำระแล้ว ({settledHistory.length})</span>
            </span>
            {isHistoryExpanded ? (
              <ChevronDown size={16} className="text-gray-400" />
            ) : (
              <ChevronRight size={16} className="text-gray-400" />
            )}
          </button>

          <div
            className={`grid transition-all duration-300 ease-in-out ${
              isHistoryExpanded
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="space-y-1.5 border-t border-gray-700/70 p-2.5">
                {settledHistory.length === 0 ? (
                  <p className="py-2 text-center text-[11px] text-gray-500">
                    ยังไม่มีรายการที่ชำระแล้วของคู่นี้
                  </p>
                ) : (
                  settledHistory.map((item) => (
                    <div
                      key={`settled-${item.id}`}
                      className="flex items-center justify-between rounded border border-gray-700/60 bg-gray-900/60 px-2.5 py-2 text-xs text-gray-400"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-[10px] text-gray-500">
                          {formatDateTime(item)}
                        </p>
                        <p className="truncate text-gray-400">
                          {item.item_name}
                        </p>
                      </div>
                      <span className="shrink-0 font-medium text-gray-400">
                        ฿{formatMoney(item.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 bg-gray-900 p-3">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2.5 text-xs font-bold text-gray-300 transition hover:bg-gray-700"
        >
          ปิดหน้าต่าง
        </button>
      </div>
    </ModalShell>
  );
}