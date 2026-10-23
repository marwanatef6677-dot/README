import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import ridesRouter from "./rides";
import mapsRouter from "./maps";
import trackingRouter from "./tracking";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(mapsRouter);
router.use(trackingRouter);
router.use(ridesRouter);

export default router;
