import { CheckCircle, Copy, Wallet } from "lucide-react";
import { useState } from "react";
import { BANKS, SWAL_THEME } from "../data/constants";
import { formatMoney, openBankApp } from "../utils/trip";
import Swal from "sweetalert2";

export default function PaymentModal({
  from,
  to,
  amount,
  memberDetails,
  onUpdateDetails,
  onClose,
  onConfirm,
}) {
  const details = memberDetails[to] || {};
  const [tab, setTab] = useState(details.promptpay ? "qr" : "bank");
  const [form, setForm] = useState({
    promptpay: details.promptpay || "",
    bankId: details.bankId || "kbank",
    bankAcc: details.bankAcc || "",
  });

  const selectedBank = BANKS.find(
    (b) => b.id === (details.bankId || form.bankId),
  );

  const handleSaveDetails = () => {
    onUpdateDetails(to, form);
  };

  const handleConfirmPay = async () => {
    const result = await Swal.fire({
      ...SWAL_THEME,
      title: `ยืนยันการโอนเงิน`,
      text: `คุณโอนเงิน ฿${formatMoney(amount)} ให้ ${to} เรียบร้อยแล้วใช่หรือไม่?`,
      showCancelButton: true,
      confirmButtonText: "โอนเรียบร้อย",
      cancelButtonText: "ยกเลิก",
    });
    if (result.isConfirmed) {
      onConfirm(from, to, amount);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-sm flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-900 text-gray-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gray-800 p-4 text-center">
          <p className="text-sm text-gray-400">ชำระเงินให้</p>
          <h2 className="text-xl font-bold text-lime-400">{to}</h2>
          <p className="mt-1 text-3xl font-bold text-white">
            ฿{formatMoney(amount)}
          </p>
        </div>

        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setTab("qr")}
            className={`flex-1 py-3 text-sm font-medium transition ${tab === "qr" ? "border-b-2 border-lime-400 text-lime-400" : "text-gray-500 hover:text-gray-300"}`}
          >
            สแกนคิวอาร์
          </button>
          <button
            onClick={() => setTab("bank")}
            className={`flex-1 py-3 text-sm font-medium transition ${tab === "bank" ? "border-b-2 border-lime-400 text-lime-400" : "text-gray-500 hover:text-gray-300"}`}
          >
            คัดลอกบัญชี
          </button>
        </div>

        <div className="p-5">
          {tab === "qr" && (
            <div className="flex flex-col items-center">
              {details.promptpay ? (
                <>
                  <div className="mb-4 overflow-hidden rounded-lg bg-white p-2">
                    <img
                      src={`https://promptpay.io/${details.promptpay}/${amount}.png`}
                      alt="PromptPay QR"
                      className="h-48 w-48 object-contain"
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    พร้อมเพย์:{" "}
                    <span className="font-mono text-gray-200">
                      {details.promptpay}
                    </span>
                  </p>
                </>
              ) : (
                <div className="w-full space-y-3">
                  <p className="text-center text-sm text-gray-400">
                    ไม่มีข้อมูลพร้อมเพย์ของ {to}
                  </p>
                  <input
                    type="text"
                    value={form.promptpay}
                    onChange={(e) =>
                      setForm({ ...form, promptpay: e.target.value })
                    }
                    placeholder="กรอกเบอร์โทรหรือเลขบัตร..."
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-sm focus:border-lime-400 focus:outline-none"
                  />
                  <button
                    onClick={handleSaveDetails}
                    className="w-full rounded bg-gray-700 py-2 text-sm font-bold hover:bg-gray-600 transition"
                  >
                    บันทึกและสร้าง QR
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "bank" && (
            <div className="flex flex-col">
              {details.bankAcc ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-gray-800 bg-gray-800/50 p-4 text-center">
                    <p className="text-xs text-gray-400">
                      {selectedBank?.name}
                    </p>
                    <p className="font-mono text-lg tracking-wider text-gray-100">
                      {details.bankAcc}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        openBankApp(
                          details.bankAcc,
                          selectedBank?.scheme,
                          "คัดลอกเลขบัญชีแล้ว",
                        )
                      }
                      className="flex flex-col items-center gap-1 rounded-lg border border-gray-700 bg-gray-800 py-3 text-xs text-gray-300 transition hover:bg-gray-700"
                    >
                      <Copy size={16} /> 1. ก๊อปเลขบัญชี
                    </button>
                    <button
                      onClick={() =>
                        openBankApp(
                          amount.toString(),
                          selectedBank?.scheme,
                          "คัดลอกยอดเงินแล้ว",
                        )
                      }
                      className="flex flex-col items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 py-3 text-xs text-sky-400 transition hover:bg-sky-500/20"
                    >
                      <Wallet size={16} /> 2. ก๊อปยอดเงิน
                    </button>
                  </div>
                  <p className="text-center text-[10px] text-gray-500">
                    *เมื่อกดปุ่ม ระบบจะพยายามเปิดแอปธนาคารให้อัตโนมัติ
                  </p>
                </div>
              ) : (
                <div className="w-full space-y-3">
                  <p className="text-center text-sm text-gray-400">
                    ไม่มีข้อมูลบัญชีของ {to}
                  </p>
                  <select
                    value={form.bankId}
                    onChange={(e) =>
                      setForm({ ...form, bankId: e.target.value })
                    }
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-sm focus:border-lime-400 focus:outline-none"
                  >
                    {BANKS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={form.bankAcc}
                    onChange={(e) =>
                      setForm({ ...form, bankAcc: e.target.value })
                    }
                    placeholder="เลขบัญชี..."
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-sm focus:border-lime-400 focus:outline-none"
                  />
                  <button
                    onClick={handleSaveDetails}
                    className="w-full rounded bg-gray-700 py-2 text-sm font-bold hover:bg-gray-600 transition"
                  >
                    บันทึกข้อมูลบัญชี
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-700 bg-gray-800 py-3 text-sm font-bold text-gray-300 hover:bg-gray-700 transition"
            >
              ปิดหน้าต่าง
            </button>
            <button
              onClick={handleConfirmPay}
              className="flex-[2] flex items-center justify-center gap-1 rounded-lg bg-lime-400 py-3 text-sm font-bold text-gray-950 hover:bg-lime-300 transition"
            >
              <CheckCircle size={16} /> ยืนยันโอนสำเร็จ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
