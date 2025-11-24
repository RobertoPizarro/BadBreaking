# 0. Activar el .venv

.venv\Scripts\activate

# 1. Instalar dependencias en PyCharm

pip install -r requirements.txt

# 2. Probar la conexión a Oracle

sqlplus walterw/1234@localhost:1521/xe

# 3. Iniciar la aplicación

python main.py
