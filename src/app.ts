//express app,middleware
import express from "express";
import config from "./config";
import apiRouter from "./routes/api";
import errorMiddleware from "./middlewares/error.middleware";

const app = express();
app.use(express.json());
app.use("/api/v1", apiRouter);
app.use(errorMiddleware);

export default app;