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
  Badge,
} from '@chakra-ui/react'
import { AddIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons'
import { Recipe } from './RecipeList'
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import DOMPurify from 'dompurify'

// Constants for image restrictions
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_DIMENSION = 1200; // Reduced from 2560px to 1200px for better storage size

// Text input restrictions
const MAX_TEXT_LENGTH = {
  name: 100,
  instructions: 5000,
  ingredient: 50,
  tag: 20, // Maximum length for a single tag
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
  const [tags, setTags] = useState<string[]>([])
  const [currentTag, setCurrentTag] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 0,
    y: 0,
    width: 56.25,
    height: 75,
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
      setTags(editingRecipe.tags || [])
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
    setTags([])
    setCurrentTag('')
    setCrop({
      unit: '%',
      x: 0,
      y: 0,
      width: 56.25,
      height: 75,
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
    
    // Then limit the length and only trim the ends
    return sanitized.slice(0, maxLength).trim();
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedName = sanitizeText(e.target.value, MAX_TEXT_LENGTH.name);
    setName(sanitizedName);
  };

  const handleInstructionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_TEXT_LENGTH.instructions) {
      const sanitizedInstructions = DOMPurify.sanitize(value, {
        ALLOWED_TAGS: [], // Remove all HTML tags
        ALLOWED_ATTR: [], // Remove all attributes
      });
      setInstructions(sanitizedInstructions);
    }
  };

  const handleIngredientChange = (
    index: number,
    field: 'name' | 'amount' | 'unit',
    value: string
  ) => {
    const newIngredients = [...ingredients];
    let sanitizedValue = value;

    if (field === 'name') {
      // For ingredient names, preserve spaces but remove HTML and limit length
      sanitizedValue = DOMPurify.sanitize(value, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      }).slice(0, MAX_TEXT_LENGTH.ingredient);
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
          
          // Always scale down to reasonable dimensions
          const maxDim = MAX_IMAGE_DIMENSION;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
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
          
          // Enable image smoothing for better quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
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
            0.85  // Reduced quality for better compression while maintaining good visuals
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
        
        // Reset crop to default 3:4 ratio centered in the image
        setCrop({
          unit: '%',
          x: 25,
          y: 0,
          width: 50,
          height: 66.67, // 3:4 ratio (50 * 4/3)
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
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    // Calculate dimensions that maintain aspect ratio but don't exceed max dimensions
    let width = crop.width;
    let height = crop.height;
    if (width > height) {
      if (width > MAX_IMAGE_DIMENSION) {
        height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
        width = MAX_IMAGE_DIMENSION;
      }
    } else {
      if (height > MAX_IMAGE_DIMENSION) {
        width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
        height = MAX_IMAGE_DIMENSION;
      }
    }
    
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      width,
      height
    );

    return canvas.toDataURL('image/jpeg', 0.85);
  };

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

  const handleAddTag = () => {
    const sanitizedTag = sanitizeText(currentTag, MAX_TEXT_LENGTH.tag).toLowerCase()
    if (sanitizedTag && !tags.includes(sanitizedTag)) {
      setTags([...tags, sanitizedTag])
      setCurrentTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
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
      tags,
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
                overflow="hidden"
              >
                {isUploading ? (
                  <VStack spacing={4}>
                    <Spinner size="xl" color="purple.500" />
                    <Text color="gray.500">Processing image...</Text>
                  </VStack>
                ) : isCropping && photoUrl ? (
                  <Box w="100%" minH="500px">
                    <Box 
                      w="100%" 
                      h="450px" 
                      display="flex" 
                      alignItems="center" 
                      justifyContent="center" 
                      bg="gray.50"
                      mb={4}
                      borderRadius="md"
                    >
                      <ReactCrop
                        crop={crop}
                        onChange={(c) => setCrop(c)}
                        onComplete={handleCropComplete}
                        aspect={3/4}
                        style={{ maxHeight: '100%', margin: '0 auto' }}
                      >
                        <img
                          ref={imgRef}
                          src={photoUrl}
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: '100%', 
                            objectFit: 'contain'
                          }}
                          alt="Crop preview"
                        />
                      </ReactCrop>
                    </Box>
                    <HStack spacing={2} justify="center">
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
                  </Box>
                ) : photoUrl ? (
                  <Box position="relative" w="100%" pb="133.33%">
                    <Image
                      src={photoUrl}
                      alt="Recipe preview"
                      objectFit="cover"
                      w="100%"
                      h="100%"
                      position="absolute"
                      top="0"
                      left="0"
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
                  <VStack spacing={4} p={6}>
                    <input
                      type="file"
                      accept={ALLOWED_IMAGE_TYPES.join(',')}
                      onChange={handlePhotoUpload}
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      colorScheme="purple"
                      variant="outline"
                      size="lg"
                      leftIcon={<AddIcon />}
                      isDisabled={isUploading}
                    >
                      Upload Photo
                    </Button>
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
                rows={8}
                resize="vertical"
                minH="200px"
                whiteSpace="pre-wrap"
                maxLength={MAX_TEXT_LENGTH.instructions}
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                {instructions.length}/{MAX_TEXT_LENGTH.instructions} characters
              </Text>
            </FormControl>

            <FormControl>
              <FormLabel>Tags (optional)</FormLabel>
              <HStack spacing={2} mb={2}>
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    colorScheme="purple"
                    borderRadius="full"
                    px={3}
                    py={1}
                  >
                    {tag}
                    <IconButton
                      aria-label="Remove tag"
                      icon={<DeleteIcon />}
                      size="xs"
                      ml={1}
                      onClick={() => handleRemoveTag(tag)}
                      variant="ghost"
                      colorScheme="purple"
                    />
                  </Badge>
                ))}
              </HStack>
              <HStack>
                <Input
                  placeholder="Add a tag"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  maxLength={MAX_TEXT_LENGTH.tag}
                />
                <Button
                  onClick={handleAddTag}
                  colorScheme="purple"
                  size="md"
                  isDisabled={!currentTag.trim()}
                >
                  Add
                </Button>
              </HStack>
              <Text fontSize="xs" color="gray.500" mt={1}>
                Press Enter or click Add to add a tag
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