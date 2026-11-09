import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import Swal from "sweetalert2";
import { EclipseIcon, History, WindIcon } from "lucide-react";
import ExpenseForm from "./components/ExpenseForm";
import ExpenseList from "./components/ExpenseList";
import GasForm from "./components/GasForm";
import HistoryModal from "./components/HistoryModal";
import SettlementCard from "./components/SettlementCard";
import TripHeader from "./components/TripHeader";

const supabase = createClient(
  "https://ovphjcceaxajshgzyvaz.supabase.co",
  "sb_publishable_2akfx9awEyywfq5Q0ZpLWA_iQGY9gzD",
);

const CATEGORIES = [
  "🍲 ค่าอาหาร",
  "🚗 ค่ารถ",
  "⛽ ค่าน้ำมัน",
  "🏠 ค่าที่พัก",
  "🎟️ ค่าเที่ยว",
  "📦 อื่นๆ",
];
const DATES = [
  "27/11/2026",
  "28/11/2026",
  "29/11/2026",
  "30/11/2026",
  "01/12/2026",
  "02/12/2026",
];
const HISTORY_CATEGORY = "✅ ประวัติการโอน";

export default function App() {
  const [MEMBERS, setMembers] = useState(() => {
    const saved = localStorage.getItem("tripMembers");
    return saved ? JSON.parse(saved) : ["หมิว", "มาย", "เมย์", "พี่เบส"];
  });

  // ฟังก์ชันเพิ่มคน
  const handleAddMenber = async () => {
    const { value: name } = await Swal.fire({
      title: "เพิ่มสมาชิกใหม่",
      input: "text",
      inputLabel: "ชื่อสมาชิก",
      inputPlaceholder: "กรอกชื่อ",
      showCancelButton: true,
    });
    if (name && !MEMBERS.includes(name)) {
      const newMenbers = [...MEMBERS, name];
      setMembers(newMenbers);
      localStorage.setItem("tripMembers", JSON.stringify(newMenbers));
    }
  };

  const handleRemoveMember = (name) => {
    const menberData = settlements.balances.find((b) => b.member === name);
    if (menberData && Math.abs(menberData.balance) > 0.01) {
      return Swal.fire({
        icon: "error",
        title: "ลบไม่ได้จ่ะ No No",
        text: `${name} มียอดค้างชำระอยู่`,
      });
    }
    const newMenbers = MEMBERS.filter((m) => m !== name);
    setMembers(newMenbers);
    localStorage.setItem("tripMembers", JSON.stringify(newMenbers));
    Swal.fire({
      icon: "success",
      title: "ลบสมาชิกสำเร็จ",
      timer: 1000,
      showConfirmButton: false,
    });
  };

  // ฟังก์ชันลบคน
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [collapsedDates, setCollapsedDates] = useState({});
  const [showHistory, setShowHistory] = useState(false);
  const [editId, setEditId] = useState(null);

  const [date, setDate] = useState(() => {
    const today = new Date();
    const formatted = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
    return DATES.includes(formatted) ? formatted : DATES[0];
  });

  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [paidBy, setPaidBy] = useState(
    () => localStorage.getItem("defaultPaidBy") || MEMBERS[0],
  );
  const [odoStart, setOdoStart] = useState("");
  const [odoEnd, setOdoEnd] = useState("");
  const [gasPrice, setGasPrice] = useState("");
  const [gasRate, setGasRate] = useState("11");

  // 🧠 เปลี่ยนเป็น refreshExpenses สำหรับใช้เวลาซิงก์ด้วยมือหรือหลังทำแอคชั่น
  const refreshExpenses = useCallback(async () => {
    setIsSyncing(true);
    const { data } = await supabase
      .from("trip_expenses")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setExpenses(data);
      const latestOdo = data.find((ex) => ex.odometer_end !== null);
      if (latestOdo && !editId) setOdoStart(latestOdo.odometer_end.toString());
    }
    setTimeout(() => setIsSyncing(false), 500);
  }, [editId]);

  useEffect(() => {
    let isMounted = true;

    // 🧠 แยกส่วนโหลดข้อมูลครั้งแรกมาไว้ในนี้ เพื่อไม่ให้เกิด Cascading Renders
    const loadInitialData = async () => {
      const { data } = await supabase
        .from("trip_expenses")
        .select("*")
        .order("created_at", { ascending: false });

      if (isMounted) {
        if (data) {
          setExpenses(data);
          const latestOdo = data.find((ex) => ex.odometer_end !== null);
          if (latestOdo && !editId)
            setOdoStart(latestOdo.odometer_end.toString());
        }
        setLoading(false);
      }
    };

    loadInitialData();

    const syncOfflineQueue = async () => {
      const queue = JSON.parse(localStorage.getItem("offlineQueue") || "[]");
      if (queue.length > 0) {
        const payloads = queue.map(({ tempId: _tempId, ...rest }) => rest);
        await supabase.from("trip_expenses").insert(payloads);
        localStorage.removeItem("offlineQueue");
        await refreshExpenses(); // เรียกฟังก์ชันซิงก์ใหม่
        Swal.fire({
          icon: "success",
          title: "ออนไลน์แล้ว!",
          text: "ข้อมูลที่ค้างไว้ถูกซิงก์ขึ้นระบบเรียบร้อย",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    };
    window.addEventListener("online", syncOfflineQueue);

    const subscription = supabase
      .channel("trip_expenses_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_expenses" },
        () => {
          refreshExpenses();
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
      window.removeEventListener("online", syncOfflineQueue);
    };
  }, [editId, refreshExpenses]); // อัปเดต Dependency ได้อย่างถูกต้องไร้ Warning

  const handlePaidByChange = (name) => {
    setPaidBy(name);
    localStorage.setItem("defaultPaidBy", name);
  };

  const handleAddExpense = async (event) => {
    event.preventDefault();
    if (!amount)
      return Swal.fire({
        icon: "warning",
        title: "เตือน",
        text: "กรุณากรอกจำนวนเงิน",
      });
    const payload = {
      expense_date: date,
      item_name: item.trim() || category,
      amount: parseFloat(amount),
      category,
      paid_by: paidBy,
    };
    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem("offlineQueue") || "[]");
      const tempItem = { ...payload, id: `temp-${Date.now()}`, tempId: true };
      localStorage.setItem(
        "offlineQueue",
        JSON.stringify([...queue, tempItem]),
      );
      setExpenses((current) => [tempItem, ...current]);
      await Swal.fire({
        icon: "info",
        title: "ออฟไลน์",
        text: "บันทึกลงเครื่องแล้ว จะแอบซิงก์เมื่อเน็ตกลับมา",
      });
    } else {
      if (editId) {
        await supabase.from("trip_expenses").update(payload).eq("id", editId);
        Swal.fire({
          icon: "success",
          title: "สำเร็จ",
          text: "แก้ไขรายการเรียบร้อย",
          timer: 1500,
          showConfirmButton: false,
        });
        setEditId(null);
      } else {
        await supabase.from("trip_expenses").insert([payload]);
        Swal.fire({
          icon: "success",
          title: "สำเร็จ",
          text: "บันทึกรายการเรียบร้อย",
          timer: 1500,
          showConfirmButton: false,
        });
      }
      await refreshExpenses();
    }
    setItem("");
    setAmount("");
  };

  const handleEdit = (expense) => {
    setEditId(expense.id);
    setDate(expense.expense_date);
    setPaidBy(expense.paid_by);

    if (expense.category === "⛽ ค่าน้ำมัน" && expense.odometer_start) {
      setOdoStart(expense.odometer_start.toString());
      setOdoEnd(expense.odometer_end.toString());
      window.scrollTo({ top: 400, behavior: "smooth" });
    } else {
      setItem(expense.item_name);
      setAmount(expense.amount);
      setCategory(expense.category);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const cancelEdit = () => {
    setEditId(null);
    setItem("");
    setAmount("");
  };

  const handleAddGas = async () => {
    if (!odoStart || !odoEnd || !gasPrice || !gasRate)
      return Swal.fire({
        icon: "warning",
        title: "เตือน",
        text: "กรอกข้อมูลให้ครบ",
      });
    const payload = {
      expense_date: date,
      item_name: `ค่าน้ำมัน (ไมล์ ${odoStart}-${odoEnd})`,
      amount:
        ((parseFloat(odoEnd) - parseFloat(odoStart)) / parseFloat(gasRate)) *
        parseFloat(gasPrice),
      category: "⛽ ค่าน้ำมัน",
      paid_by: paidBy,
      odometer_start: parseFloat(odoStart),
      odometer_end: parseFloat(odoEnd),
    };
    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem("offlineQueue") || "[]");
      const tempItem = { ...payload, id: `temp-${Date.now()}`, tempId: true };
      localStorage.setItem(
        "offlineQueue",
        JSON.stringify([...queue, tempItem]),
      );
      setExpenses((current) => [tempItem, ...current]);
      Swal.fire({
        icon: "info",
        title: "ออฟไลน์",
        text: "บันทึกลงเครื่องแล้ว",
      });
    } else {
      if (editId) {
        await supabase.from("trip_expenses").update(payload).eq("id", editId);
        setEditId(null);
      } else {
        await supabase.from("trip_expenses").insert([payload]);
      }
      await refreshExpenses();
      Swal.fire({
        icon: "success",
        title: "สำเร็จ",
        text: "บันทึกค่าน้ำมันเรียบร้อย",
        timer: 1000,
        showConfirmButton: false,
      });
    }
    setOdoStart(odoEnd);
    setOdoEnd("");
  };

  const handleDelete = async (id) => {
    if (id.toString().startsWith("temp"))
      return Swal.fire({
        icon: "error",
        title: "ออฟไลน์",
        text: "ไม่สามารถลบรายการค้างซิงก์ได้ รอเน็ตกลับมาก่อนนะครับ",
      });
    const result = await Swal.fire({
      title: "ลบรายการนี้?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonText: "ยกเลิก",
      confirmButtonText: "ลบเลย!",
    });
    if (result.isConfirmed) {
      await supabase.from("trip_expenses").delete().eq("id", id);
      await refreshExpenses();
      Swal.fire({
        icon: "success",
        title: "ลบแล้ว",
        timer: 1000,
        showConfirmButton: false,
      });
    }
  };

  const handleSettleDebt = async (from, to, settleAmount) => {
    const result = await Swal.fire({
      title: "ยืนยันการเคลียร์ยอด?",
      text: `${from} โอนให้ ${to} จำนวน ฿${settleAmount.toLocaleString()} ถูกต้องไหม?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      confirmButtonText: "ใช่, โอนแล้ว!",
      cancelButtonText: "ยกเลิก",
    });
    if (!result.isConfirmed) return;
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
    if (!navigator.onLine)
      return Swal.fire({
        icon: "error",
        title: "ออฟไลน์",
        text: "ต้องมีเน็ตถึงจะเคลียร์ยอดได้ครับ",
      });
    await supabase.from("trip_expenses").insert([
      {
        expense_date: formattedDate,
        item_name: `[เคลียร์ยอด] ${from} -> ${to}`,
        amount: settleAmount,
        category: HISTORY_CATEGORY,
        paid_by: from,
      },
    ]);
    await refreshExpenses();
    Swal.fire({
      icon: "success",
      title: "เคลียร์ยอดสำเร็จ!",
      text: `บันทึกการโอนเงินของ ${from} แล้ว ยอดหนี้เป็น 0`,
      timer: 2000,
      showConfirmButton: false,
    });
  };

  const regularExpenses = expenses.filter(
    (expense) => expense.category !== HISTORY_CATEGORY,
  );
  const historyExpenses = expenses.filter(
    (expense) => expense.category === HISTORY_CATEGORY,
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
    () =>
      regularExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
    [regularExpenses],
  );
  const perPerson = totalExpense / MEMBERS.length;
  const previewGasCost =
    odoStart && odoEnd && gasPrice && gasRate
      ? ((parseFloat(odoEnd) - parseFloat(odoStart)) / parseFloat(gasRate)) *
        parseFloat(gasPrice)
      : 0;
  const settlements = useMemo(() => {
    const balances = MEMBERS.map((member) => {
      const groupPaidAmount = regularExpenses
        .filter((expense) => expense.paid_by === member)
        .reduce((sum, expense) => sum + Number(expense.amount), 0);
      let balance = groupPaidAmount - perPerson;
      historyExpenses.forEach((expense) => {
        if (expense.paid_by === member) balance += Number(expense.amount);
        if (expense.item_name.includes(`-> ${member}`))
          balance -= Number(expense.amount);
      });
      return { member, balance, groupPaidAmount };
    });
    const debtors = balances
      .filter((balance) => balance.balance < -0.01)
      .map((balance) => ({ ...balance }));
    const creditors = balances
      .filter((balance) => balance.balance > 0.01)
      .map((balance) => ({ ...balance }));
    const transfers = [];
    let debtorIndex = 0;
    let creditorIndex = 0;
    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];
      const transferAmount = Math.min(
        Math.abs(debtor.balance),
        creditor.balance,
      );
      if (transferAmount > 0.01)
        transfers.push({
          from: debtor.member,
          to: creditor.member,
          amount: transferAmount,
        });
      debtor.balance += transferAmount;
      creditor.balance -= transferAmount;
      if (Math.abs(debtor.balance) < 0.01) debtorIndex++;
      if (creditor.balance < 0.01) creditorIndex++;
    }
    return { balances, transfers };
  }, [regularExpenses, historyExpenses, perPerson]);

  return (
    <div className="relative min-h-screen bg-gray-600 pb-20 font-sans">
      <TripHeader
        totalExpense={totalExpense}
        perPerson={perPerson}
        isSyncing={isSyncing}
        onRefresh={refreshExpenses} // 🧠 ส่ง prop เป็น refreshExpenses
      />
      <main className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-6 p-4 md:grid-cols-2 lg:grid-cols-4">
        <ExpenseForm
          editId={editId}
          date={date}
          dates={DATES}
          category={category}
          categories={CATEGORIES}
          item={item}
          amount={amount}
          paidBy={paidBy}
          members={MEMBERS}
          onDateChange={setDate}
          onCategoryChange={setCategory}
          onItemChange={setItem}
          onAmountChange={setAmount}
          onPaidByChange={handlePaidByChange}
          onSubmit={handleAddExpense}
          onCancel={cancelEdit}
        />
        <GasForm
          odoStart={odoStart}
          odoEnd={odoEnd}
          gasPrice={gasPrice}
          gasRate={gasRate}
          previewGasCost={previewGasCost}
          onOdoStartChange={setOdoStart}
          onOdoEndChange={setOdoEnd}
          onGasPriceChange={setGasPrice}
          onGasRateChange={setGasRate}
          onSubmit={handleAddGas}
        />
        <ExpenseList
          expenses={regularExpenses}
          groupedExpenses={groupedExpenses}
          loading={loading}
          isExpanded={isListExpanded}
          collapsedDates={collapsedDates}
          onToggleExpanded={() => setIsListExpanded((expanded) => !expanded)}
          onToggleDate={(value) =>
            setCollapsedDates((dates) => ({ ...dates, [value]: !dates[value] }))
          }
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        <SettlementCard
          settlements={settlements}
          handleAddMenber={handleAddMenber}
          handleRemoveMember={handleRemoveMember}
          onSettle={handleSettleDebt}
        />
      </main>
      <button
        onClick={() => setShowHistory(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-blue-700 p-4 text-white shadow-xl transition hover:bg-blue-800"
        title="ดูประวัติการเคลียร์เงิน"
      >
        <History size={24} />
      </button>
      {showHistory && (
        <HistoryModal
          expenses={historyExpenses}
          onClose={() => setShowHistory(false)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
