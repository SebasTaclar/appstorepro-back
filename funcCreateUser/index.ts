import { Context, HttpRequest } from '@azure/functions';
import { Logger } from '../src/shared/Logger';
import { ApiResponseBuilder } from '../src/shared/ApiResponse';
import { getAuthService } from '../src/shared/serviceProvider';
import { withApiHandler } from '../src/shared/apiHandler';

const funcCreateUser = async (
  _context: Context,
  req: HttpRequest,
  log: Logger
): Promise<unknown> => {
  const authService = getAuthService(log);
  const userInfo = await authService.createUser(req.body); 
  return ApiResponseBuilder.success(userInfo, 'User created successfully');
};

export default withApiHandler(funcCreateUser);
