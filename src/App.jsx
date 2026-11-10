import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import Swal from "sweetalert2";
import { History } from "lucide-react";
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
const HISTORY_CATEGORY = "✅ ประวัติการโอน";
const DEFAULT_MEMBERS = ["หมิว", "มาย", "เมย์", "พี่เบส"];
const QR_IMAGES = {
  หมิว: "/Mind's QR.png",
  มาย: "/Mind's QR.png",
  เมย์: "/Mind's QR.png",
  พี่เบส: "/Mind's QR.png",
};

//  Helper จัดการวันที่
const getTodayISO = () => new Date().toLocaleDateString("en-CA");
const formatForDB = (isoDate) => {
  if (!isoDate || !isoDate.includes("-")) return isoDate;
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
};
const parseForUI = (thDate) => {
  if (!thDate || !thDate.includes("/")) return getTodayISO();
  const [d, m, y] = thDate.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
};
const getStoredMembers = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("tripMembers") || "null");
    if (Array.isArray(saved)) {
      const members = [...new Set(saved.map((member) => String(member).trim()))].filter(Boolean);
      if (members.length > 0) return members;
    }
  } catch {
    localStorage.removeItem("tripMembers");
  }
  return DEFAULT_MEMBERS;
};
const getOfflineQueue = () => {
  try {
    const queue = JSON.parse(localStorage.getItem("offlineQueue") || "[]");
    return Array.isArray(queue) ? queue : [];
  } catch {
    localStorage.removeItem("offlineQueue");
    return [];
  }
};

export default function App() {
  const [MEMBERS, setMembers] = useState(getStoredMembers);

  const [paidBy, setPaidBy] = useState(() => {
    const saved = localStorage.getItem("defaultPaidBy");
    return saved && MEMBERS.includes(saved) ? saved : MEMBERS[0];
  });

  //  อัปเกรดฟังก์ชันเพิ่มคน ให้เปลี่ยนช่องเลือกคนเป็นชื่อใหม่ทันที
  const handleAddMember = async () => {
    const { value: name } = await Swal.fire({
      title: "เพิ่มสมาชิกใหม่",
      input: "text",
      inputLabel: "ชื่อสมาชิก",
      inputPlaceholder: "กรอกชื่อ",
      showCancelButton: true,
      confirmButtonText: "บันทึก",
      confirmButtonColor: "#D7FF3B",
      cancelButtonText: "ยกเลิก",
    });

    const trimmedName = name?.trim();
    if (trimmedName) {
      if (!MEMBERS.includes(trimmedName)) {
        const newMembers = [...MEMBERS, trimmedName];
        setMembers(newMembers);
        localStorage.setItem("tripMembers", JSON.stringify(newMembers));
        setPaidBy(trimmedName);
        localStorage.setItem("defaultPaidBy", trimmedName);
      } else {
        setPaidBy(trimmedName);
      }
    }
  };

  const handleRemoveMember = (name) => {
    if (MEMBERS.length <= 1) {
      return Swal.fire({
        icon: "warning",
        title: "ลบไม่ได้",
        text: "ต้องมีสมาชิกอย่างน้อย 1 คน",
      });
    }
    const memberData = settlements.balances.find((b) => b.member === name);
    if (memberData && Math.abs(memberData.balance) > 0.01) {
      return Swal.fire({
        icon: "error",
        title: "ลบไม่ได้จ่ะ No No",
        text: `${name} มียอดค้างชำระอยู่`,
      });
    }
    const newMembers = MEMBERS.filter((m) => m !== name);
    setMembers(newMembers);
    localStorage.setItem("tripMembers", JSON.stringify(newMembers));
    if (paidBy === name) {
      setPaidBy(newMembers[0]);
      localStorage.setItem("defaultPaidBy", newMembers[0]);
    }
    Swal.fire({
      icon: "success",
      title: "ลบสมาชิกสำเร็จ",
      timer: 1000,
      showConfirmButton: false,
    });
  };

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [collapsedDates, setCollapsedDates] = useState({});
  const [showHistory, setShowHistory] = useState(false);
  const [editId, setEditId] = useState(null);

  const [date, setDate] = useState(getTodayISO());
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [odoStart, setOdoStart] = useState("");
  const [odoEnd, setOdoEnd] = useState("");
  const [gasPrice, setGasPrice] = useState(
    () => localStorage.getItem("defaultGasPrice") || "",
  );
  const [gasRate, setGasRate] = useState(
    () => localStorage.getItem("defaultGasRate") || "11",
  );

  const refreshExpenses = useCallback(async () => {
    setIsSyncing(true);
    const { data, error } = await supabase
      .from("trip_expenses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      Swal.fire({ icon: "error", title: "โหลดข้อมูลไม่สำเร็จ", text: error.message });
    } else if (data) {
      setExpenses(data);
      const latestOdo = data.find((ex) => ex.odometer_end !== null);
      if (latestOdo && !editId) setOdoStart(latestOdo.odometer_end.toString());
    }
    setTimeout(() => setIsSyncing(false), 500);
  }, [editId]);

  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
      const { data, error } = await supabase
        .from("trip_expenses")
        .select("*")
        .order("created_at", { ascending: false });

      if (isMounted) {
        if (error) {
          Swal.fire({ icon: "error", title: "โหลดข้อมูลไม่สำเร็จ", text: error.message });
        } else if (data) {
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
      const queue = getOfflineQueue();
      if (queue.length > 0) {
        const payloads = queue.map(({ id: _id, tempId: _tempId, ...rest }) => rest);
        const { error } = await supabase.from("trip_expenses").insert(payloads);
        if (error) {
          Swal.fire({ icon: "error", title: "ซิงก์ข้อมูลไม่สำเร็จ", text: error.message });
          return;
        }
        localStorage.removeItem("offlineQueue");
        await refreshExpenses();
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
  }, [editId, refreshExpenses]);

  const handlePaidByChange = (name) => {
    setPaidBy(name);
    localStorage.setItem("defaultPaidBy", name);
  };

  const handleAddExpense = async (event) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0)
      return Swal.fire({
        icon: "warning",
        title: "เตือน",
        text: "กรุณากรอกจำนวนเงิน",
      });
    const payload = {
      expense_date: formatForDB(date),
      item_name: item.trim() || category,
      amount: numericAmount,
      category,
      paid_by: paidBy,
    };
    if (!navigator.onLine) {
      if (editId) {
        return Swal.fire({
          icon: "warning",
          title: "แก้ไขขณะออฟไลน์ไม่ได้",
          text: "เชื่อมต่ออินเทอร์เน็ตก่อน แล้วค่อยบันทึกการแก้ไข",
        });
      }
      const queue = getOfflineQueue();
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
        const { error } = await supabase.from("trip_expenses").update(payload).eq("id", editId);
        if (error) return Swal.fire({ icon: "error", title: "แก้ไขไม่สำเร็จ", text: error.message });
        Swal.fire({
          icon: "success",
          title: "สำเร็จ",
          text: "แก้ไขรายการเรียบร้อย",
          timer: 1500,
          showConfirmButton: false,
        });
        setEditId(null);
      } else {
        const { error } = await supabase.from("trip_expenses").insert([payload]);
        if (error) return Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: error.message });
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
    setDate(parseForUI(expense.expense_date));
    setPaidBy(expense.paid_by);

    if (expense.category === "⛽ ค่าน้ำมัน" && expense.odometer_start != null && expense.odometer_end != null) {
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
    setOdoEnd("");
  };

  const handleAddGas = async () => {
    const start = Number(odoStart);
    const end = Number(odoEnd);
    const price = Number(gasPrice);
    const rate = Number(gasRate);
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      !Number.isFinite(price) ||
      !Number.isFinite(rate) ||
      end <= start ||
      price <= 0 ||
      rate <= 0
    )
      return Swal.fire({
        icon: "warning",
        title: "เตือน",
        text: "กรอกข้อมูลให้ครบ",
      });
    localStorage.setItem("defaultGasPrice", gasPrice);
    localStorage.setItem("defaultGasRate", gasRate);

    const payload = {
      expense_date: formatForDB(date),
      item_name: `ค่าน้ำมัน (ไมล์ ${odoStart}-${odoEnd})`,
      amount:
        ((end - start) / rate) * price,
      category: "⛽ ค่าน้ำมัน",
      paid_by: paidBy,
      odometer_start: start,
      odometer_end: end,
    };
    if (!navigator.onLine) {
      if (editId) {
        return Swal.fire({
          icon: "warning",
          title: "แก้ไขขณะออฟไลน์ไม่ได้",
          text: "เชื่อมต่ออินเทอร์เน็ตก่อน แล้วค่อยบันทึกการแก้ไข",
        });
      }
      const queue = getOfflineQueue();
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
        const { error } = await supabase.from("trip_expenses").update(payload).eq("id", editId);
        if (error) return Swal.fire({ icon: "error", title: "แก้ไขไม่สำเร็จ", text: error.message });
        setEditId(null);
      } else {
        const { error } = await supabase.from("trip_expenses").insert([payload]);
        if (error) return Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: error.message });
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
    setOdoStart(String(end));
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
      const { error } = await supabase.from("trip_expenses").delete().eq("id", id);
      if (error) return Swal.fire({ icon: "error", title: "ลบไม่สำเร็จ", text: error.message });
      await refreshExpenses();
      Swal.fire({
        icon: "success",
        title: "ลบแล้ว",
        timer: 1000,
        showConfirmButton: false,
      });
    }
  };

  const handleUndoHistory = async (id) => {
    const result = await Swal.fire({
      title: "กู้คืนยอดนี้?",
      text: "ยอดหนี้จะกลับไปเป็นสถานะ 'ยังไม่เคลียร์' เหมือนเดิม",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#D7FF3B",
      cancelButtonText: "ยกเลิก",
      confirmButtonText: "ใช่, กู้คืนเลย!",
    });
    if (result.isConfirmed) {
      const { error } = await supabase.from("trip_expenses").delete().eq("id", id);
      if (error) return Swal.fire({ icon: "error", title: "กู้คืนไม่สำเร็จ", text: error.message });
      await refreshExpenses();
      Swal.fire({
        icon: "success",
        title: "กู้คืนเรียบร้อย",
        timer: 1500,
        showConfirmButton: false,
      });
    }
  };

  const handleSettleDebt = async (from, to, settleAmount) => {
    if (!navigator.onLine)
      return Swal.fire({
        icon: "error",
        title: "ออฟไลน์",
        text: "เน็ตหลุดจ้า",
      });

    const qrUrl =
      QR_IMAGES[to] || "https://placehold.co/250x250?text=No+QR+Code";

    const result = await Swal.fire({
      title: `โอนเงินให้ ${to}`,
      text: `ยอดเงิน ฿${settleAmount.toLocaleString()}`,
      imageUrl: qrUrl,
      imageWidth: 250,
      imageHeight: 250,
      imageAlt: `QR Code ของ ${to}`,
      showCancelButton: true,
      confirmButtonText: "ยืนยันโอนแล้ว",
      confirmButtonColor: "#D7FF3B",
      cancelButtonText: "ยกเลิก",
    });

    if (!result.isConfirmed) return;

    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

    const { error } = await supabase.from("trip_expenses").insert([
      {
        expense_date: formattedDate,
        item_name: `[เคลียร์ยอด] ${from} -> ${to}`,
        amount: settleAmount,
        category: HISTORY_CATEGORY,
        paid_by: from,
      },
    ]);
    if (error) return Swal.fire({ icon: "error", title: "บันทึกการโอนไม่สำเร็จ", text: error.message });
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
  const perPerson = MEMBERS.length > 0 ? totalExpense / MEMBERS.length : 0;
  const previewGasCost =
    Number.isFinite(Number(odoStart)) &&
    Number.isFinite(Number(odoEnd)) &&
    Number.isFinite(Number(gasPrice)) &&
    Number(gasRate) > 0
      ? ((Number(odoEnd) - Number(odoStart)) / Number(gasRate)) * Number(gasPrice)
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
  }, [MEMBERS, regularExpenses, historyExpenses, perPerson]);

  return (
    <div className="relative min-h-screen bg-black pb-20 font-sans text-gray-100">
      <TripHeader
        totalExpense={totalExpense}
        perPerson={perPerson}
        isSyncing={isSyncing}
        onRefresh={refreshExpenses}
        MEMBERS={MEMBERS}
      />
      <main className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-6 p-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 🧠 โยน onAddMember ลงไปใน ExpenseForm */}
        <ExpenseForm
          editId={editId}
          date={date}
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
          onAddMember={handleAddMember}
          onSubmit={handleAddExpense}
          onCancel={cancelEdit}
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
        {/* 🧠 เอา handleAddMember ออกจาก SettlementCard แล้ว */}
        <SettlementCard
          settlements={settlements}
          handleRemoveMember={handleRemoveMember}
          onSettle={handleSettleDebt}
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
      </main>
      <button
        onClick={() => setShowHistory(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-amber-500 p-4 text-gray-950 shadow-xl shadow-lime-500/10 transition hover:bg-amber-700"
        title="ดูประวัติการเคลียร์เงิน"
      >
        <History size={24} />
      </button>
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
