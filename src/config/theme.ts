import { extendTheme } from '@chakra-ui/react';
import './../index.css'

const theme = extendTheme({
  fonts: {
    heading: `'Nunito Sans', sans-serif`,
    body: `'Roboto', sans-serif`
  },
  colors: {
    brand: {
      bg: '#0B1116',        // app background
      surface: '#0F151A',   // app shell / columns
       surfaceLight: '#FFFFFF', // light mode column surface
       lightBg: '#EEE3CB',      // light mode app background (kept same as before)
      column: '#14181D',    // column surface
      popoverBg: '#0F1720', // popover background
      cardText: '#E6EDF3',
      muted: '#9AA6B2'
    },
    badge: {
      purple: '#C6B3FF',
      purpleText: '#0B0F12',
      purpleTextInverse: '#ffffff',
      yellow: '#FFE28A',
      yellowText: '#0B0F12',
      yellowTextInverse: '#ffffff',
      red: '#FF8A8A',
      redText: '#0B0F12',
      redTextInverse: '#ffffff',
      green: '#9AE6B4',
      greenText: '#0B0F12',
      greenTextInverse: '#ffffff',
      blue: '#A6D5FA',
      blueText: '#0B0F12',
      blueTextInverse: '#ffffff'
    },
    card: {
      teal: '#8EEFE0',
      lavender: '#E9D8FF',
      pastelBlue: '#CFF7FF',
      pastelYellow: '#FFF0A6'
    }
  },
  styles: {
    global: (props: { colorMode: string }) => ({
      body: {
  bg: props.colorMode === 'dark' ? 'brand.bg' : 'brand.lightBg'
      }
    })
  }
  ,
  components: {
    Popover: {
      baseStyle: {
        content: (props: Record<string, unknown>) => ({
          bg: (props['colorMode'] as string) === 'dark' ? 'brand.popoverBg' : '#FFFFFF',
          border: '1px solid',
          borderColor: (props['colorMode'] as string) === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(2,6,23,0.06)',
          boxShadow: (props['colorMode'] as string) === 'dark' ? '0 8px 24px rgba(2,8,20,0.55)' : '0 6px 18px rgba(2,6,23,0.08)',
          color: (props['colorMode'] as string) === 'dark' ? '#FFFFFF' : 'inherit'
        })
      }
    },
    Badge: {
      baseStyle: {
        borderRadius: 'md',
        px: 2,
        fontSize: '0.75rem',
        fontWeight: 600,
        color: '#0B0F12' // fixed black text for badges in both modes
      },
      variants: {
        subtleLight: {
          bg: 'whiteAlpha.100',
          color: 'brand.cardText'
        },
        purple: {
          bg: 'badge.purple'
        },
        yellow: {
          bg: 'badge.yellow'
        },
        red: {
          bg: 'badge.red'
        },
        green: {
          bg: 'badge.green'
        },
        blue: {
          bg: 'badge.blue'
        }
      }
    }
  }
    ,
    Textarea: {
      baseStyle: {
        bg: (props: Record<string, unknown>) => (props['colorMode'] as string) === 'dark' ? 'brand.popoverBg' : 'brand.surfaceLight',
        borderRadius: 'md',
        border: '1px solid',
        borderColor: (props: Record<string, unknown>) => (props['colorMode'] as string) === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(2,6,23,0.06)',
        color: (props: Record<string, unknown>) => (props['colorMode'] as string) === 'dark' ? '#FFFFFF' : 'inherit',
        _placeholder: {
          color: (props: Record<string, unknown>) => (props['colorMode'] as string) === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(2,6,23,0.4)'
        }
      }
    },
    Input: {
      baseStyle: {
        bg: (props: Record<string, unknown>) => (props['colorMode'] as string) === 'dark' ? 'brand.popoverBg' : 'brand.surfaceLight',
        borderRadius: 'md',
        border: '1px solid',
        borderColor: (props: Record<string, unknown>) => (props['colorMode'] as string) === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(2,6,23,0.06)',
        color: (props: Record<string, unknown>) => (props['colorMode'] as string) === 'dark' ? '#FFFFFF' : 'inherit',
        _placeholder: {
          color: (props: Record<string, unknown>) => (props['colorMode'] as string) === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(2,6,23,0.4)'
        }
      }
    },
    Select: {
      baseStyle: {
        field: {
          bg: (props: Record<string, unknown>) => (props['colorMode'] as string) === 'dark' ? 'brand.popoverBg' : 'brand.surfaceLight',
          borderRadius: 'md',
          border: '1px solid',
          borderColor: (props: Record<string, unknown>) => (props['colorMode'] as string) === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(2,6,23,0.06)',
          color: (props: Record<string, unknown>) => (props['colorMode'] as string) === 'dark' ? '#FFFFFF' : 'inherit',
          _placeholder: {
            color: (props: Record<string, unknown>) => (props['colorMode'] as string) === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(2,6,23,0.4)'
          }
        }
      }
    }
});

export default theme;