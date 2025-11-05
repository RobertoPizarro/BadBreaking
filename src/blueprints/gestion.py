from flask import Blueprint, jsonify, request
from src.db import get_db_connection
import oracledb

gestion_bp = Blueprint('gestion', __name__, url_prefix='/api')


# --- GESTIÓN DE MEDICAMENTOS ---

@gestion_bp.route('/medicamentos', methods=['GET'])
def obtener_medicamentos():
    """
    Obtiene el listado de todos los medicamentos agrupados por categoría.
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


@gestion_bp.route('/medicamentos/<int:id_medicamento>', methods=['GET'])
def obtener_medicamento(id_medicamento):
    """
    Obtiene los detalles de un medicamento específico.
    """
    connection = get_db_connection()
    if not connection:
        return jsonify({
            "estado": "error",
            "mensaje": "No se pudo conectar a la base de datos."
        }), 503

    try:
        cursor = connection.cursor()
        cursor.execute("""
                       SELECT m.id_medicamento,
                              m.nombre,
                              c.nombre AS categoria,
                              p.nombre AS proveedor,
                              m.stock,
                              m.precio_compra,
                              m.precio_venta,
                              m.fecha_vencimiento,
                              m.lote,
                              m.ubicacion,
                              m.descripcion,
                              m.estado
                       FROM Medicamentos m
                                LEFT JOIN Categorias c ON m.id_categoria = c.id_categoria
                                LEFT JOIN Proveedores p ON m.id_proveedor = p.id_proveedor
                       WHERE m.id_medicamento = :id_med
                       """, {'id_med': id_medicamento})

        medicamento = cursor.fetchone()
        if not medicamento:
            return jsonify({
                "estado": "error",
                "mensaje": f"No se encontró el medicamento con ID {id_medicamento}"
            }), 404

        columnas = [col[0].lower() for col in cursor.description]
        medicamento_dict = dict(zip(columnas, medicamento))

        return jsonify({
            "estado": "exito",
            "datos": medicamento_dict
        }), 200

    except oracledb.Error as e:
        return jsonify({
            "estado": "error",
            "mensaje": f"Error de base de datos: {e}"
        }), 500


@gestion_bp.route('/medicamentos', methods=['POST'])
def registrar_medicamento():
    """
    Registra un nuevo medicamento en el sistema.
    """
    datos = request.get_json()
    if not datos:
        return jsonify({
            "estado": "error",
            "mensaje": "Se requiere un JSON con los datos del medicamento."
        }), 400

    # Validar campos requeridos
    campos_requeridos = ['p_nombre', 'p_id_categoria', 'p_stock', 'p_precio_compra',
                         'p_precio_venta', 'p_fecha_vencimiento', 'p_lote']
    campos_faltantes = [c for c in campos_requeridos if c not in datos]

    if campos_faltantes:
        return jsonify({
            "estado": "error",
            "mensaje": f"Campos requeridos faltantes: {', '.join(campos_faltantes)}"
        }), 400

    connection = get_db_connection()
    if not connection:
        return jsonify({
            "estado": "error",
            "mensaje": "No se pudo conectar a la base de datos."
        }), 503

    try:
        cursor = connection.cursor()
        cursor.callproc(
            "pkg_gestion_farmacia.p_registrar_medicamento",
            keywordParameters=datos
        )

        return jsonify({
            "estado": "exito",
            "mensaje": "Medicamento registrado exitosamente."
        }), 201

    except oracledb.DatabaseError as e:
        error_obj, = e.args
        error_message = error_obj.message

        if "ORA-20001" in error_message:
            return jsonify({
                "estado": "error",
                "mensaje": "No se puede registrar un medicamento con fecha de vencimiento pasada."
            }), 400

        if "ORA-02291" in error_message:
            return jsonify({
                "estado": "error",
                "mensaje": "La categoría o proveedor especificado no existe."
            }), 400

        return jsonify({
            "estado": "error",
            "mensaje": f"Error de base de datos: {error_message}"
        }), 500


@gestion_bp.route('/medicamentos/<int:id_medicamento>/precio', methods=['PUT'])
def editar_precio_medicamento(id_medicamento):
    """
    Actualiza los precios de compra y venta de un medicamento.
    """
    datos = request.get_json()
    if not datos or 'nuevo_precio_compra' not in datos or 'nuevo_precio_venta' not in datos:
        return jsonify({
            "estado": "error",
            "mensaje": "Se requieren los campos: nuevo_precio_compra, nuevo_precio_venta"
        }), 400

    connection = get_db_connection()
    if not connection:
        return jsonify({
            "estado": "error",
            "mensaje": "No se pudo conectar a la base de datos."
        }), 503

    try:
        cursor = connection.cursor()
        cursor.callproc(
            "pkg_gestion_farmacia.p_editar_precio",
            keywordParameters={
                'p_id_medicamento': id_medicamento,
                'p_nuevo_precio_compra': datos['nuevo_precio_compra'],
                'p_nuevo_precio_venta': datos['nuevo_precio_venta']
            }
        )

        return jsonify({
            "estado": "exito",
            "mensaje": "Precio actualizado exitosamente."
        }), 200

    except oracledb.DatabaseError as e:
        error_obj, = e.args
        error_message = error_obj.message

        if "ORA-20010" in error_message:
            return jsonify({
                "estado": "error",
                "mensaje": "El precio de venta debe ser mayor al precio de compra."
            }), 400

        return jsonify({
            "estado": "error",
            "mensaje": f"Error de base de datos: {error_message}"
        }), 500


@gestion_bp.route('/medicamentos/<int:id_medicamento>/stock', methods=['PATCH'])
def actualizar_stock_medicamento(id_medicamento):
    """
    Incrementa el stock de un medicamento (ej. al recibir un pedido).
    """
    datos = request.get_json()
    if not datos or 'cantidad_agregada' not in datos:
        return jsonify({
            "estado": "error",
            "mensaje": "Se requiere el campo: cantidad_agregada"
        }), 400

    connection = get_db_connection()
    if not connection:
        return jsonify({
            "estado": "error",
            "mensaje": "No se pudo conectar a la base de datos."
        }), 503

    try:
        cursor = connection.cursor()
        cursor.callproc(
            "pkg_gestion_farmacia.p_actualizar_stock",
            keywordParameters={
                'p_id_medicamento': id_medicamento,
                'p_cantidad_agregada': datos['cantidad_agregada']
            }
        )

        return jsonify({
            "estado": "exito",
            "mensaje": f"Stock actualizado. Se agregaron {datos['cantidad_agregada']} unidades."
        }), 200

    except oracledb.DatabaseError as e:
        error_obj, = e.args
        error_message = error_obj.message

        if "ORA-20011" in error_message:
            return jsonify({
                "estado": "error",
                "mensaje": "La cantidad a agregar debe ser positiva."
            }), 400

        return jsonify({
            "estado": "error",
            "mensaje": f"Error de base de datos: {error_message}"
        }), 500


@gestion_bp.route('/medicamentos/<int:id_medicamento>', methods=['DELETE'])
def eliminar_medicamento(id_medicamento):
    """
    Desactiva un medicamento (eliminación lógica).
    """
    connection = get_db_connection()
    if not connection:
        return jsonify({
            "estado": "error",
            "mensaje": "No se pudo conectar a la base de datos."
        }), 503

    try:
        cursor = connection.cursor()
        cursor.callproc(
            "pkg_gestion_farmacia.p_eliminar_medicamento",
            keywordParameters={'p_id_medicamento': id_medicamento}
        )

        return jsonify({
            "estado": "exito",
            "mensaje": "Medicamento desactivado exitosamente."
        }), 200

    except oracledb.Error as e:
        return jsonify({
            "estado": "error",
            "mensaje": f"Error de base de datos: {e}"
        }), 500


# --- GESTIÓN DE CATEGORÍAS ---

@gestion_bp.route('/categorias', methods=['GET'])
def obtener_categorias():
    """
    Obtiene el listado de todas las categorías.
    """
    connection = get_db_connection()
    if not connection:
        return jsonify({
            "estado": "error",
            "mensaje": "No se pudo conectar a la base de datos."
        }), 503

    try:
        cursor = connection.cursor()
        cursor.execute("""
                       SELECT id_categoria, nombre, descripcion
                       FROM Categorias
                       ORDER BY nombre
                       """)

        columnas = [col[0].lower() for col in cursor.description]
        categorias = [dict(zip(columnas, row)) for row in cursor.fetchall()]

        return jsonify({
            "estado": "exito",
            "datos": categorias
        }), 200

    except oracledb.Error as e:
        return jsonify({
            "estado": "error",
            "mensaje": f"Error de base de datos: {e}"
        }), 500


# --- GESTIÓN DE PROVEEDORES ---

@gestion_bp.route('/proveedores', methods=['GET'])
def obtener_proveedores():
    """
    Obtiene el listado de todos los proveedores.
    """
    connection = get_db_connection()
    if not connection:
        return jsonify({
            "estado": "error",
            "mensaje": "No se pudo conectar a la base de datos."
        }), 503

    try:
        cursor = connection.cursor()
        cursor.execute("""
                       SELECT id_proveedor, nombre, contacto_telefono, email, direccion, estado
                       FROM Proveedores
                       ORDER BY nombre
                       """)

        columnas = [col[0].lower() for col in cursor.description]
        proveedores = [dict(zip(columnas, row)) for row in cursor.fetchall()]

        return jsonify({
            "estado": "exito",
            "datos": proveedores
        }), 200

    except oracledb.Error as e:
        return jsonify({
            "estado": "error",
            "mensaje": f"Error de base de datos: {e}"
        }), 500