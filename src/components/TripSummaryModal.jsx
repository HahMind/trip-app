import { Wallet, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { formatMoney } from "../utils/trip";

export default function TripSummaryModal({
  summaries,
  totalExpense,
  onClose,
}) {
  const dialogRef = useRef(null);
  const pressedOutsideRef = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!dialog.open) {
      dialog.showModal();
    }

    if ("closedBy" in HTMLDialogElement.prototype) {
      return undefined;
    }

    const isOutsideDialog = (event) => {
      const rect = dialog.getBoundingClientRect();
      return (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      );
    };

    const handlePointerDown = (event) => {
      pressedOutsideRef.current = isOutsideDialog(event);
    };

    const handlePointerUp = (event) => {
      if (pressedOutsideRef.current && isOutsideDialog(event)) {
        dialog.close();
      }
      pressedOutsideRef.current = false;
    };

    dialog.addEventListener("pointerdown", handlePointerDown);
    dialog.addEventListener("pointerup", handlePointerUp);

    return () => {
      dialog.removeEventListener("pointerdown", handlePointerDown);
      dialog.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const handleRequestClose = () => {
    const dialog = dialogRef.current;
    if (dialog?.open) {
      dialog.close();
      return;
    }
    onClose();
  };

  const handleDialogClose = () => {
    if (dialogRef.current) {
      dialogRef.current.returnValue = "";
    }
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby={titleId}
      onClose={handleDialogClose}
      className="trip-summary-dialog m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-xl border border-gray-700 bg-gray-900 p-0 text-gray-100 shadow-2xl open:flex open:flex-col sm:max-w-xl"
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-800 bg-gray-800 p-4">
        <div className="min-w-0">
          <h1
            id={titleId}
            className="flex items-center gap-2 text-base font-bold text-lime-400 sm:text-lg"
          >
            <Wallet size={20} className="shrink-0" />
            <span>สรุปยอดรายสมาชิก</span>
          </h1>
          <p className="mt-1 text-xs text-gray-400">
            ยอดรวมทั้งทริป{" "}
            <span className="font-bold tabular-nums text-gray-100">
              ฿{formatMoney(totalExpense)}
            </span>{" "}
            • {summaries.length} คน
          </p>
        </div>
        <button
          type="button"
          onClick={handleRequestClose}
          className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:text-gray-100"
          aria-label="ปิดหน้าต่าง"
        >
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {summaries.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            ยังไม่มีสมาชิกในทริป
          </p>
        ) : (
          summaries.map(({ member, totalPaid, toReceive, toPay }) => {
            const hasReceive = toReceive > 0.005;
            const hasPay = toPay > 0.005;

            return (
              <div
                key={member}
                className="rounded-xl border border-gray-700 bg-gray-800 p-3.5"
              >
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-base font-bold text-gray-100">
                    {member}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div className="col-span-2 flex items-center justify-between gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 sm:col-span-1 sm:block">
                    <p className="text-xs text-gray-400">จ่ายทั้งหมด</p>
                    <p className="text-sm font-bold tabular-nums text-gray-100 sm:mt-0.5 sm:text-base">
                      ฿{formatMoney(totalPaid)}
                    </p>
                  </div>

                  <div
                    className={`rounded-lg border px-3 py-2 ${
                      hasReceive
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : "border-gray-700 bg-gray-900"
                    }`}
                  >
                    <p className="text-xs text-gray-400">รอคนอื่นคืน</p>
                    <p
                      className={`mt-0.5 text-sm font-bold tabular-nums sm:text-base ${
                        hasReceive ? "text-emerald-500" : "text-gray-400"
                      }`}
                    >
                      ฿{formatMoney(toReceive)}
                    </p>
                  </div>

                  <div
                    className={`rounded-lg border px-3 py-2 ${
                      hasPay
                        ? "border-red-500/30 bg-red-500/10"
                        : "border-gray-700 bg-gray-900"
                    }`}
                  >
                    <p className="text-xs text-gray-400">ต้องคืนคนอื่น</p>
                    <p
                      className={`mt-0.5 text-sm font-bold tabular-nums sm:text-base ${
                        hasPay ? "text-red-500" : "text-gray-400"
                      }`}
                    >
                      ฿{formatMoney(toPay)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="shrink-0 border-t border-gray-800 bg-gray-900 p-3">
        <button
          type="button"
          onClick={handleRequestClose}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2.5 text-xs font-bold text-gray-300 transition hover:bg-gray-700"
        >
          ปิดหน้าต่าง
        </button>
      </div>
    </dialog>
  );
}
