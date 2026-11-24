import { CheckCircle, Copy, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BANKS, SWAL_THEME } from "../data/constants";
import {
  formatMoney,
  normalizePromptPay,
  openBankApp,
  validatePromptPay,
} from "../utils/trip";
import Swal from "sweetalert2";
import { dynaura } from "dynaura";
import ModalShell from "./ModalShell";

export default function PaymentModal({
  from,
  to,
  amount,
  memberDetails,
  onUpdateDetails,
  onClose,
  onConfirm,
  isSubmitting,
}) {
  const details = memberDetails[to] || {};
  // const [tab, setTab] = useState(details.promptpay ? "qr" : "bank");
  const [tab, setTab] = useState("qr");
  const normalizedPromptPay = normalizePromptPay(details.promptpay);
  const [form, setForm] = useState({
    promptpay: normalizedPromptPay,
    bankId: details.bankId || "kbank",
    bankAcc: details.bankAcc || "",
  });

  const selectedBank = BANKS.find(
    (b) => b.id === (details.bankId || form.bankId),
  );

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleSaveDetails = () => {
    if (tab === "qr") {
      const validation = validatePromptPay(form.promptpay);
      if (!validation.valid) {
        dynaura.warning({
          title: "เลขพร้อมเพย์ไม่ถูกต้อง",
          description: validation.message,
          duration: 4000,
        });
        return;
      }
      if (!validation.normalized) {
        dynaura.warning({
          title: "กรุณากรอกเลขพร้อมเพย์",
          description: "เว้นวรรคหรือใส่เครื่องหมาย - จะถูกกรองออกอัตโนมัติ",
          duration: 4000,
        });
        return;
      }
      onUpdateDetails(to, { ...form, promptpay: validation.normalized });
    } else {
      onUpdateDetails(to, form);
    }
  };

  const handleConfirmPay = async () => {
    if (isSubmitting) return;
    const result = await Swal.fire({
      ...SWAL_THEME,
      title: `ยืนยันการโอนเงิน`,
      html: `คุณโอนเงิน <strong class="text-2xl text-lime-400">฿${formatMoney(amount)}</strong> ให้ ${to} เรียบร้อยแล้วใช่หรือไม่?`,
      showCancelButton: true,
      confirmButtonText: "โอนเรียบร้อย",
      cancelButtonText: "ยกเลิก",
    });
    if (result.isConfirmed) {
      onConfirm(from, to, amount);
    }
  };

  return (
    <ModalShell
      backdropClassName="bg-gray-950/80"
      panelClassName="max-w-sm"
      onClose={onClose}
    >
        <div className="relative bg-gray-800 p-4 text-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-200"
            aria-label="ปิดหน้าต่าง"
          >
            <X size={20} />
          </button>
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
              {normalizedPromptPay ? (
                <>
                  <div className="mb-4 overflow-hidden rounded-lg bg-white p-2">
                    <img
                      src={`https://promptpay.io/${normalizedPromptPay}/${amount}.png`}
                      alt="PromptPay QR"
                      className="h-48 w-48 object-contain"
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    พร้อมเพย์:{" "}
                    <span className="font-mono text-gray-200">
                      {normalizedPromptPay}
                    </span>
                  </p>
                </>
              ) : (
                <div className="w-full space-y-3">
                  <p className="text-center text-sm text-gray-400">
                    ไม่มีข้อมูลพร้อมเพย์ของ {to}
                  </p>
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
                    placeholder="กรอกเบอร์โทรหรือเลขบัตร..."
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-base focus:border-lime-400 focus:outline-none"
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
                  <div>
                    <button
                      onClick={() =>
                        openBankApp(
                          details.bankAcc,
                          selectedBank?.scheme,
                          "คัดลอกเลขบัญชีแล้ว",
                        )
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-800 py-3 text-sm text-gray-300 transition hover:bg-gray-700"
                    >
                      <Copy size={16} /> ก๊อปเลขบัญชีและเปิดแอปธนาคาร
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
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-base focus:border-lime-400 focus:outline-none"
                  >
                    {BANKS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={form.bankAcc}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    onChange={(e) =>
                      setForm({ ...form, bankAcc: e.target.value.replace(/\D/g, "") })
                    }
                    placeholder="เลขบัญชี..."
                    className="w-full rounded border border-gray-700 bg-gray-800 p-2 text-base focus:border-lime-400 focus:outline-none"
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

          <div className="mt-6">
            <button
              onClick={handleConfirmPay}
              disabled={isSubmitting}
              className={`mx-auto flex w-4/5 items-center justify-center gap-1 rounded-lg py-3 text-sm font-bold text-gray-950 transition ${
                isSubmitting
                  ? "cursor-not-allowed bg-gray-500 shimmer"
                  : "bg-lime-400 hover:bg-lime-300"
              }`}
            >
              <CheckCircle size={16} /> {isSubmitting ? "กำลังบันทึก..." : "ยืนยันการโอน"}
            </button>
          </div>
        </div>
    </ModalShell>
  );
}
