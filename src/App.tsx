import React from 'react'
import { ChakraProvider, Box } from '@chakra-ui/react'
import RecipeList from './components/RecipeList'
import { theme } from './theme'
import { AuthProvider } from './contexts/AuthContext'

function App() {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <Box minH="100vh" bg="gray.50">
          <RecipeList />
        </Box>
      </AuthProvider>
    </ChakraProvider>
  )
}

export default App 