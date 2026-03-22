'use client'

import { useState } from 'react'
import { Delete } from 'lucide-react'

type Operator = '+' | '-' | '×' | '÷'

interface CalcState {
  display: string
  expression: string
  stored: number | null
  operator: Operator | null
  justEvaled: boolean
  waitingForOperand: boolean
}

const INIT: CalcState = {
  display: '0',
  expression: '',
  stored: null,
  operator: null,
  justEvaled: false,
  waitingForOperand: false,
}

function evalOp(a: number, b: number, op: Operator): number {
  switch (op) {
    case '+': return a + b
    case '-': return a - b
    case '×': return a * b
    case '÷': return b !== 0 ? a / b : 0
  }
}

function fmt(n: number): string {
  if (!isFinite(n)) return '0'
  return parseFloat(n.toFixed(4)).toString()
}

export function AmountCalculator({
  initialValue = '0',
  onChange,
}: {
  initialValue?: string
  onChange: (val: string) => void
}) {
  const [state, setState] = useState<CalcState>({
    ...INIT,
    display: initialValue && initialValue !== '0' ? initialValue : '0',
  })

  function inputDigit(d: string) {
    let next: string
    let nextState: CalcState
    if (state.justEvaled || state.waitingForOperand) {
      next = d
      nextState = { ...state, display: next, justEvaled: false, waitingForOperand: false }
    } else {
      next = state.display === '0' ? d : state.display + d
      nextState = { ...state, display: next }
    }
    setState(nextState)
    onChange(next)
  }

  function inputDecimal() {
    if (state.justEvaled || state.waitingForOperand) {
      setState({ ...state, display: '0.', justEvaled: false, waitingForOperand: false })
      return
    }
    if (state.display.includes('.')) return
    setState({ ...state, display: state.display + '.' })
  }

  function clear() {
    setState({ ...INIT })
    onChange('0')
  }

  function backspace() {
    if (state.justEvaled || state.waitingForOperand) return
    const next = state.display.length > 1 ? state.display.slice(0, -1) : '0'
    setState({ ...state, display: next })
    onChange(next)
  }

  function percent() {
    const result = fmt(parseFloat(state.display) / 100)
    setState({ ...state, display: result, justEvaled: false, waitingForOperand: false })
    onChange(result)
  }

  function handleOperator(op: Operator) {
    const current = parseFloat(state.display)
    if (state.stored !== null && state.operator && !state.waitingForOperand) {
      const result = evalOp(state.stored, current, state.operator)
      const resultStr = fmt(result)
      setState({
        display: resultStr,
        expression: `${resultStr} ${op}`,
        stored: result,
        operator: op,
        justEvaled: false,
        waitingForOperand: true,
      })
      onChange(resultStr)
    } else {
      setState({
        ...state,
        expression: `${state.display} ${op}`,
        stored: current,
        operator: op,
        justEvaled: false,
        waitingForOperand: true,
      })
    }
  }

  function handleEquals() {
    if (state.stored === null || !state.operator) {
      setState({ ...state, justEvaled: true })
      onChange(state.display)
      return
    }
    const result = evalOp(state.stored, parseFloat(state.display), state.operator)
    const resultStr = fmt(result)
    setState({
      display: resultStr,
      expression: '',
      stored: null,
      operator: null,
      justEvaled: true,
      waitingForOperand: false,
    })
    onChange(resultStr)
  }

  const { display, expression } = state

  type BtnDef = {
    label: React.ReactNode
    kind: 'digit' | 'op' | 'action' | 'equals'
    action: () => void
    wide?: boolean
  }

  const rows: BtnDef[][] = [
    [
      { label: 'C', kind: 'action', action: clear },
      { label: <Delete className="h-4 w-4 mx-auto" />, kind: 'action', action: backspace },
      { label: '%', kind: 'action', action: percent },
      { label: '÷', kind: 'op', action: () => handleOperator('÷') },
    ],
    [
      { label: '7', kind: 'digit', action: () => inputDigit('7') },
      { label: '8', kind: 'digit', action: () => inputDigit('8') },
      { label: '9', kind: 'digit', action: () => inputDigit('9') },
      { label: '×', kind: 'op', action: () => handleOperator('×') },
    ],
    [
      { label: '4', kind: 'digit', action: () => inputDigit('4') },
      { label: '5', kind: 'digit', action: () => inputDigit('5') },
      { label: '6', kind: 'digit', action: () => inputDigit('6') },
      { label: '-', kind: 'op', action: () => handleOperator('-') },
    ],
    [
      { label: '1', kind: 'digit', action: () => inputDigit('1') },
      { label: '2', kind: 'digit', action: () => inputDigit('2') },
      { label: '3', kind: 'digit', action: () => inputDigit('3') },
      { label: '+', kind: 'op', action: () => handleOperator('+') },
    ],
    [
      { label: '0', kind: 'digit', action: () => inputDigit('0'), wide: true },
      { label: '.', kind: 'digit', action: inputDecimal },
      { label: '=', kind: 'equals', action: handleEquals },
    ],
  ]

  return (
    <div className="flex flex-col gap-1.5">
      {/* Display */}
      <div className="bg-muted rounded-lg px-3 pt-1.5 pb-2 text-right">
        <p className="text-xs text-muted-foreground min-h-[1rem]">{expression}</p>
        <p className="text-3xl font-mono font-semibold truncate leading-tight">{display}</p>
      </div>

      {/* Button grid */}
      <div className="flex flex-col gap-1">
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-4 gap-1">
            {row.map((btn, bi) => (
              <button
                key={bi}
                type="button"
                onClick={btn.action}
                className={[
                  'flex items-center justify-center rounded-lg h-12 text-base font-medium select-none transition-colors active:scale-95',
                  btn.wide ? 'col-span-2' : '',
                  btn.kind === 'digit'  ? 'bg-background border hover:bg-muted'                   : '',
                  btn.kind === 'action' ? 'bg-muted text-muted-foreground hover:bg-muted/60'       : '',
                  btn.kind === 'op'     ? 'bg-primary/10 text-primary hover:bg-primary/20 text-lg' : '',
                  btn.kind === 'equals' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : '',
                ].join(' ')}
              >
                {btn.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
