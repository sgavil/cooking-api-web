import React, { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Button,
  Container,
  Grid,
  Heading,
  useDisclosure,
  VStack,
  HStack,
  Text,
  Icon,
} from '@chakra-ui/react'
import { AddIcon, SettingsIcon } from '@chakra-ui/icons'
import { FaHeart } from 'react-icons/fa'
import { collection, query, getDocs, addDoc, where, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import RecipeCard from './RecipeCard'
import AddRecipeModal from './AddRecipeModal'
import Profile from './Profile'
import Auth from './Auth'

export interface Recipe {
  id: string
  name: string
  ingredients: Array<{
    name: string
    amount: number | string
    unit: string
  }>
  instructions: string
  photoUrl?: string
  createdBy: {
    uid: string
    email: string
    username: string
  }
  isPublic: boolean
  tags?: string[]
}

export default function RecipeList() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure()
  const { isOpen: isProfileOpen, onOpen: onProfileOpen, onClose: onProfileClose } = useDisclosure()
  const { isOpen: isAuthOpen, onOpen: onAuthOpen, onClose: onAuthClose } = useDisclosure()
  const { currentUser, currentUsername } = useAuth()
  const [viewMode, setViewMode] = useState<'my' | 'public'>('my')
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  // Get unique tags from all recipes
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    recipes.forEach(recipe => {
      recipe.tags?.forEach(tag => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [recipes])

  // Filter recipes by selected tag
  const filteredRecipes = useMemo(() => {
    if (!selectedTag) return recipes
    return recipes.filter(recipe => recipe.tags?.includes(selectedTag))
  }, [recipes, selectedTag])

  useEffect(() => {
    fetchRecipes()
  }, [currentUser, viewMode])

  async function fetchRecipes() {
    if (!currentUser && viewMode === 'my') {
      setRecipes([])
      return
    }

    try {
      const recipesRef = collection(db, 'recipes')
      let q
      if (viewMode === 'my') {
        q = query(recipesRef, where('createdBy.uid', '==', currentUser?.uid))
      } else {
        q = query(recipesRef, where('isPublic', '==', true))
      }
      
      const querySnapshot = await getDocs(q)
      const fetchedRecipes: Recipe[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<Recipe, 'id'>
        fetchedRecipes.push({
          id: doc.id,
          name: data.name,
          ingredients: data.ingredients,
          instructions: data.instructions,
          photoUrl: data.photoUrl,
          createdBy: data.createdBy,
          isPublic: data.isPublic,
          tags: data.tags,
        })
      })
      setRecipes(fetchedRecipes)
    } catch (error) {
      console.error('Error fetching recipes:', error)
    }
  }

  const handleAddRecipe = async (newRecipe: Recipe) => {
    if (!currentUser) return

    try {
      const recipeWithUser = {
        ...newRecipe,
        createdBy: {
          uid: currentUser.uid,
          email: currentUser.email,
          username: currentUsername,
        },
      }
      await addDoc(collection(db, 'recipes'), recipeWithUser)
      fetchRecipes()
      onAddClose()
    } catch (error) {
      console.error('Error adding recipe:', error)
    }
  }

  const handleEditRecipe = async (updatedRecipe: Recipe) => {
    if (!currentUser || currentUser.uid !== updatedRecipe.createdBy.uid) return

    try {
      const recipeRef = doc(db, 'recipes', updatedRecipe.id)
      await updateDoc(recipeRef, {
        name: updatedRecipe.name,
        ingredients: updatedRecipe.ingredients,
        instructions: updatedRecipe.instructions,
        photoUrl: updatedRecipe.photoUrl,
        isPublic: updatedRecipe.isPublic,
        tags: updatedRecipe.tags,
      })
      fetchRecipes()
      setEditingRecipe(null)
      onAddClose()
    } catch (error) {
      console.error('Error updating recipe:', error)
    }
  }

  const handleEditClick = (recipe: Recipe) => {
    setEditingRecipe(recipe)
    onAddOpen()
  }

  const handleRecipeUpdate = () => {
    fetchRecipes()
  }

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!currentUser?.isAdmin) return

    try {
      const recipeRef = doc(db, 'recipes', recipeId)
      await deleteDoc(recipeRef)
      fetchRecipes()
    } catch (error) {
      console.error('Error deleting recipe:', error)
    }
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <HStack justify="space-between" wrap="wrap" spacing={4}>
          <Heading color="brand.purple.500" display="flex" alignItems="center" gap={2}>
            Oli & Chencho Favs
            <Icon as={FaHeart} color="brand.purple.500" />
          </Heading>
          <HStack spacing={4}>
            {currentUser ? (
              <>
                <Button
                  leftIcon={<SettingsIcon />}
                  onClick={onProfileOpen}
                  colorScheme="purple"
                  variant="ghost"
                >
                  Profile
                </Button>
                <Button
                  leftIcon={<AddIcon />}
                  onClick={onAddOpen}
                  colorScheme="orange"
                >
                  Add Recipe
                </Button>
              </>
            ) : (
              <Button onClick={onAuthOpen} colorScheme="purple">
                Log In
              </Button>
            )}
          </HStack>
        </HStack>

        <HStack spacing={4} wrap="wrap">
          <Button
            colorScheme={viewMode === 'my' ? 'purple' : 'gray'}
            onClick={() => {
              setViewMode('my')
              setSelectedTag(null)
            }}
          >
            My Recipes
          </Button>
          <Button
            colorScheme={viewMode === 'public' ? 'purple' : 'gray'}
            onClick={() => {
              setViewMode('public')
              setSelectedTag(null)
            }}
          >
            Public Recipes
          </Button>
        </HStack>

        {allTags.length > 0 && (
          <Box overflowX="auto" pb={2}>
            <HStack spacing={2}>
              <Button
                size="sm"
                colorScheme={selectedTag === null ? 'purple' : 'gray'}
                onClick={() => setSelectedTag(null)}
              >
                All
              </Button>
              {allTags.map(tag => (
                <Button
                  key={tag}
                  size="sm"
                  colorScheme={selectedTag === tag ? 'purple' : 'gray'}
                  onClick={() => setSelectedTag(tag)}
                >
                  {tag}
                </Button>
              ))}
            </HStack>
          </Box>
        )}

        {!currentUser && viewMode === 'my' ? (
          <Text textAlign="center" color="gray.500">
            Please log in to view and manage your recipes
          </Text>
        ) : (
          <Grid
            templateColumns="repeat(auto-fill, minmax(300px, 1fr))"
            gap={4}
            w="100%"
          >
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onEdit={handleEditClick}
                onUpdate={handleRecipeUpdate}
                onDelete={handleDeleteRecipe}
                isAdmin={currentUser?.isAdmin}
              />
            ))}
          </Grid>
        )}
      </VStack>

      <AddRecipeModal
        isOpen={isAddOpen}
        onClose={() => {
          setEditingRecipe(null)
          onAddClose()
        }}
        onAddRecipe={editingRecipe ? handleEditRecipe : handleAddRecipe}
        editingRecipe={editingRecipe}
      />
      
      <Profile
        isOpen={isProfileOpen}
        onClose={onProfileClose}
      />

      <Auth
        isOpen={isAuthOpen}
        onClose={onAuthClose}
      />
    </Container>
  )
} 