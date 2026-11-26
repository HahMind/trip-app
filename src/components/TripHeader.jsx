import { Check, ChevronRight, RefreshCw, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatMoney } from "../utils/trip";
import { dynaura } from "dynaura";

export default function TripHeader({
  totalExpense,
  isSyncing,
  onRefresh,
  MEMBERS,
  onOpenMemberModal,
  onOpenTripSummary,
  isOffline,
}) {
  const [syncStatus, setSyncStatus] = useState("idle");
  const [displayTotal, setDisplayTotal] = useState(0);
  const [replayCount, setReplayCount] = useState(0);
  const animatedValueRef = useRef(0);
  const prevSyncingRef = useRef(isSyncing);
  const manualSyncRef = useRef(false);

  useEffect(() => {
    const wasSyncing = prevSyncingRef.current;
    prevSyncingRef.current = isSyncing;

    if (isSyncing) {
      setSyncStatus("syncing");
      return;
    }

    if (wasSyncing) {
      setSyncStatus("success");
      if (manualSyncRef.current) {
        manualSyncRef.current = false;
        animatedValueRef.current = 0;
        setDisplayTotal(0);
        setReplayCount((count) => count + 1);
      }
      const timer = setTimeout(() => setSyncStatus("idle"), 1500);
      return () => clearTimeout(timer);
    }
  }, [isSyncing]);

  useEffect(() => {
    const target = Number(totalExpense) || 0;
    const start = animatedValueRef.current;

    if (Math.abs(target - start) < 0.005) {
      animatedValueRef.current = target;
      setDisplayTotal(target);
      return;
    }

    const duration = 650;
    const startTime = performance.now();
    let frameId;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // easeOutCubic: วิ่งเร็วช่วงต้นแล้วชะลอนุ่มๆ ตอนเข้าเป้า
      const eased = 1 - (1 - progress) ** 3;
      const current = start + (target - start) * eased;

      animatedValueRef.current = current;
      setDisplayTotal(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        animatedValueRef.current = target;
        setDisplayTotal(target);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [totalExpense, replayCount]);

  return (
    <header className="sticky top-0 z-30 bg-gray-900 px-4 pb-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] text-gray-100 shadow-md">
      <div className="relative mx-auto max-w-md text-center">
        <button
          onClick={onOpenMemberModal}
          className="absolute left-0 top-5 flex h-10 items-center justify-center gap-1.5 rounded-full bg-gray-800 px-3 transition hover:bg-gray-700"
        >
          <Users size={20} className="text-lime-400" />
          <span className="text-base font-bold text-gray-300">
            {MEMBERS.length}
          </span>
        </button>
        <button
          onClick={() => {
            if (isOffline) {
              dynaura.warning({
                title: "ออฟไลน์",
                description: "ไม่สามารถรีเฟรชขณะออฟไลน์ได้",
                duration: 4000,
              });
              return;
            }
            manualSyncRef.current = true;
            onRefresh();
          }}
          disabled={syncStatus === "syncing" || isOffline}
          className={`absolute right-1 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-800 transition hover:bg-gray-700 ${
            isOffline ? "cursor-not-allowed opacity-50" : ""
          }`}
        >
          {syncStatus === "syncing" ? (
            <RefreshCw size={26} className="animate-spin text-gray-400" />
          ) : syncStatus === "success" ? (
            <Check size={26} className="text-lime-400" />
          ) : (
            <RefreshCw size={26} className="text-gray-300" />
          )}
        </button>
        <button
          type="button"
          onClick={onOpenTripSummary}
          aria-label="ดูสรุปยอดรายสมาชิก"
          className="group inline-flex max-w-[calc(100%-8.25rem)] cursor-pointer flex-col items-center rounded-xl border border-transparent px-3.5 py-1 transition hover:border-gray-700 hover:bg-gray-800 active:scale-[0.98]"
        >
          <span className="mt-0.5 flex items-center justify-center gap-1 text-sm font-light opacity-80">
            <span>ยอดรวมค่าใช้จ่ายทั้งทริป</span>
            <ChevronRight
              size={14}
              className="opacity-70 transition-transform group-hover:translate-x-0.5"
            />
          </span>
          <span className="my-0.5 block text-[clamp(1.65rem,7.5vw,2.25rem)] font-bold leading-tight tabular-nums">
            ฿{formatMoney(displayTotal)}
          </span>
        </button>
      </div>
    </header>
  );
}
