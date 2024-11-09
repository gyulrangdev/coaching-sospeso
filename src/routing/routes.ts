import * as v from "valibot";

export type StaticRoute = { path: string };

export type DynamicRoute = {
  path: string;
  paramsSchema: v.ObjectSchema<
    v.ObjectEntries,
    v.ErrorMessage<v.ObjectIssue> | undefined
  >;
};

type Route = StaticRoute | DynamicRoute;

const pageSchema = v.pipe(v.number(), v.integer(), v.minValue(0));

export const routes = {
  홈: {
    path: "/",
    paramsSchema: v.object({
      page: pageSchema,
    }),
  },
  "소스페소-발행": {
    path: "/sospeso/issuing",
  },
  "소스페소-상세": {
    path: "/sospeso/[sospesoId]",
    paramsSchema: v.object({
      sospesoId: v.pipe(v.string(), v.uuid()),
    }),
  },
  "소스페소-신청": {
    path: "/sospeso/[sospesoId]/application",
    paramsSchema: v.object({
      sospesoId: v.pipe(v.string(), v.uuid()),
    }),
  },
  어드민: {
    path: "/admin",
  },
  "어드민-소스페소-사용": {
    path: "/admin/[sospesoId]/consuming/[consumerId]",
    paramsSchema: v.object({
      sospesoId: v.pipe(v.string(), v.uuid()),
      consumerId: v.pipe(v.string(), v.uuid()),
    }),
  },
} satisfies Record<string, Route>;

export function resolveRoute(key: RouteKeys) {
  return routes[key];
}

export type RouteKeys = keyof typeof routes;