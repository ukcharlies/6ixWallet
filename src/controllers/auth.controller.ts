import { Request, Response, NextFunction } from "express";
import AuthService from "../services/auth.service";

export default class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, phone } = req.body;
      const { user, token } = await AuthService.register({
        email,
        password,
        phone,
      });
      return res
        .status(201)
        .json({ user: { id: user.id, email: user.email }, token });
    } catch (err) {
      next(err);
    }
  }
}
