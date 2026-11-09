// src/components/TripHeader.jsx

import { RefreshCw, Check } from "lucide-react";
import { useEffect, useState } from "react";

export default function TripHeader({ totalExpense, perPerson, isSyncing, onRefresh, MEMBERS }) {
  const [syncStatus, setSyncStatus] = useState("idle");

  // 1. ดักจับการเริ่มซิงก์และซิงก์เสร็จ
  useEffect(() => {
    if (isSyncing) {
      setSyncStatus("syncing");
    } else if (!isSyncing && syncStatus === "syncing") {
      setSyncStatus("success");
    }
  }, [isSyncing]); // เอา syncStatus ออกจาก dep จะได้ไม่เผลอไปตัด Timer ตัวเอง

  // 2. ดักจับตอนเป็น success ให้รอ 1.5 วิ แล้วค่อยกลับไป idle
  useEffect(() => {
    if (syncStatus === "success") {
      const timer = setTimeout(() => setSyncStatus("idle"), 1500); // เพิ่มเวลาให้ดูแอนิเมชันทัน
      return () => clearTimeout(timer);
    }
  }, [syncStatus]);

  const formatMoney = (value) =>
    value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <header className="sticky top-0 z-40 bg-gray-900 p-4 text-gray-100 shadow-md">
      {/*  แทรก CSS สำหรับทำแอนิเมชันวาดเส้นขีดถูก */}
      <style>{`
        @keyframes drawCheck {
          0% {
            stroke-dasharray: 50;
            stroke-dashoffset: 50;
          }
          100% {
            stroke-dasharray: 50;
            stroke-dashoffset: 0;
          }
        }
        .animate-draw {
          animation: drawCheck 0.4s ease-out ;
        }
      `}</style>

      <div className="relative mx-auto max-w-md text-center">
        <button
          onClick={onRefresh}
          disabled={syncStatus === "syncing"} 
          // 🧠 ล็อกความกว้าง-สูงให้ปุ่ม (h-10 w-10) ป้องกันปุ่มขยับตอนสลับไอคอน
          className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 transition hover:bg-gray-700"
          title="รีเฟรชข้อมูล"
        >
          {syncStatus === "syncing" ? (
            <RefreshCw size={40} className="animate-spin text-gray-400" />
          ) : syncStatus === "success" ? (
            // 🧠 เรียกใช้ class animate-draw ที่เราสร้างไว้ใน <style>
            <Check size={40} className="text-lime-400 animate-draw" />
          ) : (
            <RefreshCw size={40} className="text-gray-300 transition" />
          )}
        </button>
        <p className="mt-1 text-sm font-light opacity-80">ยอดรวมค่าใช้จ่ายทั้งทริป</p>
        <h1 className="my-1 text-4xl font-bold">฿{formatMoney(totalExpense)}</h1>
        <p className="mt-3 inline-block rounded-full bg-gray-800 px-3 py-1 text-sm text-lime-400">
          หาร {MEMBERS.length} คน = ตกคนละ ฿{formatMoney(perPerson)}
        </p>
      </div>
    </header>
  );
}