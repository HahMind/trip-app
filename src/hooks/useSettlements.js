import { useMemo } from "react";
import { HISTORY_CATEGORY } from "../data/constants";

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const parseExpenseTimestamp = (expense) => {
  let dateScore = 0;
  if (typeof expense.expense_date === "string" && expense.expense_date.includes("/")) {
    const [day, month, year] = expense.expense_date.split("/").map(Number);
    if (day && month && year) {
      dateScore = new Date(year, month - 1, day).getTime();
    }
  }

  const createdScore = expense.created_at ? new Date(expense.created_at).getTime() : 0;
  const fallbackId = Number(expense.id) || 0;

  return {
    dateScore: Number.isFinite(dateScore) ? dateScore : 0,
    timeScore: Number.isFinite(createdScore) && createdScore > 0 ? createdScore : fallbackId,
  };
};

const compareNewestFirst = (a, b) => {
  const timeA = parseExpenseTimestamp(a);
  const timeB = parseExpenseTimestamp(b);
  if (timeB.dateScore !== timeA.dateScore) {
    return timeB.dateScore - timeA.dateScore;
  }
  return timeB.timeScore - timeA.timeScore;
};

const getValidSplitters = (expense, members) => {
  const configuredSplit = Array.isArray(expense.split_between)
    ? expense.split_between
    : [];
  const validSplit = configuredSplit.filter((member) => members.includes(member));
  if (validSplit.length > 0) return validSplit;
  if (members.includes(expense.paid_by)) return [expense.paid_by];
  return members.length > 0 ? [members[0]] : [];
};

export default function useSettlements(expenses, members) {
  return useMemo(() => {
    const regularExpenses = expenses.filter(
      (expense) => expense.category !== HISTORY_CATEGORY,
    );
    const historyExpenses = expenses.filter(
      (expense) => expense.category === HISTORY_CATEGORY,
    );

    const balanceMap = new Map(members.map((member) => [member, 0]));
    const transfers = [];

    for (let i = 0; i < members.length; i += 1) {
      for (let j = i + 1; j < members.length; j += 1) {
        const personA = members[i];
        const personB = members[j];

        const paidByAForB = [];
        const paidByBForA = [];

        regularExpenses.forEach((expense) => {
          const splitters = getValidSplitters(expense, members);
          if (splitters.length === 0) return;

          const shareAmount = roundMoney(Number(expense.amount) / splitters.length);
          if (shareAmount <= 0) return;

          if (expense.paid_by === personA && splitters.includes(personB)) {
            paidByAForB.push({
              ...expense,
              splitCount: splitters.length,
              shareAmount,
            });
          } else if (expense.paid_by === personB && splitters.includes(personA)) {
            paidByBForA.push({
              ...expense,
              splitCount: splitters.length,
              shareAmount,
            });
          }
        });

        const totalAForB = roundMoney(
          paidByAForB.reduce((sum, item) => sum + item.shareAmount, 0),
        );
        const totalBForA = roundMoney(
          paidByBForA.reduce((sum, item) => sum + item.shareAmount, 0),
        );

        const diff = roundMoney(totalAForB - totalBForA);
        if (Math.abs(diff) <= 0.005) continue;

        const isBOwesA = diff > 0;
        const from = isBOwesA ? personB : personA;
        const to = isBOwesA ? personA : personB;
        const amount = Math.abs(diff);

        const positiveItems = (isBOwesA ? paidByAForB : paidByBForA).sort(
          compareNewestFirst,
        );
        const negativeItems = (isBOwesA ? paidByBForA : paidByAForB).sort(
          compareNewestFirst,
        );

        const positiveTotal = isBOwesA ? totalAForB : totalBForA;
        const negativeTotal = isBOwesA ? totalBForA : totalAForB;

        const settledHistory = historyExpenses
          .filter(
            (item) =>
              item.item_name.includes(`${from} -> ${to}`) ||
              item.item_name.includes(`${to} -> ${from}`),
          )
          .sort(compareNewestFirst);

        balanceMap.set(from, roundMoney((balanceMap.get(from) || 0) - amount));
        balanceMap.set(to, roundMoney((balanceMap.get(to) || 0) + amount));

        transfers.push({
          from,
          to,
          amount,
          positiveItems,
          negativeItems,
          positiveTotal,
          negativeTotal,
          settledHistory,
        });
      }
    }

    const balances = members.map((member) => ({
      member,
      balance: balanceMap.get(member) || 0,
    }));

    return { balances, transfers };
  }, [expenses, members]);
}