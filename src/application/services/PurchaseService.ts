import { PrismaClient } from '@prisma/client';
import { WompiService } from '../../infrastructure/services/WompiService';
import { Logger } from '../../shared/Logger';
import { IOrderDetailDataSource } from '../../domain/interfaces/IOrderDetailDataSource';
import { IProductDataSource } from '../../domain/interfaces/IProductDataSource';
import { ValidationError } from '../../shared/exceptions';

export interface CartItem {
  productId: number;
  quantity: number;
  selectedColor?: string;
}

export interface CreatePurchaseRequest {
  // Datos del comprador
  buyerEmail: string;
  buyerName: string;
  buyerIdentificationNumber: string;
  buyerContactNumber: string;
  shippingAddress?: string;

  // Items del carrito
  items: CartItem[];
}

export interface CreatePurchaseResponse {
  success: true;
  purchaseId: number;
  wompiTransactionId: string;
  paymentUrl: string;
  totalAmount: number;
  items: {
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    selectedColor?: string;
  }[];
}

// Interfaces adicionales para tipado estricto
interface ProductForValidation {
  id: number;
  name: string;
  price: number;
  status: string;
  colors: string | string[];
}

interface ValidatedCartItem extends CartItem {
  product: ProductForValidation;
  unitPrice: number;
  totalPrice: number;
}

interface FormattedPurchase {
  id: number;
  buyerEmail: string;
  buyerName: string;
  buyerContactNumber?: string;
  status: string;
  orderStatus: string;
  amount: number;
  currency: string;
  mercadopagoPaymentId?: string;
  wallpaperNumbers?: number[]; // Para compatibilidad con código existente
  items: Array<{
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    selectedColor?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

interface PurchaseStatistics {
  totalPurchases: number;
  approvedCount: number;
  completedCount: number;
  pendingCount: number;
  cancelledCount: number;
  rejectedCount: number;
  failedCount: number;
  totalRevenue: number;
  uniqueProductsSold: number;
}

interface BackupData {
  statistics: PurchaseStatistics;
  allPurchases: FormattedPurchase[];
  generatedAt: string;
}

interface UpdatePurchaseData {
  buyerEmail?: string;
  buyerName?: string;
  buyerContactNumber?: string;
}

interface UpdatePurchaseResult {
  success: boolean;
  message: string;
  updatedPurchase: FormattedPurchase;
}

interface PurchaseUpdateFields {
  updatedAt: Date;
  buyerEmail?: string;
  buyerName?: string;
  buyerContactNumber?: string;
}

export class PurchaseService {
  private prisma: PrismaClient;
  private wompiService: WompiService;
  private orderDetailDataSource: IOrderDetailDataSource;
  private productDataSource: IProductDataSource;

  constructor(
    prisma: PrismaClient,
    orderDetailDataSource: IOrderDetailDataSource,
    productDataSource: IProductDataSource
  ) {
    this.prisma = prisma;
    this.wompiService = new WompiService();
    this.orderDetailDataSource = orderDetailDataSource;
    this.productDataSource = productDataSource;
  }

  async createPurchase(request: CreatePurchaseRequest): Promise<CreatePurchaseResponse> {
    try {
      Logger.info('Creating purchase with items', {
        buyerEmail: request.buyerEmail,
        itemCount: request.items.length,
      });

      // 1. Validaciones básicas
      this.validatePurchaseRequest(request);

      // 2. Validar items y calcular total
      const validatedItems = await this.validateAndCalculateItems(request.items);
      const totalAmount = validatedItems.reduce((sum, item) => sum + item.totalPrice, 0);

      // 3. Crear Purchase principal
      const externalReference = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const purchase = await this.prisma.purchase.create({
        data: {
          buyerEmail: request.buyerEmail,
          buyerName: request.buyerName,
          buyerIdentificationNumber: request.buyerIdentificationNumber,
          buyerContactNumber: request.buyerContactNumber,
          shippingAddress: request.shippingAddress,
          status: 'PENDING',
          orderStatus: 'PENDING',
          amount: Math.round(totalAmount * 100), // Convertir a centavos
          currency: 'COP',
          paymentProvider: 'WOMPI',
          externalReference: externalReference,
          preferenceId: '', // Se actualizará después
        },
      });

      // 4. Crear OrderDetails para cada item
      for (const item of validatedItems) {
        await this.orderDetailDataSource.create({
          purchaseId: purchase.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          selectedColor: item.selectedColor,
        });
      }

      // 5. Crear transacción en Wompi (mantener estructura que ya funciona)
      const wompiTransaction = await this.wompiService.createPayment({
        wallpaperNumbers: validatedItems.map((item) => item.productId), // Mapear productIds como wallpaperNumbers para compatibilidad
        amount: totalAmount,
        buyerEmail: request.buyerEmail,
        buyerName: request.buyerName,
        buyerIdentificationNumber: request.buyerIdentificationNumber,
        buyerContactNumber: request.buyerContactNumber,
      });

      // 6. Actualizar Purchase con datos de Wompi
      await this.prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          preferenceId: wompiTransaction.transactionId,
          wompiTransactionId: wompiTransaction.transactionId,
        },
      });

      Logger.info('Purchase created successfully', {
        purchaseId: purchase.id,
        wompiTransactionId: wompiTransaction.transactionId,
        totalAmount: totalAmount,
      });

      return {
        success: true,
        purchaseId: purchase.id,
        wompiTransactionId: wompiTransaction.transactionId,
        paymentUrl: wompiTransaction.paymentUrl,
        totalAmount: totalAmount,
        items: validatedItems.map((item) => ({
          productId: item.productId,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          selectedColor: item.selectedColor,
        })),
      };
    } catch (error) {
      Logger.error('Error creating purchase', error);
      throw error;
    }
  }

  private validatePurchaseRequest(request: CreatePurchaseRequest): void {
    // Validar items
    if (!request.items || request.items.length === 0) {
      throw new ValidationError('At least one item is required');
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(request.buyerEmail)) {
      throw new ValidationError('Invalid email format');
    }

    // Validar nombre
    if (!request.buyerName || request.buyerName.trim().length < 2) {
      throw new ValidationError('Buyer name must be at least 2 characters long');
    }

    // Validar número de identificación
    if (!request.buyerIdentificationNumber || request.buyerIdentificationNumber.length < 6) {
      throw new ValidationError('Identification number must be at least 6 characters long');
    }

    // Validar número de contacto
    if (!request.buyerContactNumber || request.buyerContactNumber.length < 10) {
      throw new ValidationError('Contact number must be at least 10 characters long');
    }
  }

  private async validateAndCalculateItems(items: CartItem[]): Promise<ValidatedCartItem[]> {
    const validatedItems: ValidatedCartItem[] = [];

    for (const item of items) {
      // Validar cantidad
      if (!item.quantity || item.quantity <= 0) {
        throw new ValidationError(`Quantity must be greater than 0 for product ${item.productId}`);
      }

      // Obtener producto
      const product = await this.productDataSource.getById(item.productId);
      if (!product) {
        throw new ValidationError(`Product ${item.productId} not found`);
      }

      // Verificar disponibilidad
      if (product.status !== 'available') {
        throw new ValidationError(`Product ${product.name} is not available`);
      }

      // Validar color si se especifica
      if (item.selectedColor) {
        const colorsString = typeof product.colors === 'string' ? product.colors : '[]';
        const availableColors = JSON.parse(colorsString);
        if (!availableColors.includes(item.selectedColor)) {
          throw new ValidationError(
            `Color ${item.selectedColor} not available for ${product.name}`
          );
        }
      }

      const unitPrice = Number(product.price);
      const totalPrice = unitPrice * item.quantity;

      validatedItems.push({
        ...item,
        product: product as ProductForValidation,
        unitPrice,
        totalPrice,
      });
    }

    return validatedItems;
  }

  // Mantener métodos existentes para compatibilidad
  async updatePaymentStatus(
    wompiTransactionId: string,
    status: string,
    paymentData?: { externalReference?: string; [key: string]: unknown }
  ): Promise<void> {
    try {
      Logger.info('Updating payment status', {
        wompiTransactionId,
        status,
        externalReference: paymentData?.externalReference,
      });

      // Buscar purchase por wompiTransactionId o externalReference
      let purchase = await this.prisma.purchase.findFirst({
        where: {
          wompiTransactionId: wompiTransactionId,
        },
      });

      if (!purchase && paymentData?.externalReference) {
        purchase = await this.prisma.purchase.findFirst({
          where: {
            externalReference: paymentData.externalReference,
          },
        });
      }

      if (!purchase) {
        Logger.warn('Purchase not found for payment', {
          wompiTransactionId,
          externalReference: paymentData?.externalReference,
        });
        return;
      }

      // Actualizar status
      await this.prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          status: status,
          wompiTransactionId: wompiTransactionId,
          updatedAt: new Date(),
        },
      });

      Logger.info('Payment status updated successfully', {
        purchaseId: purchase.id,
        oldStatus: purchase.status,
        newStatus: status,
        wompiTransactionId,
      });
    } catch (error) {
      Logger.error('Error updating payment status', error);
      throw error;
    }
  }

  async getPurchasesByEmail(email: string): Promise<FormattedPurchase[]> {
    try {
      Logger.info('Getting purchases by email', { email });

      const purchases = await this.prisma.purchase.findMany({
        where: { buyerEmail: email },
        include: {
          orderDetails: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  images: true,
                  categoryId: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      const formattedPurchases: FormattedPurchase[] = purchases.map((purchase) => ({
        id: purchase.id,
        buyerEmail: purchase.buyerEmail,
        buyerName: purchase.buyerName,
        buyerContactNumber: purchase.buyerContactNumber,
        status: purchase.status,
        orderStatus: purchase.orderStatus,
        amount: purchase.amount,
        currency: purchase.currency,
        mercadopagoPaymentId: purchase.mercadopagoPaymentId,
        wallpaperNumbers: purchase.orderDetails.map((detail) => detail.productId), // Para compatibilidad
        items: purchase.orderDetails.map((detail) => ({
          productId: detail.productId,
          productName: detail.product?.name || 'Unknown Product',
          quantity: detail.quantity,
          unitPrice: Number(detail.unitPrice),
          totalPrice: Number(detail.totalPrice),
          selectedColor: detail.selectedColor,
        })),
        createdAt: purchase.createdAt,
        updatedAt: purchase.updatedAt,
      }));

      Logger.info('Purchases retrieved successfully', {
        email,
        count: formattedPurchases.length,
      });

      return formattedPurchases;
    } catch (error) {
      Logger.error('Error getting purchases by email', error);
      throw error;
    }
  }

  // Otros métodos mantenidos para compatibilidad...
  async getAllPurchases(): Promise<FormattedPurchase[]> {
    // Implementación similar adaptada para OrderDetails
    return [];
  }

  async getWallpaperStatus(): Promise<{ approved: number[]; pending: number[] }> {
    // Mantener para compatibilidad, pero puede devolver vacío
    return { approved: [], pending: [] };
  }

  async generateBackupData(logger: Logger): Promise<BackupData> {
    try {
      logger.logInfo('Generating backup data');

      const purchases = await this.prisma.purchase.findMany({
        include: {
          orderDetails: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const statistics = {
        totalPurchases: purchases.length,
        approvedCount: 0,
        completedCount: 0,
        pendingCount: 0,
        cancelledCount: 0,
        rejectedCount: 0,
        failedCount: 0,
        totalRevenue: 0,
        uniqueProductsSold: 0,
      };

      const soldProducts = new Set<number>();

      for (const purchase of purchases) {
        const status = purchase.status.toUpperCase();
        switch (status) {
          case 'APPROVED':
            statistics.approvedCount++;
            statistics.totalRevenue += purchase.amount;
            purchase.orderDetails.forEach((detail) => soldProducts.add(detail.productId));
            break;
          case 'COMPLETED':
            statistics.completedCount++;
            statistics.totalRevenue += purchase.amount;
            purchase.orderDetails.forEach((detail) => soldProducts.add(detail.productId));
            break;
          case 'PENDING':
            statistics.pendingCount++;
            break;
          case 'CANCELLED':
            statistics.cancelledCount++;
            break;
          case 'REJECTED':
            statistics.rejectedCount++;
            break;
          case 'FAILED':
            statistics.failedCount++;
            break;
        }
      }

      statistics.uniqueProductsSold = soldProducts.size;

      const formattedPurchases: FormattedPurchase[] = purchases.map((purchase) => ({
        id: purchase.id,
        buyerEmail: purchase.buyerEmail,
        buyerName: purchase.buyerName,
        buyerContactNumber: purchase.buyerContactNumber,
        status: purchase.status,
        orderStatus: purchase.orderStatus,
        amount: purchase.amount,
        currency: purchase.currency,
        mercadopagoPaymentId: purchase.mercadopagoPaymentId,
        wallpaperNumbers: purchase.orderDetails.map((detail) => detail.productId), // Para compatibilidad
        items: purchase.orderDetails.map((detail) => ({
          productId: detail.productId,
          productName: detail.product?.name || 'Unknown',
          quantity: detail.quantity,
          unitPrice: Number(detail.unitPrice),
          totalPrice: Number(detail.totalPrice),
          selectedColor: detail.selectedColor,
        })),
        createdAt: purchase.createdAt,
        updatedAt: purchase.updatedAt,
      }));

      return {
        statistics,
        allPurchases: formattedPurchases,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.logError('Error generating backup data', error);
      throw error;
    }
  }

  async resendEmailForPurchase(
    purchaseId: string,
    logger: Logger
  ): Promise<{ success: boolean; message: string }> {
    try {
      logger.logInfo('Resending email for purchase', { purchaseId });

      const purchase = await this.prisma.purchase.findUnique({
        where: { id: parseInt(purchaseId) },
        include: {
          orderDetails: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!purchase) {
        throw new Error('Purchase not found');
      }

      const isSuccessfulPayment = ['APPROVED', 'COMPLETED'].includes(purchase.status.toUpperCase());
      if (!isSuccessfulPayment) {
        throw new Error(
          `Cannot resend email. Purchase status is: ${purchase.status}. Only APPROVED or COMPLETED purchases can have emails resent.`
        );
      }

      const emailData = {
        buyerEmail: purchase.buyerEmail,
        buyerName: purchase.buyerName,
        buyerContactNumber: purchase.buyerContactNumber || 'No proporcionado',
        items: purchase.orderDetails.map((detail) => ({
          productName: detail.product?.name || 'Unknown Product',
          quantity: detail.quantity,
          unitPrice: Number(detail.unitPrice),
          totalPrice: Number(detail.totalPrice),
        })),
        totalAmount: purchase.amount,
        currency: purchase.currency,
        status: purchase.status,
        paymentId: purchase.wompiTransactionId || 'N/A',
        purchaseDate: purchase.updatedAt,
      };

      const { getEmailService } = await import('../../shared/serviceProvider');
      const emailService = getEmailService(logger);
      await emailService.sendPaymentConfirmationEmail(emailData);

      return {
        success: true,
        message: 'Payment confirmation email resent successfully',
      };
    } catch (error) {
      logger.logError('Error resending email for purchase.', error);
      throw error;
    }
  }

  async updatePurchase(
    purchaseId: string,
    updateData: UpdatePurchaseData,
    logger: Logger
  ): Promise<UpdatePurchaseResult> {
    try {
      logger.logInfo('Updating purchase', { purchaseId, updateData });

      const purchase = await this.prisma.purchase.findUnique({
        where: { id: parseInt(purchaseId) },
        include: {
          orderDetails: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!purchase) {
        throw new Error('Purchase not found');
      }

      if (updateData.buyerEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updateData.buyerEmail)) {
          throw new Error('Invalid email format');
        }
      }

      if (updateData.buyerName && updateData.buyerName.trim().length < 2) {
        throw new Error('Buyer name must be at least 2 characters long');
      }

      const dataToUpdate: PurchaseUpdateFields = { updatedAt: new Date() };
      if (updateData.buyerEmail) dataToUpdate.buyerEmail = updateData.buyerEmail;
      if (updateData.buyerName) dataToUpdate.buyerName = updateData.buyerName.trim();
      if (updateData.buyerContactNumber)
        dataToUpdate.buyerContactNumber = updateData.buyerContactNumber;

      const updatedPurchase = await this.prisma.purchase.update({
        where: { id: purchase.id },
        data: dataToUpdate,
        include: {
          orderDetails: {
            include: {
              product: true,
            },
          },
        },
      });

      const formattedPurchase: FormattedPurchase = {
        id: updatedPurchase.id,
        buyerEmail: updatedPurchase.buyerEmail,
        buyerName: updatedPurchase.buyerName,
        buyerContactNumber: updatedPurchase.buyerContactNumber,
        status: updatedPurchase.status,
        orderStatus: updatedPurchase.orderStatus,
        amount: updatedPurchase.amount,
        currency: updatedPurchase.currency,
        mercadopagoPaymentId: updatedPurchase.mercadopagoPaymentId,
        wallpaperNumbers: updatedPurchase.orderDetails.map((detail) => detail.productId), // Para compatibilidad
        items: updatedPurchase.orderDetails.map((detail) => ({
          productId: detail.productId,
          productName: detail.product?.name || 'Unknown Product',
          quantity: detail.quantity,
          unitPrice: Number(detail.unitPrice),
          totalPrice: Number(detail.totalPrice),
          selectedColor: detail.selectedColor,
        })),
        createdAt: updatedPurchase.createdAt,
        updatedAt: updatedPurchase.updatedAt,
      };

      return {
        success: true,
        message: 'Purchase updated successfully',
        updatedPurchase: formattedPurchase,
      };
    } catch (error) {
      logger.logError('Error updating purchase', error);
      throw error;
    }
  }
}
