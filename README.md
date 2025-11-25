# BadBreaking
## Instrucciones de Instalación
1. Ejecutar el siguiente script en la base de datos para la creación del usuario:
```sql
ALTER SESSION SET "_ORACLE_SCRIPT" = TRUE;
-- Creación de usuario
CREATE USER walterw IDENTIFIED BY 1234
DEFAULT TABLESPACE users
TEMPORARY TABLESPACE temp
QUOTA UNLIMITED ON users;
GRANT CONNECT, RESOURCE, CREATE VIEW, CREATE TRIGGER, CREATE PROCEDURE TO walterw;
SET SERVEROUTPUT ON;
```
2. Ingresar al usuario **(user: walterw , password: 1234)**
3. Ejecutar todo el script completo para la creación de la base de datos.
4. Clonar el repositorio en su IDE de preferencia: https://github.com/RobertoPizarro/BadBreaking.git
5. Ingresar a la carpeta del proyecto clonado
6. Ejecutar en la consola del IDE (en orden):
```bash
.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```
7. Listo
   
