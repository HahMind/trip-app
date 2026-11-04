import React, { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { Trash2, Car, Receipt, Calculator, Users, RefreshCw, ArrowRight } from "lucide-react";

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

  // Form State: รายจ่ายทั่วไป
  const [date, setDate] = useState(DATES[0]);
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [paidBy, setPaidBy] = useState(MEMBERS[0]);

  // Form State: ค่าน้ำมัน & เลขไมล์
  const [odoStart, setOdoStart] = useState("");
  const [odoEnd, setOdoEnd] = useState("");
  const [gasPrice, setGasPrice] = useState("");
  const [gasRate, setGasRate] = useState("11");

  // ดึงข้อมูลครั้งแรก & ตั้งค่า Realtime
  useEffect(() => {
    fetchExpenses();
    const subscription = supabase
      .channel("trip_expenses_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_expenses" },
        (payload) => {
          fetchExpenses();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchExpenses = async () => {
    setIsSyncing(true);
    const { data, error } = await supabase
      .from("trip_expenses")
      .select("*")
      .order("created_at", { ascending: false });
      
    if (data) {
      setExpenses(data);
      const latestOdo = data.find((ex) => ex.odometer_end !== null);
      if (latestOdo) setOdoStart(latestOdo.odometer_end.toString());
    }
    setLoading(false);
    setTimeout(() => setIsSyncing(false), 500); // ดีเลย์อนิเมชั่นนิดนึงให้ดูสมูท
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!amount) return alert("กรุณากรอกจำนวนเงิน");

    const finalItemName = item.trim() === "" ? category : item;

    const { error } = await supabase.from("trip_expenses").insert([
      {
        expense_date: date,
        item_name: finalItemName,
        amount: parseFloat(amount),
        category,
        paid_by: paidBy,
      },
    ]);

    if (error) return alert("เกิดข้อผิดพลาดในการบันทึก: " + error.message);

    setItem("");
    setAmount("");
  };

  const handleAddGas = async () => {
    if (!odoStart || !odoEnd || !gasPrice || !gasRate)
      return alert("กรอกข้อมูลให้ครบถ้วน");

    const distance = parseFloat(odoEnd) - parseFloat(odoStart);
    const cost = (distance / parseFloat(gasRate)) * parseFloat(gasPrice);

    const { error } = await supabase.from("trip_expenses").insert([
      {
        expense_date: date,
        item_name: `ค่าน้ำมัน (ไมล์ ${odoStart}-${odoEnd})`,
        amount: cost,
        category: "⛽ ค่าน้ำมัน",
        paid_by: paidBy,
        odometer_start: parseFloat(odoStart),
        odometer_end: parseFloat(odoEnd),
      },
    ]);

    if (error) return alert("เกิดข้อผิดพลาดในการบันทึก: " + error.message);

    setOdoStart(odoEnd);
    setOdoEnd("");
  };

  const handleDelete = async (id) => {
    if (window.confirm("ต้องการลบรายการนี้ใช่ไหม?")) {
      const { error } = await supabase.from("trip_expenses").delete().eq("id", id);
      if (error) alert("ลบข้อมูลไม่สำเร็จ: " + error.message);
    }
  };

  // Calculations
  const totalExpense = useMemo(
    () => expenses.reduce((sum, ex) => sum + Number(ex.amount), 0),
    [expenses]
  );
  const perPerson = totalExpense / 4;

  const previewGasCost =
    odoStart && odoEnd && gasPrice && gasRate
      ? ((parseFloat(odoEnd) - parseFloat(odoStart)) / parseFloat(gasRate)) *
        parseFloat(gasPrice)
      : 0;

  // 🧠 อัลกอริทึมคำนวณว่าใครต้องโอนให้ใคร
  const settlements = useMemo(() => {
    // 1. หายอดคงเหลือของแต่ละคน
    const balances = MEMBERS.map((member) => {
      const paidAmount = expenses
        .filter((e) => e.paid_by === member)
        .reduce((sum, e) => sum + Number(e.amount), 0);
      return { member, balance: paidAmount - perPerson, paidAmount };
    });

    // 2. แยกกลุ่มคนเป็นหนี้ (balance < 0) และ เจ้าหนี้ (balance > 0)
    let debtors = balances.filter((b) => b.balance < -0.01).map(b => ({...b}));
    let creditors = balances.filter((b) => b.balance > 0.01).map(b => ({...b}));

    const transfers = [];

    // 3. จับคู่จ่ายหนี้
    let d = 0;
    let c = 0;
    while (d < debtors.length && c < creditors.length) {
      let debtor = debtors[d];
      let creditor = creditors[c];

      let amountToTransfer = Math.min(Math.abs(debtor.balance), creditor.balance);

      if (amountToTransfer > 0.01) {
        transfers.push({
          from: debtor.member,
          to: creditor.member,
          amount: amountToTransfer,
        });
      }

      debtor.balance += amountToTransfer;
      creditor.balance -= amountToTransfer;

      if (Math.abs(debtor.balance) < 0.01) d++;
      if (creditor.balance < 0.01) c++;
    }

    return { balances, transfers };
  }, [expenses, perPerson]);

  return (
    <div className="min-h-screen bg-gray-100 pb-20 font-sans ">
      {/* 🟢 HEADER */}
      <div className="sticky top-0 z-50 bg-blue-600 text-white p-4 shadow-md">
        <div className="max-w-md mx-auto text-center relative">
          {/* ปุ่ม Sync สำหรับมือถือ */}
          <button 
            onClick={fetchExpenses} 
            className="absolute right-0 top-0 p-2 bg-blue-700 hover:bg-blue-800 rounded-full transition"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
          </button>

          <p className="text-sm font-light opacity-80 mt-1">ยอดรวมค่าใช้จ่ายทั้งทริป</p>
          <h1 className="text-4xl font-bold my-1">
            ฿
            {totalExpense.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h1>
          <p className="text-sm bg-blue-700 inline-block px-3 py-1 rounded-full">
            หาร 4 คน = ตกคนละ ฿
            {perPerson.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* 🟢 CARD 1: เพิ่มรายการทั่วไป */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4 text-blue-600 font-bold">
            <Receipt size={20} /> <h2>จดรายจ่ายใหม่</h2>
          </div>
          <form onSubmit={handleAddExpense} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">วันที่</label>
                <select
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-gray-50"
                >
                  {DATES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">หมวดหมู่</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-gray-50"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">ชื่อรายการ (เว้นว่างได้)</label>
              <input
                type="text"
                placeholder="ดึงชื่อหมวดหมู่อัตโนมัติ"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">จำนวนเงิน (บาท)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-2 border rounded-lg text-lg font-bold text-red-600"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">คนจ่ายสำรอง</label>
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-gray-50 font-bold text-blue-600"
                >
                  {MEMBERS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition"
            >
              บันทึกรายการ
            </button>
          </form>
        </div>

        {/* 🟢 CARD 2: โมดูลน้ำมันและเลขไมล์ */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4 text-orange-500 font-bold">
            <Car size={20} /> <h2>คำนวณ & จดค่าน้ำมัน</h2>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">เลขไมล์เริ่มต้น</label>
                <input
                  type="number"
                  value={odoStart}
                  onChange={(e) => setOdoStart(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-gray-50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">เลขไมล์ล่าสุด</label>
                <input
                  type="number"
                  value={odoEnd}
                  onChange={(e) => setOdoEnd(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-yellow-50"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">ราคาน้ำมัน (บ./ลิตร)</label>
                <input
                  type="number"
                  value={gasPrice}
                  onChange={(e) => setGasPrice(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">อัตรากินน้ำมัน (กม./ล.)</label>
                <input
                  type="number"
                  value={gasRate}
                  onChange={(e) => setGasRate(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="bg-orange-50 p-3 rounded-lg text-center my-2 border border-orange-100">
              <p className="text-xs text-orange-600 mb-1">ยอดค่าน้ำมันจำลอง (หาร 4 แล้ว)</p>
              <h3 className="text-2xl font-bold text-orange-600">
                ฿
                {previewGasCost.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </h3>
            </div>
            <button
              onClick={handleAddGas}
              className="w-full bg-orange-500 text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition"
            >
              + บันทึกเป็นรายจ่ายค่าน้ำมัน
            </button>
          </div>
        </div>

        {/* 🟢 CARD 3: สรุปเคลียร์เงิน (อัปเกรดใหม่) */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4 text-green-600 font-bold">
            <Users size={20} /> <h2>สรุปเคลียร์เงิน (ใครต้องโอนให้ใคร)</h2>
          </div>
          
          {/* ส่วนแสดงบิลการโอนเงิน */}
          <div className="space-y-2 mb-6">
            {settlements.transfers.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-2">ยังไม่มีรายการที่ต้องเคลียร์</p>
            ) : (
              settlements.transfers.map((t, i) => (
                <div key={i} className="flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-100">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="text-red-500">{t.from}</span>
                    <ArrowRight size={16} className="text-gray-400" />
                    <span className="text-green-600">{t.to}</span>
                  </div>
                  <div className="font-bold text-green-700">
                    ฿{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              ))
            )}
          </div>

          <hr className="my-4 border-gray-100" />

          {/* ส่วนแสดงสรุปยอดจ่ายของแต่ละคนเหมือนเดิม */}
          <div className="space-y-3">
            <p className="text-xs text-gray-500 font-bold mb-2">สรุปยอดสุทธิแต่ละคน</p>
            {settlements.balances.map((b) => (
              <div key={b.member} className="flex justify-between items-center text-sm">
                <div className="font-medium text-gray-700">{b.member}</div>
                <div className="text-right">
                  <span className="text-gray-500 mr-2">จ่ายไป: ฿{b.paidAmount.toLocaleString()}</span>
                  {b.balance > 0.01 ? (
                    <span className="text-green-600 font-bold">(ได้คืน ฿{b.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })})</span>
                  ) : b.balance < -0.01 ? (
                    <span className="text-red-500 font-bold">(ติดลบ ฿{Math.abs(b.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })})</span>
                  ) : (
                    <span className="text-gray-400 font-bold">(พอดี)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 🟢 CARD 4: Feed รายการทั้งหมด */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4 text-gray-700 font-bold">
            <Receipt size={20} /> <h2>รายการทั้งหมด ({expenses.length})</h2>
          </div>
          {loading ? (
            <p className="text-center text-gray-400 py-4">กำลังโหลดข้อมูล...</p>
          ) : expenses.length === 0 ? (
            <p className="text-center text-gray-400 py-4">ยังไม่มีรายจ่าย</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {expenses.map((ex) => (
                <div
                  key={ex.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div className="flex-1">
                    <p className="text-xs text-gray-400">
                      {ex.expense_date} | จ่ายโดย:{" "}
                      <span className="font-bold text-blue-600">{ex.paid_by}</span>
                    </p>
                    <p className="font-medium text-gray-800">{ex.item_name}</p>
                    <p className="text-xs text-gray-500">{ex.category}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-bold text-red-600">
                      ฿
                      {Number(ex.amount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <button
                      onClick={() => handleDelete(ex.id)}
                      className="text-gray-400 hover:text-red-500 mt-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
