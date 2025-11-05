import os
from flask import Flask, send_file, jsonify
from dotenv import load_dotenv

# Importaciones de la aplicación
from src.db import get_db_connection, close_db_connection
from src.blueprints.reportes import reportes_bp  # <--- Actualizado

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# Crear la instancia de la aplicación Flask
app = Flask(__name__)

# Registrar el Blueprint de reportes en la aplicación
# Todas las rutas definidas en reportes_bp ahora estarán activas
app.register_blueprint(reportes_bp)

# --- Rutas Principales ---

@app.route("/")
def index():
    """Sirve la página principal de la aplicación."""
    # Usamos send_file para devolver un archivo HTML estático
    return send_file('src/index.html')


@app.route("/test-db")
def test_db_connection():
    """Ruta de prueba para verificar la conexión a la BD."""
    connection = None
    try:
        connection = get_db_connection()
        if connection:
            return jsonify({"estado": "exito", "mensaje": "Conexión exitosa con la base de datos Oracle."}), 200
        else:
            # Este caso es poco probable si get_db_connection maneja sus propios errores,
            # pero es bueno tenerlo como respaldo.
            return jsonify({"estado": "error", "mensaje": "Fallo al obtener la conexión."}), 500
    except Exception as e:
        # Captura cualquier otra excepción durante la conexión para más detalles
        return jsonify({"estado": "error", "mensaje": f"Error inesperado: {str(e)}"}), 500
    finally:
        if connection:
            close_db_connection(connection)

# --- Bloque de Ejecución Principal ---

def main():
    """Función principal para ejecutar la aplicación Flask."""
    # El servidor se ejecuta en el puerto 8080 por defecto.
    # debug=True activa el reinicio automático al detectar cambios y muestra errores detallados.
    # host='0.0.0.0' hace que el servidor sea accesible desde cualquier dispositivo en la misma red.
    app.run(
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 8080)),
        debug=True
    )


if __name__ == "__main__":
    # Este bloque asegura que la aplicación solo se ejecute cuando
    # el script es llamado directamente por el intérprete de Python.
    main()
