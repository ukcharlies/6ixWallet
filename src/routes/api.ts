import { Router } from "express";
import { z } from "zod";
import AuthController from "../controllers/auth.controller";
import WalletController from "../controllers/wallet.controller";
import authMiddleware from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import AuthService from "../services/auth.service";
import { Request, Response, NextFunction } from "express";
import db from "../db/knex";

const router = Router();

// Validation schemas
const registerSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email(),
    password: z.string().min(8),
    phone: z.string().optional(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
});

const transferSchema = z.object({
  body: z.object({
    toUserId: z.string().uuid(),
    amount: z.number().positive(),
    reference: z.string(),
  }),
});

const fundSchema = z.object({
  body: z.object({
    amount: z.number().positive(),
    reference: z.string(),
    description: z.string().optional(),
  }),
});

const withdrawSchema = z.object({
  body: z.object({
    amount: z.number().positive(),
    reference: z.string(),
  }),
});

// Auth routes
router.post(
  "/auth/register",
  validate(registerSchema),
  AuthController.register
);
router.post("/auth/login", validate(loginSchema), AuthController.login);
// Dev-only route
router.post("/dev/check-blacklist", AuthController.checkBlacklist);
// Implement createDevUser handler directly in the routes file
router.post(
  "/dev/create-user",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password, phone } = req.body;
      const { user, token } = await AuthService.createDevUser({
        name,
        email,
        password,
        phone,
      });

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
    WalletController.withdraw;
  }
);

// Protected wallet routes
router.use("/wallet", authMiddleware);
router.get("/wallet", WalletController.getWallet);
router.post("/wallet/fund", validate(fundSchema), WalletController.fund);
router.post(
  "/wallet/transfer",
  validate(transferSchema),
  WalletController.transfer
);
router.post(
  "/wallet/withdraw",
  validate(withdrawSchema),
  WalletController.withdraw
);
router.get("/wallet/transactions", WalletController.getTransactions);

// Add to your existing routes
router.get("/health", async (req, res) => {
  try {
    await db.raw("SELECT 1");
    res.status(200).json({ status: "healthy", database: "connected" });
  } catch (error) {
    res.status(500).json({ status: "unhealthy", database: "disconnected" });
  }
});

export default router;
