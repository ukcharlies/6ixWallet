import { Request, Response, NextFunction } from "express";
import AuthService from "../services/auth.service";

export default class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password, phone } = req.body;
      const { user, token } = await AuthService.register({
        name,
        email,
        password,
        phone,
      });
      return res
        .status(201)
        .json({
          user: { id: user.id, name: user.name, email: user.email },
          token,
        });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const { user, token } = await AuthService.login({ email, password });
      return res.status(200).json({ user, token });
    } catch (err) {
      next(err);
    }
  }

  // Dev-only endpoint
  static async checkBlacklist(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, value } = req.body;
      const isBlacklisted = await AuthService.devCheckBlacklist(type, value);
      return res.status(200).json({ isBlacklisted });
    } catch (err) {
      next(err);
    }
  }
}
