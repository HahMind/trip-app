import { ArrowRight, CheckCircle, Plus, Trash2, Users } from "lucide-react";

export default function SettlementCard({
  settlements,
  onSettle,
  handleAddMenber,
  handleRemoveMember,
}) {
  const formatMoney = (value) =>
    value.toLocaleString(undefined, { minimumFractionDigits: 2 });

  return (
    <section className="rounded-xl border border-gray-200 bg-gray-300 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between font-bold text-green-600">
        <div className="flex items-center gap-2">
          <Users size={20} /> <h2>สรุปเคลียร์เงิน</h2>
        </div>
        {/* ปุ่มเพิ่มสมาชิกใหม่ */}
        <button
          type="button"
          onClick={handleAddMenber}
          className="flex items-center gap-1 rounded bg-green-500 px-2 py-1 text-xs text-white shadow-sm transition hover:bg-green-600"
        >
          <Plus size={14} /> เพิ่มสมาชิก
        </button>
      </div>
      <div className="mb-6 space-y-2">
        {settlements.transfers.length === 0 ? (
          <p className="py-2 text-center text-sm text-gray-400">
            ทุกคนเคลียร์เงินครบแล้ว 🎉
          </p>
        ) : (
          settlements.transfers.map((transfer) => (
            <div
              key={`${transfer.from}-${transfer.to}`}
              className="rounded-lg border border-green-100 bg-green-50 p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium">
                  <span className="text-red-500">{transfer.from}</span>
                  <ArrowRight size={16} className="text-gray-400" />
                  <span className="text-green-600">{transfer.to}</span>
                </div>
                <div className="font-bold text-green-700">
                  ฿{formatMoney(transfer.amount)}
                </div>
              </div>
              <button
                onClick={() =>
                  onSettle(transfer.from, transfer.to, transfer.amount)
                }
                className="flex w-full items-center justify-center gap-1 rounded bg-green-500 py-2 text-xs text-white shadow-sm transition hover:bg-green-600"
              >
                <CheckCircle size={14} /> เคลียร์ยอดนี้
              </button>
            </div>
          ))
        )}
      </div>
      <hr className="my-4 border-gray-400" />
      <div className="space-y-3">
        <p className="mb-2 text-xs font-bold text-gray-500">
          สรุปยอดสุทธิแต่ละคน
        </p>
        {settlements.balances.map((balance) => (
          <div
            key={balance.member}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2 font-medium text-gray-700">
              <span>{balance.member}</span>
              {/* ปุ่มลบสมาชิก */}
              <button
                type="button"
                onClick={() => handleRemoveMember(balance.member)}
                className="rounded p-1 text-red-500 transition hover:bg-red-100 hover:text-red-700"
                title={`ลบ ${balance.member}`}
                aria-label={`ลบ ${balance.member}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="text-right">
              {balance.balance > 0.01 ? (
                <span className="font-bold text-green-600">
                  (ได้คืน ฿{formatMoney(balance.balance)})
                </span>
              ) : balance.balance < -0.01 ? (
                <span className="font-bold text-red-500">
                  (ติดลบ ฿{formatMoney(Math.abs(balance.balance))})
                </span>
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
