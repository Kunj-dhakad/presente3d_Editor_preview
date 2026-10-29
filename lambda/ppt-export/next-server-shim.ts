/**
 * Stand-in for "next/server" in the Lambda bundle: the shared server code only
 * uses NextResponse.json, which is the standard Response.json.
 */
export const NextResponse = { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) };
export type NextRequest = Request;
