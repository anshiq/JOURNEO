export type Problem = {
  status: number
  code: string
  title: string
  detail: string
  [key: string]: unknown
}

export class ProblemError extends Error {
  readonly problem: Problem

  constructor(problem: Problem) {
    super(problem.detail || problem.title)
    this.problem = problem
  }

  get status(): number {
    return this.problem.status
  }
}

export async function toProblem(response: Response): Promise<ProblemError> {
  let body: Partial<Problem> = {}
  try {
    body = (await response.clone().json()) as Partial<Problem>
  } catch {
    body = {}
  }
  return new ProblemError({
    ...body,
    status: response.status,
    code: body.code ?? 'http_error',
    title: body.title ?? response.statusText,
    detail: body.detail ?? 'Something went wrong',
  })
}

export function isProblem(error: unknown, status?: number): error is ProblemError {
  return error instanceof ProblemError && (status === undefined || error.status === status)
}
