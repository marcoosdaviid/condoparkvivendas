import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import spotsRouter from "./spots";
import requestsRouter from "./requests";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(spotsRouter);
router.use(requestsRouter);

export default router;
