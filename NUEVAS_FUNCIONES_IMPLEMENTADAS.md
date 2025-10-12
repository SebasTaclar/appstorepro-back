# Nuevas Funciones Implementadas

## 1. funcCreatePayment - Sistema Modernizado de Pagos (NUEVO)

**Propósito**: Sistema de pagos modernizado basado en productos y carrito de compras con integración exclusiva a Wompi.

**Endpoint**: `POST /api/v1/payment/create`
**Headers**: `Content-Type: application/json`

**Body de ejemplo**:

```json
{
  "buyerEmail": "cliente@ejemplo.com",
  "buyerName": "Juan Pérez",
  "buyerIdentificationNumber": "12345678",
  "buyerContactNumber": "+573001234567",
  "shippingAddress": "Calle 123 #45-67, Bogotá (Opcional)",
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "selectedColor": "Azul"
    },
    {
      "productId": 3,
      "quantity": 1,
      "selectedColor": "Rojo"
    }
  ]
}
```

**Respuesta exitosa**:

```json
{
  "success": true,
  "message": "Payment created successfully with Wompi",
  "data": {
    "purchase": {
      "id": 123,
      "totalAmount": 45000,
      "currency": "COP",
      "status": "PENDING",
      "orderStatus": "PENDING",
      "items": [
        {
          "productId": 1,
          "productName": "Producto Ejemplo",
          "quantity": 2,
          "unitPrice": 15000,
          "totalPrice": 30000,
          "selectedColor": "Azul"
        }
      ]
    },
    "payment": {
      "wompiTransactionId": "REF-1697901234-abc123",
      "paymentUrl": "https://checkout.wompi.co/p/?...",
      "provider": "WOMPI"
    }
  },
  "timestamp": "2024-10-21T...",
  "statusCode": 200
}
```

**Características principales**:

- ✅ Sistema de carrito con múltiples productos
- ✅ Validación de stock y disponibilidad
- ✅ Soporte para colores de productos
- ✅ Precios históricos con OrderDetail
- ✅ Integración exclusiva con Wompi
- ✅ Validaciones completas de datos

**Validaciones**:

- Todos los campos del comprador son obligatorios excepto `shippingAddress`
- `items` debe ser un array no vacío
- Cada item debe tener `productId` y `quantity` válidos
- `selectedColor` es opcional pero debe existir en el producto
- Los productos deben estar disponibles (`status: 'available'`)
- Validación de formato de email y números de contacto

---

## 2. funcResendEmail - Reenvío de Emails

**Propósito**: Permite reenviar emails de confirmación cuando los usuarios digitaron mal su email.

**Endpoint**: `POST /api/funcResendEmail`
**Headers**: `Authorization: Bearer <token>`

**Body de ejemplo**:

```json
{
  "purchaseId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Validaciones**:

- La compra debe existir
- La compra debe estar APPROVED o COMPLETED
- Solo se puede reenviar el email de la propia compra

---

## 2. funcUpdatePurchase - Actualizar Información de Compra

**Propósito**: Permite actualizar información de una compra existente.

**Endpoint**: `PUT /api/funcUpdatePurchase/{purchaseId}`
**Headers**: `Authorization: Bearer <token>`

**Body de ejemplo**:

```json
{
  "buyerEmail": "nuevo@email.com",
  "buyerName": "Nuevo Nombre",
  "buyerContactNumber": "+57300123456"
}
```

**Validaciones**:

- La compra debe existir
- Solo se puede actualizar la propia compra
- Email debe ser válido si se proporciona
- Los wallpapers deben estar entre 1 y 5000

---

## 3. funcBackupTimer - Backup Automático

**Propósito**: Envía automáticamente emails con backup de datos y estadísticas.

**Horarios**:

- 12:30 PM hora Colombia
- 9:00 PM hora Colombia

**Destinatarios configurados**:

- bustostejedor@gmail.com
- ingeniero.mec.sebastian@gmail.com

**Contenido del email**:

- Estadísticas del día
- Total de compras y ingresos
- Archivo JSON adjunto con todos los datos

---

## Configuración de Entorno

Asegúrate de que estas variables estén en `local.settings.json`:

```json
{
  "BACKUP_TIMER_SCHEDULE": "0 30 17,2 * * *",
  "BACKUP_EMAIL": "bustostejedor@gmail.com,ingeniero.mec.sebastian@gmail.com"
}
```

**Nota**: El horario usa UTC, por eso 17:30 y 02:00 UTC = 12:30 PM y 9:00 PM Colombia.

---

## Correcciones Realizadas

1. **Validación de wallpapers**: Actualizada de 1-1000 a 1-5000 en:
   - PurchaseService.ts
   - WompiPurchaseService.ts

2. **Emails múltiples**: El timer de backup ahora envía a múltiples destinatarios.

3. **Logging mejorado**: Todas las funciones tienen logging detallado para debugging.

---

## Pruebas Recomendadas

1. **Probar funcResendEmail**:
   - Crear una compra
   - Usar el endpoint para reenviar el email
   - Verificar que llegue el email

2. **Probar funcUpdatePurchase**:
   - Actualizar el email de una compra
   - Verificar que se guarde correctamente

3. **Probar funcBackupTimer**:
   - Ejecutar manualmente o esperar a los horarios programados
   - Verificar que lleguen los emails a ambos destinatarios

---

## Archivos Modificados/Creados

### Nuevos archivos:

- `funcCreatePayment/function.json` _(modernizado)_
- `funcCreatePayment/index.ts` _(modernizado)_
- `funcResendEmail/function.json`
- `funcResendEmail/index.ts`
- `funcUpdatePurchase/function.json`
- `funcUpdatePurchase/index.ts`
- `funcBackupTimer/function.json`
- `funcBackupTimer/index.ts`
- `src/infrastructure/DbAdapters/OrderDetailPrismaAdapter.ts` _(nuevo)_
- `src/domain/entities/OrderDetail.ts` _(nuevo)_
- `src/domain/interfaces/IOrderDetailDataSource.ts` _(nuevo)_

### Archivos modificados:

- `src/application/services/PurchaseService.ts` _(modernizado para productos)_
- `src/application/services/WompiPurchaseService.ts`
- `src/infrastructure/services/EmailService.ts` _(adaptado para productos)_
- `src/shared/serviceProvider.ts` _(agregado OrderDetail)_
- `prisma/schema.prisma` _(agregada tabla OrderDetail)_
- `local.settings.json`
- `api-tests.http` _(documentación actualizada)_

### Sistema de Base de Datos:

**Nueva tabla OrderDetail**:

- Normaliza la relación Purchase -> Products
- Preserva precios históricos (unitPrice, totalPrice)
- Soporte para colores seleccionados
- Relación many-to-many entre Purchase y Product

**Migración aplicada**: `add_order_details_and_modernize_purchases`

Todas las funciones siguen las mejores prácticas del proyecto y están listas para producción.
