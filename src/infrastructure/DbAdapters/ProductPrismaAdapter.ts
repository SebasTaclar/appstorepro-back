import { getPrismaClient } from '../../config/PrismaClient';
import { IProductDataSource } from '../../domain/interfaces/IProductDataSource';
import { Product } from '../../domain/entities/Product';
import { Prisma } from '@prisma/client';

export class ProductPrismaAdapter implements IProductDataSource {
  private readonly prisma = getPrismaClient();

  public async getAll(query?: unknown): Promise<Product[]> {
    let whereClause: Prisma.ProductWhereInput = {};

    // Handle query filtering
    if (query && typeof query === 'object') {
      const queryObj = query as Record<string, unknown>;

      whereClause = {
        ...(typeof queryObj.name === 'string' && {
          name: { contains: queryObj.name, mode: 'insensitive' as const },
        }),
        ...(typeof queryObj.description === 'string' && {
          description: { contains: queryObj.description, mode: 'insensitive' as const },
        }),
        ...(typeof queryObj.categoryId === 'string' && {
          categoryId: parseInt(queryObj.categoryId),
        }),
        ...(typeof queryObj.status === 'string' && {
          status: queryObj.status,
        }),
        ...(typeof queryObj.isShowcase === 'string' && {
          isShowcase: queryObj.isShowcase === 'true',
        }),
        ...(typeof queryObj.minPrice === 'string' && {
          price: { gte: parseFloat(queryObj.minPrice) },
        }),
        ...(typeof queryObj.maxPrice === 'string' && {
          price: { lte: parseFloat(queryObj.maxPrice) },
        }),
      };
    }

    const products = await this.prisma.product.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return products.map(this.mapToProduct);
  }

  public async getById(id: number): Promise<Product | null> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return product ? this.mapToProduct(product) : null;
  }

  public async getByCategory(categoryId: number): Promise<Product[]> {
    const products = await this.prisma.product.findMany({
      where: { categoryId },
      orderBy: { createdAt: 'desc' },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return products.map(this.mapToProduct);
  }

  public async getShowcaseProducts(): Promise<Product[]> {
    const products = await this.prisma.product.findMany({
      where: { isShowcase: true },
      orderBy: { createdAt: 'desc' },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return products.map(this.mapToProduct);
  }

  public async create(product: Product): Promise<Product> {
    const newProduct = await this.prisma.product.create({
      data: {
        name: product.name,
        description: product.description,
        price: product.price,
        originalPrice: product.originalPrice,
        images: JSON.stringify(product.images),
        categoryId: product.categoryId,
        status: product.status,
        colors: product.colors ? JSON.stringify(product.colors) : null,
        isShowcase: product.isShowcase,
        showcaseImage: product.showcaseImage,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return this.mapToProduct(newProduct);
  }

  public async update(id: number, product: Partial<Product>): Promise<Product | null> {
    try {
      const updatedProduct = await this.prisma.product.update({
        where: { id },
        data: {
          ...(product.name && { name: product.name }),
          ...(product.description && { description: product.description }),
          ...(product.price !== undefined && { price: product.price }),
          ...(product.originalPrice !== undefined && { originalPrice: product.originalPrice }),
          ...(product.images && { images: JSON.stringify(product.images) }),
          ...(product.categoryId && { categoryId: product.categoryId }),
          ...(product.status && { status: product.status }),
          ...(product.colors !== undefined && {
            colors: product.colors ? JSON.stringify(product.colors) : null,
          }),
          ...(product.isShowcase !== undefined && { isShowcase: product.isShowcase }),
          ...(product.showcaseImage !== undefined && { showcaseImage: product.showcaseImage }),
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      });

      return this.mapToProduct(updatedProduct);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return null; // Product not found
        }
      }
      throw error;
    }
  }

  public async delete(id: number): Promise<boolean> {
    try {
      await this.prisma.product.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return false; // Product not found
        }
      }
      throw error;
    }
  }

  private mapToProduct(prismaProduct: any): Product {
    return {
      id: prismaProduct.id,
      name: prismaProduct.name,
      description: prismaProduct.description,
      price: parseFloat(prismaProduct.price.toString()),
      originalPrice: prismaProduct.originalPrice
        ? parseFloat(prismaProduct.originalPrice.toString())
        : undefined,
      images: JSON.parse(prismaProduct.images),
      categoryId: prismaProduct.categoryId,
      status: prismaProduct.status as 'available' | 'out-of-stock' | 'coming-soon',
      colors: prismaProduct.colors ? JSON.parse(prismaProduct.colors) : undefined,
      isShowcase: prismaProduct.isShowcase,
      showcaseImage: prismaProduct.showcaseImage,
      createdAt: prismaProduct.createdAt,
      updatedAt: prismaProduct.updatedAt,
      category: prismaProduct.category
        ? {
            id: prismaProduct.category.id,
            name: prismaProduct.category.name,
            description: prismaProduct.category.description,
          }
        : undefined,
    };
  }
}
