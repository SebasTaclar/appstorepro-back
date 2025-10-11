import { getPrismaClient } from '../../config/PrismaClient';
import { ICategoryDataSource } from '../../domain/interfaces/ICategoryDataSource';
import { Category } from '../../domain/entities/Category';
import { Prisma } from '@prisma/client';

export class CategoryPrismaAdapter implements ICategoryDataSource {
  private readonly prisma = getPrismaClient();

  public async getAll(query?: unknown): Promise<Category[]> {
    let whereClause: Prisma.CategoryWhereInput = {};

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
      };
    }

    const categories = await this.prisma.category.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return categories as unknown as Category[];
  }

  public async getById(id: number): Promise<Category | null> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return category as unknown as Category | null;
  }

  public async getByName(name: string): Promise<Category | null> {
    const category = await this.prisma.category.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!category) return null;

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    } as unknown as Category;
  }

  public async create(category: Category): Promise<Category> {
    const newCategory = await this.prisma.category.create({
      data: {
        name: category.name,
        description: category.description,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return newCategory as Category;
  }

  public async update(id: number, category: Partial<Category>): Promise<Category | null> {
    try {
      const updatedCategory = await this.prisma.category.update({
        where: { id },
        data: {
          ...(category.name && { name: category.name }),
          ...(category.description !== undefined && { description: category.description }),
        },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedCategory as Category | null;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return null; // Category not found
        }
      }
      throw error;
    }
  }

  public async delete(id: number): Promise<boolean> {
    try {
      await this.prisma.category.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return false; // Category not found
        }
      }
      throw error;
    }
  }
}
