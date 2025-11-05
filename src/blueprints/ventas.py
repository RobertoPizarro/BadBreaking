from flask import Blueprint, jsonify, request
from src.db import get_db_connection
import oracledb

ventas_bp = Blueprint('ventas', __name__, url_prefix='/api')


@ventas_bp.route('/ventas', methods=['POST'])
def registrar_venta_completa():
    """
    Registra una venta completa con su cabecera y detalles.
    Maneja transacciones atómicas y actualización automática de stock.
    """
    # Validación de entrada
    datos = request.get_json()
    if not datos or not all(k in datos for k in ('id_cliente', 'id_empleado', 'total_venta', 'detalles')):
        return jsonify({
            "estado": "error",
            "mensaje": "JSON inválido. Se requieren: id_cliente, id_empleado, total_venta, detalles"
        }), 400

    if not isinstance(datos['detalles'], list) or not datos['detalles']:
        return jsonify({
            "estado": "error",
            "mensaje": "El campo 'detalles' debe ser una lista no vacía."
        }), 400

    # Obtener conexión
    connection = get_db_connection()
    if not connection:
        return jsonify({
            "estado": "error",
            "mensaje": "No se pudo conectar a la base de datos."
        }), 503

    cursor = None
    try:
        # Configurar transacción manual
        connection.autocommit = False
        cursor = connection.cursor()

        # 1. Registrar cabecera de venta
        id_venta_var = cursor.var(oracledb.NUMBER)
        cursor.callproc(
            "pkg_gestion_farmacia.p_registrar_venta",
            keywordParameters={
                'p_id_cliente': datos['id_cliente'],
                'p_id_empleado': datos['id_empleado'],
                'p_total_venta': datos['total_venta'],
                'p_id_venta_generada': id_venta_var
            }
        )
        id_venta_generada = int(id_venta_var.getvalue())

        # 2. Validar y preparar detalles
        detalles_para_insertar = []
        for idx, detalle in enumerate(datos['detalles'], 1):
            # Validar campos requeridos
            if not all(k in detalle for k in ('id_medicamento', 'cantidad', 'precio_unitario_venta')):
                raise ValueError(
                    f"Detalle #{idx}: faltan campos requeridos (id_medicamento, cantidad, precio_unitario_venta)")

            # Validar cantidad positiva
            if detalle['cantidad'] <= 0:
                raise ValueError(f"Detalle #{idx}: la cantidad debe ser mayor a 0")

            # Validar precio positivo
            if detalle['precio_unitario_venta'] <= 0:
                raise ValueError(f"Detalle #{idx}: el precio debe ser mayor a 0")

            detalles_para_insertar.append(
                (id_venta_generada, detalle['id_medicamento'], detalle['cantidad'], detalle['precio_unitario_venta'])
            )

        # 3. Insertar detalles uno por uno (evita deadlocks con el trigger)
        sql_insert_detalle = """
                             INSERT INTO Venta_Detalle (id_venta, id_medicamento, cantidad, precio_unitario_venta)
                             VALUES (:1, :2, :3, :4) \
                             """

        for detalle in detalles_para_insertar:
            cursor.execute(sql_insert_detalle, detalle)

        # 4. Confirmar transacción
        connection.commit()

        return jsonify({
            "estado": "exito",
            "mensaje": "Venta registrada exitosamente.",
            "id_venta": id_venta_generada,
            "items_procesados": len(detalles_para_insertar)
        }), 201

    except oracledb.DatabaseError as e:
        # Revertir cambios en caso de error
        if connection:
            try:
                connection.rollback()
            except:
                pass

        error_obj, = e.args
        error_message = error_obj.message

        # Manejo de errores específicos
        if "ORA-20002" in error_message:
            return jsonify({
                "estado": "error",
                "mensaje": "Stock insuficiente para uno o más medicamentos."
            }), 409  # Conflict

        if "ORA-02291" in error_message:
            return jsonify({
                "estado": "error",
                "mensaje": "Medicamento, cliente o empleado no existe en el sistema."
            }), 400  # Bad Request

        if "ORA-01403" in error_message:
            return jsonify({
                "estado": "error",
                "mensaje": "No se encontró el registro especificado."
            }), 404  # Not Found

        return jsonify({
            "estado": "error",
            "mensaje": f"Error en base de datos: {error_message}"
        }), 500

    except ValueError as e:
        # Error de validación de datos
        if connection:
            try:
                connection.rollback()
            except:
                pass
        return jsonify({
            "estado": "error",
            "mensaje": str(e)
        }), 400

    except Exception as e:
        # Error inesperado
        if connection:
            try:
                connection.rollback()
            except:
                pass
        print(f"Error inesperado en registrar_venta: {e}")
        return jsonify({
            "estado": "error",
            "mensaje": f"Error inesperado: {str(e)}"
        }), 500

    finally:
        # Solo cerrar el cursor, NO la conexión (Flask lo hace automáticamente)
        if cursor:
            try:
                cursor.close()
            except:
                pass

@ventas_bp.route('/ventas', methods=['GET'])
def obtener_ventas():
    """
    Obtiene el listado de todas las ventas.
    """
    connection = get_db_connection()
    if not connection:
        return jsonify({
            "estado": "error",
            "mensaje": "No se pudo conectar a la base de datos."
        }), 503

    try:
        cursor = connection.cursor()
        cursor.execute("""
                       SELECT v.id_venta,
                              v.fecha_venta,
                              c.nombre || ' ' || c.apellido AS cliente,
                              e.nombre || ' ' || e.apellido AS empleado,
                              v.total_venta
                       FROM Ventas v
                                JOIN Clientes c ON v.id_cliente = c.id_cliente
                                JOIN Empleados e ON v.id_empleado = e.id_empleado
                       ORDER BY v.fecha_venta DESC
                       """)

        columnas = [col[0].lower() for col in cursor.description]
        ventas = [dict(zip(columnas, row)) for row in cursor.fetchall()]

        return jsonify({
            "estado": "exito",
            "datos": ventas,
            "total": len(ventas)
        }), 200

    except oracledb.Error as e:
        return jsonify({
            "estado": "error",
            "mensaje": f"Error de base de datos: {e}"
        }), 500


@ventas_bp.route('/ventas/<int:id_venta>', methods=['GET'])
def obtener_detalle_venta(id_venta):
    """
    Obtiene el detalle completo de una venta específica.
    """
    connection = get_db_connection()
    if not connection:
        return jsonify({
            "estado": "error",
            "mensaje": "No se pudo conectar a la base de datos."
        }), 503

    try:
        cursor = connection.cursor()

        # Obtener cabecera de venta
        cursor.execute("""
                       SELECT v.id_venta,
                              v.fecha_venta,
                              c.nombre || ' ' || c.apellido AS cliente,
                              c.dni                         AS cliente_dni,
                              e.nombre || ' ' || e.apellido AS empleado,
                              v.total_venta
                       FROM Ventas v
                                JOIN Clientes c ON v.id_cliente = c.id_cliente
                                JOIN Empleados e ON v.id_empleado = e.id_empleado
                       WHERE v.id_venta = :id_venta
                       """, {'id_venta': id_venta})

        venta = cursor.fetchone()
        if not venta:
            return jsonify({
                "estado": "error",
                "mensaje": f"No se encontró la venta con ID {id_venta}"
            }), 404

        columnas_venta = [col[0].lower() for col in cursor.description]
        venta_dict = dict(zip(columnas_venta, venta))

        # Obtener detalles de venta
        cursor.execute("""
                       SELECT vd.id_detalle,
                              m.nombre AS medicamento,
                              vd.cantidad,
                              vd.precio_unitario_venta,
                              vd.subtotal
                       FROM Venta_Detalle vd
                                JOIN Medicamentos m ON vd.id_medicamento = m.id_medicamento
                       WHERE vd.id_venta = :id_venta
                       ORDER BY vd.id_detalle
                       """, {'id_venta': id_venta})

        columnas_detalle = [col[0].lower() for col in cursor.description]
        detalles = [dict(zip(columnas_detalle, row)) for row in cursor.fetchall()]

        venta_dict['detalles'] = detalles

        return jsonify({
            "estado": "exito",
            "datos": venta_dict
        }), 200

    except oracledb.Error as e:
        return jsonify({
            "estado": "error",
            "mensaje": f"Error de base de datos: {e}"
        }), 500