import React, { useState } from 'react'
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormErrorMessage,
} from '@chakra-ui/react'
import { useAuth } from '../contexts/AuthContext'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

interface AuthProps {
  isOpen: boolean
  onClose: () => void
}

export default function Auth({ isOpen, onClose }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [usernameError, setUsernameError] = useState('')
  const { login, signup } = useAuth()
  const toast = useToast()

  const checkUsernameAvailability = async (username: string) => {
    const usersRef = collection(db, 'users')
    const q = query(usersRef, where('username', '==', username))
    const querySnapshot = await getDocs(q)
    return querySnapshot.empty
  }

  const validateUsername = (value: string) => {
    if (value.length < 3) {
      return 'Username must be at least 3 characters'
    }
    if (value.length > 20) {
      return 'Username must be less than 20 characters'
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      return 'Username can only contain letters, numbers, and underscores'
    }
    return ''
  }

  const handleUsernameChange = async (value: string) => {
    setUsername(value)
    const validationError = validateUsername(value)
    if (validationError) {
      setUsernameError(validationError)
      return
    }
    setUsernameError('')
  }

  async function handleSubmit() {
    try {
      setLoading(true)
      if (isLogin) {
        await login(email, password)
      } else {
        // Check username validation
        const validationError = validateUsername(username)
        if (validationError) {
          setUsernameError(validationError)
          return
        }

        // Check username availability
        const isAvailable = await checkUsernameAvailability(username)
        if (!isAvailable) {
          setUsernameError('Username is already taken')
          return
        }

        await signup(email, password, username)
      }
      toast({
        title: 'Success',
        description: isLogin ? 'Logged in successfully' : 'Account created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
      onClose()
    } catch (error: any) {
      console.error('Auth error:', error)
      toast({
        title: 'Error',
        description: error?.message || 'Failed to ' + (isLogin ? 'log in' : 'sign up'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader color="brand.purple.500">
          {isLogin ? 'Log In' : 'Sign Up'}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4}>
            {!isLogin && (
              <FormControl isInvalid={!!usernameError}>
                <FormLabel>Username</FormLabel>
                <Input
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="Enter your username"
                />
                <FormErrorMessage>{usernameError}</FormErrorMessage>
              </FormControl>
            )}

            <FormControl>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Password</FormLabel>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </FormControl>

            <Button
              colorScheme="purple"
              onClick={handleSubmit}
              isLoading={loading}
              w="100%"
              isDisabled={!isLogin && !!usernameError}
            >
              {isLogin ? 'Log In' : 'Sign Up'}
            </Button>

            <Text
              color="brand.orange.500"
              cursor="pointer"
              onClick={() => {
                setIsLogin(!isLogin)
                setUsernameError('')
                setUsername('')
              }}
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : 'Already have an account? Log in'}
            </Text>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
} 