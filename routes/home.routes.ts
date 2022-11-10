/* 
  Path: '/api/home'
*/

import { Router } from "express";
import { getHome } from "../controllers/home.controllers";

const router = Router();

router.get("/", getHome);
export default router;
