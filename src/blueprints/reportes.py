from flask import Blueprint, jsonify
from src.db import get_db_connection
import oracledb

# Crear un blueprint llamado 'reportes'
reportes_bp = Blueprint('reportes', __name__, url_prefix='/api/reportes')


@reportes_bp.route('/proveedores-activos', methods=['GET'])
def obtener_proveedores_activos():
    """
    Endpoint para obtener la lista de proveedores activos.
    Llama al procedimiento almacenado pkg_reportes.p_reporte_proveedores_activos.
    """
    connection = None  # Inicializar la variable de conexión
    try:
        connection = get_db_connection()
        if not connection:
            return jsonify({"estado": "error", "mensaje": "No se pudo conectar a la base de datos"}), 500

        # Prepara el cursor de salida para el procedimiento
        out_cursor = connection.cursor()

        # Llama al procedimiento almacenado
        connection.cursor().callproc("pkg_reportes.p_reporte_proveedores_activos", [out_cursor])

        # Recupera los nombres de las columnas del cursor de salida
        columnas = [col[0].lower() for col in out_cursor.description]

        # Procesa los resultados en una lista de diccionarios para poder convertirlo a JSON
        proveedores = [dict(zip(columnas, row)) for row in out_cursor]

        return jsonify({"estado": "exito", "datos": proveedores}), 200

    except oracledb.Error as e:
        print(f"Error de Oracle: {e}")
        return jsonify({"estado": "error", "mensaje": "Ocurrió un error al obtener los datos."}), 500
    finally:
        # Asegúrate de cerrar la conexión si se estableció
        if connection:
            connection.close()
