import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import Swal from "sweetalert2";
import {
  Trash2,
  Car,
  Receipt,
  Users,
  RefreshCw,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  FolderClosed,
  Maximize2,
  Minimize2,
  Edit2,
  History,
  X,
  CheckCircle
} from "lucide-react";

// ==========================================
// 🔴 SUPABASE CONFIG
// ==========================================
const supabaseUrl = "https://ovphjcceaxajshgzyvaz.supabase.co";
const supabaseKey = "sb_publishable_2akfx9awEyywfq5Q0ZpLWA_iQGY9gzD";
const supabase = createClient(supabaseUrl, supabaseKey);

const MEMBERS = ["หมิว", "มาย", "เมย์", "พี่เบส"];
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

export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // States สำหรับ UI
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [collapsedDates, setCollapsedDates] = useState({});
  const [showHistory, setShowHistory] = useState(false);
  
  // State สำหรับการแก้ไข
  const [editId, setEditId] = useState(null);

  // Form State
  const [date, setDate] = useState(DATES[0]);
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  
  // 🧠 ดึงความจำจาก LocalStorage ว่าเครื่องนี้ใครเป็นคนจ่ายล่าสุด
  const [paidBy, setPaidBy] = useState(() => localStorage.getItem("defaultPaidBy") || MEMBERS[0]);

  const [odoStart, setOdoStart] = useState("");
  const [odoEnd, setOdoEnd] = useState("");
  const [gasPrice, setGasPrice] = useState("");
  const [gasRate, setGasRate] = useState("11");

  useEffect(() => {
    fetchExpenses();

    // 🧠 ตรวจจับเวลากลับมาออนไลน์ ให้ซิงก์ข้อมูลที่ค้างไว้
    const syncOfflineQueue = async () => {
      const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
      if (queue.length > 0) {
        const payloads = queue.map(({ tempId, ...rest }) => rest);
        await supabase.from("trip_expenses").insert(payloads);
        localStorage.removeItem('offlineQueue');
        fetchExpenses();
        Swal.fire({ icon: 'success', title: 'ออนไลน์แล้ว!', text: 'ข้อมูลที่ค้างไว้ถูกซิงก์ขึ้นระบบเรียบร้อย', timer: 2000, showConfirmButton: false });
      }
    };
    window.addEventListener('online', syncOfflineQueue);

    const subscription = supabase
      .channel("trip_expenses_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_expenses" }, () => {
        fetchExpenses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
      window.removeEventListener('online', syncOfflineQueue);
    };
  }, []);

  const fetchExpenses = async () => {
    setIsSyncing(true);
    const { data } = await supabase.from("trip_expenses").select("*").order("created_at", { ascending: false });

    if (data) {
      setExpenses(data);
      const latestOdo = data.find((ex) => ex.odometer_end !== null);
      if (latestOdo && !editId) setOdoStart(latestOdo.odometer_end.toString());
    }
    setLoading(false);
    setTimeout(() => setIsSyncing(false), 500);
  };

  const handlePaidByChange = (e) => {
    const name = e.target.value;
    setPaidBy(name);
    localStorage.setItem("defaultPaidBy", name); // 🧠 บันทึกชื่อลงเครื่อง
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!amount) return Swal.fire({ icon: 'warning', title: 'เตือน', text: 'กรุณากรอกจำนวนเงิน' });

    const finalItemName = item.trim() === "" ? category : item;
    const payload = {
      expense_date: date,
      item_name: finalItemName,
      amount: parseFloat(amount),
      category,
      paid_by: paidBy,
    };

    if (!navigator.onLine) {
      // 🧠 โหมดออฟไลน์
      const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
      const tempItem = { ...payload, id: `temp-${Date.now()}`, tempId: true };
      queue.push(tempItem);
      localStorage.setItem('offlineQueue', JSON.stringify(queue));
      
      setExpenses([tempItem, ...expenses]); // อัปเดตหน้าจอทันที
      Swal.fire({ icon: 'info', title: 'ออฟไลน์', text: 'บันทึกลงเครื่องแล้ว จะแอบซิงก์เมื่อเน็ตกลับมา' });
    } else {
      // โหมดออนไลน์ปกติ
      if (editId) {
        await supabase.from("trip_expenses").update(payload).eq("id", editId);
        Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'แก้ไขรายการเรียบร้อย', timer: 1500, showConfirmButton: false });
        setEditId(null);
      } else {
        await supabase.from("trip_expenses").insert([payload]);
        Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'บันทึกรายการเรียบร้อย', timer: 1500, showConfirmButton: false });
      }
      await fetchExpenses();
    }

    setItem("");
    setAmount("");
  };

  const handleEdit = (ex) => {
    setEditId(ex.id);
    setDate(ex.expense_date);
    setItem(ex.item_name);
    setAmount(ex.amount);
    setCategory(ex.category);
    setPaidBy(ex.paid_by);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // เลื่อนจอขึ้นไปบนสุด
  };

  const cancelEdit = () => {
    setEditId(null);
    setItem("");
    setAmount("");
  };

  const handleAddGas = async () => {
    if (!odoStart || !odoEnd || !gasPrice || !gasRate) return Swal.fire({ icon: 'warning', title: 'เตือน', text: 'กรอกข้อมูลให้ครบ' });
    const distance = parseFloat(odoEnd) - parseFloat(odoStart);
    const cost = (distance / parseFloat(gasRate)) * parseFloat(gasPrice);

    const payload = {
      expense_date: date,
      item_name: `ค่าน้ำมัน (ไมล์ ${odoStart}-${odoEnd})`,
      amount: cost,
      category: "⛽ ค่าน้ำมัน",
      paid_by: paidBy,
      odometer_start: parseFloat(odoStart),
      odometer_end: parseFloat(odoEnd),
    };

    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
      queue.push({ ...payload, id: `temp-${Date.now()}`, tempId: true });
      localStorage.setItem('offlineQueue', JSON.stringify(queue));
      setExpenses([{ ...payload, id: `temp-${Date.now()}` }, ...expenses]);
      Swal.fire({ icon: 'info', title: 'ออฟไลน์', text: 'บันทึกลงเครื่องแล้ว' });
    } else {
      await supabase.from("trip_expenses").insert([payload]);
      await fetchExpenses();
      Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'บันทึกค่าน้ำมันเรียบร้อย', timer: 1500, showConfirmButton: false });
    }
    setOdoStart(odoEnd);
    setOdoEnd("");
  };

  const handleDelete = async (id) => {
    if(id.toString().startsWith('temp')) return Swal.fire({ icon: 'error', title: 'ออฟไลน์', text: 'ไม่สามารถลบรายการค้างซิงก์ได้ รอเน็ตกลับมาก่อนนะครับ' });
    
    const result = await Swal.fire({
      title: 'ลบรายการนี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonText: 'ยกเลิก',
      confirmButtonText: 'ลบเลย!'
    });

    if (result.isConfirmed) {
      await supabase.from("trip_expenses").delete().eq("id", id);
      await fetchExpenses();
      Swal.fire({ icon: 'success', title: 'ลบแล้ว', timer: 1000, showConfirmButton: false });
    }
  };

  // 🧠 ฟังก์ชันเคลียร์ยอดหนี้ให้เป็น 0
  const handleSettleDebt = async (from, to, amount) => {
    const result = await Swal.fire({
      title: 'ยืนยันการเคลียร์ยอด?',
      text: `${from} โอนให้ ${to} จำนวน ฿${amount.toLocaleString()} ถูกต้องไหม?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      confirmButtonText: 'ใช่, โอนแล้ว!',
      cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
      const today = new Date();
      const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
      
      const payload = {
        expense_date: formattedDate,
        item_name: `[เคลียร์ยอด] ${from} -> ${to}`,
        amount: amount,
        category: "✅ ประวัติการโอน",
        paid_by: from,
      };

      if (!navigator.onLine) {
        Swal.fire({ icon: 'error', title: 'ออฟไลน์', text: 'ต้องมีเน็ตถึงจะเคลียร์ยอดได้ครับ' });
      } else {
        await supabase.from("trip_expenses").insert([payload]);
        await fetchExpenses();
        Swal.fire({ icon: 'success', title: 'เคลียร์ยอดสำเร็จ!', text: `บันทึกการโอนเงินของ ${from} แล้ว ยอดหนี้เป็น 0`, timer: 2000, showConfirmButton: false });
      }
    }
  };

  const toggleDate = (d) => {
    setCollapsedDates(prev => ({ ...prev, [d]: !prev[d] }));
  };

  // แยกรายการปกติ กับ รายการเคลียร์ยอด ออกจากกัน
  const regularExpenses = expenses.filter(ex => ex.category !== "✅ ประวัติการโอน");
  const historyExpenses = expenses.filter(ex => ex.category === "✅ ประวัติการโอน");

  const groupedExpenses = useMemo(() => {
    const groups = {};
    regularExpenses.forEach((ex) => {
      if (!groups[ex.expense_date]) groups[ex.expense_date] = [];
      groups[ex.expense_date].push(ex);
    });
    return groups;
  }, [regularExpenses]);

  const totalExpense = useMemo(() => regularExpenses.reduce((sum, ex) => sum + Number(ex.amount), 0), [regularExpenses]);
  const perPerson = totalExpense / 4;

  const previewGasCost = odoStart && odoEnd && gasPrice && gasRate ? ((parseFloat(odoEnd) - parseFloat(odoStart)) / parseFloat(gasRate)) * parseFloat(gasPrice) : 0;

  // 🧠 อัลกอริทึมคำนวณเงินพร้อมหักลบประวัติการเคลียร์ยอด
  const settlements = useMemo(() => {
    const balances = MEMBERS.map((member) => {
      // 1. ยอดที่จ่ายให้กองกลาง
      const groupPaidAmount = regularExpenses.filter((e) => e.paid_by === member).reduce((sum, e) => sum + Number(e.amount), 0);
      let balance = groupPaidAmount - perPerson;
      
      // 2. เอาประวัติการโอนเงินมาหักลบ
      historyExpenses.forEach((e) => {
        if (e.paid_by === member) balance += Number(e.amount); // ถ้าเป็นคนโอน (ใช้หนี้) ยอดบาลานซ์จะเพิ่มขึ้น
        if (e.item_name.includes(`-> ${member}`)) balance -= Number(e.amount); // ถ้าเป็นคนรับโอน (ได้เงินคืน) ยอดบาลานซ์จะลดลง
      });

      return { member, balance, groupPaidAmount };
    });

    let debtors = balances.filter((b) => b.balance < -0.01).map((b) => ({ ...b }));
    let creditors = balances.filter((b) => b.balance > 0.01).map((b) => ({ ...b }));
    const transfers = [];

    let d = 0, c = 0;
    while (d < debtors.length && c < creditors.length) {
      let debtor = debtors[d], creditor = creditors[c];
      let amountToTransfer = Math.min(Math.abs(debtor.balance), creditor.balance);

      if (amountToTransfer > 0.01) transfers.push({ from: debtor.member, to: creditor.member, amount: amountToTransfer });

      debtor.balance += amountToTransfer;
      creditor.balance -= amountToTransfer;

      if (Math.abs(debtor.balance) < 0.01) d++;
      if (creditor.balance < 0.01) c++;
    }
    return { balances, transfers };
  }, [regularExpenses, historyExpenses, perPerson]);

  return (
    <div className="min-h-screen bg-gray-600 pb-20 font-sans relative">
      {/* 🟢 HEADER */}
      <div className="sticky top-0 z-40 bg-blue-600 text-white p-4 shadow-md">
        <div className="max-w-md mx-auto text-center relative">
          <button onClick={fetchExpenses} className="absolute right-0 top-5 p-2 bg-blue-700 hover:bg-blue-800 rounded-full transition" title="รีเฟรชข้อมูล">
            <RefreshCw size={24} className={isSyncing ? "animate-spin" : ""} />
          </button>
          <p className="text-sm font-light opacity-80 mt-1">ยอดรวมค่าใช้จ่ายทั้งทริป</p>
          <h1 className="text-4xl font-bold my-1">฿{totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h1>
          <p className="text-sm bg-blue-700 inline-block px-3 py-1 rounded-full">หาร 4 คน = ตกคนละ ฿{perPerson.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 items-start">
        
        {/* 🟢 CARD 1: เพิ่ม/แก้ไขรายการทั่วไป */}
        <div className={`p-5 rounded-xl shadow-sm border ${editId ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-300 border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-4 font-bold text-blue-600">
            {editId ? <Edit2 size={20} className="text-yellow-600"/> : <Receipt size={20} />} 
            <h2 className={editId ? "text-yellow-700" : ""}>{editId ? "แก้ไขรายการ" : "จดรายจ่ายใหม่"}</h2>
          </div>
          <form onSubmit={handleAddExpense} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">วันที่</label>
                <select value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50">
                  {DATES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">หมวดหมู่</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">ชื่อรายการ (เว้นว่างได้)</label>
              <input type="text" placeholder="ดึงชื่อหมวดหมู่อัตโนมัติ" value={item} onChange={(e) => setItem(e.target.value)} className="w-full p-2 border rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">จำนวนเงิน (บาท)</label>
                <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-2 border rounded-lg text-lg font-bold text-red-600" />
              </div>
              <div>
                <label className="text-xs text-gray-500">คนจ่ายสำรอง</label>
                <select value={paidBy} onChange={handlePaidByChange} className="w-full p-2 border rounded-lg bg-gray-50 font-bold text-blue-600">
                  {MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            
            {editId ? (
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-yellow-500 text-white font-bold py-3 rounded-lg hover:bg-yellow-600 transition">บันทึกแก้ไข</button>
                <button type="button" onClick={cancelEdit} className="bg-gray-400 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-500 transition">ยกเลิก</button>
              </div>
            ) : (
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition">บันทึกรายการ</button>
            )}
          </form>
        </div>

        {/* 🟢 CARD 2: น้ำมัน */}
        <div className="bg-gray-300 p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4 text-orange-500 font-bold">
            <Car size={20} /> <h2>คำนวณ & จดค่าน้ำมัน</h2>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">เลขไมล์เริ่มต้น</label>
                <input type="number" value={odoStart} onChange={(e) => setOdoStart(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50" />
              </div>
              <div>
                <label className="text-xs text-gray-500">เลขไมล์ล่าสุด</label>
                <input type="number" value={odoEnd} onChange={(e) => setOdoEnd(e.target.value)} className="w-full p-2 border rounded-lg bg-yellow-50" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">ราคาน้ำมัน (บ./ลิตร)</label>
                <input type="number" value={gasPrice} onChange={(e) => setGasPrice(e.target.value)} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="text-xs text-gray-500">อัตรากินน้ำมัน (กม./ล.)</label>
                <input type="number" value={gasRate} onChange={(e) => setGasRate(e.target.value)} className="w-full p-2 border rounded-lg" />
              </div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg text-center my-2 border border-orange-100">
              <p className="text-xs text-orange-600 mb-1">ยอดค่าน้ำมันจำลอง (หาร 4 แล้ว)</p>
              <h3 className="text-2xl font-bold text-orange-600">฿{previewGasCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
            <button onClick={handleAddGas} className="w-full bg-orange-500 text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition">+ บันทึกค่าน้ำมัน</button>
          </div>
        </div>

        {/* 🟢 CARD 3: Feed รายการทั้งหมด */}
        <div className="bg-gray-300 p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-gray-700 font-bold">
              <Receipt size={20} /> <h2>รายการ ({regularExpenses.length})</h2>
            </div>
            <button onClick={() => setIsListExpanded(!isListExpanded)} className="flex items-center gap-1 text-xs bg-white text-gray-600 px-3 py-1.5 rounded-full shadow-sm">
              {isListExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />} {isListExpanded ? "ย่อเก็บ" : "ดูเต็ม"}
            </button>
          </div>
          {loading ? <p className="text-center text-gray-400 py-4">กำลังโหลด...</p> : regularExpenses.length === 0 ? <p className="text-center text-gray-400 py-4">ไม่มีรายการ</p> : (
            <div className={`space-y-4 pr-2 transition-all ${!isListExpanded ? "max-h-96 overflow-y-auto" : ""}`}>
              {Object.keys(groupedExpenses).map((d) => (
                <div key={d} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <button onClick={() => toggleDate(d)} className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 border-b border-gray-100">
                    <div className="flex items-center gap-2 font-bold text-gray-700">
                      {collapsedDates[d] ? <FolderClosed size={16} className="text-blue-500"/> : <FolderOpen size={16} className="text-blue-500"/>}
                      <span>{d}</span>
                      <span className="text-xs font-normal text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">{groupedExpenses[d].length} รายการ</span>
                    </div>
                    {collapsedDates[d] ? <ChevronRight size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </button>
                  {!collapsedDates[d] && (
                    <div className="divide-y divide-gray-100">
                      {groupedExpenses[d].map((ex) => (
                        <div key={ex.id} className="flex justify-between items-center p-3 pl-8">
                          <div className="flex-1">
                            <p className="text-xs text-gray-400 mb-0.5">จ่ายโดย: <span className="font-bold text-blue-600">{ex.paid_by}</span></p>
                            <p className="font-medium text-gray-800">{ex.item_name}</p>
                            <p className="text-xs text-gray-500">{ex.category}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-red-600">฿{Number(ex.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            <button onClick={() => handleEdit(ex)} className="text-gray-300 hover:text-yellow-500 transition ml-2"><Edit2 size={16} /></button>
                            <button onClick={() => handleDelete(ex.id)} className="text-gray-300 hover:text-red-500 transition"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🟢 CARD 4: สรุปเคลียร์เงิน */}
        <div className="bg-gray-300 p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4 text-green-600 font-bold">
            <Users size={20} /> <h2>สรุปเคลียร์เงิน</h2>
          </div>
          <div className="space-y-2 mb-6">
            {settlements.transfers.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-2">ทุกคนเคลียร์เงินครบแล้ว 🎉</p>
            ) : (
              settlements.transfers.map((t, i) => (
                <div key={i} className="bg-green-50 p-3 rounded-lg border border-green-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 font-medium">
                      <span className="text-red-500">{t.from}</span>
                      <ArrowRight size={16} className="text-gray-400" />
                      <span className="text-green-600">{t.to}</span>
                    </div>
                    <div className="font-bold text-green-700">฿{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                  <button onClick={() => handleSettleDebt(t.from, t.to, t.amount)} className="w-full flex items-center justify-center gap-1 bg-green-500 text-white text-xs py-2 rounded shadow-sm hover:bg-green-600 transition">
                    <CheckCircle size={14} /> เคลียร์ยอดนี้
                  </button>
                </div>
              ))
            )}
          </div>
          <hr className="my-4 border-gray-400" />
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-bold mb-2">สรุปยอดสุทธิแต่ละคน</p>
            {settlements.balances.map((b) => (
              <div key={b.member} className="flex justify-between items-center text-sm">
                <div className="font-medium text-gray-700">{b.member}</div>
                <div className="text-right">
                  {b.balance > 0.01 ? <span className="text-green-600 font-bold">(ได้คืน ฿{b.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })})</span>
                  : b.balance < -0.01 ? <span className="text-red-500 font-bold">(ติดลบ ฿{Math.abs(b.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })})</span>
                  : <span className="text-gray-400 font-bold">(พอดี)</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 🟢 FAB: ปุ่มดูประวัติการเคลียร์เงิน */}
      <button 
        onClick={() => setShowHistory(true)} 
        className="fixed bottom-6 right-6 bg-blue-700 text-white p-4 rounded-full shadow-xl hover:bg-blue-800 transition z-40"
      >
        <History size={24} />
      </button>

      {/* 🟢 MODAL: ประวัติการเคลียร์ยอด */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
              <h2 className="font-bold flex items-center gap-2"><History size={20} /> ประวัติการเคลียร์ยอด</h2>
              <button onClick={() => setShowHistory(false)} className="hover:text-blue-200"><X size={24} /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {historyExpenses.length === 0 ? (
                <p className="text-center text-gray-400 py-10">ยังไม่มีประวัติการโอนเงิน</p>
              ) : (
                <div className="space-y-3">
                  {historyExpenses.map(ex => (
                    <div key={ex.id} className="bg-gray-50 border border-gray-100 p-3 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-400">{ex.expense_date}</p>
                        <p className="font-medium text-gray-700">{ex.item_name}</p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <p className="font-bold text-green-600">฿{ex.amount.toLocaleString()}</p>
                        <button onClick={() => handleDelete(ex.id)} className="text-gray-300 hover:text-red-500 transition"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
