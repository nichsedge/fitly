package com.fitly.app.data.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import androidx.exifinterface.media.ExifInterface
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

object ImageStorageHelper {

    fun getImageFile(context: Context, imageId: String): File? {
        val imagesDir = File(context.filesDir, AppConstants.IMAGES_DIRECTORY)
        val cleanId = imageId.removeSuffix(".jpeg").removeSuffix(".jpg").removeSuffix(".png")
        val jpeg = File(imagesDir, "$cleanId.jpeg")
        if (jpeg.exists()) return jpeg
        val jpg = File(imagesDir, "$cleanId.jpg")
        if (jpg.exists()) return jpg
        val png = File(imagesDir, "$cleanId.png")
        if (png.exists()) return png
        val raw = File(imagesDir, imageId)
        if (raw.exists()) return raw
        return null
    }

    suspend fun saveImageFromUri(context: Context, uri: Uri): Result<String> = withContext(Dispatchers.IO) {
        try {
            val imagesDir = File(context.filesDir, AppConstants.IMAGES_DIRECTORY)
            if (!imagesDir.exists()) imagesDir.mkdirs()

            val imageId = "img-${UUID.randomUUID()}"
            val destFile = File(imagesDir, "$imageId.jpeg")

            context.contentResolver.openInputStream(uri)?.use { inputStream ->
                // Decode bounds first
                val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                val tempBytes = inputStream.readBytes()
                BitmapFactory.decodeByteArray(tempBytes, 0, tempBytes.size, options)

                // Calculate inSampleSize for max dimension
                val maxDim = AppConstants.MAX_IMAGE_DIMENSION
                var sampleSize = 1
                while (options.outWidth / sampleSize > maxDim || options.outHeight / sampleSize > maxDim) {
                    sampleSize *= 2
                }

                val decodeOptions = BitmapFactory.Options().apply {
                    inSampleSize = sampleSize
                }
                var bitmap = BitmapFactory.decodeByteArray(tempBytes, 0, tempBytes.size, decodeOptions)

                // Handle EXIF orientation
                try {
                    val exifStream = tempBytes.inputStream()
                    val exif = ExifInterface(exifStream)
                    val orientation = exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
                    val matrix = Matrix()
                    when (orientation) {
                        ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
                        ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
                        ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
                    }
                    if (!matrix.isIdentity && bitmap != null) {
                        bitmap = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
                    }
                } catch (_: Exception) {}

                if (bitmap != null) {
                    FileOutputStream(destFile).use { fos ->
                        bitmap.compress(Bitmap.CompressFormat.JPEG, AppConstants.JPEG_COMPRESSION_QUALITY, fos)
                    }
                    Result.success(imageId)
                } else {
                    Result.failure(IllegalStateException("Could not decode image bitmap"))
                }
            } ?: Result.failure(IllegalStateException("Cannot open input stream for URI"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
