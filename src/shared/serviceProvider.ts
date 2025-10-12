import { Logger } from './Logger';
import { AuthService } from '../application/services/AuthService';
import { CategoryService } from '../application/services/CategoryService';
import { ProductService } from '../application/services/ProductService';
import { HealthService } from '../application/services/HealthService';
import { PurchaseService } from '../application/services/PurchaseService';
import { CleanupService } from '../application/services/CleanupService';
import { MercadoPagoService } from '../infrastructure/services/MercadoPagoService';
import { EmailService } from '../infrastructure/services/EmailService';
import { UserPrismaAdapter } from '../infrastructure/DbAdapters/UserPrismaAdapter';
import { CategoryPrismaAdapter } from '../infrastructure/DbAdapters/CategoryPrismaAdapter';
import { ProductPrismaAdapter } from '../infrastructure/DbAdapters/ProductPrismaAdapter';
import { OrderDetailPrismaAdapter } from '../infrastructure/DbAdapters/OrderDetailPrismaAdapter';
import { IUserDataSource } from '../domain/interfaces/IUserDataSource';
import { ICategoryDataSource } from '../domain/interfaces/ICategoryDataSource';
import { IProductDataSource } from '../domain/interfaces/IProductDataSource';
import { IOrderDetailDataSource } from '../domain/interfaces/IOrderDetailDataSource';
import { getPrismaClient } from '../config/PrismaClient';

/**
 * Service Provider para inyección de dependencias
 * Centraliza la creación de servicios y manejo de dependencias
 */
export class ServiceProvider {
  private static prismaClient = getPrismaClient();

  /**
   * Crea una instancia de UserDataSource (actualmente PrismaAdapter)
   */
  static getUserDataSource(): IUserDataSource {
    return new UserPrismaAdapter();
  }

  /**
   * Crea una instancia de CategoryDataSource (actualmente PrismaAdapter)
   */
  static getCategoryDataSource(): ICategoryDataSource {
    return new CategoryPrismaAdapter();
  }

  /**
   * Crea una instancia de ProductDataSource (actualmente PrismaAdapter)
   */
  static getProductDataSource(): IProductDataSource {
    return new ProductPrismaAdapter();
  }

  /**
   * Crea una instancia de OrderDetailDataSource (actualmente PrismaAdapter)
   */
  static getOrderDetailDataSource(): IOrderDetailDataSource {
    return new OrderDetailPrismaAdapter();
  }

  /**
   * Crea una instancia de AuthService con sus dependencias inyectadas
   */
  static getAuthService(logger: Logger): AuthService {
    const userDataSource = this.getUserDataSource();
    return new AuthService(logger, userDataSource);
  }

  /**
   * Crea una instancia de CategoryService con sus dependencias inyectadas
   */
  static getCategoryService(logger: Logger): CategoryService {
    const categoryDataSource = this.getCategoryDataSource();
    return new CategoryService(logger, categoryDataSource);
  }

  /**
   * Crea una instancia de ProductService con sus dependencias inyectadas
   */
  static getProductService(logger: Logger): ProductService {
    const productDataSource = this.getProductDataSource();
    const categoryDataSource = this.getCategoryDataSource();
    return new ProductService(logger, productDataSource, categoryDataSource);
  }

  /**
   * Crea una instancia de HealthService con sus dependencias inyectadas
   */
  static getHealthService(logger: Logger): HealthService {
    return new HealthService(logger);
  }

  /**
   * Crea una instancia de PurchaseService con sus dependencias inyectadas
   */
  static getPurchaseService(): PurchaseService {
    const orderDetailDataSource = this.getOrderDetailDataSource();
    const productDataSource = this.getProductDataSource();
    return new PurchaseService(this.prismaClient, orderDetailDataSource, productDataSource);
  }

  /**
   * Crea una instancia de CleanupService con sus dependencias inyectadas
   */
  static getCleanupService(logger: Logger): CleanupService {
    const mercadoPagoService = this.getMercadoPagoService();
    return new CleanupService(this.prismaClient, mercadoPagoService, logger);
  }

  /**
   * Crea una instancia de EmailService con sus dependencias inyectadas
   */
  static getEmailService(logger: Logger): EmailService {
    return new EmailService(logger);
  }

  /**
   * Crea una instancia de MercadoPagoService
   */
  static getMercadoPagoService(): MercadoPagoService {
    return new MercadoPagoService();
  }
}

// Export directo de las funciones más usadas para mayor conveniencia
export const getAuthService = (logger: Logger): AuthService => {
  return ServiceProvider.getAuthService(logger);
};

export const getCategoryService = (logger: Logger): CategoryService => {
  return ServiceProvider.getCategoryService(logger);
};

export const getProductService = (logger: Logger): ProductService => {
  return ServiceProvider.getProductService(logger);
};

export const getHealthService = (logger: Logger): HealthService => {
  return ServiceProvider.getHealthService(logger);
};

export const getPurchaseService = (): PurchaseService => {
  return ServiceProvider.getPurchaseService();
};

export const getCleanupService = (logger: Logger): CleanupService => {
  return ServiceProvider.getCleanupService(logger);
};

export const getEmailService = (logger: Logger): EmailService => {
  return ServiceProvider.getEmailService(logger);
};

export const getMercadoPagoService = (): MercadoPagoService => {
  return ServiceProvider.getMercadoPagoService();
};

export const getUserDataSource = (): IUserDataSource => {
  return ServiceProvider.getUserDataSource();
};

export const getCategoryDataSource = (): ICategoryDataSource => {
  return ServiceProvider.getCategoryDataSource();
};

export const getProductDataSource = (): IProductDataSource => {
  return ServiceProvider.getProductDataSource();
};

export const getOrderDetailDataSource = (): IOrderDetailDataSource => {
  return ServiceProvider.getOrderDetailDataSource();
};
