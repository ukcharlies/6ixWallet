import { Request, Response, NextFunction } from "express";
import AuthService from "../services/auth.service";

// Add interface for dev user creation payload
interface CreateDevUserPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

// Define a type for the class to ensure all methods are recognized
type AuthControllerType = {
  register(req: Request, res: Response, next: NextFunction): Promise<void>;
  login(req: Request, res: Response, next: NextFunction): Promise<void>;
  checkBlacklist(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void>;
  createDevUser(req: Request, res: Response, next: NextFunction): Promise<void>;
};

// Create the class and define methods
class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password, phone } = req.body;
      const { user, token } = await AuthService.register({
        name,
        email,
        password,
        phone,
      });
      return res.status(201).json({
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

  // Dev-only endpoint for creating users without blacklist check
  static async createDevUser(req: Request, res: Response, next: NextFunction) {
    try {
      const payload: CreateDevUserPayload = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        phone: req.body.phone,
      };

      const { user, token } = await AuthService.createDevUser(payload);

      return res.status(201).json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        token,
      });
    } catch (err) {
      next(err);
    }
  }
}

// Export with type assertion to ensure TypeScript recognizes all methods
export default AuthController as unknown as {
  new (): AuthControllerType;
  register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response<any, Record<string, any>> | undefined>;
  login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response<any, Record<string, any>> | undefined>;
  checkBlacklist(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response<any, Record<string, any>> | undefined>;
  createDevUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response<any, Record<string, any>> | undefined>;
};
