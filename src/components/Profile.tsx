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
} from '@chakra-ui/react'
import { useAuth } from '../contexts/AuthContext'

interface ProfileProps {
  isOpen: boolean
  onClose: () => void
}

export default function Profile({ isOpen, onClose }: ProfileProps) {
  const { currentUser, updateUserPassword, logout } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  async function handlePasswordChange() {
    try {
      setLoading(true)
      await updateUserPassword(newPassword)
      toast({
        title: 'Success',
        description: 'Password has been updated',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
      setNewPassword('')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update password',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await logout()
      onClose()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to log out',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader color="brand.purple.500">My Profile</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4}>
            <Box w="100%">
              <Text fontWeight="bold" mb={2}>
                Email:
              </Text>
              <Text>{currentUser?.email}</Text>
            </Box>

            <FormControl>
              <FormLabel>New Password</FormLabel>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </FormControl>

            <Button
              colorScheme="purple"
              onClick={handlePasswordChange}
              isLoading={loading}
              w="100%"
            >
              Update Password
            </Button>

            <Button
              colorScheme="orange"
              variant="outline"
              onClick={handleLogout}
              w="100%"
            >
              Log Out
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
} 