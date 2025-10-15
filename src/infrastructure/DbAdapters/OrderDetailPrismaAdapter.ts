import { getPrismaClient } from '../../config/PrismaClient';
import { IOrderDetailDataSource } from '../../domain/interfaces/IOrderDetailDataSource';
import { OrderDetail } from '../../domain/entities/OrderDetail';
import { Prisma } from '@prisma/client';

export class OrderDetailPrismaAdapter implements IOrderDetailDataSource {
  private readonly prisma = getPrismaClient();

  public async create(orderDetail: Omit<OrderDetail, 'id'>): Promise<OrderDetail> {
    const newOrderDetail = await this.prisma.orderDetail.create({
      data: {
        purchaseId: orderDetail.purchaseId,
        productName: orderDetail.productName,
        quantity: orderDetail.quantity,
        unitPrice: orderDetail.unitPrice,
        totalPrice: orderDetail.totalPrice,
        selectedColor: orderDetail.selectedColor,
      },
    });

    return this.mapToOrderDetail(newOrderDetail);
  }

  public async getByPurchaseId(purchaseId: number): Promise<OrderDetail[]> {
    const orderDetails = await this.prisma.orderDetail.findMany({
      where: { purchaseId },
      orderBy: { id: 'asc' },
    });

    return orderDetails.map(this.mapToOrderDetail);
  }

  public async getById(id: number): Promise<OrderDetail | null> {
    const orderDetail = await this.prisma.orderDetail.findUnique({
      where: { id },
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
          ...(orderDetail.productName !== undefined && { productName: orderDetail.productName }),
        },
      });

      return this.mapToOrderDetail(updatedOrderDetail);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
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
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return false;
      }
      throw error;
    }
  }

  private mapToOrderDetail(prismaOrderDetail: any): OrderDetail {
    return {
      id: prismaOrderDetail.id,
      purchaseId: prismaOrderDetail.purchaseId,
      productName: prismaOrderDetail.productName,
      quantity: prismaOrderDetail.quantity,
      unitPrice: parseFloat(prismaOrderDetail.unitPrice.toString()),
      totalPrice: parseFloat(prismaOrderDetail.totalPrice.toString()),
      selectedColor: prismaOrderDetail.selectedColor,
    };
  }
}
