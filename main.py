import os
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Carga las variables de entorno
load_dotenv()

from src.db import close_db_connection
from src.blueprints.gestion import gestion_bp
from src.blueprints.reportes import reportes_bp
from src.blueprints.ventas import ventas_bp

app = Flask(__name__)
CORS(app)

app.config.update(
    DB_USER=os.environ.get('DB_USER'),
    DB_PASSWORD=os.environ.get('DB_PASSWORD'),
    DB_DSN=os.environ.get('DB_DSN')
)

app.teardown_appcontext(close_db_connection)

# Registro de Blueprints (API)
app.register_blueprint(gestion_bp)
app.register_blueprint(reportes_bp)
app.register_blueprint(ventas_bp)

# --- Rutas para servir el Frontend separado ---
@app.route("/")
def index():
    """Redirige a la página principal (dashboard)."""
    return send_from_directory('src', 'dashboard.html')

@app.route("/<path:filename>")
def serve_static(filename):
    """Sirve cualquier archivo HTML, CSS o JS que esté dentro de 'src'."""
    return send_from_directory('src', filename)

# --- Diagnóstico ---
@app.route("/db-test")
def db_test():
    from src.db import get_db_connection
    import oracledb
    connection = get_db_connection()
    if not connection:
        return jsonify({"estado": "error", "mensaje": "Fallo conexion BD"}), 503
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT 1 FROM DUAL")
        return jsonify({"estado": "exito", "mensaje": "Conectado a Oracle"}), 200
    except oracledb.Error as e:
        return jsonify({"estado": "error", "mensaje": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)