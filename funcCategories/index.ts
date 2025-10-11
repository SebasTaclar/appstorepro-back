import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getCategoryService } from '../src/shared/serviceProvider';
import { withApiHandler } from '../src/shared/apiHandler';

const funcCategories = async (
  _context: Context,
  req: HttpRequest,
  log: Logger
): Promise<unknown> => {
  const categoryService = getCategoryService(log);
  const method = req.method?.toUpperCase();
  const categoryId = req.params?.id;

  log.logInfo(`Processing ${method} request for categories`, { categoryId });

  switch (method) {
    case 'GET':
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

    case 'POST': // POST /v1/categories - Crear nueva categoría
    {
      if (categoryId) {
        return ApiResponseBuilder.validationError([
          'ID should not be provided when creating a category',
        ]);
      }
      const newCategory = await categoryService.createCategory(req.body);
      return ApiResponseBuilder.success(newCategory, 'Category created successfully');
    }

    case 'PUT': // PUT /v1/categories/{id} - Actualizar categoría
    {
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
};

export default withApiHandler(funcCategories);
