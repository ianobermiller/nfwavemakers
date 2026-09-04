/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as ballots from "../ballots.js";
import type * as debates from "../debates.js";
import type * as devAuth from "../devAuth.js";
import type * as e2eSeed from "../e2eSeed.js";
import type * as http from "../http.js";
import type * as importInstant from "../importInstant.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_compact from "../lib/compact.js";
import type * as lib_debates from "../lib/debates.js";
import type * as lib_normalizeEmail from "../lib/normalizeEmail.js";
import type * as lib_users from "../lib/users.js";
import type * as lib_validators from "../lib/validators.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  ballots: typeof ballots;
  debates: typeof debates;
  devAuth: typeof devAuth;
  e2eSeed: typeof e2eSeed;
  http: typeof http;
  importInstant: typeof importInstant;
  "lib/auth": typeof lib_auth;
  "lib/compact": typeof lib_compact;
  "lib/debates": typeof lib_debates;
  "lib/normalizeEmail": typeof lib_normalizeEmail;
  "lib/users": typeof lib_users;
  "lib/validators": typeof lib_validators;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
};
