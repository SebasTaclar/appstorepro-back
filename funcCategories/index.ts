import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getCategoryService } from '../src/shared/serviceProvider';
import { withApiHandler } from '../src/shared/apiHandler';
import { AuthenticatedUser } from '../src/shared/authMiddleware';
import { validateAuthToken } from '../src/shared/authHelper';

const funcCategories = async (
  _context: Context,
  req: HttpRequest,
  log: Logger
): Promise<unknown> => {
  const categoryService = getCategoryService(log);
  const method = req.method?.toUpperCase();
  const categoryId = req.params?.id;

  // Si es GET, no requiere autenticación
  if (method === 'GET') {
    log.logInfo(`Processing ${method} request for categories (public)`, { categoryId });

    if (categoryId) {
      // GET /v1/categories/{id} - Obtener categoría por ID
      const category = await categoryService.getCategoryById(categoryId);
      return ApiResponseBuilder.success(category, 'Category retrieved successfully');
    } else {
      // GET /v1/categories - Obtener todas las categorías
      const categories = await categoryService.getAllCategories(req.query);
      return ApiResponseBuilder.success(
        {
          count: categories.length,
          categories: categories,
        },
        'Categories retrieved successfully'
      );
    }
  }

  // Para métodos que no sean GET, requiere autenticación
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader) {
    log.logError('Authentication failed: Missing authorization header');
    return ApiResponseBuilder.error('Unauthorized: Missing authorization header', 401);
  }

  try {
    // Validar y extraer el token
    const token = validateAuthToken(authHeader);

    // Verificar el token y extraer la información del usuario
    const { verifyToken } = await import('../src/shared/jwtHelper');
    const userPayload = verifyToken(token);

    const user: AuthenticatedUser = {
      id: userPayload.id,
      email: userPayload.email,
      name: userPayload.name,
      role: userPayload.role,
      membershipPaid: userPayload.membershipPaid,
    };

    log.logInfo(`User authenticated successfully: ${user.email}`);

    log.logInfo(`Processing ${method} request for categories (authenticated)`, {
      categoryId,
      userId: user.id,
    });

    switch (method) {
      case 'POST': {
        // POST /v1/categories - Crear nueva categoría
        if (categoryId) {
          return ApiResponseBuilder.validationError([
            'ID should not be provided when creating a category',
          ]);
        }
        const newCategory = await categoryService.createCategory(req.body);
        return ApiResponseBuilder.success(newCategory, 'Category created successfully');
      }

      case 'PUT': {
        // PUT /v1/categories/{id} - Actualizar categoría
        if (!categoryId) {
          return ApiResponseBuilder.validationError(['Category ID is required for update']);
        }
        const updatedCategory = await categoryService.updateCategory(categoryId, req.body);
        return ApiResponseBuilder.success(updatedCategory, 'Category updated successfully');
      }

      case 'DELETE':
        // DELETE /v1/categories/{id} - Eliminar categoría
        if (!categoryId) {
          return ApiResponseBuilder.validationError(['Category ID is required for deletion']);
        }
        await categoryService.deleteCategory(categoryId);
        return ApiResponseBuilder.success(null, 'Category deleted successfully');

      default:
        return ApiResponseBuilder.validationError([`HTTP method ${method} not supported`]);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    log.logError(`Authentication failed: ${errorMessage}`);

    if (
      errorMessage.toLowerCase().includes('unauthorized') ||
      errorMessage.toLowerCase().includes('invalid token')
    ) {
      return ApiResponseBuilder.error('Unauthorized: Invalid or expired token', 401);
    }

    return ApiResponseBuilder.error(`Error: ${errorMessage}`, 500);
  }
};

export default withApiHandler(funcCategories);
