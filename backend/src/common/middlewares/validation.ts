import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        ok: false,
        error: "Error de validación de datos",
        detalles: result.error.errors.map(err => ({
          campo: err.path.join("."),
          mensaje: err.message
        }))
      });
      return;
    }
    // Asignar el objeto sanitizado (limpio de propiedades adicionales) a req.body
    req.body = result.data;
    next();
  };
};
