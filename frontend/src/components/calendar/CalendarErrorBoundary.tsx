import React, { ReactNode } from 'react'
import { Result, Button } from 'antd'

interface CalendarErrorBoundaryProps {
  children: ReactNode
}

interface CalendarErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class CalendarErrorBoundary extends React.Component<
  CalendarErrorBoundaryProps,
  CalendarErrorBoundaryState
> {
  constructor(props: CalendarErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): CalendarErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Calendar error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="Calendar Error"
          subTitle="An error occurred while rendering the calendar. Please try refreshing the page."
          extra={
            <Button type="primary" onClick={this.handleReset}>
              Try Again
            </Button>
          }
        />
      )
    }

    return this.props.children
  }
}
