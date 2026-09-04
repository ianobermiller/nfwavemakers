import { httpRouter } from 'convex/server';
import type { CreateAuth } from '@convex-dev/better-auth';

import type { DataModel } from './_generated/dataModel';
import { authComponent, createAuth } from './auth';

const http = httpRouter();

authComponent.registerRoutes(http, createAuth as CreateAuth<DataModel>, { cors: true });

export default http;
