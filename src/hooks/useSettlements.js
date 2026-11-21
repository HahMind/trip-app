import { useMemo } from "react";
import { HISTORY_CATEGORY } from "../data/constants";

export default function useSettlements(expenses, members) {
  return useMemo(() => {
    const regularExpenses = expenses.filter(
      (expense) => expense.category !== HISTORY_CATEGORY,
    );
    const historyExpenses = expenses.filter(
      (expense) => expense.category === HISTORY_CATEGORY,
    );

    const balances = members.map((member) => ({ member, balance: 0 }));

    regularExpenses.forEach((expense) => {
      const payer = balances.find((balance) => balance.member === expense.paid_by);
      if (payer) payer.balance += Number(expense.amount);

      const configuredSplit = Array.isArray(expense.split_between)
        ? expense.split_between
        : [];
      const validSplit = configuredSplit.filter((member) =>
        members.includes(member),
      );
      const splitters =
        validSplit.length > 0
          ? validSplit
          : members.includes(expense.paid_by)
            ? [expense.paid_by]
            : [members[0]];

      const costPerPerson = Number(expense.amount) / splitters.length;
      splitters.forEach((member) => {
        const debtor = balances.find((balance) => balance.member === member);
        if (debtor) debtor.balance -= costPerPerson;
      });
    });

    historyExpenses.forEach((expense) => {
      const payer = balances.find((balance) => balance.member === expense.paid_by);
      if (payer) payer.balance += Number(expense.amount);
      members.forEach((member) => {
        if (expense.item_name.includes(`-> ${member}`)) {
          const receiver = balances.find(
            (balance) => balance.member === member,
          );
          if (receiver) receiver.balance -= Number(expense.amount);
        }
      });
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
      const amount = Math.min(Math.abs(debtor.balance), creditor.balance);
      if (amount > 0.01) {
        transfers.push({ from: debtor.member, to: creditor.member, amount });
      }
      debtor.balance += amount;
      creditor.balance -= amount;
      if (Math.abs(debtor.balance) < 0.01) debtorIndex++;
      if (creditor.balance < 0.01) creditorIndex++;
    }

    return { balances, transfers };
  }, [expenses, members]);
}
