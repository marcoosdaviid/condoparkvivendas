import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import router from "./routes";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[API Error]", err);
  const message = err instanceof Error ? err.message : "Erro interno do servidor";
  res.status(500).json({ error: message });
});

export default app;
