import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import ridesRouter from "./rides";
import mapsRouter from "./maps";
import trackingRouter from "./tracking";
import walletRouter from "./wallet";
import driverReviewRouter from "./driver-review";
import rideMessagesRouter from "./ride-messages";
import supportRouter from "./support";
import openaiSupportRouter from "./openai-support";
import profilePhotosRouter from "./profile-photos";
import driverDocumentsRouter from "./driver-documents";
import pabloFeedbackRouter from "./pablo-feedback";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(mapsRouter);
router.use(trackingRouter);
router.use(ridesRouter);
router.use(rideMessagesRouter);
router.use(walletRouter);
router.use(driverReviewRouter);
router.use(supportRouter);
router.use(openaiSupportRouter);
router.use(profilePhotosRouter);
router.use(driverDocumentsRouter);
router.use(pabloFeedbackRouter);

export default router;
