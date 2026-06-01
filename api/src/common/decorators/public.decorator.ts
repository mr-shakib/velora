import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as public, bypassing JwtAuthGuard even when the controller is
 * guarded at the class level. Used e.g. for the invite preview, which someone
 * who isn't logged in (or is logged in as another account) must be able to view.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
