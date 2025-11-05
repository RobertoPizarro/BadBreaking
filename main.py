import os
from flask import Flask, send_file, jsonify
from dotenv import load_dotenv

# Importaciones de la aplicación
from src.db import get_db_connection, close_db_connection
from src.blueprints.reportes import reportes_bp
from src.blueprints.gestion import gestion_bp # <--- Nuevo

# Cargar variables de entorno desde el archivo .env
load_dotenv()

# Crear la instancia de la aplicación Flask
app = Flask(__name__)

# Registrar los Blueprints en la aplicación
app.register_blueprint(reportes_bp)
app.register_blueprint(gestion_bp) # <--- Nuevo

# --- Rutas Principales ---

@app.route("/")
def index():
    """Sirve la página principal de la aplicación."""
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
            return jsonify({"estado": "error", "mensaje": "Fallo al obtener la conexión."}), 500
    except Exception as e:
        return jsonify({"estado": "error", "mensaje": f"Error inesperado: {str(e)}"}), 500
    finally:
        if connection:
            close_db_connection(connection)

# --- Bloque de Ejecución Principal ---
def main():
    """Función principal para ejecutar la aplicación Flask."""
    app.run(
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 8080)),
        debug=True
    )


if __name__ == "__main__":
    main()
