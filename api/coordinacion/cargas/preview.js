import { generarPreviewCargaExcel } from "../../../server/excelPreviewService.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ message: "Metodo no permitido." });
    return;
  }

  try {
    const form = await parseMultipartForm(req);
    const preview = await generarPreviewCargaExcel({
      periodo: form.fields.periodo,
      archivo: form.files.archivo,
      programas: parseJsonArray(form.fields.programas),
      existentes: parseJsonObject(form.fields.existentes),
    });

    res.status(200).json(preview);
  } catch (error) {
    res.status(400).json({
      message: error.publicMessage || error.message || "No se pudo validar el archivo Excel.",
    });
  }
}

async function parseMultipartForm(req) {
  const contentType = req.headers["content-type"] || "";
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) throw new Error("La solicitud no contiene un formulario valido.");

  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
  const body = await readRequestBody(req);
  const parts = splitBuffer(body, boundary);
  const fields = {};
  const files = {};

  for (const rawPart of parts) {
    let part = trimBoundaryPart(rawPart);
    if (!part.length || part.equals(Buffer.from("--"))) continue;

    const separator = Buffer.from("\r\n\r\n");
    const separatorIndex = part.indexOf(separator);
    if (separatorIndex === -1) continue;

    const rawHeaders = part.subarray(0, separatorIndex).toString("utf8");
    const content = stripTrailingCrlf(part.subarray(separatorIndex + separator.length));
    const disposition = rawHeaders.match(/content-disposition:\s*form-data;([^\r\n]+)/i)?.[1] || "";
    const name = disposition.match(/name="([^"]+)"/i)?.[1];
    const filename = disposition.match(/filename="([^"]*)"/i)?.[1];
    if (!name) continue;

    if (filename) {
      files[name] = {
        originalname: filename,
        buffer: content,
        size: content.length,
      };
    } else {
      fields[name] = content.toString("utf8");
    }
  }

  return { fields, files };
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function splitBuffer(buffer, delimiter) {
  const result = [];
  let start = 0;
  let index = buffer.indexOf(delimiter, start);

  while (index !== -1) {
    result.push(buffer.subarray(start, index));
    start = index + delimiter.length;
    index = buffer.indexOf(delimiter, start);
  }

  result.push(buffer.subarray(start));
  return result;
}

function trimBoundaryPart(part) {
  let output = part;
  if (output.subarray(0, 2).toString() === "\r\n") output = output.subarray(2);
  if (output.subarray(0, 2).toString() === "--") output = output.subarray(2);
  return output;
}

function stripTrailingCrlf(buffer) {
  if (buffer.subarray(-2).toString() === "\r\n") return buffer.subarray(0, -2);
  return buffer;
}

function parseJsonArray(valor) {
  try {
    const parsed = JSON.parse(valor || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject(valor) {
  try {
    const parsed = JSON.parse(valor || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
