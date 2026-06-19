export type CallRouteOptions = {
  method: "GET" | "POST" | "PATCH" | "DELETE"
  body?: unknown
  params?: Record<string, string>
  searchParams?: Record<string, string>
  headers?: Record<string, string>
}

export type CallRouteResult<T = any> = {
  status: number
  data: T | null
  error: { message: string; code: string } | null
  raw: Response
}

type AnyRouteHandler = (request: Request, context: any) => Promise<Response>

export async function callRoute<T = any>(
  handler: AnyRouteHandler,
  options: CallRouteOptions,
): Promise<CallRouteResult<T>> {
  const url = new URL("http://localhost/test")
  if (options.searchParams) {
    for (const [key, value] of Object.entries(options.searchParams)) {
      url.searchParams.set(key, value)
    }
  }

  const init: RequestInit = { method: options.method }
  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body)
    init.headers = {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    }
  } else if (options.headers) {
    init.headers = options.headers
  }

  const request = new Request(url.toString(), init)
  const context = { params: Promise.resolve(options.params ?? {}) }
  const response = await handler(request, context)

  type ParsedJson = { data?: T | null; error?: { message: string; code: string } | null }
  let json: ParsedJson | null = null
  try {
    json = (await response.clone().json()) as ParsedJson
  } catch {
    json = null
  }

  return {
    status: response.status,
    data: (json?.data ?? null) as T | null,
    error: json?.error ?? null,
    raw: response,
  }
}
