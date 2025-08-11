import db from "../db/knex";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import config from "../config";
import fetch from "node-fetch"; // or axios

type RegisterPayload = { email: string; password: string; phone?: string };

export default class AuthService {
  static async checkAdjutorBlacklist(type: string, value: string) {
    // call Adjutor Karma endpoint; for tests you will mock this
    const res = await fetch(`${config.adjutor.baseUrl}/karma/lookup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.adjutor.apiKey}`,
      },
      body: JSON.stringify({ identityType: type, identityValue: value }),
    });
    const json = await res.json();
    return json?.blacklisted ?? false;
  }

  static async register(payload: RegisterPayload) {
    // check blacklist
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
        email: payload.email,
        phone: payload.phone || null,
        password_hash: passwordHash,
      });
      await trx("wallets").insert({ id: walletId, user_id: id, balance: 0 });
    });

    const token = jwt.sign({ userId: id }, config.jwtSecret, {
      expiresIn: "7d",
    });
    return { user: { id, email: payload.email }, token };
  }
}
