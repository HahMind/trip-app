import { WifiOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { dynaura, Toaster } from "dynaura";
import { CATEGORIES, HISTORY_CATEGORY, SWAL_THEME } from "./data/constants";
import {
  formatForDB,
  formatMoney,
  getStoredMemberDetails,
  getStoredMembers,
  getTodayISO,
  getOfflineQueue,
  parseForUI,
  saveOfflineQueue,
} from "./utils/trip";
import SettlementDetailsModal from "./components/SettlementDetailsModal";
import ExpenseForm from "./components/ExpenseForm";
import ExpenseList from "./components/ExpenseList";
import HistoryModal from "./components/HistoryModal";
import MemberModal from "./components/MemberModal";
import PaymentModal from "./components/PaymentModal";
import SplitModal from "./components/SplitModal";
import TripHeader from "./components/TripHeader";
import TripSummaryModal from "./components/TripSummaryModal";
import ThemeMenu from "./components/ThemeMenu";
import SettlementSection from "./components/SettlementSection";
import usePinchGuard from "./hooks/usePinchGuard";
import useTripData from "./hooks/useTripData";
import useSettlements from "./hooks/useSettlements";
import { supabase } from "./services/supabase";

const version_number = "3.4.2";
const TEMP_SPLIT_STORAGE_KEY = "tempSplitBetween";
const SPLIT_MEMORY_TTL_MS = 5 * 60 * 1000; // จำค่าชั่วคราว 5 นาทีสำหรับคนจ่ายคนเดิม

const readTempSplit = (members, expectedPayer) => {
  if (!expectedPayer) return null;
  try {
    const raw = JSON.parse(
      localStorage.getItem(TEMP_SPLIT_STORAGE_KEY) || "null",
    );
    if (
      !raw ||
      raw.payer !== expectedPayer ||
      !Array.isArray(raw.split) ||
      typeof raw.expiresAt !== "number"
    ) {
      return null;
    }
    if (Date.now() >= raw.expiresAt) {
      localStorage.removeItem(TEMP_SPLIT_STORAGE_KEY);
      return null;
    }
    const validSplit = raw.split.filter((member) => members.includes(member));
    if (validSplit.length === 0) {
      localStorage.removeItem(TEMP_SPLIT_STORAGE_KEY);
      return null;
    }
    return {
      payer: expectedPayer,
      split: validSplit,
      expiresAt: raw.expiresAt,
    };
  } catch {
    localStorage.removeItem(TEMP_SPLIT_STORAGE_KEY);
    return null;
  }
};

const writeTempSplit = (
  payer,
  split,
  expiresAt = Date.now() + SPLIT_MEMORY_TTL_MS,
) => {
  localStorage.setItem(
    TEMP_SPLIT_STORAGE_KEY,
    JSON.stringify({ payer, split, expiresAt }),
  );
  return expiresAt;
};

const clearTempSplit = () => {
  localStorage.removeItem(TEMP_SPLIT_STORAGE_KEY);
};

export default function App() {
  const [memberDetails, setMemberDetails] = useState(getStoredMemberDetails);

  const [paidBy, setPaidBy] = useState(() => {
    const saved = localStorage.getItem("defaultPaidBy");
    const storedMembers = getStoredMembers();
    return saved && storedMembers.includes(saved)
      ? saved
      : storedMembers[0] || "";
  });

  const [draftSplitBetween, setDraftSplitBetween] = useState(() => {
    const storedMembers = getStoredMembers();
    const saved = localStorage.getItem("defaultPaidBy");
    const initialPayer =
      saved && storedMembers.includes(saved) ? saved : storedMembers[0] || "";
    const temp = readTempSplit(storedMembers, initialPayer);
    return temp ? temp.split : initialPayer ? [initialPayer] : [];
  });

  const [splitExpiresAt, setSplitExpiresAt] = useState(() => {
    const storedMembers = getStoredMembers();
    const saved = localStorage.getItem("defaultPaidBy");
    const initialPayer =
      saved && storedMembers.includes(saved) ? saved : storedMembers[0] || "";
    const temp = readTempSplit(storedMembers, initialPayer);
    return temp ? temp.expiresAt : null;
  });

  const [editPaidBy, setEditPaidBy] = useState("");
  const [editSplitBetween, setEditSplitBetween] = useState([]);

  const updatePaidByFromMembers = useCallback((members) => {
    setPaidBy((previous) => {
      const nextPayer = members.includes(previous)
        ? previous
        : members[0] || "";
      const temp = readTempSplit(members, nextPayer);
      if (temp) {
        writeTempSplit(nextPayer, temp.split, temp.expiresAt);
        setDraftSplitBetween(temp.split);
        setSplitExpiresAt(temp.expiresAt);
      } else {
        clearTempSplit();
        setSplitExpiresAt(null);
        setDraftSplitBetween(nextPayer ? [nextPayer] : []);
      }
      return nextPayer;
    });

    setEditPaidBy((previous) => {
      if (!previous) return previous;
      return members.includes(previous) ? previous : members[0] || "";
    });

    setEditSplitBetween((previous) => {
      if (previous.length === 0) return previous;
      const valid = previous.filter((member) => members.includes(member));
      return valid.length > 0 ? valid : members[0] ? [members[0]] : [];
    });
  }, []);

  const updateMemberDetailsFromSupabase = useCallback((details) => {
    setMemberDetails(details);
  }, []);
  const {
    members: MEMBERS,
    expenses,
    setExpenses,
    isOffline,
    loading,
    isSyncing,
    refreshMembers,
    refreshExpenses,
  } = useTripData(updatePaidByFromMembers, updateMemberDetailsFromSupabase);

  const [isListExpanded, setIsListExpanded] = useState(false);
  const [collapsedDates, setCollapsedDates] = useState({});
  const [showHistory, setShowHistory] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showTripSummary, setShowTripSummary] = useState(false);
  const [activePayment, setActivePayment] = useState(null);
  const [activeSettlementDetails, setActiveSettlementDetails] = useState(null);
  const [activeSplitExpense, setActiveSplitExpense] = useState(null);
  const [editId, setEditId] = useState(null);
  const [swipedId, setSwipedId] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [pendingMemberAction, setPendingMemberAction] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [pendingSplitId, setPendingSplitId] = useState(null);
  const [pendingSettlement, setPendingSettlement] = useState(null);
  const [pendingHistoryId, setPendingHistoryId] = useState(null);
  const expenseSubmitLock = useRef(false);
  const settlementSubmitLock = useRef(false);
  const syncOfflineQueueLock = useRef(false);
  const [didEditOdometerStart, setDidEditOdometerStart] = useState(false);
  usePinchGuard();

  const [date, setDate] = useState(getTodayISO());
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);

  const [odometerStart, setOdometerStart] = useState("");
  const [odometerEnd, setOdometerEnd] = useState("");

  // ตั้งเวลานับถอยหลัง 10 นาที เพื่อรีเซ็ตคนหารกลับไปเป็นคนจ่ายคนเดียวอัตโนมัติ
  useEffect(() => {
    if (!splitExpiresAt) return;
    const remainingMs = splitExpiresAt - Date.now();
    if (remainingMs <= 0) {
      clearTempSplit();
      setSplitExpiresAt(null);
      setDraftSplitBetween(paidBy ? [paidBy] : []);
      return;
    }

    const timer = setTimeout(() => {
      clearTempSplit();
      setSplitExpiresAt(null);
      setDraftSplitBetween(paidBy ? [paidBy] : []);
    }, remainingMs);

    return () => clearTimeout(timer);
  }, [splitExpiresAt, paidBy]);

  const handleAppClick = () => {
    if (swipedId) setSwipedId(null);
  };

  const syncOfflineQueue = useCallback(async () => {
    if (!navigator.onLine || syncOfflineQueueLock.current) return;
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    syncOfflineQueueLock.current = true;
    const sortedQueue = [...queue].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at),
    );
    const cleanPayloads = sortedQueue.map((item) => {
      const payload = { ...item };
      delete payload.id;
      delete payload.isPendingSync;
      return payload;
    });

    try {
      const { error } = await supabase
        .from("trip_expenses")
        .insert(cleanPayloads);
      if (error) throw error;

      saveOfflineQueue([]);
      await refreshExpenses();
      dynaura.success({
        title: "ซิงค์รายการออฟไลน์สำเร็จ",
        description: `${sortedQueue.length} รายการ`,
        duration: 4000,
      });
    } catch (error) {
      dynaura.error({
        title: "ซิงค์รายการออฟไลน์ไม่สำเร็จ",
        description: error.message,
        duration: 5000,
      });
    } finally {
      syncOfflineQueueLock.current = false;
    }
  }, [refreshExpenses]);

  useEffect(() => {
    const handleOnline = () => syncOfflineQueue();
    window.addEventListener("online", handleOnline);
    if (navigator.onLine) syncOfflineQueue();
    return () => window.removeEventListener("online", handleOnline);
  }, [syncOfflineQueue]);

  useEffect(() => {
    if (editId || didEditOdometerStart) return;
    const latestGasExpense = [...expenses]
      .filter(
        (expense) =>
          expense.category === "ค่าน้ำมัน" &&
          expense.odometer_end != null &&
          expense.odometer_end !== "",
      )
      .sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
      )[0];
    if (latestGasExpense) {
      setOdometerStart(String(latestGasExpense.odometer_end));
    }
  }, [expenses, editId, didEditOdometerStart]);

  const handleAddMember = async (name, details) => {
    if (pendingMemberAction) return;
    if (isOffline)
      return dynaura.warning({
        title: "ออฟไลน์",
        description: "ไม่สามารถเพิ่มสมาชิกขณะออฟไลน์ได้",
        duration: 4000,
      });

    if (!MEMBERS.includes(name)) {
      setPendingMemberAction(name);
      const notificationId = dynaura.loading({
        id: `add-member-${Date.now()}`,
        title: `กำลังเพิ่ม ${name}`,
        description: "กำลังบันทึกสมาชิกลงฐานข้อมูล",
        progress: 0.15,
      });
      try {
        const { error } = await supabase.from("trip_members").insert([
          {
            name,
            promptpay: details?.promptpay || null,
            bank_id: details?.bankId || null,
            bank_acc: details?.bankAcc || null,
          },
        ]);
        if (error) throw error;
        dynaura.update(notificationId, { progress: 0.72 });

        setPaidBy(name);
        localStorage.setItem("defaultPaidBy", name);
        clearTempSplit();
        setSplitExpiresAt(null);
        setDraftSplitBetween([name]);

        await refreshMembers();

        if (details) handleUpdateMemberDetails(name, details, false);
        dynaura.update(notificationId, {
          type: "success",
          title: "เพิ่ม " + name + " สำเร็จ",
          description: undefined,
          progress: undefined,
          duration: 3000,
        });
      } catch (error) {
        dynaura.update(notificationId, {
          type: "error",
          title: "เพิ่มไม่สำเร็จ",
          description: error.message,
          progress: undefined,
          duration: 5000,
        });
      } finally {
        setPendingMemberAction(null);
      }
    }
  };

  const handleUpdateMemberDetails = async (name, details, showToast = true) => {
    try {
      const { error } = await supabase
        .from("trip_members")
        .update({
          promptpay: details.promptpay || null,
          bank_id: details.bankId || null,
          bank_acc: details.bankAcc || null,
        })
        .eq("name", name);
      if (error) throw error;

      const updated = { ...memberDetails, [name]: details };
      setMemberDetails(updated);
      localStorage.setItem("memberDetails", JSON.stringify(updated));
      if (showToast)
        dynaura.success({
          title: "บันทึกข้อมูลเรียบร้อย",
          description: `ข้อมูลการชำระเงินของ ${name}`,
          duration: 1000,
        });
    } catch (error) {
      dynaura.error({
        title: "บันทึกข้อมูลไม่สำเร็จ",
        description: error.message,
        duration: 5000,
      });
    }
  };

  const handleRemoveMember = async (name, hasDebt) => {
    if (pendingMemberAction) return;
    if (isOffline)
      return dynaura.warning({
        title: "ออฟไลน์",
        description: "ไม่สามารถลบสมาชิกขณะออฟไลน์ได้",
        duration: 4000,
      });
    if (MEMBERS.length <= 1)
      return dynaura.warning({
        title: "ลบไม่ได้",
        description: "ต้องมีสมาชิกอย่างน้อย 1 คน",
        duration: 4000,
      });
    if (hasDebt)
      return dynaura.error({
        title: "ลบไม่ได้",
        description: `${name} มียอดค้างชำระอยู่`,
        duration: 4000,
      });

    const result = await Swal.fire({
      ...SWAL_THEME,
      title: "ยืนยันการลบ",
      text: `ลบ ${name} ออกจากทริป?`,
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      customClass: {
        ...SWAL_THEME.customClass,
        confirmButton:
          "bg-red-600 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-red-500 transition text-sm cursor-pointer",
      },
    });
    if (!result.isConfirmed) return;
    setPendingMemberAction(name);
    const notificationId = dynaura.loading({
      id: `remove-member-${name}-${Date.now()}`,
      title: `กำลังลบ ${name}`,
      description: "กำลังอัปเดตรายชื่อสมาชิก",
      progress: 0.15,
    });
    try {
      const { error } = await supabase
        .from("trip_members")
        .delete()
        .eq("name", name);
      if (error) throw error;
      dynaura.update(notificationId, { progress: 0.72 });
      await refreshMembers();
      dynaura.update(notificationId, {
        type: "success",
        title: `ลบ ${name} แล้ว`,
        description: undefined,
        progress: undefined,
        duration: 3000,
      });
    } catch (error) {
      dynaura.update(notificationId, {
        type: "error",
        title: "ลบไม่สำเร็จ",
        description: error.message,
        progress: undefined,
        duration: 5000,
      });
    } finally {
      setPendingMemberAction(null);
    }
  };

  const handleAddExpense = async (event) => {
    event.preventDefault();
    if (expenseSubmitLock.current) return;

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0)
      return Swal.fire({
        ...SWAL_THEME,
        icon: "warning",
        title: "กรุณากรอกจำนวนเงิน",
      });

    const wasEditing = Boolean(editId);
    const currentPayer = wasEditing ? editPaidBy : paidBy;
    const isTempSplitValid = Boolean(
      splitExpiresAt && Date.now() < splitExpiresAt,
    );

    if (!wasEditing && !isTempSplitValid && splitExpiresAt) {
      clearTempSplit();
      setSplitExpiresAt(null);
      setDraftSplitBetween(paidBy ? [paidBy] : []);
    }

    const targetSplit = wasEditing
      ? editSplitBetween.length > 0
        ? editSplitBetween
        : [currentPayer]
      : isTempSplitValid && draftSplitBetween.length > 0
        ? draftSplitBetween
        : [currentPayer];

    const payload = {
      expense_date: formatForDB(date),
      item_name: item.trim() || category,
      amount: numericAmount,
      category,
      paid_by: currentPayer,
      split_between: targetSplit,
      odometer_start:
        category === "ค่าน้ำมัน" && odometerStart
          ? Number(odometerStart)
          : null,
      odometer_end:
        category === "ค่าน้ำมัน" && odometerEnd ? Number(odometerEnd) : null,
    };

    if (isOffline && !editId) {
      try {
        expenseSubmitLock.current = true;
        setIsSubmittingExpense(true);

        const offlineExpense = {
          ...payload,
          id: `offline_${crypto.randomUUID()}`,
          isPendingSync: true,
          created_at: new Date().toISOString(),
        };
        const queue = getOfflineQueue();
        saveOfflineQueue([...queue, offlineExpense]);

        const cachedData = localStorage.getItem("tripExpensesCache");
        const cachedExpenses = cachedData ? JSON.parse(cachedData) : [];
        const baseExpenses = cachedExpenses.filter(
          (expense) => !expense.isPendingSync,
        );
        const mergedExpenses = [...baseExpenses, ...queue, offlineExpense].sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
        );
        setExpenses(mergedExpenses);
        localStorage.setItem(
          "tripExpensesCache",
          JSON.stringify(mergedExpenses),
        );

        setItem("");
        setAmount("");
        setCategory(CATEGORIES[0]);
        setOdometerEnd("");
        setDidEditOdometerStart(false);
        dynaura.success({
          title: "บันทึกออฟไลน์แล้ว (รอซิงค์เมื่อมีเน็ต)",
          description: `${formatMoney(numericAmount)} บาท`,
          duration: 4000,
        });
      } finally {
        expenseSubmitLock.current = false;
        setIsSubmittingExpense(false);
      }
      return;
    }

    if (isOffline) {
      return Swal.fire({
        ...SWAL_THEME,
        icon: "warning",
        title: "ออฟไลน์",
        text: "ไม่สามารถแก้ไขรายการขณะออฟไลน์ได้",
      });
    }

    expenseSubmitLock.current = true;
    setIsSubmittingExpense(true);
    const notificationId = dynaura.loading({
      id: `expense-${wasEditing ? "edit" : "add"}-${Date.now()}`,
      title: wasEditing ? "กำลังแก้ไขรายการ" : "กำลังบันทึกรายการ",
      description: item.trim() || category,
      progress: 0.12,
    });

    try {
      if (wasEditing) {
        const { error } = await supabase
          .from("trip_expenses")
          .update(payload)
          .eq("id", editId);
        if (error) throw error;
        dynaura.update(notificationId, { progress: 0.72 });
        setEditId(null);
        setEditPaidBy("");
        setEditSplitBetween([]);
        setHighlightedId(editId);
        setTimeout(() => setHighlightedId(null), 2000);
      } else {
        const { error } = await supabase
          .from("trip_expenses")
          .insert([payload]);
        if (error) throw error;
        dynaura.update(notificationId, { progress: 0.72 });
      }

      await refreshExpenses();
      dynaura.update(notificationId, { progress: 1 });
      setItem("");
      setAmount("");
      setCategory(CATEGORIES[0]);
      setOdometerEnd("");
      dynaura.update(notificationId, {
        type: "success",
        title: wasEditing ? "แก้ไขสำเร็จ" : "บันทึกสำเร็จ",
        description: `${formatMoney(numericAmount)} บาท`,
        progress: undefined,
        duration: 4000,
        confetti: true,
      });
    } catch (error) {
      dynaura.update(notificationId, {
        type: "error",
        title: wasEditing ? "แก้ไขไม่สำเร็จ" : "บันทึกไม่สำเร็จ",
        description: error.message,
        progress: undefined,
        duration: 5000,
      });
    } finally {
      expenseSubmitLock.current = false;
      setIsSubmittingExpense(false);
    }
  };

  const handleUpdateSplit = async (id, newSplit) => {
    if (id === null) {
      if (editId) {
        const nextEditSplit = newSplit.length > 0 ? newSplit : [editPaidBy];
        setEditSplitBetween(nextEditSplit);
      } else {
        const nextSplit = newSplit.length > 0 ? newSplit : [paidBy];
        const isOnlyPayer = nextSplit.length === 1 && nextSplit[0] === paidBy;

        setDraftSplitBetween(nextSplit);
        if (isOnlyPayer) {
          clearTempSplit();
          setSplitExpiresAt(null);
        } else {
          const nextExpiresAt = writeTempSplit(paidBy, nextSplit);
          setSplitExpiresAt(nextExpiresAt);
        }
      }
      setActiveSplitExpense(null);
      return true;
    }
    if (pendingSplitId) return false;
    if (isOffline) {
      dynaura.warning({
        title: "ออฟไลน์",
        description: "ไม่สามารถแก้ไขการหารขณะออฟไลน์ได้",
        duration: 4000,
      });
      return false;
    }
    setPendingSplitId(id);
    const notificationId = dynaura.loading({
      id: `update-split-${id}-${Date.now()}`,
      title: "กำลังอัปเดตการหาร",
      description: "กำลังบันทึกผู้ร่วมรายการ",
      progress: 0.15,
    });
    try {
      const { error } = await supabase
        .from("trip_expenses")
        .update({ split_between: newSplit })
        .eq("id", id);
      if (error) throw error;
      dynaura.update(notificationId, { progress: 0.72 });
      await refreshExpenses();
      dynaura.update(notificationId, {
        type: "success",
        title: "อัปเดตการหารสำเร็จ",
        description: "ยอดแบ่งรายการได้รับการอัปเดต",
        progress: undefined,
        duration: 3000,
      });
      return true;
    } catch (error) {
      dynaura.update(notificationId, {
        type: "error",
        title: "อัปเดตไม่สำเร็จ",
        description: error.message,
        progress: undefined,
        duration: 5000,
      });
      return false;
    } finally {
      setPendingSplitId(null);
    }
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditPaidBy("");
    setEditSplitBetween([]);
    setDate(getTodayISO());
    setItem("");
    setAmount("");
    setCategory(CATEGORIES[0]);
    setOdometerStart("");
    setOdometerEnd("");
    setDidEditOdometerStart(false);
  };

  const handleDelete = async (id) => {
    if (pendingDeleteId) return;
    if (isOffline)
      return dynaura.warning({
        title: "ออฟไลน์",
        description: "ไม่สามารถลบรายการขณะออฟไลน์ได้",
        duration: 4000,
      });
    const r = await Swal.fire({
      ...SWAL_THEME,
      title: "ยืนยันการลบ?",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      customClass: {
        ...SWAL_THEME.customClass,
        confirmButton:
          "bg-red-600 text-white font-bold px-5 py-2.5 rounded-lg hover:bg-red-500 transition text-sm cursor-pointer",
      },
    });
    if (r.isConfirmed) {
      setPendingDeleteId(id);
      const notificationId = dynaura.loading({
        id: `delete-expense-${id}-${Date.now()}`,
        title: "กำลังลบรายการ",
        description: "กำลังอัปเดตรายจ่ายและยอดคงเหลือ",
        progress: 0.15,
      });
      try {
        const { error } = await supabase
          .from("trip_expenses")
          .delete()
          .eq("id", id);
        if (error) throw error;
        dynaura.update(notificationId, { progress: 0.72 });
        await refreshExpenses();
        dynaura.update(notificationId, {
          type: "success",
          title: "ลบรายการแล้ว",
          description: "รายจ่ายและยอดคงเหลือถูกอัปเดต",
          progress: undefined,
          duration: 3000,
        });
      } catch (error) {
        dynaura.update(notificationId, {
          type: "error",
          title: "ลบไม่สำเร็จ",
          description: error.message,
          progress: undefined,
          duration: 5000,
        });
      } finally {
        setPendingDeleteId(null);
      }
    }
  };

  const handleUndoHistory = async (id) => {
    if (pendingHistoryId) return;
    if (isOffline)
      return dynaura.warning({
        title: "ออฟไลน์",
        description: "ไม่สามารถกู้คืนยอดขณะออฟไลน์ได้",
        duration: 4000,
      });
    setPendingHistoryId(id);
    const notificationId = dynaura.loading({
      id: `undo-history-${id}-${Date.now()}`,
      title: "กำลังกู้คืนยอด",
      description: "กำลังลบประวัติการเคลียร์ยอด",
      progress: 0.15,
    });
    try {
      const { error } = await supabase
        .from("trip_expenses")
        .delete()
        .eq("id", id);
      if (error) throw error;
      dynaura.update(notificationId, { progress: 0.72 });
      await refreshExpenses();
      dynaura.update(notificationId, {
        type: "success",
        title: "กู้คืนยอดเรียบร้อย",
        description: "ยอดค้างชำระถูกคำนวณใหม่",
        progress: undefined,
        duration: 3000,
      });
    } catch (error) {
      dynaura.update(notificationId, {
        type: "error",
        title: "กู้คืนไม่สำเร็จ",
        description: error.message,
        progress: undefined,
        duration: 5000,
      });
    } finally {
      setPendingHistoryId(null);
    }
  };

  const handleSettleDebt = async (from, to, settleAmount) => {
    if (settlementSubmitLock.current) return;
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
      split_between: [from],
    };

    settlementSubmitLock.current = true;
    setPendingSettlement(`${from}-${to}`);
    const notificationId = dynaura.loading({
      id: `settle-${from}-${to}-${Date.now()}`,
      title: "กำลังบันทึกประวัติการโอน",
      description: `${from} → ${to}`,
      progress: 0.15,
    });
    try {
      const { error } = await supabase
        .from("trip_expenses")
        .insert([newHistory]);
      if (error) throw error;
      dynaura.update(notificationId, { progress: 0.72 });
      setActivePayment(null);
      await refreshExpenses();
      dynaura.update(notificationId, {
        type: "success",
        title: "บันทึกประวัติการโอนแล้ว",
        description: `฿${formatMoney(settleAmount)} จาก ${from} ถึง ${to}`,
        progress: undefined,
        duration: 4000,
        confetti: true,
      });
    } catch (error) {
      dynaura.update(notificationId, {
        type: "error",
        title: "บันทึกไม่สำเร็จ",
        description: error.message,
        progress: undefined,
        duration: 5000,
      });
    } finally {
      settlementSubmitLock.current = false;
      setPendingSettlement(null);
    }
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

  const settlements = useSettlements(expenses, MEMBERS);
  const activeFormPaidBy = editId ? editPaidBy : paidBy;
  const activeFormSplitBetween = editId ? editSplitBetween : draftSplitBetween;

  return (
    <div
      className="relative min-h-dvh bg-gray-950 pb-24 font-sans text-gray-100"
      onClick={handleAppClick}
    >
      <Toaster position="top" offset={0} haptics />
      <style>{`
        @keyframes drawRing { 0% { stroke-dashoffset: 176; } 100% { stroke-dashoffset: 0; } }
        .animate-draw-fast { animation: drawRing 0.4s linear forwards; }

        .dynaura-root[data-y="top"] {
          top: max(11px, calc(env(safe-area-inset-top, 0px) - 48px));
        }

        .dynaura-inner {
          max-width: min(350px, 88vw);
        }
        .dynaura-island[data-expanded="true"] .dynaura-inner {
          min-width: min(320px, 88vw);
        }
      `}</style>
      <div className="fixed right-3 top-[calc(env(safe-area-inset-top,0px)+1rem)] z-70 rounded-md px-1.5 py-1 pointer-events-none select-none text-[10px] text-gray-700 opacity-50 shadow-lg">
        {version_number}
      </div>

      {isOffline && (
        <div
          role="status"
          className="relative z-40 flex items-center justify-center gap-2 border-b border-amber-500/40 bg-amber-500/95 px-3 py-2 text-center text-xs font-bold text-gray-950"
        >
          <WifiOff size={14} />
          <span>ออฟไลน์อยู่ — ดูข้อมูลล่าสุดจากเครื่อง</span>
        </div>
      )}

      <TripHeader
        totalExpense={totalExpense}
        isSyncing={loading || isSyncing}
        onRefresh={() => {
          refreshMembers();
          refreshExpenses();
        }}
        MEMBERS={MEMBERS}
        isOffline={isOffline}
        onOpenMemberModal={() => setShowMemberModal(true)}
        onOpenTripSummary={() => setShowTripSummary(true)}
      />

      <main className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-6 p-4 lg:grid-cols-3">
        <ExpenseForm
          editId={editId}
          date={date}
          setDate={setDate}
          item={item}
          setItem={setItem}
          amount={amount}
          setAmount={setAmount}
          category={category}
          setCategory={setCategory}
          paidBy={activeFormPaidBy}
          setPaidBy={(value) => {
            if (editId) {
              setEditPaidBy(value);
              return;
            }
            const isPayerChanged = value !== paidBy;
            setPaidBy(value);
            localStorage.setItem("defaultPaidBy", value);
            if (isPayerChanged) {
              clearTempSplit();
              setSplitExpiresAt(null);
              setDraftSplitBetween(value ? [value] : []);
            }
          }}
          members={MEMBERS}
          odometerStart={odometerStart}
          setOdometerStart={setOdometerStart}
          setDidEditOdometerStart={setDidEditOdometerStart}
          odometerEnd={odometerEnd}
          setOdometerEnd={setOdometerEnd}
          draftSplitBetween={activeFormSplitBetween}
          onOpenSplit={() =>
            setActiveSplitExpense({
              __draft: true,
              item_name: item.trim() || category,
              amount: Number(amount) || 0,
              paid_by: activeFormPaidBy,
              split_between: activeFormSplitBetween,
            })
          }
          isSubmitting={isSubmittingExpense}
          onSubmit={handleAddExpense}
          onCancel={cancelEdit}
          onAddMember={() => setShowMemberModal(true)}
        />

        <div className="lg:col-span-2" onClick={(e) => e.stopPropagation()}>
          <ExpenseList
            expenses={regularExpenses}
            groupedExpenses={groupedExpenses}
            loading={false}
            isExpanded={isListExpanded}
            collapsedDates={collapsedDates}
            onToggleExpanded={() => setIsListExpanded(!isListExpanded)}
            onToggleDate={(val) =>
              setCollapsedDates((d) => ({ ...d, [val]: !d[val] }))
            }
            onEdit={(exp) => {
              const validSplit =
                exp.split_between?.filter((m) => MEMBERS.includes(m)) || [];
              const resolvedPayer = MEMBERS.includes(exp.paid_by)
                ? exp.paid_by
                : MEMBERS[0] || "";
              setEditId(exp.id);
              setDate(parseForUI(exp.expense_date));
              setEditPaidBy(resolvedPayer);
              setItem(exp.item_name);
              setAmount(exp.amount);
              setCategory(exp.category);
              setOdometerStart(exp.odometer_start || "");
              setOdometerEnd(exp.odometer_end || "");
              setEditSplitBetween(
                validSplit.length > 0 ? validSplit : [resolvedPayer],
              );
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onDelete={handleDelete}
            onOpenSplitModal={setActiveSplitExpense}
            pendingDeleteId={pendingDeleteId}
            pendingSplitId={pendingSplitId}
            swipedId={swipedId}
            setSwipedId={setSwipedId}
            highlightedId={highlightedId}
            MEMBERS={MEMBERS}
          />
        </div>

        <SettlementSection
          settlements={settlements}
          onOpenPayment={setActivePayment}
          onOpenDetails={setActiveSettlementDetails}
          onOpenHistory={() => setShowHistory(true)}
          pendingSettlement={pendingSettlement}
          isOffline={isOffline}
        />
      </main>

      <ThemeMenu />

      {showMemberModal && (
        <MemberModal
          members={MEMBERS}
          balances={settlements.balances}
          memberDetails={memberDetails}
          onClose={() => setShowMemberModal(false)}
          onAdd={handleAddMember}
          onRemove={handleRemoveMember}
          onUpdateDetails={handleUpdateMemberDetails}
          pendingMemberAction={pendingMemberAction}
          isOffline={isOffline}
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
          isSubmitting={
            pendingSettlement === `${activePayment.from}-${activePayment.to}`
          }
        />
      )}
      {activeSettlementDetails && (
        <SettlementDetailsModal
          transfer={activeSettlementDetails}
          onClose={() => setActiveSettlementDetails(null)}
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
          pendingHistoryId={pendingHistoryId}
          isOffline={isOffline}
        />
      )}
      {showTripSummary && (
        <TripSummaryModal
          summaries={settlements.memberSummaries}
          totalExpense={totalExpense}
          onClose={() => setShowTripSummary(false)}
        />
      )}
    </div>
  );
}
