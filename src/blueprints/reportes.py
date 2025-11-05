from flask import Blueprint, jsonify, request
from src.db import get_db_connection
import oracledb
from datetime import date

reportes_bp = Blueprint('reportes', __name__, url_prefix='/api/reportes')


# --- REPORTE 1: Medicamentos por Categoría ---
@reportes_bp.route('/medicamentos-por-categoria', methods=['GET'])
def medicamentos_por_categoria():
    """
    Muestra todos los medicamentos agrupados por categoría.
    """
    connection = get_db_connection()
    if not connection:
        return jsonify({
            "estado": "error",
            "mensaje": "No se pudo conectar a la base de datos."
        }), 503

    try:
        out_cursor = connection.cursor()
        connection.cursor().callproc(
            "pkg_reportes_farmacia.p_reporte_medicamentos_por_categoria",
            [out_cursor]
        )

        columnas = [col[0].lower() for col in out_cursor.description]
        medicamentos = [dict(zip(columnas, row)) for row in out_cursor]

        return jsonify({
            "estado": "exito",
            "datos": medicamentos,
            "total": len(medicamentos)
        }), 200

    except oracledb.Error as e:
        return jsonify({
            "estado": "error",
            "mensaje": f"Error de base de datos: {e}"
        }), 500


# --- REPORTE 2: Medicamentos Próximos a Vencer ---
@reportes_bp.route('/proximos-vencer', methods=['GET'])
def medicamentos_proximos_vencer():
    """
    Lista medicamentos que vencen en los próximos N días.
    Query param: dias (default: 30)
    """
    dias_limite = request.args.get('dias', default=30, type=int)

    connection = get_db_connection()
    if not connection:
        return jsonify({
            "estado": "error",
            "mensaje": "No se pudo conectar a la base de datos."
        }), 503

    try:
        out_cursor = connection.cursor()
        connection.cursor().callproc(
            "pkg_reportes_farmacia.p_reporte_medicamentos_proximos_vencer",
            [dias_limite, out_cursor]
        )

        columnas = [col[0].lower() for col in out_cursor.description]
        medicamentos = [dict(zip(columnas, row)) for row in out_cursor]

        return jsonify({
            "estado": "exito",
            "datos": medicamentos,
            "total": len(medicamentos),
            "dias_limite": dias_limite
        }), 200

    except oracledb.Error as e:
        return jsonify({
            "estado": "error",
            "mensaje": f"Error de base de datos: {e}"
        }), 500


# --- REPORTE 3: Ventas del Día ---
@reportes_bp.route('/ventas-del-dia', methods=['GET'])
def ventas_del_dia():
    """
    Muestra las ventas de una fecha específica.
    Query param: fecha (formato: YYYY-MM-DD, default: hoy)
    """
    fecha_str = request.args.get('fecha', default=None)

    connection = get_db_connection()
    if not connection:
        return jsonify({
            "estado": "error",
            "mensaje": "No se pudo conectar a la base de datos."
        }), 503

    try:
        # Si no se proporciona fecha, usar la fecha actual
        if fecha_str:
            try:
                fecha_obj = date.fromisoformat(fecha_str)
            except ValueError:
                return jsonify({
                    "estado": "error",
                    "mensaje": "Formato de fecha inválido. Use YYYY-MM-DD"
                }), 400
        else:
            fecha_obj = date.today()

        out_cursor = connection.cursor()
        connection.cursor().callproc(
            "pkg_reportes_farmacia.p_reporte_ventas_del_dia",
            [fecha_obj, out_cursor]
        )

        columnas = [col[0].lower() for col in out_cursor.description]
        ventas = [dict(zip(columnas, row)) for row in out_cursor]

        return jsonify({
            "estado": "exito",
            "datos": ventas,
            "total": len(ventas),
            "fecha": str(fecha_obj)
        }), 200

    except oracledb.Error as e:
        return jsonify({
            "estado": "error",
            "mensaje": f"Error de base de datos: {e}"
        }), 500


# --- REPORTE 4: Ventas por Empleado ---
@reportes_bp.route('/ventas-por-empleado', methods=['GET'])
def ventas_por_empleado():
    """
    Muestra el total de ventas y monto por cada empleado.
    """
    connection = get_db_connection()
    if not connection:
        return jsonify({
            "estado": "error",
            "mensaje": "No se pudo conectar a la base de datos."
        }), 503

    try:
        out_cursor = connection.cursor()
        connection.cursor().callproc(
            "pkg_reportes_farmacia.p_reporte_ventas_por_empleado",
            [out_cursor]
        )

        columnas = [col[0].lower() for col in out_cursor.description]
        ventas = [dict(zip(columnas, row)) for row in out_cursor]

        return jsonify({
            "estado": "exito",
            "datos": ventas,
            "total_empleados": len(ventas)
        }), 200

    except oracledb.Error as e:
        return jsonify({
            "estado": "error",
            "mensaje": f"Error de base de datos: {e}"
        }), 500


# --- REPORTE 5: Ventas por Cliente ---
@reportes_bp.route('/ventas-por-cliente', methods=['GET'])
def ventas_por_cliente():
    """
    Muestra el total de compras y gasto por cada cliente.
    """
    connection = get_db_connection()
    if not connection:
        return jsonify({
            "estado": "error",
            "mensaje": "No se pudo conectar a la base de datos."
        }), 503

    try:
        out_cursor = connection.cursor()
        connection.cursor().callproc(
            "pkg_reportes_farmacia.p_reporte_ventas_por_cliente",
            [out_cursor]
        )

        columnas = [col[0].lower() for col in out_cursor.description]
        ventas = [dict(zip(columnas, row)) for row in out_cursor]

        return jsonify({
            "estado": "exito",
            "datos": ventas,
            "total_clientes": len(ventas)
        }), 200

    except oracledb.Error as e:
        return jsonify({
            "estado": "error",
            "mensaje": f"Error de base de datos: {e}"
        }), 500


# --- REPORTE 6: Proveedores Activos ---
@reportes_bp.route('/proveedores-activos', methods=['GET'])
def proveedores_activos():
    """
    Lista todos los proveedores con estado activo.
    """
    connection = get_db_connection()
    if not connection:
        return jsonify({
            "estado": "error",
            "mensaje": "No se pudo conectar a la base de datos."
        }), 503

    try:
        out_cursor = connection.cursor()
        connection.cursor().callproc(
            "pkg_reportes_farmacia.p_reporte_proveedores_activos",
            [out_cursor]
        )

        columnas = [col[0].lower() for col in out_cursor.description]
        proveedores = [dict(zip(columnas, row)) for row in out_cursor]

        return jsonify({
            "estado": "exito",
            "datos": proveedores,
            "total": len(proveedores)
        }), 200

    except oracledb.Error as e:
        return jsonify({
            "estado": "error",
            "mensaje": f"Error de base de datos: {e}"
        }), 500


# --- REPORTE 7: Medicamentos Sin Stock ---
@reportes_bp.route('/sin-stock', methods=['GET'])
def medicamentos_sin_stock():
    """
    Muestra medicamentos con stock igual a 0 o estado 'Agotado'.
    """
    connection = get_db_connection()
    if not connection:
        return jsonify({
            "estado": "error",
            "mensaje": "No se pudo conectar a la base de datos."
        }), 503

    try:
        out_cursor = connection.cursor()
        connection.cursor().callproc(
            "pkg_reportes_farmacia.p_reporte_medicamentos_sin_stock",
            [out_cursor]
        )

        columnas = [col[0].lower() for col in out_cursor.description]
        medicamentos = [dict(zip(columnas, row)) for row in out_cursor]

        return jsonify({
            "estado": "exito",
            "datos": medicamentos,
            "total": len(medicamentos)
        }), 200

    except oracledb.Error as e:
        return jsonify({
            "estado": "error",
            "mensaje": f"Error de base de datos: {e}"
        }), 500


# --- REPORTE 8: Promedio de Precios por Categoría ---
@reportes_bp.route('/promedio-precios', methods=['GET'])
def promedio_precios_categoria():
    """
    Calcula el precio promedio de venta por categoría.
    """
    connection = get_db_connection()
    if not connection:
        return jsonify({
            "estado": "error",
            "mensaje": "No se pudo conectar a la base de datos."
        }), 503

    try:
        out_cursor = connection.cursor()
        connection.cursor().callproc(
            "pkg_reportes_farmacia.p_reporte_promedio_precio_categoria",
            [out_cursor]
        )

        columnas = [col[0].lower() for col in out_cursor.description]
        promedios = [dict(zip(columnas, row)) for row in out_cursor]

        return jsonify({
            "estado": "exito",
            "datos": promedios,
            "total_categorias": len(promedios)
        }), 200

    except oracledb.Error as e:
        return jsonify({
            "estado": "error",
            "mensaje": f"Error de base de datos: {e}"
        }), 500


# --- REPORTE 9: Top 5 Medicamentos Más Vendidos ---
@reportes_bp.route('/top-vendidos', methods=['GET'])
def top_medicamentos_vendidos():
    """
    Muestra los 5 medicamentos con más unidades vendidas.
    """
    connection = get_db_connection()
    if not connection:
        return jsonify({
            "estado": "error",
            "mensaje": "No se pudo conectar a la base de datos."
        }), 503

    try:
        out_cursor = connection.cursor()
        connection.cursor().callproc(
            "pkg_reportes_farmacia.p_reporte_top_5_vendidos",
            [out_cursor]
        )

        columnas = [col[0].lower() for col in out_cursor.description]
        top_vendidos = [dict(zip(columnas, row)) for row in out_cursor]

        return jsonify({
            "estado": "exito",
            "datos": top_vendidos,
            "total": len(top_vendidos)
        }), 200

    except oracledb.Error as e:
        return jsonify({
            "estado": "error",
            "mensaje": f"Error de base de datos: {e}"
        }), 500


# --- REPORTE 10: Ingresos por Mes ---
@reportes_bp.route('/ingresos-mensuales', methods=['GET'])
def ingresos_mensuales():
    """
    Muestra la suma total de ventas agrupadas por mes.
    """
    connection = get_db_connection()
    if not connection:
        return jsonify({
            "estado": "error",
            "mensaje": "No se pudo conectar a la base de datos."
        }), 503

    try:
        out_cursor = connection.cursor()
        connection.cursor().callproc(
            "pkg_reportes_farmacia.p_reporte_ingresos_por_mes",
            [out_cursor]
        )

        columnas = [col[0].lower() for col in out_cursor.description]
        ingresos = [dict(zip(columnas, row)) for row in out_cursor]

        return jsonify({
            "estado": "exito",
            "datos": ingresos,
            "total_meses": len(ingresos)
        }), 200

    except oracledb.Error as e:
        return jsonify({
            "estado": "error",
            "mensaje": f"Error de base de datos: {e}"
        }), 500


# --- REPORTE EXTRA: Resumen General ---
@reportes_bp.route('/resumen-general', methods=['GET'])
def resumen_general():
    """
    Proporciona un resumen con métricas clave del sistema.
    """
    connection = get_db_connection()
    if not connection:
        return jsonify({
            "estado": "error",
            "mensaje": "No se pudo conectar a la base de datos."
        }), 503

    try:
        cursor = connection.cursor()

        # Total de medicamentos
        cursor.execute("SELECT COUNT(*) FROM Medicamentos WHERE estado = 'Activo'")
        total_medicamentos = cursor.fetchone()[0]

        # Medicamentos con bajo stock (menos de 10 unidades)
        cursor.execute("SELECT COUNT(*) FROM Medicamentos WHERE stock < 10 AND estado = 'Activo'")
        bajo_stock = cursor.fetchone()[0]

        # Total de ventas del mes actual
        cursor.execute("""
                       SELECT COUNT(*), NVL(SUM(total_venta), 0)
                       FROM Ventas
                       WHERE TO_CHAR(fecha_venta, 'YYYY-MM') = TO_CHAR(SYSDATE, 'YYYY-MM')
                       """)
        ventas_mes, ingresos_mes = cursor.fetchone()

        # Total de clientes
        cursor.execute("SELECT COUNT(*) FROM Clientes")
        total_clientes = cursor.fetchone()[0]

        # Medicamentos próximos a vencer (30 días)
        cursor.execute("""
                       SELECT COUNT(*)
                       FROM Medicamentos
                       WHERE fecha_vencimiento BETWEEN TRUNC(SYSDATE) AND (TRUNC(SYSDATE) + 30)
                         AND estado = 'Activo'
                       """)
        proximos_vencer = cursor.fetchone()[0]

        return jsonify({
            "estado": "exito",
            "datos": {
                "medicamentos_activos": total_medicamentos,
                "medicamentos_bajo_stock": bajo_stock,
                "ventas_mes_actual": ventas_mes,
                "ingresos_mes_actual": float(ingresos_mes) if ingresos_mes else 0,
                "total_clientes": total_clientes,
                "medicamentos_proximos_vencer": proximos_vencer
            }
        }), 200

    except oracledb.Error as e:
        return jsonify({
            "estado": "error",
            "mensaje": f"Error de base de datos: {e}"
        }), 500