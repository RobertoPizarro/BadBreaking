import oracledb
import os
from flask import g

def get_db_connection():
    if 'db_conn' not in g:
        try:
            g.db_conn = oracledb.connect(
                user=os.environ.get("DB_USER"),
                password=os.environ.get("DB_PASSWORD"),
                dsn=os.environ.get("DB_DSN")
            )
        except oracledb.Error as e:
            print(f"Error BD: {e}")
            return None
    return g.db_conn

def close_db_connection(e=None):
    db = g.pop('db_conn', None)
    if db is not None:
        try:
            db.close()
        except:
            pass