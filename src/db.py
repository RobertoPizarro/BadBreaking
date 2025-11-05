import oracledb
import os
from flask import g


def get_db_connection():
    """
    Obtiene una conexión a la base de datos para la petición actual.
    Si la conexión aún no existe, la crea y la almacena en `g`.
    Devuelve la conexión almacenada o None si falla.
    """
    if 'db_conn' not in g:
        try:
            g.db_conn = oracledb.connect(
                user=os.environ.get("DB_USER"),
                password=os.environ.get("DB_PASSWORD"),
                dsn=os.environ.get("DB_DSN")
            )
        except oracledb.Error as e:
            print(f"Error al conectar con la Base de Datos Oracle: {e}")
            return None
    return g.db_conn


def close_db_connection(e=None):
    """
    Cierra la conexión a la base de datos al final de la petición.
    Maneja correctamente el caso de conexiones ya cerradas.
    """
    db = g.pop('db_conn', None)

    if db is not None:
        try:
            db.close()
        except oracledb.InterfaceError:
            # La conexión ya estaba cerrada, ignorar
            pass
        except Exception as ex:
            print(f"Error al cerrar conexión: {ex}")