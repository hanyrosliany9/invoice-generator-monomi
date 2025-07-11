/**
 * Simple test to verify React and testing environment are working
 */
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

// Simple component without external dependencies
const SimpleComponent = () => <div data-testid="simple">Hello World</div>

describe('Simple React Test', () => {
  it('renders without crashing', () => {
    render(<SimpleComponent />)
    expect(screen.getByTestId('simple')).toBeInTheDocument()
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })
})