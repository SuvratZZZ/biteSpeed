import { Router } from "express";
import { identifyConroller } from "../controllers/identify.controller";

const router = Router();

router.post('/',identifyConroller);

export default router;