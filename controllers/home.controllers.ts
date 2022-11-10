import { Request, Response } from "express";

export const getHome = async (req: Request, res: Response) => {
  res.status(200);
  res.send({ ok: "Todo OK" });
};
