import os
from flask import Flask, send_file, jsonify
from flask_cors import CORS  # ← NUEVO: Importar CORS
from dotenv import load_dotenv

# Carga las variables de entorno desde el archivo .env
load_dotenv()

# --- Importación de Lógica de BD y Blueprints ---
from src.db import close_db_connection
from src.blueprints.gestion import gestion_bp
from src.blueprints.reportes import reportes_bp
from src.blueprints.ventas import ventas_bp

# --- Creación y Configuración de la App ---
app = Flask(__name__)

# ← NUEVO: Habilitar CORS para todas las rutas
CORS(app)

# Guardamos las credenciales en la config para referencia
app.config.update(
    DB_USER=os.environ.get('DB_USER'),
    DB_PASSWORD=os.environ.get('DB_PASSWORD'),
    DB_DSN=os.environ.get('DB_DSN')
)

# --- Registro de Teardown ---
app.teardown_appcontext(close_db_connection)

# --- Registro de Blueprints ---
app.register_blueprint(gestion_bp)
app.register_blueprint(reportes_bp)
app.register_blueprint(ventas_bp)

# --- Ruta Principal ---
@app.route("/")
def index():
    """Sirve la página principal estática de la aplicación."""
    return send_file('src/index.html')

# --- Ruta de Diagnóstico de Base de Datos ---
@app.route("/db-test")
def db_test():
    """
    Endpoint de diagnóstico para verificar la conexión con la base de datos Oracle.
    """
    from src.db import get_db_connection
    import oracledb

    connection = get_db_connection()
    if not connection:
        return jsonify({
            "estado": "error",
            "mensaje": "La conexión inicial a la base de datos falló. Revisa las credenciales en .env y la salida de la consola de Flask."
        }), 503

    try:
        cursor = connection.cursor()
        cursor.execute("SELECT 1 FROM DUAL")
        cursor.fetchone()
        return jsonify({
            "estado": "exito",
            "mensaje": "La conexión con la base de datos Oracle se ha establecido correctamente."
        }), 200
    except oracledb.Error as e:
        return jsonify({
            "estado": "error",
            "mensaje": f"La conexión se estableció, pero falló al ejecutar una consulta. Error: {e}"
        }), 500

# --- Punto de Entrada para Ejecución ---
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)