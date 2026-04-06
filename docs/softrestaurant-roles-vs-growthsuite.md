# SoftRestaurant vs GrowthSuite POS — Sistema de Roles y Permisos

## Resumen Ejecutivo

| Aspecto | SoftRestaurant | GrowthSuite POS |
|---|---|---|
| **Modelo** | Perfiles con 164 permisos binarios | Roles con nivel jerárquico + permisos por código |
| **Granularidad** | Extremadamente granular (bit por bit) | Esquema flexible pero poco poblado aún |
| **Usuarios** | 2 entidades separadas: `usuarios` (admin) + `meseros` (operación) | 1 entidad unificada con rol asignado |
| **Autenticación** | Password por usuario/mesero + huella digital opcional | Email+password (admin) / PIN (operación) |

---

## 1. SoftRestaurant — Modelo Detallado

### 1.1 Arquitectura de Entidades

SoftRestaurant maneja **dos tipos de usuarios completamente separados**:

#### A) `usuarios` — Usuarios Administrativos
Acceden al **Back Office** (módulo administrativo).

| Campo | Tipo | Descripción |
|---|---|---|
| `usuario` | varchar | ID/login del usuario |
| `nombre` | varchar | Nombre completo |
| `contraseña` | varchar | Hash de contraseña |
| `administrador` | bit | **Superusuario** — salta TODOS los permisos |
| `perfil` | varchar | FK a `usuariosperfiles` (perfil de permisos) |
| `barraherramientas` | int | Nivel de toolbar visible |
| `accesomodulo` | numeric | Módulos accesibles |
| `status` | bit | Activo/inactivo |

**Flag `administrador`**: Cuando está en `1`, el usuario tiene acceso total sin importar el perfil asignado. Es el equivalente a "root".

**Ejemplo real (La Llorona):**
| Usuario | Nombre | Admin? | Perfil |
|---|---|---|---|
| DULCE | DULCE | ✅ Sí | _(sin perfil, es admin)_ |
| GISS | SISTEMAS | ✅ Sí | _(sin perfil, es admin)_ |
| HECTOR | HECTOR | ✅ Sí | _(sin perfil, es admin)_ |
| ALBERTO | ALBERTO CAPITAN | ❌ No | 04 (SUBGERENTE) |
| FER GERENTE | FER GERENTE | ❌ No | 04 (SUBGERENTE) |

#### B) `meseros` — Usuarios Operativos
Acceden al **Punto de Venta** (comandero, caja).

| Campo | Tipo | Descripción |
|---|---|---|
| `idmesero` | varchar | ID del mesero |
| `nombre` | varchar | Nombre |
| `contraseña` | varchar | PIN numérico |
| `tipo` | int | **1**=Mesero, **2**=Cajero, **3**=Repartidor |
| `visible` | numeric | Visible en lista (1=sí, 2=no/oculto) |
| `tipoacceso` | bit | Restricción de acceso |
| `capturarestringidamesas` | bit | Solo puede operar en mesas asignadas |
| `perfil` | varchar | FK a perfil de permisos (opcional) |
| `comision` | money | % de comisión |
| `accesoindicadormesas` | bit | Puede ver indicador de mesas |
| `autorizaproductosmenuqr` | bit | Puede autorizar productos de menú QR |

**Distribución real (La Llorona):** 198 meseros (tipo 1), 6 cajeros (tipo 2), 1 repartidor (tipo 3).

**Diferencia clave:** El `tipo` del mesero NO es un rol de permisos — es una clasificación funcional que determina qué interfaz usa:
- **Tipo 1 (Mesero)**: Ve la pantalla de mesas, toma órdenes
- **Tipo 2 (Cajero)**: Ve la pantalla de caja, cobra, hace cortes
- **Tipo 3 (Repartidor)**: Ve pantalla de entregas a domicilio

### 1.2 Perfiles de Permisos (`usuariosperfiles`)

Cada perfil tiene **164 campos booleanos** que controlan granularmente cada acción del sistema. Los perfiles se asignan a usuarios y opcionalmente a meseros.

#### Perfiles configurados (La Llorona):

| ID | Nombre | Descripción |
|---|---|---|
| 01 | ADMINISTRADOR | Perfil completo para gerentes generales |
| 03 | GERENTES | Gerentes de piso con permisos de seguridad |
| 04 | SUBGERENTE | Subgerentes con permisos limitados |
| 05 | GERENTEDESCUENTO | Solo para autorizar descuentos/cancelaciones |
| 06 | ADMINISTRACION | Perfil muy restringido (solo acceso admin básico) |

### 1.3 Los 164 Permisos — Desglose por Categoría

#### 🏪 Catálogos (CRUD)
Controlados por `usuariosperfilescatalogo` — tabla auxiliar con permisos `nuevo`, `editar`, `eliminar` por catálogo.

| Catálogo | Descripción |
|---|---|
| PRODUCTOS | Alta, edición y eliminación de productos |
| GRUPOSPRODUCTOS | Grupos/familias de productos |
| SUBGRUPOS | Subgrupos de productos |
| GRUPOSMODIFICADORES | Modificadores (sin cebolla, extra queso, etc.) |
| MESEROS | Gestión de empleados operativos |
| CLIENTES | Base de datos de clientes |
| TIPOCLIENTES | Categorías de clientes |
| INSUMOS | Insumos/ingredientes |
| INSUMOSELABORADOS | Insumos elaborados (salsas, bases) |
| PRESENTACIONES | Presentaciones de productos |
| UNIDADDEMEDIDA | Unidades de medida |
| PROVEEDORES | Proveedores |
| TIPODEPROVEEDOR | Tipos de proveedor |
| ALMACENES | Almacenes/bodegas |
| AREASIMPRESION | Áreas de impresión (cocina, barra) |
| AREASVENTA | Áreas de venta (terraza, salón) |
| CONCEPTOSALMACEN | Conceptos de movimientos de almacén |
| FORMASDEPAGO | Formas de pago |
| PROMOCIONES | Promociones y descuentos |
| TIPODEDESCUENTO | Tipos de descuento |
| TIPODEGASTOS | Tipos de gastos |
| MOTIVOSCANCELACION | Motivos de cancelación |
| MAPADEMESAS | Diseño del mapa de mesas |
| MESAS | Mesas individuales |
| TIPODEMESAS | Tipos de mesa |
| PERFILESUSUARIOS | Gestión de perfiles de permisos |
| USUARIOS | Gestión de usuarios administrativos |
| COMISIONISTAS | Comisionistas |
| TIPOCOMISIONISTAS | Tipos de comisionistas |
| TIPORESERVACIONES | Tipos de reservaciones |
| COLONIAS | Colonias (para domicilio) |
| ZONASDOMICILIO | Zonas de entrega |
| FOLIOSFACTURAS | Folios de facturas |
| FOLIOSVENTA | Folios de venta |
| CUENTASCONTABLES | Cuentas contables |
| FORMATOFACTURAGRAFICO | Formato de factura gráfico |
| FORMATOFACTURATEXTO | Formato de factura texto |
| CMDIMPRESION | Comandos de impresión |
| CLASIFICACIONGRUPOSI | Clasificación de grupos de insumos |
| GRUPOSI | Grupos de insumos |
| TIPOPEDIDO | Tipos de pedido |
| VENTAINSTITUCIONAL | Venta institucional |
| VENTAPREPAGO | Venta prepago |

#### 🍽️ Operación de Punto de Venta

| Permiso | Campo | Descripción |
|---|---|---|
| Servicio comedor | `serviciocomedor` | Acceso a servicio en salón |
| Servicio domicilio | `serviciodomicilio` | Acceso a servicio a domicilio |
| Servicio rápido | `serviciorapido` | Acceso a venta rápida (sin mesa) |
| Cancelaciones | `cancelaciones` | Cancelar productos de una cuenta |
| Reabrir cuenta | `reabrir` | Reabrir una cuenta cerrada |
| Descuentos | `descuentos` | Aplicar descuentos |
| Descuento máximo | `descuentomaximopermitido` | % máximo de descuento permitido (0-100) |
| Incluir propina | `incluirpropina` | Agregar propina a la cuenta |
| Reimprimir | `reimprimir` | Reimprimir tickets/comandas |
| Cambiar producto de mesa | `cambiarproductodemesa` | Mover productos entre mesas |
| Cambio de mesa | `cambiodemesa` | Cambiar mesa de una cuenta |
| Cambio de mesa (mapa) | `cambiodemesamapa` | Cambiar mesa desde el mapa visual |
| Juntar mesas | `juntarmesas` | Unir mesas en una sola cuenta |
| Precio abierto | `seguridadprecioabierto` | Modificar precio en venta |
| Dividir cuentas | `seguridaddividircuentas` | Dividir una cuenta en varias |
| Abrir cajón | `abrircajon` | Abrir cajón de dinero |
| Enviar orden | `enviarorden` | Enviar orden a cocina/barra |

#### 🔐 Autorizaciones de Seguridad

| Permiso | Campo | Descripción |
|---|---|---|
| Autorizar seguridad | `autorizadoseguridad` | Puede ser llamado para autorizar acciones restringidas |
| Cancelar producto rápido | `autorizacioncancelaproductorapido` | Autorizar cancelación sin motivo |
| Cancelar productos | `autorizacioncancelarproductos` | Autorizar cancelación de productos |
| Cierre comandero | `autorizacioncierrecomandero` | Autorizar cierre de comandero |
| Deslizar tarjeta | `autorizaciondeslizartarjeta` | Autorizar pago con tarjeta |
| Cambiar mesero | `autorizacioncambiarmesero` | Autorizar cambio de mesero asignado |
| Cargo extra | `autorizacioncargo` | Autorizar cargos extra |
| Autorizar pedidos | `autorizarpedidos` | Autorizar pedidos pendientes |
| Acumular puntos | `autorizacionacumularpuntos` | Autorizar acumulación de puntos |
| Pago con puntos | `autorizacionpagoconpuntos` | Autorizar pago con puntos |
| Grupos captura | `autorizaciongruposcaptura` | Autorizar grupos de captura |
| Venta crédito | `autorizacionventacredito` | Autorizar venta a crédito |
| Cancelar compras | `autorizacioncancelarcompras` | Autorizar cancelación de compras |
| Cancelar traspasos | `autorizacioncancelartraspasos` | Autorizar cancelación de traspasos |
| Cancelar movtos almacén | `autorizacioncancelarmovtosalmacen` | Autorizar cancelación de movtos |
| Cambiar fecha almacén | `autorizacioncambiarfechaalmacen` | Autorizar cambio de fecha en almacén |
| Modo inventario | `autorizacionmodoinventario` | Autorizar modo inventario |
| TAE | `autorizaciontae` | Autorizar transferencias electrónicas |
| Cerrar turno | `autorizacerrarturno` | Autorizar cierre de turno |
| Producción elaborados | `autorizaproduccionelabora` | Autorizar producción de elaborados |
| Productos menú QR | `autorizaproductosmenuqr` | Autorizar productos de menú QR |
| Abono SACOA | `autoriza_abono_sacoa` | Autorizar abonos SACOA |

#### 💰 Caja y Turnos

| Permiso | Campo | Descripción |
|---|---|---|
| Apertura/cierre turno | `aperturacierreturno` | Abrir y cerrar turnos |
| Pagar propinas | `pagarpropinas` | Pagar propinas a meseros |
| Retiros y depósitos | `retirosdepositos` | Hacer retiros/depósitos de caja |
| Corte de caja | `cortedecaja` | Realizar corte de caja |
| Corte de caja Z | `cortedecajaz` | Corte Z (cierre fiscal) |
| Formas de pago turno | `formasdepagoturno` | Consultar formas de pago del turno |
| Reabrir cuenta pagada | `reabrircuentapagada` | Reabrir una cuenta ya cobrada |
| Folios comandas | `folioscomandas` | Gestionar folios de comandas |
| Activar tipo crédito | `activartipocredito` | Activar tipos de crédito |
| Administrar monitor corte | `administrarmonitorcorte` | Administrar monitor de corte |
| Actualizar tipo de cambio | `actualizatipodecambio` | Actualizar tipo de cambio |

#### 📊 Consultas

| Permiso | Campo | Descripción |
|---|---|---|
| Monitor de ventas | `monitordeventas` | Ver monitor de ventas en tiempo real |
| Consultar turnos | `consultarturnos` | Consultar turnos anteriores |
| Consultar turnos abiertos | `consultarturnosabiertos` | Ver turnos abiertos |
| Consultar precios | `consultadeprecios` | Consultar precios de productos |
| Consultar cuentas | `consultadecuentas` | Consultar cuentas/cheques |
| Consultar facturas | `consultadefacturas` | Consultar facturas emitidas |
| Consultar retiros/depósitos | `consultaderetirosdepositos` | Ver retiros y depósitos |
| Saldo tarjetas | `consultasaldotarjetas` | Consultar saldos de tarjetas |
| Bitácora hotel | `consultabitacorahotel` | Consultar bitácora de hotel |
| Impresora fiscal | `consultaimpresorafiscal` | Consultar impresora fiscal |
| Consultar habitación | `consultahabitacion` | Consultar habitación (hotel) |
| Visualizar Corte X todos | `visualizarcortextodos` | Ver Corte X de todos los turnos |
| Insumos alerta | `consultainsumosalerta` | Ver alertas de insumos bajos |

#### 📈 Reportes

| Permiso | Campo | Descripción |
|---|---|---|
| Reportes administración | `reportesadmon` | Reportes generales |
| Reportes ventas | `reportesventas` | Reportes de ventas |
| Reportes caja | `reportescaja` | Reportes de caja |
| Reportes compras | `reportescompras` | Reportes de compras |
| Reportes almacén | `reportesalmacen` | Reportes de almacén/inventario |
| Reportes costos | `reportescostos` | Reportes de costos |
| Reportes cuentas por pagar | `reportescuentasporpagar` | Reportes de CxP |
| Reportes contabilidad | `reportescontabilidad` | Reportes contables |
| Reporte consolidado | `reporteconsolidado` | Reporte consolidado multi-sucursal |
| Reporte fiscal | `reporte_fiscal` | Reportes fiscales |

#### 📦 Inventario y Compras

| Permiso | Campo | Descripción |
|---|---|---|
| Pedidos | `pedidos` | Crear pedidos a proveedores |
| Órdenes de compra | `ordenesdecompra` | Crear órdenes de compra |
| Compras | `compras` | Registrar compras |
| Movtos almacén | `movtosalmacen` | Movimientos de almacén |
| Traspasos | `traspasos` | Traspasos entre almacenes |
| Inventario físico | `inventariofisico` | Realizar inventario físico |
| Inventario físico ciego | `inventariofisicociego` | Inventario sin ver existencias |
| Elaboración | `elaboracion` | Producción de elaborados |
| Desperdicios | `desperdicios` | Registrar desperdicios |
| Explosión de insumos | `explosioninsumos` | Descomponer recetas en insumos |
| Costos insumos proveedor | `costosinsumosproveedor` | Ver costos de insumos por proveedor |
| Editar almacén | `puedeeditaralmacen` | Editar datos de almacén |
| Editar fecha compras | `editarfechacompras` | Editar fechas en compras |
| Inventario pendiente | `inventariopendiente` | Ver inventario pendiente |
| Recetas productos | `recetaproductos` | Gestionar recetas |
| Recetas insumos elaborados | `recetainsumoselaborados` | Gestionar recetas de elaborados |
| Suspender productos | `suspenderproductos` | Suspender productos (86'd) |

#### 💳 Finanzas

| Permiso | Campo | Descripción |
|---|---|---|
| Facturación | `facturacion` | Emitir facturas |
| Facturación México | `facturacionmexico` | CFDI México |
| Cuentas por cobrar consulta | `cuentasporcobrarconsulta` | Consultar CxC |
| Cuentas por cobrar | `cuentasporcobrar` | Gestionar CxC |
| Cuentas por pagar | `cuentasporpagar` | Gestionar CxP |
| Pago de comisiones | `pagodecomisiones` | Pagar comisiones |
| Cierre diario | `cierrediario` | Cierre contable diario |
| Gastos | `gastos` | Registrar gastos |
| Tarjeta de crédito | `tarjetadecredito` | Gestionar tarjetas |
| Donativos | `donativos` | Registrar donativos |
| Cortesía monedero | `cortesiamonedero` | Cortesía con monedero electrónico |
| Abono monedero | `abonomonedero` | Abonar a monedero electrónico |
| Abonar saldo tarjeta | `abonarsaldotarjeta` | Abonar saldo a tarjetas |

#### ⚙️ Sistema y Mantenimiento

| Permiso | Campo | Descripción |
|---|---|---|
| Configuración | `configuracion` | Acceso a configuración general |
| Cambio de usuario | `cambiodeusuario` | Cambiar de usuario sin salir |
| BD Reindexado | `bdreindexado` | Reindexar base de datos |
| BD Respaldo/Recuperación | `bdrespaldorecuperacion` | Respaldo y recuperación |
| BD Inicializar | `bdinicializar` | ⚠️ Inicializar (borrar) base de datos |
| BD Accesar | `bdaccesar` | Acceder directamente a BD |
| BD Arreglar | `bdarreglar` | Reparar base de datos |
| Exportar/Importar | `manttoexportarimportar` | Exportar e importar datos |
| Herramientas admin | `manttoherramientasadmin` | Herramientas de administrador |
| Password salir sistema | `passwordsalirsistema` | Requerir password para salir |
| Actualizar sistemas | `actualizarsistemas` | Actualizar el sistema |
| Conexión servidor | `conexionservidor` | Configurar conexión al servidor |
| Licencias | `licenciasreg` | Gestionar licencias |
| Empresas | `empresas` | Gestionar empresas |
| Empresas central | `empresascentral` | Gestionar empresas centrales |
| CEDIS | `cedis` | Centro de distribución |
| Bitácora sincronización | `bitacorasinc` | Ver bitácora de sincronización |
| Sincronización | `sincronizacion` | Ejecutar sincronización |
| Descarga catálogos | `descargacatalogos` | Descargar catálogos |
| Carga catálogos | `cargacatalogos` | Cargar catálogos |
| Sincronización catálogos | `sincronizacioncatalogos` | Sincronizar catálogos |

#### 🎱 Módulos Especiales

| Permiso | Campo | Descripción |
|---|---|---|
| Patines control | `patinescontrol` | Control de patines (pista hielo) |
| Patines catálogo | `patinescatalogo` | Catálogo de patines |
| Patines reporte | `patinesreporte` | Reportes de patines |
| Billar control | `billarcontrol` | Control de billar |
| Billar catálogo | `billarcatalogo` | Catálogo de billar |
| Billar reporte | `billarreporte` | Reportes de billar |
| Comedor empleados | `comedorempleados` | Comedor de empleados |
| Repartidores | `repartidores` | Gestión de repartidores |
| Área de venta | `areaventa` | Configurar áreas de venta |
| Sucursales call center | `sucursalescallcenter` | Gestionar sucursales de call center |
| KDS | _(tabla separada)_ | Configuración de Kitchen Display |
| Kiosko | _(tabla separada)_ | Configuración de kioscos autoservicio |

### 1.4 Tablas Auxiliares de Permisos

#### `perfilesdescuentos`
Controla **qué tipos de descuento** puede aplicar cada perfil.
- FK a `tipodescuento` (ej: Vecinos 15%, Empleados 30%, Cortesías 100%)
- Si no hay registros → el perfil usa el permiso general `descuentos`

#### `perfilesformasdepago`
Controla **qué formas de pago** puede usar cada perfil.
- FK a formas de pago
- Si no hay registros → puede usar todas

#### `usuariosperfilescatalogo`
Controla **permisos CRUD por catálogo** (nuevo/editar/eliminar) por perfil.
- Más granular que un simple bit: permite "puede ver pero no eliminar"

### 1.5 Flujo de Autorización

```
Usuario intenta acción
    │
    ├── ¿Es administrador=1? ──→ ✅ PERMITIDO (sin restricciones)
    │
    ├── ¿Tiene perfil asignado?
    │       │
    │       └── Buscar en usuariosperfiles[perfil]
    │               │
    │               ├── ¿Es acción de catálogo? → Buscar en usuariosperfilescatalogo
    │               ├── ¿Es descuento? → Verificar descuentomaximopermitido + perfilesdescuentos
    │               ├── ¿Es forma de pago? → Verificar perfilesformasdepago
    │               └── ¿Es acción operativa? → Verificar bit correspondiente
    │
    └── Sin perfil y sin admin → ❌ DENEGADO
```

### 1.6 Mecanismo de "Autorización de Seguridad"

SoftRestaurant tiene un concepto especial: **autorizaciones en tiempo real**.

Cuando un mesero intenta una acción que no tiene permiso (ej: cancelar un producto), el sistema puede solicitar que un **usuario con `autorizadoseguridad=1`** ingrese su contraseña para autorizar esa acción puntual.

Esto permite:
- Meseros con permisos mínimos
- Gerentes que autorizan excepciones sin dar permisos permanentes
- Trazabilidad de quién autorizó qué

---

## 2. GrowthSuite POS — Modelo Actual

### 2.1 Arquitectura

GrowthSuite usa un modelo más moderno pero **aún en desarrollo**:

#### Roles (fijos, seed)

| ID | Código | Nombre | Nivel |
|---|---|---|---|
| 1 | waiter | Mesero | 1 |
| 2 | cashier | Cajero | 2 |
| 6 | captain | Capitán | 7 |
| 7 | manager | Gerente | 8 |
| 3 | owner | Dueño | 9 |
| 4 | admin | Admin | 10 |
| 5 | superadmin | Super Admin | 99 |

El campo `level` define jerarquía: un usuario con level mayor puede hacer todo lo que hace uno con level menor.

#### Permisos Disponibles (tabla `permissions`)

| Código | Descripción |
|---|---|
| `ORDER_CREATE` | Crear órdenes |
| `DISCOUNT_APPLY` | Aplicar descuentos |
| `PAYMENT_CHARGE` | Cobrar cuentas |

**Solo 3 permisos definidos hasta ahora.**

#### Tablas de Asignación

| Tabla | Descripción | Estado |
|---|---|---|
| `role_permissions` | Permisos por rol | **Vacía** |
| `catalog_permissions` | CRUD por catálogo por rol | **Vacía** |
| `role_payment_methods` | Formas de pago por rol | **Vacía** |

### 2.2 Autenticación

| Superficie | Método |
|---|---|
| Admin (web) | Email + password |
| Comandero | Código pairing del restaurante → PIN del mesero |
| Caja | Código pairing + estación → PIN del cajero |
| Monitor (KDS) | Código pairing (sin usuario) |

---

## 3. Comparativa Directa

### 3.1 Granularidad

| Área | SoftRestaurant | GrowthSuite |
|---|---|---|
| **Permisos definidos** | 164 bits + CRUD por catálogo | 3 permisos |
| **Catálogos con CRUD** | 50+ catálogos individuales | Esquema existe pero vacío |
| **Descuentos** | % máximo + tipos específicos por perfil | Solo bit DISCOUNT_APPLY |
| **Formas de pago** | Control por perfil de cuáles puede usar | Tabla existe pero vacía |
| **Operación POS** | 17+ permisos granulares | Controlado por nivel de rol |
| **Autorizaciones** | 22 tipos de autorización | No existe concepto equivalente |
| **Reportes** | 10 categorías independientes | No hay control por reporte |
| **Inventario** | 17 permisos específicos | No hay control granular |
| **Caja/Turnos** | 11 permisos específicos | Controlado por rol cashier |

### 3.2 Modelo de Permisos

| Aspecto | SoftRestaurant | GrowthSuite |
|---|---|---|
| **Enfoque** | Lista blanca granular (164 bits) | Jerárquico por nivel |
| **Flexibilidad** | Alta — cada acción es un toggle | Baja — todo se basa en level |
| **Facilidad de uso** | Compleja — hay que configurar 164 campos | Simple — asignas un rol y listo |
| **Personalización** | Perfiles custom con cualquier combinación | Roles fijos (seed) |
| **Autorización temporal** | Sí (autorizadoseguridad) | No |
| **Perfiles ilimitados** | Sí | No (7 roles fijos) |

### 3.3 Lo que SoftRestaurant tiene y GrowthSuite NO

1. **Autorización en tiempo real** — Gerente autoriza con su clave sin dar permisos permanentes
2. **Descuento máximo por perfil** — Mesero puede dar hasta 15%, gerente hasta 100%
3. **Control de formas de pago por perfil** — Mesero solo efectivo, gerente todas
4. **Control CRUD granular por catálogo** — Puede editar productos pero no eliminarlos
5. **Flag administrador** — Bypass total de permisos
6. **164 permisos individuales** — Control extremo de cada función
7. **Perfiles customizables** — Crear combinaciones únicas de permisos
8. **Separación usuario admin vs operativo** — Dos entidades con flujos diferentes

### 3.4 Lo que GrowthSuite tiene y SoftRestaurant NO

1. **Jerarquía numérica** — Simplifica la lógica ("level >= 8 puede hacer X")
2. **Modelo relacional limpio** — Tablas normalizadas vs 164 columnas en una tabla
3. **Unificación de usuarios** — Una sola entidad de usuario con rol asignado
4. **Autenticación moderna** — PIN + pairing code vs passwords en texto
5. **API-first** — Permisos verificables por endpoint
6. **Escalabilidad del esquema** — Agregar permisos es un INSERT, no un ALTER TABLE

---

## 4. Recomendaciones para GrowthSuite

### Prioridad Alta (cubrir lo esencial de SR)
1. **Poblar `permissions`** — Al menos los 17 permisos operativos de POS
2. **Poblar `role_permissions`** — Asignar permisos a cada rol
3. **Implementar `descuento_maximo`** — Campo en role_permissions o en roles
4. **Poblar `catalog_permissions`** — CRUD por catálogo
5. **Poblar `role_payment_methods`** — Formas de pago por rol

### Prioridad Media
6. **Autorización temporal** — Concepto de "gerente autoriza" para acciones puntuales
7. **Perfiles custom** — Permitir crear roles personalizados por restaurante
8. **Auditoría** — Log de quién autorizó qué

### Prioridad Baja
9. **Módulos especiales** — Billar, patines, etc. (probablemente no aplica)
10. **Herramientas de BD** — Reindexar, respaldar, etc. (se maneja a nivel infra)

---

_Documento generado el 27 de febrero de 2026 a partir de datos reales de La Llorona (SoftRestaurant) y GrowthSuite POS (Railway)._
