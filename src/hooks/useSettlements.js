import { useMemo } from "react";
import { HISTORY_CATEGORY } from "../data/constants";

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const parseCreatedTimestamp = (expense) => {
  const createdScore = expense.created_at
    ? new Date(expense.created_at).getTime()
    : 0;
  if (Number.isFinite(createdScore) && createdScore > 0) {
    return createdScore;
  }
  const numericId = Number(expense.id);
  return Number.isFinite(numericId) ? numericId : 0;
};

const parseExpenseTimestamp = (expense) => {
  let dateScore = 0;
  if (
    typeof expense.expense_date === "string" &&
    expense.expense_date.includes("/")
  ) {
    const [day, month, year] = expense.expense_date.split("/").map(Number);
    if (day && month && year) {
      dateScore = new Date(year, month - 1, day).getTime();
    }
  }

  const timeScore = parseCreatedTimestamp(expense);

  return {
    dateScore: Number.isFinite(dateScore) ? dateScore : 0,
    timeScore,
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
  const validSplit = configuredSplit.filter((member) =>
    members.includes(member),
  );
  if (validSplit.length > 0) return validSplit;
  if (members.includes(expense.paid_by)) return [expense.paid_by];
  return members.length > 0 ? [members[0]] : [];
};

const findMatchingSubsetIndices = (events, targetSignedSum) => {
  if (Math.abs(targetSignedSum) <= 0.005 || events.length === 0) return [];
  const maxSearchItems = Math.min(events.length, 24);
  const picked = [];

  const dfs = (index, currentSum) => {
    if (Math.abs(currentSum - targetSignedSum) <= 0.005 && picked.length > 0) {
      return true;
    }
    if (index >= maxSearchItems) return false;

    picked.push(index);
    if (dfs(index + 1, roundMoney(currentSum + events[index].signedDelta))) {
      return true;
    }
    picked.pop();

    return dfs(index + 1, currentSum);
  };

  return dfs(0, 0) ? picked : [];
};

const filterUnsettledPairItems = (
  paidByAForB,
  paidByBForA,
  pairHistory,
  personA,
  personB,
) => {
  if (pairHistory.length === 0) {
    return {
      unsettledAForB: paidByAForB,
      unsettledBForA: paidByBForA,
    };
  }

  const timeline = [
    ...paidByAForB.map((item) => ({
      kind: "expense",
      side: "A",
      item,
      signedDelta: item.shareAmount,
      createdAt: parseCreatedTimestamp(item),
    })),
    ...paidByBForA.map((item) => ({
      kind: "expense",
      side: "B",
      item,
      signedDelta: -item.shareAmount,
      createdAt: parseCreatedTimestamp(item),
    })),
    ...pairHistory.map((item) => {
      const isBToA = item.item_name.includes(`${personB} -> ${personA}`);
      const amount = roundMoney(item.amount || 0);
      return {
        kind: "settlement",
        side: null,
        item,
        signedDelta: isBToA ? -amount : amount,
        createdAt: parseCreatedTimestamp(item),
      };
    }),
  ].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    if (a.kind !== b.kind) return a.kind === "expense" ? -1 : 1;
    return (Number(a.item.id) || 0) - (Number(b.item.id) || 0);
  });

  let runningNet = 0;
  let unmatchedSettlementDelta = 0;
  let activeEvents = [];

  timeline.forEach((event) => {
    runningNet = roundMoney(runningNet + event.signedDelta);

    if (event.kind === "expense") {
      activeEvents.push(event);
      return;
    }

    if (Math.abs(runningNet) <= 0.005) {
      activeEvents = [];
      runningNet = 0;
      unmatchedSettlementDelta = 0;
    } else {
      unmatchedSettlementDelta = roundMoney(
        unmatchedSettlementDelta + event.signedDelta,
      );
    }
  });

  if (Math.abs(unmatchedSettlementDelta) > 0.005 && activeEvents.length > 0) {
    const matchedIndices = findMatchingSubsetIndices(
      activeEvents,
      roundMoney(-unmatchedSettlementDelta),
    );
    if (matchedIndices.length > 0) {
      const matchedSet = new Set(matchedIndices);
      activeEvents = activeEvents.filter((_, idx) => !matchedSet.has(idx));
    }
  }

  return {
    unsettledAForB: activeEvents
      .filter((event) => event.side === "A")
      .map((event) => event.item),
    unsettledBForA: activeEvents
      .filter((event) => event.side === "B")
      .map((event) => event.item),
  };
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
    const unsettledPairItemIds = new Set();
    const settledHistoryPairItemIds = new Set();

    for (let i = 0; i < members.length; i += 1) {
      for (let j = i + 1; j < members.length; j += 1) {
        const personA = members[i];
        const personB = members[j];

        const paidByAForB = [];
        const paidByBForA = [];

        regularExpenses.forEach((expense) => {
          const splitters = getValidSplitters(expense, members);
          if (splitters.length === 0) return;

          const shareAmount = roundMoney(
            Number(expense.amount) / splitters.length,
          );
          if (shareAmount <= 0) return;

          if (expense.paid_by === personA && splitters.includes(personB)) {
            paidByAForB.push({
              ...expense,
              splitCount: splitters.length,
              shareAmount,
            });
          } else if (
            expense.paid_by === personB &&
            splitters.includes(personA)
          ) {
            paidByBForA.push({
              ...expense,
              splitCount: splitters.length,
              shareAmount,
            });
          }
        });

        const pairHistory = historyExpenses.filter(
          (item) =>
            item.item_name.includes(`${personA} -> ${personB}`) ||
            item.item_name.includes(`${personB} -> ${personA}`),
        );

        const { unsettledAForB, unsettledBForA } = filterUnsettledPairItems(
          paidByAForB,
          paidByBForA,
          pairHistory,
          personA,
          personB,
        );

        unsettledAForB.forEach((item) => unsettledPairItemIds.add(item.id));
        unsettledBForA.forEach((item) => unsettledPairItemIds.add(item.id));

        if (pairHistory.length > 0) {
          paidByAForB.forEach((item) => settledHistoryPairItemIds.add(item.id));
          paidByBForA.forEach((item) => settledHistoryPairItemIds.add(item.id));
        }

        const totalAForB = roundMoney(
          paidByAForB.reduce((sum, item) => sum + item.shareAmount, 0),
        );
        const totalBForA = roundMoney(
          paidByBForA.reduce((sum, item) => sum + item.shareAmount, 0),
        );

        const settledByBToA = roundMoney(
          pairHistory
            .filter((item) => item.item_name.includes(`${personB} -> ${personA}`))
            .reduce((sum, item) => sum + Number(item.amount || 0), 0),
        );

        const settledByAToB = roundMoney(
          pairHistory
            .filter((item) => item.item_name.includes(`${personA} -> ${personB}`))
            .reduce((sum, item) => sum + Number(item.amount || 0), 0),
        );

        // diff > 0 หมายถึง B ยังค้างจ่าย A อยู่สุทธิ
        const diff = roundMoney(
          totalAForB - totalBForA - settledByBToA + settledByAToB,
        );
        if (Math.abs(diff) <= 0.005) continue;

        const isBOwesA = diff > 0;
        const from = isBOwesA ? personB : personA;
        const to = isBOwesA ? personA : personB;
        const amount = Math.abs(diff);

        const positiveItems = (isBOwesA ? unsettledAForB : unsettledBForA).sort(
          compareNewestFirst,
        );
        const negativeItems = (isBOwesA ? unsettledBForA : unsettledAForB).sort(
          compareNewestFirst,
        );

        const allToForFromItems = [...(isBOwesA ? paidByAForB : paidByBForA)].sort(
          compareNewestFirst,
        );
        const allFromForToItems = [...(isBOwesA ? paidByBForA : paidByAForB)].sort(
          compareNewestFirst,
        );

        const allToForFromTotal = isBOwesA ? totalAForB : totalBForA;
        const allFromForToTotal = isBOwesA ? totalBForA : totalAForB;

        const settledFromToTo = isBOwesA ? settledByBToA : settledByAToB;
        const settledToToFrom = isBOwesA ? settledByAToB : settledByBToA;
        const settledAdjustment = roundMoney(settledToToFrom - settledFromToTo);

        const positiveTotal = roundMoney(
          positiveItems.reduce((sum, item) => sum + item.shareAmount, 0),
        );
        const negativeTotal = roundMoney(
          negativeItems.reduce((sum, item) => sum + item.shareAmount, 0),
        );

        const settledHistory = [...pairHistory].sort(compareNewestFirst);

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
          allToForFromItems,
          allFromForToItems,
          allToForFromTotal,
          allFromForToTotal,
          settledFromToTo,
          settledToToFrom,
          settledAdjustment,
          settledHistory,
        });
      }
    }

    const unsettledExpenseIds = new Set();
    const settledExpenseIds = new Set();

    regularExpenses.forEach((expense) => {
      const splitters = getValidSplitters(expense, members);
      if (splitters.length === 1 && splitters[0] === expense.paid_by) {
        return;
      }

      const shareAmount =
        splitters.length > 0
          ? roundMoney(Number(expense.amount) / splitters.length)
          : 0;
      if (shareAmount <= 0 || !members.includes(expense.paid_by)) {
        return;
      }

      if (unsettledPairItemIds.has(expense.id)) {
        unsettledExpenseIds.add(expense.id);
      } else if (settledHistoryPairItemIds.has(expense.id)) {
        settledExpenseIds.add(expense.id);
      }
    });

    const balances = members.map((member) => ({
      member,
      balance: balanceMap.get(member) || 0,
    }));

    const paidMap = new Map(members.map((member) => [member, 0]));
    regularExpenses.forEach((expense) => {
      if (!paidMap.has(expense.paid_by)) return;
      const paidAmount = Number(expense.amount);
      if (!Number.isFinite(paidAmount) || paidAmount <= 0) return;
      paidMap.set(
        expense.paid_by,
        roundMoney((paidMap.get(expense.paid_by) || 0) + paidAmount),
      );
    });

    const receiveMap = new Map(members.map((member) => [member, 0]));
    const oweMap = new Map(members.map((member) => [member, 0]));
    transfers.forEach((transfer) => {
      if (receiveMap.has(transfer.to)) {
        receiveMap.set(
          transfer.to,
          roundMoney((receiveMap.get(transfer.to) || 0) + transfer.amount),
        );
      }
      if (oweMap.has(transfer.from)) {
        oweMap.set(
          transfer.from,
          roundMoney((oweMap.get(transfer.from) || 0) + transfer.amount),
        );
      }
    });

    const memberSummaries = members.map((member) => ({
      member,
      totalPaid: paidMap.get(member) || 0,
      toReceive: receiveMap.get(member) || 0,
      toPay: oweMap.get(member) || 0,
    }));

    return {
      balances,
      transfers,
      memberSummaries,
      unsettledExpenseIds,
      settledExpenseIds,
    };
  }, [expenses, members]);
}
