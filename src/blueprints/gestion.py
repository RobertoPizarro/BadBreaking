from flask import Blueprint, jsonify, request
from src.db import get_db_connection
import oracledb

gestion_bp = Blueprint('gestion', __name__, url_prefix='/api')

@gestion_bp.route('/medicamentos', methods=['GET'])
def obtener_medicamentos():
    connection = get_db_connection()
    if not connection: return jsonify({"estado": "error", "mensaje": "Sin conexion"}), 503
    try:
        out_cursor = connection.cursor()
        connection.cursor().callproc("pkg_reportes_farmacia.p_reporte_medicamentos_por_categoria", [out_cursor])
        columnas = [col[0].lower() for col in out_cursor.description]
        medicamentos = [dict(zip(columnas, row)) for row in out_cursor]
        return jsonify({"estado": "exito", "datos": medicamentos, "total": len(medicamentos)}), 200
    except oracledb.Error as e: return jsonify({"estado": "error", "mensaje": str(e)}), 500

@gestion_bp.route('/medicamentos', methods=['POST'])
def registrar_medicamento():
    datos = request.get_json()
    connection = get_db_connection()
    if not connection: return jsonify({"estado": "error", "mensaje": "Sin conexion"}), 503
    try:
        cursor = connection.cursor()
        cursor.callproc("pkg_gestion_farmacia.p_registrar_medicamento", keywordParameters=datos)
        return jsonify({"estado": "exito", "mensaje": "Registrado"}), 201
    except oracledb.DatabaseError as e:
        msg = e.args[0].message
        if "ORA-20001" in msg: return jsonify({"estado": "error", "mensaje": "Medicamento vencido"}), 400
        return jsonify({"estado": "error", "mensaje": msg}), 500

@gestion_bp.route('/medicamentos/<int:id_medicamento>/precio', methods=['PUT'])
def editar_precio_medicamento(id_medicamento):
    datos = request.get_json()
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        cursor.callproc("pkg_gestion_farmacia.p_editar_precio", keywordParameters={'p_id_medicamento': id_medicamento, 'p_nuevo_precio_compra': datos['nuevo_precio_compra'], 'p_nuevo_precio_venta': datos['nuevo_precio_venta']})
        return jsonify({"estado": "exito", "mensaje": "Actualizado"}), 200
    except oracledb.DatabaseError as e: return jsonify({"estado": "error", "mensaje": str(e)}), 500

@gestion_bp.route('/medicamentos/<int:id_medicamento>/stock', methods=['PATCH'])
def actualizar_stock_medicamento(id_medicamento):
    datos = request.get_json()
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        cursor.callproc("pkg_gestion_farmacia.p_actualizar_stock", keywordParameters={'p_id_medicamento': id_medicamento, 'p_cantidad_agregada': datos['cantidad_agregada']})
        return jsonify({"estado": "exito", "mensaje": "Stock actualizado"}), 200
    except oracledb.DatabaseError as e: return jsonify({"estado": "error", "mensaje": str(e)}), 500

@gestion_bp.route('/medicamentos/<int:id_medicamento>', methods=['DELETE'])
def eliminar_medicamento(id_medicamento):
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        cursor.callproc("pkg_gestion_farmacia.p_eliminar_medicamento", keywordParameters={'p_id_medicamento': id_medicamento})
        return jsonify({"estado": "exito", "mensaje": "Eliminado"}), 200
    except oracledb.Error as e: return jsonify({"estado": "error", "mensaje": str(e)}), 500

@gestion_bp.route('/categorias', methods=['GET'])
def obtener_categorias():
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT id_categoria, nombre FROM Categorias ORDER BY nombre")
        columnas = [col[0].lower() for col in cursor.description]
        return jsonify({"estado": "exito", "datos": [dict(zip(columnas, row)) for row in cursor.fetchall()]}), 200
    except oracledb.Error as e: return jsonify({"estado": "error", "mensaje": str(e)}), 500

@gestion_bp.route('/proveedores', methods=['GET'])
def obtener_proveedores():
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT id_proveedor, nombre, estado FROM Proveedores ORDER BY nombre")
        columnas = [col[0].lower() for col in cursor.description]
        return jsonify({"estado": "exito", "datos": [dict(zip(columnas, row)) for row in cursor.fetchall()]}), 200
    except oracledb.Error as e: return jsonify({"estado": "error", "mensaje": str(e)}), 500