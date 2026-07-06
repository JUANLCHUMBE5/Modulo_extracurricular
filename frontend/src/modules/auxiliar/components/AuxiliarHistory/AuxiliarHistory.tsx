import React from "react";

export default function AuxiliarHistory({ historial }) {
  return (
    <footer className="auxiliar-footer">
      <div className="auxiliar-footer-header">
        <h3>Últimos Ingresos Registrados ⏰</h3>
        <span className="badge-count">{historial.length} hoy</span>
      </div>

      {historial.length > 0 ? (
        <div className="historial-cards-container">
          {historial.map((ev) => {
            const histState = ev.estado === "registrado"
              ? "success"
              : ev.estado === "pendiente"
                ? "error"
                : "error";

            return (
              <div key={ev.id} className={`historial-bubble-card border-${histState}`}>
                <div className={`historial-badge-icon bg-${histState}`}>
                  {histState === "success" ? "✅" : "❌"}
                </div>
                <div className="historial-card-info">
                  <strong className="student-name-small">{ev.estudiante}</strong>
                  <span className="student-detail-small">
                    ⚽ {ev.programa} • ⏰ {ev.hora}
                  </span>
                  <span className={`historial-status-text text-${histState}`}>
                    {ev.estado === "registrado" ? "Ingresó" : ev.estado === "pendiente" ? "Falta Pagar" : "No Autorizado"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="historial-empty">
          <p>Aún no se registran ingresos en esta sesión. ¡Listo para comenzar! 🌟</p>
        </div>
      )}
    </footer>
  );
}
