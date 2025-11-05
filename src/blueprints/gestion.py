from flask import Blueprint, jsonify, request
from src.db import get_db_connection
import oracledb

# Crear un blueprint para la gestión de la farmacia (CRUD)
gestion_bp = Blueprint('gestion', __name__, url_prefix='/api')


# --- GESTIÓN DE MEDICAMENTOS ---

@gestion_bp.route('/medicamentos', methods=['GET'])
def obtener_medicamentos():
    """Obtiene la lista completa de medicamentos."""
    connection = None
    try:
        connection = get_db_connection()
        out_cursor = connection.cursor()
        connection.cursor().callproc("pkg_reportes_farmacia.p_reporte_medicamentos_por_categoria", [out_cursor])

        columnas = [col[0].lower() for col in out_cursor.description]
        medicamentos = [dict(zip(columnas, row)) for row in out_cursor]

        return jsonify({"estado": "exito", "datos": medicamentos}), 200

    except oracledb.Error as e:
        print(f"Error de Oracle: {e}")
        return jsonify({"estado": "error", "mensaje": "Ocurrió un error al obtener los medicamentos."}), 500
    finally:
        if connection:
            connection.close()


@gestion_bp.route('/medicamentos', methods=['POST'])
def registrar_medicamento():
    """Registra un nuevo medicamento (versión corregida según init.sql)."""
    datos = request.get_json()
    if not datos:
        return jsonify({"estado": "error", "mensaje": "No se enviaron datos (JSON requerido)."}), 400

    connection = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.callproc(
            "pkg_gestion_farmacia.p_registrar_medicamento",
            keywordParameters={
                'p_nombre': datos.get('nombre'),
                'p_id_categoria': datos.get('id_categoria'),
                'p_id_proveedor': datos.get('id_proveedor'),
                'p_stock': datos.get('stock'),
                'p_precio_compra': datos.get('precio_compra'),
                'p_precio_venta': datos.get('precio_venta'),
                'p_fecha_vencimiento': datos.get('fecha_vencimiento'),
                'p_lote': datos.get('lote'),
                'p_ubicacion': datos.get('ubicacion'),
                'p_descripcion': datos.get('descripcion')
            }
        )

        return jsonify({
            "estado": "exito",
            "mensaje": "Medicamento registrado exitosamente."
        }), 201

    except oracledb.Error as e:
        print(f"Error de Oracle al registrar: {e}")
        return jsonify({"estado": "error", "mensaje": f"Error de base de datos: {e}"}), 500
    except Exception as e:
        print(f"Error inesperado: {e}")
        return jsonify({"estado": "error", "mensaje": "Ocurrió un error inesperado en el servidor."}), 500
    finally:
        if connection:
            connection.close()


@gestion_bp.route('/medicamentos/<int:id_medicamento>/precio', methods=['PUT'])
def editar_precio_medicamento(id_medicamento):
    """
    Endpoint para editar el precio de un medicamento existente.
    Llama al procedimiento almacenado pkg_gestion_farmacia.p_editar_precio.
    """
    datos = request.get_json()
    if not datos or 'nuevo_precio_compra' not in datos or 'nuevo_precio_venta' not in datos:
        return jsonify({"estado": "error",
                        "mensaje": "JSON inválido. Se requiere 'nuevo_precio_compra' y 'nuevo_precio_venta'."}), 400

    connection = None
    try:
        connection = get_db_connection()
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
            "mensaje": f"Precio del medicamento con ID {id_medicamento} actualizado correctamente."
        }), 200

    except oracledb.Error as e:
        print(f"Error de Oracle al editar precio: {e}")
        return jsonify({"estado": "error", "mensaje": f"Error de base de datos: {e}"}), 500
    except Exception as e:
        print(f"Error inesperado: {e}")
        return jsonify({"estado": "error", "mensaje": "Ocurrió un error inesperado en el servidor."}), 500
    finally:
        if connection:
            connection.close()
