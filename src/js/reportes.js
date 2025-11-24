import { API_URL } from "./config.js";
import { mostrarAlerta } from "./utils.js";

const diccionariosReporte = {
  // Campos básicos
  nombre: "Producto",
  stock: "Stock",
  precio_venta: "Precio Venta",
  total_venta: "Total Vendido",
  id_venta: "Nro. Venta",
  fecha_vencimiento: "Fecha de vencimiento",
  contacto_telefono: "Teléfono",
  lote: "Lote",
  estado: "Estado",
  cantidad: "Cant.",

  // REPORTE INVENTARIO
  medicamento: "Medicamento",
  categoria: "Categoría",
  proveedor: "Proveedor",

  // REPORTE RENTABILIDAD
  precio_compra: "P. Compra",
  ganancia_unitaria: "Ganancia Unit.",
  margen_pct: "Margen %",
  margen_porcentaje: "Margen %",

  // REPORTE BAJO STOCK
  ubicacion: "Ubicación",

  // REPORTE INACTIVOS
  stock_remanente: "Stock Remanente",

  // REPORTE VENCIMIENTOS
  dias: "Días Restantes",
  dias_restantes: "Días Restantes",

  // REPORTE SIN STOCK
  id_proveedor: "Proveedor",

  // REPORTE EMPLEADOS
  empleado: "Empleado",
  total_ventas: "N° Ventas",
  total_monto: "Total Recaudado",
  total_dinero: "Total Recaudado",

  // REPORTE CLIENTES
  cliente: "Cliente",
  total_compras: "N° Compras",
  gastado: "Total Gastado",

  // REPORTE TOP VENDIDOS
  total_vendido: "Unidades Vendidas",

  // REPORTE INGRESOS
  mes: "Mes",
  num_ventas: "Transacciones",
  total_mes: "Total Caja",

  // OTROS (Legacy support)
  ingresos_totales: "Ingresos (Ventas)",
  costo_estimado: "Costo Mercadería",
  ganancia_bruta: "Ganancia Neta",
  productos_vendidos: "Prod. Vendidos",
  num_transacciones: "Cant. Ventas (Tickets)",
  total_generado: "Dinero Generado",
  unidades_vendidas: "Unidades Vendidas",
  compras_totales: "Veces que compró",
  vence: "Fecha Vencimiento",
  precio_promedio: "Precio Promedio",
};

export async function cargarReporte(endpoint, titulo, params = "") {
  const div = document.getElementById("resultadosReportes");
  div.innerHTML = `<div class="loading"><div class="spinner"></div><p>Generando reporte de ${titulo}...</p></div>`;

  try {
    const res = await fetch(`${API_URL}/reportes/${endpoint}${params}`);
    const data = await res.json();

    if (data.estado === "exito" && data.datos.length > 0) {
      const claves = Object.keys(data.datos[0]);

      let html = `
            <div class="report-header-box">
                <h3>${titulo}</h3>
                <span class="report-date">Generado: ${new Date().toLocaleString()}</span>
            </div>
            <div class="table-container shadow-table">
                <table class="report-table">
                    <thead>
                        <tr>`;

      claves.forEach((k) => {
        let label =
          diccionariosReporte[k] || k.replace(/_/g, " ").toUpperCase();

        if (label.includes("SUM(")) label = "Total";
        if (label.includes("COUNT(")) label = "Cantidad";
        if (label.includes("AVG(")) label = "Promedio";

        let alineacion = "";
        const isMoney =
          k.includes("precio") ||
          k.includes("ganancia") ||
          k.includes("gastado") ||
          k.includes("monto") ||
          k.includes("caja") ||
          k.includes("subtotal") ||
          k.includes("ingresos") ||
          k === "total_venta" ||
          k === "total_mes" ||
          k === "total_monto" ||
          k === "total_dinero";

        if (
          isMoney ||
          k.includes("stock") ||
          k.includes("cantidad") ||
          k.includes("total") ||
          k.includes("dias") ||
          k === "num_ventas" ||
          k === "total_ventas"
        ) {
          alineacion = 'class="text-right"';
        }

        html += `<th ${alineacion}>${label}</th>`;
      });

      html += `</tr></thead><tbody>`;

      data.datos.forEach((r) => {
        html += "<tr>";
        claves.forEach((k) => {
          let valor = r[k];

          if (valor === null) valor = "-";

          const isMoney =
            k.includes("precio") ||
            k.includes("ganancia") ||
            k.includes("gastado") ||
            k.includes("monto") ||
            k.includes("caja") ||
            k.includes("subtotal") ||
            k.includes("ingresos") ||
            k === "total_venta" ||
            k === "total_mes" ||
            k === "total_monto" ||
            k === "total_dinero";

          if (isMoney) {
            valor = `S/. ${parseFloat(valor).toFixed(2)}`;
            html += `<td class="text-right font-mono"><strong>${valor}</strong></td>`;
          }
          // LOGICA DE FECHAS REFINADA (YYYY-MM-DD)
          else if (
            String(k).includes("fecha") ||
            String(k).includes("vencimiento")
          ) {
            const dateObj = new Date(valor);
            if (!isNaN(dateObj.getTime())) {
              valor = dateObj.toISOString().split("T")[0];
            }
            html += `<td>${valor}</td>`;
          } else if (
            typeof valor === "number" ||
            k.includes("stock") ||
            k.includes("cantidad") ||
            k.includes("dias") ||
            k.includes("total") ||
            k === "num_ventas" ||
            k === "total_ventas"
          ) {
            html += `<td class="text-right">${valor}</td>`;
          } else {
            html += `<td>${valor}</td>`;
          }
        });
        html += "</tr>";
      });
      div.innerHTML = html + "</tbody></table></div>";
    } else {
      div.innerHTML = `<div class="alert alert-info">No se encontraron datos para este reporte.</div>`;
    }
  } catch (e) {
    div.innerHTML = `<div class="alert alert-error">Error al cargar reporte: ${e.message}</div>`;
  }
}

// Expose to window
window.cargarReporte = cargarReporte;
