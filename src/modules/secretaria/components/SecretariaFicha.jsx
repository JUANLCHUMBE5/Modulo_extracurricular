import { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";
import {
  IconFileText as FileText,
  IconLoader2 as Loader2,
  IconPrinter as Printer,
  IconX as X,
} from "@tabler/icons-react";
import {
  crearDatosFicha,
} from "../utils/secretariaFichaData";
import {
  convertirWordOriginalAPdf,
  crearPdfInvitacionDocumento,
  crearUrlPdfInvitacion,
  imprimirHtmlRenderizado,
  imprimirPdfBlob,
  imprimirWordRenderizado,
  normalizarMarcasAguaDocx,
  prepararVistaDocxParaImpresion,
} from "../utils/secretariaDocumentoPdf";
import {
  crearDocumentoInvitacion,
  generarComunicadoWordBlob,
} from "../utils/secretariaDocumentoWord";
function FichaAceptación({ estudiante, inscripcion, onClose }) {
  const ficha = crearDatosFicha(estudiante, inscripcion);
  const pdfFrameRef = useRef(null);
  const wordPreviewRef = useRef(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [wordPreview, setWordPreview] = useState({ cargando: false, error: "" });
  const [imprimiendoFicha, setImprimiendoFicha] = useState(false);
  const [documento, setDocumento] = useState({
    cargando: true,
    titulo: "Ficha de invitación",
    lineas: [],
    html: "",
    usaPlantilla: false,
    ficha,
  });

  useEffect(() => {
    document.body.classList.add("secretaria-printing-ficha");
    let activo = true;

    crearDocumentoInvitacion(estudiante, inscripcion).then((resultado) => {
      if (activo) setDocumento({ ...resultado, cargando: false });
    });

    return () => {
      activo = false;
      document.body.classList.remove("secretaria-printing-ficha");
    };
  }, [estudiante, inscripcion]);

  useEffect(() => {
    if (documento.cargando) {
      setPdfUrl("");
      setWordPreview({ cargando: false, error: "" });
      return undefined;
    }

    if (inscripcion.plantillaBase64 && wordPreviewRef.current) {
      let activo = true;
      let urlPdfGenerado = "";
      setPdfUrl("");
      setWordPreview({ cargando: true, error: "" });
      wordPreviewRef.current.innerHTML = "";

      generarComunicadoWordBlob({ estudiante, inscripcion })
        .then(async (blob) => {
          if (!activo || !wordPreviewRef.current) return;
          try {
            const pdf = await convertirWordOriginalAPdf(blob);
            if (!activo) return;
            urlPdfGenerado = URL.createObjectURL(pdf);
            setPdfUrl(urlPdfGenerado);
            setWordPreview({ cargando: false, error: "" });
            return;
          } catch {
            setPdfUrl("");
          }

          wordPreviewRef.current.innerHTML = "";
          await renderAsync(blob, wordPreviewRef.current, null, {
            className: "secretaria-docx-preview",
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            renderHeaders: true,
            renderFooters: true,
            renderFootnotes: true,
            breakPages: false,
            ignoreLastRenderedPageBreak: false,
          });
          prepararVistaDocxParaImpresion(wordPreviewRef.current);
          requestAnimationFrame(() => {
            if (activo) normalizarMarcasAguaDocx(wordPreviewRef.current);
          });
          window.setTimeout(() => {
            if (activo) normalizarMarcasAguaDocx(wordPreviewRef.current);
          }, 300);
          if (activo) setWordPreview({ cargando: false, error: "" });
        })
        .catch(() => {
          if (!activo) return;
          const url = crearUrlPdfInvitacion(documento);
          setPdfUrl(url);
          setWordPreview({
            cargando: false,
            error: "No se pudo mostrar el Word original en la vista. Puede intentar descargar el PDF cuando el convertidor del backend esté disponible.",
          });
        });

      return () => {
        activo = false;
        if (urlPdfGenerado) URL.revokeObjectURL(urlPdfGenerado);
      };
    }

    const url = crearUrlPdfInvitacion(documento);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [documento, estudiante, inscripcion]);

  async function imprimirFicha() {
    if (inscripcion.plantillaBase64) {
      setImprimiendoFicha(true);
      try {
        if (wordPreviewRef.current?.innerHTML && !wordPreview.cargando) {
          prepararVistaDocxParaImpresion(wordPreviewRef.current);
          await imprimirHtmlRenderizado(wordPreviewRef.current.innerHTML);
        } else {
          const word = await generarComunicadoWordBlob({ estudiante, inscripcion });
          try {
            const pdf = await convertirWordOriginalAPdf(word);
            imprimirPdfBlob(pdf);
          } catch {
            await imprimirWordRenderizado(word);
          }
        }
      } catch (err) {
        setWordPreview((actual) => ({
          ...actual,
          cargando: false,
          error: err.message || "No se pudo preparar la impresión.",
        }));
      } finally {
        setImprimiendoFicha(false);
      }
      return;
    }

    if (pdfFrameRef.current?.contentWindow) {
      pdfFrameRef.current.contentWindow.focus();
      pdfFrameRef.current.contentWindow.print();
      return;
    }

    window.print();
  }

  return (
    <div className="secretaria-modal-overlay" role="presentation" onClick={onClose}>
      <section
        className="secretaria-card secretaria-ficha-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="secretaria-ficha-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="secretaria-ficha-top">
          <h2 id="secretaria-ficha-title">Ficha de invitación</h2>
          <button className="secretaria-modal-close" type="button" onClick={onClose} aria-label="Cerrar ficha">
            <X size={18} />
          </button>
        </div>

        <div className="secretaria-ficha-paper secretaria-pdf-paper">
          {documento.cargando ? (
            <p>Generando invitación personalizada...</p>
          ) : inscripcion.plantillaBase64 ? (
            <>
              <div className="secretaria-word-ready">
                <FileText size={18} />
                <div>
                  <strong>Vista del Word original personalizado</strong>
                  <span>Es la plantilla cargada por Coordinación con los datos del alumno y apoderado rellenados.</span>
                </div>
              </div>
              {wordPreview.cargando ? <p className="secretaria-word-loading">Preparando vista del Word...</p> : null}
              {wordPreview.error ? <p className="secretaria-word-error">{wordPreview.error}</p> : null}
              {pdfUrl ? (
                <iframe
                  ref={pdfFrameRef}
                  className="secretaria-pdf-viewer"
                  src={pdfUrl}
                  title="Vista PDF de la ficha de invitación"
                />
              ) : (
                <div className="secretaria-word-document" ref={wordPreviewRef} />
              )}
            </>
          ) : pdfUrl ? (
            <iframe
              ref={pdfFrameRef}
              className="secretaria-pdf-viewer"
              src={pdfUrl}
              title="Vista PDF de la ficha de invitación"
            />
          ) : (
            <>
              <header>
                <h3>COLEGIO MATEMATICO SAN RAFAEL</h3>
                <strong>{documento.titulo}</strong>
                <span>Carabayllo, {ficha.fecha}</span>
                <span>Código de inscripcion: {ficha.codigo}</span>
              </header>
              <div className="secretaria-invitation-text">
                {documento.lineas.map((linea, index) => (
                  <p key={`${linea}-${index}`}>{linea}</p>
                ))}
              </div>

              <FichaBloque
                titulo="Resumen de invitación"
                items={documento.resumen}
              />
            </>
          )}
        </div>

        <div className="secretaria-ficha-actions">
          <button
            className="secretaria-primary-button"
            type="button"
            onClick={imprimirFicha}
            disabled={imprimiendoFicha || wordPreview.cargando}
          >
            {imprimiendoFicha ? <Loader2 className="secretaria-spin" size={17} /> : <Printer size={17} />}
            <span>{imprimiendoFicha ? "Preparando" : "Imprimir ficha"}</span>
          </button>
          <button className="secretaria-register-button" type="button" onClick={onClose}>Aceptar</button>
        </div>
      </section>
    </div>
  );
}

function FichaBloque({ titulo, items }) {
  return (
    <section className="secretaria-ficha-block">
      <h4>{titulo}</h4>
      {items.map(([label, value]) => (
        <p key={label}>
          <strong>{label}:</strong> {value}
        </p>
      ))}
    </section>
  );
}

async function imprimirInscripcionDirecta(estudiante, inscripcion) {
  if (inscripcion.plantillaBase64) {
    const word = await generarComunicadoWordBlob({ estudiante, inscripcion });
    try {
      const pdf = await convertirWordOriginalAPdf(word);
      imprimirPdfBlob(pdf);
    } catch {
      await imprimirWordRenderizado(word);
    }
    return;
  }

  const documento = await crearDocumentoInvitacion(estudiante, inscripcion);
  const pdf = crearPdfInvitacionDocumento(documento).output("blob");
  imprimirPdfBlob(pdf);
}

export { FichaAceptación, imprimirInscripcionDirecta };

