import { useCallback, useEffect, useState } from "react";
import { getOfflineQueue, getStoredMembers } from "../utils/trip";
import { supabase } from "../services/supabase";

export default function useTripData(onMembersUpdated, onMemberDetailsUpdated) {
  const [members, setMembers] = useState(getStoredMembers);
  const [expenses, setExpenses] = useState([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshMembers = useCallback(async () => {
    if (!navigator.onLine) return;

    const { data } = await supabase
      .from("trip_members")
      .select("name, promptpay, bank_id, bank_acc")
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      const fetchedMembers = data.map((member) => member.name);
      const fetchedDetails = data.reduce((details, member) => {
        details[member.name] = {
          promptpay: member.promptpay || "",
          bankId: member.bank_id || "kbank",
          bankAcc: member.bank_acc || "",
        };
        return details;
      }, {});
      setMembers(fetchedMembers);
      localStorage.setItem("tripMembers", JSON.stringify(fetchedMembers));
      localStorage.setItem("memberDetails", JSON.stringify(fetchedDetails));
      onMembersUpdated(fetchedMembers);
      if (onMemberDetailsUpdated) onMemberDetailsUpdated(fetchedDetails);
    }
  }, [onMembersUpdated, onMemberDetailsUpdated]);

  const refreshExpenses = useCallback(async () => {
    if (!navigator.onLine) {
      const cachedData = localStorage.getItem("tripExpensesCache");
      const cachedExpenses = cachedData ? JSON.parse(cachedData) : [];
      const queuedExpenses = getOfflineQueue();
      const mergedById = new Map();
      [...cachedExpenses, ...queuedExpenses].forEach((expense) => {
        mergedById.set(expense.id, expense);
      });
      const mergedExpenses = [...mergedById.values()].sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
      );
      setExpenses(mergedExpenses);
      localStorage.setItem("tripExpensesCache", JSON.stringify(mergedExpenses));
      return;
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from("trip_expenses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setExpenses(data);
        localStorage.setItem("tripExpensesCache", JSON.stringify(data));
      }
    } catch {
      const cachedData = localStorage.getItem("tripExpensesCache");
      if (cachedData) setExpenses(JSON.parse(cachedData));
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  }, []);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      Promise.all([refreshMembers(), refreshExpenses()]).then(() =>
        setLoading(false),
      );
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    Promise.all([refreshMembers(), refreshExpenses()]).then(() =>
      setLoading(false),
    );

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

  return {
    members,
    setMembers,
    expenses,
    setExpenses,
    isOffline,
    loading,
    isSyncing,
    refreshMembers,
    refreshExpenses,
  };
}
