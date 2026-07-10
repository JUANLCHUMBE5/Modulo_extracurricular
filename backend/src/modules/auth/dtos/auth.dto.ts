import { z } from "zod";

// Schema for login (operators)
export const LoginSchema = z.object({
  username: z.string({ message: "El nombre de usuario es requerido" }).min(2, "El usuario debe tener al menos 2 caracteres"),
  password: z.string({ message: "La contraseña es requerida" }).min(4, "La contraseña debe tener al menos 4 caracteres"),
});

// Schema for parent validation
export const ValidatePadreSchema = z.object({
  dni: z.string({ message: "El DNI es requerido" })
    .min(8, "El DNI debe tener exactamente 8 caracteres")
    .max(8, "El DNI debe tener exactamente 8 caracteres")
    .regex(/^\d+$/, "El DNI debe contener solo números"),
  fecha_nacimiento: z.string({ message: "La fecha de nacimiento es requerida" }),
});

// Schema for user creation (matches auth-user.service.ts fields)
export const CreateUserSchema = z.object({
  usuario: z.string({ message: "El nombre de usuario es requerido" }).min(2, "El usuario debe tener al menos 2 caracteres"),
  nombre: z.string().optional(),
  contrasena: z.string().optional(),
  rol: z.string().optional(),
  roles: z.array(z.string()).optional(),
  estado: z.string().optional(),
  permisos: z.array(z.string()).optional(),
});

export type LoginDto = z.infer<typeof LoginSchema>;
export type ValidatePadreDto = z.infer<typeof ValidatePadreSchema>;
export type CreateUserDto = z.infer<typeof CreateUserSchema>;
