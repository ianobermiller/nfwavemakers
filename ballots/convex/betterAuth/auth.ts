import type { GenericCtx } from '@convex-dev/better-auth';

import type { DataModel } from '../_generated/dataModel';
import { createAuth } from '../auth';

// The Better Auth CLI requires a static instance solely to inspect its schema.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
export const auth = createAuth({} as GenericCtx<DataModel>);
