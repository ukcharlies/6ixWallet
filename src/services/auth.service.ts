import db from "../db/knex";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import config from "../config";
import fetch from "node-fetch";

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  phone?: string;
};
type LoginPayload = { email: string; password: string };

export default class AuthService {
  static async checkAdjutorBlacklist(type: string, value: string) {
    try {
      // Fallback to mock if API details not set
      if (!config.adjutor.apiKey || !config.adjutor.baseUrl) {
        console.log(`[DEV MODE] Checking blacklist: ${type}=${value}`);
        // Mock blacklist check - blacklist emails containing "blacklisted"
        return value.includes("blacklisted");
      }

      const res = await fetch(`${config.adjutor.baseUrl}/karma/lookup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.adjutor.apiKey}`,
        },
        body: JSON.stringify({ identityType: type, identityValue: value }),
      });

      if (!res.ok) {
        throw new Error(`Adjutor API error: ${res.status}`);
      }

      type AdjutorResponse = { blacklisted: boolean };
      const json = (await res.json()) as AdjutorResponse;

      // Log blacklist check
      const logId = uuidv4();
      await db("blacklist_logs").insert({
        id: logId,
        identity_type: type,
        identity_value: value,
        is_blacklisted: json?.blacklisted ?? false,
        created_at: db.fn.now(),
      });

      return json?.blacklisted ?? false;
    } catch (error) {
      console.error("Adjutor API error:", error);
      // In case of API failure, don't block registration
      return false;
    }
  }

  static async register(payload: RegisterPayload) {
    // Check blacklist first - moved to beginning to ensure check happens before any DB operations
    const isBlacklisted = await AuthService.checkAdjutorBlacklist(
      "email",
      payload.email
    );
    if (isBlacklisted) {
      throw Object.assign(new Error("Blacklisted"), { status: 403 });
    }

    const id = uuidv4();
    const walletId = uuidv4();
    const passwordHash = await bcrypt.hash(payload.password, 10);

    await db.transaction(async (trx) => {
      await trx("users").insert({
        id,
        name: payload.name,
        email: payload.email,
        phone: payload.phone || null,
        password_hash: passwordHash,
      });
      await trx("wallets").insert({ id: walletId, user_id: id, balance: 0 });
    });

    const token = jwt.sign({ userId: id }, config.jwtSecret, {
      expiresIn: "7d",
    });
    return { user: { id, name: payload.name, email: payload.email }, token };
  }

  static async login(payload: LoginPayload) {
    const user = await db("users").where({ email: payload.email }).first();
    if (!user) {
      throw Object.assign(new Error("Invalid credentials"), { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(
      payload.password,
      user.password_hash
    );
    if (!isPasswordValid) {
      throw Object.assign(new Error("Invalid credentials"), { status: 401 });
    }

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, {
      expiresIn: "7d",
    });

    return { user: { id: user.id, email: user.email }, token };
  }

  // Dev-only endpoint
  static async devCheckBlacklist(type: string, value: string) {
    if (config.env !== "development") {
      throw Object.assign(
        new Error("This endpoint is only available in development mode"),
        { status: 403 }
      );
    }
    return this.checkAdjutorBlacklist(type, value);
  }
}
