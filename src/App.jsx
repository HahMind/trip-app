import {
  ArrowRight,
  CheckCircle,
  Edit2,
  History,
  Receipt,
  Users,
  WifiOff,
  Loader2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Swal from "sweetalert2";
import { CATEGORIES, HISTORY_CATEGORY, SWAL_THEME } from "./data/constants";
import {
  formatForDB,
  formatMoney,
  getStoredMemberDetails,
  getStoredMembers,
  getTodayISO,
  parseForUI,
} from "./utils/trip";
import ExpenseList from "./components/ExpenseList";
import HistoryModal from "./components/HistoryModal";
import MemberModal from "./components/MemberModal";
import PaymentModal from "./components/PaymentModal";
import SplitModal from "./components/SplitModal";
import TripHeader from "./components/TripHeader";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
const version_number = "2.1.6-Overscroll-Bounce";

export default function App() {
  const [MEMBERS, setMembers] = useState(getStoredMembers);
  const [memberDetails, setMemberDetails] = useState(getStoredMemberDetails);

  const [paidBy, setPaidBy] = useState(() => {
    const saved = localStorage.getItem("defaultPaidBy");
    return saved && MEMBERS.includes(saved) ? saved : MEMBERS[0] || "";
  });

  const [expenses, setExpenses] = useState([]); // เริ่มด้วย Array ว่าง รอโหลดจาก DB
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [collapsedDates, setCollapsedDates] = useState({});
  const [showHistory, setShowHistory] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [activePayment, setActivePayment] = useState(null);
  const [activeSplitExpense, setActiveSplitExpense] = useState(null);
  const [editId, setEditId] = useState(null);
  const [swipedId, setSwipedId] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);

  const [date, setDate] = useState(getTodayISO());
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);

  const [odometerStart, setOdometerStart] = useState(
    () => localStorage.getItem("lastOdometerEnd") || "",
  );
  const [odometerEnd, setOdometerEnd] = useState("");

  const [isPressing, setIsPressing] = useState(false);
  const pressTimer = useRef(null);
  const hasScrolled = useRef(false);

  // ดึงรายชื่อจาก Database ตรงๆ
  const refreshMembers = useCallback(async () => {
    if (!navigator.onLine) return;
    const { data, error } = await supabase
      .from("trip_members")
      .select("name")
      .order("created_at", { ascending: true });
    if (data && data.length > 0) {
      const fetchedMembers = data.map((d) => d.name);
      setMembers(fetchedMembers);
      localStorage.setItem("tripMembers", JSON.stringify(fetchedMembers));
      setPaidBy((prev) =>
        fetchedMembers.includes(prev) ? prev : fetchedMembers[0],
      );
    }
  }, []);

  // ดึงรายจ่ายจาก Database ตรงๆ
  const refreshExpenses = useCallback(async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    const { data, error } = await supabase
      .from("trip_expenses")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setExpenses(data);
    }
    setTimeout(() => setIsSyncing(false), 500);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // พอกลับมาออนไลน์ ให้โหลดข้อมูลใหม่ทั้งหมด
      Promise.all([refreshMembers(), refreshExpenses()]).then(() =>
        setLoading(false),
      );
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (navigator.onLine) {
      Promise.all([refreshMembers(), refreshExpenses()]).then(() =>
        setLoading(false),
      );
    } else {
      setLoading(false); // ถ้าเปิดมาแล้วออฟไลน์เลย ให้เลิกหมุน จะได้โชว์หน้า Offline
    }

    // ตั้งค่า Realtime Subscription
    const expenseSub = supabase
      .channel("trip_expenses_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_expenses" },
        refreshExpenses,
      )
      .subscribe();
    const memberSub = supabase
      .channel("trip_members_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_members" },
        refreshMembers,
      )
      .subscribe();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      supabase.removeChannel(expenseSub);
      supabase.removeChannel(memberSub);
    };
  }, [refreshExpenses, refreshMembers]);

  const handleAppClick = () => {
    if (swipedId) setSwipedId(null);
  };

  // บันทึกตรงเข้า Database
  const handleAddMember = async (name, details) => {
    if (isOffline)
      return Swal.fire({
        ...SWAL_THEME,
        icon: "warning",
        title: "ออฟไลน์",
        text: "ไม่สามารถเพิ่มสมาชิกขณะออฟไลน์ได้",
      });
    if (!MEMBERS.includes(name)) {
      const { error } = await supabase.from("trip_members").insert([{ name }]);
      if (error)
        return Swal.fire({
          ...SWAL_THEME,
          icon: "error",
          title: "เพิ่มไม่สำเร็จ",
          text: error.message,
        });

      await refreshMembers(); // โหลดใหม่ทันที
      if (details) handleUpdateMemberDetails(name, details, false);
      Swal.fire({
        ...SWAL_THEME,
        icon: "success",
        title: `เพิ่ม ${name} สำเร็จ`,
        timer: 400,
        showConfirmButton: false,
      });
    }
  };

  const handleUpdateMemberDetails = (name, details, showToast = true) => {
    const updated = { ...memberDetails, [name]: details };
    setMemberDetails(updated);
    localStorage.setItem("memberDetails", JSON.stringify(updated));
    if (showToast)
      Swal.fire({
        ...SWAL_THEME,
        icon: "success",
        title: "บันทึกข้อมูลเรียบร้อย",
        timer: 700,
        showConfirmButton: false,
      });
  };

  const handleRemoveMember = async (name, hasDebt) => {
    if (isOffline)
      return Swal.fire({
        ...SWAL_THEME,
        icon: "warning",
        title: "ออฟไลน์",
        text: "ไม่สามารถลบสมาชิกขณะออฟไลน์ได้",
      });
    if (MEMBERS.length <= 1)
      return Swal.fire({
        ...SWAL_THEME,
        icon: "warning",
        title: "ลบไม่ได้",
        text: "ต้องมีสมาชิกอย่างน้อย 1 คน",
      });
    if (hasDebt)
      return Swal.fire({
        ...SWAL_THEME,
        icon: "error",
        title: "ลบไม่ได้",
        text: `${name} มียอดค้างชำระอยู่`,
      });

    const result = await Swal.fire({
      ...SWAL_THEME,
      title: "ยืนยันการลบ",
      text: `ลบ ${name} ออกจากทริป?`,
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });
    if (!result.isConfirmed) return;

    const { error } = await supabase
      .from("trip_members")
      .delete()
      .eq("name", name);
    if (error)
      return Swal.fire({
        ...SWAL_THEME,
        icon: "error",
        title: "ลบไม่สำเร็จ",
        text: error.message,
      });

    await refreshMembers(); // โหลดใหม่ทันที
    Swal.fire({
      ...SWAL_THEME,
      icon: "success",
      title: `ลบ ${name} แล้ว`,
      timer: 500,
      showConfirmButton: false,
    });
  };

  const handleAddExpense = async (event) => {
    event.preventDefault();
    if (isOffline)
      return Swal.fire({
        ...SWAL_THEME,
        icon: "warning",
        title: "ออฟไลน์",
        text: "ไม่สามารถบันทึกรายการขณะออฟไลน์ได้",
      });

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0)
      return Swal.fire({
        ...SWAL_THEME,
        icon: "warning",
        title: "กรุณากรอกจำนวนเงิน",
      });

    const payload = {
      expense_date: formatForDB(date),
      item_name: item.trim() || category,
      amount: numericAmount,
      category,
      paid_by: paidBy,
      split_between: [paidBy],
      odometer_start:
        category === "ค่าน้ำมัน" && odometerStart
          ? Number(odometerStart)
          : null,
      odometer_end:
        category === "ค่าน้ำมัน" && odometerEnd ? Number(odometerEnd) : null,
    };

    if (editId) {
      const { error } = await supabase
        .from("trip_expenses")
        .update(payload)
        .eq("id", editId);
      if (error)
        return Swal.fire({
          ...SWAL_THEME,
          icon: "error",
          title: "แก้ไขไม่สำเร็จ",
          text: error.message,
        });
      setEditId(null);
      setHighlightedId(editId);
      setTimeout(() => setHighlightedId(null), 2500);
    } else {
      const { error } = await supabase.from("trip_expenses").insert([payload]);
      if (error)
        return Swal.fire({
          ...SWAL_THEME,
          icon: "error",
          title: "บันทึกไม่สำเร็จ",
          text: error.message,
        });
    }

    await refreshExpenses(); // โหลดใหม่ทันที
    setItem("");
    setAmount("");
    setCategory(CATEGORIES[0]);
    Swal.fire({
      ...SWAL_THEME,
      icon: "success",
      title: editId ? "แก้ไขสำเร็จ" : "บันทึกสำเร็จ",
      timer: 1000,
      showConfirmButton: false,
    });
  };

  const handleUpdateSplit = async (id, newSplit) => {
    if (isOffline)
      return Swal.fire({
        ...SWAL_THEME,
        icon: "warning",
        title: "ออฟไลน์",
        text: "ไม่สามารถแก้ไขการหารขณะออฟไลน์ได้",
      });
    const { error } = await supabase
      .from("trip_expenses")
      .update({ split_between: newSplit })
      .eq("id", id);
    if (error)
      return Swal.fire({
        ...SWAL_THEME,
        icon: "error",
        title: "อัปเดตไม่สำเร็จ",
        text: error.message,
      });
    await refreshExpenses();
  };

  const cancelEdit = () => {
    setEditId(null);
    setItem("");
    setAmount("");
    setCategory(CATEGORIES[0]);
  };

  const handleDelete = async (id) => {
    if (isOffline)
      return Swal.fire({
        ...SWAL_THEME,
        icon: "warning",
        title: "ออฟไลน์",
        text: "ไม่สามารถลบรายการขณะออฟไลน์ได้",
      });
    const r = await Swal.fire({
      ...SWAL_THEME,
      title: "ยืนยันการลบ?",
      showCancelButton: true,
      confirmButtonText: "ลบ",
    });
    if (r.isConfirmed) {
      const { error } = await supabase
        .from("trip_expenses")
        .delete()
        .eq("id", id);
      if (error)
        return Swal.fire({
          ...SWAL_THEME,
          icon: "error",
          title: "ลบไม่สำเร็จ",
          text: error.message,
        });
      await refreshExpenses();
    }
  };

  const handleUndoHistory = async (id) => {
    if (isOffline)
      return Swal.fire({
        ...SWAL_THEME,
        icon: "warning",
        title: "ออฟไลน์",
        text: "ไม่สามารถทำรายการขณะออฟไลน์ได้",
      });
    const { error } = await supabase
      .from("trip_expenses")
      .delete()
      .eq("id", id);
    if (error)
      return Swal.fire({
        ...SWAL_THEME,
        icon: "error",
        title: "กู้คืนไม่สำเร็จ",
        text: error.message,
      });

    await refreshExpenses();
    // 👈 เพิ่มแจ้งเตือนให้รู้ว่ากดกู้คืนสำเร็จแล้ว
    Swal.fire({
      ...SWAL_THEME,
      icon: "success",
      title: "กู้คืนยอดเรียบร้อย",
      timer: 1000,
      showConfirmButton: false,
    });
  };

  const handleSettleDebt = async (from, to, settleAmount) => {
    if (isOffline)
      return Swal.fire({
        ...SWAL_THEME,
        icon: "warning",
        title: "ออฟไลน์",
        text: "ไม่สามารถทำรายการขณะออฟไลน์ได้",
      });
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
    const newHistory = {
      expense_date: formattedDate,
      item_name: `[เคลียร์ยอด] ${from} -> ${to}`,
      amount: settleAmount,
      category: HISTORY_CATEGORY,
      paid_by: from,
      split_between: [from], // 👈 🧠 เพิ่มบรรทัดนี้เข้ามา! เพื่อแก้บั๊กไม่ให้ฐานข้อมูลเตือน Error
    };

    const { error } = await supabase.from("trip_expenses").insert([newHistory]);
    if (error)
      return Swal.fire({
        ...SWAL_THEME,
        icon: "error",
        title: "บันทึกไม่สำเร็จ",
        text: error.message,
      });

    setActivePayment(null);
    await refreshExpenses();
    // 👈 เพิ่มแจ้งเตือนให้รู้ว่าบันทึกประวัติสำเร็จ
    Swal.fire({
      ...SWAL_THEME,
      icon: "success",
      title: "บันทึกประวัติการโอนแล้ว",
      timer: 1200,
      showConfirmButton: false,
    });
  };

  const startPressTimer = () => {
    hasScrolled.current = false;
    setIsPressing(true);
    pressTimer.current = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      hasScrolled.current = true;
      setIsPressing(false);
    }, 400);
  };
  const cancelPressTimer = () => {
    clearTimeout(pressTimer.current);
    setIsPressing(false);
  };

  const regularExpenses = expenses.filter(
    (e) => e.category !== HISTORY_CATEGORY,
  );
  const historyExpenses = expenses.filter(
    (e) => e.category === HISTORY_CATEGORY,
  );
  const groupedExpenses = useMemo(
    () =>
      regularExpenses.reduce((groups, expense) => {
        (groups[expense.expense_date] ||= []).push(expense);
        return groups;
      }, {}),
    [regularExpenses],
  );
  const totalExpense = useMemo(
    () => regularExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [regularExpenses],
  );

  const settlements = useMemo(() => {
    const balances = MEMBERS.map((member) => ({ member, balance: 0 }));

    regularExpenses.forEach((expense) => {
      const payer = balances.find((b) => b.member === expense.paid_by);
      if (payer) payer.balance += Number(expense.amount);

      let splitMembers =
        Array.isArray(expense.split_between) && expense.split_between.length > 0
          ? expense.split_between
          : [expense.paid_by];
      const validSplit = splitMembers.filter((m) => MEMBERS.includes(m));
      const finalSplitters =
        validSplit.length > 0
          ? validSplit
          : MEMBERS.includes(expense.paid_by)
            ? [expense.paid_by]
            : [MEMBERS[0]];

      const costPerPerson = Number(expense.amount) / finalSplitters.length;
      finalSplitters.forEach((m) => {
        const debtor = balances.find((b) => b.member === m);
        if (debtor) debtor.balance -= costPerPerson;
      });
    });

    historyExpenses.forEach((expense) => {
      const payer = balances.find((b) => b.member === expense.paid_by);
      if (payer) payer.balance += Number(expense.amount);
      MEMBERS.forEach((m) => {
        if (expense.item_name.includes(`-> ${m}`)) {
          const receiver = balances.find((b) => b.member === m);
          if (receiver) receiver.balance -= Number(expense.amount);
        }
      });
    });

    const debtors = balances
      .filter((b) => b.balance < -0.01)
      .map((b) => ({ ...b }));
    const creditors = balances
      .filter((b) => b.balance > 0.01)
      .map((b) => ({ ...b }));
    const transfers = [];
    let dIdx = 0,
      cIdx = 0;
    while (dIdx < debtors.length && cIdx < creditors.length) {
      const d = debtors[dIdx],
        c = creditors[cIdx];
      const amt = Math.min(Math.abs(d.balance), c.balance);
      if (amt > 0.01)
        transfers.push({ from: d.member, to: c.member, amount: amt });
      d.balance += amt;
      c.balance -= amt;
      if (Math.abs(d.balance) < 0.01) dIdx++;
      if (c.balance < 0.01) cIdx++;
    }
    return { balances, transfers };
  }, [MEMBERS, regularExpenses, historyExpenses]);

  // หน้าจอตอนออฟไลน์ (บังมิด อ่านได้อย่างเดียวไม่ได้)
  if (isOffline) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 p-6 text-center text-gray-100">
        <WifiOff size={48} className="mb-4 text-red-500 opacity-80" />
        <h1 className="mb-2 text-xl font-bold text-gray-100">
          ไม่มีสัญญาณอินเทอร์เน็ต
        </h1>
        <p className="mb-6 text-sm text-gray-400">
          กรุณาเชื่อมต่ออินเทอร์เน็ตเพื่อโหลดข้อมูลการหารเงินของทริปนี้
        </p>
        <Loader2 size={24} className="animate-spin text-lime-400" />
      </div>
    );
  }

  // หน้าจอตอนกำลังโหลดข้อมูลตอนเปิดแอปครั้งแรก
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 p-6 text-center text-gray-100">
        <Loader2 size={48} className="mb-4 animate-spin text-lime-400" />
        <p className="text-sm font-bold text-gray-400">
          กำลังเชื่อมต่อฐานข้อมูล...
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen bg-black pb-24 font-sans text-gray-100"
      onClick={handleAppClick}
    >
      <style>{`
        @keyframes drawRing { 0% { stroke-dashoffset: 176; } 100% { stroke-dashoffset: 0; } }
        .animate-draw-fast { animation: drawRing 0.4s linear forwards; }
      `}</style>
      <div className="fixed top-2 right-3 z-50 pointer-events-none select-none text-[10px] text-gray-700 opacity-50">
        {version_number}
      </div>

      <TripHeader
        totalExpense={totalExpense}
        isSyncing={isSyncing}
        onRefresh={() => {
          refreshMembers();
          refreshExpenses();
        }}
        MEMBERS={MEMBERS}
        onOpenMemberModal={() => setShowMemberModal(true)}
      />

      <main className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-6 p-4 md:grid-cols-2 lg:grid-cols-4">
        <section
          className={`rounded-xl border p-5 shadow-sm transition-colors ${editId ? "border-yellow-400 bg-gray-900" : "border-gray-700 bg-gray-900"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center gap-2 font-bold text-lime-400">
            {editId ? (
              <Edit2 size={20} className="text-yellow-400" />
            ) : (
              <Receipt size={20} />
            )}
            <h2 className={editId ? "text-yellow-400" : ""}>
              {editId ? "แก้ไขรายการ" : "จดรายจ่ายใหม่"}
            </h2>
          </div>
          <form onSubmit={handleAddExpense} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-sm text-gray-100 focus:border-lime-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setDate(getTodayISO())}
                className="w-1/4 rounded-lg bg-lime-400 px-3 text-sm font-bold text-gray-950 transition hover:bg-lime-300"
              >
                วันนี้
              </button>
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-sm text-gray-100 focus:border-lime-400 focus:outline-none"
            >
              {CATEGORIES.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>

            {category === "ค่าน้ำมัน" && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400">
                      ไมล์เริ่มต้น
                    </label>
                    <input
                      type="number"
                      placeholder="ไมล์เริ่มต้น"
                      value={odometerStart}
                      onChange={(e) => setOdometerStart(e.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-xs text-gray-100 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">
                      ไมล์สิ้นสุด
                    </label>
                    <input
                      type="number"
                      placeholder="ไมล์สิ้นสุด"
                      value={odometerEnd}
                      onChange={(e) => setOdometerEnd(e.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-xs text-gray-100 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            <input
              type="text"
              placeholder="ชื่อรายการ (เว้นว่างได้)"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-base text-gray-100 focus:border-lime-400 focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-base font-bold text-gray-100 focus:border-lime-400 focus:outline-none"
              />
              <select
                value={paidBy}
                onChange={(e) => {
                  if (e.target.value === "__ADD__") setShowMemberModal(true);
                  else {
                    setPaidBy(e.target.value);
                    localStorage.setItem("defaultPaidBy", e.target.value);
                  }
                }}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 p-2 text-base font-bold text-gray-300 focus:border-lime-400 focus:outline-none"
              >
                {MEMBERS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                <option value="__ADD__">+ เพิ่มคนใหม่...</option>
              </select>
            </div>

            {editId ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex-1 rounded-lg bg-gray-700 py-3 font-bold text-gray-100 transition hover:bg-gray-600"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-[2] rounded-lg bg-yellow-400 py-3 font-bold text-gray-950 transition hover:bg-yellow-300"
                >
                  บันทึกแก้ไข
                </button>
              </div>
            ) : (
              <button
                type="submit"
                className="w-full rounded-lg bg-lime-400 py-3 font-bold text-gray-950 transition hover:bg-lime-300"
              >
                บันทึกรายการ
              </button>
            )}
          </form>
        </section>

        <div onClick={(e) => e.stopPropagation()}>
          <ExpenseList
            expenses={regularExpenses}
            groupedExpenses={groupedExpenses}
            loading={loading}
            isExpanded={isListExpanded}
            collapsedDates={collapsedDates}
            onToggleExpanded={() => setIsListExpanded(!isListExpanded)}
            onToggleDate={(val) =>
              setCollapsedDates((d) => ({ ...d, [val]: !d[val] }))
            }
            onEdit={(exp) => {
              setEditId(exp.id);
              setDate(parseForUI(exp.expense_date));
              setPaidBy(exp.paid_by);
              setItem(exp.item_name);
              setAmount(exp.amount);
              setCategory(exp.category);
              setOdometerStart(exp.odometer_start || "");
              setOdometerEnd(exp.odometer_end || "");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onDelete={handleDelete}
            onOpenSplitModal={setActiveSplitExpense}
            swipedId={swipedId}
            setSwipedId={setSwipedId}
            highlightedId={highlightedId}
            MEMBERS={MEMBERS}
          />
        </div>

        <section className="rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-lime-400">
            <Users size={20} /> สรุปเคลียร์เงิน
          </h2>
          <div className="space-y-2">
            {settlements.transfers.length === 0 ? (
              <p className="py-2 text-center text-sm text-gray-400">
                ทุกคนเคลียร์เงินครบแล้ว
              </p>
            ) : (
              settlements.transfers.map((t) => (
                <div
                  key={`${t.from}-${t.to}`}
                  className="rounded-lg border border-lime-900 bg-gray-800 p-3"
                >
                  <div className="mb-2 flex justify-between p-2">
                    <div className="flex gap-2 font-medium">
                      <span className="text-gray-100">{t.from}</span>
                      <ArrowRight size={16} className="text-gray-400" />
                      <span className="text-gray-100">{t.to}</span>
                    </div>
                    <div className="font-bold text-lime-400">
                      ฿{formatMoney(t.amount)}
                    </div>
                  </div>
                  <button
                    onClick={() => setActivePayment(t)}
                    className="m-auto flex w-10/12 items-center justify-center gap-1 rounded bg-lime-500 py-2 text-xs text-gray-950 shadow-sm transition hover:bg-lime-300"
                  >
                    <CheckCircle size={14} /> เคลียร์ยอดนี้
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-6 z-40 flex items-center justify-center">
        {isPressing && (
          <svg
            className="absolute inset-0 h-[68px] w-[68px] -translate-x-[2px] -translate-y-[2px] -rotate-90 pointer-events-none"
            viewBox="0 0 64 64"
          >
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="#D7FF3B"
              strokeWidth="4"
              fill="none"
              strokeDasharray="176"
              strokeDashoffset="176"
              className="animate-draw-fast"
            />
          </svg>
        )}
        <button
          onClick={() => {
            if (!hasScrolled.current) setShowHistory(true);
          }}
          onMouseEnter={startPressTimer}
          onMouseLeave={cancelPressTimer}
          onTouchStart={startPressTimer}
          onTouchEnd={cancelPressTimer}
          className={`flex h-16 w-16 items-center justify-center rounded-full text-gray-950 shadow-xl transition-all duration-200 ${isPressing ? "scale-110 bg-amber-700" : "bg-amber-500 hover:bg-amber-600"}`}
        >
          <History size={28} />
        </button>
      </div>

      {showMemberModal && (
        <MemberModal
          members={MEMBERS}
          balances={settlements.balances}
          memberDetails={memberDetails}
          onClose={() => setShowMemberModal(false)}
          onAdd={handleAddMember}
          onRemove={handleRemoveMember}
          onUpdateDetails={handleUpdateMemberDetails}
        />
      )}
      {activePayment && (
        <PaymentModal
          from={activePayment.from}
          to={activePayment.to}
          amount={activePayment.amount}
          memberDetails={memberDetails}
          onClose={() => setActivePayment(null)}
          onUpdateDetails={handleUpdateMemberDetails}
          onConfirm={handleSettleDebt}
        />
      )}
      {activeSplitExpense && (
        <SplitModal
          expense={activeSplitExpense}
          members={MEMBERS}
          onClose={() => setActiveSplitExpense(null)}
          onSave={handleUpdateSplit}
        />
      )}
      {showHistory && (
        <HistoryModal
          expenses={historyExpenses}
          onClose={() => setShowHistory(false)}
          onUndo={handleUndoHistory}
        />
      )}
    </div>
  );
}
