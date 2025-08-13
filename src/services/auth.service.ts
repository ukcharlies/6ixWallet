import db from "../db/knex";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import config from "../config";
import fetch from "node-fetch"; // Change this line

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

      // The curl example shows a direct path parameter, not using type/value
      // So we'll just pass the value directly in the URL
      const encodedValue = encodeURIComponent(value);
      const url = `${config.adjutor.baseUrl}/${encodedValue}`;

      console.log(`Making request to: ${url}`);

      const res = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${config.adjutor.apiKey}`,
        },
      });

      // Log the status and response body for debugging
      console.log(`Adjutor API response status: ${res.status}`);
      const responseText = await res.text();
      console.log(`Adjutor API response body: ${responseText}`);

      if (!res.ok) {
        throw new Error(`Adjutor API error: ${res.status}`);
      }

      // Parse the response as JSON after we've logged it as text
      const json = JSON.parse(responseText);

      // Based on the curl example response format
      const isBlacklisted =
        json.status === "success" &&
        json.data &&
        json.data.karma_type &&
        json.data.karma_type.karma === "Others"; // "Others" was the value in your example

      // Log blacklist check
      const logId = uuidv4();
      await db("blacklist_logs").insert({
        id: logId,
        identity_type: type,
        identity_value: value,
        is_blacklisted: isBlacklisted,
        created_at: db.fn.now(),
      });

      return isBlacklisted;
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

  // Dev-only endpoint for direct user creation without blacklist check
  static async createDevUser(payload: RegisterPayload) {
    if (process.env.NODE_ENV !== "development") {
      throw Object.assign(
        new Error("This endpoint is only available in development mode"),
        { status: 403 }
      );
    }

    // Use your existing user creation logic but skip blacklist check
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(payload.password, 10);

    const user = await db.transaction(async (trx) => {
      const [user] = await trx("users")
        .insert({
          id,
          name: payload.name,
          email: payload.email,
          password_hash: passwordHash,
          phone: payload.phone,
        })
        .returning(["id", "name", "email"]);

      await trx("wallets").insert({
        id: uuidv4(),
        user_id: id,
        balance: 0,
      });

      return user;
    });

    const token = jwt.sign({ userId: id }, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    });

    return { user, token };
  }
}
