import React, { useState, useRef, useEffect } from 'react'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  HStack,
  IconButton,
  Textarea,
  Image,
  Box,
  Text,
  Switch,
  useDisclosure,
} from '@chakra-ui/react'
import { AddIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons'
import { Recipe } from './RecipeList'
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

interface AddRecipeModalProps {
  isOpen: boolean
  onClose: () => void
  onAddRecipe: (recipe: Recipe) => void
  editingRecipe: Recipe | null
}

export default function AddRecipeModal({
  isOpen,
  onClose,
  onAddRecipe,
  editingRecipe,
}: AddRecipeModalProps) {
  const [name, setName] = useState('')
  const [ingredients, setIngredients] = useState([
    { name: '', amount: '', unit: 'g' },
  ])
  const [instructions, setInstructions] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 25,
    y: 25,
    width: 50,
    height: 50,
  })
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)
  const [isCropping, setIsCropping] = useState(false)

  useEffect(() => {
    if (editingRecipe) {
      setName(editingRecipe.name)
      setIngredients(editingRecipe.ingredients.map(ing => ({
        ...ing,
        amount: ing.amount.toString()
      })))
      setInstructions(editingRecipe.instructions)
      setPhotoUrl(editingRecipe.photoUrl || '')
      setIsPublic(editingRecipe.isPublic)
    } else {
      resetForm()
    }
  }, [editingRecipe])

  const resetForm = () => {
    setName('')
    setIngredients([{ name: '', amount: '', unit: 'g' }])
    setInstructions('')
    setPhotoUrl('')
    setIsPublic(false)
    setCrop({
      unit: '%',
      x: 25,
      y: 25,
      width: 50,
      height: 50,
    })
    setCompletedCrop(null)
  }

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: '', amount: '', unit: 'g' }])
  }

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const handleIngredientChange = (
    index: number,
    field: 'name' | 'amount' | 'unit',
    value: string
  ) => {
    const newIngredients = [...ingredients]
    newIngredients[index] = {
      ...newIngredients[index],
      [field]: field === 'amount' ? value : value,
    }
    setIngredients(newIngredients)
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string)
        setIsCropping(true)
        setCrop({
          unit: '%',
          x: 25,
          y: 25,
          width: 50,
          height: 50,
        })
        setCompletedCrop(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const getCroppedImg = (image: HTMLImageElement, crop: PixelCrop): string => {
    const canvas = document.createElement('canvas')
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    canvas.width = crop.width
    canvas.height = crop.height
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('No 2d context')
    }

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    )

    return canvas.toDataURL('image/jpeg')
  }

  const handleCropComplete = (crop: PixelCrop) => {
    setCompletedCrop(crop)
  }

  const handleSaveCrop = () => {
    if (completedCrop && imgRef.current) {
      const croppedImageUrl = getCroppedImg(imgRef.current, completedCrop)
      setPhotoUrl(croppedImageUrl)
      setIsCropping(false)
    }
  }

  const handleSubmit = () => {
    const recipe: Recipe = {
      id: editingRecipe?.id || Date.now().toString(),
      name,
      ingredients: ingredients.map(ing => ({
        ...ing,
        amount: ing.amount || '0'
      })),
      instructions,
      photoUrl,
      isPublic,
      createdBy: editingRecipe?.createdBy || {
        uid: '',
        email: '',
        username: '',
      },
    }
    onAddRecipe(recipe)
    onClose()
    resetForm()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader color="brand.purple.500">
          {editingRecipe ? 'Edit Recipe' : 'Add New Recipe'}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4}>
            <FormControl>
              <FormLabel>Recipe Photo</FormLabel>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                ref={fileInputRef}
                style={{ display: 'none' }}
              />
              <Box
                position="relative"
                w="100%"
                minH="300px"
                border="2px dashed"
                borderColor="gray.300"
                borderRadius="md"
                display="flex"
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                onClick={() => !isCropping && fileInputRef.current?.click()}
                overflow="hidden"
              >
                {isCropping && photoUrl ? (
                  <VStack w="100%" h="100%" spacing={4} p={4}>
                    <Box w="100%" h="100%" position="relative">
                      <ReactCrop
                        crop={crop}
                        onChange={(c) => setCrop(c)}
                        onComplete={handleCropComplete}
                        aspect={16 / 9}
                        style={{ maxHeight: '100%', width: '100%' }}
                      >
                        <img
                          ref={imgRef}
                          src={photoUrl}
                          style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }}
                          alt="Crop preview"
                        />
                      </ReactCrop>
                    </Box>
                    <HStack spacing={2}>
                      <Button
                        colorScheme="purple"
                        size="sm"
                        onClick={handleSaveCrop}
                      >
                        Save Crop
                      </Button>
                      <Button
                        variant="outline"
                        colorScheme="purple"
                        size="sm"
                        onClick={() => setIsCropping(false)}
                      >
                        Cancel
                      </Button>
                    </HStack>
                  </VStack>
                ) : photoUrl ? (
                  <Box position="relative" w="100%" h="200px">
                    <Image
                      src={photoUrl}
                      alt="Recipe preview"
                      objectFit="cover"
                      w="100%"
                      h="100%"
                      borderRadius="md"
                    />
                    <HStack position="absolute" top={2} right={2} spacing={2}>
                      <IconButton
                        aria-label="Delete photo"
                        icon={<DeleteIcon />}
                        size="sm"
                        colorScheme="red"
                        onClick={(e) => {
                          e.stopPropagation()
                          setPhotoUrl('')
                          if (fileInputRef.current) {
                            fileInputRef.current.value = ''
                          }
                        }}
                      />
                      <IconButton
                        aria-label="Edit crop"
                        icon={<EditIcon />}
                        size="sm"
                        colorScheme="purple"
                        onClick={(e) => {
                          e.stopPropagation()
                          setIsCropping(true)
                        }}
                      />
                    </HStack>
                  </Box>
                ) : (
                  <Text color="gray.500">Click to upload photo</Text>
                )}
              </Box>
            </FormControl>

            <FormControl>
              <FormLabel>Recipe Name</FormLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter recipe name"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Ingredients</FormLabel>
              <VStack spacing={2}>
                {ingredients.map((ingredient, index) => (
                  <HStack key={index}>
                    <Input
                      placeholder="Ingredient name"
                      value={ingredient.name}
                      onChange={(e) =>
                        handleIngredientChange(index, 'name', e.target.value)
                      }
                    />
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={ingredient.amount}
                      onChange={(e) =>
                        handleIngredientChange(index, 'amount', e.target.value)
                      }
                      w="100px"
                    />
                    <Input
                      placeholder="Unit"
                      value={ingredient.unit}
                      onChange={(e) =>
                        handleIngredientChange(index, 'unit', e.target.value)
                      }
                      w="80px"
                    />
                    <IconButton
                      aria-label="Remove ingredient"
                      icon={<DeleteIcon />}
                      onClick={() => handleRemoveIngredient(index)}
                      colorScheme="red"
                      size="sm"
                    />
                  </HStack>
                ))}
                <Button
                  leftIcon={<AddIcon />}
                  onClick={handleAddIngredient}
                  size="sm"
                  alignSelf="start"
                  colorScheme="purple"
                >
                  Add Ingredient
                </Button>
              </VStack>
            </FormControl>

            <FormControl>
              <FormLabel>Instructions</FormLabel>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Enter cooking instructions"
                rows={4}
              />
            </FormControl>

            <HStack w="100%" justify="space-between">
              <Text>Make recipe public</Text>
              <Switch
                isChecked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                colorScheme="purple"
              />
            </HStack>

            <Button
              colorScheme="orange"
              onClick={handleSubmit}
              isDisabled={!name || ingredients.some((i) => !i.name) || !instructions}
              w="100%"
            >
              {editingRecipe ? 'Save Changes' : 'Save Recipe'}
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
} 