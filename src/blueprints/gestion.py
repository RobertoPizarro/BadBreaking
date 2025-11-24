from flask import Blueprint, jsonify, request
from src.db import get_db_connection
import oracledb

gestion_bp = Blueprint('gestion', __name__, url_prefix='/api')


# --- LISTAR MEDICAMENTOS
@gestion_bp.route('/medicamentos', methods=['GET'])
def obtener_medicamentos():
    connection = get_db_connection()
    if not connection: return jsonify({"estado": "error", "mensaje": "Sin conexion"}), 503
    try:
        cursor = connection.cursor()
        sql = """
            SELECT m.id_medicamento, 
                   m.nombre, 
                   c.nombre AS categoria, 
                   m.id_categoria,
                   m.id_proveedor,
                   m.stock, 
                   m.precio_compra, 
                   m.precio_venta, 
                   TO_CHAR(m.fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento, 
                   m.lote,
                   m.ubicacion,
                   m.descripcion,
                   m.estado 
            FROM Medicamentos m
            JOIN Categorias c ON m.id_categoria = c.id_categoria
            ORDER BY m.nombre
        """
        cursor.execute(sql)
        columnas = [col[0].lower() for col in cursor.description]
        medicamentos = [dict(zip(columnas, row)) for row in cursor.fetchall()]
        return jsonify({"estado": "exito", "datos": medicamentos, "total": len(medicamentos)}), 200
    except oracledb.Error as e:
        return jsonify({"estado": "error", "mensaje": str(e)}), 500


@gestion_bp.route('/medicamentos/<int:id_medicamento>', methods=['GET'])
def obtener_un_medicamento(id_medicamento):
    connection = get_db_connection()
    if not connection: return jsonify({"estado": "error", "mensaje": "Sin conexion"}), 503
    try:
        cursor = connection.cursor()
        sql = """
            SELECT id_medicamento, nombre, id_categoria, id_proveedor, stock, 
                   precio_compra, precio_venta, 
                   TO_CHAR(fecha_vencimiento, 'YYYY-MM-DD') as fecha_vencimiento, 
                   lote, ubicacion, descripcion 
            FROM Medicamentos 
            WHERE id_medicamento = :id
        """
        cursor.execute(sql, {'id': id_medicamento})
        row = cursor.fetchone()
        if not row: return jsonify({"estado": "error", "mensaje": "No encontrado"}), 404

        cols = [col[0].lower() for col in cursor.description]
        data = dict(zip(cols, row))
        return jsonify({"estado": "exito", "datos": data}), 200
    except oracledb.Error as e:
        return jsonify({"estado": "error", "mensaje": str(e)}), 500



@gestion_bp.route('/medicamentos', methods=['POST'])
def registrar_medicamento():
    datos = request.get_json()
    connection = get_db_connection()
    if not connection: return jsonify({"estado": "error", "mensaje": "Sin conexion"}), 503
    try:
        cursor = connection.cursor()
        prov = int(datos['p_id_proveedor']) if datos.get('p_id_proveedor') else None

        params = {
            'p_nombre': datos['p_nombre'],
            'p_id_categoria': int(datos['p_id_categoria']),
            'p_id_proveedor': prov,
            'p_stock': int(datos['p_stock']),
            'p_precio_compra': float(datos['p_precio_compra']),
            'p_precio_venta': float(datos['p_precio_venta']),
            'p_fecha_vencimiento': datos['p_fecha_vencimiento'],
            'p_lote': datos['p_lote'],
            'p_ubicacion': datos.get('p_ubicacion'),
            'p_descripcion': datos.get('p_descripcion')
        }
        cursor.callproc("pkg_gestion_farmacia.p_registrar_medicamento", keywordParameters=params)
        return jsonify({"estado": "exito", "mensaje": "Registrado"}), 201
    except oracledb.DatabaseError as e:
        msg = e.args[0].message
        if "ORA-20001" in msg: return jsonify({"estado": "error", "mensaje": "Medicamento vencido"}), 400
        return jsonify({"estado": "error", "mensaje": msg}), 500


@gestion_bp.route('/medicamentos/<int:id_medicamento>', methods=['PUT'])
def editar_medicamento_completo(id_medicamento):
    datos = request.get_json()
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        params = {
            'p_id_medicamento': id_medicamento,
            'p_nombre': datos['nombre'],
            'p_id_categoria': int(datos['id_categoria']),
            'p_id_proveedor': int(datos['id_proveedor']) if datos.get('id_proveedor') else None,
            'p_stock': int(datos['stock']),
            'p_precio_compra': float(datos['precio_compra']),
            'p_precio_venta': float(datos['precio_venta']),
            'p_fecha_vencimiento': datos['fecha_vencimiento'],
            'p_lote': datos['lote'],
            'p_ubicacion': datos.get('ubicacion'),
            'p_descripcion': datos.get('descripcion')
        }
        cursor.callproc("pkg_gestion_farmacia.p_editar_medicamento_completo", keywordParameters=params)
        return jsonify({"estado": "exito", "mensaje": "Medicamento actualizado correctamente"}), 200
    except oracledb.DatabaseError as e:
        return jsonify({"estado": "error", "mensaje": str(e)}), 500


@gestion_bp.route('/medicamentos/<int:id_medicamento>/precio', methods=['PUT'])
def editar_precio_medicamento(id_medicamento):
    datos = request.get_json()
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        cursor.callproc("pkg_gestion_farmacia.p_editar_precio", keywordParameters={'p_id_medicamento': id_medicamento,
                                                                                   'p_nuevo_precio_compra': datos[
                                                                                       'nuevo_precio_compra'],
                                                                                   'p_nuevo_precio_venta': datos[
                                                                                       'nuevo_precio_venta']})
        return jsonify({"estado": "exito", "mensaje": "Actualizado"}), 200
    except oracledb.DatabaseError as e:
        return jsonify({"estado": "error", "mensaje": str(e)}), 500


@gestion_bp.route('/medicamentos/<int:id_medicamento>/stock', methods=['PATCH'])
def actualizar_stock_medicamento(id_medicamento):
    datos = request.get_json()
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        cursor.callproc("pkg_gestion_farmacia.p_actualizar_stock",
                        keywordParameters={'p_id_medicamento': id_medicamento,
                                           'p_cantidad_agregada': datos['cantidad_agregada']})
        return jsonify({"estado": "exito", "mensaje": "Stock actualizado"}), 200
    except oracledb.DatabaseError as e:
        return jsonify({"estado": "error", "mensaje": str(e)}), 500


@gestion_bp.route('/medicamentos/<int:id_medicamento>', methods=['DELETE'])
def eliminar_medicamento(id_medicamento):
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        cursor.callproc("pkg_gestion_farmacia.p_eliminar_medicamento",
                        keywordParameters={'p_id_medicamento': id_medicamento})
        return jsonify({"estado": "exito", "mensaje": "Eliminado"}), 200
    except oracledb.Error as e:
        return jsonify({"estado": "error", "mensaje": str(e)}), 500


@gestion_bp.route('/categorias', methods=['GET'])
def obtener_categorias():
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT id_categoria, nombre FROM Categorias ORDER BY nombre")
        columnas = [col[0].lower() for col in cursor.description]
        return jsonify({"estado": "exito", "datos": [dict(zip(columnas, row)) for row in cursor.fetchall()]}), 200
    except oracledb.Error as e:
        return jsonify({"estado": "error", "mensaje": str(e)}), 500


@gestion_bp.route('/proveedores', methods=['GET'])
def obtener_proveedores():
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT id_proveedor, nombre, estado FROM Proveedores ORDER BY nombre")
        columnas = [col[0].lower() for col in cursor.description]
        return jsonify({"estado": "exito", "datos": [dict(zip(columnas, row)) for row in cursor.fetchall()]}), 200
    except oracledb.Error as e:
        return jsonify({"estado": "error", "mensaje": str(e)}), 500


@gestion_bp.route('/empleados', methods=['GET'])
def obtener_empleados():
    connection = get_db_connection()
    if not connection:
        return jsonify({"estado": "error", "mensaje": "Sin conexion"}), 503
    try:
        cursor = connection.cursor()
        sql = """
            SELECT e.dni, u.nombre, u.apellido_paterno 
            FROM Empleados e 
            JOIN Usuarios u ON e.dni = u.dni 
            ORDER BY u.nombre ASC
        """
        cursor.execute(sql)
        columnas = [col[0].lower() for col in cursor.description]
        datos = [dict(zip(columnas, row)) for row in cursor.fetchall()]
        return jsonify({"estado": "exito", "datos": datos}), 200
    except oracledb.Error as e:
        return jsonify({"estado": "error", "mensaje": str(e)}), 500