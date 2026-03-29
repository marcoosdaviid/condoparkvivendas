
import { Router, type IRouter } from "express";

const router: IRouter = Router();

function getBrazilTime() {
  const dateStr = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  return new Date(dateStr);
}

router.get("/debug-time", (req, res) => {
  const bz = getBrazilTime();
  res.json({
    serverTimeUTC: new Date().toISOString(),
    brazilTime: bz.toISOString(),
    formatted: `${bz.getFullYear()}-${bz.getMonth()+1}-${bz.getDate()} ${bz.getHours()}:${bz.getMinutes()}`
  });
});

export default router;
