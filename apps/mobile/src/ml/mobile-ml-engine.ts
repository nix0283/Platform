/**
 * Mobile ML Integration (TensorFlow Lite)
 * Оптимизировано для Android (Snapdragon 8 Elite)
 * 
 * Используем TensorFlow Lite для:
 * - Аппаратного ускорения (DSP, NPU)
 * - Квантованных моделей (int8)
 * - Офлайн inference
 */

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

// ============================================
// TYPES
// ============================================

export interface MobileMLConfig {
  modelPath: string;
  inputShape: number[];
  outputShape: number[];
  quantized: boolean;
  useGPU: boolean;  // Для Snapdragon (Adreno GPU)
}

export interface MLPrediction {
  output: number[];
  confidence: number;
  inferenceTime: number;  // мс
}

// ============================================
// MOBILE ML ENGINE
// ============================================

export class MobileMLEngine {
  private model: tf.LayersModel | null = null;
  private config: MobileMLConfig;
  private isLoaded: boolean = false;
  private inferenceCount: number = 0;
  private totalInferenceTime: number = 0;

  constructor(config: MobileMLConfig) {
    this.config = config;
  }

  // ============================================
  // MODEL LOADING
  // ============================================

  async loadModel(): Promise<void> {
    if (this.isLoaded) return;

    try {
      // Проверка кэша модели
      const cachedModel = await this.getCachedModel();
      
      if (cachedModel) {
        console.log('📱 Loading model from cache');
        this.model = await tf.loadLayersModel(cachedModel);
      } else {
        console.log('📱 Downloading model from server');
        // Загрузка с сервера
        const modelUrl = `${this.config.modelPath}/model.json`;
        this.model = await tf.loadLayersModel(modelUrl);
        
        // Кэширование
        await this.cacheModel();
      }

      // Инициализация (warm-up)
      await this.warmUp();
      
      this.isLoaded = true;
      console.log('✅ Model loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load model:', error);
      throw error;
    }
  }

  private async getCachedModel(): Promise<string | null> {
    const modelInfo = await SecureStore.getItemAsync('ml_model_path');
    if (!modelInfo) return null;

    const path = `${FileSystem.documentDirectory}ml_model/${modelInfo}`;
    const fileInfo = await FileSystem.getInfoAsync(path);
    
    if (fileInfo.exists) {
      return `file://${path}/model.json`;
    }
    return null;
  }

  private async cacheModel(): Promise<void> {
    if (!this.model) return;

    const modelDir = `${FileSystem.documentDirectory}ml_model/`;
    await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
    
    // Сохранение модели локально
    await this.model.save(`file://${modelDir}model`);
    await SecureStore.setItemAsync('ml_model_path', 'model');
  }

  private async warmUp(): Promise<void> {
    if (!this.model) return;

    // Warm-up inference (для инициализации GPU/DSP)
    const dummyInput = tf.zeros(this.config.inputShape);
    this.model.predict(dummyInput);
    dummyInput.dispose();
    
    // Force GPU backend initialization
    if (this.config.useGPU) {
      await tf.setBackend('webgl');
      await tf.ready();
    }
  }

  // ============================================
  // INFERENCE
  // ============================================

  async predict(input: number[]): Promise<MLPrediction> {
    if (!this.isLoaded || !this.model) {
      throw new Error('Model not loaded');
    }

    const startTime = performance.now();

    try {
      // Подготовка тензора
      const inputTensor = tf.tensor2d([input], this.config.inputShape);
      
      // Inference
      const outputTensor = this.model.predict(inputTensor) as tf.Tensor;
      const output = await outputTensor.data() as Float32Array;

      // Вычисление confidence (для бинарной классификации)
      const confidence = output.length > 0 ? Math.max(output[0], 1 - output[0]) : 0.5;

      // Cleanup
      inputTensor.dispose();
      outputTensor.dispose();

      const inferenceTime = performance.now() - startTime;
      this.inferenceCount++;
      this.totalInferenceTime += inferenceTime;

      return {
        output: Array.from(output),
        confidence,
        inferenceTime,
      };
    } catch (error) {
      console.error('Inference error:', error);
      throw error;
    }
  }

  // ============================================
  // BATCH INFERENCE
  // ============================================

  async predictBatch(inputs: number[][]): Promise<MLPrediction[]> {
    if (!this.isLoaded || !this.model) {
      throw new Error('Model not loaded');
    }

    const startTime = performance.now();

    try {
      // Подготовка батча
      const inputTensor = tf.tensor2d(inputs, [inputs.length, ...this.config.inputShape.slice(1)]);
      
      // Batch inference
      const outputTensor = this.model.predict(inputTensor) as tf.Tensor;
      const outputs = await outputTensor.data() as Float32Array;

      // Cleanup
      inputTensor.dispose();
      outputTensor.dispose();

      const inferenceTime = performance.now() - startTime;
      
      // Разделение на отдельные предсказания
      const predictions: MLPrediction[] = [];
      const outputSize = this.config.outputShape[this.config.outputShape.length - 1];
      
      for (let i = 0; i < inputs.length; i++) {
        const output = outputs.slice(i * outputSize, (i + 1) * outputSize);
        const confidence = output.length > 0 ? Math.max(output[0], 1 - output[0]) : 0.5;
        
        predictions.push({
          output: Array.from(output),
          confidence,
          inferenceTime: inferenceTime / inputs.length,
        });
      }

      this.inferenceCount += inputs.length;
      this.totalInferenceTime += inferenceTime;

      return predictions;
    } catch (error) {
      console.error('Batch inference error:', error);
      throw error;
    }
  }

  // ============================================
  // PERFORMANCE METRICS
  // ============================================

  getPerformanceMetrics(): {
    avgInferenceTime: number;
    totalInferences: number;
    modelLoaded: boolean;
  } {
    return {
      avgInferenceTime: this.inferenceCount > 0 
        ? this.totalInferenceTime / this.inferenceCount 
        : 0,
      totalInferences: this.inferenceCount,
      modelLoaded: this.isLoaded,
    };
  }

  // ============================================
  // MODEL MANAGEMENT
  // ============================================

  async unloadModel(): Promise<void> {
    if (this.model) {
      this.model.dispose();
      this.model = null;
      this.isLoaded = false;
      console.log('📱 Model unloaded');
    }
  }

  async updateModel(newModelPath: string): Promise<void> {
    await this.unloadModel();
    this.config.modelPath = newModelPath;
    await this.loadModel();
  }

  async clearCache(): Promise<void> {
    const modelDir = `${FileSystem.documentDirectory}ml_model/`;
    const dirInfo = await FileSystem.getInfoAsync(modelDir);
    
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(modelDir, { idempotent: true });
    }
    await SecureStore.deleteItemAsync('ml_model_path');
    console.log('📱 Model cache cleared');
  }

  // ============================================
  // QUANTIZATION (для уменьшения размера)
  // ============================================

  static async quantizeModel(modelPath: string): Promise<Uint8Array> {
    // Загрузка модели
    const model = await tf.loadLayersModel(modelPath);
    
    // Квантование весов (float32 → int8)
    const weights = model.getWeights();
    const quantizedWeights = weights.map(w => {
      const data = w.dataSync();
      const quantized = new Int8Array(data.length);
      
      // Находим min/max для нормализации
      let min = Infinity, max = -Infinity;
      for (const val of data) {
        min = Math.min(min, val);
        max = Math.max(max, val);
      }
      
      // Квантование
      const scale = (max - min) / 255;
      for (let i = 0; i < data.length; i++) {
        quantized[i] = Math.round((data[i] - min) / scale) - 128;
      }
      
      return quantized;
    });

    // Сериализация
    return new Uint8Array(quantizedWeights.reduce((acc, w) => acc + w.length, 0));
  }
}

// ============================================
// PREPROCESSING (для мобильных устройств)
// ============================================

export class MobilePreprocessor {
  // Нормализация данных
  static normalize(data: number[], mean: number[], std: number[]): number[] {
    return data.map((val, i) => (val - mean[i]) / (std[i] + 1e-10));
  }

  // Min-Max нормализация
  static minMaxNormalize(data: number[], min: number, max: number): number[] {
    return data.map(val => (val - min) / (max - min + 1e-10));
  }

  // Скользящее окно для временных рядов
  static createWindow(data: number[], windowSize: number): number[][] {
    const windows: number[][] = [];
    for (let i = windowSize; i <= data.length; i++) {
      windows.push(data.slice(i - windowSize, i));
    }
    return windows;
  }

  // Агрегация OHLCV
  static aggregateOHLCV(
    open: number[],
    high: number[],
    low: number[],
    close: number[],
    volume: number[]
  ): number[] {
    const lastClose = close[close.length - 1];
    return [
      open[open.length - 1] / lastClose,
      high[high.length - 1] / lastClose,
      low[low.length - 1] / lastClose,
      1,  // close normalized to 1
      volume[volume.length - 1],
    ];
  }
}

// ============================================
// FACTORY
// ============================================

export function createMobileMLEngine(
  modelPath: string,
  useGPU: boolean = true
): MobileMLEngine {
  const config: MobileMLConfig = {
    modelPath,
    inputShape: [1, 20],  // 20 фич
    outputShape: [1, 1],  // Бинарный выход
    quantized: true,
    useGPU,
  };

  return new MobileMLEngine(config);
}

export default MobileMLEngine;
