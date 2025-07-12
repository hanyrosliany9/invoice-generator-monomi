declare module 'jest-axe' {
  export function axe(element: Element): Promise<any>
  export function toHaveNoViolations(this: jest.MatcherUtils, results: any): jest.CustomMatcherResult
}