// Tell TypeScript that CSS imports are valid side-effects
declare module '*.css'
declare module '*.svg' {
  const content: string
  export default content
}
declare module '*.png' {
  const content: string
  export default content
}
