const API_URL = 'http://localhost:8080/api';
let medicamentosDisponibles = [];
let contadorDetalles = 0;

// ===== UTILIDADES =====
function mostrarAlerta(elemento, mensaje, tipo) {
    let icon = '';
    if (tipo === 'success') icon = '<i class="fa-solid fa-check-circle"></i> ';
    if (tipo === 'error') icon = '<i class="fa-solid fa-circle-exclamation"></i> ';
    if (tipo === 'info') icon = '<i class="fa-solid fa-circle-info"></i> ';

    const claseAlerta = tipo === 'success' ? 'alert-success' :
                       tipo === 'error' ? 'alert-error' : 'alert-info';

    elemento.innerHTML = `<div class="alert ${claseAlerta}">${icon}${mensaje}</div>`;
}

function cerrarModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.getElementById('modalEditar');
    if (event.target === modal) modal.style.display = 'none';
}

// ===== INICIALIZACIÓN INTELIGENTE =====
window.addEventListener('load', () => {
    if(document.getElementById('resumenResultado')) cargarResumen();

    if(document.getElementById('selectCategoria')) {
        cargarCategorias();
        cargarProveedores();
        cargarMedicamentos();
    }

    if(document.getElementById('selectCliente')) {
        cargarClientes();
        cargarEmpleados();
        cargarMedicamentosVenta();
        cargarVentas();
    }
});

// ===== DASHBOARD =====
async function cargarResumen() {
    const div = document.getElementById('resumenResultado');
    div.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando...</p></div>';
    try {
        const res = await fetch(`${API_URL}/reportes/resumen-general`);
        const data = await res.json();
        if (data.estado === 'exito') {
            const d = data.datos;
            div.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card"><h3>${d.medicamentos_activos}</h3><p>Medicamentos Activos</p></div>
                    <div class="stat-card"><h3>${d.medicamentos_bajo_stock}</h3><p>Bajo Stock (&lt;10)</p></div>
                    <div class="stat-card"><h3>${d.ventas_mes_actual}</h3><p>Ventas este Mes</p></div>
                    <div class="stat-card"><h3>S/. ${d.ingresos_mes_actual.toFixed(2)}</h3><p>Ingresos del Mes</p></div>
                    <div class="stat-card"><h3>${d.total_clientes}</h3><p>Total Clientes</p></div>
                    <div class="stat-card"><h3>${d.medicamentos_proximos_vencer}</h3><p>Por Vencer (30 días)</p></div>
                </div>`;
        } else mostrarAlerta(div, data.mensaje, 'error');
    } catch (e) { mostrarAlerta(div, `Error: ${e.message}`, 'error'); }
}

// ===== MEDICAMENTOS =====
async function cargarCategorias() {
    try {
        const res = await fetch(`${API_URL}/categorias`);
        const data = await res.json();
        if (data.estado === 'exito') {
            const select = document.getElementById('selectCategoria');
            data.datos.forEach(cat => select.innerHTML += `<option value="${cat.id_categoria}">${cat.nombre}</option>`);
        }
    } catch (e) { console.error(e); }
}

async function cargarProveedores() {
    try {
        const res = await fetch(`${API_URL}/proveedores`);
        const data = await res.json();
        if (data.estado === 'exito') {
            const select = document.getElementById('selectProveedor');
            data.datos.forEach(p => { if (p.estado === 'Activo') select.innerHTML += `<option value="${p.id_proveedor}">${p.nombre}</option>`; });
        }
    } catch (e) { console.error(e); }
}

async function registrarMedicamento(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const datos = Object.fromEntries(formData);
    datos.p_stock = parseInt(datos.p_stock);
    datos.p_precio_compra = parseFloat(datos.p_precio_compra);
    datos.p_precio_venta = parseFloat(datos.p_precio_venta);
    datos.p_id_categoria = parseInt(datos.p_id_categoria);
    if (datos.p_id_proveedor) datos.p_id_proveedor = parseInt(datos.p_id_proveedor);

    const div = document.getElementById('resultadoRegistro');
    div.innerHTML = '<div class="loading"><div class="spinner"></div><p>Registrando...</p></div>';

    try {
        const res = await fetch(`${API_URL}/medicamentos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
        const data = await res.json();
        if (data.estado === 'exito') {
            mostrarAlerta(div, 'Medicamento registrado', 'success');
            e.target.reset();
            setTimeout(() => cargarMedicamentos(), 1000);
        } else mostrarAlerta(div, data.mensaje, 'error');
    } catch (e) { mostrarAlerta(div, `Error: ${e.message}`, 'error'); }
}

async function cargarMedicamentos() {
    const div = document.getElementById('listadoMedicamentos');
    div.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando...</p></div>';
    try {
        const res = await fetch(`${API_URL}/medicamentos`);
        const data = await res.json();
        if (data.estado === 'exito' && data.datos.length > 0) {
            let html = `<div class="table-container"><table><thead><tr><th>ID</th><th>Nombre</th><th>Categoría</th><th>Stock</th><th>P. Compra</th><th>P. Venta</th><th>Vencimiento</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>`;
            data.datos.forEach(med => {
                const badge = med.estado === 'Activo' ? 'success' : med.estado === 'Agotado' ? 'danger' : 'secondary';
                html += `<tr><td>${med.id_medicamento}</td><td><strong>${med.medicamento || med.nombre}</strong></td><td>${med.categoria || '-'}</td><td>${med.stock}</td><td>S/. ${med.precio_compra}</td><td>S/. ${med.precio_venta}</td><td>${med.fecha_vencimiento}</td><td><span class="badge badge-${badge}">${med.estado}</span></td>
                <td><div class="btn-group">
                    <button class="btn btn-warning" onclick="editarPrecio(${med.id_medicamento})"><i class="fa-solid fa-tag"></i></button>
                    <button class="btn btn-success" onclick="actualizarStock(${med.id_medicamento})"><i class="fa-solid fa-box"></i></button>
                    <button class="btn btn-danger" onclick="eliminarMedicamento(${med.id_medicamento})"><i class="fa-solid fa-trash"></i></button>
                </div></td></tr>`;
            });
            div.innerHTML = html + '</tbody></table></div>';
        } else mostrarAlerta(div, 'No hay medicamentos', 'info');
    } catch (e) { mostrarAlerta(div, `Error: ${e.message}`, 'error'); }
}

async function editarPrecio(id) {
    const modal = document.getElementById('modalEditar');
    document.getElementById('contenidoModalEditar').innerHTML = `
        <form id="formEditarPrecio">
            <div class="form-group"><label>Nuevo Precio Compra</label><input type="number" id="nuevoPrecioCompra" step="0.01" required></div>
            <div class="form-group"><label>Nuevo Precio Venta</label><input type="number" id="nuevoPrecioVenta" step="0.01" required></div>
            <div class="btn-group">
                <button type="button" class="btn btn-success" onclick="guardarPrecio(${id})"><i class="fa-solid fa-floppy-disk"></i> Guardar</button>
                <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalEditar')"><i class="fa-solid fa-xmark"></i> Cancelar</button>
            </div>
        </form><div id="resultadoEditarPrecio"></div>`;
    modal.style.display = 'block';
}

async function guardarPrecio(id) {
    const compra = parseFloat(document.getElementById('nuevoPrecioCompra').value);
    const venta = parseFloat(document.getElementById('nuevoPrecioVenta').value);
    const div = document.getElementById('resultadoEditarPrecio');
    try {
        const res = await fetch(`${API_URL}/medicamentos/${id}/precio`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nuevo_precio_compra: compra, nuevo_precio_venta: venta }) });
        const data = await res.json();
        if (data.estado === 'exito') { mostrarAlerta(div, 'Precio actualizado', 'success'); setTimeout(() => { cerrarModal('modalEditar'); cargarMedicamentos(); }, 1500); }
        else mostrarAlerta(div, data.mensaje, 'error');
    } catch (e) { mostrarAlerta(div, `Error: ${e.message}`, 'error'); }
}

async function actualizarStock(id) {
    const cant = prompt('Unidades a agregar:');
    if (!cant) return;
    try {
        const res = await fetch(`${API_URL}/medicamentos/${id}/stock`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cantidad_agregada: parseInt(cant) }) });
        if ((await res.json()).estado === 'exito') { alert('Stock actualizado'); cargarMedicamentos(); }
    } catch (e) { alert('Error: ' + e.message); }
}

async function eliminarMedicamento(id) {
    if (!confirm('¿Desactivar medicamento?')) return;
    try {
        const res = await fetch(`${API_URL}/medicamentos/${id}`, { method: 'DELETE' });
        if ((await res.json()).estado === 'exito') { alert('Desactivado'); cargarMedicamentos(); }
    } catch (e) { alert('Error: ' + e.message); }
}

// ===== VENTAS =====
async function cargarClientes() {
    try {
        const res = await fetch(`${API_URL}/reportes/ventas-por-cliente`);
        const data = await res.json();
        if (data.estado === 'exito') {
            const select = document.getElementById('selectCliente');
            select.innerHTML = '<option value="1">Ana Gomez</option><option value="2">Luis Torres</option>';
        }
    } catch (e) { console.error(e); }
}

async function cargarEmpleados() {
    try {
        const res = await fetch(`${API_URL}/reportes/ventas-por-empleado`);
        const data = await res.json();
        if (data.estado === 'exito') {
            const select = document.getElementById('selectEmpleado');
            select.innerHTML = '<option value="1">Walter White</option><option value="2">Jesse Pinkman</option>';
        }
    } catch (e) { console.error(e); }
}

async function cargarMedicamentosVenta() {
    try {
        const res = await fetch(`${API_URL}/medicamentos`);
        const data = await res.json();
        if (data.estado === 'exito') medicamentosDisponibles = data.datos.filter(m => m.estado === 'Activo' && m.stock > 0);
    } catch (e) { console.error(e); }
}

function agregarDetalle() {
    contadorDetalles++;
    const container = document.getElementById('detallesVenta');
    let opts = '<option value="">Seleccionar...</option>';
    medicamentosDisponibles.forEach(m => opts += `<option value="${m.id_medicamento}" data-precio="${m.precio_venta}" data-stock="${m.stock}">${m.medicamento || m.nombre} (Stock: ${m.stock})</option>`);

    container.insertAdjacentHTML('beforeend', `
        <div class="detalle-item" id="detalle_${contadorDetalles}">
            <div class="detalle-header"><strong>Prod #${contadorDetalles}</strong><button type="button" class="btn btn-danger" onclick="eliminarDetalle(${contadorDetalles})"><i class="fa-solid fa-trash"></i></button></div>
            <div class="form-grid">
                <div class="form-group"><label>Medicamento</label><select class="select-medicamento" data-id="${contadorDetalles}" onchange="actualizarPrecioDetalle(${contadorDetalles})">${opts}</select></div>
                <div class="form-group"><label>Cantidad</label><input type="number" class="input-cantidad" data-id="${contadorDetalles}" min="1" value="1" onchange="calcularTotal()"></div>
                <div class="form-group"><label>Precio</label><input type="number" class="input-precio" data-id="${contadorDetalles}" readonly></div>
                <div class="form-group"><label>Subtotal</label><input type="text" class="input-subtotal" data-id="${contadorDetalles}" readonly></div>
            </div>
        </div>`);
}

function eliminarDetalle(id) { document.getElementById(`detalle_${id}`).remove(); calcularTotal(); }
function actualizarPrecioDetalle(id) {
    const sel = document.querySelector(`.select-medicamento[data-id="${id}"]`);
    document.querySelector(`.input-precio[data-id="${id}"]`).value = sel.options[sel.selectedIndex].getAttribute('data-precio') || 0;
    calcularTotal();
}

function calcularTotal() {
    let total = 0;
    document.querySelectorAll('.detalle-item').forEach(d => {
        const id = d.id.split('_')[1];
        const cant = document.querySelector(`.input-cantidad[data-id="${id}"]`).value;
        const prec = document.querySelector(`.input-precio[data-id="${id}"]`).value;
        const sub = cant * prec;
        document.querySelector(`.input-subtotal[data-id="${id}"]`).value = `S/. ${sub.toFixed(2)}`;
        total += sub;
    });
    document.getElementById('totalVenta').textContent = total.toFixed(2);
}

async function procesarVenta() {
    const idC = document.getElementById('selectCliente').value;
    const idE = document.getElementById('selectEmpleado').value;
    if (!idC || !idE) return alert('Seleccione cliente y empleado');

    const detalles = [];
    let valido = true;
    document.querySelectorAll('.detalle-item').forEach(d => {
        const id = d.id.split('_')[1];
        const medId = document.querySelector(`.select-medicamento[data-id="${id}"]`).value;
        const cant = parseInt(document.querySelector(`.input-cantidad[data-id="${id}"]`).value);
        const prec = parseFloat(document.querySelector(`.input-precio[data-id="${id}"]`).value);
        if(!medId || !cant) valido = false;
        detalles.push({ id_medicamento: parseInt(medId), cantidad: cant, precio_unitario_venta: prec });
    });

    if (!valido || detalles.length === 0) return alert('Agregue productos válidos');

    try {
        const res = await fetch(`${API_URL}/ventas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_cliente: parseInt(idC), id_empleado: parseInt(idE), total_venta: parseFloat(document.getElementById('totalVenta').textContent), detalles: detalles }) });
        const data = await res.json();
        if (data.estado === 'exito') {
            mostrarAlerta(document.getElementById('resultadoVenta'), 'Venta registrada', 'success');
            setTimeout(() => { document.getElementById('formVenta').reset(); document.getElementById('detallesVenta').innerHTML=''; cargarVentas(); }, 2000);
        } else mostrarAlerta(document.getElementById('resultadoVenta'), data.mensaje, 'error');
    } catch (e) { alert(e.message); }
}

function limpiarFormularioVenta() {
    document.getElementById('formVenta').reset();
    document.getElementById('detallesVenta').innerHTML = '';
    document.getElementById('totalVenta').textContent = '0.00';
    contadorDetalles = 0;
}

async function cargarVentas() {
    const div = document.getElementById('historialVentas');
    div.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
        const res = await fetch(`${API_URL}/ventas`);
        const data = await res.json();
        if (data.estado === 'exito' && data.datos.length > 0) {
            let html = `<div class="table-container"><table><thead><tr><th>ID</th><th>Fecha</th><th>Cliente</th><th>Empleado</th><th>Total</th><th>Acciones</th></tr></thead><tbody>`;
            data.datos.forEach(v => {
                html += `<tr><td>#${v.id_venta}</td><td>${new Date(v.fecha_venta).toLocaleString()}</td><td>${v.cliente}</td><td>${v.empleado}</td><td>S/. ${v.total_venta}</td><td><button class="btn btn-success" onclick="verDetalleVenta(${v.id_venta})"><i class="fa-solid fa-eye"></i></button></td></tr>`;
            });
            div.innerHTML = html + '</tbody></table></div>';
        }
    } catch (e) { console.error(e); }
}

async function verDetalleVenta(id) {
    const modal = document.getElementById('modalEditar');
    const cont = document.getElementById('contenidoModalEditar');
    modal.style.display = 'block';
    cont.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    try {
        const res = await fetch(`${API_URL}/ventas/${id}`);
        const data = await res.json();
        if (data.estado === 'exito') {
            const v = data.datos;
            let html = `<div style="background:#f8f9fa;padding:20px;border-radius:10px;margin-bottom:20px;"><h3>Venta #${v.id_venta}</h3><p>Cliente: ${v.cliente}</p><p>Total: <strong>S/. ${v.total_venta}</strong></p></div>
            <div class="table-container"><table><thead><tr><th>Medicamento</th><th>Cant</th><th>P. Unit</th><th>Subtotal</th></tr></thead><tbody>`;
            v.detalles.forEach(d => html += `<tr><td>${d.medicamento}</td><td>${d.cantidad}</td><td>${d.precio_unitario_venta}</td><td>${d.subtotal}</td></tr>`);
            cont.innerHTML = html + '</tbody></table></div><button class="btn" onclick="cerrarModal(\'modalEditar\')">Cerrar</button>';
        }
    } catch (e) { alert(e.message); }
}

// ===== REPORTES =====
async function cargarReporte(endpoint, titulo, params = '') {
    const div = document.getElementById('resultadosReportes');
    div.innerHTML = `<div class="loading"><div class="spinner"></div><p>${titulo}...</p></div>`;
    try {
        const res = await fetch(`${API_URL}/reportes/${endpoint}${params}`);
        const data = await res.json();
        if (data.estado === 'exito' && data.datos.length > 0) {
            let html = `<div class="table-container"><table><thead><tr>`;
            Object.keys(data.datos[0]).forEach(k => html += `<th>${k.replace(/_/g,' ').toUpperCase()}</th>`);
            html += '</tr></thead><tbody>';
            data.datos.forEach(r => {
                html += '<tr>';
                Object.values(r).forEach(v => html += `<td>${v}</td>`);
                html += '</tr>';
            });
            div.innerHTML = html + '</tbody></table></div>';
        } else mostrarAlerta(div, 'No hay datos', 'info');
    } catch (e) { mostrarAlerta(div, `Error: ${e.message}`, 'error'); }
}