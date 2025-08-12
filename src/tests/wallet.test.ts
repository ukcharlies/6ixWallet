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
});
