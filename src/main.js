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
    const modalEditar = document.getElementById('modalEditar');
    const modalStock = document.getElementById('modalStock');
    if (event.target === modalEditar) modalEditar.style.display = 'none';
    if (event.target === modalStock) modalStock.style.display = 'none';
}

// ===== INICIALIZACIÓN INTELIGENTE =====
window.addEventListener('load', () => {
    if(document.getElementById('resumenResultado')) cargarResumen();
    if(document.getElementById('selectCategoria')) {
        cargarCategorias();
        cargarProveedores();
        cargarMedicamentos();
    }
    if(document.getElementById('selectEmpleado')) {
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
            if (select) {
                data.datos.forEach(cat => select.innerHTML += `<option value="${cat.id_categoria}">${cat.nombre}</option>`);
            }
        }
    } catch (e) { console.error(e); }
}

async function cargarProveedores() {
    try {
        const res = await fetch(`${API_URL}/proveedores`);
        const data = await res.json();
        if (data.estado === 'exito') {
            const select = document.getElementById('selectProveedor');
            if (select) {
                data.datos.forEach(p => { if (p.estado === 'Activo') select.innerHTML += `<option value="${p.id_proveedor}">${p.nombre}</option>`; });
            }
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
    else datos.p_id_proveedor = null;

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

                // SE ACTUALIZÓ AQUÍ: Pasamos el precio_compra al botón de stock
                html += `<tr>
                    <td>${med.id_medicamento}</td>
                    <td><strong>${med.medicamento || med.nombre}</strong></td>
                    <td>${med.categoria || '-'}</td>
                    <td>${med.stock}</td>
                    <td>S/. ${med.precio_compra}</td>
                    <td>S/. ${med.precio_venta}</td>
                    <td>${med.fecha_vencimiento}</td>
                    <td><span class="badge badge-${badge}">${med.estado}</span></td>
                    <td><div class="btn-group">
                        <button class="btn btn-warning" onclick="abrirModalEditarCompleto(${med.id_medicamento})"><i class="fa-solid fa-pen-to-square"></i></button>
                        
                        <button class="btn btn-success" onclick="abrirModalStock(${med.id_medicamento}, ${med.precio_compra})"><i class="fa-solid fa-box"></i></button>
                        
                        <button class="btn btn-danger" onclick="eliminarMedicamento(${med.id_medicamento})"><i class="fa-solid fa-trash"></i></button>
                    </div></td>
                </tr>`;
            });
            div.innerHTML = html + '</tbody></table></div>';
        } else mostrarAlerta(div, 'No hay medicamentos', 'info');
    } catch (e) { mostrarAlerta(div, `Error: ${e.message}`, 'error'); }
}

// --- EDICIÓN COMPLETA ---
async function abrirModalEditarCompleto(id) {
    const modal = document.getElementById('modalEditar');
    const content = document.getElementById('contenidoModalEditar');
    content.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando datos...</p></div>';
    modal.style.display = 'block';

    try {
        const resMed = await fetch(`${API_URL}/medicamentos/${id}`);
        const dataMed = await resMed.json();
        const resCat = await fetch(`${API_URL}/categorias`);
        const dataCat = await resCat.json();
        const resProv = await fetch(`${API_URL}/proveedores`);
        const dataProv = await resProv.json();

        if (dataMed.estado === 'exito') {
            const m = dataMed.datos;
            let optsCat = '';
            dataCat.datos.forEach(c => {
                optsCat += `<option value="${c.id_categoria}" ${c.id_categoria == m.id_categoria ? 'selected' : ''}>${c.nombre}</option>`;
            });
            let optsProv = '<option value="">Ninguno</option>';
            dataProv.datos.forEach(p => {
                if (p.estado === 'Activo' || p.id_proveedor == m.id_proveedor) {
                    optsProv += `<option value="${p.id_proveedor}" ${p.id_proveedor == m.id_proveedor ? 'selected' : ''}>${p.nombre}</option>`;
                }
            });
            content.innerHTML = `
                <form id="formEditarCompleto" onsubmit="guardarEdicionCompleta(event, ${id})">
                    <div class="form-grid">
                        <div class="form-group"><label>Nombre</label><input type="text" name="nombre" value="${m.nombre}" required></div>
                        <div class="form-group"><label>Categoría</label><select name="id_categoria" required>${optsCat}</select></div>
                        <div class="form-group"><label>Proveedor</label><select name="id_proveedor">${optsProv}</select></div>
                        <div class="form-group"><label>Stock</label><input type="number" name="stock" value="${m.stock}" required></div>
                        <div class="form-group"><label>P. Compra</label><input type="number" name="precio_compra" step="0.01" value="${m.precio_compra}" required></div>
                        <div class="form-group"><label>P. Venta</label><input type="number" name="precio_venta" step="0.01" value="${m.precio_venta}" required></div>
                        <div class="form-group"><label>Vencimiento</label><input type="date" name="fecha_vencimiento" value="${m.fecha_vencimiento}" required></div>
                        <div class="form-group"><label>Lote</label><input type="text" name="lote" value="${m.lote}" required></div>
                        <div class="form-group"><label>Ubicación</label><input type="text" name="ubicacion" value="${m.ubicacion || ''}"></div>
                        <div class="form-group" style="grid-column: span 2;"><label>Descripción</label><textarea name="descripcion" rows="2">${m.descripcion || ''}</textarea></div>
                    </div>
                    <div class="btn-group" style="margin-top:20px;">
                        <button type="submit" class="btn btn-success"><i class="fa-solid fa-floppy-disk"></i> Guardar Cambios</button>
                        <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalEditar')">Cancelar</button>
                    </div>
                </form>
                <div id="resultadoEdicion"></div>`;
        }
    } catch (e) { content.innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`; }
}

async function guardarEdicionCompleta(e, id) {
    e.preventDefault();
    const div = document.getElementById('resultadoEdicion');
    const formData = new FormData(e.target);
    const datos = Object.fromEntries(formData);
    try {
        const res = await fetch(`${API_URL}/medicamentos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
        const data = await res.json();
        if (data.estado === 'exito') {
            mostrarAlerta(div, 'Actualizado correctamente', 'success');
            setTimeout(() => { cerrarModal('modalEditar'); cargarMedicamentos(); }, 1500);
        } else mostrarAlerta(div, data.mensaje, 'error');
    } catch (error) { mostrarAlerta(div, 'Error servidor', 'error'); }
}

// ===== NUEVA LÓGICA DE STOCK (CON CÁLCULO DE PRECIO) =====

function abrirModalStock(id, precioCompra) {
    document.getElementById('stockIdMedicamento').value = id;
    document.getElementById('stockPrecioCompra').value = precioCompra; // Guardamos precio para calcular
    document.getElementById('txtCantidadStock').value = '1';

    // Inicializar costo en pantalla
    calcularCostoStock();

    document.getElementById('modalStock').style.display = 'block';
    document.getElementById('txtCantidadStock').focus();
}

function calcularCostoStock() {
    const cantidad = document.getElementById('txtCantidadStock').value;
    const precio = document.getElementById('stockPrecioCompra').value;
    const label = document.getElementById('lblCostoStock');

    if (cantidad && cantidad > 0) {
        const total = parseFloat(cantidad) * parseFloat(precio);
        label.innerHTML = `Costo Adicional: S/. ${total.toFixed(2)}`;
    } else {
        label.innerHTML = `Costo Adicional: S/. 0.00`;
    }
}

async function guardarStock() {
    const id = document.getElementById('stockIdMedicamento').value;
    const cant = document.getElementById('txtCantidadStock').value;
    // El precio ya lo ve el usuario en la etiqueta, no necesitamos usarlo para validación extra

    if (!cant || cant <= 0) return alert('Ingrese una cantidad válida');

    // --- CAMBIO: Eliminamos el confirm() para que sea directo ---

    const btn = document.querySelector('#modalStock .btn-success');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';

    try {
        const res = await fetch(`${API_URL}/medicamentos/${id}/stock`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cantidad_agregada: parseInt(cant) })
        });
        const data = await res.json();

        if (data.estado === 'exito') {
            // ÉXITO: Cerramos modal y actualizamos la tabla inmediatamente
            cerrarModal('modalStock');
            cargarMedicamentos();

            // Opcional: Si quieres ver un mensaje discreto en la tabla, podrías usar esto:
            // mostrarAlerta(document.getElementById('listadoMedicamentos'), 'Stock agregado correctamente', 'success');
        } else {
            alert('Error: ' + data.mensaje);
        }
    } catch (e) {
        alert('Error de conexión: ' + e.message);
    } finally {
        btn.innerHTML = originalText;
    }
}

async function eliminarMedicamento(id) {
    if (!confirm('¿Desactivar?')) return;
    try {
        const res = await fetch(`${API_URL}/medicamentos/${id}`, { method: 'DELETE' });
        if ((await res.json()).estado === 'exito') { alert('Desactivado'); cargarMedicamentos(); }
    } catch (e) { alert('Error: ' + e.message); }
}

// ===== VENTAS =====
async function cargarEmpleados() {
    try {
        const res = await fetch(`${API_URL}/empleados`);
        const data = await res.json();
        if (data.estado === 'exito') {
            const select = document.getElementById('selectEmpleado');
            select.innerHTML = '<option value="">Seleccione un empleado...</option>';
            data.datos.forEach(emp => { select.innerHTML += `<option value="${emp.dni}">${emp.nombre} ${emp.apellido_paterno}</option>`; });
        }
    } catch (e) { console.error(e); }
}

async function cargarMedicamentosVenta() {
    try {
        const res = await fetch(`${API_URL}/medicamentos`);
        const data = await res.json();
        if (data.estado === 'exito') { medicamentosDisponibles = data.datos.filter(m => m.estado === 'Activo'); }
    } catch (e) { console.error(e); }
}

function renumerarProductos() {
    const items = document.querySelectorAll('.detalle-item');
    items.forEach((item, index) => {
        const etiqueta = item.querySelector('.detalle-header strong');
        if (etiqueta) etiqueta.textContent = `Prod #${index + 1}`;
    });
}

function agregarDetalle() {
    contadorDetalles++;
    const container = document.getElementById('detallesVenta');
    let opts = '<option value="">Seleccionar...</option>';
    medicamentosDisponibles.forEach(m => opts += `<option value="${m.id_medicamento}" data-precio="${m.precio_venta}" data-stock="${m.stock}">${m.nombre} (Stock: ${m.stock})</option>`);
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
    renumerarProductos();
}

function eliminarDetalle(id) {
    const el = document.getElementById(`detalle_${id}`);
    if(el) el.remove();
    calcularTotal();
    renumerarProductos();
}

function actualizarPrecioDetalle(id) {
    const sel = document.querySelector(`.select-medicamento[data-id="${id}"]`);
    const precio = sel.options[sel.selectedIndex].getAttribute('data-precio') || 0;
    document.querySelector(`.input-precio[data-id="${id}"]`).value = parseFloat(precio).toFixed(2);
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
    const dniCli = document.getElementById('txtDniCliente').value.trim();
    const nomCli = document.getElementById('txtNombreCliente').value.trim();
    const apePat = document.getElementById('txtApePaterno').value.trim();
    const apeMat = document.getElementById('txtApeMaterno').value.trim();
    const dniEmp = document.getElementById('selectEmpleado').value;
    if (!dniCli || !nomCli || !apePat || !dniEmp) return alert('Datos incompletos');
    if (dniCli.length !== 8) return alert('DNI debe ser 8 dígitos');
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
    if (!valido || detalles.length === 0) return alert('Productos inválidos');
    const datosVenta = { cliente: { dni: dniCli, nombre: nomCli, apellido_paterno: apePat, apellido_materno: apeMat }, dni_empleado: dniEmp, total_venta: parseFloat(document.getElementById('totalVenta').textContent), detalles: detalles };
    try {
        const res = await fetch(`${API_URL}/ventas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datosVenta) });
        const data = await res.json();
        if (data.estado === 'exito') {
            mostrarAlerta(document.getElementById('resultadoVenta'), 'Venta registrada', 'success');
            setTimeout(() => { limpiarFormularioVenta(); cargarVentas(); }, 2000);
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
            let html = `<div style="background:#f1f8e9;padding:20px;border-radius:10px;margin-bottom:20px;border:1px solid #c5e1a5;">
                <h3 style="color:#2e7d32;">Venta #${v.id_venta}</h3><p>Cliente: ${v.cliente}</p><p>Total: <strong style="color:#0277bd; font-size:1.2em;">S/. ${v.total_venta}</strong></p></div>
            <div class="table-container"><table><thead><tr><th>Medicamento</th><th>Cant</th><th>P. Unit</th><th>Subtotal</th></tr></thead><tbody>`;
            v.detalles.forEach(d => html += `<tr><td>${d.medicamento}</td><td>${d.cantidad}</td><td>${d.precio_unitario_venta}</td><td>${d.subtotal}</td></tr>`);
            cont.innerHTML = html + '</tbody></table></div><button class="btn" onclick="cerrarModal(\'modalEditar\')">Cerrar</button>';
        }
    } catch (e) { alert(e.message); }
}

// ===== REPORTES MEJORADOS & ARREGLADOS =====

const diccionariosReporte = {
    // Campos básicos
    'nombre': 'Producto / Nombre',
    'stock': 'Stock Actual',
    'precio_venta': 'Precio Venta',
    'total_venta': 'Total Vendido',
    'id_venta': 'Nro. Venta',
    'fecha_vencimiento': 'Vencimiento',
    'contacto_telefono': 'Teléfono',
    'lote': 'Lote',
    'estado': 'Estado',
    'cantidad': 'Cant.',

    // REPORTE INVENTARIO
    'producto': 'Producto',
    'stock_actual': 'Stock',
    'costo_unitario': 'Costo Unit.',
    'valor_inversion_total': 'Valor Total (Inversión)',

    // REPORTE CLIENTES
    'frecuencia_compras': 'Veces que compró', // ¡Arreglado!
    'gastado_total': 'Total Gastado',

    // REPORTE EMPLEADOS
    'ticket_promedio': 'Promedio x Venta', // Nombre cambiado
    'ventas_realizadas': 'Nro. Ventas',
    'dinero_recaudado': 'Total Recaudado',

    // OTROS
    'ingresos_totales': 'Ingresos (Ventas)',
    'costo_estimado': 'Costo Mercadería',
    'ganancia_bruta': 'Ganancia Neta',
    'productos_vendidos': 'Prod. Vendidos',
    'num_transacciones': 'Cant. Ventas (Tickets)',
    'total_generado': 'Dinero Generado',
    'unidades_vendidas': 'Unidades Vendidas',
    'compras_totales': 'Veces que compró',
    'dias_restantes': 'Días p/ Vencer',
    'mes': 'Periodo',
    'vence': 'Fecha Vencimiento',
    'cliente': 'Nombre Cliente',
    'empleado': 'Nombre Empleado',
    'categoria': 'Categoría',
    'precio_promedio': 'Precio Promedio'
};

async function cargarReporte(endpoint, titulo, params = '') {
    const div = document.getElementById('resultadosReportes');
    div.innerHTML = `<div class="loading"><div class="spinner"></div><p>Generando reporte de ${titulo}...</p></div>`;

    try {
        const res = await fetch(`${API_URL}/reportes/${endpoint}${params}`);
        const data = await res.json();

        if (data.estado === 'exito' && data.datos.length > 0) {
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

            // GENERACIÓN DE ENCABEZADOS CON ALINEACIÓN INTELIGENTE
            claves.forEach(k => {
                let label = diccionariosReporte[k] || k.replace(/_/g,' ').toUpperCase();

                if(label.includes('SUM(')) label = 'Total';
                if(label.includes('COUNT(')) label = 'Cantidad';
                if(label.includes('AVG(')) label = 'Promedio';

                // Detectar si es columna numérica/dinero para alinear a la derecha
                // INCLUYE 'promedio' para que el ticket promedio se alinee bien
                let alineacion = '';
                if (String(k).includes('precio') || String(k).includes('total') || String(k).includes('ingresos') || String(k).includes('subtotal') || String(k).includes('promedio')) {
                    alineacion = 'class="text-right"';
                }

                html += `<th ${alineacion}>${label}</th>`;
            });

            html += `</tr></thead><tbody>`;

            // Generar filas
            data.datos.forEach(r => {
                html += '<tr>';
                claves.forEach(k => {
                    let valor = r[k];

                    if(valor === null) valor = '-';

                    // LOGICA DE DINERO:
                    // Incluimos 'promedio' para que el ticket salga con S/.
                    else if (String(k).includes('precio') || String(k).includes('total') || String(k).includes('ingresos') || String(k).includes('subtotal') || String(k).includes('promedio')) {
                        valor = `S/. ${parseFloat(valor).toFixed(2)}`;
                        html += `<td class="text-right font-mono"><strong>${valor}</strong></td>`;
                    }
                    else if (String(k).includes('fecha')) {
                        valor = String(valor).split('T')[0];
                        html += `<td>${valor}</td>`;
                    }
                    else {
                        html += `<td>${valor}</td>`;
                    }
                });
                html += '</tr>';
            });

            html += '</tbody></table></div>';

            html += `<div style="text-align:right; margin-top:10px;">
                        <button class="btn btn-secondary" onclick="window.print()"><i class="fa-solid fa-print"></i> Imprimir Reporte</button>
                     </div>`;

            div.innerHTML = html;
        } else {
            mostrarAlerta(div, 'No se encontraron datos para este reporte.', 'info');
        }
    } catch (e) {
        mostrarAlerta(div, `Error al cargar reporte: ${e.message}`, 'error');
    }
}