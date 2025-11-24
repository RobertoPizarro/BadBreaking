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

        cli = datos['cliente']

        cursor.callproc("pkg_gestion_farmacia.p_registrar_venta_con_cliente",
                        keywordParameters={
                            'p_dni_cliente': cli['dni'],
                            'p_nombre_cli': cli['nombre'],
                            'p_ape_pat_cli': cli['apellido_paterno'],
                            'p_ape_mat_cli': cli.get('apellido_materno', ''),
                            'p_dni_empleado': datos['dni_empleado'],
                            'p_total_venta': datos['total_venta'],
                            'p_id_venta_generada': id_venta_var
                        })

        id_venta = int(id_venta_var.getvalue())

        # Insertar detalles
        sql_det = "INSERT INTO Venta_Detalle (id_venta, id_medicamento, cantidad, precio_unitario_venta) VALUES (:1, :2, :3, :4)"
        for d in datos['detalles']:
            cursor.execute(sql_det, (id_venta, d['id_medicamento'], d['cantidad'], d['precio_unitario_venta']))

        connection.commit()
        return jsonify({"estado": "exito", "id_venta": id_venta}), 201

    except oracledb.DatabaseError as e:
        if connection: connection.rollback()
        # Manejo de errores
        error_obj, = e.args
        msg = error_obj.message
        if "ORA-20003" in msg:
            return jsonify({"estado": "error", "mensaje": "Stock insuficiente para completar la venta"}), 409
        return jsonify({"estado": "error", "mensaje": msg}), 500
    finally:
        if cursor: cursor.close()


@ventas_bp.route('/ventas', methods=['GET'])
def obtener_ventas():
    connection = get_db_connection()
    try:
        cursor = connection.cursor()

        sql = """
            SELECT v.id_venta, 
                   v.fecha_venta, 
                   uc.nombre || ' ' || uc.apellido_paterno AS cliente, 
                   ue.nombre || ' ' || ue.apellido_paterno AS empleado, 
                   v.total_venta 
            FROM Ventas v 
            JOIN Clientes c ON v.dni_cliente = c.dni 
            JOIN Usuarios uc ON c.dni = uc.dni
            JOIN Empleados e ON v.dni_empleado = e.dni 
            JOIN Usuarios ue ON e.dni = ue.dni
            ORDER BY v.fecha_venta DESC
        """
        cursor.execute(sql)
        columnas = [col[0].lower() for col in cursor.description]
        return jsonify({"estado": "exito", "datos": [dict(zip(columnas, row)) for row in cursor.fetchall()]}), 200
    except oracledb.Error as e:
        return jsonify({"estado": "error", "mensaje": str(e)}), 500


@ventas_bp.route('/ventas/<int:id_venta>', methods=['GET'])
def obtener_detalle_venta(id_venta):
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        sql_cabecera = """
            SELECT v.id_venta, 
                   v.total_venta, 
                   uc.nombre || ' ' || uc.apellido_paterno AS cliente 
            FROM Ventas v 
            JOIN Clientes c ON v.dni_cliente = c.dni 
            JOIN Usuarios uc ON c.dni = uc.dni
            WHERE v.id_venta = :id
        """
        cursor.execute(sql_cabecera, {'id': id_venta})
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