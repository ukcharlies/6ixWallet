import db from "../db/knex";
import { v4 as uuidv4 } from "uuid";

export default class WalletService {
  static async transferFunds(
    fromUserId: string,
    toUserId: string,
    amount: number,
    reference: string
  ) {
    if (amount <= 0) throw new Error("Amount must be > 0");

    return db.transaction(async (trx) => {
      const fromWallet = await trx("wallets")
        .where({ user_id: fromUserId })
        .forUpdate()
        .first();
      if (!fromWallet)
        throw Object.assign(new Error("Sender wallet not found"), {
          status: 404,
        });
      if (BigInt(fromWallet.balance) < BigInt(amount))
        throw Object.assign(new Error("Insufficient funds"), { status: 400 });

      const toWallet = await trx("wallets")
        .where({ user_id: toUserId })
        .forUpdate()
        .first();
      if (!toWallet)
        throw Object.assign(new Error("Recipient wallet not found"), {
          status: 404,
        });

      await trx("wallets")
        .where({ id: fromWallet.id })
        .update({
          balance: trx.raw("balance - ?", [amount]),
          updated_at: trx.fn.now(),
        });

      await trx("wallets")
        .where({ id: toWallet.id })
        .update({
          balance: trx.raw("balance + ?", [amount]),
          updated_at: trx.fn.now(),
        });

      const debitId = uuidv4();
      const creditId = uuidv4();
      await trx("transactions").insert({
        id: debitId,
        wallet_id: fromWallet.id,
        type: "debit",
        amount,
        reference,
        created_at: trx.fn.now(),
      });
      await trx("transactions").insert({
        id: creditId,
        wallet_id: toWallet.id,
        type: "credit",
        amount,
        reference,
        created_at: trx.fn.now(),
      });

      const transferId = uuidv4();
      await trx("transfers").insert({
        id: transferId,
        from_transaction_id: debitId,
        to_transaction_id: creditId,
        status: "completed",
        created_at: trx.fn.now(),
      });

      return transferId;
    });
  }
}
