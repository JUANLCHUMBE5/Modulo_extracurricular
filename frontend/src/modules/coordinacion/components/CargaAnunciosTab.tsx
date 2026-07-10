import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  IconCloudUpload as CloudUpload,
  IconCircleCheck as CheckCircle2,
  IconBell as Megaphone,
  IconTrash as Trash,
} from "@tabler/icons-react";

interface Anuncio {
  id: string;
  nombre: string;
  imagen: string;
  fechaHasta: string;
  fechaCreado: string;
  activo: boolean;
}

export default function CargaAnunciosTab() {
  const [anunciosList, setAnunciosList] = useState<Anuncio[]>(() => {
    try {
      const stored = localStorage.getItem("san_rafael_anuncios_list");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let listChanged = false;
    const cleanedList = anunciosList
      .map((item) => {
        const expirationTime = new Date(item.fechaHasta).getTime();
        const isExpired = Date.now() > expirationTime;
        
        // Strip image payload if expired to save space
        if (isExpired && item.imagen) {
          listChanged = true;
          return {
            ...item,
            imagen: "",
          };
        }
        return item;
      })
      .filter((item) => {
        const expirationTime = new Date(item.fechaHasta).getTime();
        const timeSinceExpiration = Date.now() - expirationTime;
        
        // Delete completely after 1 hour of expiration
        if (timeSinceExpiration > 3600 * 1000) {
          listChanged = true;
          return false;
        }
        return true;
      });

    if (listChanged) {
      localStorage.setItem("san_rafael_anuncios_list", JSON.stringify(cleanedList));
      setAnunciosList(cleanedList);
    }
  }, [anunciosList]);

  const [tituloAnuncio, setTituloAnuncio] = useState("");
  const [imagenAnuncio, setImagenAnuncio] = useState<string | null>(null);
  const [fechaHasta, setFechaHasta] = useState("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("La imagen original no debe superar los 10 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.75);
          setImagenAnuncio(compressedDataUrl);
          const approxSizeKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
          toast.success(`Imagen optimizada y comprimida exitosamente (~${approxSizeKb} KB).`);
        } else {
          setImagenAnuncio(event.target?.result as string);
        }
      };
    };
    reader.readAsDataURL(file);
  };

  const handlePublicarAnuncio = () => {
    if (!imagenAnuncio) {
      toast.error("Por favor, sube una imagen para el anuncio.");
      return;
    }
    if (!fechaHasta) {
      toast.error("Por favor, selecciona la fecha y hora de expiración.");
      return;
    }
    const nuevoAnuncio: Anuncio = {
      id: `ANUNCIO-${Date.now()}`,
      nombre: tituloAnuncio.trim() || "Anuncio General",
      imagen: imagenAnuncio,
      fechaHasta: fechaHasta,
      fechaCreado: new Date().toISOString(),
      activo: true,
    };
    const newList = [nuevoAnuncio, ...anunciosList];
    localStorage.setItem("san_rafael_anuncios_list", JSON.stringify(newList));
    setAnunciosList(newList);

    setTituloAnuncio("");
    setImagenAnuncio(null);
    setFechaHasta("");
    toast.success("¡Anuncio publicado correctamente!");
  };

  const handleEliminarAnuncio = (id: string) => {
    const newList = anunciosList.filter((item) => item.id !== id);
    localStorage.setItem("san_rafael_anuncios_list", JSON.stringify(newList));
    setAnunciosList(newList);
    toast.success("Anuncio eliminado.");
  };

  return (
    <div style={{ animation: "coord-fade-in 0.25s ease", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
        {/* COLUMNA 1: Formulario de Publicación */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "14px",
              fontWeight: 800,
              color: "#0f172a",
              borderBottom: "1px solid #f1f5f9",
              paddingBottom: "8px",
            }}
          >
            Gestión de Anuncios y Comunicados (Portal de Padres)
          </h3>

          <div className="coord-form-group-green" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="anuncio-titulo" style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>
              Título del Anuncio
            </label>
            <input
              id="anuncio-titulo"
              type="text"
              placeholder="Ej. Matrículas Abiertas Ciclo Vacacional"
              value={tituloAnuncio}
              onChange={(e) => setTituloAnuncio(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
                width: "100%",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div className="coord-form-group-green" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="anuncio-fecha" style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>
              Mostrar hasta (Expiración)
            </label>
            <input
              id="anuncio-fecha"
              type="datetime-local"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              style={{
                padding: "8px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
                width: "100%",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div className="coord-form-group-green" style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>Imagen del Anuncio</label>
            <div
              className="coord-file-drop"
              onClick={() => document.getElementById("coord-anuncio-image-upload")?.click()}
              style={{
                border: "2px dashed #9ac6bd",
                borderRadius: "8px",
                padding: "16px",
                textAlign: "center",
                cursor: "pointer",
                backgroundColor: "#f8fafc",
              }}
            >
              {imagenAnuncio ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <img
                    src={imagenAnuncio}
                    alt="Vista previa"
                    style={{ maxHeight: "120px", maxWidth: "100%", objectFit: "contain", borderRadius: "4px" }}
                  />
                  <span style={{ fontSize: "11px", color: "#0c8569", fontWeight: 600 }}>Cambiar imagen</span>
                </div>
              ) : (
                <>
                  <CloudUpload size={24} style={{ color: "#0c8569", marginBottom: "4px" }} />
                  <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>
                    Arrastra una imagen o <span style={{ color: "#0c8569", fontWeight: 600 }}>haz clic</span>
                  </p>
                  <span style={{ fontSize: "10px", color: "#94a3b8" }}>PNG, JPG — máx 10 MB</span>
                </>
              )}
              <input
                id="coord-anuncio-image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: "none" }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handlePublicarAnuncio}
            disabled={!imagenAnuncio || !fechaHasta}
            style={{
              marginTop: "4px",
              padding: "10px 16px",
              backgroundColor: !imagenAnuncio || !fechaHasta ? "#cbd5e1" : "#0c8569",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              cursor: !imagenAnuncio || !fechaHasta ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "13px",
              transition: "background 0.2s",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "8px",
            }}
            onMouseEnter={(e) => {
              if (imagenAnuncio && fechaHasta) e.currentTarget.style.backgroundColor = "#0a7058";
            }}
            onMouseLeave={(e) => {
              if (imagenAnuncio && fechaHasta) e.currentTarget.style.backgroundColor = "#0c8569";
            }}
          >
            <CheckCircle2 size={15} />
            Publicar Anuncio
          </button>
        </div>

        {/* COLUMNA 2: Historial y Anuncios Activos */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "14px",
              fontWeight: 800,
              color: "#0f172a",
              borderBottom: "1px solid #f1f5f9",
              paddingBottom: "8px",
            }}
          >
            Historial de Anuncios Publicados
          </h3>

          {anunciosList.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                minHeight: "180px",
                color: "#64748b",
                gap: "8px",
              }}
            >
              <Megaphone size={28} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: "13px" }}>No se han publicado anuncios aún.</span>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                maxHeight: "400px",
                overflowY: "auto",
                paddingRight: "4px",
              }}
            >
              {anunciosList.map((item) => {
                const isExpired = new Date(item.fechaHasta) <= new Date();
                return (
                  <div
                    key={item.id}
                    style={{
                      padding: "12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      background: isExpired ? "#f8fafc" : "#f0fdf4",
                      display: "flex",
                      gap: "12px",
                      alignItems: "center",
                    }}
                  >
                    {item.imagen ? (
                      <img
                        src={item.imagen}
                        alt={item.nombre}
                        style={{
                          width: "64px",
                          height: "64px",
                          objectFit: "contain",
                          borderRadius: "4px",
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          padding: "2px",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "64px",
                          height: "64px",
                          display: "grid",
                          placeItems: "center",
                          borderRadius: "4px",
                          background: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          color: "#94a3b8",
                        }}
                      >
                        <Megaphone size={20} />
                      </div>
                    )}

                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span
                        style={{
                          alignSelf: "flex-start",
                          fontSize: "9px",
                          fontWeight: 700,
                          color: isExpired ? "#64748b" : "#166534",
                          backgroundColor: isExpired ? "#e2e8f0" : "#dcfce7",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          textTransform: "uppercase",
                        }}
                      >
                        {isExpired ? "Expirado" : "Vigente"}
                      </span>
                      <strong
                        style={{
                          fontSize: "13px",
                          color: "#1e293b",
                          display: "-webkit-box",
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {item.nombre}
                      </strong>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                        Expira: {new Date(item.fechaHasta).toLocaleDateString("es-PE")}{" "}
                        {new Date(item.fechaHasta).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleEliminarAnuncio(item.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#ef4444",
                        padding: "8px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fee2e2")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      title="Eliminar anuncio"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
