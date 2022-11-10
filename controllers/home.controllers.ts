import { Request, Response } from "express";

export const getHome = async (req: Request, res: Response) => {
  try {
    res.json({
      ok: true,
      msg: "Todo OK",
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};
