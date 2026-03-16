import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import spotsRouter from "./spots";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(spotsRouter);

export default router;
