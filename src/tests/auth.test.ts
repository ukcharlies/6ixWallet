import request from "supertest";
import { Express } from "express";
import db from "../db/knex";
import app from "../app"; // Create this file to export the express app
import AuthService from "../services/auth.service";

describe("Auth API", () => {
  beforeAll(async () => {
    await db.migrate.latest();
  });

  afterEach(async () => {
    await db("users").delete();
    await db("wallets").delete();
    await db("blacklist_logs").delete();
  });

  afterAll(async () => {
    await db.destroy();
  });

  describe("POST /api/v1/auth/register", () => {
    it("should register a new user and return a token", async () => {
      // Mock the Adjutor service
      jest.spyOn(AuthService, "checkAdjutorBlacklist").mockResolvedValue(false);

      const res = await request(app).post("/api/v1/auth/register").send({
        name: "Test User", // Add name field
        email: "test@example.com",
        password: "password123",
        phone: "1234567890",
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user).toHaveProperty("id");
      expect(res.body.user.email).toBe("test@example.com");

      // Check wallet was created
      const wallets = await db("wallets")
        .join("users", "wallets.user_id", "=", "users.id")
        .where("users.email", "test@example.com");

      expect(wallets).toHaveLength(1);
      expect(String(wallets[0].balance)).toBe("0"); // Convert to string for comparison
    });

    it("should reject registration of blacklisted email", async () => {
      // Mock blacklisted response
      jest.spyOn(AuthService, "checkAdjutorBlacklist").mockResolvedValue(true);

      const res = await request(app).post("/api/v1/auth/register").send({
        name: "Blacklisted User", // Add name field
        email: "blacklisted@example.com",
        password: "password123",
      });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Blacklisted");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    beforeEach(async () => {
      // Create a test user
      jest.spyOn(AuthService, "checkAdjutorBlacklist").mockResolvedValue(false);

      await request(app).post("/api/v1/auth/register").send({
        name: "Login Test User",
        email: "login@example.com",
        password: "password123",
      });
    });

    it("should login with valid credentials", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "login@example.com",
        password: "password123",
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user.email).toBe("login@example.com");
    });

    it("should reject invalid credentials", async () => {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: "login@example.com",
        password: "wrongpassword",
      });

      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/v1/dev/check-blacklist", () => {
    it("should check if an email is blacklisted", async () => {
      // Mock the implementation for development environment
      jest
        .spyOn(AuthService, "devCheckBlacklist")
        .mockImplementation(async (type, value) => {
          return value.includes("blacklisted");
        });

      const res = await request(app).post("/api/v1/dev/check-blacklist").send({
        type: "email",
        value: "blacklisted@example.com",
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("isBlacklisted", true);
    });

    it("should return false for non-blacklisted email", async () => {
      // Mock the implementation for development environment
      jest
        .spyOn(AuthService, "devCheckBlacklist")
        .mockImplementation(async (type, value) => {
          return value.includes("blacklisted");
        });

      const res = await request(app).post("/api/v1/dev/check-blacklist").send({
        type: "email",
        value: "normal@example.com",
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("isBlacklisted", false);
    });
  });
});
