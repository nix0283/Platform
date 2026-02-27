/**
 * AutoML Module
 * Автоматический подбор и обучение ML моделей для прогнозирования
 * Основано на: neuralforecast, chronos, prophet
 */

import {
  AutoMLConfig,
  ModelConfig,
  ModelPrediction,
  ModelPerformance,
  ModelType,
} from '../types';

export interface TrainingData {
  symbol: string;
  timestamps: number[];
  values: number[];           // Цены или returns
  features: Record<string, number[]>;  // Индикаторы и фичи
}

export class AutoMLEngine {
  private config: AutoMLConfig;
  private trainedModels: Map<string, TrainedModel> = new Map();
  private modelCounter: number = 0;

  constructor(config: AutoMLConfig) {
    this.config = config;
  }

  /**
   * Автоматическое обучение моделей
   */
  async train(data: TrainingData): Promise<ModelPerformance[]> {
    const performances: ModelPerformance[] = [];
    const modelsToTrain = this.config.models.slice(0, this.config.maxModels);

    for (const modelConfig of modelsToTrain) {
      try {
        const modelId = this.generateModelId(modelConfig.type);
        const trainedModel = await this.trainModel(modelConfig, data, modelId);
        
        this.trainedModels.set(modelId, trainedModel);
        
        performances.push(trainedModel.performance);
      } catch (error) {
        console.error(`Error training model ${modelConfig.type}:`, error);
      }
    }

    return performances;
  }

  /**
   * Обучение одной модели
   */
  private async trainModel(
    config: ModelConfig,
    data: TrainingData,
    modelId: string
  ): Promise<TrainedModel> {
    const startTime = Date.now();

    // Подготовка данных
    const preparedData = this.prepareData(data, config.features);

    // Обучение (симуляция для демо)
    const model = this.initializeModel(config.type, config.parameters);
    
    // В реальном implementation здесь было бы обучение модели
    // Для демо используем упрощенную версию
    const trainedModel = await this.simulateTraining(model, preparedData, config);

    // Валидация
    const performance = await this.validateModel(trainedModel, preparedData, config);

    return {
      id: modelId,
      type: config.type,
      config,
      model: trainedModel,
      performance,
      trainedAt: Date.now(),
      trainingTime: Date.now() - startTime,
    };
  }

  /**
   * Прогнозирование
   */
  predict(
    symbol: string,
    modelIds: string[],
    features: Record<string, number>,
    horizons: number[] = [1]
  ): ModelPrediction[] {
    const predictions: ModelPrediction[] = [];

    for (const modelId of modelIds) {
      const trainedModel = this.trainedModels.get(modelId);
      if (!trainedModel) continue;

      for (const horizon of horizons) {
        const prediction = this.makePrediction(trainedModel, features, horizon);
        
        predictions.push({
          symbol,
          timestamp: Date.now(),
          horizon,
          prediction: prediction.value,
          confidence: prediction.confidence,
          upperBound: prediction.upperBound,
          lowerBound: prediction.lowerBound,
          modelType: trainedModel.type,
          modelId,
        });
      }
    }

    // Ensemble если нужно
    if (this.config.ensembleMethod !== 'best' && predictions.length > 1) {
      return this.createEnsemblePrediction(predictions, symbol, horizons);
    }

    return predictions;
  }

  /**
   * Получение лучшей модели
   */
  getBestModel(metric: 'sharpe' | 'mae' | 'directional_accuracy' = 'sharpe'): TrainedModel | null {
    const models = Array.from(this.trainedModels.values());
    if (models.length === 0) return null;

    return models.reduce((best, current) => {
      switch (metric) {
        case 'sharpe':
          return current.performance.sharpeRatio > best.performance.sharpeRatio ? current : best;
        case 'mae':
          return current.performance.mae < best.performance.mae ? current : best;
        case 'directional_accuracy':
          return current.performance.directionalAccuracy > best.performance.directionalAccuracy ? current : best;
        default:
          return best;
      }
    });
  }

  /**
   * Подготовка данных
   */
  private prepareData(data: TrainingData, features: string[]): PreparedData {
    const n = data.timestamps.length;
    
    const X: number[][] = [];
    const y: number[] = [];

    for (let i = 0; i < n; i++) {
      const featureVector: number[] = [];
      
      features.forEach(featureName => {
        const featureValues = data.features[featureName];
        if (featureValues && featureValues[i] !== undefined) {
          featureVector.push(featureValues[i]);
        } else {
          featureVector.push(0);
        }
      });

      X.push(featureVector);
      
      if (i < data.values.length - 1) {
        y.push(data.values[i + 1]);  // Предсказываем следующее значение
      }
    }

    return { X, y, timestamps: data.timestamps.slice(0, -1) };
  }

  /**
   * Инициализация модели
   */
  private initializeModel(type: ModelType, parameters: Record<string, any>): any {
    // В реальном implementation здесь была бы инициализация реальных моделей
    // Для демо возвращаем заглушку
    return {
      type,
      parameters,
      weights: null,
    };
  }

  /**
   * Симуляция обучения (для демо)
   */
  private async simulateTraining(model: any, data: PreparedData, config: ModelConfig): Promise<any> {
    // Симуляция времени обучения
    await new Promise(resolve => setTimeout(resolve, 100));

    // "Обучение" - генерация случайных весов для демо
    const nFeatures = data.X[0]?.length || 1;
    model.weights = Array.from({ length: nFeatures }, () => Math.random() * 2 - 1);

    return model;
  }

  /**
   * Валидация модели
   */
  private async validateModel(model: any, data: PreparedData, config: ModelConfig): Promise<ModelPerformance> {
    // Разделение на train/test
    const splitIndex = Math.floor(data.X.length * 0.8);
    const trainX = data.X.slice(0, splitIndex);
    const trainY = data.y.slice(0, splitIndex);
    const testX = data.X.slice(splitIndex);
    const testY = data.y.slice(splitIndex);

    // Предсказания на test set
    const predictions = testX.map(x => this.predictWithModel(model, x));
    
    // Расчет метрик
    const errors = predictions.map((pred, i) => Math.abs(pred - testY[i]));
    const squaredErrors = predictions.map((pred, i) => Math.pow(pred - testY[i], 2));
    
    const mae = errors.reduce((sum, e) => sum + e, 0) / errors.length;
    const mse = squaredErrors.reduce((sum, e) => sum + e, 0) / squaredErrors.length;
    const rmse = Math.sqrt(mse);
    
    // Directional accuracy
    let correctDirections = 0;
    for (let i = 1; i < predictions.length; i++) {
      const predDirection = predictions[i] - predictions[i - 1];
      const actualDirection = testY[i] - testY[i - 1];
      if ((predDirection > 0 && actualDirection > 0) || (predDirection < 0 && actualDirection < 0)) {
        correctDirections++;
      }
    }
    const directionalAccuracy = correctDirections / (predictions.length - 1);

    // Sharpe ratio (упрощенно)
    const returns = predictions.map((pred, i) => i > 0 ? (pred - predictions[i - 1]) / predictions[i - 1] : 0);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdReturn = Math.sqrt(returns.map(r => Math.pow(r - avgReturn, 2)).reduce((sum, r) => sum + r, 0) / returns.length);
    const sharpeRatio = stdReturn > 0 ? (avgReturn * 252) / (stdReturn * Math.sqrt(252)) : 0;

    return {
      modelId: model.type,
      modelType: config.type,
      mae,
      mse,
      rmse,
      mape: mae / (testY.reduce((sum, y) => sum + y, 0) / testY.length) * 100,
      directionalAccuracy,
      sharpeRatio,
      informationCoefficient: directionalAccuracy * 2 - 1,
    };
  }

  /**
   * Предсказание с моделью
   */
  private predictWithModel(model: any, features: number[]): number {
    if (!model.weights) return 0;
    
    const weighted = features.reduce((sum, f, i) => {
      return sum + f * (model.weights[i] || 0);
    }, 0);
    
    return weighted;
  }

  /**
   * Создание предсказания с confidence interval
   */
  private makePrediction(model: any, features: Record<string, number>, horizon: number): {
    value: number;
    confidence: number;
    upperBound: number;
    lowerBound: number;
  } {
    const featureVector = Object.values(features);
    const basePrediction = this.predictWithModel(model, featureVector);
    
    // Увеличиваем неопределенность с горизонтом
    const uncertainty = 0.05 * horizon;
    const confidence = Math.max(0.5, 1 - uncertainty);
    
    return {
      value: basePrediction,
      confidence,
      upperBound: basePrediction * (1 + uncertainty),
      lowerBound: basePrediction * (1 - uncertainty),
    };
  }

  /**
   * Ensemble предсказание
   */
  private createEnsemblePrediction(
    predictions: ModelPrediction[],
    symbol: string,
    horizons: number[]
  ): ModelPrediction[] {
    const ensemblePredictions: ModelPrediction[] = [];

    for (const horizon of horizons) {
      const horizonPreds = predictions.filter(p => p.horizon === horizon);
      if (horizonPreds.length === 0) continue;

      switch (this.config.ensembleMethod) {
        case 'average':
          {
            const avgPrediction = horizonPreds.reduce((sum, p) => sum + p.prediction, 0) / horizonPreds.length;
            const avgConfidence = horizonPreds.reduce((sum, p) => sum + p.confidence, 0) / horizonPreds.length;
            
            ensemblePredictions.push({
              symbol,
              timestamp: Date.now(),
              horizon,
              prediction: avgPrediction,
              confidence: avgConfidence,
              upperBound: Math.max(...horizonPreds.map(p => p.upperBound)),
              lowerBound: Math.min(...horizonPreds.map(p => p.lowerBound)),
              modelType: 'ensemble',
              modelId: 'ensemble_average',
            });
          }
          break;

        case 'weighted':
          {
            const totalConfidence = horizonPreds.reduce((sum, p) => sum + p.confidence, 0);
            const weightedPrediction = horizonPreds.reduce((sum, p) => sum + p.prediction * p.confidence, 0) / totalConfidence;
            
            ensemblePredictions.push({
              symbol,
              timestamp: Date.now(),
              horizon,
              prediction: weightedPrediction,
              confidence: totalConfidence / horizonPreds.length,
              upperBound: Math.max(...horizonPreds.map(p => p.upperBound)),
              lowerBound: Math.min(...horizonPreds.map(p => p.lowerBound)),
              modelType: 'ensemble',
              modelId: 'ensemble_weighted',
            });
          }
          break;

        case 'best':
        default:
          {
            const bestPred = horizonPreds.reduce((best, p) => 
              p.confidence > best.confidence ? p : best
            );
            ensemblePredictions.push(bestPred);
          }
          break;
      }
    }

    return ensemblePredictions;
  }

  /**
   * Генерация ID модели
   */
  private generateModelId(type: ModelType): string {
    this.modelCounter++;
    return `${type}_${this.modelCounter}_${Date.now()}`;
  }

  /**
   * Статистика AutoML
   */
  getStats(): {
    totalModels: number;
    bestModel: string | null;
    avgSharpe: number;
    avgDirectionalAccuracy: number;
  } {
    const models = Array.from(this.trainedModels.values());
    
    if (models.length === 0) {
      return {
        totalModels: 0,
        bestModel: null,
        avgSharpe: 0,
        avgDirectionalAccuracy: 0,
      };
    }

    const bestModel = this.getBestModel('sharpe');
    const avgSharpe = models.reduce((sum, m) => sum + m.performance.sharpeRatio, 0) / models.length;
    const avgDirectionalAccuracy = models.reduce((sum, m) => sum + m.performance.directionalAccuracy, 0) / models.length;

    return {
      totalModels: models.length,
      bestModel: bestModel?.id || null,
      avgSharpe,
      avgDirectionalAccuracy,
    };
  }

  /**
   * Сброс состояния
   */
  reset(): void {
    this.trainedModels.clear();
    this.modelCounter = 0;
  }
}

// ============================================
// HELPER TYPES
// ============================================

interface PreparedData {
  X: number[][];
  y: number[];
  timestamps: number[];
}

interface TrainedModel {
  id: string;
  type: ModelType;
  config: ModelConfig;
  model: any;
  performance: ModelPerformance;
  trainedAt: number;
  trainingTime: number;
}

/**
 * Factory для создания AutoML Engine
 */
export function createAutoMLEngine(overrides?: Partial<AutoMLConfig>): AutoMLEngine {
  return new AutoMLEngine({
    models: [
      { type: 'linear_regression', parameters: {}, horizons: [1, 5, 10], features: [] },
      { type: 'random_forest', parameters: { n_estimators: 100 }, horizons: [1, 5, 10], features: [] },
      { type: 'xgboost', parameters: { max_depth: 3 }, horizons: [1, 5, 10], features: [] },
      { type: 'lstm', parameters: { units: 50 }, horizons: [1, 5, 10], features: [] },
    ],
    maxModels: 10,
    validationMethod: 'walk_forward',
    cvFolds: 5,
    featureSelection: true,
    hyperparameterTuning: true,
    ensembleMethod: 'weighted',
    ...overrides,
  });
}
