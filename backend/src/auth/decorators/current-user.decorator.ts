import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user; // Fixed: was request.users (plural)
    
    // If a specific property is requested, return that property
    return data ? user?.[data] : user;
  },
);
