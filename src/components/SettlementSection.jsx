import {
  ArrowRight,
  CheckCircle,
  ChevronDown,
  FileText,
  History,
  Users,
} from "lucide-react";
import { useState } from "react";
import { formatMoney } from "../utils/trip";

export default function SettlementSection({
  settlements,
  onOpenPayment,
  onOpenDetails,
  onOpenHistory,
  pendingSettlement,
}) {
  const [isOpen, setIsOpen] = useState(true);
  const transferCount = settlements.transfers.length;

  return (
    <section className="rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-sm">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className="flex cursor-pointer select-none items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <h2 className="flex items-center gap-2 font-bold text-lime-400">
            <Users size={20} /> สรุปเคลียร์เงิน
          </h2>
          {!isOpen && (
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                transferCount > 0
                  ? "border-lime-500/40 bg-lime-500/15 text-lime-400"
                  : "border-gray-700 bg-gray-800 text-gray-400"
              }`}
            >
              {transferCount > 0 ? `${transferCount} รายการ` : "ครบแล้ว"}
            </span>
          )}
          <ChevronDown
            size={18}
            className={`text-gray-400 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenHistory();
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-400 transition hover:bg-amber-500 hover:text-gray-950"
          title="ประวัติการชำระ"
          aria-label="ประวัติการชำระ"
        >
          <History size={18} />
        </button>
      </div>

      <div
        className={`grid transition-[grid-template-rows,opacity,margin] duration-200 ease-out ${
          isOpen
            ? "mt-4 grid-rows-[1fr] opacity-100"
            : "mt-0 grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-2">
            {transferCount === 0 ? (
              <p className="py-2 text-center text-sm text-gray-400">
                ทุกคนเคลียร์เงินครบแล้ว
              </p>
            ) : (
              settlements.transfers.map((transfer) => {
                const pairKey = `${transfer.from}-${transfer.to}`;
                const isPendingPair = pendingSettlement === pairKey;
                return (
                  <div
                    key={pairKey}
                    className="rounded-lg border border-lime-900 bg-gray-800 p-3"
                  >
                    <div className="mb-2 flex justify-between p-2">
                      <div className="flex items-center gap-2 font-medium">
                        <span className="text-gray-100">{transfer.from}</span>
                        <ArrowRight size={16} className="text-gray-400" />
                        <span className="text-gray-100">{transfer.to}</span>
                      </div>
                      <div className="font-bold text-lime-400">
                        ฿{formatMoney(transfer.amount)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenDetails(transfer)}
                        className="flex flex-1 items-center justify-center gap-1 rounded border border-gray-600 bg-gray-900 py-2 text-xs font-medium text-gray-100 shadow-sm transition hover:cursor-pointer hover:scale-102"
                      >
                        <FileText size={14} /> รายละเอียด
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenPayment(transfer)}
                        disabled={isPendingPair}
                        className={`flex flex-1 items-center justify-center gap-1 rounded py-2 text-xs font-bold text-gray-950 shadow-sm transition ${
                          isPendingPair
                            ? "cursor-not-allowed bg-gray-500 shimmer"
                            : "bg-lime-500 hover:bg-lime-300"
                        }`}
                      >
                        <CheckCircle size={14} />{" "}
                        {isPendingPair ? "กำลังบันทึก..." : "เคลียร์ยอด"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
