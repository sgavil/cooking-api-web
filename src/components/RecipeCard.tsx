import React, { useState } from 'react'
import {
  Box,
  Heading,
  Text,
  VStack,
  Badge,
  Image,
  HStack,
  Switch,
  IconButton,
  useToast,
  Button,
} from '@chakra-ui/react'
import { LinkIcon, EditIcon, DeleteIcon } from '@chakra-ui/icons'
import { Recipe } from './RecipeList'
import { useAuth } from '../contexts/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import RecipeDetailsModal from './RecipeDetailsModal'

interface RecipeCardProps {
  recipe: Recipe
  onEdit: (recipe: Recipe) => void
  onUpdate: () => void
  onDelete: (recipeId: string) => Promise<void>
  isAdmin: boolean
}

export default function RecipeCard({ recipe, onEdit, onUpdate, onDelete, isAdmin }: RecipeCardProps) {
  const { currentUser } = useAuth()
  const toast = useToast()
  const isOwner = currentUser?.uid === recipe.createdBy.uid
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  const handleShareToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    if (!isOwner || isUpdating) return

    try {
      setIsUpdating(true)
      const recipeRef = doc(db, 'recipes', recipe.id)
      const newIsPublic = !recipe.isPublic
      await updateDoc(recipeRef, {
        isPublic: newIsPublic
      })
      
      toast({
        title: 'Success',
        description: `Recipe is now ${newIsPublic ? 'public' : 'private'}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
      onUpdate()
    } catch (error) {
      console.error('Error updating recipe:', error)
      toast({
        title: 'Error',
        description: 'Failed to update sharing settings',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/recipe/${recipe.id}`
    navigator.clipboard.writeText(url)
    toast({
      title: 'Link Copied',
      description: 'Recipe link has been copied to clipboard',
      status: 'success',
      duration: 3000,
      isClosable: true,
    })
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isAdmin) return

    try {
      await onDelete(recipe.id)
      toast({
        title: 'Success',
        description: 'Recipe deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete recipe',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  return (
    <>
      <Box
        borderWidth="1px"
        borderRadius="lg"
        overflow="hidden"
        bg="white"
        boxShadow="sm"
        _hover={{ boxShadow: 'md' }}
        transition="all 0.2s"
        maxW="300px"
      >
        <Box
          cursor="pointer"
          onClick={() => setIsDetailsOpen(true)}
          position="relative"
          w="100%"
          pb="133.33%" // 4:3 vertical aspect ratio (133.33% = 4/3 * 100)
        >
          <Image
            src={recipe.photoUrl}
            alt={recipe.name}
            objectFit="cover"
            w="100%"
            h="100%"
            position="absolute"
            top="0"
            left="0"
          />
        </Box>
        <Box p={4}>
          <VStack align="stretch" spacing={4}>
            <HStack justify="space-between" align="center">
              <Box
                cursor="pointer"
                onClick={() => setIsDetailsOpen(true)}
              >
                <Heading size="md" color="brand.purple.500">
                  {recipe.name}
                </Heading>
                <Text fontSize="sm" color="gray.500">
                  Created by {recipe.createdBy.username}
                </Text>
              </Box>
              {isAdmin && (
                <IconButton
                  aria-label="Delete recipe"
                  icon={<DeleteIcon />}
                  onClick={handleDelete}
                  colorScheme="red"
                  size="sm"
                />
              )}
            </HStack>

            {recipe.tags && recipe.tags.length > 0 && (
              <Box>
                <HStack spacing={2} wrap="wrap">
                  {recipe.tags.map(tag => (
                    <Badge
                      key={tag}
                      colorScheme="purple"
                      borderRadius="full"
                      px={2}
                      py={1}
                      fontSize="xs"
                    >
                      {tag}
                    </Badge>
                  ))}
                </HStack>
              </Box>
            )}

            {isOwner && (
              <HStack justify="space-between" align="center" spacing={4}>
                <HStack flex="1">
                  <Text fontSize="sm" color="gray.600">
                    Share publicly
                  </Text>
                  <Switch
                    isChecked={recipe.isPublic}
                    onChange={handleShareToggle}
                    colorScheme="purple"
                    isDisabled={isUpdating}
                  />
                </HStack>
                <Button
                  leftIcon={<EditIcon />}
                  size="sm"
                  colorScheme="purple"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(recipe)
                  }}
                >
                  Edit
                </Button>
              </HStack>
            )}

            {recipe.isPublic && (
              <IconButton
                aria-label="Copy link"
                icon={<LinkIcon />}
                onClick={(e) => {
                  e.stopPropagation()
                  handleCopyLink()
                }}
                size="sm"
                alignSelf="flex-end"
                colorScheme="orange"
              />
            )}

            <Box
              cursor="pointer"
              onClick={() => setIsDetailsOpen(true)}
            >
              <Box>
                <Text fontWeight="bold" mb={2} color="brand.orange.500">
                  Ingredients:
                </Text>
                <VStack align="stretch" spacing={1}>
                  {recipe.ingredients.map((ingredient, index) => (
                    <Text key={index}>
                      {ingredient.name}{' '}
                      <Badge colorScheme="purple">
                        {ingredient.amount} {ingredient.unit}
                      </Badge>
                    </Text>
                  ))}
                </VStack>
              </Box>

              <Box>
                <Text fontWeight="bold" mb={2} color="brand.orange.500">
                  Instructions:
                </Text>
                <Text noOfLines={3} mb={2} textAlign="justify">
                  {truncateText(recipe.instructions)}
                </Text>
                {recipe.instructions.length > 150 && (
                  <Text
                    color="brand.purple.500"
                    fontSize="sm"
                    fontWeight="medium"
                    cursor="pointer"
                    onClick={() => setIsDetailsOpen(true)}
                    _hover={{ textDecoration: 'underline' }}
                  >
                    Read more
                  </Text>
                )}
              </Box>
            </Box>
          </VStack>
        </Box>
      </Box>

      <RecipeDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        recipe={recipe}
      />
    </>
  )
} 