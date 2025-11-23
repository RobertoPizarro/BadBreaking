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
    # Ahora llama al procedimiento de valorización
    return ejecutar_reporte("pkg_reportes_farmacia.p_reporte_medicamentos_por_categoria")


@reportes_bp.route('/ingresos-mensuales')
def r_finanzas():
    return ejecutar_reporte("pkg_reportes_farmacia.p_reporte_finanzas_mensuales")


@reportes_bp.route('/top-vendidos')
def r_top():
    return ejecutar_reporte("pkg_reportes_farmacia.p_reporte_top_productos_rentables")


@reportes_bp.route('/proximos-vencer')
def r2():
    dias = request.args.get('dias', 30, int)
    return ejecutar_reporte("pkg_reportes_farmacia.p_reporte_medicamentos_proximos_vencer", [dias])


@reportes_bp.route('/ventas-del-dia')
def r3():
    f = request.args.get('fecha')
    # Si no hay fecha, enviamos None para que el procedure use SYSDATE
    d = date.fromisoformat(f) if f else None
    return ejecutar_reporte("pkg_reportes_farmacia.p_reporte_ventas_del_dia", [d])


@reportes_bp.route('/ventas-por-empleado')
def r4(): return ejecutar_reporte("pkg_reportes_farmacia.p_reporte_ventas_por_empleado")


@reportes_bp.route('/ventas-por-cliente')
def r5(): return ejecutar_reporte("pkg_reportes_farmacia.p_reporte_ventas_por_cliente")


@reportes_bp.route('/proveedores-activos')
def r6(): return ejecutar_reporte("pkg_reportes_farmacia.p_reporte_proveedores_activos")


@reportes_bp.route('/sin-stock')
def r7(): return ejecutar_reporte("pkg_reportes_farmacia.p_reporte_medicamentos_sin_stock")


@reportes_bp.route('/promedio-precios')
def r8(): return ejecutar_reporte("pkg_reportes_farmacia.p_reporte_promedio_precio_categoria")


# El resumen general sigue siendo mejor hacerlo con queries simples directas
# o podrías crear otro procedure, pero para mantenerlo simple lo dejamos así:
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