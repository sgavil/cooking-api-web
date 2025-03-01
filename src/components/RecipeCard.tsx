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
import { LinkIcon, EditIcon } from '@chakra-ui/icons'
import { Recipe } from './RecipeList'
import { useAuth } from '../contexts/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

interface RecipeCardProps {
  recipe: Recipe
  onEdit: (recipe: Recipe) => void
  onUpdate: () => void
}

export default function RecipeCard({ recipe, onEdit, onUpdate }: RecipeCardProps) {
  const { currentUser } = useAuth()
  const toast = useToast()
  const isOwner = currentUser?.uid === recipe.createdBy.uid
  const [isUpdating, setIsUpdating] = useState(false)

  const handleShareToggle = async () => {
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

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      bg="white"
      boxShadow="sm"
      _hover={{ boxShadow: 'md' }}
      transition="all 0.2s"
    >
      {recipe.photoUrl && (
        <Image
          src={recipe.photoUrl}
          alt={recipe.name}
          objectFit="cover"
          w="100%"
          h="200px"
        />
      )}
      <Box p={6}>
        <VStack align="stretch" spacing={4}>
          <Box>
            <Heading size="md" color="brand.purple.500">
              {recipe.name}
            </Heading>
            <Text fontSize="sm" color="gray.500">
              Created by {recipe.createdBy.username}
            </Text>
          </Box>

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
                onClick={() => onEdit(recipe)}
              >
                Edit
              </Button>
            </HStack>
          )}

          {recipe.isPublic && (
            <IconButton
              aria-label="Copy link"
              icon={<LinkIcon />}
              onClick={handleCopyLink}
              size="sm"
              alignSelf="flex-end"
              colorScheme="orange"
            />
          )}

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
            <Text>{recipe.instructions}</Text>
          </Box>
        </VStack>
      </Box>
    </Box>
  )
} 