import { Theme } from './types'

export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: {
      primary: '#191919', // Warmer black, better for long reading sessions
      secondary: '#2F3438', // Notion's main window - sophisticated grey
      tertiary: '#3F4448', // Notion's hover color - creates visual depth
    },
    glass: {
      background: 'rgba(47, 52, 56, 0.7)', // Higher opacity for better frosted glass effect
      backdropFilter: 'blur(16px)', // Enhanced blur following 2025 glassmorphism best practices
      border: '1px solid rgba(63, 68, 72, 0.5)', // Stronger border definition
      shadow: '0 8px 32px rgba(0, 0, 0, 0.4)', // Larger, softer shadow for depth
    },
    card: {
      background: 'rgba(47, 52, 56, 0.8)', // More opaque for better content readability
      border: '1px solid rgba(63, 68, 72, 0.4)',
      shadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
    },
    text: {
      primary: '#E3E3E3', // Softer white, easier on eyes during extended use
      secondary: '#979A9B', // Notion's dark mode grey - perfect mid-tone
      tertiary: '#6B7280', // Muted grey for less important content
      inverse: '#191919',
    },
    border: {
      default: 'rgba(151, 154, 155, 0.2)', // Based on Notion grey with transparency
      light: 'rgba(151, 154, 155, 0.1)',
      strong: 'rgba(151, 154, 155, 0.3)',
    },
    status: {
      success: '#4DAB9A', // Notion's dark mode green - softer, more professional
      warning: '#FFA344', // Notion's dark mode orange - warmer tone
      error: '#FF7369', // Notion's dark mode red - less aggressive
      info: '#529CCA', // Notion's dark mode blue - calmer, trustworthy
    },
    accent: {
      primary: '#529CCA', // Notion blue - sophisticated and professional
      secondary: '#9A6DD7', // Notion purple - elegant and creative
      tertiary: '#E255A1', // Notion pink - vibrant yet refined
    },
  },
}

export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: {
      primary: '#FFFFFF', // Pure white for main content area
      secondary: '#F7F6F3', // Notion's sidebar - warm, sophisticated tone
      tertiary: '#F1F1EF', // Notion's grey background - subtle depth
    },
    glass: {
      background: 'rgba(247, 246, 243, 0.85)', // Based on Notion sidebar with high opacity
      backdropFilter: 'blur(16px)', // Enhanced blur for premium glassmorphism effect
      border: '1px solid rgba(225, 224, 220, 0.6)', // Warmer border tone
      shadow: '0 8px 32px rgba(0, 0, 0, 0.08)', // Larger, softer shadow for elevation
    },
    card: {
      background: '#FFFFFF',
      border: '1px solid #E1E0DC', // Warmer border color inspired by Notion
      shadow: '0 2px 8px rgba(0, 0, 0, 0.06)', // Softer, more refined shadow
    },
    text: {
      primary: '#37352F', // Notion's default text - warmer than pure black, better readability
      secondary: '#787774', // Notion's grey text - perfect mid-tone for secondary content
      tertiary: '#9F9A97', // Lighter grey for less important text
      inverse: '#FFFFFF',
    },
    border: {
      default: '#E1E0DC', // Warmer grey border for professional appearance
      light: '#F1F1EF', // Very subtle border for delicate separations
      strong: '#CFCCC8', // Stronger border when emphasis needed
    },
    status: {
      success: '#448361', // Notion's light mode green - professional and trustworthy
      warning: '#D9730D', // Notion's light mode orange - clear without being alarming
      error: '#D44C47', // Notion's light mode red - serious yet refined
      info: '#337EA9', // Notion's light mode blue - confident and reliable
    },
    accent: {
      primary: '#337EA9', // Notion blue - professional and authoritative
      secondary: '#9065B0', // Notion purple - creative and innovative
      tertiary: '#C14C8A', // Notion pink - energetic and engaging
    },
  },
}

export const themes = {
  light: lightTheme,
  dark: darkTheme,
}
