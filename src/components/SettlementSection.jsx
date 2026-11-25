import { ArrowRight, CheckCircle, FileText, History, Users } from "lucide-react";
import { formatMoney } from "../utils/trip";

export default function SettlementSection({
  settlements,
  onOpenPayment,
  onOpenDetails,
  onOpenHistory,
  pendingSettlement,
}) {
  return (
    <section className="rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold text-lime-400">
          <Users size={20} /> สรุปเคลียร์เงิน
        </h2>
        <button
          type="button"
          onClick={onOpenHistory}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-400 transition hover:bg-amber-500 hover:text-gray-950"
          title="ประวัติการชำระ"
          aria-label="ประวัติการชำระ"
        >
          <History size={18} />
        </button>
      </div>
      <div className="space-y-2">
        {settlements.transfers.length === 0 ? (
          <p className="py-2 text-center text-sm text-gray-400">
            ทุกคนเคลียร์เงินครบแล้ว
          </p>
        ) : (
          settlements.transfers.map((transfer) => (
            <div
              key={`${transfer.from}-${transfer.to}`}
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
                  disabled={Boolean(pendingSettlement)}
                  className={`flex flex-1 items-center justify-center gap-1 rounded py-2 text-xs font-bold text-gray-950 shadow-sm transition ${
                    pendingSettlement
                      ? "cursor-not-allowed bg-gray-500 shimmer"
                      : "bg-lime-500 hover:bg-lime-300"
                  }`}
                >
                  <CheckCircle size={14} /> เคลียร์ยอด
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}