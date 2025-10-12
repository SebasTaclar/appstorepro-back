import { getPrismaClient } from '../../config/PrismaClient';
import { IOrderDetailDataSource } from '../../domain/interfaces/IOrderDetailDataSource';
import { OrderDetail } from '../../domain/entities/OrderDetail';
import { Prisma } from '@prisma/client';

// Tipo para el resultado de Prisma con include
type PrismaOrderDetailWithProduct = Prisma.OrderDetailGetPayload<{
  include: {
    product: {
      select: {
        id: true;
        name: true;
        description: true;
        images: true;
        categoryId: true;
      };
    };
  };
}>;

export class OrderDetailPrismaAdapter implements IOrderDetailDataSource {
  private readonly prisma = getPrismaClient();

  public async create(orderDetail: Omit<OrderDetail, 'id'>): Promise<OrderDetail> {
    const newOrderDetail = await this.prisma.orderDetail.create({
      data: {
        purchaseId: orderDetail.purchaseId,
        productId: orderDetail.productId,
        quantity: orderDetail.quantity,
        unitPrice: orderDetail.unitPrice,
        totalPrice: orderDetail.totalPrice,
        selectedColor: orderDetail.selectedColor,
      },
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
    });

    return this.mapToOrderDetail(newOrderDetail);
  }

  public async getByPurchaseId(purchaseId: number): Promise<OrderDetail[]> {
    const orderDetails = await this.prisma.orderDetail.findMany({
      where: { purchaseId },
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
      orderBy: { id: 'asc' },
    });

    return orderDetails.map(this.mapToOrderDetail);
  }

  public async getById(id: number): Promise<OrderDetail | null> {
    const orderDetail = await this.prisma.orderDetail.findUnique({
      where: { id },
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
    });

    return orderDetail ? this.mapToOrderDetail(orderDetail) : null;
  }

  public async update(id: number, orderDetail: Partial<OrderDetail>): Promise<OrderDetail | null> {
    try {
      const updatedOrderDetail = await this.prisma.orderDetail.update({
        where: { id },
        data: {
          ...(orderDetail.quantity && { quantity: orderDetail.quantity }),
          ...(orderDetail.unitPrice !== undefined && { unitPrice: orderDetail.unitPrice }),
          ...(orderDetail.totalPrice !== undefined && { totalPrice: orderDetail.totalPrice }),
          ...(orderDetail.selectedColor !== undefined && {
            selectedColor: orderDetail.selectedColor,
          }),
        },
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
      });

      return this.mapToOrderDetail(updatedOrderDetail);
    } catch (error) {
      // Solo manejamos el caso específico de "registro no encontrado"
      // Otros errores se propagan al middleware
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null; // OrderDetail not found
      }
      throw error;
    }
  }

  public async delete(id: number): Promise<boolean> {
    try {
      await this.prisma.orderDetail.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      // Solo manejamos el caso específico de "registro no encontrado"
      // Otros errores se propagan al middleware
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false; // OrderDetail not found
      }
      throw error;
    }
  }

  private mapToOrderDetail(prismaOrderDetail: PrismaOrderDetailWithProduct): OrderDetail {
    return {
      id: prismaOrderDetail.id,
      purchaseId: prismaOrderDetail.purchaseId,
      productId: prismaOrderDetail.productId,
      quantity: prismaOrderDetail.quantity,
      unitPrice: parseFloat(prismaOrderDetail.unitPrice.toString()),
      totalPrice: parseFloat(prismaOrderDetail.totalPrice.toString()),
      selectedColor: prismaOrderDetail.selectedColor,
      product: prismaOrderDetail.product
        ? {
            id: prismaOrderDetail.product.id,
            name: prismaOrderDetail.product.name,
            description: prismaOrderDetail.product.description,
            images: JSON.parse(prismaOrderDetail.product.images),
            categoryId: prismaOrderDetail.product.categoryId,
          }
        : undefined,
    };
  }
}
