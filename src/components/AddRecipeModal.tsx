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
  useToast,
  Spinner,
} from '@chakra-ui/react'
import { AddIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons'
import { Recipe } from './RecipeList'
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import DOMPurify from 'dompurify'

// Constants for image restrictions
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_DIMENSION = 2048;

// Text input restrictions
const MAX_TEXT_LENGTH = {
  name: 100,
  instructions: 5000,
  ingredient: 50,
};

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
  const [isUploading, setIsUploading] = useState(false)
  const toast = useToast()

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

  const sanitizeText = (text: string, maxLength: number): string => {
    // First, sanitize the HTML/script content
    const sanitized = DOMPurify.sanitize(text, {
      ALLOWED_TAGS: [], // Remove all HTML tags
      ALLOWED_ATTR: [], // Remove all attributes
    });
    
    // Then trim and limit the length
    return sanitized.trim().slice(0, maxLength);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedName = sanitizeText(e.target.value, MAX_TEXT_LENGTH.name);
    setName(sanitizedName);
  };

  const handleInstructionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const sanitizedInstructions = sanitizeText(e.target.value, MAX_TEXT_LENGTH.instructions);
    setInstructions(sanitizedInstructions);
  };

  const handleIngredientChange = (
    index: number,
    field: 'name' | 'amount' | 'unit',
    value: string
  ) => {
    const newIngredients = [...ingredients];
    let sanitizedValue = value;

    if (field === 'name') {
      sanitizedValue = sanitizeText(value, MAX_TEXT_LENGTH.ingredient);
    } else if (field === 'unit') {
      sanitizedValue = sanitizeText(value, 10); // Limit unit length
    } else {
      // For amount, only allow numbers and decimal point
      sanitizedValue = value.replace(/[^\d.]/g, '');
    }

    newIngredients[index] = {
      ...newIngredients[index],
      [field]: sanitizedValue,
    };
    setIngredients(newIngredients);
  };

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          
          // Scale down if image is too large
          if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
            if (width > height) {
              height = (height / width) * MAX_IMAGE_DIMENSION;
              width = MAX_IMAGE_DIMENSION;
            } else {
              width = (width / height) * MAX_IMAGE_DIMENSION;
              height = MAX_IMAGE_DIMENSION;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            0.8 // compression quality
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const validateImage = (file: File): string | null => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return 'Please upload a JPEG, PNG, or WebP image';
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return 'Image size should be less than 5MB';
    }
    return null;
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateImage(file);
    if (error) {
      toast({
        title: 'Invalid Image',
        description: error,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsUploading(true);

      // Compress the image
      const compressedImage = await compressImage(file);
      
      // Convert blob to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPhotoUrl(base64String);
        
        // Show cropping interface
        setIsCropping(true);
        setCrop({
          unit: '%',
          x: 25,
          y: 25,
          width: 50,
          height: 50,
        });
        setCompletedCrop(null);

        toast({
          title: 'Success',
          description: 'Image processed successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      };
      reader.onerror = () => {
        throw new Error('Failed to read file');
      };
      reader.readAsDataURL(compressedImage);

    } catch (error) {
      console.error('Error processing photo:', error);
      toast({
        title: 'Processing Failed',
        description: 'Failed to process image. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsUploading(false);
    }
  };

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
                accept={ALLOWED_IMAGE_TYPES.join(',')}
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
                cursor={isUploading ? 'wait' : 'pointer'}
                onClick={() => !isUploading && !isCropping && fileInputRef.current?.click()}
                overflow="hidden"
              >
                {isUploading ? (
                  <VStack spacing={4}>
                    <Spinner size="xl" color="purple.500" />
                    <Text color="gray.500">Processing image...</Text>
                  </VStack>
                ) : isCropping && photoUrl ? (
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
                  <VStack spacing={2}>
                    <Text color="gray.500">Click to upload photo</Text>
                    <Text fontSize="sm" color="gray.400">
                      Max size: 5MB (JPG, JPEG, PNG, WebP)
                    </Text>
                  </VStack>
                )}
              </Box>
            </FormControl>

            <FormControl>
              <FormLabel>Recipe Name</FormLabel>
              <Input
                value={name}
                onChange={handleNameChange}
                placeholder="Enter recipe name"
                maxLength={MAX_TEXT_LENGTH.name}
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                {name.length}/{MAX_TEXT_LENGTH.name} characters
              </Text>
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
                      maxLength={MAX_TEXT_LENGTH.ingredient}
                    />
                    <Input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.]?[0-9]+"
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
                      maxLength={10}
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
                onChange={handleInstructionsChange}
                placeholder="Enter cooking instructions"
                rows={4}
                maxLength={MAX_TEXT_LENGTH.instructions}
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                {instructions.length}/{MAX_TEXT_LENGTH.instructions} characters
              </Text>
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