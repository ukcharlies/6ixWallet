import { Request, Response, NextFunction } from "express";
import WalletService from "../services/wallet.service";
import { toCents } from "../utilis/money";

export default class WalletController {
  static async getWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const wallet = await WalletService.getWallet(userId);
      return res.status(200).json({ wallet }); // Wrap in wallet object
    } catch (err) {
      next(err);
    }
  }

  static async fund(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { amount, reference, description } = req.body;

      const result = await WalletService.fundWallet(
        userId,
        toCents(amount),
        reference,
        description
      );

      return res.status(200).json({
        message: "Wallet funded successfully",
        transactionId: result.transactionId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async transfer(req: Request, res: Response, next: NextFunction) {
    try {
      const fromUserId = req.user!.userId;
      const { toUserId, amount, reference } = req.body;

      const transferId = await WalletService.transferFunds(
        fromUserId,
        toUserId,
        toCents(amount),
        reference
      );

      return res.status(200).json({
        message: "Transfer successful",
        transferId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async withdraw(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { amount, reference } = req.body;

      const result = await WalletService.withdrawFunds(
        userId,
        toCents(amount),
        reference
      );

      return res.status(200).json({
        message: "Withdrawal successful",
        withdrawalId: result.transactionId, // Change transactionId to withdrawalId
      });
    } catch (err) {
      next(err);
    }
  }

  static async getTransactions(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await WalletService.getTransactionHistory(
        userId,
        page,
        limit
      );

      return res.status(200).json({
        transactions: result.data,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }
}
