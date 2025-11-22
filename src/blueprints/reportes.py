from flask import Blueprint, jsonify, request
from src.db import get_db_connection
import oracledb
from datetime import date

reportes_bp = Blueprint('reportes', __name__, url_prefix='/api/reportes')

def ejecutar_reporte(proc_name, params=[]):
    connection = get_db_connection()
    if not connection: return jsonify({"estado": "error"}), 503
    try:
        out = connection.cursor()
        connection.cursor().callproc(proc_name, params + [out])
        cols = [c[0].lower() for c in out.description]
        res = [dict(zip(cols, r)) for r in out]
        return jsonify({"estado": "exito", "datos": res}), 200
    except oracledb.Error as e: return jsonify({"estado": "error", "mensaje": str(e)}), 500

@reportes_bp.route('/medicamentos-por-categoria')
def r1(): return ejecutar_reporte("pkg_reportes_farmacia.p_reporte_medicamentos_por_categoria")

@reportes_bp.route('/proximos-vencer')
def r2(): return ejecutar_reporte("pkg_reportes_farmacia.p_reporte_medicamentos_proximos_vencer", [request.args.get('dias', 30, int)])

@reportes_bp.route('/ventas-del-dia')
def r3():
    f = request.args.get('fecha')
    d = date.fromisoformat(f) if f else date.today()
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

@reportes_bp.route('/top-vendidos')
def r9(): return ejecutar_reporte("pkg_reportes_farmacia.p_reporte_top_5_vendidos")

@reportes_bp.route('/ingresos-mensuales')
def r10(): return ejecutar_reporte("pkg_reportes_farmacia.p_reporte_ingresos_por_mes")

@reportes_bp.route('/resumen-general')
def resumen():
    conn = get_db_connection()
    try:
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM Medicamentos WHERE estado='Activo'")
        activos = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM Medicamentos WHERE stock < 10 AND estado='Activo'")
        bajo = c.fetchone()[0]
        c.execute("SELECT COUNT(*), NVL(SUM(total_venta),0) FROM Ventas WHERE TO_CHAR(fecha_venta,'YYYY-MM')=TO_CHAR(SYSDATE,'YYYY-MM')")
        vm, im = c.fetchone()
        c.execute("SELECT COUNT(*) FROM Clientes")
        cli = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM Medicamentos WHERE fecha_vencimiento BETWEEN TRUNC(SYSDATE) AND TRUNC(SYSDATE)+30")
        venc = c.fetchone()[0]
        return jsonify({"estado":"exito","datos":{"medicamentos_activos":activos,"medicamentos_bajo_stock":bajo,"ventas_mes_actual":vm,"ingresos_mes_actual":float(im),"total_clientes":cli,"medicamentos_proximos_vencer":venc}}), 200
    except Exception as e: return jsonify({"estado":"error","mensaje":str(e)}), 500