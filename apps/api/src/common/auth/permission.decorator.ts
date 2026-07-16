import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

/** Restrict a route to users whose role is allowed the given §6 permission in the RBAC matrix. */
export const Permission = (key: string) => SetMetadata(PERMISSION_KEY, key);
