import React, { useState, useEffect } from 'react'
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
} from '@chakra-ui/react'
import { AddIcon, SettingsIcon } from '@chakra-ui/icons'
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
}

export default function RecipeList() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure()
  const { isOpen: isProfileOpen, onOpen: onProfileOpen, onClose: onProfileClose } = useDisclosure()
  const { isOpen: isAuthOpen, onOpen: onAuthOpen, onClose: onAuthClose } = useDisclosure()
  const { currentUser, currentUsername } = useAuth()
  const [viewMode, setViewMode] = useState<'my' | 'public'>('my')
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)

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
        <HStack justify="space-between" align="center">
          <Heading color="brand.purple.500">Oli & Chencho Favs</Heading>
          <HStack spacing={4}>
            <Button
              variant={viewMode === 'public' ? 'solid' : 'outline'}
              colorScheme="purple"
              onClick={() => setViewMode('public')}
            >
              Oli & Chencho Favs
            </Button>
            <Button
              variant={viewMode === 'my' ? 'solid' : 'outline'}
              colorScheme="purple"
              onClick={() => setViewMode('my')}
            >
              My Personal Recipes
            </Button>
            {currentUser ? (
              <>
                <Button
                  leftIcon={<AddIcon />}
                  onClick={() => {
                    setEditingRecipe(null)
                    onAddOpen()
                  }}
                  bg="brand.orange.400"
                  color="white"
                  _hover={{ bg: 'brand.orange.500' }}
                >
                  Add Recipe
                </Button>
                <Button
                  leftIcon={<SettingsIcon />}
                  onClick={onProfileOpen}
                  variant="ghost"
                  colorScheme="purple"
                >
                  Profile
                </Button>
              </>
            ) : (
              <Button
                onClick={onAuthOpen}
                colorScheme="purple"
              >
                Log In
              </Button>
            )}
          </HStack>
        </HStack>

        {!currentUser && viewMode === 'my' ? (
          <Text textAlign="center" color="gray.500">
            Please log in to view and manage your recipes
          </Text>
        ) : (
          <Grid
            templateColumns="repeat(auto-fill, minmax(300px, 1fr))"
            gap={6}
            w="100%"
          >
            {recipes.map((recipe) => (
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