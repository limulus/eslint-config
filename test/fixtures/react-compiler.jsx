// Intentional lint violations, exercised by test/config.test.js.
// These cover the React Compiler rules that eslint-plugin-react-hooks 7 enables.

import { useEffect, useRef, useState } from 'react'

export function Widget({ items }) {
  const [count, setCount] = useState(0)
  const ref = useRef(0)

  useEffect(() => {
    setCount(items.length) // react-hooks/set-state-in-effect
  }, [items])

  const current = ref.current // react-hooks/refs
  const now = Date.now() // react-hooks/purity

  return (
    <div data-now={now} data-current={current}>
      {count}
    </div>
  )
}
