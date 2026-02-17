'use client'

import { useState, useCallback, useEffect } from 'react'

// 状态机阶段定义
type CalculatorPhase = 
  | 'NORMAL'           // 阶段一：正常计算模式
  | 'MAGIC_SET'        // 阶段二：魔术设定模式（等号已按，等待清屏）
  | 'MAGIC_SHOW'       // 阶段三：魔术展示模式（逐位显示差值）
  | 'LOCKED'           // 阶段四：锁定模式（差值显示完毕）

// 计算函数（移到组件外部避免闭包问题）
const calculate = (a: number, b: number, op: string): number => {
  switch (op) {
    case '+': return a + b
    case '-': return a - b
    case '×': return a * b
    case '÷': return b !== 0 ? a / b : 0
    default: return b
  }
}

export default function Calculator() {
  // 显示状态
  const [display, setDisplay] = useState('0')
  const [expression, setExpression] = useState('')
  
  // 计算状态
  const [currentValue, setCurrentValue] = useState<string | null>(null)
  const [previousValue, setPreviousValue] = useState<number | null>(null)
  const [operator, setOperator] = useState<string | null>(null)
  const [waitingForOperand, setWaitingForOperand] = useState(false)
  
  // 魔术逻辑状态
  const [phase, setPhase] = useState<CalculatorPhase>('NORMAL')
  const [magicResult, setMagicResult] = useState<number | null>(null) // 阶段一的计算结果
  const [magicDiff, setMagicDiff] = useState<string>('') // 魔术差值
  const [magicIndex, setMagicIndex] = useState(0) // 当前显示到第几位

  // 获取当前日期时间组成的7位数
  const getDateTimeNumber = useCallback(() => {
    const now = new Date()
    const month = now.getMonth() + 1 // 月份不补0
    const day = now.getDate() // 日期不补0
    const hour = now.getHours() // 小时
    const minute = now.getMinutes() // 分钟
    
    // 组合成7位数：月(1位) + 日(2位) + 时(2位) + 分(2位)
    const dateTimeStr = `${month}${day.toString().padStart(2, '0')}${hour.toString().padStart(2, '0')}${minute.toString().padStart(2, '0')}`
    return parseInt(dateTimeStr, 10)
  }, [])

  // 清屏键处理
  const handleClear = useCallback(() => {
    if (phase === 'MAGIC_SET') {
      // 阶段二：魔术设定模式 - 计算差值
      const dateTimeNum = getDateTimeNumber()
      if (magicResult !== null) {
        const diff = dateTimeNum - magicResult
        setMagicDiff(diff.toString())
        setMagicIndex(0)
        setDisplay('') // 清屏
        setExpression('')
        setPhase('MAGIC_SHOW') // 进入阶段三
      }
      return
    }
    
    if (phase === 'MAGIC_SHOW' || phase === 'LOCKED') {
      // 阶段四：重置所有状态
      setPhase('NORMAL')
      setMagicResult(null)
      setMagicDiff('')
      setMagicIndex(0)
    }
    
    // 正常清屏
    setDisplay('0')
    setExpression('')
    setCurrentValue(null)
    setPreviousValue(null)
    setOperator(null)
    setWaitingForOperand(false)
  }, [phase, magicResult, getDateTimeNumber])

  // 页面点击处理（用于魔术展示）
  useEffect(() => {
    const handlePageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // 排除清屏键的点击
      if (target.closest('[data-clear-btn]')) {
        return
      }
      
      if (phase === 'MAGIC_SHOW') {
        // 阶段三：逐位显示差值
        if (magicIndex < magicDiff.length) {
          setDisplay(prev => prev + magicDiff[magicIndex])
          setMagicIndex(prev => prev + 1)
          
          // 检查是否显示完毕
          if (magicIndex === magicDiff.length - 1) {
            setPhase('LOCKED') // 进入阶段四
          }
        }
      }
      // 阶段四LOCKED状态：点击无反应（由清屏键处理）
    }

    if (phase === 'MAGIC_SHOW' || phase === 'LOCKED') {
      document.addEventListener('click', handlePageClick)
      return () => document.removeEventListener('click', handlePageClick)
    }
  }, [phase, magicDiff, magicIndex])

  // 数字输入处理
  const handleNumber = useCallback((num: string) => {
    if (phase === 'MAGIC_SHOW' || phase === 'LOCKED') return
    
    if (waitingForOperand) {
      setDisplay(num)
      setWaitingForOperand(false)
    } else {
      setDisplay(display === '0' ? num : display + num)
    }
  }, [display, waitingForOperand, phase])

  // 小数点处理
  const handleDecimal = useCallback(() => {
    if (phase === 'MAGIC_SHOW' || phase === 'LOCKED') return
    
    if (waitingForOperand) {
      setDisplay('0.')
      setWaitingForOperand(false)
      return
    }
    
    if (!display.includes('.')) {
      setDisplay(display + '.')
    }
  }, [display, waitingForOperand, phase])

  // 运算符处理
  const handleOperator = useCallback((nextOperator: string) => {
    if (phase === 'MAGIC_SHOW' || phase === 'LOCKED') return
    
    const inputValue = parseFloat(display)
    
    if (previousValue === null) {
      setPreviousValue(inputValue)
    } else if (operator) {
      const result = calculate(previousValue, inputValue, operator)
      setDisplay(String(result))
      setPreviousValue(result)
    }
    
    setWaitingForOperand(true)
    setOperator(nextOperator)
    setExpression(`${previousValue !== null ? previousValue : inputValue} ${nextOperator}`)
  }, [display, previousValue, operator, phase])

  // 等号处理
  const handleEquals = useCallback(() => {
    if (phase === 'MAGIC_SHOW' || phase === 'LOCKED') return
    
    const inputValue = parseFloat(display)
    let result: number
    
    if (operator && previousValue !== null) {
      result = calculate(previousValue, inputValue, operator)
      setExpression(`${previousValue} ${operator} ${inputValue} =`)
    } else {
      result = inputValue
    }
    
    // 阶段一：记录计算结果，进入阶段二
    if (phase === 'NORMAL') {
      setMagicResult(result)
      setPhase('MAGIC_SET')
    }
    
    setDisplay(String(result))
    setPreviousValue(null)
    setOperator(null)
    setWaitingForOperand(true)
  }, [display, operator, previousValue, phase])

  // 回退键处理
  const handleBackspace = useCallback(() => {
    if (phase === 'MAGIC_SHOW' || phase === 'LOCKED') return
    
    if (display.length > 1) {
      setDisplay(display.slice(0, -1))
    } else {
      setDisplay('0')
    }
  }, [display, phase])

  // 百分比处理
  const handlePercent = useCallback(() => {
    if (phase === 'MAGIC_SHOW' || phase === 'LOCKED') return
    
    const value = parseFloat(display)
    setDisplay(String(value / 100))
  }, [display, phase])

  // 正负号切换
  const handleToggleSign = useCallback(() => {
    if (phase === 'MAGIC_SHOW' || phase === 'LOCKED') return
    
    const value = parseFloat(display)
    setDisplay(String(-value))
  }, [display, phase])

  // 按钮样式
  const buttonStyle = (type: 'number' | 'operator' | 'equals' | 'function'): React.CSSProperties => ({
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    border: 'none',
    fontSize: '28px',
    fontWeight: type === 'operator' ? '500' : '400',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: type === 'number' ? '#333333' 
                   : type === 'operator' ? '#a5a5a5'
                   : type === 'equals' ? '#ff9f0a'
                   : '#a5a5a5',
    color: type === 'operator' || type === 'function' ? '#000000' : '#ffffff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    userSelect: 'none' as const,
  })

  // 按钮悬停效果
  const getHoverStyle = (type: 'number' | 'operator' | 'equals' | 'function') => {
    const baseStyle = buttonStyle(type)
    const hoverBg = type === 'number' ? '#505050' 
                  : type === 'operator' || type === 'function' ? '#d4d4d4'
                  : '#ffb84d'
    return { ...baseStyle, backgroundColor: hoverBg }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '20px',
      boxSizing: 'border-box',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* 显示区域 */}
      <div style={{
        width: '100%',
        maxWidth: '360px',
        marginBottom: '20px',
      }}>
        {/* 表达式显示 */}
        <div style={{
          height: '30px',
          fontSize: '20px',
          color: '#8e8e93',
          textAlign: 'right',
          paddingRight: '10px',
          marginBottom: '5px',
        }}>
          {expression}
        </div>
        {/* 主显示区 */}
        <div style={{
          fontSize: display.length > 9 ? '48px' : display.length > 6 ? '56px' : '72px',
          fontWeight: '300',
          color: '#ffffff',
          textAlign: 'right',
          paddingRight: '10px',
          overflow: 'hidden',
          wordBreak: 'break-all',
          minHeight: '80px',
          lineHeight: '1.1',
        }}>
          {display}
        </div>
      </div>

      {/* 按钮区域 */}
      <div style={{
        width: '100%',
        maxWidth: '360px',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 72px)',
        gap: '16px',
        justifyContent: 'center',
      }}>
        {/* 第一行：AC、±、%、÷ */}
        <button
          data-clear-btn
          style={buttonStyle('operator')}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, getHoverStyle('operator'))}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyle('operator'))}
          onClick={handleClear}
        >
          {display === '0' && phase === 'NORMAL' ? 'AC' : 'C'}
        </button>
        <button
          style={buttonStyle('function')}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, getHoverStyle('function'))}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyle('function'))}
          onClick={handleToggleSign}
        >
          ±
        </button>
        <button
          style={buttonStyle('function')}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, getHoverStyle('function'))}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyle('function'))}
          onClick={handlePercent}
        >
          %
        </button>
        <button
          style={buttonStyle('operator')}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, getHoverStyle('operator'))}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyle('operator'))}
          onClick={() => handleOperator('÷')}
        >
          ÷
        </button>

        {/* 第二行：7、8、9、× */}
        {['7', '8', '9'].map(num => (
          <button
            key={num}
            style={buttonStyle('number')}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, getHoverStyle('number'))}
            onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyle('number'))}
            onClick={() => handleNumber(num)}
          >
            {num}
          </button>
        ))}
        <button
          style={buttonStyle('operator')}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, getHoverStyle('operator'))}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyle('operator'))}
          onClick={() => handleOperator('×')}
        >
          ×
        </button>

        {/* 第三行：4、5、6、- */}
        {['4', '5', '6'].map(num => (
          <button
            key={num}
            style={buttonStyle('number')}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, getHoverStyle('number'))}
            onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyle('number'))}
            onClick={() => handleNumber(num)}
          >
            {num}
          </button>
        ))}
        <button
          style={buttonStyle('operator')}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, getHoverStyle('operator'))}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyle('operator'))}
          onClick={() => handleOperator('-')}
        >
          −
        </button>

        {/* 第四行：1、2、3、+ */}
        {['1', '2', '3'].map(num => (
          <button
            key={num}
            style={buttonStyle('number')}
            onMouseEnter={(e) => Object.assign(e.currentTarget.style, getHoverStyle('number'))}
            onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyle('number'))}
            onClick={() => handleNumber(num)}
          >
            {num}
          </button>
        ))}
        <button
          style={buttonStyle('operator')}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, getHoverStyle('operator'))}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyle('operator'))}
          onClick={() => handleOperator('+')}
        >
          +
        </button>

        {/* 第五行：回退、0、.、= */}
        <button
          style={{...buttonStyle('number'), fontSize: '24px'}}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, {...getHoverStyle('number'), fontSize: '24px'})}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, {...buttonStyle('number'), fontSize: '24px'})}
          onClick={handleBackspace}
        >
          ⌫
        </button>
        <button
          style={buttonStyle('number')}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, getHoverStyle('number'))}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyle('number'))}
          onClick={() => handleNumber('0')}
        >
          0
        </button>
        <button
          style={buttonStyle('number')}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, getHoverStyle('number'))}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyle('number'))}
          onClick={handleDecimal}
        >
          .
        </button>
        <button
          style={buttonStyle('equals')}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, getHoverStyle('equals'))}
          onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyle('equals'))}
          onClick={handleEquals}
        >
          =
        </button>
      </div>

      {/* 调试信息（可选，开发时显示当前阶段） */}
      <div style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        color: '#666',
        fontSize: '12px',
        fontFamily: 'monospace',
      }}>
        Phase: {phase}
        {magicResult !== null && <span> | Result: {magicResult}</span>}
        {magicDiff && <span> | Diff: {magicDiff}</span>}
      </div>
    </div>
  )
}
