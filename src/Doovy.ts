/**
 * Copyright 2026 SoTeen Studio
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import * as fs from 'fs';
 
export const CATEGORIES = ['FEATURES', 'BUG_FIXES', 'MAINTENANCE'] as const;
type Category = (typeof CATEGORIES)[number];

export class CommitClassifier {
  private vocabulary: string[] = [];
  private weightsInputHidden: number[][] = []; 
  private weightsHiddenOutput: number[][] = []; 
  private biasHidden: number[] = [];
  private biasOutput: number[] = [];

  private hiddenSize = 8;
  private learningRate = 0.1;

  constructor() {
    
  }
  
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 1);
  }

  private buildVocabulary(dataset: string[]): void {
    const vocabSet = new Set<string>();
    dataset.forEach((text) => {
      this.tokenize(text).forEach((word) => vocabSet.add(word));
    });
    this.vocabulary = Array.from(vocabSet);
  }

  private textToVector(text: string): number[] {
    const vector = new Array(this.vocabulary.length).fill(0);
    const tokens = this.tokenize(text);
    tokens.forEach((word) => {
      const idx = this.vocabulary.indexOf(word);
      if (idx !== -1) vector[idx] += 1; 
    });
    return vector;
  }
  
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private sigmoidDerivative(x: number): number {
    return x * (1 - x);
  }
  
  private initWeights(inputSize: number, outputSize: number): void {
    
    this.weightsInputHidden = Array.from({ length: inputSize }, () =>
      Array.from(
        { length: this.hiddenSize },
        () => (Math.random() - 0.5) * 0.1,
      ),
    );
    this.weightsHiddenOutput = Array.from({ length: this.hiddenSize }, () =>
      Array.from({ length: outputSize }, () => (Math.random() - 0.5) * 0.1),
    );
    this.biasHidden = new Array(this.hiddenSize).fill(0);
    this.biasOutput = new Array(outputSize).fill(0);
  }
  
  public train(
    data: { text: string; category: Category }[],
    epochs = 200,
  ): void {
    const texts = data.map((d) => d.text);
    this.buildVocabulary(texts);

    const inputSize = this.vocabulary.length;
    const outputSize = CATEGORIES.length;
    this.initWeights(inputSize, outputSize);

    console.log(`🧠 Training NN dengan ${inputSize} fitur kata unik...`);

    for (let epoch = 0; epoch < epochs; epoch++) {
      let totalLoss = 0;

      for (const item of data) {
        const inputVector = this.textToVector(item.text);
        
        const target = new Array(outputSize).fill(0);
        target[CATEGORIES.indexOf(item.category)] = 1;
        
        const hiddenOutputs = new Array(this.hiddenSize).fill(0);
        for (let j = 0; j < this.hiddenSize; j++) {
          let sum = this.biasHidden[j];
          for (let i = 0; i < inputSize; i++) {
            sum += inputVector[i] * this.weightsInputHidden[i][j];
          }
          hiddenOutputs[j] = this.sigmoid(sum);
        }
        
        const finalOutputs = new Array(outputSize).fill(0);
        for (let k = 0; k < outputSize; k++) {
          let sum = this.biasOutput[k];
          for (let j = 0; j < this.hiddenSize; j++) {
            sum += hiddenOutputs[j] * this.weightsHiddenOutput[j][k];
          }
          finalOutputs[k] = this.sigmoid(sum);
        }
        
        for (let k = 0; k < outputSize; k++) {
          totalLoss += Math.pow(target[k] - finalOutputs[k], 2);
        }
        
        const outputErrors = new Array(outputSize).fill(0);
        for (let k = 0; k < outputSize; k++) {
          outputErrors[k] =
            (target[k] - finalOutputs[k]) *
            this.sigmoidDerivative(finalOutputs[k]);
        }
        
        const hiddenErrors = new Array(this.hiddenSize).fill(0);
        for (let j = 0; j < this.hiddenSize; j++) {
          let error = 0;
          for (let k = 0; k < outputSize; k++) {
            error += outputErrors[k] * this.weightsHiddenOutput[j][k];
          }
          hiddenErrors[j] = error * this.sigmoidDerivative(hiddenOutputs[j]);
        }
        
        for (let k = 0; k < outputSize; k++) {
          for (let j = 0; j < this.hiddenSize; j++) {
            this.weightsHiddenOutput[j][k] +=
              this.learningRate * outputErrors[k] * hiddenOutputs[j];
          }
          this.biasOutput[k] += this.learningRate * outputErrors[k];
        }

        for (let j = 0; j < this.hiddenSize; j++) {
          for (let i = 0; i < inputSize; i++) {
            this.weightsInputHidden[i][j] +=
              this.learningRate * hiddenErrors[j] * inputVector[i];
          }
          this.biasHidden[j] += this.learningRate * hiddenErrors[j];
        }
      }
    }
    console.log('✅ Training selesai!');
  }
  
  public classify(text: string): Category {
    if (this.vocabulary.length === 0) return 'MAINTENANCE';

    const inputVector = this.textToVector(text);
    const outputSize = CATEGORIES.length;
    
    const hiddenOutputs = new Array(this.hiddenSize).fill(0);
    for (let j = 0; j < this.hiddenSize; j++) {
      let sum = this.biasHidden[j];
      for (let i = 0; i < this.vocabulary.length; i++) {
        sum += inputVector[i] * this.weightsInputHidden[i][j];
      }
      hiddenOutputs[j] = this.sigmoid(sum);
    }
    
    const finalOutputs = new Array(outputSize).fill(0);
    let maxIdx = 0;
    let maxVal = -1;

    for (let k = 0; k < outputSize; k++) {
      let sum = this.biasOutput[k];
      for (let j = 0; j < this.hiddenSize; j++) {
        sum += hiddenOutputs[j] * this.weightsHiddenOutput[j][k];
      }
      finalOutputs[k] = this.sigmoid(sum);

      if (finalOutputs[k] > maxVal) {
        maxVal = finalOutputs[k];
        maxIdx = k;
      }
    }

    return CATEGORIES[maxIdx];
  }
  
  public generateChangelog(commits: string[]): string {
    const groups: Record<Category, string[]> = {
      FEATURES: [],
      BUG_FIXES: [],
      MAINTENANCE: [],
    };

    commits.forEach((commit) => {
      const category = this.classify(commit);
      groups[category].push(commit);
    });

    let markdown = '';
    if (groups.FEATURES.length > 0) {
      markdown += `### 🚀 Features\n${groups.FEATURES.join('\n')}\n\n`;
    }
    if (groups.BUG_FIXES.length > 0) {
      markdown += `### 🐛 Bug Fixes\n${groups.BUG_FIXES.join('\n')}\n\n`;
    }
    if (groups.MAINTENANCE.length > 0) {
      markdown += `### 🧹 Maintenance\n${groups.MAINTENANCE.join('\n')}\n\n`;
    }

    return markdown;
  }
}
