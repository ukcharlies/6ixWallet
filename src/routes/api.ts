import { Router } from "express";
import AuthController from "../controllers/auth.controller";
import WalletController from "../controllers/wallet.controller";

const router = Router();

router.post("/auth/register", AuthController.register);
// protected routes need auth middleware
router.post("/wallet/transfer", WalletController.transfer);

export default router;
