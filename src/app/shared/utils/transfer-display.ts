import { Transaction } from '../models/transaction.model';

/** One list row for a transfer pair (from → to). */
export type TransferDisplayTransaction = Transaction & {
  transfer_from_name?: string;
  transfer_to_name?: string;
};

/**
 * Transfers are stored as two linked rows. Collapse each pair into a single
 * list item so the UI shows one transfer, not two.
 */
export function collapseTransferPairs(transactions: Transaction[]): TransferDisplayTransaction[] {
  const pairs = new Map<string, Transaction[]>();
  const result: TransferDisplayTransaction[] = [];

  for (const tx of transactions) {
    if (tx.type === 'transfer' && tx.transfer_pair_id) {
      const legs = pairs.get(tx.transfer_pair_id) ?? [];
      legs.push(tx);
      pairs.set(tx.transfer_pair_id, legs);
      continue;
    }
    result.push(tx);
  }

  for (const legs of pairs.values()) {
    legs.sort((a, b) => a.created_at.localeCompare(b.created_at));
    const from = legs[0];
    const to = legs[1] ?? legs[0];
    result.push({
      ...from,
      transfer_from_name: from.account?.name,
      transfer_to_name: to.account?.name,
    });
  }

  result.sort((a, b) => {
    const byDate = b.transaction_date.localeCompare(a.transaction_date);
    if (byDate !== 0) return byDate;
    return b.created_at.localeCompare(a.created_at);
  });

  return result;
}
