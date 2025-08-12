import db from "../db/knex";
import { v4 as uuidv4 } from "uuid";
import { toCents, fromCents } from "../utilis/money";

export default class WalletService {
  static async getWallet(userId: string) {
    const wallet = await db("wallets").where({ user_id: userId }).first();
    if (!wallet) {
      throw Object.assign(new Error("Wallet not found"), { status: 404 });
    }
    return {
      id: wallet.id,
      balance: fromCents(wallet.balance),
      userId: wallet.user_id,
    };
  }

  static async fundWallet(
    userId: string,
    amount: number,
    reference: string,
    description: string = "Wallet funding"
  ) {
    if (amount <= 0)
      throw Object.assign(new Error("Amount must be > 0"), { status: 400 });

    return db.transaction(async (trx) => {
      try {
        // Check for duplicate reference (idempotency)
        const existingTransaction = await trx("transactions")
          .where({ reference })
          .first();

        if (existingTransaction) {
          return { transactionId: existingTransaction.id };
        }

        const wallet = await trx("wallets")
          .where({ user_id: userId })
          .forUpdate()
          .first();

        if (!wallet) {
          throw Object.assign(new Error("Wallet not found"), { status: 404 });
        }

        await trx("wallets")
          .where({ id: wallet.id })
          .update({
            balance: trx.raw("balance + ?", [amount]),
            updated_at: trx.fn.now(),
          });

        const transactionId = uuidv4();
        await trx("transactions").insert({
          id: transactionId,
          wallet_id: wallet.id,
          type: "credit",
          amount,
          reference,
          description,
          created_at: trx.fn.now(),
        });

        return { transactionId };
      } catch (error) {
        throw error;
      }
    });
  }

  static async transferFunds(
    fromUserId: string,
    toUserId: string,
    amount: number,
    reference: string
  ) {
    if (amount <= 0)
      throw Object.assign(new Error("Amount must be > 0"), { status: 400 });

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
        description: `Transfer to ${toUserId}`,
        created_at: trx.fn.now(),
      });

      await trx("transactions").insert({
        id: creditId,
        wallet_id: toWallet.id,
        type: "credit",
        amount,
        reference,
        description: `Transfer from ${fromUserId}`,
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

  static async withdrawFunds(
    userId: string,
    amount: number,
    reference: string
  ) {
    if (amount <= 0)
      throw Object.assign(new Error("Amount must be > 0"), { status: 400 });

    return db.transaction(async (trx) => {
      // Check for duplicate reference (idempotency)
      const existingTransaction = await trx("transactions")
        .where({ reference })
        .first();

      if (existingTransaction) {
        return { transactionId: existingTransaction.id };
      }

      const wallet = await trx("wallets")
        .where({ user_id: userId })
        .forUpdate()
        .first();

      if (!wallet) {
        throw Object.assign(new Error("Wallet not found"), { status: 404 });
      }

      if (BigInt(wallet.balance) < BigInt(amount)) {
        throw Object.assign(new Error("Insufficient funds"), { status: 400 });
      }

      await trx("wallets")
        .where({ id: wallet.id })
        .update({
          balance: trx.raw("balance - ?", [amount]),
          updated_at: trx.fn.now(),
        });

      const transactionId = uuidv4();
      await trx("transactions").insert({
        id: transactionId,
        wallet_id: wallet.id,
        type: "debit",
        amount,
        reference,
        description: "Withdrawal",
        created_at: trx.fn.now(),
      });

      return { transactionId };
    });
  }

  static async getTransactionHistory(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const wallet = await db("wallets").where({ user_id: userId }).first();
    if (!wallet) {
      throw Object.assign(new Error("Wallet not found"), { status: 404 });
    }

    const transactions = await db("transactions")
      .where({ wallet_id: wallet.id })
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);

    const totalCount = await db("transactions")
      .where({ wallet_id: wallet.id })
      .count("id as count")
      .first();

    return {
      data: transactions.map((t) => ({
        ...t,
        amount: fromCents(t.amount),
      })),
      pagination: {
        page,
        limit,
        totalItems: parseInt(totalCount?.count as string) || 0,
        totalPages: Math.ceil(
          (parseInt(totalCount?.count as string) || 0) / limit
        ),
      },
    };
  }
}
