import { extendTheme } from '@chakra-ui/react'

export const theme = extendTheme({
  colors: {
    brand: {
      purple: {
        50: '#f5e9ff',
        100: '#dbc1ff',
        200: '#c199ff',
        300: '#a771ff',
        400: '#8d49ff',
        500: '#742fff',
        600: '#5a24cc',
        700: '#411a99',
        800: '#281066',
        900: '#100633',
      },
      orange: {
        50: '#fff3e6',
        100: '#ffd9b3',
        200: '#ffbf80',
        300: '#ffa64d',
        400: '#ff8c1a',
        500: '#ff7300',
        600: '#cc5c00',
        700: '#994400',
        800: '#662d00',
        900: '#331600',
      },
    },
  },
  styles: {
    global: {
      body: {
        bg: 'gray.50',
      },
    },
  },
}) 