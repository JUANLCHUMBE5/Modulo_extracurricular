import { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";
import {
  IconFileText as FileText,
  IconLoader2 as Loader2,
  IconPrinter as Printer,
  IconX as X,
} from "@tabler/icons-react";
import {
  cleanFallbackText,
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

    let activo = true;
    let urlPdfGenerado = "";
    let urlPdfOriginal = "";

    const setupFichaPdf = async () => {
      if (inscripcion.plantillaBase64 && wordPreviewRef.current) {
        setPdfUrl("");
        setWordPreview({ cargando: true, error: "" });
        wordPreviewRef.current.innerHTML = "";

        try {
          const blob = await generarComunicadoWordBlob({ estudiante, inscripcion });
          if (!activo || !wordPreviewRef.current) return;
          const pdf = await convertirWordOriginalAPdf(blob);
          if (!activo) return;
          urlPdfGenerado = URL.createObjectURL(pdf);
          setPdfUrl(urlPdfGenerado);
          setWordPreview({ cargando: false, error: "" });
        } catch {
          if (!activo) return;
          try {
            const url = await crearUrlPdfInvitacion(documento);
            if (!activo) return;
            urlPdfOriginal = url;
            setPdfUrl(url);
            setWordPreview({
              cargando: false,
              error: "No se pudo mostrar el Word original en la vista. Puede intentar descargar el PDF cuando el convertidor del backend esté disponible.",
            });
          } catch (e) {
            setPdfUrl("");
          }
        }
      } else {
        try {
          const url = await crearUrlPdfInvitacion(documento);
          if (!activo) return;
          urlPdfOriginal = url;
          setPdfUrl(url);
        } catch (e) {
          setPdfUrl("");
        }
      }
    };

    setupFichaPdf();

    return () => {
      activo = false;
      if (urlPdfGenerado) URL.revokeObjectURL(urlPdfGenerado);
      if (urlPdfOriginal) URL.revokeObjectURL(urlPdfOriginal);
    };
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
        const documentoFallback = await crearDocumentoInvitacion(estudiante, inscripcion);
        const pdf = (await crearPdfInvitacionDocumento(documentoFallback)).output("blob");
        imprimirPdfBlob(pdf);
        setWordPreview((actual) => ({
          ...actual,
          cargando: false,
          error: "La plantilla Word no se pudo usar. Se imprimio la ficha automatica.",
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

              {/* El bloque de resumen se ha removido por completo del diseño */}

              <div className="secretaria-ficha-signature-preview">
                <div className="secretaria-signature-line"></div>
                <span className="secretaria-signature-label">Firma del Padre / Apoderado</span>
                <span className="secretaria-signature-dni">DNI: _______________________</span>
              </div>
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
  if (!items || !items.length) return null;
  return (
    <section className="secretaria-ficha-block">
      {titulo ? <h4>{titulo.toUpperCase()}</h4> : null}
      <div className="secretaria-ficha-grid-table">
        {(items || []).map(([label, value]) => {
          const cleanLab = cleanFallbackText(label) || "-";
          const cleanVal = cleanFallbackText(value) || "-";
          return (
            <div className="secretaria-ficha-grid-row" key={label}>
              <div className="secretaria-ficha-grid-label">{cleanLab}</div>
              <div className="secretaria-ficha-grid-value">{cleanVal}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

async function imprimirInscripcionDirecta(estudiante, inscripcion) {
  if (inscripcion.plantillaBase64) {
    try {
      const word = await generarComunicadoWordBlob({ estudiante, inscripcion });
      try {
        const pdf = await convertirWordOriginalAPdf(word);
        imprimirPdfBlob(pdf);
      } catch {
        await imprimirWordRenderizado(word);
      }
      return;
    } catch (error) {
      console.warn("No se pudo usar la plantilla Word. Se usara la ficha PDF automatica.", error);
    }
  }

  const documento = await crearDocumentoInvitacion(estudiante, inscripcion);
  const pdf = (await crearPdfInvitacionDocumento(documento)).output("blob");
  imprimirPdfBlob(pdf);
}

export { FichaAceptación, imprimirInscripcionDirecta };

