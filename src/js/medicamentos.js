import { API_URL } from "./config.js";
import { showMessageModal, showConfirmModal } from "./modal_utils.js";
import { cerrarModal } from "./utils.js";

let listaMedicamentos = [];

export async function cargarCategorias() {
  try {
    const res = await fetch(`${API_URL}/categorias`);
    const data = await res.json();
    if (data.estado === "exito") {
      const select = document.getElementById("selectCategoria");
      const filtro = document.getElementById("filtroCategoria");
      if (select) {
        select.innerHTML = '<option value="">...</option>';
        data.datos.forEach(
          (cat) =>
            (select.innerHTML += `<option value="${cat.id_categoria}">${cat.nombre}</option>`)
        );
      }
      if (filtro) {
        filtro.innerHTML = '<option value="">Todas las categorías</option>';
        data.datos.forEach(
          (cat) =>
            (filtro.innerHTML += `<option value="${cat.nombre}">${cat.nombre}</option>`)
        );
      }
    }
  } catch (e) {
    console.error(e);
  }
}

export async function cargarProveedores() {
  try {
    const res = await fetch(`${API_URL}/proveedores`);
    const data = await res.json();
    if (data.estado === "exito") {
      const select = document.getElementById("selectProveedor");
      if (select) {
        select.innerHTML = '<option value="">...</option>';
        data.datos.forEach((p) => {
          if (p.estado === "Activo")
            select.innerHTML += `<option value="${p.id_proveedor}">${p.nombre}</option>`;
        });
      }
    }
  } catch (e) {
    console.error(e);
  }
}

export async function registrarMedicamento(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const datos = Object.fromEntries(formData);
  datos.p_stock = parseInt(datos.p_stock);
  datos.p_precio_compra = parseFloat(datos.p_precio_compra);
  datos.p_precio_venta = parseFloat(datos.p_precio_venta);
  datos.p_id_categoria = parseInt(datos.p_id_categoria);
  if (datos.p_id_proveedor)
    datos.p_id_proveedor = parseInt(datos.p_id_proveedor);
  else datos.p_id_proveedor = null;

  const div = document.getElementById("resultadoRegistro");
  div.innerHTML =
    '<div class="loading"><div class="spinner"></div><p>Registrando...</p></div>';

  try {
    const res = await fetch(`${API_URL}/medicamentos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    const data = await res.json();
    if (data.estado === "exito") {
      showMessageModal(
        "Éxito",
        "Medicamento registrado correctamente",
        "success"
      );
      div.innerHTML = ""; // Limpiar loading
      e.target.reset();
      setTimeout(() => cargarMedicamentos(), 1000);
    } else {
      div.innerHTML = "";
      showMessageModal("Error", data.mensaje, "error");
    }
  } catch (e) {
    div.innerHTML = "";
    showMessageModal("Error", `Error de conexión: ${e.message}`, "error");
  }
}

export async function cargarMedicamentos() {
  const div = document.getElementById("listadoMedicamentos");
  div.innerHTML =
    '<div class="loading"><div class="spinner"></div><p>Cargando...</p></div>';
  try {
    const res = await fetch(`${API_URL}/medicamentos`);
    const data = await res.json();
    if (data.estado === "exito") {
      listaMedicamentos = data.datos;
      renderMedicamentos(listaMedicamentos);
    } else {
      div.innerHTML = "<p>No se encontraron medicamentos.</p>";
      showMessageModal("Info", "No hay medicamentos registrados", "info");
    }
  } catch (e) {
    div.innerHTML = "<p>Error al cargar.</p>";
    showMessageModal("Error", `Error: ${e.message}`, "error");
  }
}

export function renderMedicamentos(lista) {
  const div = document.getElementById("listadoMedicamentos");
  if (lista.length === 0) {
    div.innerHTML = "<p>No se encontraron medicamentos.</p>";
    return;
  }
  let html = `<div class="table-container"><table><thead><tr><th>ID</th><th>Nombre</th><th>Categoría</th><th>Stock</th><th>P. Compra</th><th>P. Venta</th><th>Vencimiento</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>`;
  lista.forEach((med) => {
    const badge =
      med.estado === "Activo"
        ? "success"
        : med.estado === "Agotado"
        ? "danger"
        : "secondary";

    let btnEstado = "";
    if (med.estado === "Inactivo") {
      btnEstado = `<button class="btn btn-success" onclick="alternarEstadoMedicamento(${med.id_medicamento}, 'Activo')" title="Reactivar"><i class="fa-solid fa-power-off"></i></button>`;
    } else {
      btnEstado = `<button class="btn btn-danger" onclick="alternarEstadoMedicamento(${med.id_medicamento}, 'Inactivo')" title="Desactivar"><i class="fa-solid fa-ban"></i></button>`;
    }

    html += `<tr>
            <td>${med.id_medicamento}</td>
            <td><strong>${med.medicamento || med.nombre}</strong></td>
            <td>${med.categoria || "-"}</td>
            <td>${med.stock}</td>
            <td>S/. ${med.precio_compra}</td>
            <td>S/. ${med.precio_venta}</td>
            <td>${med.fecha_vencimiento}</td>
            <td><span class="badge badge-${badge}">${med.estado}</span></td>
            <td><div class="btn-group">
                <button class="btn btn-warning" onclick="abrirModalEditarCompleto(${
                  med.id_medicamento
                })" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="btn btn-success" onclick="abrirModalStock(${
                  med.id_medicamento
                }, ${
      med.precio_compra
    })" title="Agregar Stock"><i class="fa-solid fa-box"></i></button>
                ${btnEstado}
            </div></td>
        </tr>`;
  });
  div.innerHTML = html + "</tbody></table></div>";
}

export function filtrarMedicamentos() {
  const texto = document
    .getElementById("txtBuscarMedicamento")
    .value.toLowerCase();
  const cat = document.getElementById("filtroCategoria").value;

  const filtrados = listaMedicamentos.filter((m) => {
    const nombre = (m.medicamento || m.nombre).toLowerCase();
    const categoria = (m.categoria || "").toLowerCase();
    const coincideTexto = nombre.includes(texto);
    const coincideCat = cat === "" || categoria === cat.toLowerCase();
    return coincideTexto && coincideCat;
  });
  renderMedicamentos(filtrados);
}

// --- EDICIÓN COMPLETA ---
export async function abrirModalEditarCompleto(id) {
  const modal = document.getElementById("modalEditar");
  const content = document.getElementById("contenidoModalEditar");
  content.innerHTML =
    '<div class="loading"><div class="spinner"></div><p>Cargando datos...</p></div>';
  modal.style.display = "block";

  try {
    const resMed = await fetch(`${API_URL}/medicamentos/${id}`);
    const dataMed = await resMed.json();
    const resCat = await fetch(`${API_URL}/categorias`);
    const dataCat = await resCat.json();
    const resProv = await fetch(`${API_URL}/proveedores`);
    const dataProv = await resProv.json();

    if (dataMed.estado === "exito") {
      const m = dataMed.datos;
      let optsCat = "";
      dataCat.datos.forEach((c) => {
        optsCat += `<option value="${c.id_categoria}" ${
          c.id_categoria == m.id_categoria ? "selected" : ""
        }>${c.nombre}</option>`;
      });
      let optsProv = '<option value="">Ninguno</option>';
      dataProv.datos.forEach((p) => {
        if (p.estado === "Activo" || p.id_proveedor == m.id_proveedor) {
          optsProv += `<option value="${p.id_proveedor}" ${
            p.id_proveedor == m.id_proveedor ? "selected" : ""
          }>${p.nombre}</option>`;
        }
      });
      content.innerHTML = `
                <form id="formEditarCompleto" onsubmit="guardarEdicionCompleta(event, ${id})">
                    <div class="form-grid">
                        <div class="form-group"><label>Nombre</label><input type="text" name="nombre" value="${
                          m.nombre
                        }" required></div>
                        <div class="form-group"><label>Categoría</label><select name="id_categoria" required>${optsCat}</select></div>
                        <div class="form-group"><label>Proveedor</label><select name="id_proveedor">${optsProv}</select></div>
                        <div class="form-group"><label>Stock</label><input type="number" name="stock" value="${
                          m.stock
                        }" required></div>
                        <div class="form-group"><label>P. Compra</label><input type="number" name="precio_compra" step="0.01" value="${
                          m.precio_compra
                        }" required></div>
                        <div class="form-group"><label>P. Venta</label><input type="number" name="precio_venta" step="0.01" value="${
                          m.precio_venta
                        }" required></div>
                        <div class="form-group"><label>Vencimiento</label><input type="date" name="fecha_vencimiento" value="${
                          m.fecha_vencimiento
                        }" required></div>
                        <div class="form-group"><label>Lote</label><input type="text" name="lote" value="${
                          m.lote
                        }" required></div>
                        <div class="form-group"><label>Ubicación</label><input type="text" name="ubicacion" value="${
                          m.ubicacion || ""
                        }"></div>
                        <div class="form-group" style="grid-column: span 2;"><label>Descripción</label><textarea name="descripcion" rows="2">${
                          m.descripcion || ""
                        }</textarea></div>
                    </div>
                    <div class="btn-group" style="margin-top:20px;">
                        <button type="submit" class="btn btn-success"><i class="fa-solid fa-floppy-disk"></i> Guardar Cambios</button>
                        <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalEditar')">Cancelar</button>
                    </div>
                </form>
                <div id="resultadoEdicion"></div>`;
    }
  } catch (e) {
    content.innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`;
  }
}

export async function guardarEdicionCompleta(e, id) {
  e.preventDefault();
  const div = document.getElementById("resultadoEdicion");
  const formData = new FormData(e.target);
  const datos = Object.fromEntries(formData);
  try {
    const res = await fetch(`${API_URL}/medicamentos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    const data = await res.json();
    if (data.estado === "exito") {
      showMessageModal("Éxito", "Actualizado correctamente", "success");
      setTimeout(() => {
        cerrarModal("modalEditar");
        cargarMedicamentos();
      }, 1500);
    } else showMessageModal("Error", data.mensaje, "error");
  } catch (error) {
    showMessageModal("Error", "Error servidor", "error");
  }
}

export function abrirModalStock(id, precioCompra) {
  document.getElementById("stockIdMedicamento").value = id;
  document.getElementById("stockPrecioCompra").value = precioCompra; // Guardamos precio para calcular
  document.getElementById("txtCantidadStock").value = "1";

  calcularCostoStock();

  document.getElementById("modalStock").style.display = "block";
  document.getElementById("txtCantidadStock").focus();
}

export function calcularCostoStock() {
  const cantidad = document.getElementById("txtCantidadStock").value;
  const precio = document.getElementById("stockPrecioCompra").value;
  const label = document.getElementById("lblCostoStock");

  if (cantidad && cantidad > 0) {
    const total = parseFloat(cantidad) * parseFloat(precio);
    label.innerHTML = `Costo Adicional: S/. ${total.toFixed(2)}`;
  } else {
    label.innerHTML = `Costo Adicional: S/. 0.00`;
  }
}

export async function guardarStock() {
  const id = document.getElementById("stockIdMedicamento").value;
  const cant = document.getElementById("txtCantidadStock").value;

  if (!cant || cant <= 0)
    return showMessageModal(
      "Atención",
      "Ingrese una cantidad válida",
      "warning"
    );

  const btn = document.querySelector("#modalStock .btn-success");
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

  try {
    const res = await fetch(`${API_URL}/medicamentos/${id}/stock`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cantidad_agregada: parseInt(cant) }),
    });
    const data = await res.json();

    if (data.estado === "exito") {
      cerrarModal("modalStock");
      showMessageModal("Éxito", "Stock actualizado correctamente", "success");
      cargarMedicamentos();
    } else {
      showMessageModal("Error", data.mensaje, "error");
    }
  } catch (e) {
    showMessageModal("Error", "Error de conexión: " + e.message, "error");
  } finally {
    btn.innerHTML = originalText;
  }
}

export function alternarEstadoMedicamento(id, nuevoEstado) {
  const accion = nuevoEstado === "Activo" ? "reactivar" : "desactivar";
  showConfirmModal(
    "Confirmar acción",
    `¿Estás seguro de que deseas ${accion} este medicamento?`,
    async () => {
      try {
        const res = await fetch(`${API_URL}/medicamentos/${id}/estado`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado: nuevoEstado }),
        });
        const data = await res.json();
        if (data.estado === "exito") {
          showMessageModal(
            "Éxito",
            "Estado actualizado correctamente",
            "success"
          );
          cargarMedicamentos();
        } else {
          showMessageModal("Error", data.mensaje, "error");
        }
      } catch (e) {
        showMessageModal("Error", "Error de conexión: " + e.message, "error");
      }
    },
    "Sí, cambiar",
    "Cancelar"
  );
}

// Expose functions to window for HTML access
window.registrarMedicamento = registrarMedicamento;
window.cargarMedicamentos = cargarMedicamentos;
window.filtrarMedicamentos = filtrarMedicamentos;
window.abrirModalEditarCompleto = abrirModalEditarCompleto;
window.guardarEdicionCompleta = guardarEdicionCompleta;
window.abrirModalStock = abrirModalStock;
window.calcularCostoStock = calcularCostoStock;
window.guardarStock = guardarStock;
window.alternarEstadoMedicamento = alternarEstadoMedicamento;
window.cerrarModal = cerrarModal;

// Initialization
window.addEventListener("load", () => {
  if (document.getElementById("selectCategoria")) {
    cargarCategorias();
    cargarProveedores();
    cargarMedicamentos();
  }
});
