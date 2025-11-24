from flask import Blueprint, jsonify, request
from src.db import get_db_connection
import oracledb
from datetime import date

reportes_bp = Blueprint('reportes', __name__, url_prefix='/api/reportes')


# Función genérica para llamar procedimientos que devuelven un cursor
def ejecutar_reporte(proc_name, params=[]):
    connection = get_db_connection()
    if not connection: return jsonify({"estado": "error", "mensaje": "Sin conexión"}), 503
    try:
        cursor = connection.cursor()
        # Variable de salida para el cursor de Oracle
        out_cursor = connection.cursor()

        # Llamada al procedimiento almacenado
        cursor.callproc(proc_name, params + [out_cursor])

        # Procesar resultados
        columnas = [col[0].lower() for col in out_cursor.description]
        resultados = [dict(zip(columnas, row)) for row in out_cursor]

        return jsonify({"estado": "exito", "datos": resultados}), 200
    except oracledb.Error as e:
        return jsonify({"estado": "error", "mensaje": str(e)}), 500


# --- ENDPOINTS QUE LLAMAN A LA BD ---

@reportes_bp.route('/medicamentos-por-categoria')
def r1():
    return ejecutar_reporte("pkg_reportes_farmacia.p_reporte_medicamentos_por_categoria")


@reportes_bp.route('/rentabilidad-productos')
def r_rentabilidad():
    return ejecutar_reporte("pkg_reportes_farmacia.p_reporte_rentabilidad_productos")


@reportes_bp.route('/auditoria-cambios')
def r_auditoria():
    return ejecutar_reporte("pkg_reportes_farmacia.p_reporte_auditoria_cambios")


@reportes_bp.route('/medicamentos-inactivos')
def r_inactivos():
    return ejecutar_reporte("pkg_reportes_farmacia.p_reporte_medicamentos_inactivos")


@reportes_bp.route('/proximos-vencer')
def r2():
    dias = request.args.get('dias', 30, int)
    return ejecutar_reporte("pkg_reportes_farmacia.p_reporte_medicamentos_proximos_vencer", [dias])


@reportes_bp.route('/sin-stock')
def r_sin_stock():
    return ejecutar_reporte("pkg_reportes_farmacia.p_reporte_medicamentos_sin_stock")


@reportes_bp.route('/ventas-por-empleado')
def r_empleado():
    return ejecutar_reporte("pkg_reportes_farmacia.p_reporte_ventas_por_empleado")


@reportes_bp.route('/ventas-por-cliente')
def r_cliente():
    return ejecutar_reporte("pkg_reportes_farmacia.p_reporte_ventas_por_cliente")


@reportes_bp.route('/top-vendidos')
def r_top():
    return ejecutar_reporte("pkg_reportes_farmacia.p_reporte_top_5_vendidos")


@reportes_bp.route('/ingresos-mensuales')
def r_ingresos():
    return ejecutar_reporte("pkg_reportes_farmacia.p_reporte_ingresos_por_mes")


# El resumen general sigue siendo mejor hacerlo con queries simples directas
@reportes_bp.route('/resumen-general')
def resumen():
    conn = get_db_connection()
    try:
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM Medicamentos WHERE estado='Activo'")
        activos = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM Medicamentos WHERE stock < 10 AND estado='Activo'")
        bajo = c.fetchone()[0]
        c.execute(
            "SELECT COUNT(*), NVL(SUM(total_venta),0) FROM Ventas WHERE TO_CHAR(fecha_venta,'YYYY-MM')=TO_CHAR(SYSDATE,'YYYY-MM')")
        vm, im = c.fetchone()
        c.execute("SELECT COUNT(*) FROM Clientes")
        cli = c.fetchone()[0]
        c.execute(
            "SELECT COUNT(*) FROM Medicamentos WHERE fecha_vencimiento BETWEEN TRUNC(SYSDATE) AND TRUNC(SYSDATE)+30")
        venc = c.fetchone()[0]
        return jsonify({"estado": "exito", "datos": {"medicamentos_activos": activos, "medicamentos_bajo_stock": bajo,
                                                     "ventas_mes_actual": vm, "ingresos_mes_actual": float(im),
                                                     "total_clientes": cli, "medicamentos_proximos_vencer": venc}}), 200
    except Exception as e:
        return jsonify({"estado": "error", "mensaje": str(e)}), 500