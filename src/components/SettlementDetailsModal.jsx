import {
  ArrowDownUp,
  ArrowRight,
  ChevronDown,
  FileText,
  Info,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "../utils/trip";
import ModalShell from "./ModalShell";

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const parseEventTime = (item) => {
  let dateScore = 0;
  if (typeof item.expense_date === "string" && item.expense_date.includes("/")) {
    const [day, month, year] = item.expense_date.split("/").map(Number);
    if (day && month && year) {
      dateScore = new Date(year, month - 1, day).getTime();
    }
  }
  const createdScore = item.created_at
    ? new Date(item.created_at).getTime()
    : 0;
  const numericId = Number(item.id) || 0;

  return {
    dateScore: Number.isFinite(dateScore) ? dateScore : 0,
    createdScore:
      Number.isFinite(createdScore) && createdScore > 0
        ? createdScore
        : numericId,
    numericId,
  };
};

const formatTimeLabel = (createdAt) => {
  if (!createdAt) return "";
  const dateObj = new Date(createdAt);
  if (Number.isNaN(dateObj.getTime())) return "";
  return `${dateObj.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })} น.`;
};

export default function SettlementDetailsModal({ transfer, onClose }) {
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState("asc"); // "asc" = เก่า -> ใหม่, "desc" = ใหม่ -> เก่า

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const {
    from,
    to,
    amount,
    allToForFromItems = [],
    allFromForToItems = [],
    allToForFromTotal = 0,
    allFromForToTotal = 0,
    settledAdjustment = 0,
    settledHistory = [],
  } = transfer;

  // สร้าง Chronological Statement พร้อมคำนวณยอดสะสมหลังแต่ละรายการ
  const statementRows = useMemo(() => {
    const rawEvents = [
      ...allToForFromItems.map((item) => ({
        key: `exp-pos-${item.id}`,
        kind: "positive",
        item,
        signedDelta: roundMoney(item.shareAmount || 0),
        time: parseEventTime(item),
      })),
      ...allFromForToItems.map((item) => ({
        key: `exp-neg-${item.id}`,
        kind: "negative",
        item,
        signedDelta: -roundMoney(item.shareAmount || 0),
        time: parseEventTime(item),
      })),
      ...settledHistory.map((item) => {
        const isFromToTo = item.item_name.includes(`${from} -> ${to}`);
        const settledAmt = roundMoney(item.amount || 0);
        return {
          key: `settle-${item.id}`,
          kind: "settlement",
          isFromToTo,
          item,
          signedDelta: isFromToTo ? -settledAmt : settledAmt,
          time: parseEventTime(item),
        };
      }),
    ].sort((a, b) => {
      if (a.time.dateScore !== b.time.dateScore) {
        return a.time.dateScore - b.time.dateScore;
      }
      if (a.time.createdScore !== b.time.createdScore) {
        return a.time.createdScore - b.time.createdScore;
      }
      if (a.kind !== b.kind) {
        return a.kind === "settlement" ? 1 : -1;
      }
      return a.time.numericId - b.time.numericId;
    });

    let running = 0;
    const withBalance = rawEvents.map((event) => {
      running = roundMoney(running + event.signedDelta);
      return {
        ...event,
        runningBalance: running,
      };
    });

    return sortOrder === "asc" ? withBalance : [...withBalance].reverse();
  }, [allToForFromItems, allFromForToItems, settledHistory, from, to, sortOrder]);

  return (
    <ModalShell
      backdropClassName="bg-gray-950/80"
      panelClassName="max-h-[88vh] max-w-md"
      onClose={onClose}
    >
      {/* ส่วนหัว */}
      <div className="flex items-start justify-between border-b border-gray-800 bg-gray-800 p-4">
        <div>
          <div className="flex items-center gap-2 text-lg font-bold text-gray-100">
            <span>{from}</span>
            <ArrowRight size={18} className="text-lime-400" />
            <span>{to}</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            ยอดสุทธิหลังหักลบ:{" "}
            <span className="text-sm font-bold text-lime-400">
              ฿{formatMoney(amount)}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-700 hover:text-gray-200 focus:outline-none"
          aria-label="ปิดหน้าต่าง"
        >
          <X size={20} />
        </button>
      </div>

      {/* เนื้อหา */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {/* แบบที่ 1: การ์ดสรุปสมการ 3 ช่อง */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-2.5">
            <p className="line-clamp-1 text-[11px] font-medium text-gray-300">
              ส่วนที่{" "}
              <span className="text-[13px] font-bold text-gray-100">{to}</span>{" "}
              จ่ายไป
            </p>
            <p className="mt-1 text-sm font-bold tabular-nums text-emerald-400">
              ฿{formatMoney(allToForFromTotal)}
            </p>
            <p className="mt-0.5 text-[10px] text-gray-400">
              {allToForFromItems.length} รายการ
            </p>
          </div>

          <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-2.5">
            <p className="line-clamp-1 text-[11px] font-medium text-gray-300">
              ส่วนที่{" "}
              <span className="text-[13px] font-bold text-gray-100">{from}</span>{" "}
              จ่ายไป
            </p>
            <p className="mt-1 text-sm font-bold tabular-nums text-rose-400">
              ฿{formatMoney(allFromForToTotal)}
            </p>
            <p className="mt-0.5 text-[10px] text-gray-400">
              {allFromForToItems.length} รายการ
            </p>
          </div>

          <div className="rounded-xl border border-blue-500/35 bg-blue-500/10 p-2.5">
            <p className="line-clamp-1 text-[11px] font-medium text-gray-300">
              โอนเคลียร์แล้ว
            </p>
            <p className="mt-1 text-sm font-bold tabular-nums text-blue-400">
              ฿{formatMoney(Math.abs(settledAdjustment))}
            </p>
            <p className="mt-0.5 text-[10px] text-gray-400">
              {settledHistory.length} ครั้ง
            </p>
          </div>
        </div>

        {/* แถบสมการคำนวณสุทธิให้เห็นภาพรวมทันที */}
        <div className="flex flex-wrap items-center justify-between gap-1 rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2 text-[11px] tabular-nums">
          <span className="text-gray-400">สรุปสมการ:</span>
          <div className="flex flex-wrap items-center gap-1 font-semibold">
            <span className="text-emerald-400">
              ฿{formatMoney(allToForFromTotal)}
            </span>
            <span className="text-gray-400">−</span>
            <span className="text-rose-400">
              ฿{formatMoney(allFromForToTotal)}
            </span>
            {Math.abs(settledAdjustment) > 0.005 && (
              <>
                <span className="text-gray-400">
                  {settledAdjustment > 0 ? "+" : "−"}
                </span>
                <span className="text-blue-400">
                  ฿{formatMoney(Math.abs(settledAdjustment))}
                </span>
              </>
            )}
            <span className="text-gray-400">=</span>
            <span className="font-bold text-lime-400">
              ฿{formatMoney(amount)}
            </span>
          </div>
        </div>

        {/* แจ้งเตือนอธิบายเมื่อมียอดเครดิตค้างจากรายการเก่าที่ถูกลบ */}
        {settledAdjustment > 0.005 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] leading-relaxed text-gray-300">
            <Info size={15} className="mt-0.5 shrink-0 text-amber-400" />
            <p>
              มีประวัติ{" "}
              <span className="font-bold text-gray-100">
                {to} โอนให้ {from} ไว้ ฿{formatMoney(settledAdjustment)}
              </span>{" "}
              (อาจเกิดจากการลบรายการเก่าที่เคยเคลียร์ยอดไปแล้ว หากต้องการล้างยอดนี้ให้กด{" "}
              <span className="font-semibold text-amber-400">"กู้คืน"</span>{" "}
              ในหน้าประวัติการชำระ)
            </p>
          </div>
        )}

        {/* แบบที่ 2: Accordion กดเปิดดู Statement เรียงตามเวลา */}
        <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
          <button
            type="button"
            aria-expanded={isStatementOpen}
            onClick={() => setIsStatementOpen((prev) => !prev)}
            className="statement-accordion-trigger flex w-full items-center justify-between px-3.5 py-3 text-left transition hover:bg-gray-700 focus:outline-none"
          >
            <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
              <FileText size={15} className="text-lime-400" />
              <span>ดู Statement รายการทั้งหมด ({statementRows.length})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400">
                {isStatementOpen ? "ซ่อน" : "แสดง"}
              </span>
              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform duration-200 ${
                  isStatementOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          <div
            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
              isStatementOpen
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div className="statement-accordion-body border-t border-gray-700 bg-gray-900/50 p-3">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">
                    แสดงยอดสะสมตามลำดับรายการ
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-[10px] font-medium text-gray-300 transition hover:bg-gray-700 hover:text-lime-400 focus:outline-none"
                  >
                    <ArrowDownUp size={11} />
                    <span>{sortOrder === "asc" ? "เก่า → ใหม่" : "ใหม่ → เก่า"}</span>
                  </button>
                </div>

                {statementRows.length === 0 ? (
                  <p className="py-4 text-center text-xs text-gray-400">
                    ไม่มีรายการในประวัติ
                  </p>
                ) : (
                  <div className="space-y-2">
                    {statementRows.map((row) => {
                      const timeText = formatTimeLabel(row.item.created_at);
                      const isPositive = row.signedDelta > 0;
                      const absDelta = Math.abs(row.signedDelta);

                      let badgeClass = "";
                      if (row.kind === "positive") {
                        badgeClass =
                          "border-emerald-500/35 bg-emerald-500/10 text-emerald-400";
                      } else if (row.kind === "negative") {
                        badgeClass =
                          "border-rose-500/35 bg-rose-500/10 text-rose-400";
                      } else {
                        badgeClass =
                          "border-blue-500/35 bg-blue-500/10 text-blue-400";
                      }

                      const absRunning = Math.abs(row.runningBalance);
                      let runningText = "เคลียร์ครบ (฿0.00)";
                      if (absRunning > 0.005) {
                        runningText =
                          row.runningBalance > 0
                            ? `${from} → ${to} ฿${formatMoney(absRunning)}`
                            : `${to} → ${from} ฿${formatMoney(absRunning)}`;
                      }

                      return (
                        <div
                          key={row.key}
                          className="rounded-lg border border-gray-700 bg-gray-900 p-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-400">
                                <span>
                                  {row.item.expense_date}
                                  {timeText ? ` • ${timeText}` : ""}
                                </span>
                                <span
                                  className={`rounded border px-1.5 py-0.5 font-medium ${badgeClass}`}
                                >
                                  {row.kind === "settlement" ? (
                                    "โอนเคลียร์ยอด"
                                  ) : (
                                    <>
                                      ส่วนที่{" "}
                                      <strong className="text-[11px] font-bold">
                                        {row.kind === "positive" ? to : from}
                                      </strong>{" "}
                                      จ่ายไป
                                    </>
                                  )}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-xs font-semibold text-gray-100">
                                {row.item.item_name}
                              </p>
                              {row.kind !== "settlement" && (
                                <p className="mt-0.5 text-[10px] text-gray-400">
                                  หาร {row.item.splitCount} คน (ยอดเต็ม ฿
                                  {formatMoney(row.item.amount)})
                                </p>
                              )}
                            </div>

                            <div className="shrink-0 text-right tabular-nums">
                              <p
                                className={`text-xs font-bold ${
                                  row.kind === "settlement"
                                    ? "text-blue-400"
                                    : isPositive
                                      ? "text-emerald-400"
                                      : "text-rose-400"
                                }`}
                              >
                                ฿{formatMoney(absDelta)}
                              </p>
                              <p className="mt-1 text-[10px] text-gray-400">
                                สะสม:{" "}
                                <span className="font-medium text-gray-200">
                                  {runningText}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ส่วนล่าง */}
      <div className="border-t border-gray-800 bg-gray-900 p-3">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg bg-gray-800 py-2.5 text-sm font-bold text-gray-100 transition hover:bg-gray-700 focus:outline-none"
        >
          ปิดหน้าต่าง
        </button>
      </div>
    </ModalShell>
  );
}
