import { API_URL } from "./config.js";
import { showMessageModal } from "./modal_utils.js";
import { cerrarModal } from "./utils.js";

let medicamentosDisponibles = [];
let listaVentas = [];
let contadorDetalles = 0;

export async function cargarEmpleados() {
  try {
    const res = await fetch(`${API_URL}/empleados`);
    const data = await res.json();
    if (data.estado === "exito") {
      const select = document.getElementById("selectEmpleado");
      select.innerHTML = '<option value="">Seleccione un empleado...</option>';
      data.datos.forEach((emp) => {
        select.innerHTML += `<option value="${emp.dni}">${emp.nombre} ${emp.apellido_paterno}</option>`;
      });
    }
  } catch (e) {
    console.error(e);
  }
}

export async function cargarMedicamentosVenta() {
  try {
    const res = await fetch(`${API_URL}/medicamentos`);
    const data = await res.json();
    if (data.estado === "exito") {
      medicamentosDisponibles = data.datos.filter((m) => m.estado === "Activo");
    }
  } catch (e) {
    console.error(e);
  }
}

export function renumerarProductos() {
  const items = document.querySelectorAll(".detalle-item");
  items.forEach((item, index) => {
    const etiqueta = item.querySelector(".detalle-header strong");
    if (etiqueta) etiqueta.textContent = `Prod #${index + 1}`;
  });
}

export function agregarDetalle() {
  contadorDetalles++;
  const container = document.getElementById("detallesVenta");
  let opts = '<option value="">Seleccionar...</option>';
  medicamentosDisponibles.forEach(
    (m) =>
      (opts += `<option value="${m.id_medicamento}" data-precio="${m.precio_venta}" data-stock="${m.stock}">${m.nombre} (Stock: ${m.stock})</option>`)
  );
  container.insertAdjacentHTML(
    "beforeend",
    `
        <div class="detalle-item" id="detalle_${contadorDetalles}">
            <div class="detalle-header"><strong>Prod #${contadorDetalles}</strong><button type="button" class="btn btn-danger" onclick="eliminarDetalle(${contadorDetalles})"><i class="fa-solid fa-trash"></i></button></div>
            <div class="form-grid">
                <div class="form-group"><label>Medicamento</label><select class="select-medicamento" data-id="${contadorDetalles}" onchange="actualizarPrecioDetalle(${contadorDetalles})">${opts}</select></div>
                <div class="form-group"><label>Cantidad</label><input type="number" class="input-cantidad" data-id="${contadorDetalles}" min="1" value="1" onchange="calcularTotal()"></div>
                <div class="form-group"><label>Precio</label><input type="number" class="input-precio" data-id="${contadorDetalles}" readonly></div>
                <div class="form-group"><label>Subtotal</label><input type="text" class="input-subtotal" data-id="${contadorDetalles}" readonly></div>
            </div>
        </div>`
  );
  renumerarProductos();
}

export function eliminarDetalle(id) {
  const el = document.getElementById(`detalle_${id}`);
  if (el) el.remove();
  calcularTotal();
  renumerarProductos();
}

export function actualizarPrecioDetalle(id) {
  const sel = document.querySelector(`.select-medicamento[data-id="${id}"]`);
  const precio =
    sel.options[sel.selectedIndex].getAttribute("data-precio") || 0;
  document.querySelector(`.input-precio[data-id="${id}"]`).value =
    parseFloat(precio).toFixed(2);
  calcularTotal();
}

export function calcularTotal() {
  let total = 0;
  document.querySelectorAll(".detalle-item").forEach((d) => {
    const id = d.id.split("_")[1];
    const cant = document.querySelector(
      `.input-cantidad[data-id="${id}"]`
    ).value;
    const prec = document.querySelector(`.input-precio[data-id="${id}"]`).value;
    const sub = cant * prec;
    document.querySelector(
      `.input-subtotal[data-id="${id}"]`
    ).value = `S/. ${sub.toFixed(2)}`;
    total += sub;
  });
  document.getElementById("totalVenta").textContent = total.toFixed(2);
}

export async function procesarVenta() {
  const dniCli = document.getElementById("txtDniCliente").value.trim();
  const nomCli = document.getElementById("txtNombreCliente").value.trim();
  const apePat = document.getElementById("txtApePaterno").value.trim();
  const apeMat = document.getElementById("txtApeMaterno").value.trim();
  const dniEmp = document.getElementById("selectEmpleado").value;
  if (!dniCli || !nomCli || !apePat || !dniEmp)
    return showMessageModal(
      "Atención",
      "Por favor complete todos los datos",
      "warning"
    );
  if (dniCli.length !== 8)
    return showMessageModal(
      "Atención",
      "El DNI debe tener 8 dígitos",
      "warning"
    );
  const detalles = [];
  let valido = true;
  document.querySelectorAll(".detalle-item").forEach((d) => {
    const id = d.id.split("_")[1];
    const medId = document.querySelector(
      `.select-medicamento[data-id="${id}"]`
    ).value;
    const cant = parseInt(
      document.querySelector(`.input-cantidad[data-id="${id}"]`).value
    );
    const prec = parseFloat(
      document.querySelector(`.input-precio[data-id="${id}"]`).value
    );
    if (!medId || !cant) valido = false;
    detalles.push({
      id_medicamento: parseInt(medId),
      cantidad: cant,
      precio_unitario_venta: prec,
    });
  });
  if (!valido || detalles.length === 0)
    return showMessageModal(
      "Atención",
      "Debe agregar productos válidos a la venta",
      "warning"
    );
  const datosVenta = {
    cliente: {
      dni: dniCli,
      nombre: nomCli,
      apellido_paterno: apePat,
      apellido_materno: apeMat,
    },
    dni_empleado: dniEmp,
    total_venta: parseFloat(document.getElementById("totalVenta").textContent),
    detalles: detalles,
  };
  try {
    const res = await fetch(`${API_URL}/ventas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datosVenta),
    });
    const data = await res.json();
    if (data.estado === "exito") {
      showMessageModal("Éxito", "Venta registrada correctamente", "success");
      setTimeout(() => {
        limpiarFormularioVenta();
        cargarVentas();
      }, 2000);
    } else showMessageModal("Error", data.mensaje, "error");
  } catch (e) {
    showMessageModal("Error", e.message, "error");
  }
}

export function limpiarFormularioVenta() {
  document.getElementById("formVenta").reset();
  document.getElementById("detallesVenta").innerHTML = "";
  document.getElementById("totalVenta").textContent = "0.00";
  contadorDetalles = 0;
}

export async function cargarVentas() {
  const div = document.getElementById("historialVentas");
  div.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const res = await fetch(`${API_URL}/ventas`);
    const data = await res.json();
    if (data.estado === "exito") {
      listaVentas = data.datos;
      renderVentas(listaVentas);
    }
  } catch (e) {
    console.error(e);
  }
}

export function renderVentas(lista) {
  const div = document.getElementById("historialVentas");
  if (lista.length === 0) {
    div.innerHTML = "<p>No se encontraron ventas.</p>";
    return;
  }
  let html = `<div class="table-container"><table><thead><tr><th>ID</th><th>Fecha</th><th>Cliente</th><th>Empleado</th><th>Total</th><th>Acciones</th></tr></thead><tbody>`;
  lista.forEach((v) => {
    html += `<tr><td>#${v.id_venta}</td><td>${new Date(
      v.fecha_venta
    ).toLocaleString()}</td><td>${v.cliente}</td><td>${
      v.empleado
    }</td><td>S/. ${
      v.total_venta
    }</td><td><button class="btn btn-success" onclick="verDetalleVenta(${
      v.id_venta
    })"><i class="fa-solid fa-eye"></i></button></td></tr>`;
  });
  div.innerHTML = html + "</tbody></table></div>";
}

export function filtrarVentas() {
  const texto = document.getElementById("txtBuscarVenta").value.toLowerCase();
  const filtrados = listaVentas.filter((v) => {
    const cliente = (v.cliente || "").toLowerCase();
    const empleado = (v.empleado || "").toLowerCase();
    const id = String(v.id_venta);
    return (
      cliente.includes(texto) || empleado.includes(texto) || id.includes(texto)
    );
  });
  renderVentas(filtrados);
}

export async function verDetalleVenta(id) {
  const modal = document.getElementById("modalEditar");
  const cont = document.getElementById("contenidoModalEditar");
  modal.style.display = "block";
  cont.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const res = await fetch(`${API_URL}/ventas/${id}`);
    const data = await res.json();
    if (data.estado === "exito") {
      const v = data.datos;
      let html = `<div style="background:#f1f8e9;padding:20px;border-radius:10px;margin-bottom:20px;border:1px solid #c5e1a5;">
                <h3 style="color:#2e7d32;">Venta #${v.id_venta}</h3><p>Cliente: ${v.cliente}</p><p>Total: <strong style="color:#0277bd; font-size:1.2em;">S/. ${v.total_venta}</strong></p></div>
            <div class="table-container"><table><thead><tr><th>Medicamento</th><th>Cant</th><th>P. Unit</th><th>Subtotal</th></tr></thead><tbody>`;
      v.detalles.forEach(
        (d) =>
          (html += `<tr><td>${d.medicamento}</td><td>${d.cantidad}</td><td>${d.precio_unitario_venta}</td><td>${d.subtotal}</td></tr>`)
      );
      cont.innerHTML =
        html +
        '</tbody></table></div><button class="btn" onclick="cerrarModal(\'modalEditar\')">Cerrar</button>';
    }
  } catch (e) {
    showMessageModal("Error", e.message, "error");
  }
}

// Expose functions to window
window.agregarDetalle = agregarDetalle;
window.eliminarDetalle = eliminarDetalle;
window.actualizarPrecioDetalle = actualizarPrecioDetalle;
window.calcularTotal = calcularTotal;
window.procesarVenta = procesarVenta;
window.limpiarFormularioVenta = limpiarFormularioVenta;
window.cargarVentas = cargarVentas;
window.filtrarVentas = filtrarVentas;
window.verDetalleVenta = verDetalleVenta;
window.cerrarModal = cerrarModal;

// Initialization
window.addEventListener("load", () => {
  if (document.getElementById("selectEmpleado")) {
    cargarEmpleados();
    cargarMedicamentosVenta();
    cargarVentas();
  }
});
