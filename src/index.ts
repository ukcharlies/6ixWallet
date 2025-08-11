//server bootstrap
import express from "express";
import config from "./config";
import apiRouter from "./routes/api";
import errorMiddleware from "./middlewares/error.middleware";

const app = express();
app.use(express.json());
app.use("/api/v1", apiRouter);
app.use(errorMiddleware);

app.listen(config.port, () => {
  console.log(`Server listening on ${config.port}`);
});
