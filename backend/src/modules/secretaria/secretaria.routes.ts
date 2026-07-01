import express from "express";
import multer from "multer";
import { SecretariaController } from "./secretaria.controller.js";
import { MAX_WORD_FILE_SIZE } from "../../services/file.service.js";

const router = express.Router();
const controller = new SecretariaController();

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_WORD_FILE_SIZE, files: 1 },
});

router.post("/api/secretaria/documentos/pdf", documentUpload.single("archivo"), (req, res) => controller.convertDocToPdf(req, res));

export default router;
