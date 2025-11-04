/**
 * Optimized Image Component
 * Wrapper around Next.js Image component with Cloudinary optimization
 */

"use client";

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  fill?: boolean
  priority?: boolean
  quality?: number
  sizes?: string
}

/**
 * Optimized Image component that handles Cloudinary URLs
 * Automatically optimizes images served from Cloudinary
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  fill = false,
  priority = false,
  quality = 85,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
}: OptimizedImageProps) {
  const [error, setError] = useState(false)

  // If image failed to load, show fallback
  if (error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-200 text-gray-400',
          className
        )}
        style={fill ? undefined : { width, height }}
      >
        <span className="text-xs">Image</span>
      </div>
    )
  }

  // Check if it's a Cloudinary URL and optimize it
  const isCloudinary = src.includes('cloudinary.com')
  let optimizedSrc = src

  if (isCloudinary && !src.includes('f_auto')) {
    // Add Cloudinary transformations for automatic format and quality
    const separator = src.includes('?') ? '&' : '?'
    optimizedSrc = `${src}${separator}f_auto,q_auto${width ? `,w_${width}` : ''}${height ? `,h_${height}` : ''}`
  }

  if (fill) {
    return (
      <Image
        src={optimizedSrc}
        alt={alt}
        fill
        className={className}
        priority={priority}
        quality={quality}
        sizes={sizes}
        onError={() => setError(true)}
        unoptimized={!isCloudinary && !src.startsWith('/')}
      />
    )
  }

  return (
    <Image
      src={optimizedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      quality={quality}
      sizes={sizes}
      onError={() => setError(true)}
      unoptimized={!isCloudinary && !src.startsWith('/')}
    />
  )
}

