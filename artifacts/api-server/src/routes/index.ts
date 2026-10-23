import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import ridesRouter from "./rides";
import mapsRouter from "./maps";
import trackingRouter from "./tracking";
import walletRouter from "./wallet";
import driverReviewRouter from "./driver-review";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(mapsRouter);
router.use(trackingRouter);
router.use(ridesRouter);
router.use(walletRouter);
router.use(driverReviewRouter);

export default router;
