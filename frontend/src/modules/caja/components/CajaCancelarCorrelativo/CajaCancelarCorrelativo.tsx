import { Button, Select, Textarea, TextInput, Paper, Text, Group } from "@mantine/core";
import {
  IconReceiptOff as ReceiptOff,
  IconAlertTriangle as AlertTriangle,
  IconMenu2 as Menu,
  IconSearch as Search,
  IconLoader2 as Loader,
  IconCoins as Coins,
  IconCheck as Check
} from "@tabler/icons-react";
import { formatearSoles } from "../../utils/cajaFormatters";
import useCajaCancelarCorrelativo from "../../hooks/useCajaCancelarCorrelativo";

export default function CajaCancelarCorrelativo({ sidebarExpanded, toggleSidebar, periodo, onCorrelativoCancelado }) {
  const {
    correlativos,
    motivo,
    setMotivo,
    busqueda,
    setBusqueda,
    resultados,
    buscandoEstudiante,
    estudianteSeleccionado,
    pagosEstudiante,
    cargandoPagos,
    pagoSeleccionadoId,
    setPagoSeleccionadoId,
    cargando,
    cargandoCorr,
    activeTab,
    setActiveTab,
    beneficiario,
    setBeneficiario,
    dniEgreso,
    setDniEgreso,
    montoEgreso,
    setMontoEgreso,
    conceptoEgreso,
    setConceptoEgreso,
    guardandoEgreso,
    tipoEgreso,
    busquedaEgreso,
    setBusquedaEgreso,
    resultadosEgreso,
    buscandoEstudianteEgreso,
    estudianteEgreso,
    pagosEgreso,
    cargandoPagosEgreso,
    pagoEgresoSeleccionadoId,
    handleBuscarEstudianteEgreso,
    seleccionarEstudianteEgreso,
    handlePagoEgresoChange,
    handleQuitarEstudianteEgreso,
    handleTipoEgresoChange,
    handleRegistrarEgreso,
    getPagoSeleccionado,
    getComprobanteFinal,
    handleBuscarEstudiante,
    handleSeleccionarEstudiante,
    handleQuitarEstudiante,
    handleCancelar,
  } = useCajaCancelarCorrelativo({
    periodo,
    onCorrelativoCancelado,
  });

  const pagoSeleccionado = getPagoSeleccionado();
  const comprobanteFinal = getComprobanteFinal();

  return (
    <section className="caja-payment-workspace caja-correlativo-workspace" style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>

      {/* TABS DE SELECCIÓN */}
      <div style={{ display: "flex", borderBottom: "2px solid #e2e8f0", paddingBottom: "0px", gap: "24px", marginBottom: "8px" }}>
        <button
          onClick={() => setActiveTab("anular")}
          type="button"
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "anular" ? "3px solid #b45309" : "3px solid transparent",
            color: activeTab === "anular" ? "#b45309" : "#64748b",
            fontSize: "16px",
            fontWeight: 700,
            padding: "8px 4px 12px 4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s"
          }}
        >
          <ReceiptOff size={18} />
          Anulación de Correlativo
        </button>
        <button
          onClick={() => setActiveTab("egreso")}
          type="button"
          style={{
            background: "none",
            border: "none",
            borderBottom: activeTab === "egreso" ? "3px solid #0c8569" : "3px solid transparent",
            color: activeTab === "egreso" ? "#0c8569" : "#64748b",
            fontSize: "16px",
            fontWeight: 700,
            padding: "8px 4px 12px 4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s"
          }}
        >
          <Coins size={18} />
          Registrar Egreso (Gasto)
        </button>
      </div>

      {activeTab === "anular" ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <ReceiptOff size={24} style={{ color: "#b45309" }} />
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#1f2937" }}>
              Anulación de Correlativo / Recibo del Sistema
            </h2>
          </div>

          <Paper withBorder p="md" radius="md" style={{ background: "#fffbeb", borderColor: "#fef3c7", width: "100%" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <AlertTriangle size={20} style={{ color: "#d97706", flexShrink: 0, marginTop: "2px" }} />
              <div>
                <Text fw={700} color="#b45309" size="sm">¡Importante!</Text>
                <Text size="xs" color="#78350f" style={{ marginTop: "4px", lineHeight: "1.4" }}>
                  Esta función registra el comprobante seleccionado como <strong>ANULADO</strong> en el sistema con un monto de S/ 0.00 y, de ser necesario, avanza el contador actual. Úselo únicamente por daños físicos de hojas, errores de impresión o anulaciones directas.
                </Text>
              </div>
            </div>
          </Paper>

          <Paper withBorder p="lg" radius="md" shadow="sm" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* BUSCADOR DE ESTUDIANTE (OPCIONAL) */}
            {!estudianteSeleccionado ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <form className="caja-search-form-responsive" onSubmit={handleBuscarEstudiante} style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
                  <TextInput
                    label="Buscar por Estudiante (DNI, Nombre o Apellido)"
                    placeholder="Ej. 12345678 o Perez Garcia"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.currentTarget.value)}
                    styles={{
                      label: { fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" },
                      input: { borderRadius: "8px", height: "38px" }
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    type="submit"
                    loading={buscandoEstudiante}
                    leftSection={<Search size={16} />}
                    styles={{
                      root: {
                        height: "38px",
                        borderRadius: "8px",
                        fontWeight: 600,
                        background: "#f1f5f9",
                        color: "#475569",
                        border: "1px solid #cbd5e1",
                        "&:hover": {
                          background: "#e2e8f0"
                        }
                      }
                    }}
                  >
                    Buscar
                  </Button>
                </form>

                {resultados.length > 0 && (
                  <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#ffffff", display: "flex", flexDirection: "column", marginTop: "4px" }}>
                    {resultados.map((est) => (
                      <button
                        key={est.dni}
                        type="button"
                        onClick={() => handleSeleccionarEstudiante(est)}
                        style={{
                          padding: "10px 12px",
                          textAlign: "left",
                          border: "none",
                          background: "none",
                          borderBottom: "1px solid #f1f5f9",
                          cursor: "pointer",
                          fontSize: "13px",
                          transition: "background 0.2s"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        <Text span fw={700} color="#1e293b">{est.nombres}</Text>
                        <Text span size="xs" color="#64748b" style={{ marginLeft: "8px" }}>DNI: {est.dni}</Text>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div>
                  <Text size="xs" color="dimmed">Estudiante Seleccionado:</Text>
                  <Text fw={700} size="sm" color="#1e293b">{estudianteSeleccionado.nombres}</Text>
                  <Text size="xs" color="dimmed">DNI: {estudianteSeleccionado.dni}</Text>
                </div>
                <Button size="xs" variant="outline" color="red" onClick={handleQuitarEstudiante}>
                  Cambiar estudiante
                </Button>
              </div>
            )}

            {/* SELECCIÓN DE RECIBO/COMPROBANTE VINCULADO */}
            {estudianteSeleccionado && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <Text size="sm" fw={700} color="#374151">Seleccionar Recibo a Anular</Text>
                {cargandoPagos ? (
                  <Group justify="center" p="md">
                    <Loader size="sm" />
                    <Text size="xs" color="dimmed">Cargando recibos del estudiante...</Text>
                  </Group>
                ) : pagosEstudiante.length === 0 ? (
                  <div style={{ padding: "16px", textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: "8px" }}>
                    <Text size="sm" color="dimmed">El estudiante no registra recibos activos anulables para talleres vigentes.</Text>
                  </div>
                ) : (
                  <Select
                    placeholder="Seleccione un comprobante..."
                    data={pagosEstudiante.map((p) => ({
                      value: p.id,
                      label: `Recibo N° ${p.nroRecibo || p.nro_recibo || "S/N"} - ${p.programa || "Sin Taller"} (S/ ${Number(p.monto).toFixed(2)})`
                    }))}
                    value={pagoSeleccionadoId}
                    onChange={setPagoSeleccionadoId}
                    styles={{
                      input: { borderRadius: "8px", height: "38px" }
                    }}
                  />
                )}
              </div>
            )}

            {pagoSeleccionado && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div>
                  <Text size="xs" color="dimmed">Taller/Curso:</Text>
                  <Text size="sm" fw={700}>{pagoSeleccionado.programa || "-"}</Text>
                </div>
                <div>
                  <Text size="xs" color="dimmed">Monto pagado:</Text>
                  <Text size="sm" fw={700} color="red">{formatearSoles(pagoSeleccionado.monto)}</Text>
                </div>
                <div>
                  <Text size="xs" color="dimmed">N° de recibo/operación:</Text>
                  <Text size="sm" fw={700}>{pagoSeleccionado.nroRecibo || "-"}</Text>
                </div>
                <div>
                  <Text size="xs" color="dimmed">Fecha de pago:</Text>
                  <Text size="sm" fw={700}>{String(pagoSeleccionado.fecha || pagoSeleccionado.fechaPago || "").slice(0, 10)}</Text>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <Text size="sm" fw={700} color="#374151">Justificación o Motivo de la Anulación *</Text>
              <Textarea
                placeholder="Indique brevemente el motivo de la anulación física o del cobro..."
                value={motivo}
                onChange={(e) => setMotivo(e.currentTarget.value)}
                required
                rows={4}
                styles={{
                  input: { borderRadius: "8px" }
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <Button
                onClick={handleCancelar}
                loading={cargando}
                disabled={!estudianteSeleccionado || !comprobanteFinal || !motivo.trim()}
                leftSection={<ReceiptOff size={16} />}
                color="red"
                styles={{
                  root: {
                    height: "40px",
                    borderRadius: "8px",
                    fontWeight: 600,
                    padding: "0 24px"
                  }
                }}
              >
                Anular Recibo / Comprobante
              </Button>
            </div>
          </Paper>
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <Coins size={24} style={{ color: "#0c8569" }} />
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#1f2937" }}>
              Registro de Egresos de Caja (Gasto/Devolución)
            </h2>
          </div>

          <Paper withBorder p="md" radius="md" style={{ background: "#f0fdf4", borderColor: "#dcfce7", width: "100%" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <AlertTriangle size={20} style={{ color: "#16a34a", flexShrink: 0, marginTop: "2px" }} />
              <div>
                <Text fw={700} color="#14532d" size="sm">¡Importante!</Text>
                <Text size="xs" color="#14532d" style={{ marginTop: "4px", lineHeight: "1.4" }}>
                  Esta función registra una salida de dinero en efectivo de la caja. El correlativo de egreso se auto-generará. Recuerde que el egreso afecta el balance de cierre diario.
                </Text>
              </div>
            </div>
          </Paper>

          <Paper withBorder p="lg" radius="md" shadow="sm" style={{ width: "100%", display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* TIPO DE EGRESO */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Text size="sm" fw={700} color="#374151">Tipo de Egreso</Text>
              <div style={{ display: "flex", gap: "16px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="tipoEgreso"
                    value="estudiante"
                    checked={tipoEgreso === "estudiante"}
                    onChange={() => handleTipoEgresoChange("estudiante")}
                    style={{ accentColor: "#0c8569" }}
                  />
                  Devolución a Estudiante
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="tipoEgreso"
                    value="general"
                    checked={tipoEgreso === "general"}
                    onChange={() => handleTipoEgresoChange("general")}
                    style={{ accentColor: "#0c8569" }}
                  />
                  Gasto General (Proveedores / Caja Chica)
                </label>
              </div>
            </div>

            {/* BÚSQUEDA DE ESTUDIANTE PARA DEVOLUCIÓN */}
            {tipoEgreso === "estudiante" && (
              <>
                {!estudianteEgreso ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <form className="caja-search-form-responsive" onSubmit={handleBuscarEstudianteEgreso} style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
                      <TextInput
                        label="Buscar Estudiante para Devolución"
                        placeholder="Ej. 12345678 o Perez Garcia"
                        value={busquedaEgreso}
                        onChange={(e) => setBusquedaEgreso(e.currentTarget.value)}
                        styles={{
                          label: { fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" },
                          input: { borderRadius: "8px", height: "38px" }
                        }}
                        style={{ flex: 1 }}
                      />
                      <Button
                        type="submit"
                        loading={buscandoEstudianteEgreso}
                        leftSection={<Search size={16} />}
                        styles={{
                          root: {
                            height: "38px",
                            borderRadius: "8px",
                            fontWeight: 600,
                            background: "#f1f5f9",
                            color: "#475569",
                            border: "1px solid #cbd5e1",
                            "&:hover": { background: "#e2e8f0" }
                          }
                        }}
                      >
                        Buscar
                      </Button>
                    </form>

                    {resultadosEgreso.length > 0 && (
                      <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #cbd5e1", borderRadius: "8px", background: "#ffffff", display: "flex", flexDirection: "column", marginTop: "4px" }}>
                        {resultadosEgreso.map((est) => (
                          <button
                            key={est.dni}
                            type="button"
                            onClick={() => seleccionarEstudianteEgreso(est)}
                            style={{
                              padding: "10px 12px",
                              textAlign: "left",
                              border: "none",
                              background: "none",
                              borderBottom: "1px solid #f1f5f9",
                              cursor: "pointer",
                              fontSize: "13px",
                              transition: "background 0.2s"
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                          >
                            <Text span fw={700} color="#1e293b">{est.nombres}</Text>
                            <Text span size="xs" color="#64748b" style={{ marginLeft: "8px" }}>DNI: {est.dni}</Text>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div>
                      <Text size="xs" color="dimmed">Estudiante Seleccionado:</Text>
                      <Text fw={700} size="sm" color="#1e293b">{estudianteEgreso.nombres}</Text>
                      <Text size="xs" color="dimmed">DNI: {estudianteEgreso.dni}</Text>
                    </div>
                    <Button size="xs" variant="outline" color="red" onClick={handleQuitarEstudianteEgreso}>
                      Cambiar estudiante
                    </Button>
                  </div>
                )}

                {/* SELECTOR DE PAGO PARA DEVOLVER */}
                {estudianteEgreso && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <Text size="sm" fw={700} color="#374151">Seleccionar Pago a Devolver</Text>
                    {cargandoPagosEgreso ? (
                      <Group justify="center" p="md">
                        <Loader size="sm" />
                        <Text size="xs" color="dimmed">Cargando pagos del estudiante...</Text>
                      </Group>
                    ) : pagosEgreso.length === 0 ? (
                      <div style={{ padding: "16px", textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: "8px" }}>
                        <Text size="sm" color="dimmed">El estudiante no registra pagos activos para devolver.</Text>
                      </div>
                    ) : (
                      <Select
                        placeholder="Seleccione un pago..."
                        data={pagosEgreso.map((p) => ({
                          value: p.id,
                          label: `Recibo N° ${p.nroRecibo || p.nro_recibo || "S/N"} - ${p.programa || "Sin Taller"} (S/ ${Number(p.monto).toFixed(2)})`
                        }))}
                        value={pagoEgresoSeleccionadoId}
                        onChange={handlePagoEgresoChange}
                        styles={{
                          input: { borderRadius: "8px", height: "38px" }
                        }}
                      />
                    )}
                  </div>
                )}
              </>
            )}

            {/* FORMULARIO DE EGRESO */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <TextInput
                label="Nombre del Beneficiario *"
                placeholder="Persona que recibe el dinero"
                value={beneficiario}
                onChange={(e) => setBeneficiario(e.currentTarget.value)}
                disabled={tipoEgreso === "estudiante" && Boolean(estudianteEgreso)}
                required
                styles={{
                  label: { fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" },
                  input: { borderRadius: "8px", height: "38px" }
                }}
              />
              <TextInput
                label="DNI del Beneficiario"
                placeholder="8 dígitos"
                value={dniEgreso}
                onChange={(e) => setDniEgreso(e.currentTarget.value)}
                disabled={tipoEgreso === "estudiante" && Boolean(estudianteEgreso)}
                maxLength={8}
                styles={{
                  label: { fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" },
                  input: { borderRadius: "8px", height: "38px" }
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <TextInput
                label="Monto de Salida (S/) *"
                placeholder="0.00"
                value={montoEgreso}
                onChange={(e) => setMontoEgreso(e.currentTarget.value)}
                required
                styles={{
                  label: { fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "6px" },
                  input: { borderRadius: "8px", height: "38px" }
                }}
              />
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <Text size="xs" color="dimmed" style={{ marginBottom: "20px" }}>
                  Siguiente egreso auto-correlativo: <strong>{correlativos?.egreso || "—"}</strong>
                </Text>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <Text size="sm" fw={700} color="#374151">Concepto o Justificación del Egreso *</Text>
              <Textarea
                placeholder="Ej. Devolución de pago por concepto de taller de robótica..."
                value={conceptoEgreso}
                onChange={(e) => setConceptoEgreso(e.currentTarget.value)}
                required
                rows={3}
                styles={{
                  input: { borderRadius: "8px" }
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <Button
                onClick={handleRegistrarEgreso}
                loading={guardandoEgreso}
                disabled={!beneficiario || !montoEgreso || !conceptoEgreso}
                leftSection={<Coins size={16} />}
                color="teal"
                styles={{
                  root: {
                    height: "40px",
                    borderRadius: "8px",
                    fontWeight: 600,
                    padding: "0 24px"
                  }
                }}
              >
                Registrar Salida / Egreso
              </Button>
            </div>
          </Paper>
        </>
      )}
    </section>
  );
}
