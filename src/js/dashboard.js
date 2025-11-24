import { API_URL } from "./config.js";
import { mostrarAlerta } from "./utils.js";

export async function cargarResumen() {
  const div = document.getElementById("resumenResultado");
  div.innerHTML =
    '<div class="loading"><div class="spinner"></div><p>Cargando...</p></div>';
  try {
    const res = await fetch(`${API_URL}/reportes/resumen-general`);
    const data = await res.json();
    if (data.estado === "exito") {
      const d = data.datos;
      div.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card"><h3>${
                      d.medicamentos_activos
                    }</h3><p>Medicamentos Activos</p></div>
                    <div class="stat-card"><h3>${
                      d.medicamentos_bajo_stock
                    }</h3><p>Bajo Stock (&lt;10)</p></div>
                    <div class="stat-card"><h3>${
                      d.ventas_mes_actual
                    }</h3><p>Ventas este Mes</p></div>
                    <div class="stat-card"><h3>S/. ${d.ingresos_mes_actual.toFixed(
                      2
                    )}</h3><p>Ingresos del Mes</p></div>
                    <div class="stat-card"><h3>${
                      d.total_clientes
                    }</h3><p>Total Clientes</p></div>
                    <div class="stat-card"><h3>${
                      d.medicamentos_proximos_vencer
                    }</h3><p>Por Vencer (30 días)</p></div>
                </div>`;
    } else mostrarAlerta(div, data.mensaje, "error");
  } catch (e) {
    mostrarAlerta(div, `Error: ${e.message}`, "error");
  }
}

// Initialization
window.addEventListener("load", () => {
  if (document.getElementById("resumenResultado")) cargarResumen();
});
