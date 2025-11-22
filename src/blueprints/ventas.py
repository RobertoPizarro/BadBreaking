from flask import Blueprint, jsonify, request
from src.db import get_db_connection
import oracledb

ventas_bp = Blueprint('ventas', __name__, url_prefix='/api')


@ventas_bp.route('/ventas', methods=['POST'])
def registrar_venta_completa():
    datos = request.get_json()
    connection = get_db_connection()
    if not connection: return jsonify({"estado": "error", "mensaje": "Sin conexion"}), 503
    cursor = None
    try:
        connection.autocommit = False
        cursor = connection.cursor()
        id_venta_var = cursor.var(oracledb.NUMBER)
        cursor.callproc("pkg_gestion_farmacia.p_registrar_venta",
                        keywordParameters={'p_id_cliente': datos['id_cliente'], 'p_id_empleado': datos['id_empleado'],
                                           'p_total_venta': datos['total_venta'], 'p_id_venta_generada': id_venta_var})
        id_venta = int(id_venta_var.getvalue())

        sql_det = "INSERT INTO Venta_Detalle (id_venta, id_medicamento, cantidad, precio_unitario_venta) VALUES (:1, :2, :3, :4)"
        for d in datos['detalles']:
            cursor.execute(sql_det, (id_venta, d['id_medicamento'], d['cantidad'], d['precio_unitario_venta']))

        connection.commit()
        return jsonify({"estado": "exito", "id_venta": id_venta}), 201
    except oracledb.DatabaseError as e:
        if connection: connection.rollback()
        msg = e.args[0].message
        if "ORA-20002" in msg: return jsonify({"estado": "error", "mensaje": "Stock insuficiente"}), 409
        return jsonify({"estado": "error", "mensaje": msg}), 500
    finally:
        if cursor: cursor.close()


@ventas_bp.route('/ventas', methods=['GET'])
def obtener_ventas():
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(
            "SELECT v.id_venta, v.fecha_venta, c.nombre || ' ' || c.apellido AS cliente, e.nombre || ' ' || e.apellido AS empleado, v.total_venta FROM Ventas v JOIN Clientes c ON v.id_cliente = c.id_cliente JOIN Empleados e ON v.id_empleado = e.id_empleado ORDER BY v.fecha_venta DESC")
        columnas = [col[0].lower() for col in cursor.description]
        return jsonify({"estado": "exito", "datos": [dict(zip(columnas, row)) for row in cursor.fetchall()]}), 200
    except oracledb.Error as e:
        return jsonify({"estado": "error", "mensaje": str(e)}), 500


@ventas_bp.route('/ventas/<int:id_venta>', methods=['GET'])
def obtener_detalle_venta(id_venta):
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(
            "SELECT v.id_venta, v.total_venta, c.nombre || ' ' || c.apellido AS cliente FROM Ventas v JOIN Clientes c ON v.id_cliente = c.id_cliente WHERE v.id_venta = :id",
            {'id': id_venta})
        venta = cursor.fetchone()
        if not venta: return jsonify({"estado": "error"}), 404
        v_dict = dict(zip([c[0].lower() for c in cursor.description], venta))

        cursor.execute(
            "SELECT m.nombre AS medicamento, vd.cantidad, vd.precio_unitario_venta, vd.subtotal FROM Venta_Detalle vd JOIN Medicamentos m ON vd.id_medicamento = m.id_medicamento WHERE vd.id_venta = :id",
            {'id': id_venta})
        v_dict['detalles'] = [dict(zip([c[0].lower() for c in cursor.description], row)) for row in cursor.fetchall()]
        return jsonify({"estado": "exito", "datos": v_dict}), 200
    except oracledb.Error as e:
        return jsonify({"estado": "error", "mensaje": str(e)}), 500