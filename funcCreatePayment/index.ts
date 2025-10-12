import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { withApiHandler } from '../src/shared/apiHandler';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getPurchaseService } from '../src/shared/serviceProvider';
import { CreatePurchaseRequest, CartItem } from '../src/application/services/PurchaseService';

const funcCreatePayment = async (
  _context: Context,
  req: HttpRequest,
  log: Logger
): Promise<unknown> => {
  // Validar campos requeridos del comprador
  const {
    buyerEmail,
    buyerName,
    buyerIdentificationNumber,
    buyerContactNumber,
    shippingAddress,
    items,
  } = req.body;

  if (!buyerEmail || !buyerName || !buyerIdentificationNumber || !buyerContactNumber || !items) {
    return ApiResponseBuilder.validationError([
      'Missing required fields: buyerEmail, buyerName, buyerIdentificationNumber, buyerContactNumber, items',
    ]);
  }

  // Validar items del carrito
  if (!Array.isArray(items) || items.length === 0) {
    return ApiResponseBuilder.validationError(['items must be a non-empty array']);
  }

  // Validar estructura de cada item
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.productId || !item.quantity) {
      return ApiResponseBuilder.validationError([
        `Item ${i + 1}: productId and quantity are required`,
      ]);
    }
    if (typeof item.productId !== 'number' || item.productId <= 0) {
      return ApiResponseBuilder.validationError([
        `Item ${i + 1}: productId must be a positive number`,
      ]);
    }
    if (typeof item.quantity !== 'number' || item.quantity <= 0) {
      return ApiResponseBuilder.validationError([
        `Item ${i + 1}: quantity must be a positive number`,
      ]);
    }
    if (item.selectedColor && typeof item.selectedColor !== 'string') {
      return ApiResponseBuilder.validationError([
        `Item ${i + 1}: selectedColor must be a string if provided`,
      ]);
    }
  }

  // Validar tipos de datos del comprador
  if (
    typeof buyerEmail !== 'string' ||
    typeof buyerName !== 'string' ||
    typeof buyerIdentificationNumber !== 'string' ||
    typeof buyerContactNumber !== 'string'
  ) {
    return ApiResponseBuilder.validationError([
      'buyerEmail, buyerName, buyerIdentificationNumber, and buyerContactNumber must be strings',
    ]);
  }

  if (shippingAddress && typeof shippingAddress !== 'string') {
    return ApiResponseBuilder.validationError(['shippingAddress must be a string if provided']);
  }

  // Crear request object
  const createPurchaseRequest: CreatePurchaseRequest = {
    buyerEmail: buyerEmail.trim(),
    buyerName: buyerName.trim(),
    buyerIdentificationNumber: buyerIdentificationNumber.trim(),
    buyerContactNumber: buyerContactNumber.trim(),
    shippingAddress: shippingAddress?.trim(),
    items: items.map((item: CartItem) => ({
      productId: item.productId,
      quantity: item.quantity,
      selectedColor: item.selectedColor?.trim() || undefined,
    })),
  };

  log.logInfo('Creating purchase with items', {
    buyerEmail: buyerEmail.trim(),
    itemCount: items.length,
    items: items.map((item: CartItem) => ({
      productId: item.productId,
      quantity: item.quantity,
      selectedColor: item.selectedColor,
    })),
  });

  try {
    // Crear la compra usando el servicio modernizado
    const purchaseService = getPurchaseService();
    const result = await purchaseService.createPurchase(createPurchaseRequest);

    log.logInfo('Purchase created successfully', {
      purchaseId: result.purchaseId,
      wompiTransactionId: result.wompiTransactionId,
      totalAmount: result.totalAmount,
      itemCount: result.items.length,
    });

    // Respuesta exitosa
    return ApiResponseBuilder.success(
      {
        message: 'Payment created successfully',
        purchase: {
          id: result.purchaseId,
          totalAmount: result.totalAmount,
          currency: 'COP',
          status: 'PENDING',
          orderStatus: 'PENDING',
          items: result.items,
        },
        payment: {
          wompiTransactionId: result.wompiTransactionId,
          paymentUrl: result.paymentUrl,
          provider: 'WOMPI',
        },
      },
      'Payment created successfully with Wompi'
    );
  } catch (error) {
    log.logError('Error creating purchase', error);

    // Determinar el tipo de error y responder apropiadamente
    if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('not available')) {
        return ApiResponseBuilder.validationError([error.message]);
      }
      if (error.message.includes('Invalid') || error.message.includes('must be')) {
        return ApiResponseBuilder.validationError([error.message]);
      }
    }

    return ApiResponseBuilder.internalServerError(
      'Failed to create payment. Please try again later.'
    );
  }
};

export default withApiHandler(funcCreatePayment);
