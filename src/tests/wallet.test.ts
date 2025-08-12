import request from "supertest";
import db from "../db/knex";
import app from "../app";
import { toCents } from "../utilis/money";

describe("Wallet API", () => {
  let userToken: string;
  let userId: string;
  let secondUserToken: string;
  let secondUserId: string;

  beforeAll(async () => {
    await db.migrate.latest();

    // Create test users
    const user1 = await request(app).post("/api/v1/auth/register").send({
      email: "wallet-test@example.com",
      password: "password123",
    });

    userToken = user1.body.token;
    userId = user1.body.user.id;

    const user2 = await request(app).post("/api/v1/auth/register").send({
      email: "wallet-test2@example.com",
      password: "password123",
    });

    secondUserToken = user2.body.token;
    secondUserId = user2.body.user.id;
  });

  afterAll(async () => {
    await db("users").delete();
    await db("wallets").delete();
    await db("transactions").delete();
    await db("transfers").delete();
    await db.destroy();
  });

  describe("Wallet funding", () => {
    it("should fund wallet successfully", async () => {
      const res = await request(app)
        .post("/api/v1/wallet/fund")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          amount: 100,
          reference: "fund-test-1",
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Wallet funded successfully");

      // Check wallet balance
      const wallet = await db("wallets").where({ user_id: userId }).first();
      expect(parseInt(wallet.balance)).toBe(toCents(100));
    });

    it("should be idempotent with same reference", async () => {
      // First request
      await request(app)
        .post("/api/v1/wallet/fund")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          amount: 50,
          reference: "idempotency-test",
        });

      // Second request with same reference
      const res2 = await request(app)
        .post("/api/v1/wallet/fund")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          amount: 100, // Different amount
          reference: "idempotency-test", // Same reference
        });

      expect(res2.status).toBe(200);

      // Check wallet balance (should only be credited once)
      const wallet = await db("wallets").where({ user_id: userId }).first();
      const transactions = await db("transactions").where({
        reference: "idempotency-test",
      });

      expect(transactions.length).toBe(1);
      expect(parseInt(transactions[0].amount)).toBe(toCents(50)); // First amount
    });
  });

  describe("Wallet transfer", () => {
    beforeEach(async () => {
      // Fund wallet for transfers
      await request(app)
        .post("/api/v1/wallet/fund")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          amount: 1000,
          reference: `fund-for-transfer-${Date.now()}`,
        });
    });

    it("should transfer funds between users", async () => {
      const transferAmount = 200;
      const res = await request(app)
        .post("/api/v1/wallet/transfer")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          toUserId: secondUserId,
          amount: transferAmount,
          reference: "transfer-test-1",
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("transferId");

      // Check balances
      const senderWallet = await db("wallets")
        .where({ user_id: userId })
        .first();
      const receiverWallet = await db("wallets")
        .where({ user_id: secondUserId })
        .first();

      expect(parseInt(receiverWallet.balance)).toBe(toCents(transferAmount));
      expect(parseInt(senderWallet.balance)).toBe(
        toCents(1000 - transferAmount)
      );
    });

    it("should reject transfers with insufficient balance", async () => {
      const res = await request(app)
        .post("/api/v1/wallet/transfer")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          toUserId: secondUserId,
          amount: 5000, // More than available
          reference: "transfer-test-2",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Insufficient funds");
    });
  });

  describe("Concurrency test", () => {
    it("should handle concurrent transfers safely", async () => {
      // Fund wallet with exactly enough for 10 transfers of 10 each
      await request(app)
        .post("/api/v1/wallet/fund")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          amount: 100,
          reference: `fund-for-concurrency-${Date.now()}`,
        });

      // Create 10 concurrent transfer requests
      const transfers = Array(10)
        .fill(null)
        .map((_, i) =>
          request(app)
            .post("/api/v1/wallet/transfer")
            .set("Authorization", `Bearer ${userToken}`)
            .send({
              toUserId: secondUserId,
              amount: 10,
              reference: `concurrent-transfer-${i}`,
            })
        );

      // Wait for all transfers to complete
      const results = await Promise.all(transfers);

      // Check some succeeded and none caused negative balance
      const successCount = results.filter((r) => r.status === 200).length;

      // Get final balance
      const senderWallet = await db("wallets")
        .where({ user_id: userId })
        .first();

      // Balance should never go negative
      expect(parseInt(senderWallet.balance)).toBeGreaterThanOrEqual(0);
    });
  });

  describe("GET /wallet", () => {
    it("should retrieve user wallet information", async () => {
      // Fund the wallet first to ensure there's a balance
      await request(app)
        .post("/api/v1/wallet/fund")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          amount: 100,
          reference: `fund-for-get-wallet-${Date.now()}`,
        });

      const res = await request(app)
        .get("/api/v1/wallet")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("wallet");
      expect(res.body.wallet).toHaveProperty("balance");
      expect(res.body.wallet.userId).toBe(userId);
    });

    it("should reject unauthenticated requests", async () => {
      const res = await request(app).get("/api/v1/wallet");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /wallet/transactions", () => {
    beforeEach(async () => {
      // Create some transactions
      await request(app)
        .post("/api/v1/wallet/fund")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          amount: 50,
          reference: `fund-for-transactions-1-${Date.now()}`,
        });

      await request(app)
        .post("/api/v1/wallet/fund")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          amount: 75,
          reference: `fund-for-transactions-2-${Date.now()}`,
        });
    });

    it("should retrieve transaction history", async () => {
      const res = await request(app)
        .get("/api/v1/wallet/transactions")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("transactions");
      expect(Array.isArray(res.body.transactions)).toBe(true);
      expect(res.body.transactions.length).toBeGreaterThanOrEqual(2);
    });

    it("should support pagination", async () => {
      const res = await request(app)
        .get("/api/v1/wallet/transactions?limit=1")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("transactions");
      expect(res.body.transactions.length).toBe(1);
    });
  });

  describe("Wallet withdrawal", () => {
    beforeEach(async () => {
      // Fund wallet for withdrawals
      await request(app)
        .post("/api/v1/wallet/fund")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          amount: 500,
          reference: `fund-for-withdrawal-${Date.now()}`,
        });
    });

    it("should withdraw funds successfully", async () => {
      const withdrawAmount = 200;
      const res = await request(app)
        .post("/api/v1/wallet/withdraw")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          amount: withdrawAmount,
          reference: "withdraw-test-1",
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("withdrawalId");

      // Check wallet balance
      const wallet = await db("wallets").where({ user_id: userId }).first();
      expect(parseInt(wallet.balance)).toBe(toCents(500 - withdrawAmount));
    });

    it("should reject withdrawals with insufficient funds", async () => {
      const res = await request(app)
        .post("/api/v1/wallet/withdraw")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          amount: 1000, // More than available
          reference: "withdraw-test-2",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Insufficient funds");
    });
  });
});
