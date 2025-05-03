import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { MessagePattern } from '@nestjs/microservices';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RotateService {
  private rotatePixels(
    inputBuffer: Buffer,
    width: number,
    height: number,
    channels: number,
    angle: number
  ): Buffer {
    const outputBuffer = Buffer.alloc(width * height * channels);

    // Convert degrees to radians
    const radian = (angle * Math.PI) / 180;
    // Rotate around image center
    const centerX = width / 2;
    const centerY = height / 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;

        const rotatedX = Math.round(
          centerX + dx * Math.cos(radian) - dy * Math.sin(radian)
        );
        const rotatedY = Math.round(
          centerY + dx * Math.sin(radian) + dy * Math.cos(radian)
        );

        if (
          rotatedX >= 0 &&
          rotatedX < width &&
          rotatedY >= 0 &&
          rotatedY < height
        ) {
          for (let c = 0; c < channels; c++) {
            const sourceIndex = (rotatedY * width + rotatedX) * channels + c;
            const targetIndex = (y * width + x) * channels + c;
            outputBuffer[targetIndex] = inputBuffer[sourceIndex];
          }
        }
      }
    }

    return outputBuffer;
  }

  @MessagePattern({ cmd: 'rotate_image' })
  async rotate(data: { imagePath: string; angle: number }) {
    try {
      const { imagePath, angle } = data;

      if (!fs.existsSync(imagePath)) {
        throw new Error('File does not exist');
      }

      const outputDir = path.join(
        process.cwd(),
        'apps/basic-processing/output_images'
      );
      const outputFileName = `rotated_${angle}_image.png`;
      const outputFilePath = path.join(outputDir, outputFileName);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const image = sharp(imagePath);
      const metadata = await image.metadata();
      const { width, height, channels } = metadata;

      if (!width || !height || !channels) {
        throw new Error('Unable to retrieve image dimensions or channels');
      }

      const rawData = await image.raw().toBuffer();

      const rotatedBuffer = this.rotatePixels(
        rawData,
        width,
        height,
        channels,
        angle
      );

      await sharp(rotatedBuffer, {
        raw: {
          width,
          height,
          channels,
        },
      })
        .png()
        .toFile(outputFilePath);

      return {
        success: true,
        message: 'Image rotated successfully',
        savedImagePath: outputFilePath,
      };
    } catch (error) {
      console.error('Rotation error:', error);
      return {
        success: false,
        message: 'Failed to rotate image',
        error: (error as Error).message,
      };
    }
  }
}
