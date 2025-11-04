import os
from flask import Flask, send_file, jsonify
from dotenv import load_dotenv
from src.db import get_db_connection, close_db_connection

load_dotenv()

app = Flask(__name__)

@app.route("/")
def index():
    return send_file('src/index.html')

@app.route("/test-db")
def test_db_connection():
    connection = get_db_connection()
    if connection:
        close_db_connection(connection)
        return jsonify({"status": "success", "message": "Successfully connected to Oracle Database."}), 200
    else:
        return jsonify({"status": "error", "message": "Failed to connect to Oracle Database."}), 500

def main():
    app.run(port=int(os.environ.get('PORT', 80)))

if __name__ == "__main__":
    main()
