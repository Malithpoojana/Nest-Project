export function applyConvolution(
    imageData: Buffer,
    width: number,
    height: number,
    channels: number,
    kernel: number[][] // e.g. 3x3
): Buffer {
    const result = Buffer.alloc(imageData.length);
    const kernelSize = kernel.length;
    const kernelHalf = Math.floor(kernelSize / 2);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            for (let c = 0; c < channels; c++) {
                let sum = 0;

                for (let ky = 0; ky < kernelSize; ky++) {
                    for (let kx = 0; kx < kernelSize; kx++) {
                        const px = x + kx - kernelHalf;
                        const py = y + ky - kernelHalf;

                        if (px >= 0 && px < width && py >= 0 && py < height) {
                            const pixelIndex = (py * width + px) * channels + c;
                            sum += imageData[pixelIndex] * kernel[ky][kx];
                        }
                    }
                }

                const index = (y * width + x) * channels + c;
                result[index] = Math.min(Math.max(sum, 0), 255);
            }
        }
    }

    return result;
}
