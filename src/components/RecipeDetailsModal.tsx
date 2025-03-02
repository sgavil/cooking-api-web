import React from 'react'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  Text,
  Badge,
  Image,
  Box,
  Button,
  HStack,
} from '@chakra-ui/react'
import { Recipe } from './RecipeList'

interface RecipeDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  recipe: Recipe | null
}

export default function RecipeDetailsModal({
  isOpen,
  onClose,
  recipe,
}: RecipeDetailsModalProps) {
  if (!recipe) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay
        bg="blackAlpha.300"
        backdropFilter="blur(10px)"
      />
      <ModalContent mx={4}>
        <ModalHeader color="brand.purple.500">{recipe.name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={6} align="stretch">
            {recipe.photoUrl && (
              <Box
                position="relative"
                width="300px"
                height="400px"
                mx="auto"
                overflow="hidden"
                borderRadius="md"
                bg="gray.100"
              >
                <Image
                  src={recipe.photoUrl}
                  alt={recipe.name}
                  objectFit="cover"
                  w="100%"
                  h="100%"
                />
              </Box>
            )}

            <Box>
              <Text
                fontSize="sm"
                color="gray.500"
                mb={4}
              >
                Created by {recipe.createdBy.username}
              </Text>

              {recipe.tags && recipe.tags.length > 0 && (
                <Box mb={4}>
                  <Text
                    fontWeight="bold"
                    fontSize="sm"
                    color="brand.orange.500"
                    mb={2}
                  >
                    Tags:
                  </Text>
                  <HStack spacing={2} wrap="wrap">
                    {recipe.tags.map(tag => (
                      <Badge
                        key={tag}
                        colorScheme="purple"
                        borderRadius="full"
                        px={2}
                        py={1}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </HStack>
                </Box>
              )}

              <Text
                fontWeight="bold"
                fontSize="lg"
                color="brand.orange.500"
                mb={2}
              >
                Ingredients:
              </Text>
              <VStack align="stretch" spacing={2} mb={6}>
                {recipe.ingredients.map((ingredient, index) => (
                  <HStack key={index} justify="space-between">
                    <Text>{ingredient.name}</Text>
                    <Badge colorScheme="purple">
                      {ingredient.amount} {ingredient.unit}
                    </Badge>
                  </HStack>
                ))}
              </VStack>

              <Text fontWeight="bold" mb={2} color="brand.orange.500">
                Instructions:
              </Text>
              <Text
                whiteSpace="pre-wrap"
                color="gray.700"
                lineHeight="tall"
                textAlign="justify"
              >
                {recipe.instructions}
              </Text>
            </Box>

            <Button
              onClick={onClose}
              colorScheme="purple"
              variant="outline"
              mt={4}
            >
              Close
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
} 