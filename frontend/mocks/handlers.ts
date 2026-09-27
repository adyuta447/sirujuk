import { rest } from "msw";
import { CASES } from "../lib/sirujuk-data";

export const handlers = [
  rest.get("*/api/v1/referrals", (_request, response, context) =>
    response(context.json(CASES)),
  ),
];
