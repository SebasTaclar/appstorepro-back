import { OrderDetail } from '../entities/OrderDetail';

export interface IOrderDetailDataSource {
  create(orderDetail: Omit<OrderDetail, 'id'>): Promise<OrderDetail>;
  getByPurchaseId(purchaseId: number): Promise<OrderDetail[]>;
  getById(id: number): Promise<OrderDetail | null>;
  update(id: number, orderDetail: Partial<OrderDetail>): Promise<OrderDetail | null>;
  delete(id: number): Promise<boolean>;
}
