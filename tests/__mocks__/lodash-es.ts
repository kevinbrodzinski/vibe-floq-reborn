import * as actual from 'lodash-es'

// 👉 default export (for code that does: import _ from 'lodash-es')
export default actual

// 👉 named re-exports
export * from 'lodash-es'

// explicit 'debounce' in case tree-shaking removed it
export const debounce = actual.debounce